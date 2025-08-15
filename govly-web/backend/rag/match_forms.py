# query_forms.py
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase client if credentials are available
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Supabase client initialized successfully for forms")
    except Exception as e:
        print(f"❌ Failed to initialize Supabase client for forms: {e}")
        supabase = None
else:
    print("⚠️ Supabase credentials not found for forms, functionality will be limited")
    supabase = None

# Initialize embedding model with error handling
EMB = None
try:
    from sentence_transformers import SentenceTransformer
    EMB = SentenceTransformer("BAAI/bge-m3")
    print("✅ Embedding model loaded successfully for forms")
except Exception as e:
    print(f"⚠️ Failed to load embedding model for forms: {e}")
    print("⚠️ Form search will return dummy results")

def search_forms(query, top_k=5, country=None, agency=None):
    # Check if we have the required components
    if not supabase:
        print("❌ Supabase not available for forms - check your .env file")
        return []
    
    if not EMB:
        print("❌ Embedding model not available for forms - check if sentence-transformers is installed")
        return []
    
    try:
        query_vec = EMB.encode([query], normalize_embeddings=True).tolist()[0]
        rpc_params = {"query_embedding": query_vec, "match_count": top_k}
        if country:
            rpc_params["filter_country"] = country
        if agency:
            rpc_params["filter_agency"] = agency
        response = supabase.rpc("match_forms", rpc_params).execute()
        
        if not response.data:
            print("No forms found in database")
            return []
            
        print(f"✅ Found {len(response.data)} matching forms")
        return response.data
    except Exception as e:
        print(f"❌ Error in form search: {e}")
        return []

if __name__ == "__main__":
    results = search_forms("don-de-nghi-xac-nhan-tinh-trang-nha-o-mau", top_k=3)
    for r in results:
        print(f"Score: {r.get('similarity', 'N/A')}")
        print(f"Title: {r['title']}")
        print(f"Source: {r['url']}")
        print(f"Content: {r.get('content', r.get('description', ''))[:200]}...")
        print()
