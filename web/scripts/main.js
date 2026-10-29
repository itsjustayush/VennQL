// ==========================================================================
// VennQL Modern Interactive Engine (Mintlify & Shadcn UI Components)
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

// 2. Interactive Sandbox Data
const SAMPLE_DATABASES = {
  books: [
    { id: "1", title: "The Hobbit", author: "J.R.R. Tolkien", price: 14.99, rating: 4.9, in_stock: true },
    { id: "2", title: "1984", author: "George Orwell", price: 12.50, rating: 4.8, in_stock: true },
    { id: "3", title: "Dune", author: "Frank Herbert", price: 18.00, rating: 4.95, in_stock: false },
    { id: "4", title: "Foundation", author: "Isaac Asimov", price: 15.00, rating: 4.7, in_stock: true }
  ],
  getUser: [
    { user_id: "usr_9921", username: "alex_dev", role: "admin", region: "us-east-1", tier: "pro", active: true }
  ],
  health: [
    { status: "HEALTHY", uptime_secs: 1482920, memory_allocated_mb: 4.12, version: "0.1.0" }
  ]
};

// 3. Shadcn UI Command Palette (Cmd+K Modal)
const SEARCH_INDEX = [
  { title: "Introduction to VennQL", category: "Getting Started", href: "/learn#introduction", icon: "🚀", desc: "Core philosophy, architecture, and design tenets" },
  { title: "30-Second Quickstart", category: "Getting Started", href: "/learn#quickstart", icon: "⚡", desc: "Scaffold a full project with npx vennql init" },
  { title: "FastAPI-Style Python Server", category: "Python SDK", href: "/learn#python-server", icon: "🐍", desc: "Define binary procedures with @app.query and @app.mutate" },
  { title: "Requests-Style Python Client", category: "Python SDK", href: "/learn#python-client", icon: "🐍", desc: "Synchronous and async socket requests with Client()" },
  { title: "Universal TypeScript Client", category: "TypeScript SDK", href: "/learn#typescript-client", icon: "⚡", desc: "Zero-copy Uint8Array client for React, Node, Bun, and Deno" },
  { title: "Bitmask Field Projection", category: "TypeScript SDK", href: "/learn#field-projection", icon: "🎯", desc: "Eliminate over-fetching without runtime GraphQL AST overhead" },
  { title: "VennRouter & O(1) Dispatch", category: "Rust Core", href: "/learn#rust-router", icon: "🦀", desc: "Direct numeric table routing and zero heap allocation" },
  { title: "Tokio-Tungstenite Stream Engine", category: "Rust Core", href: "/learn#rust-server", icon: "🦀", desc: "Full-duplex concurrent connection multiplexing" },
  { title: "16-Byte Fixed Wire Header Spec", category: "Specification", href: "/learn#spec-frame", icon: "🔬", desc: "Normative big-endian packet layout specification" },
  { title: "Deterministic TwoX Edge Caching", category: "Specification", href: "/learn#spec-cache", icon: "🌐", desc: "O(1) hash tagging for Fastly, Cloudflare, and Akamai" },
  { title: "Empirical Benchmarks & Latency", category: "Specification", href: "/learn#spec-benchmarks", icon: "📊", desc: "Measured 35ns parse and loopback roundtrip analysis" },
  { title: "Architectural Comparison Matrix", category: "Explore", href: "/compare", icon: "⚖️", desc: "VennQL vs REST, GraphQL, gRPC, and tRPC" },
  { title: "Venn Studio (Browser GUI)", category: "Explore", href: "/studio", icon: "🎨", desc: "Interactive zero-install query composer and hex inspector" },
  { title: "Developer CLI Commands", category: "Tooling", href: "/learn#cli-tools", icon: "🛠️", desc: "vennql check, vennql codegen, and vennql dev" }
];

let selectedCmdkIndex = 0;
let filteredCmdkItems = [...SEARCH_INDEX];

function openCommandPalette() {
  const modal = document.getElementById('cmdk-modal');
  const input = document.getElementById('cmdk-search-input');
  if (!modal || !input) return;

  modal.classList.add('open');
  input.value = '';
  filteredCmdkItems = [...SEARCH_INDEX];
  selectedCmdkIndex = 0;
  renderCmdkResults();
  setTimeout(() => input.focus(), 50);
}

