from .opcode import OpCode, Flags, MAGIC_BYTE, VERSION_1, HEADER_SIZE, MAX_PAYLOAD_SIZE
from .frame import (
    Frame,
    VennError,
    BufferTooShortError,
    InvalidMagicByteError,
    UnsupportedVersionError,
    PayloadLengthMismatchError,
    PayloadTooLargeError,
    ReservedBitsSetError,
)

# Optional network components (gracefully loaded if dependencies are present)
try:
    from .client import Client
except ImportError:
    Client = None

try:
    from .app import VennApp
except ImportError:
    VennApp = None

try:
    from .logger import VennLogger, Colors
except ImportError:
    VennLogger = None
    Colors = None

__all__ = [
    "OpCode",
    "Flags",
    "MAGIC_BYTE",
    "VERSION_1",
    "HEADER_SIZE",
    "MAX_PAYLOAD_SIZE",
    "Frame",
    "VennError",
    "BufferTooShortError",
    "InvalidMagicByteError",
    "UnsupportedVersionError",
    "PayloadLengthMismatchError",
    "PayloadTooLargeError",
    "ReservedBitsSetError",
    "Client",
    "VennApp",
    "VennLogger",
    "Colors",
]

__version__ = "0.1.0"
