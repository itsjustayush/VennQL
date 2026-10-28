import { OpCode } from './opcode';
export type ProcedureTarget = number | string;
export interface QueryOptions {
    select?: string[];
    [key: string]: any;
}
export interface VennClientOptions {
    timeoutMs?: number;
    WebSocketClass?: typeof WebSocket;
    procedures?: Record<string, number>;
}
export declare class VennClient {
    private ws;
    private txCounter;
    private pending;
    private defaultTimeout;
    private wsFactory;
    private procedureMap;
    constructor(options?: VennClientOptions);
    registerProcedure(name: string, id: number): this;
    private resolveProcedureId;
    connect(url: string): Promise<void>;
    private attachListeners;
    private handleIncomingFrame;
    call(opCode: OpCode, procedureTarget: ProcedureTarget, payloadData?: Uint8Array | object | string): Promise<Uint8Array>;
    query<T = unknown>(target: ProcedureTarget, payload?: Uint8Array | object | string | QueryOptions): Promise<T>;
    mutate<T = unknown>(target: ProcedureTarget, payload?: Uint8Array | object | string): Promise<T>;
    ping(): Promise<number>;
    close(): void;
    private parseResponsePayload;
}
//# sourceMappingURL=client.d.ts.map