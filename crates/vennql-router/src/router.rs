use crate::context::RequestContext;
use crate::handler::ProcedureKind;
use crate::middleware::{ArcMiddleware, Middleware};
use futures::future::BoxFuture;
use std::collections::HashMap;
use std::sync::Arc;
use vennql_core::{
    Frame, OpCode, OwnedFrame, Result, VennError, FLAG_CACHEABLE,
};

pub struct VennRouter {
    procedures: HashMap<u16, ProcedureKind>,
    middlewares: Vec<ArcMiddleware>,
}

impl Default for VennRouter {
    fn default() -> Self {
        Self::new()
    }
}

impl VennRouter {
    pub fn new() -> Self {
        Self {
            procedures: HashMap::new(),
            middlewares: Vec::new(),
        }
    }

    pub fn use_middleware(&mut self, middleware: impl Middleware + 'static) -> &mut Self {
        self.middlewares.push(Arc::new(middleware));
        self
    }

    pub fn route_sync<F>(&mut self, procedure_id: u16, handler: F) -> &mut Self
    where
        F: Fn(&RequestContext<'_>) -> Result<Vec<u8>> + Send + Sync + 'static,
    {
        self.procedures.insert(procedure_id, ProcedureKind::Sync(Arc::new(handler)));
        self
    }

    pub fn route_async<F>(&mut self, procedure_id: u16, handler: F) -> &mut Self
    where
        F: (for<'a> Fn(&'a RequestContext<'a>) -> BoxFuture<'a, Result<Vec<u8>>>) + Send + Sync + 'static,
    {
        self.procedures.insert(procedure_id, ProcedureKind::Async(Arc::new(handler)));
        self
    }

    pub async fn dispatch(&self, frame: &Frame<'_>, client_id: u64) -> Result<OwnedFrame> {
        match frame.op_code {
            OpCode::Ping => {
                return Ok(Frame::pong(frame.transaction_id).to_owned());
            }
            OpCode::Pong => {
                return Ok(Frame::response(frame.transaction_id, 0, &[]).to_owned());
            }
            _ => {}
        }

        let procedure = self
            .procedures
            .get(&frame.procedure_id)
            .ok_or(VennError::HandlerNotFound {
                procedure_id: frame.procedure_id,
            })?;

        let mut ctx = RequestContext::new(frame, client_id);

        for mw in &self.middlewares {
            mw.before(&mut ctx)?;
        }

        let result = match procedure {
            ProcedureKind::Sync(handler) => handler(&ctx),
            ProcedureKind::Async(handler) => handler(&ctx).await,
        };

        let mut response = match result {
            Ok(data) => {
                let flags = if frame.op_code == OpCode::Query {
                    FLAG_CACHEABLE
                } else {
                    0
                };
                OwnedFrame {
                    op_code: OpCode::Ack,
                    flags,
                    transaction_id: frame.transaction_id,
                    procedure_id: frame.procedure_id,
                    vtable_offset: 0,
                    payload: data,
                }
            }
            Err(e) => {
                let err_msg = e.to_string().into_bytes();
                OwnedFrame {
                    op_code: OpCode::Error,
                    flags: 0,
                    transaction_id: frame.transaction_id,
                    procedure_id: frame.procedure_id,
                    vtable_offset: 0,
                    payload: err_msg,
                }
            }
        };

        for mw in &self.middlewares {
            mw.after(&ctx, &mut response)?;
        }

        Ok(response)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_sync_dispatch() {
        let mut router = VennRouter::new();

        router.route_sync(101, |ctx| {
            let s = std::str::from_utf8(ctx.payload())
                .map_err(|e| VennError::MalformedPayload(e.to_string()))?;
            Ok(s.to_uppercase().into_bytes())
        });

        let query = Frame::query(42, 101, b"hello vennql");
        let resp = router.dispatch(&query, 1).await.expect("Dispatch should succeed");

        assert_eq!(resp.op_code, OpCode::Ack);
        assert_eq!(resp.transaction_id, 42);
        assert_eq!(resp.procedure_id, 101);
        assert_eq!(resp.payload, b"HELLO VENNQL");
        assert_eq!(resp.flags & FLAG_CACHEABLE, FLAG_CACHEABLE);
    }

    #[tokio::test]
    async fn test_async_dispatch() {
        let mut router = VennRouter::new();

        router.route_async(202, |ctx| {
            let len = ctx.payload().len() as u32;
            Box::pin(async move {
                Ok(len.to_be_bytes().to_vec())
            })
        });

        let query = Frame::query(10, 202, b"payload123");
        let resp = router.dispatch(&query, 2).await.expect("Dispatch should succeed");

        assert_eq!(resp.payload, 10u32.to_be_bytes().to_vec());
    }

    #[tokio::test]
    async fn test_ping_pong_fast_path() {
        let router = VennRouter::new();
        let ping = Frame::ping(999);
        let resp = router.dispatch(&ping, 1).await.expect("Ping must return pong");

        assert_eq!(resp.op_code, OpCode::Pong);
        assert_eq!(resp.transaction_id, 999);
    }
}
