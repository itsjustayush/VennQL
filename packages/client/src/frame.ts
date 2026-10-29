import { OpCode, MAX_PAYLOAD_SIZE } from './opcode';

export const MAGIC_BYTE = 0x56;
export const PROTOCOL_VERSION = 0x01;
export const HEADER_SIZE = 16;

export interface VennFrame {
  opCode: OpCode;
  flags: number;
  transactionId: number;
  procedureId: number;
  vtableOffset: number;
  payload: Uint8Array;
}

export function encodeFrame(frame: VennFrame): Uint8Array {
  if (frame.payload.byteLength > MAX_PAYLOAD_SIZE) {
    throw new Error(
      `Payload size ${frame.payload.byteLength} exceeds maximum allowed ${MAX_PAYLOAD_SIZE} bytes`
    );
  }

  const totalLength = HEADER_SIZE + frame.payload.byteLength;
  const buffer = new Uint8Array(totalLength);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  buffer[0] = MAGIC_BYTE;
  buffer[1] = PROTOCOL_VERSION;
  buffer[2] = frame.opCode;
  buffer[3] = frame.flags;

  view.setUint32(4, frame.transactionId, false);
  view.setUint16(8, frame.procedureId, false);
  view.setUint16(10, frame.vtableOffset, false);
  view.setUint32(12, frame.payload.byteLength, false);

  if (frame.payload.byteLength > 0) {
    buffer.set(frame.payload, HEADER_SIZE);
  }

  return buffer;
}

export function parseFrame(buffer: Uint8Array, exact: boolean = true): VennFrame {
  const { frame, remainder } = parseFrameSlice(buffer);
  if (exact && remainder.byteLength > 0) {
    throw new Error(
      `Trailing bytes detected: frame ended at byte ${HEADER_SIZE + frame.payload.byteLength}, but buffer has ${buffer.byteLength} bytes`
    );
  }
  return frame;
}

export function parseFrameSlice(buffer: Uint8Array): { frame: VennFrame; remainder: Uint8Array } {
  if (buffer.byteLength < HEADER_SIZE) {
    throw new Error(
      `Buffer too small: expected at least ${HEADER_SIZE} bytes, received ${buffer.byteLength}`
    );
  }

  const magic = buffer[0];
  if (magic !== MAGIC_BYTE) {
    throw new Error(`Invalid magic byte: expected 0x${MAGIC_BYTE.toString(16)}, got 0x${magic.toString(16)}`);
  }

  const version = buffer[1];
  if (version !== PROTOCOL_VERSION) {
    throw new Error(`Unsupported version: expected 0x${PROTOCOL_VERSION.toString(16)}, got 0x${version.toString(16)}`);
  }

  const opCode = buffer[2] as OpCode;
  const flags = buffer[3];

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const transactionId = view.getUint32(4, false);
  const procedureId = view.getUint16(8, false);
  const vtableOffset = view.getUint16(10, false);
  const payloadLength = view.getUint32(12, false);

  if (payloadLength > MAX_PAYLOAD_SIZE) {
    throw new Error(
      `Payload length ${payloadLength} exceeds maximum allowed ${MAX_PAYLOAD_SIZE} bytes`
    );
  }

  const requiredTotal = HEADER_SIZE + payloadLength;
  if (buffer.byteLength < requiredTotal) {
    throw new Error(
      `Payload truncated: header expects ${requiredTotal} bytes, received ${buffer.byteLength}`
    );
  }

  const payload = buffer.subarray(HEADER_SIZE, requiredTotal);
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