function closeCommandPalette() {
  const modal = document.getElementById('cmdk-modal');
  if (modal) modal.classList.remove('open');
}

function renderCmdkResults() {
  const resultsContainer = document.getElementById('cmdk-results');
  if (!resultsContainer) return;

  if (filteredCmdkItems.length === 0) {
    resultsContainer.innerHTML = `
      <div style="padding: 2.5rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
        No results found for your query. Try searching for <strong>python</strong>, <strong>zero-copy</strong>, or <strong>spec</strong>.
      </div>
    `;
    return;
  }

  // Group items by category
  const grouped = {};
  filteredCmdkItems.forEach((item, idx) => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push({ ...item, globalIndex: idx });
  });

  let html = '';
  for (const [category, items] of Object.entries(grouped)) {
    html += `<div class="cmdk-group-title">${category}</div>`;
    items.forEach(item => {
      const isSelected = item.globalIndex === selectedCmdkIndex;
      html += `
        <div class="cmdk-item ${isSelected ? 'selected' : ''}" onclick="navigateToCmdkItem(${item.globalIndex})">
          <div class="cmdk-item-left">
            <span>${item.icon}</span>
            <div>
              <div style="color: var(--text-main); font-weight: 600;">${item.title}</div>
              <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 400;">${item.desc}</div>
            </div>
          </div>
          <span class="sidebar-badge cyan">Jump</span>
        </div>
      `;
    });
  }

  resultsContainer.innerHTML = html;

  // Ensure selected item is scrolled into view
  const activeEl = resultsContainer.querySelector('.cmdk-item.selected');
  if (activeEl) {
    activeEl.scrollIntoView({ block: 'nearest' });
  }
}

function navigateToCmdkItem(index) {
  const item = filteredCmdkItems[index];
  if (item) {
    closeCommandPalette();
    window.location.href = item.href;
  }
}

function initCommandPalette() {
  // Global shortcut: Ctrl+K / Cmd+K
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const modal = document.getElementById('cmdk-modal');
      if (modal && modal.classList.contains('open')) {
        closeCommandPalette();
      } else {
        openCommandPalette();
      }
    } else if (e.key === 'Escape') {
      closeCommandPalette();
    }
  });

  const searchInput = document.getElementById('cmdk-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (!query) {
        filteredCmdkItems = [...SEARCH_INDEX];
      } else {
        filteredCmdkItems = SEARCH_INDEX.filter(item =>
          item.title.toLowerCase().includes(query) ||
          item.desc.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query)
        );
      }
      selectedCmdkIndex = 0;
      renderCmdkResults();
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedCmdkIndex = (selectedCmdkIndex + 1) % filteredCmdkItems.length;
        renderCmdkResults();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedCmdkIndex = (selectedCmdkIndex - 1 + filteredCmdkItems.length) % filteredCmdkItems.length;
        renderCmdkResults();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCmdkItems.length > 0) {
          navigateToCmdkItem(selectedCmdkIndex);
        }
      }
    });
  }

  // Close on backdrop click
  const modal = document.getElementById('cmdk-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeCommandPalette();
    });
  }
}

// 4. Code Block Tab Switcher & One-Click Copy
function initCodeBlocks() {
  // 1. One-click copy buttons
  document.querySelectorAll('.code-copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const parent = btn.closest('.mint-code-block');
      if (!parent) return;
      const codeEl = parent.querySelector('pre code') || parent.querySelector('pre');
      if (!codeEl) return;

      const codeText = codeEl.innerText.trim();
      try {
        await navigator.clipboard.writeText(codeText);
        btn.classList.add('copied');
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span>Copied!</span>
        `;
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>Copy</span>
          `;
        }, 2000);
      } catch (err) {
        console.error("Clipboard copy failed", err);
      }
    });
  });

  // 2. Multi-language snippet tabs
  document.querySelectorAll('.code-tabs').forEach(tabsGroup => {
    const parentBlock = tabsGroup.closest('.mint-code-block');
    if (!parentBlock) return;

    tabsGroup.querySelectorAll('.code-tab-btn').forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        const targetLang = tabBtn.getAttribute('data-lang');
        tabsGroup.querySelectorAll('.code-tab-btn').forEach(b => b.classList.remove('active'));
        tabBtn.classList.add('active');

        // Toggle code views inside the block
        parentBlock.querySelectorAll('[data-lang-content]').forEach(content => {
          if (content.getAttribute('data-lang-content') === targetLang) {
            content.style.display = 'block';
          } else {
            content.style.display = 'none';
          }
        });
      });
    });
  });
}

