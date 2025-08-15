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

def search_chunks(query, top_k=5, country=None, agency=None):
    # 1. Embed query
    query_vec = EMB.encode([query], normalize_embeddings=True).tolist()[0]

    # 2. Build filter
    rpc_params = {
        "query_embedding": query_vec,
        "match_count": top_k
    }
    if country:
        rpc_params["filter_country"] = country
    if agency:
        rpc_params["filter_agency"] = agency

    # 3. Call Postgres function in Supabase
    response = supabase.rpc("match_chunks", rpc_params).execute()

    if not response.data:
        print("No matches found")
        return []

    return response.data

# Example usage
results = search_chunks("Housing complaints", top_k=3)

for r in results:
    print(f"Score: {r['similarity']:.4f}")
    print(f"Title: {r['title']}")       
    print(f"Source: {r['url']}")
    print(f"Content: {r['content'][:200]}...")
    print()
