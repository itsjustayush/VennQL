from vennql import VennApp

app = VennApp(title="VennQL Bookstore API")

# Mock Database
BOOKS_DB = [
    {"id": "1", "title": "The Hobbit", "author": "J.R.R. Tolkien", "price": 14.99, "rating": 4.9},
    {"id": "2", "title": "1984", "author": "George Orwell", "price": 12.50, "rating": 4.8},
    {"id": "3", "title": "Dune", "author": "Frank Herbert", "price": 18.00, "rating": 4.95},
    {"id": "4", "title": "Foundation", "author": "Isaac Asimov", "price": 15.00, "rating": 4.7},
]

# Query 1: Books Catalog with Selective Field Projection
@app.query("books", procedure_id=4)
def get_books(select: list = None):
    """Fetch books with optional field projection (GraphQL-style without AST parsing)."""
    if select:
        return [{k: b[k] for k in select if k in b} for b in BOOKS_DB]
    return BOOKS_DB

# Query 2: Single Book Lookup
@app.query("book_by_id", procedure_id=5)
def get_book_by_id(id: str = "1"):
    for b in BOOKS_DB:
        if b["id"] == str(id):
            return b
    return {"error": "Book not found"}

# Mutation: Add New Book
@app.mutate("create_book", procedure_id=6)
def create_book(title: str, author: str, price: float = 9.99):
    """Add a new book to the database."""
    new_book = {
        "id": str(len(BOOKS_DB) + 1),
        "title": title,
        "author": author,
        "price": float(price),
        "rating": 5.0
    }
    BOOKS_DB.append(new_book)
    return new_book

if __name__ == "__main__":
    import os
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8080))
    app.run(host=host, port=port)