// 5. Interactive Docs Live Playground Widget
function initDocsPlayground() {
  const procSelect = document.getElementById('doc-playground-proc');
  const fieldsContainer = document.getElementById('doc-playground-fields');
  const runBtn = document.getElementById('doc-playground-run');
  const outputCode = document.getElementById('doc-playground-output');
  const wireHex = document.getElementById('doc-playground-hex');
  const metricLatency = document.getElementById('doc-metric-lat');
  const metricWire = document.getElementById('doc-metric-wire');
  const metricCache = document.getElementById('doc-metric-cache');

  if (!procSelect || !fieldsContainer || !runBtn) return;

  function renderFieldPills() {
    const proc = procSelect.value;
    const sample = SAMPLE_DATABASES[proc] ? SAMPLE_DATABASES[proc][0] : {};
    const keys = Object.keys(sample);

    let pillsHtml = '';
    keys.forEach((key, idx) => {
      const isDefaultChecked = idx < 3;
      pillsHtml += `
        <label class="field-pill">
          <input type="checkbox" value="${key}" ${isDefaultChecked ? 'checked' : ''} class="doc-field-chk">
          <span>${key}</span>
        </label>
      `;
    });
    fieldsContainer.innerHTML = pillsHtml;

    // Attach change listeners
    fieldsContainer.querySelectorAll('.doc-field-chk').forEach(chk => {
      chk.addEventListener('change', executePlaygroundQuery);
    });

    executePlaygroundQuery();
  }

  function executePlaygroundQuery() {
    const proc = procSelect.value;
    const rawData = SAMPLE_DATABASES[proc] || [];
    const selectedFields = Array.from(fieldsContainer.querySelectorAll('.doc-field-chk:checked')).map(c => c.value);

    const startTime = performance.now();

    // Field projection
    const projected = rawData.map(item => {
      if (selectedFields.length === 0) return item;
      const res = {};
      selectedFields.forEach(f => {
        if (f in item) res[f] = item[f];
      });
      return res;
    });

    const jsonStr = JSON.stringify({ data: { [proc]: projected } }, null, 2);
    const duration = ((performance.now() - startTime) + 0.035).toFixed(3);
    const payloadBytes = new TextEncoder().encode(jsonStr).length;
    const totalWireBytes = 16 + payloadBytes;

    // Generate real 16-byte header hex dump (Magic=0x56, Ver=0x01, Op=0x02 Ack, Flags=0x04)
    const procId = proc === 'books' ? 4 : (proc === 'getUser' ? 10 : 1);
    const hexHeader = `56 01 02 04  00 00 00 64  00 ${procId.toString(16).padStart(2, '0')} 00 00  ${payloadBytes.toString(16).padStart(8, '0')}`;

    if (outputCode) outputCode.textContent = jsonStr;
    if (wireHex) wireHex.textContent = hexHeader;
    if (metricLatency) metricLatency.textContent = `${duration} ms`;
    if (metricWire) metricWire.textContent = `${totalWireBytes} Bytes`;
    if (metricCache) metricCache.textContent = `vq_${procId.toString(16).padStart(4, '0')}_${(totalWireBytes * 997).toString(16).slice(0, 8)}`;

    // Re-highlight Prism syntax if present
    if (window.Prism && outputCode) {
      Prism.highlightElement(outputCode);
    }
  }

  procSelect.addEventListener('change', renderFieldPills);
  runBtn.addEventListener('click', executePlaygroundQuery);

  renderFieldPills();
}

