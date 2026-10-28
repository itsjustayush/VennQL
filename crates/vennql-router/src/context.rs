use std::collections::HashMap;
use vennql_core::Frame;

pub struct RequestContext<'a> {
    pub frame: &'a Frame<'a>,
    pub client_id: u64,
    pub metadata: HashMap<&'static str, String>,
}

impl<'a> RequestContext<'a> {
    pub fn new(frame: &'a Frame<'a>, client_id: u64) -> Self {
        Self {
            frame,
            client_id,
            metadata: HashMap::new(),
        }
    }

    #[inline(always)]
    pub fn payload(&self) -> &'a [u8] {
        self.frame.payload
    }

    #[inline(always)]
    pub fn transaction_id(&self) -> u32 {
        self.frame.transaction_id
    }

    #[inline(always)]
    pub fn procedure_id(&self) -> u16 {
        self.frame.procedure_id
    }
}
