from enum import IntEnum

class OpCode(IntEnum):
    QUERY = 0x01
    MUTATE = 0x02
    STREAM = 0x03
    PING = 0x04
    PONG = 0x05
    ACK = 0x06
    CANCEL = 0xFE
    ERROR = 0xFF

class Flags(IntEnum):
    NONE = 0x00
    COMPRESSED = 0x01   # Bit 0
    STREAM_END = 0x02   # Bit 1: Final chunk in streaming sequence
    CACHEABLE = 0x04    # Bit 2: Edge CDN / client cacheable response
    AUTH_SET = 0x08     # Bit 3: Security authentication context attached
    RESERVED_MASK = 0xF0 # Bits 4-7: Reserved in v1.0, must be 0

MAGIC_BYTE = 0x56  # ASCII 'V'
VERSION_1 = 0x01
HEADER_SIZE = 16
MAX_PAYLOAD_SIZE = 16 * 1024 * 1024  # 16 MB maximum payload threshold
