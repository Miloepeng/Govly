# query_forms.py
from supabase import create_client
from sentence_transformers import SentenceTransformer
import os
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
EMB = SentenceTransformer("BAAI/bge-m3")

def search_forms(query, top_k=5, country=None, agency=None):
    query_vec = EMB.encode([query], normalize_embeddings=True).tolist()[0]
    rpc_params = {"query_embedding": query_vec, "match_count": top_k}
    if country:
        rpc_params["filter_country"] = country
    if agency:
        rpc_params["filter_agency"] = agency
    response = supabase.rpc("match_forms", rpc_params).execute()
    return response.data or []

if __name__ == "__main__":
    results = search_forms("don-de-nghi-xac-nhan-tinh-trang-nha-o-mau", top_k=3)
    for r in results:
        print(f"Score: {r['similarity']:.4f}")
        print(f"Title: {r['title']}")
        print(f"Source: {r['url']}")
        print(f"Content: {r['content'][:200]}...")
        print()
