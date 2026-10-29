"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VennClient = void 0;
const opcode_1 = require("./opcode");
const frame_1 = require("./frame");
class VennClient {
    ws = null;
    txCounter = 1;
    pending = new Map();
    defaultTimeout;
    wsFactory;
    procedureMap = new Map([
        ['health', 1],
        ['echo', 2],
        ['sum', 3],
        ['books', 4],
        ['getUser', 10],
    ]);
    constructor(options = {}) {
        this.defaultTimeout = options.timeoutMs ?? 10000;
        this.wsFactory = options.WebSocketClass || globalThis.WebSocket;
        if (options.procedures) {
            for (const [name, id] of Object.entries(options.procedures)) {
                this.procedureMap.set(name, id);
            }
        }
        if (!this.wsFactory) {
            throw new Error('No WebSocket implementation found. If running in an older Node.js, install and provide `ws` via options.');
        }
    }
    registerProcedure(name, id) {
        this.procedureMap.set(name, id);
        return this;
    }
    resolveProcedureId(target) {
        if (typeof target === 'number')
            return target;
        const resolved = this.procedureMap.get(target);
        if (resolved === undefined) {
            throw new Error(`Unknown VennQL procedure name: "${target}". Register it via client.registerProcedure('${target}', id).`);
        }
        return resolved;
    }
    async connect(url) {
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
    attachListeners(socket) {
        socket.onmessage = (event) => {
            let buffer;
            if (event.data instanceof ArrayBuffer) {
                buffer = new Uint8Array(event.data);
            }
            else if (ArrayBuffer.isView(event.data)) {
                buffer = new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength);
            }
            else {
                return;
            }
            try {
                const frame = (0, frame_1.parseFrame)(buffer);
                this.handleIncomingFrame(frame);
            }
            catch (err) {
                console.error('[VennQL] Failed to parse incoming frame:', err);
            }
        };
        socket.onclose = () => {
            for (const [, pending] of this.pending.entries()) {
                clearTimeout(pending.timer);
                pending.reject(new Error('VennQL connection closed unexpectedly'));
            }
            this.pending.clear();
            this.ws = null;
        };
    }
    handleIncomingFrame(frame) {
        const pending = this.pending.get(frame.transactionId);
        if (!pending)
            return;
        clearTimeout(pending.timer);
        this.pending.delete(frame.transactionId);
        if (frame.opCode === opcode_1.OpCode.Error) {
            const errMsg = new TextDecoder().decode(frame.payload);
            pending.reject(new Error(`VennQL Procedure Error: ${errMsg}`));
        }
        else {
            pending.resolve(frame.payload);
        }
    }
    async call(opCode, procedureTarget, payloadData, vtableOffset = 0) {
        if (!this.ws || this.ws.readyState !== 1) {
            throw new Error('VennQL client is not connected to a server.');
        }
        const procedureId = this.resolveProcedureId(procedureTarget);
        const txId = this.txCounter++;
        if (this.txCounter > 0x7fffffff) {
            this.txCounter = 1;
        }
        let payload;
        if (!payloadData) {
            payload = new Uint8Array(0);
        }
        else if (payloadData instanceof Uint8Array) {
            payload = payloadData;
        }
        else if (typeof payloadData === 'string') {
            payload = new TextEncoder().encode(payloadData);
        }
        else {
            payload = new TextEncoder().encode(JSON.stringify(payloadData));
        }
        const flags = opCode === opcode_1.OpCode.Query ? opcode_1.Flags.CACHEABLE : 0;
        const packet = (0, frame_1.encodeFrame)({
            opCode,
            flags,
            transactionId: txId,
            procedureId,
            vtableOffset,
            payload,
        });
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(txId);
                reject(new Error(`VennQL procedure timed out after ${this.defaultTimeout}ms (tx=${txId})`));
            }, this.defaultTimeout);
            this.pending.set(txId, { resolve, reject, timer });
            this.ws.send(packet);
        });
    }
    async query(target, payload) {
        let vtableOffset = 0;
        if (payload && typeof payload === 'object' && !(payload instanceof Uint8Array)) {
            if ('bitmask' in payload && typeof payload.bitmask === 'number') {
                vtableOffset = payload.bitmask;
            }
        }
        const raw = await this.call(opcode_1.OpCode.Query, target, payload, vtableOffset);
        return this.parseResponsePayload(raw);
    }
    async mutate(target, payload) {
        const raw = await this.call(opcode_1.OpCode.Mutate, target, payload);
        return this.parseResponsePayload(raw);
    }
    async ping() {
        const start = performance.now();
        await this.call(opcode_1.OpCode.Ping, 0);
        return performance.now() - start;
    }
    close() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
    parseResponsePayload(payload) {
        if (payload.byteLength === 0) {
            return null;
        }
        const text = new TextDecoder().decode(payload);
        try {
            return JSON.parse(text);
        }
        catch {
            return text;
        }
    }
}
exports.VennClient = VennClient;
//# sourceMappingURL=client.js.map