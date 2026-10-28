use crate::context::RequestContext;
use std::sync::Arc;
use vennql_core::{OwnedFrame, Result};

pub trait Middleware: Send + Sync {
    fn before(&self, _ctx: &mut RequestContext<'_>) -> Result<()> {
        Ok(())
    }

    fn after(&self, _ctx: &RequestContext<'_>, _response: &mut OwnedFrame) -> Result<()> {
        Ok(())
    }
}

pub type ArcMiddleware = Arc<dyn Middleware>;
