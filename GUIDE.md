# 🛠️ VennQL Developer Guide: From Zero to Production

This guide covers everything a developer needs to build, test, and ship high-performance APIs with **VennQL**.

---

## 🚀 1. The 30-Second Quickstart

The fastest way to scaffold a VennQL project is via the Developer CLI:

```bash
# Scaffold a new workspace
npx vennql init my-venn-app
cd my-venn-app

# Install client dependencies
npm install

# Start local server and test
cargo run -p vennql-server
node index.js
```

---

## 🦀 2. Building the Server (Rust)

A VennQL server revolves around the **[VennRouter](file:///e:/Projects/VennQL/crates/vennql-router/src/router.rs)**, which maps numeric `procedure_id` (`u16`) directly into an $O(1)$ dispatch table.

### Basic Server Setup

```rust
use vennql_core::{VennError, Result};
use vennql_router::VennRouter;
use vennql_server::VennServer;

#[tokio::main]
async fn main() -> std::io::Result<()> {
    let mut router = VennRouter::new();

    // -------------------------------------------------------------
    // Procedure 1: Synchronous In-Memory Handler (Sub-microsecond)
    // -------------------------------------------------------------
    router.route_sync(1, |ctx| {
        // Zero-copy access to request payload
        let payload_bytes = ctx.payload(); 
        
        // Return raw binary or serialized data
        Ok(b"{\"status\":\"ok\",\"engine\":\"VennQL\"}".to_vec())
    });

    // -------------------------------------------------------------
    // Procedure 2: Asynchronous Database / Network Handler
    // -------------------------------------------------------------
    router.route_async(10, |ctx| {
        Box::pin(async move {
            // Read client input without allocations
            let user_id = std::str::from_utf8(ctx.payload()).unwrap_or("anon");
            
            // Perform async work (e.g., database lookup)
            let user_json = format!(
                r#"{{"id":"{}","name":"Alice","tier":"pro"}}"#, 
                user_id
            );
            
            Ok(user_json.into_bytes())
        })
    });

    // -------------------------------------------------------------
    // Procedure 3: Zero-Copy Raw Binary Math (Packed u32 array)
    // -------------------------------------------------------------
    router.route_sync(3, |ctx| {
        let payload = ctx.payload();
        if payload.len() % 4 != 0 {
            return Err(VennError::MalformedPayload("Expected 4-byte chunks".into()));
        }

        let mut sum: u64 = 0;
        for chunk in payload.chunks_exact(4) {
            let val = u32::from_be_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]);
            sum += val as u64;
        }

        // Return packed 64-bit Big-Endian binary integer
        Ok(sum.to_be_bytes().to_vec())
    });

    // Bind and listen over binary WebSocket transport
    println!("⚡ VennQL Server listening on ws://127.0.0.1:8080");
    let server = VennServer::new(router);
    server.listen("127.0.0.1:8080").await
}
```

---

## 💻 3. Calling from the Client (TypeScript / JavaScript)

The `@vennql/client` SDK runs identically in **Browsers**, **React**, **Vue**, **Node.js**, **Bun**, and **Deno**.

### Installation

```bash
npm install @vennql/client
```

### Universal Client Usage

```typescript
import { VennClient, OpCode } from '@vennql/client';

async function runApp() {
  // 1. Initialize client
  const client = new VennClient();
  await client.connect('ws://127.0.0.1:8080');

  // 2. Nanosecond Heartbeat Ping
  const pingLatency = await client.ping();
  console.log(`⚡ Round-trip latency: ${pingLatency.toFixed(3)} ms`);

  // 3. Query Procedure (Auto-JSON serialization)
  const health = await client.query(1);
  console.log('Health:', health);

  // 4. Query with Parameters
  const user = await client.query(10, 'usr_998');
  console.log('User Profile:', user);

  // 5. High-Performance Zero-Copy Binary Call
  // Pack 4 numbers into a contiguous binary ArrayBuffer
  const numbers = [100, 200, 300, 400];
  const buffer = new ArrayBuffer(numbers.length * 4);
  const view = new DataView(buffer);
  numbers.forEach((n, i) => view.setUint32(i * 4, n, false));

  // Send raw binary Uint8Array
  const responseBytes = await client.call(OpCode.Query, 3, new Uint8Array(buffer));
  
  // Read BigEndian 64-bit sum directly from binary response
  const respView = new DataView(responseBytes.buffer, responseBytes.byteOffset, responseBytes.byteLength);
  const totalSum = respView.getBigUint64(0, false);
  console.log(`Binary Sum Result: ${totalSum}`); // 1000n

  // 6. Graceful Disconnect
  client.close();
}

runApp();
```

---

## 🛡️ 4. Adding Middleware (Auth, Logging, Metrics)

VennQL provides asynchronous middleware with `before` and `after` hooks:

```rust
use vennql_router::middleware::Middleware;
use vennql_router::context::RequestContext;
use vennql_core::{Result, VennError};
use async_trait::async_trait;

struct AuthMiddleware;

#[async_trait]
impl Middleware for AuthMiddleware {
    async fn before(&self, ctx: &RequestContext<'_>) -> Result<()> {
        // Allow public health check (Procedure 1) without auth
        if ctx.procedure_id() == 1 {
            return Ok(());
        }

        // Example: Inspect client metadata or token
        // In real apps, token can be passed in VTable offset or frame header
        println!("[Auth] Checking credentials for procedure {}", ctx.procedure_id());
        Ok(())
    }

    async fn after(&self, ctx: &RequestContext<'_>, output: &mut Vec<u8>) -> Result<()> {
        println!("[Audit] Procedure {} returned {} bytes", ctx.procedure_id(), output.len());
        Ok(())
    }
}

// Attach to router
router.add_middleware(AuthMiddleware);
```

---

## ⚡ 5. Schema & Contract Configuration (`vennql.config.json`)

To document and validate procedures between frontend and backend teams:

```json
{
  "name": "my-trading-app",
  "version": "1.0.0",
  "protocol": {
    "version": 1,
    "magic": "0x56",
    "wire": "binary"
  },
  "procedures": {
    "1": { "name": "health", "type": "query", "cacheable": true },
    "2": { "name": "echo", "type": "mutate", "cacheable": false },
    "3": { "name": "binarySum", "type": "query", "cacheable": true },
    "10": { "name": "getUser", "type": "query", "cacheable": true }
  }
}
```

Run contract validation:
```bash
npx vennql check
```

---

## 📊 6. Running Built-in Benchmarks

To verify raw hardware limits on your local machine:

```bash
# In-memory zero-copy microbenchmark (1,000,000 requests)
cargo run --release -p benchmark-service
```