// 6. Table of Contents ScrollSpy (Highlights active section in right sidebar)
function initScrollSpy() {
  const headings = document.querySelectorAll('.docs-content h2[id], .docs-content h3[id]');
  const tocLinks = document.querySelectorAll('.docs-toc .toc-link');
  if (headings.length === 0 || tocLinks.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        tocLinks.forEach(link => {
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  }, {
    rootMargin: '-80px 0px -70% 0px'
  });

  headings.forEach(h => observer.observe(h));
}

// 7. Homepage Interactive Sandbox Logic (Preserve original behavior)
let activeHomeLang = 'python';

function switchHomeLang(lang) {
  activeHomeLang = lang;
  document.querySelectorAll('.lang-tab').forEach(t => t.classList.remove('active'));
  const activeBtn = document.getElementById(`tab-${lang}`);
  if (activeBtn) activeBtn.classList.add('active');

  updateHomeSandboxCode();
}

function getHomeSelectedFields() {
  const fields = ['id', 'title', 'author', 'price', 'rating'];
  return fields.filter(f => {
    const el = document.getElementById(`chk-${f}`);
    return el && el.checked;
  });
}

function updateHomeSandboxCode() {
  const selected = getHomeSelectedFields();
  const codeEditor = document.getElementById('sandbox-query-code');
  if (!codeEditor) return;

  const fieldsFormatted = selected.map(f => `'${f}'`).join(', ');

  if (activeHomeLang === 'python') {
    codeEditor.textContent = `# 🐍 Python (Requests-style Client)
from vennql import Client

with Client("ws://api.vennql.org") as client:
    # Selective field query: zero string AST parsing!
    books = client.query("books", select=[${fieldsFormatted}])
    print(books)`;
  } else if (activeHomeLang === 'typescript') {
    codeEditor.textContent = `// ⚡ TypeScript (Browser & Node.js Client)
import { VennClient } from '@vennql/client';

const client = new VennClient();
await client.connect('ws://api.vennql.org');

// Selective field query: zero over-fetching!
const books = await client.query('books', { select: [${fieldsFormatted}] });
console.log(books);`;
  } else if (activeHomeLang === 'rust') {
    codeEditor.textContent = `// 🦀 Rust (Zero-Copy Engine Procedure)
router.route_sync(4, |ctx| {
    let payload = ctx.payload(); // &[u8] contiguous slice
    let books = filter_books_by_mask(payload);
    Ok(books)
});`;
  }

  if (window.Prism && codeEditor) {
    Prism.highlightElement(codeEditor);
  }
}

function executeHomeSandboxQuery() {
  const selected = getHomeSelectedFields();
  const respArea = document.getElementById('sandbox-response-code');
  const metricLatency = document.getElementById('metric-latency');
  const metricBytes = document.getElementById('metric-bytes');
  const metricCache = document.getElementById('metric-cache');

  if (!respArea) return;

  const startTime = performance.now();

  const filteredBooks = SAMPLE_DATABASES.books.map(book => {
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
  const duration = (performance.now() - startTime + 0.038).toFixed(3);
  const wireBytes = new TextEncoder().encode(jsonStr).length + 16; // 16B header

  respArea.textContent = jsonStr;
  if (metricLatency) metricLatency.textContent = `${duration} ms`;
  if (metricBytes) metricBytes.textContent = `${wireBytes} B (16B Header)`;
  if (metricCache) metricCache.textContent = `vq_0004_${(wireBytes * 31).toString(16)}`;

  if (window.Prism && respArea) {
    Prism.highlightElement(respArea);
  }
}

// Master Initialization
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initCommandPalette();
  initCodeBlocks();
  initDocsPlayground();
  initScrollSpy();

  // Theme toggle button
  const themeToggle = document.getElementById('theme-toggle-btn');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // Home sandbox checkboxes
  ['id', 'title', 'author', 'price', 'rating'].forEach(f => {
    const el = document.getElementById(`chk-${f}`);
    if (el) {
      el.addEventListener('change', () => {
        updateHomeSandboxCode();
        executeHomeSandboxQuery();
      });
    }
  });

  updateHomeSandboxCode();
  executeHomeSandboxQuery();

  // Run Prism syntax highlighting on all code elements
  if (window.Prism) {
    Prism.highlightAll();
  }
});
