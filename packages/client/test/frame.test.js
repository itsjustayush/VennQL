const assert = require('assert');
const { OpCode, Flags } = require('../dist/opcode');
const { encodeFrame, parseFrame, MAGIC_BYTE, PROTOCOL_VERSION, HEADER_SIZE } = require('../dist/frame');

const test = require('node:test');

test('TypeScript Frame Encoding & Decoding Roundtrip', () => {
  const payloadText = JSON.stringify({ user_id: 42, role: 'architect' });
  const payloadBytes = new TextEncoder().encode(payloadText);

  const frame = {
    opCode: OpCode.Query,
    flags: Flags.CACHEABLE,
    transactionId: 1001,
    procedureId: 55,
    vtableOffset: 0,
    payload: payloadBytes,
  };

  const encoded = encodeFrame(frame);
  assert.strictEqual(encoded.byteLength, HEADER_SIZE + payloadBytes.byteLength);
  assert.strictEqual(encoded[0], MAGIC_BYTE);
  assert.strictEqual(encoded[1], PROTOCOL_VERSION);
  assert.strictEqual(encoded[2], OpCode.Query);
  assert.strictEqual(encoded[3], Flags.CACHEABLE);

  const parsed = parseFrame(encoded);
  assert.strictEqual(parsed.opCode, OpCode.Query);
  assert.strictEqual(parsed.flags, Flags.CACHEABLE);
  assert.strictEqual(parsed.transactionId, 1001);
  assert.strictEqual(parsed.procedureId, 55);

  const decodedText = new TextDecoder().decode(parsed.payload);
  assert.strictEqual(decodedText, payloadText);
});

test('Error Frame Handling', () => {
  const errMsg = 'Resource not found';
  const payloadBytes = new TextEncoder().encode(errMsg);

  const frame = {
    opCode: OpCode.Error,
    flags: 0,
    transactionId: 99,
    procedureId: 1,
    vtableOffset: 0,
    payload: payloadBytes,
  };

  const encoded = encodeFrame(frame);
  const parsed = parseFrame(encoded);
  assert.strictEqual(parsed.opCode, OpCode.Error);
  assert.strictEqual(parsed.transactionId, 99);
  assert.strictEqual(new TextDecoder().decode(parsed.payload), errMsg);
});
