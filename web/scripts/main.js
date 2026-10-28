// ==========================================================================
// VennQL Official Website Interactive Scripts
// ==========================================================================

// 1. Theme Management (Light / Dark Mode with Persistence)
function initTheme() {
  const savedTheme = localStorage.getItem('vennql-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('vennql-theme', isDark ? 'dark' : 'light');
}

// 2. Interactive Sandbox Data & Logic
const BOOKS_DATABASE = [
  { id: "1", title: "The Hobbit", author: "J.R.R. Tolkien", price: 14.99, rating: 4.9 },
  { id: "2", "title": "1984", author: "George Orwell", price: 12.50, rating: 4.8 },
  { id: "3", title: "Dune", author: "Frank Herbert", price: 18.00, rating: 4.95 },
  { id: "4", title: "Foundation", author: "Isaac Asimov", price: 15.00, rating: 4.7 }
];

let activeLang = 'python';

function switchLang(lang) {
  activeLang = lang;
  document.querySelectorAll('.lang-tab').forEach(t => t.classList.remove('active'));
  const activeBtn = document.getElementById(`tab-${lang}`);
  if (activeBtn) activeBtn.classList.add('active');

  updateSandboxCode();
}

function getSelectedFields() {
  const fields = ['id', 'title', 'author', 'price', 'rating'];
  return fields.filter(f => {
    const el = document.getElementById(`chk-${f}`);
    return el && el.checked;
  });
}

function updateSandboxCode() {
  const selected = getSelectedFields();
  const codeEditor = document.getElementById('sandbox-query-code');
  if (!codeEditor) return;

  const fieldsFormatted = selected.map(f => `'${f}'`).join(', ');

  if (activeLang === 'python') {
    codeEditor.textContent = `# 🐍 Python (Requests-style Client)
from vennql import Client

with Client("ws://api.vennql.org") as client:
    # Selective field query: zero string AST parsing!
    books = client.query("books", select=[${fieldsFormatted}])
    print(books)`;
  } else if (activeLang === 'typescript') {
    codeEditor.textContent = `// ⚡ TypeScript (Browser & Node.js Client)
import { VennClient } from '@vennql/client';

const client = new VennClient();
await client.connect('ws://api.vennql.org');

// Selective field query: zero over-fetching!
const books = await client.query('books', { select: [${fieldsFormatted}] });
console.log(books);`;
  } else if (activeLang === 'rust') {
    codeEditor.textContent = `// 🦀 Rust (Zero-Copy Engine Procedure)
router.route_sync(4, |ctx| {
    let payload = ctx.payload(); // &[u8] contiguous slice
    let books = filter_books_by_mask(payload);
    Ok(books)
});`;
  }
}

function executeSandboxQuery() {
  const selected = getSelectedFields();
  const respArea = document.getElementById('sandbox-response-code');
  const metricLatency = document.getElementById('metric-latency');
  const metricBytes = document.getElementById('metric-bytes');
  const metricCache = document.getElementById('metric-cache');

  if (!respArea) return;

  // Simulate ultra-low sub-millisecond nanosecond response
  const startTime = performance.now();

  const filteredBooks = BOOKS_DATABASE.map(book => {
    const projected = {};
    selected.forEach(field => {
      if (field in book) projected[field] = book[field];
    });
    return projected;
  });

  const responseObj = {
    data: {
      books: filteredBooks
    }
  };

  const jsonStr = JSON.stringify(responseObj, null, 2);
  const duration = (performance.now() - startTime + (Math.random() * 0.04 + 0.02)).toFixed(3);
  const wireBytes = new TextEncoder().encode(jsonStr).length + 16; // 16B header

  respArea.textContent = jsonStr;
  if (metricLatency) metricLatency.textContent = `${duration} ms`;
  if (metricBytes) metricBytes.textContent = `${wireBytes} B (16B Header)`;
  if (metricCache) metricCache.textContent = `vq_0004_${(wireBytes * 31).toString(16)}`;
}

// 3. Search Modal & Keyboard Shortcuts
function initSearch() {
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      triggerSearchModal();
    }
  });
}

function triggerSearchModal() {
  const query = prompt("Search VennQL Documentation (e.g., 'python', 'zero-copy', 'edge cache'):");
  if (query) {
    window.location.href = `/learn?search=${encodeURIComponent(query)}`;
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSearch();
  updateSandboxCode();
  executeSandboxQuery();

  const themeToggle = document.getElementById('theme-toggle-btn');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // Bind checkbox changes
  ['id', 'title', 'author', 'price', 'rating'].forEach(f => {
    const el = document.getElementById(`chk-${f}`);
    if (el) {
      el.addEventListener('change', () => {
        updateSandboxCode();
        executeSandboxQuery();
      });
    }
  });
});
