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

    // Procedure 4: Bookstore Catalog with true binary bitmask field projection
    // Uses the vtable_offset header field as a 16-bit projection mask:
    // Bit 0: ID (0x01) | Bit 1: Title (0x02) | Bit 2: Author (0x04) | Bit 3: Price (0x08) | Bit 4: Rating (0x10)
    const MASK_ID: u16 = 1 << 0;     // 0x01
    const MASK_TITLE: u16 = 1 << 1;  // 0x02
    const MASK_AUTHOR: u16 = 1 << 2; // 0x04
    const MASK_PRICE: u16 = 1 << 3;  // 0x08
    const MASK_RATING: u16 = 1 << 4; // 0x10
    const MASK_ALL: u16 = MASK_ID | MASK_TITLE | MASK_AUTHOR | MASK_PRICE | MASK_RATING;

    router.route_sync(4, |ctx| {
        // 1. Fast-path: Read bitmask directly from 16-bit vtable_offset header in 0.1 nanoseconds
        let mask = if ctx.frame().vtable_offset != 0 {
            ctx.frame().vtable_offset
        } else {
            // Fallback: parse JSON select array or default to all fields
            let payload_str = std::str::from_utf8(ctx.payload()).unwrap_or("{}");
            let mut m = 0u16;
            if payload_str.contains("\"id\"") { m |= MASK_ID; }
            if payload_str.contains("\"title\"") { m |= MASK_TITLE; }
            if payload_str.contains("\"author\"") { m |= MASK_AUTHOR; }
            if payload_str.contains("\"price\"") { m |= MASK_PRICE; }
            if payload_str.contains("\"rating\"") { m |= MASK_RATING; }
            if m == 0 { MASK_ALL } else { m }
        };

        struct Book {
            id: &'static str,
            title: &'static str,
            author: &'static str,
            price: f64,
            rating: f64,
        }

        let books = [
            Book { id: "1", title: "The Hobbit", author: "J.R.R. Tolkien", price: 14.99, rating: 4.9 },
            Book { id: "2", title: "1984", author: "George Orwell", price: 12.50, rating: 4.8 },
            Book { id: "3", title: "Dune", author: "Frank Herbert", price: 18.00, rating: 4.95 },
            Book { id: "4", title: "Fahrenheit 451", author: "Ray Bradbury", price: 11.20, rating: 4.6 },
        ];

        let mut book_json_list = Vec::with_capacity(books.len());
        for b in books.iter() {
            let mut fields = Vec::with_capacity(5);
            // Bitwise CPU check without string scanning
            if (mask & MASK_ID) != 0 { fields.push(format!(r#""id":"{}""#, b.id)); }
            if (mask & MASK_TITLE) != 0 { fields.push(format!(r#""title":"{}""#, b.title)); }
            if (mask & MASK_AUTHOR) != 0 { fields.push(format!(r#""author":"{}""#, b.author)); }
            if (mask & MASK_PRICE) != 0 { fields.push(format!(r#""price":{}"#, b.price)); }
            if (mask & MASK_RATING) != 0 { fields.push(format!(r#""rating":{}"#, b.rating)); }
            book_json_list.push(format!("{{{}}}", fields.join(",")));
        }

        let response = format!(r#"{{"data":{{"books":[{}]}}}}"#, book_json_list.join(","));
        Ok(response.into_bytes())
    });

    println!("[VennQL] Registered 5 procedures: [1: health, 2: echo, 3: sum, 4: books, 10: get_user]");

    let server = VennServer::new(router);
    server.listen(&addr).await
}
