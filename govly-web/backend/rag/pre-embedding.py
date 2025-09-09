# pip install sentence-transformers trafilatura pypdf python-dotenv requests supabase
import os, io, sys, time
import trafilatura
import requests
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from pypdf import PdfReader
from supabase import create_client

load_dotenv()

EMB = SentenceTransformer("BAAI/bge-m3")  # 1024-dim multilingual embeddings

def fetch_html(url: str) -> str:
    downloaded = trafilatura.fetch_url(url)
    return trafilatura.extract(downloaded, include_links=False) or ""

def fetch_pdf(path_or_url: str) -> str:
    if os.path.isfile(path_or_url):
        with open(path_or_url, "rb") as f:
            r = PdfReader(f)
            return "\n".join((page.extract_text() or "") for page in r.pages)
    else:
        b = requests.get(path_or_url, timeout=45).content
        r = PdfReader(io.BytesIO(b))
        return "\n".join((page.extract_text() or "") for page in r.pages)


def chunk(text: str, size=1200, overlap=150):
    words = text.split()
    i = 0
    while i < len(words):
        piece = " ".join(words[i:i+size])
        if piece.strip():
            yield piece
        i += max(1, size - overlap)

def embed(texts):
    return EMB.encode(texts, normalize_embeddings=True).tolist()

def clean_text(s: str) -> str:
    # Remove null bytes and other problematic control characters
    return s.replace("\u0000", "").strip()

SEEDS = [
(
    "VN", "MPI",
    "Hướng dẫn sử dụng dịch vụ công qua mạng điện tử — National Business Registration Portal",
    "https://dangkykinhdoanh.gov.vn/vn/Pages/Huongdansudungdvc.aspx",
)
]


def main():
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")

    if not supabase_url or not supabase_key:
        print("❌ SUPABASE_URL or SUPABASE_KEY not set in .env", file=sys.stderr)
        sys.exit(1)

    supabase = create_client(supabase_url, supabase_key)
    inserted_total = 0

    # Determine target table (supports category-specific housing/business)
    category = os.environ.get("CATEGORY")  # e.g., "housing" | "business"
    if category and category.lower() == "housing":
        table_name = os.environ.get("SUPABASE_CHUNKS_TABLE_HOUSING", "chunks_housing")
    elif category and category.lower() == "business":
        table_name = os.environ.get("SUPABASE_CHUNKS_TABLE_BUSINESS", "chunks_business")
    else:
        table_name = os.environ.get("SUPABASE_CHUNKS_TABLE", "chunks")

    print(f"📦 Embedding category: {category or 'default'} → target table: {table_name}")

    for country, agency, title, url in SEEDS:
        try:
            print(f"→ Fetching: {url}")
            text = fetch_pdf(url) if url.lower().endswith(".pdf") else fetch_html(url)
            if not text.strip():
                print(f"   ⚠ No text extracted from {url}, skipping.")
                continue

            pieces = [clean_text(p) for p in chunk(text)]

            print(f"   • {len(pieces)} chunks to embed")

            for batch_start in range(0, len(pieces), 16):
                batch = pieces[batch_start:batch_start+16]
                vecs = embed(batch)
                rows = [
                    {
                        "country": country,
                        "agency": agency,
                        "title": title,
                        "url": url,
                        "content": piece,
                        "embedding": vec
                    }
                    for piece, vec in zip(batch, vecs)
                ]

                # Force returning inserted rows for debugging
                response = supabase.table(table_name).insert(rows).execute()

                print("Insert response:", response)  # Debug output

                if hasattr(response, "data") and response.data:
                    inserted_total += len(response.data)
                    print(f"     · inserted {len(response.data)} (total {inserted_total})")
                else:
                    print(f"     ❌ Insert failed or returned no data")

            print(f"   ✅ Done: {url}")

        except Exception as e:
            print(f"   ❌ Failed: {url} — {e}", file=sys.stderr)
            time.sleep(1)

    print(f"\n✅ Finished. Total chunks inserted: {inserted_total}")

if __name__ == "__main__":
    main()
