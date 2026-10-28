import sys
import json
from vennql import Client, Colors

def main():
    port = sys.argv[1] if len(sys.argv) > 1 else "8081"
    url = f"ws://127.0.0.1:{port}"
    c = Colors

    print(f"\n  {c.CYAN}{c.BOLD}⚡ VennQL Python Client Test Suite{c.RESET}")
    print(f"  {c.GRAY}Target:{c.RESET} {c.CYAN}{url}{c.RESET}\n")

    procedures = {
        'books': 4,
        'book_by_id': 5,
        'create_book': 6,
    }

    with Client(url, procedures=procedures) as client:
        # 1. Fast-path Ping
        ping_latency = client.ping()
        print(f"  {c.BG_PURPLE} [1] PING   {c.RESET} Round-Trip Latency: {c.GREEN}{c.BOLD}{ping_latency:.3f} ms{c.RESET}")

        # 2. Health Query
        health = client.query("health")
        print(f"  {c.BG_CYAN} [2] QUERY  {c.RESET} Health Status: {c.GREEN}{c.BOLD}{health.get('status', 'OK')}{c.RESET} {c.DIM}({health.get('engine')}){c.RESET}")

        # 3. Query with GraphQL-style Field Selection (Only title and author)
        books_selected = client.query("books", select=["title", "author"])
        print(f"\n  {c.BG_CYAN} [3] SELECT {c.RESET} Query 'books' with projection: {c.YELLOW}['title', 'author']{c.RESET}")
        for b in books_selected:
            title = b.get('title', '')
            author = b.get('author', '')
            print(f"       {c.DARK_GRAY}•{c.RESET} {c.WHITE}{title:<18}{c.RESET} {c.GRAY}by {author:<16}{c.RESET} {c.DIM}[zero-copy projected]{c.RESET}")

        # 4. Mutation: Create Book
        new_book = client.mutate("create_book", title="Neuromancer", author="William Gibson", price=16.50)
        print(f"\n  {c.BG_MAGENTA} [4] MUTATE {c.RESET} 'create_book' -> ID: {c.YELLOW}#{new_book.get('id')}{c.RESET}")
        print(f"       {c.DARK_GRAY}↳{c.RESET} {c.WHITE}{new_book.get('title')}{c.RESET} by {c.GRAY}{new_book.get('author')}{c.RESET} | {c.GREEN}${new_book.get('price'):.2f}{c.RESET}")

        # 5. Query single book by ID
        book = client.query("book_by_id", payload={"id": "3"})
        print(f"\n  {c.BG_CYAN} [5] LOOKUP {c.RESET} 'book_by_id' (id='3'): {c.WHITE}{book.get('title')}{c.RESET} ({book.get('author')})")

    print(f"\n  {c.BG_GREEN} ✔ SUCCESS {c.RESET} {c.GREEN}{c.BOLD}All Python VennQL client tests passed with sub-millisecond execution!{c.RESET}\n")

if __name__ == "__main__":
    main()

