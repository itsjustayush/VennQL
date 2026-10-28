use crate::context::RequestContext;
use futures::future::BoxFuture;
use std::sync::Arc;
use vennql_core::Result;

pub type SyncHandler = Arc<dyn Fn(&RequestContext<'_>) -> Result<Vec<u8>> + Send + Sync>;
pub type AsyncHandler = Arc<dyn for<'a> Fn(&'a RequestContext<'a>) -> BoxFuture<'a, Result<Vec<u8>>> + Send + Sync>;

pub enum ProcedureKind {
    Sync(SyncHandler),
    Async(AsyncHandler),
}
