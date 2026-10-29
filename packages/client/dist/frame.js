"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEADER_SIZE = exports.PROTOCOL_VERSION = exports.MAGIC_BYTE = void 0;
exports.encodeFrame = encodeFrame;
exports.parseFrame = parseFrame;
exports.parseFrameSlice = parseFrameSlice;
const opcode_1 = require("./opcode");
exports.MAGIC_BYTE = 0x56;
exports.PROTOCOL_VERSION = 0x01;
exports.HEADER_SIZE = 16;
function encodeFrame(frame) {
    if (frame.payload.byteLength > opcode_1.MAX_PAYLOAD_SIZE) {
        throw new Error(`Payload size ${frame.payload.byteLength} exceeds maximum allowed ${opcode_1.MAX_PAYLOAD_SIZE} bytes`);
    }
    const totalLength = exports.HEADER_SIZE + frame.payload.byteLength;
    const buffer = new Uint8Array(totalLength);
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    buffer[0] = exports.MAGIC_BYTE;
    buffer[1] = exports.PROTOCOL_VERSION;
    buffer[2] = frame.opCode;
    buffer[3] = frame.flags;
    view.setUint32(4, frame.transactionId, false);
    view.setUint16(8, frame.procedureId, false);
    view.setUint16(10, frame.vtableOffset, false);
    view.setUint32(12, frame.payload.byteLength, false);
    if (frame.payload.byteLength > 0) {
        buffer.set(frame.payload, exports.HEADER_SIZE);
    }
    return buffer;
}
function parseFrame(buffer, exact = true) {
    const { frame, remainder } = parseFrameSlice(buffer);
    if (exact && remainder.byteLength > 0) {
        throw new Error(`Trailing bytes detected: frame ended at byte ${exports.HEADER_SIZE + frame.payload.byteLength}, but buffer has ${buffer.byteLength} bytes`);
    }
    return frame;
}
function parseFrameSlice(buffer) {
    if (buffer.byteLength < exports.HEADER_SIZE) {
        throw new Error(`Buffer too small: expected at least ${exports.HEADER_SIZE} bytes, received ${buffer.byteLength}`);
    }
    const magic = buffer[0];
    if (magic !== exports.MAGIC_BYTE) {
        throw new Error(`Invalid magic byte: expected 0x${exports.MAGIC_BYTE.toString(16)}, got 0x${magic.toString(16)}`);
    }
    const version = buffer[1];
    if (version !== exports.PROTOCOL_VERSION) {
        throw new Error(`Unsupported version: expected 0x${exports.PROTOCOL_VERSION.toString(16)}, got 0x${version.toString(16)}`);
    }
    const opCode = buffer[2];
    const flags = buffer[3];
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const transactionId = view.getUint32(4, false);
    const procedureId = view.getUint16(8, false);
    const vtableOffset = view.getUint16(10, false);
    const payloadLength = view.getUint32(12, false);
    if (payloadLength > opcode_1.MAX_PAYLOAD_SIZE) {
        throw new Error(`Payload length ${payloadLength} exceeds maximum allowed ${opcode_1.MAX_PAYLOAD_SIZE} bytes`);
    }
    const requiredTotal = exports.HEADER_SIZE + payloadLength;
    if (buffer.byteLength < requiredTotal) {
        throw new Error(`Payload truncated: header expects ${requiredTotal} bytes, received ${buffer.byteLength}`);
    }
    const payload = buffer.subarray(exports.HEADER_SIZE, requiredTotal);
    const remainder = buffer.subarray(requiredTotal);
    return {
        frame: {
            opCode,
            flags,
            transactionId,
            procedureId,
            vtableOffset,
            payload,
        },
        remainder,
    };
}
//# sourceMappingURL=frame.js.map