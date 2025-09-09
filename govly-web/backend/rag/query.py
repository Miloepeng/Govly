from supabase import create_client
from sentence_transformers import SentenceTransformer
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Load same embedding model used in Pre-Embedding.py
EMB = SentenceTransformer("BAAI/bge-m3")


def _normalize_country(country: str | None) -> str | None:
    if not country:
        return country
    mapping = {
        "vietnam": "VN",
        "viet nam": "VN",
        "vn": "VN",
    }
    key = country.strip().lower()
    return mapping.get(key, country)

def _select_match_function_name(category: str | None) -> str:
    if category:
        if category.lower() == "housing":
            return os.environ.get("SUPABASE_MATCH_CHUNKS_FUNC_HOUSING", "match_chunks_housing")
        if category.lower() == "business":
            return os.environ.get("SUPABASE_MATCH_CHUNKS_FUNC_BUSINESS", "match_chunks_business")
    return os.environ.get("SUPABASE_MATCH_CHUNKS_FUNC", "match_chunks")


def search_chunks(query, top_k=5, country=None, agency=None, category: str | None = None):
    # 1. Embed query
    query_vec = EMB.encode([query], normalize_embeddings=True).tolist()[0]

    # 2. Build filter
    rpc_params = {
        "query_embedding": query_vec,
        "match_count": top_k
    }
    if country:
        rpc_params["filter_country"] = _normalize_country(country)
    if agency:
        rpc_params["filter_agency"] = agency

    # 3. Call Postgres function in Supabase (category-aware)
    function_name = _select_match_function_name(category)
    print(f"[RAG] RPC function selected: {function_name} (category={category}, country={rpc_params.get('filter_country')}, agency={rpc_params.get('filter_agency')})")
    response = supabase.rpc(function_name, rpc_params).execute()

    if not response.data:
        print("No matches found")
        return []

    return response.data

# Only run test code when file is run directly (not when imported)
if __name__ == "__main__":
    # Test the function
    results = search_chunks("Housing complaints", top_k=3)
    
    for r in results:
        print(f"Score: {r['similarity']:.4f}")
        print(f"Title: {r['title']}")       
        print(f"Source: {r['url']}")
        print(f"Content: {r['content'][:200]}...")
        print()
