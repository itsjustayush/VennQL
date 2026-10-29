import { OpCode } from './opcode';
export declare const MAGIC_BYTE = 86;
export declare const PROTOCOL_VERSION = 1;
export declare const HEADER_SIZE = 16;
export interface VennFrame {
    opCode: OpCode;
    flags: number;
    transactionId: number;
    procedureId: number;
    vtableOffset: number;
    payload: Uint8Array;
}
export declare function encodeFrame(frame: VennFrame): Uint8Array;
export declare function parseFrame(buffer: Uint8Array, exact?: boolean): VennFrame;
export declare function parseFrameSlice(buffer: Uint8Array): {
    frame: VennFrame;
    remainder: Uint8Array;
};
//# sourceMappingURL=frame.d.ts.map