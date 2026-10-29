export declare enum OpCode {
    Query = 1,
    Mutate = 2,
    Stream = 3,
    Ping = 4,
    Pong = 5,
    Ack = 6,
    Cancel = 254,
    Error = 255
}
export declare const Flags: {
    readonly NONE: 0;
    readonly COMPRESSED: 1;
    readonly STREAM_END: 2;
    readonly CACHEABLE: 4;
    readonly AUTH_SET: 8;
    readonly RESERVED_MASK: 240;
};
export declare const MAX_PAYLOAD_SIZE: number;
//# sourceMappingURL=opcode.d.ts.map