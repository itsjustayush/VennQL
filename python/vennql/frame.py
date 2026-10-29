import struct
from dataclasses import dataclass
from typing import Union, Tuple
from .opcode import OpCode, Flags, MAGIC_BYTE, VERSION_1, HEADER_SIZE, MAX_PAYLOAD_SIZE

# Fixed 16-byte binary header: Big-Endian (>):
# Magic (1B), Version (1B), OpCode (1B), Flags (1B),
# TxID (4B uint32), ProcedureID (2B uint16), VTableOffset (2B uint16), PayloadLen (4B uint32)
HEADER_FORMAT = '>BBBB I H H I'

class VennError(Exception):
    """Base exception for all VennQL errors."""
    pass

class BufferTooShortError(VennError):
    pass

class InvalidMagicByteError(VennError):
    pass

class UnsupportedVersionError(VennError):
    pass

class PayloadLengthMismatchError(VennError):
    pass

class PayloadTooLargeError(VennError):
    pass

class ReservedBitsSetError(VennError):
    pass

@dataclass(slots=True)
class Frame:
    op_code: OpCode
    flags: int
    transaction_id: int
    procedure_id: int
    vtable_offset: int
    payload: Union[bytes, memoryview]

    def encode(self) -> bytes:
        payload_bytes = bytes(self.payload) if not isinstance(self.payload, bytes) else self.payload
        if len(payload_bytes) > MAX_PAYLOAD_SIZE:
            raise PayloadTooLargeError(
                f"Payload size {len(payload_bytes)} bytes exceeds maximum allowed {MAX_PAYLOAD_SIZE} bytes"
            )

        header = struct.pack(
            HEADER_FORMAT,
            MAGIC_BYTE,
            VERSION_1,
            int(self.op_code),
            self.flags,
            self.transaction_id,
            self.procedure_id,
            self.vtable_offset,
            len(payload_bytes)
        )
        return header + payload_bytes

    @classmethod
    def parse(cls, data: Union[bytes, bytearray, memoryview], exact: bool = True) -> 'Frame':
        frame, remainder = cls.parse_slice(data)
        if exact and len(remainder) > 0:
            raise PayloadLengthMismatchError(
                f"Trailing bytes detected: frame ended at byte {HEADER_SIZE + len(frame.payload)}, but buffer has {len(data)} bytes"
            )
        return frame

    @classmethod
    def parse_slice(cls, data: Union[bytes, bytearray, memoryview]) -> Tuple['Frame', memoryview]:
        if len(data) < HEADER_SIZE:
            raise BufferTooShortError(f"Expected at least {HEADER_SIZE} bytes, got {len(data)}")

        magic, version, op_code_raw, flags, tx_id, proc_id, vtable, payload_len = struct.unpack_from(
            HEADER_FORMAT, data, 0
        )

        if magic != MAGIC_BYTE:
            raise InvalidMagicByteError(f"Invalid magic byte: 0x{magic:02X}, expected 0x56")

        if version != VERSION_1:
            raise UnsupportedVersionError(f"Unsupported protocol version: {version}")

        if payload_len > MAX_PAYLOAD_SIZE:
            raise PayloadTooLargeError(
                f"Declared payload length {payload_len} exceeds maximum allowed {MAX_PAYLOAD_SIZE} bytes"
            )

        total_expected = HEADER_SIZE + payload_len
        if len(data) < total_expected:
            raise PayloadLengthMismatchError(
                f"Payload truncated: expected {payload_len} bytes, buffer only has {len(data) - HEADER_SIZE}"
            )

        try:
            op_code = OpCode(op_code_raw)
        except ValueError:
            raise VennError(f"Unknown OpCode: 0x{op_code_raw:02X}")

        mv = memoryview(data) if not isinstance(data, memoryview) else data
        payload_slice = mv[HEADER_SIZE:total_expected]
        remainder = mv[total_expected:]

        frame = cls(
            op_code=op_code,
            flags=flags,
            transaction_id=tx_id,
            procedure_id=proc_id,
            vtable_offset=vtable,
            payload=payload_slice
        )
        return frame, remainder
