use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[repr(u8)]
pub enum OpCode {
    Query = 0x01,
    Mutate = 0x02,
    Stream = 0x03,
    Ping = 0x04,
    Pong = 0x05,
    Ack = 0x06,
    Cancel = 0xFE,
    Error = 0xFF,
}

impl OpCode {
    #[inline(always)]
    pub fn from_u8(val: u8) -> Option<Self> {
        match val {
            0x01 => Some(OpCode::Query),
            0x02 => Some(OpCode::Mutate),
            0x03 => Some(OpCode::Stream),
            0x04 => Some(OpCode::Ping),
            0x05 => Some(OpCode::Pong),
            0x06 => Some(OpCode::Ack),
            0xFE => Some(OpCode::Cancel),
            0xFF => Some(OpCode::Error),
            _ => None,
        }
    }

    #[inline(always)]
    pub fn as_u8(self) -> u8 {
        self as u8
    }

    #[inline(always)]
    pub fn is_cacheable(self) -> bool {
        matches!(self, OpCode::Query)
    }

    #[inline(always)]
    pub fn is_mutation(self) -> bool {
        matches!(self, OpCode::Mutate)
    }
}

impl fmt::Display for OpCode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            OpCode::Query => write!(f, "QUERY(0x01)"),
            OpCode::Mutate => write!(f, "MUTATE(0x02)"),
            OpCode::Stream => write!(f, "STREAM(0x03)"),
            OpCode::Ping => write!(f, "PING(0x04)"),
            OpCode::Pong => write!(f, "PONG(0x05)"),
            OpCode::Ack => write!(f, "ACK(0x06)"),
            OpCode::Cancel => write!(f, "CANCEL(0xFE)"),
            OpCode::Error => write!(f, "ERROR(0xFF)"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_opcode_roundtrip() {
        let codes = [
            OpCode::Query,
            OpCode::Mutate,
            OpCode::Stream,
            OpCode::Ping,
            OpCode::Pong,
            OpCode::Ack,
            OpCode::Cancel,
            OpCode::Error,
        ];

        for &op in &codes {
            let byte = op.as_u8();
            let parsed = OpCode::from_u8(byte).expect("Should decode opcode");
            assert_eq!(op, parsed);
        }
    }

    #[test]
    fn test_invalid_opcode() {
        assert_eq!(OpCode::from_u8(0x00), None);
        assert_eq!(OpCode::from_u8(0x42), None);
        assert_eq!(OpCode::from_u8(0xFD), None);
    }
}
