use crate::error::{Result, VennError};
use crate::opcode::OpCode;

pub const MAGIC_BYTE: u8 = 0x56;
pub const PROTOCOL_VERSION: u8 = 0x01;
pub const HEADER_SIZE: usize = 16;

pub const FLAG_COMPRESSED: u8 = 0x01;
pub const FLAG_STREAM_END: u8 = 0x02;
pub const FLAG_CACHEABLE: u8 = 0x04;
pub const FLAG_AUTH_SET: u8 = 0x08;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Frame<'a> {
    pub op_code: OpCode,
    pub flags: u8,
    pub transaction_id: u32,
    pub procedure_id: u16,
    pub vtable_offset: u16,
    pub payload: &'a [u8],
}

impl<'a> Frame<'a> {
    #[inline(always)]
    pub fn new(
        op_code: OpCode,
        flags: u8,
        transaction_id: u32,
        procedure_id: u16,
        vtable_offset: u16,
        payload: &'a [u8],
    ) -> Self {
        Self {
            op_code,
            flags,
            transaction_id,
            procedure_id,
            vtable_offset,
            payload,
        }
    }

    #[inline(always)]
    pub fn query(transaction_id: u32, procedure_id: u16, payload: &'a [u8]) -> Self {
        Self::new(
            OpCode::Query,
            FLAG_CACHEABLE,
            transaction_id,
            procedure_id,
            0,
            payload,
        )
    }

    #[inline(always)]
    pub fn mutate(transaction_id: u32, procedure_id: u16, payload: &'a [u8]) -> Self {
        Self::new(
            OpCode::Mutate,
            0,
            transaction_id,
            procedure_id,
            0,
            payload,
        )
    }

    #[inline(always)]
    pub fn response(transaction_id: u32, procedure_id: u16, payload: &'a [u8]) -> Self {
        Self::new(
            OpCode::Ack,
            0,
            transaction_id,
            procedure_id,
            0,
            payload,
        )
    }

    #[inline(always)]
    pub fn error(transaction_id: u32, procedure_id: u16, error_payload: &'a [u8]) -> Self {
        Self::new(
            OpCode::Error,
            0,
            transaction_id,
            procedure_id,
            0,
            error_payload,
        )
    }

