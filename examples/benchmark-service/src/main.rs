use std::time::Instant;
use vennql_core::{Frame, OpCode};
use vennql_router::VennRouter;

#[tokio::main]
async fn main() {
    let is_json = std::env::args().any(|a| a == "--json");
    if !is_json {
        println!("=== VennQL Zero-Copy In-Memory Microbenchmark ===");
    }

    let payload = b"{\"action\":\"evaluate_benchmark\",\"count\":1000000,\"tier\":\"unlimited\"}";
    let iterations = 1_000_000;

    let frame = Frame::query(42, 101, payload);
    let mut target_buf = vec![0u8; 1024];

    let start = Instant::now();
    for _ in 0..iterations {
        let _ = frame.encode(&mut target_buf);
    }
    let encode_duration = start.elapsed();
    let encode_nanos_per_op = encode_duration.as_nanos() as f64 / iterations as f64;
    let encode_throughput = iterations as f64 / encode_duration.as_secs_f64();

    let wire_bytes = frame.to_bytes();
    let start = Instant::now();
    for _ in 0..iterations {
        let parsed = Frame::parse(&wire_bytes).expect("Valid frame");
        assert_eq!(parsed.op_code, OpCode::Query);
    }
    let parse_duration = start.elapsed();
    let parse_nanos_per_op = parse_duration.as_nanos() as f64 / iterations as f64;
    let parse_throughput = iterations as f64 / parse_duration.as_secs_f64();

    let mut router = VennRouter::new();
    router.route_sync(101, |ctx| {
        Ok(ctx.payload().to_vec())
    });

    let start = Instant::now();
    for i in 0..iterations {
        let parsed = Frame::parse(&wire_bytes).expect("Valid frame");
        let resp = router.dispatch(&parsed, (i % 16) as u64).await.expect("Success");
        assert_eq!(resp.op_code, OpCode::Ack);
    }
    let dispatch_duration = start.elapsed();
    let dispatch_nanos_per_op = dispatch_duration.as_nanos() as f64 / iterations as f64;
    let dispatch_throughput = iterations as f64 / dispatch_duration.as_secs_f64();

    if is_json {
        println!(
            "{{\"encode_ns\":{:.2},\"encode_mops\":{:.2},\"parse_ns\":{:.2},\"parse_mops\":{:.2},\"dispatch_ns\":{:.2},\"dispatch_mops\":{:.2}}}",
            encode_nanos_per_op,
            encode_throughput / 1_000_000.0,
            parse_nanos_per_op,
            parse_throughput / 1_000_000.0,
            dispatch_nanos_per_op,
            dispatch_throughput / 1_000_000.0
        );
    } else {
        println!(
            "[1] Frame Encoding: {:?} total | {:.2} ns/op | {:.2} M ops/sec",
            encode_duration,
            encode_nanos_per_op,
            encode_throughput / 1_000_000.0
        );
        println!(
            "[2] Zero-Copy Parsing: {:?} total | {:.2} ns/op | {:.2} M ops/sec",
            parse_duration,
            parse_nanos_per_op,
            parse_throughput / 1_000_000.0
        );
        println!(
            "[3] End-to-End Dispatch: {:?} total | {:.2} ns/op | {:.2} M ops/sec",
            dispatch_duration,
            dispatch_nanos_per_op,
            dispatch_throughput / 1_000_000.0
        );
        println!("==================================================");
    }
}
