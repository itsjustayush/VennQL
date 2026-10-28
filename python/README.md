# 🌀 VennQL for Python

[![PyPI](https://img.shields.io/pypi/v/vennql.svg)](https://pypi.org/project/vennql/)
[![Python](https://img.shields.io/pypi/pyversions/vennql.svg)](https://pypi.org/project/vennql/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/itsjustayush/VennQL/blob/main/LICENSE)
[![Zero-Copy](https://img.shields.io/badge/Memory-Zero--Copy-purple.svg)](https://github.com/itsjustayush/VennQL)

**The Zero-Copy, High-Throughput Binary API Framework & Protocol for Python.**

VennQL provides a FastAPI-inspired developer experience combined with C-speed binary framing over full-duplex WebSockets. It solves the structural compromises of REST (over-fetching, repetitive headers) and GraphQL (AST parsing overhead, lack of edge cacheability).

---

## ⚡ Key Highlights

- **FastAPI/Strawberry Simplicity**: Define `@app.query` and `@app.mutate` procedures with clean type-hinted Python decorators.
- **GraphQL-Style Selective Projection**: Fetch only requested fields (`select=['title', 'price']`) without recursive AST parsing.
- **Fixed 16-Byte Binary Framing**: Fast-path wire parsing in under 1 microsecond.
- **Built-in Venn Studio**: Full interactive in-browser playground served directly on `http://127.0.0.1:8080/studio` with zero extra dependencies.
- **High-Visibility Colourful Logging**: Real-time telemetry, microsecond latency timers, byte counters, and connection monitoring.

---

## 📦 Installation

```bash
pip install vennql
```

---

## 🚀 Quick Start

### 1. The Server (`app.py`)

```python
from vennql import VennApp

app = VennApp(title="Bookstore API")

BOOKS_DB = [
    {"id": "1", "title": "The Hobbit", "author": "J.R.R. Tolkien", "price": 14.99},
    {"id": "2", "title": "1984", "author": "George Orwell", "price": 12.50},
    {"id": "3", "title": "Dune", "author": "Frank Herbert", "price": 18.00},
]

# Query with selective field projection (GraphQL-style without AST parsing)
@app.query("books", procedure_id=4)
def get_books(select: list = None):
    if select:
        return [{k: b[k] for k in select if k in b} for b in BOOKS_DB]
    return BOOKS_DB

# Mutation to add new items
@app.mutate("create_book", procedure_id=6)
def create_book(title: str, author: str, price: float = 9.99):
    book = {"id": str(len(BOOKS_DB) + 1), "title": title, "author": author, "price": price}
    BOOKS_DB.append(book)
    return book

if __name__ == "__main__":
    # Serves binary WebSocket RPC + Venn Studio Web UI
    app.run(host="127.0.0.1", port=8080)
```

### 2. The Client (`client.py`)

```python
from vennql import Client

# Connect to VennQL binary server
with Client("ws://127.0.0.1:8080") as client:
    # 1. Fast-path Heartbeat Ping (< 0.5 ms)
    latency = client.ping()
    print(f"Ping: {latency:.3f} ms")

    # 2. Query with selective projection (Only title and price!)
    books = client.query("books", select=["title", "price"])
    for b in books:
        print(f"• {b['title']} - ${b['price']}")

    # 3. Mutation
    new_book = client.mutate("create_book", title="Neuromancer", author="William Gibson", price=16.50)
    print(f"Created book #{new_book['id']}")
```

---

## 🎨 Interactive Venn Studio

Open `http://127.0.0.1:8080/studio` in any web browser to:
- Browse registered procedures.
- Toggle fields visually with checkboxes.
- Inspect the raw 16-byte binary wire frames in hex.
- Generate client code in Python, TypeScript, and Rust.

---

## 📄 License

MIT License. Open source and freely extensible.
Repository: [https://github.com/itsjustayush/VennQL](https://github.com/itsjustayush/VennQL)
