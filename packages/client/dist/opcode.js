"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_PAYLOAD_SIZE = exports.Flags = exports.OpCode = void 0;
var OpCode;
(function (OpCode) {
    OpCode[OpCode["Query"] = 1] = "Query";
    OpCode[OpCode["Mutate"] = 2] = "Mutate";
    OpCode[OpCode["Stream"] = 3] = "Stream";
    OpCode[OpCode["Ping"] = 4] = "Ping";
    OpCode[OpCode["Pong"] = 5] = "Pong";
    OpCode[OpCode["Ack"] = 6] = "Ack";
    OpCode[OpCode["Cancel"] = 254] = "Cancel";
    OpCode[OpCode["Error"] = 255] = "Error";
})(OpCode || (exports.OpCode = OpCode = {}));
exports.Flags = {
    NONE: 0x00,
    COMPRESSED: 0x01,
    STREAM_END: 0x02,
    CACHEABLE: 0x04,
    AUTH_SET: 0x08,
    RESERVED_MASK: 0xf0,
};
exports.MAX_PAYLOAD_SIZE = 16 * 1024 * 1024; // 16 MB limit
//# sourceMappingURL=opcode.js.map