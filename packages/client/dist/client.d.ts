import { OpCode } from './opcode';
export interface VennClientOptions {
    timeoutMs?: number;
    WebSocketClass?: typeof WebSocket;
}
export declare class VennClient {
    private ws;
    private txCounter;
    private pending;
    private defaultTimeout;
    private wsFactory;
    constructor(options?: VennClientOptions);
    connect(url: string): Promise<void>;
    private attachListeners;
    private handleIncomingFrame;
    call(opCode: OpCode, procedureId: number, payloadData?: Uint8Array | object | string): Promise<Uint8Array>;
    query<T = unknown>(procedureId: number, payload?: Uint8Array | object | string): Promise<T>;
    mutate<T = unknown>(procedureId: number, payload?: Uint8Array | object | string): Promise<T>;
    ping(): Promise<number>;
    close(): void;
    private parseResponsePayload;
}
//# sourceMappingURL=client.d.ts.map