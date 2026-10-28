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
    readonly COMPRESSED: 1;
    readonly STREAM_END: 2;
    readonly CACHEABLE: 4;
    readonly AUTH_SET: 8;
};
//# sourceMappingURL=opcode.d.ts.map