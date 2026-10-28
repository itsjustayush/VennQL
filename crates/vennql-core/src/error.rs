use thiserror::Error;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum VennError {
    #[error("Buffer too short: requires at least {required} bytes, but only {actual} were provided")]
    BufferTooShort { required: usize, actual: usize },

    #[error("Invalid magic byte: expected 0x{expected:02X}, received 0x{actual:02X}")]
    InvalidMagicByte { expected: u8, actual: u8 },

    #[error("Unsupported protocol version: expected 0x{expected:02X}, received 0x{actual:02X}")]
    UnsupportedVersion { expected: u8, actual: u8 },

    #[error("Unknown opcode identifier: 0x{0:02X}")]
    UnknownOpCode(u8),

    #[error("Payload length mismatch: frame header specifies {expected} bytes, but buffer contains {actual}")]
    PayloadLengthMismatch { expected: usize, actual: usize },

    #[error("Target output buffer too small: requires {required} bytes, available {available}")]
    TargetBufferTooSmall { required: usize, available: usize },

    #[error("Procedure handler not registered for ID: {procedure_id}")]
    HandlerNotFound { procedure_id: u16 },

    #[error("Procedure execution error: {0}")]
    ExecutionFailed(String),

    #[error("Malformed payload data: {0}")]
    MalformedPayload(String),

    #[error("Protocol violation: {0}")]
    ProtocolViolation(&'static str),
}

pub type Result<T> = std::result::Result<T, VennError>;