    #[inline(always)]
    pub fn ping(transaction_id: u32) -> Frame<'static> {
        Frame {
            op_code: OpCode::Ping,
            flags: 0,
            transaction_id,
            procedure_id: 0,
            vtable_offset: 0,
            payload: &[],
        }
    }

    #[inline(always)]
    pub fn pong(transaction_id: u32) -> Frame<'static> {
        Frame {
            op_code: OpCode::Pong,
            flags: 0,
            transaction_id,
            procedure_id: 0,
            vtable_offset: 0,
            payload: &[],
        }
    }

    #[inline(always)]
    pub fn total_len(&self) -> usize {
        HEADER_SIZE + self.payload.len()
    }

    pub fn parse(buffer: &'a [u8]) -> Result<Self> {
        if buffer.len() < HEADER_SIZE {
            return Err(VennError::BufferTooShort {
                required: HEADER_SIZE,
                actual: buffer.len(),
            });
        }

        let magic = buffer[0];
        if magic != MAGIC_BYTE {
            return Err(VennError::InvalidMagicByte {
                expected: MAGIC_BYTE,
                actual: magic,
            });
        }

        let version = buffer[1];
        if version != PROTOCOL_VERSION {
            return Err(VennError::UnsupportedVersion {
                expected: PROTOCOL_VERSION,
                actual: version,
            });
        }

        let op_code_byte = buffer[2];
        let op_code = OpCode::from_u8(op_code_byte)
            .ok_or(VennError::UnknownOpCode(op_code_byte))?;

        let flags = buffer[3];

        let transaction_id = u32::from_be_bytes([
            buffer[4], buffer[5], buffer[6], buffer[7],
        ]);

        let procedure_id = u16::from_be_bytes([
            buffer[8], buffer[9],
        ]);

        let vtable_offset = u16::from_be_bytes([
            buffer[10], buffer[11],
        ]);

        let payload_len = u32::from_be_bytes([
            buffer[12], buffer[13], buffer[14], buffer[15],
        ]) as usize;

        let required_total = HEADER_SIZE + payload_len;
        if buffer.len() < required_total {
            return Err(VennError::PayloadLengthMismatch {
                expected: required_total,
                actual: buffer.len(),
            });
        }

        let payload = &buffer[HEADER_SIZE..required_total];

        Ok(Frame {
            op_code,
            flags,
            transaction_id,
            procedure_id,
            vtable_offset,
            payload,
        })
    }

    pub fn encode(&self, target: &mut [u8]) -> Result<usize> {
        let total = self.total_len();
        if target.len() < total {
            return Err(VennError::TargetBufferTooSmall {
                required: total,
                available: target.len(),
            });
        }

        target[0] = MAGIC_BYTE;
        target[1] = PROTOCOL_VERSION;
        target[2] = self.op_code.as_u8();
        target[3] = self.flags;

        target[4..8].copy_from_slice(&self.transaction_id.to_be_bytes());
        target[8..10].copy_from_slice(&self.procedure_id.to_be_bytes());
        target[10..12].copy_from_slice(&self.vtable_offset.to_be_bytes());
        target[12..16].copy_from_slice(&(self.payload.len() as u32).to_be_bytes());

        if !self.payload.is_empty() {
            target[HEADER_SIZE..total].copy_from_slice(self.payload);
        }

        Ok(total)
    }

    pub fn to_bytes(&self) -> Vec<u8> {
        let mut buf = vec![0u8; self.total_len()];
        self.encode(&mut buf).expect("Size precalculated precisely");
        buf
    }

    pub fn to_owned(&self) -> OwnedFrame {
        OwnedFrame {
            op_code: self.op_code,
            flags: self.flags,
            transaction_id: self.transaction_id,
            procedure_id: self.procedure_id,
            vtable_offset: self.vtable_offset,
            payload: self.payload.to_vec(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OwnedFrame {
    pub op_code: OpCode,
    pub flags: u8,
    pub transaction_id: u32,
    pub procedure_id: u16,
    pub vtable_offset: u16,
    pub payload: Vec<u8>,
}

impl OwnedFrame {
    #[inline(always)]
    pub fn as_frame(&self) -> Frame<'_> {
        Frame {
            op_code: self.op_code,
            flags: self.flags,
            transaction_id: self.transaction_id,
            procedure_id: self.procedure_id,
            vtable_offset: self.vtable_offset,
            payload: &self.payload,
        }
    }

    #[inline(always)]
    pub fn to_bytes(&self) -> Vec<u8> {
        self.as_frame().to_bytes()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_zero_copy_roundtrip() {
        let payload = b"{\"user_id\": 1337, \"action\": \"profile_lookup\"}";
        let original_frame = Frame::query(42, 101, payload);

        let encoded = original_frame.to_bytes();
        assert_eq!(encoded.len(), HEADER_SIZE + payload.len());

        let parsed = Frame::parse(&encoded).expect("Parse must succeed");
        assert_eq!(parsed.op_code, OpCode::Query);
        assert_eq!(parsed.flags, FLAG_CACHEABLE);
        assert_eq!(parsed.transaction_id, 42);
        assert_eq!(parsed.procedure_id, 101);
        assert_eq!(parsed.payload, payload);

        let parsed_ptr = parsed.payload.as_ptr();
        let encoded_payload_ptr = unsafe { encoded.as_ptr().add(HEADER_SIZE) };
        assert_eq!(parsed_ptr, encoded_payload_ptr, "Payload must be a zero-copy pointer slice!");
    }

    #[test]
    fn test_invalid_magic_byte() {
        let mut bytes = Frame::ping(1).to_bytes();
        bytes[0] = 0xAA;
        let err = Frame::parse(&bytes).unwrap_err();
        assert_eq!(err, VennError::InvalidMagicByte { expected: MAGIC_BYTE, actual: 0xAA });
    }

    #[test]
    fn test_truncated_buffer() {
        let bytes = [MAGIC_BYTE, PROTOCOL_VERSION, 0x01];
        let err = Frame::parse(&bytes).unwrap_err();
        assert_eq!(err, VennError::BufferTooShort { required: HEADER_SIZE, actual: 3 });
    }

    #[test]
    fn test_payload_length_mismatch() {
        let mut bytes = Frame::query(1, 10, b"1234567890").to_bytes();
        bytes.truncate(bytes.len() - 2);
        let err = Frame::parse(&bytes).unwrap_err();
        match err {
            VennError::PayloadLengthMismatch { expected, actual } => {
                assert_eq!(expected, HEADER_SIZE + 10);
                assert_eq!(actual, HEADER_SIZE + 8);
            }
            other => panic!("Unexpected error: {:?}", other),
        }
    }
}
