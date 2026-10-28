from bs4 import BeautifulSoup

path = r'C:\Users\MY PC\.gemini\antigravity-ide\brain\7ea23f54-c46c-4c6d-8eb7-120ecccbec9b\.system_generated\steps\885\content.md'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

soup = BeautifulSoup(text, 'html.parser')

print("=== TITLE ===")
print(soup.title.string if soup.title else "No title")

print("\n=== HEADINGS ===")
for h in soup.find_all(['h1', 'h2', 'h3', 'h4']):
    print(f"{h.name.upper()}: {h.get_text(strip=True)}")

print("\n=== NAV LINKS ===")
seen = set()
for a in soup.find_all('a'):
    href = a.get('href')
    txt = a.get_text(strip=True)
    if txt and href and href not in seen:
        seen.add(href)
        print(f"{txt} -> {href}")

print("\n=== BUTTONS ===")
for b in soup.find_all('button'):
    txt = b.get_text(strip=True)
    if txt:
        print(f"BUTTON: {txt}")
