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
    COMPRESSED = 0x01
    CACHEABLE = 0x02
    URGENT = 0x04

MAGIC_BYTE = 0x56  # 'V'
VERSION_1 = 0x01
HEADER_SIZE = 16
