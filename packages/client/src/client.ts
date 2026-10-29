import { OpCode, Flags } from './opcode';
import { encodeFrame, parseFrame, VennFrame } from './frame';

interface PendingRequest {
  resolve: (value: Uint8Array) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout> | number;
}

export type ProcedureTarget = number | string;

export interface QueryOptions {
  select?: string[];
  bitmask?: number;
  [key: string]: any;
}

export interface VennClientOptions {
  timeoutMs?: number;
  WebSocketClass?: typeof WebSocket;
  procedures?: Record<string, number>;
}

export class VennClient {
  private ws: WebSocket | null = null;
  private txCounter = 1;
  private pending = new Map<number, PendingRequest>();
  private defaultTimeout: number;
  private wsFactory: typeof WebSocket;
  private procedureMap = new Map<string, number>([
    ['health', 1],
    ['echo', 2],
    ['sum', 3],
    ['books', 4],
    ['getUser', 10],
  ]);

  constructor(options: VennClientOptions = {}) {
    this.defaultTimeout = options.timeoutMs ?? 10000;
    this.wsFactory = options.WebSocketClass || (globalThis as any).WebSocket;
    if (options.procedures) {
      for (const [name, id] of Object.entries(options.procedures)) {
        this.procedureMap.set(name, id);
      }
    }
    if (!this.wsFactory) {
      throw new Error(
        'No WebSocket implementation found. If running in an older Node.js, install and provide `ws` via options.'
      );
    }
  }

  public registerProcedure(name: string, id: number): this {
    this.procedureMap.set(name, id);
    return this;
  }

  private resolveProcedureId(target: ProcedureTarget): number {
    if (typeof target === 'number') return target;
    const resolved = this.procedureMap.get(target);
    if (resolved === undefined) {
      throw new Error(`Unknown VennQL procedure name: "${target}". Register it via client.registerProcedure('${target}', id).`);
    }
    return resolved;
  }

  public async connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new this.wsFactory(url);
      socket.binaryType = 'arraybuffer';

      const cleanup = () => {
        socket.onopen = null;
        socket.onerror = null;
      };

      socket.onopen = () => {
        cleanup();
        this.ws = socket;
        this.attachListeners(socket);
        resolve();
      };

      socket.onerror = (err) => {
        cleanup();
        reject(new Error(`VennQL connection failed: ${err}`));
      };
    });
  }

  private attachListeners(socket: WebSocket): void {
    socket.onmessage = (event: MessageEvent) => {
      let buffer: Uint8Array;
      if (event.data instanceof ArrayBuffer) {
        buffer = new Uint8Array(event.data);
      } else if (ArrayBuffer.isView(event.data)) {
        buffer = new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength);
      } else {
        return;
      }

      try {
        const frame = parseFrame(buffer);
        this.handleIncomingFrame(frame);
      } catch (err) {
        console.error('[VennQL] Failed to parse incoming frame:', err);
      }
    };

    socket.onclose = () => {
      for (const [, pending] of this.pending.entries()) {
        clearTimeout(pending.timer as any);
        pending.reject(new Error('VennQL connection closed unexpectedly'));
      }
      this.pending.clear();
      this.ws = null;
    };
  }

  private handleIncomingFrame(frame: VennFrame): void {
    const pending = this.pending.get(frame.transactionId);
    if (!pending) return;

    clearTimeout(pending.timer as any);
    this.pending.delete(frame.transactionId);

    if (frame.opCode === OpCode.Error) {
      const errMsg = new TextDecoder().decode(frame.payload);
      pending.reject(new Error(`VennQL Procedure Error: ${errMsg}`));
    } else {
      pending.resolve(frame.payload);
    }
  }

  public async call(
    opCode: OpCode,
    procedureTarget: ProcedureTarget,
    payloadData?: Uint8Array | object | string,
    vtableOffset: number = 0
  ): Promise<Uint8Array> {
    if (!this.ws || this.ws.readyState !== 1) {
      throw new Error('VennQL client is not connected to a server.');
    }

    const procedureId = this.resolveProcedureId(procedureTarget);
    const txId = this.txCounter++;
    if (this.txCounter > 0x7fffffff) {
      this.txCounter = 1;
    }

    let payload: Uint8Array;
    if (!payloadData) {
      payload = new Uint8Array(0);
    } else if (payloadData instanceof Uint8Array) {
      payload = payloadData;
    } else if (typeof payloadData === 'string') {
      payload = new TextEncoder().encode(payloadData);
    } else {
      payload = new TextEncoder().encode(JSON.stringify(payloadData));
    }

    const flags = opCode === OpCode.Query ? Flags.CACHEABLE : 0;
    const packet = encodeFrame({
      opCode,
      flags,
      transactionId: txId,
      procedureId,
      vtableOffset,
      payload,
    });

    return new Promise<Uint8Array>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(txId);
        reject(new Error(`VennQL procedure timed out after ${this.defaultTimeout}ms (tx=${txId})`));
      }, this.defaultTimeout);

      this.pending.set(txId, { resolve, reject, timer });
      this.ws!.send(packet);
    });
  }

  public async query<T = unknown>(
    target: ProcedureTarget,
    payload?: Uint8Array | object | string | QueryOptions
  ): Promise<T> {
    let vtableOffset = 0;
    if (payload && typeof payload === 'object' && !(payload instanceof Uint8Array)) {
      if ('bitmask' in payload && typeof (payload as any).bitmask === 'number') {
        vtableOffset = (payload as any).bitmask;
      }
    }
    const raw = await this.call(OpCode.Query, target, payload, vtableOffset);
    return this.parseResponsePayload<T>(raw);
  }

  public async mutate<T = unknown>(
    target: ProcedureTarget,
    payload?: Uint8Array | object | string
  ): Promise<T> {
    const raw = await this.call(OpCode.Mutate, target, payload);
    return this.parseResponsePayload<T>(raw);
  }

  public async ping(): Promise<number> {
    const start = performance.now();
    await this.call(OpCode.Ping, 0);
    return performance.now() - start;
  }

  public close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private parseResponsePayload<T>(payload: Uint8Array): T {
    if (payload.byteLength === 0) {
      return null as T;
    }
    const text = new TextDecoder().decode(payload);
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }
}
