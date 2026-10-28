use std::env;
use vennql_core::{Result, VennError};
use vennql_router::VennRouter;
use vennql_server::VennServer;

#[tokio::main]
async fn main() -> std::io::Result<()> {
    let host = env::var("VENNQL_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = env::var("VENNQL_PORT").unwrap_or_else(|_| "8080".to_string());
    let addr = format!("{}:{}", host, port);

    println!(
        r#"
  █ █ █▀▀ █▀▀▄ █▀▀▄ █▀▀█ █
  ▀▄▄▀ █▀▀ █ █ █ █ █▄▄█ █
    ▄ ▀▀▀ ▀ ▀ ▀ ▀ ▀ ▀ ▀▀▀▀
  VennQL Core Binary Engine (Rust)
  Protocol: v1.0 | Magic: 0x56 | Mode: Zero-Copy
"#
    );

    let mut router = VennRouter::new();

    // Procedure 1: Health Check
    router.route_sync(1, |_ctx| {
        Ok(b"{\"status\":\"healthy\",\"engine\":\"VennQL-Rust\",\"v\":1}".to_vec())
    });

    // Procedure 2: Raw Byte Echo (Zero-allocation loopback)
    router.route_sync(2, |ctx| {
        Ok(ctx.payload().to_vec())
    });

    // Procedure 3: High-Performance Binary Sum
    // Payload: sequence of u32 (Big-Endian)
    router.route_sync(3, |ctx| {
        let payload = ctx.payload();
        if payload.len() % 4 != 0 {
            return Err(VennError::MalformedPayload(
                "Payload length must be a multiple of 4 bytes".into(),
            ));
        }

        let mut sum: u64 = 0;
        for chunk in payload.chunks_exact(4) {
            let val = u32::from_be_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]);
            sum += val as u64;
        }

        Ok(sum.to_be_bytes().to_vec())
    });

    // Procedure 10: Entity Query (simulated profile lookup with cacheable tag)
    router.route_async(10, |ctx| {
        Box::pin(async move {
            let id_str = std::str::from_utf8(ctx.payload()).unwrap_or("unknown");
            let resp = format!(
                r#"{{"id":"{}","name":"Engineer","role":"Architecture Pioneer","cached":true}}"#,
                id_str
            );
            Ok(resp.into_bytes())
        })
    });

    println!("[VennQL] Registered 4 procedures: [1: health, 2: echo, 3: sum, 10: get_user]");

    let server = VennServer::new(router);
    server.listen(&addr).await
}
