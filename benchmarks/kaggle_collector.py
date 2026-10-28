import os
import json
import requests
from typing import Dict, List, Any

KAGGLE_API_TOKEN = os.getenv("KAGGLE_API_TOKEN", "KGAT_280a7d5b2088ad53d7fc3679deac6a5f")
HEADERS = {
    "Authorization": f"Bearer {KAGGLE_API_TOKEN}",
    "Accept": "application/json"
}

SEARCH_CATEGORIES = [
    {"query": "benchmark", "label": "Standard Benchmarking Datasets"},
    {"query": "ecommerce", "label": "E-Commerce Transaction Data (Relational & Semi-structured)"},
    {"query": "telemetry", "label": "High-Frequency Telemetry & Sensor Records (Numeric/Timeseries)"},
    {"query": "financial-transactions", "label": "Financial Ledger Records (High Consistency)"},
    {"query": "web-traffic", "label": "Web Request & Network Log Data (Variable-Length Strings)"},
]

def discover_kaggle_datasets() -> List[Dict[str, Any]]:
    """Search Kaggle for diverse datasets of varying types, shapes, and sizes."""
    discovered = []
    seen_refs = set()

    for cat in SEARCH_CATEGORIES:
        query = cat["query"]
        url = f"https://www.kaggle.com/api/v1/datasets/list?search={query}&pageSize=8"
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            if resp.status_code == 200:
                results = resp.json()
                for item in results:
                    ref = item.get("ref")
                    if ref and ref not in seen_refs:
                        seen_refs.add(ref)
                        size_bytes = item.get("totalBytes", 0)
                        discovered.append({
                            "ref": ref,
                            "title": item.get("title", ""),
                            "category": cat["label"],
                            "size_bytes": size_bytes,
                            "size_mb": round(size_bytes / (1024 * 1024), 2),
                            "download_count": item.get("downloadCount", 0),
                            "vote_count": item.get("voteCount", 0),
                            "url": f"https://www.kaggle.com/datasets/{ref}"
                        })
        except Exception as e:
            print(f"Error querying Kaggle for '{query}': {e}")

    return discovered

def save_dataset_manifest(datasets: List[Dict[str, Any]]):
    """Save the dedicated list of Kaggle benchmark datasets (gitignored)."""
    os.makedirs("benchmarks", exist_ok=True)
    
    # Save structured JSON
    json_path = os.path.join("benchmarks", "kaggle_datasets_list.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(datasets, f, indent=2)
    print(f"[Manifest] Saved {len(datasets)} Kaggle datasets to {json_path}")

    # Save human-readable text catalog
    txt_path = os.path.join("benchmarks", "kaggle_datasets_list.txt")
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("# Kaggle Benchmark Datasets Registry (VennQL Performance Testing)\n")
        f.write("# Note: Internal development list only - ignored by git.\n\n")
        for i, d in enumerate(datasets, 1):
            f.write(f"{i:02d}. {d['ref']} - \"{d['title']}\"\n")
            f.write(f"    Category: {d['category']} | Size: {d['size_mb']} MB | Downloads: {d['download_count']}\n")
            f.write(f"    URL: {d['url']}\n\n")
    print(f"[Manifest] Saved human-readable list to {txt_path}")

if __name__ == "__main__":
    datasets = discover_kaggle_datasets()
    print(f"Discovered {len(datasets)} benchmark datasets from Kaggle.")
    save_dataset_manifest(datasets)
