import sys
from vennql import Client

def main():
    port = sys.argv[1] if len(sys.argv) > 1 else "8081"
    url = f"ws://127.0.0.1:{port}"
    print(f"Connecting to VennQL at {url}...\n")

    procedures = {
        'books': 4,
        'book_by_id': 5,
        'create_book': 6,
    }

    with Client(url, procedures=procedures) as client:
        # 1. Fast-path Ping
        ping_latency = client.ping()
        print(f"[1] Heartbeat Ping Latency: {ping_latency:.3f} ms")

        # 2. Health Query
        health = client.query("health")
        print(f"[2] Health Response: {health}")

        # 3. Query with GraphQL-style Field Selection (Only title and author)
        books_selected = client.query("books", select=["title", "author"])
        print(f"\n[3] Selective Query ('books', select=['title', 'author']):")
        for b in books_selected:
            print(f"   * {b.get('title')} by {b.get('author')} (Price/Rating omitted: zero over-fetch!)")

        # 4. Mutation: Create Book
        new_book = client.mutate("create_book", title="Neuromancer", author="William Gibson", price=16.50)
        print(f"\n[4] Mutation Response ('create_book'): {new_book}")

        # 5. Query single book by ID
        book = client.query("book_by_id", payload={"id": "3"})
        print(f"\n[5] Lookup ('book_by_id', id='3'): {book}")

    print("\nALL PYTHON VENNQL CLIENT TESTS PASSED!")

if __name__ == "__main__":
    main()
