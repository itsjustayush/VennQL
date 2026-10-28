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

    // Procedure 4: Bookstore Catalog with dynamic client field projection (GraphQL-style without AST parsing)
    router.route_sync(4, |ctx| {
        let payload_str = std::str::from_utf8(ctx.payload()).unwrap_or("{}");

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

        let select_id = payload_str.contains("\"id\"");
        let select_title = payload_str.contains("\"title\"");
        let select_author = payload_str.contains("\"author\"");
        let select_price = payload_str.contains("\"price\"");
        let select_rating = payload_str.contains("\"rating\"");
        let any_selected = select_id || select_title || select_author || select_price || select_rating;

        let mut book_json_list = Vec::new();
        for b in books.iter() {
            let mut fields = Vec::new();
            if !any_selected || select_id { fields.push(format!(r#""id":"{}""#, b.id)); }
            if !any_selected || select_title { fields.push(format!(r#""title":"{}""#, b.title)); }
            if !any_selected || select_author { fields.push(format!(r#""author":"{}""#, b.author)); }
            if !any_selected || select_price { fields.push(format!(r#""price":{}"#, b.price)); }
            if !any_selected || select_rating { fields.push(format!(r#""rating":{}"#, b.rating)); }
            book_json_list.push(format!("{{{}}}", fields.join(",")));
        }

        let response = format!(r#"{{"data":{{"books":[{}]}}}}"#, book_json_list.join(","));
        Ok(response.into_bytes())
    });

    println!("[VennQL] Registered 5 procedures: [1: health, 2: echo, 3: sum, 4: books, 10: get_user]");

    let server = VennServer::new(router);
    server.listen(&addr).await
}
