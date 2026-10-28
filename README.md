# 🌀 VennQL

### The Zero-Copy, High-Throughput Binary API Framework & Protocol.
**Zero-Wire RPC • Direct Memory Slicing • Edge-Cacheable Graphs • Browser-Native Binary Streams**

---

## ⚡ The Architectural Manifesto

Modern web development is trapped in compromises across API paradigms:
- **REST** is simple and CDN-cacheable, but suffers from rigid resource endpoints, string parsing overhead, and heavy over-fetching.
- **GraphQL** empowers frontends with custom data shapes, but sacrifices native CDN caching, imposes heavy JSON text parsing, and triggers severe backend N+1 relational loop explosions.
- **gRPC** delivers compact binary efficiency over internal microservices, but breaks inside browser runtimes due to HTTP/2 trailing header constraints, requiring bulky translation proxies.

**VennQL** synthesizes the best aspects of all three while systematically eliminating their bottlenecks:

| Dimension | REST (JSON) | GraphQL | gRPC / Protobuf | **VennQL** |
| :--- | :--- | :--- | :--- | :--- |
| **Wire Format** | Text UTF-8 JSON | Text UTF-8 JSON | Binary Protobuf | **Zero-Copy Flat Memory Buffers** |
| **Parsing Cost** | String deserialization | Recursive AST parse | Schema deserialization | **Zero Heap Allocations (`&[u8]`)** |
| **Browser Support**| 100% Native | 100% Native | Requires Envoy Proxy | **100% Native (WebSocket / WebTransport)** |
| **CDN Cacheability**| Native via URL path | Impractical (POST) | None | **O(1) Deterministic Cache Tag (`twox-hash`)** |
| **Dispatch Speed** | O(N) Path RegEx | Dynamic Resolver Map | Generated Stubs | **O(1) Direct Procedure ID Lookup** |

---

## 🏗️ Repository Architecture

```text
VennQL/
├── crates/
│   ├── vennql-core/         # Wire framing spec, zero-copy parser, OpCodes, Edge hashing
│   ├── vennql-router/       # O(1) direct procedure dispatcher & middleware pipeline
│   └── vennql-server/       # Native binary network server (WebSockets / WebTransport)
├── packages/
│   ├── client/              # Zero-copy TypeScript SDK for Browser & Node.js
│   └── cli/                 # `vennql` CLI runner (init, dev, bench, check)
└── examples/
    └── benchmark-service/   # High-concurrency in-memory microbenchmark suite
```

---

## 🔬 Binary Wire Frame Layout

VennQL communicates using a fixed 16-byte header with direct memory slicing into payloads:

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Magic (0x56) | Version (0x01)|   OpCode (1B) |   Flags (1B)  |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                        Transaction ID (4B)                    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|       Procedure ID (2B)       |      VTable Offset (2B)       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                        Payload Length (4B)                    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                   Zero-Copy Payload Slice (&[u8])             |
|                               ...                             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

### Operation Codes (`OpCode`)
- `0x01` — **Query**: Deterministic read operation with automatic CDN cache tag generation.
- `0x02` — **Mutate**: State-altering write operation (create, update, delete).
- `0x03` — **Stream**: Bidirectional real-time stream packet.
- `0x04` — **Ping**: Nanosecond liveness heartbeat.
- `0x05` — **Pong**: Liveness response.
- `0x06` — **Ack**: Positive transaction acknowledgment.
- `0xFE` — **Cancel**: Asynchronous pipeline cancellation.
- `0xFF` — **Error**: Standardized binary error frame with error code and description.

---

## 📊 Empirical Microbenchmark Results

Tested on 1,000,000 real operations (`benchmark-service` release build):

| Benchmark Stage | Total Duration (1,000,000 ops) | Latency per Op | Throughput |
| :--- | :--- | :--- | :--- |
| **Binary Frame Encoding** | 24.97 ms | **24.97 ns / op** | **40.05 Million ops/sec** |
| **Zero-Copy Frame Parsing** | 32.31 ms | **32.31 ns / op** | **30.95 Million ops/sec** |
| **End-to-End Async Dispatch** | 482.02 ms | **482.02 ns / op** | **2.07 Million ops/sec** |

---

## 🚀 Quick Start

### 1. Launch the VennQL Server (Rust)

```bash
cargo run -p vennql-server
```

### 2. Connect via the TypeScript Client

```typescript
import { VennClient } from '@vennql/client';

const client = new VennClient();
await client.connect('ws://127.0.0.1:8080');

// Execute procedure #1 (Health query)
const health = await client.query(1);
console.log('Server status:', health);

// Execute procedure #10 (User lookup)
const user = await client.query(10, 'usr_1337');
console.log('User profile:', user);
```

### 3. Run Microbenchmarks

```bash
cargo run --release -p benchmark-service
```

---

## 📄 License
MIT License. Open source.
