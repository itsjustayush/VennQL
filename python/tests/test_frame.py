import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from vennql.frame import (
    Frame,
    BufferTooShortError,
    InvalidMagicByteError,
    UnsupportedVersionError,
    PayloadLengthMismatchError
)
from vennql.opcode import OpCode, Flags

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

if __name__ == '__main__':
    unittest.main()
