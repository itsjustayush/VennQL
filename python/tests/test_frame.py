import unittest
import sys
import os
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from vennql.frame import (
    Frame,
    BufferTooShortError,
    InvalidMagicByteError,
    UnsupportedVersionError,
    PayloadLengthMismatchError,
    PayloadTooLargeError,
)
from vennql.opcode import OpCode, Flags, MAX_PAYLOAD_SIZE

class TestVennFrame(unittest.TestCase):
    def test_encode_and_parse_roundtrip(self):
        payload = b'{"action":"lookup","target":101}'
        frame = Frame(
            op_code=OpCode.QUERY,
            flags=Flags.CACHEABLE,
            transaction_id=1337,
            procedure_id=42,
            vtable_offset=0,
            payload=payload
        )
        encoded = frame.encode()
        self.assertEqual(len(encoded), 16 + len(payload))

        parsed = Frame.parse(encoded)
        self.assertEqual(parsed.op_code, OpCode.QUERY)
        self.assertEqual(parsed.flags, Flags.CACHEABLE)
        self.assertEqual(parsed.transaction_id, 1337)
        self.assertEqual(parsed.procedure_id, 42)
        self.assertEqual(bytes(parsed.payload), payload)

    def test_invalid_magic_byte(self):
        payload = b'test'
        frame = Frame(OpCode.PING, Flags.NONE, 1, 0, 0, payload)
        encoded = bytearray(frame.encode())
        encoded[0] = 0x99  # Corrupt magic byte

        with self.assertRaises(InvalidMagicByteError):
            Frame.parse(encoded)

    def test_buffer_too_short(self):
        with self.assertRaises(BufferTooShortError):
            Frame.parse(b'\x56\x01\x01')

    def test_payload_truncation(self):
        payload = b'long payload data'
        frame = Frame(OpCode.QUERY, Flags.NONE, 1, 1, 0, payload)
        encoded = frame.encode()
        truncated = encoded[:-3]

        with self.assertRaises(PayloadLengthMismatchError):
            Frame.parse(truncated)

    def test_trailing_bytes_strict_rejection(self):
        payload = b'valid'
        frame = Frame(OpCode.QUERY, Flags.NONE, 1, 1, 0, payload)
        encoded = frame.encode()
        with_trailing_garbage = encoded + b'GARBAGE'

        # Strict parse must reject trailing garbage
        with self.assertRaises(PayloadLengthMismatchError):
            Frame.parse(with_trailing_garbage, exact=True)

        # Slice parse recovers valid frame and remaining slice
        parsed, remainder = Frame.parse_slice(with_trailing_garbage)
        self.assertEqual(bytes(parsed.payload), payload)
        self.assertEqual(bytes(remainder), b'GARBAGE')

    def test_max_payload_limit(self):
        oversized = 17 * 1024 * 1024  # 17 MB exceeds 16 MB limit
        # Test encode limit
        frame = Frame(OpCode.QUERY, Flags.NONE, 1, 1, 0, b'x' * (MAX_PAYLOAD_SIZE + 1))
        with self.assertRaises(PayloadTooLargeError):
            frame.encode()

    def test_conformance_vectors(self):
        spec_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'spec', 'conformance_vectors.json'))
        if not os.path.exists(spec_path):
            self.skipTest("conformance_vectors.json not found")

        with open(spec_path, 'r', encoding='utf-8') as f:
            vectors = json.load(f)

        for v in vectors.get("valid_vectors", []):
            raw = bytes.fromhex(v["hex"])
            parsed = Frame.parse(raw)
            exp = v["expected"]
            self.assertEqual(int(parsed.op_code), exp["op_code"])
            self.assertEqual(parsed.flags, exp["flags"])
            self.assertEqual(parsed.transaction_id, exp["transaction_id"])
            self.assertEqual(parsed.procedure_id, exp["procedure_id"])
            self.assertEqual(bytes(parsed.payload).decode('utf-8', errors='replace'), exp["payload_utf8"])

        for inv in vectors.get("invalid_vectors", []):
            raw = bytes.fromhex(inv["hex"])
            err_type = inv["expected_error"]
            if err_type == "InvalidMagicByte":
                with self.assertRaises(InvalidMagicByteError):
                    Frame.parse(raw)
            elif err_type == "UnsupportedVersion":
                with self.assertRaises(UnsupportedVersionError):
                    Frame.parse(raw)
            elif err_type == "BufferTooShort":
                with self.assertRaises(BufferTooShortError):
                    Frame.parse(raw)
            elif err_type == "PayloadLengthMismatch":
                with self.assertRaises(PayloadLengthMismatchError):
                    Frame.parse(raw)
            elif err_type == "PayloadTooLarge":
                with self.assertRaises(PayloadTooLargeError):
                    Frame.parse(raw)

if __name__ == '__main__':
    unittest.main()
