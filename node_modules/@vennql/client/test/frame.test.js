const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { OpCode, Flags, MAX_PAYLOAD_SIZE } = require('../dist/opcode');
const { encodeFrame, parseFrame, parseFrameSlice, MAGIC_BYTE, PROTOCOL_VERSION, HEADER_SIZE } = require('../dist/frame');

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

test('Strict Trailing Bytes Rejection & Slice Recovery', () => {
  const payload = new Uint8Array([1, 2, 3, 4]);
  const frame = {
    opCode: OpCode.Query,
    flags: Flags.NONE,
    transactionId: 10,
    procedureId: 20,
    vtableOffset: 0,
    payload,
  };

  const encoded = encodeFrame(frame);
  const garbage = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
  const combined = new Uint8Array(encoded.byteLength + garbage.byteLength);
  combined.set(encoded);
  combined.set(garbage, encoded.byteLength);

  // Exact parse must throw error on trailing bytes
  assert.throws(() => {
    parseFrame(combined, true);
  }, /Trailing bytes detected/);

  // Slice parse must return valid frame and trailing remainder
  const { frame: slicedFrame, remainder } = parseFrameSlice(combined);
  assert.strictEqual(slicedFrame.procedureId, 20);
  assert.deepStrictEqual(Array.from(remainder), Array.from(garbage));
});

test('Cross-Language Golden Conformance Vectors', () => {
  const specPath = path.resolve(__dirname, '../../../spec/conformance_vectors.json');
  if (!fs.existsSync(specPath)) return;

  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));

  for (const v of spec.valid_vectors) {
    const raw = Buffer.from(v.hex, 'hex');
    const parsed = parseFrame(new Uint8Array(raw));
    assert.strictEqual(parsed.opCode, v.expected.op_code);
    assert.strictEqual(parsed.flags, v.expected.flags);
    assert.strictEqual(parsed.transactionId, v.expected.transaction_id);
    assert.strictEqual(parsed.procedureId, v.expected.procedure_id);
    assert.strictEqual(new TextDecoder().decode(parsed.payload), v.expected.payload_utf8);
  }

  for (const inv of spec.invalid_vectors) {
    const raw = Buffer.from(inv.hex, 'hex');
    assert.throws(() => {
      parseFrame(new Uint8Array(raw));
    });
  }
});
