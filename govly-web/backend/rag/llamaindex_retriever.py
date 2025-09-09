"""
LlamaIndex retriever integration with Supabase, with graceful fallback to existing RPC search.

This module exposes two functions:
- search_links_llamaindex: for policy/content chunks
- search_forms_llamaindex: for forms

Behavior is controlled by USE_LLAMA_INDEX env var. When enabled, it will
attempt to use LlamaIndex + Supabase vector store; on any error it will
fallback to the existing search implementations so the API remains stable.
"""

from typing import List, Dict, Any, Optional
import os

# Existing fallbacks
from .query import search_chunks as rpc_search_chunks
from .match_forms import search_forms as rpc_search_forms


def _use_llamaindex() -> bool:
    return os.getenv("USE_LLAMA_INDEX", "false").lower() in ("1", "true", "yes", "on")


def _use_llamaindex_rpc() -> bool:
    """Force a pure-RPC mode that never attempts direct Postgres connections."""
    return os.getenv("USE_LLAMA_INDEX_RPC", "false").lower() in ("1", "true", "yes", "on")


def _build_llamaindex_index(table_name: str):
    """
    Try to build a LlamaIndex VectorStoreIndex backed by Supabase.
    Returns (index, vector_store) or (None, None) if setup fails.
    """
    try:
        from supabase import create_client
        from llama_index.embeddings.huggingface import HuggingFaceEmbedding
        from llama_index.core import VectorStoreIndex
        from llama_index.vector_stores.supabase import SupabaseVectorStore

        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_KEY")
        if not supabase_url or not supabase_key:
            return None, None

        client = create_client(supabase_url, supabase_key)

        # Allow custom column names via env to match existing schema
        embedding_col = os.environ.get("SUPABASE_EMBEDDING_COLUMN", "embedding")
        text_col = os.environ.get("SUPABASE_TEXT_COLUMN", "content")
        metadata_col = os.environ.get("SUPABASE_METADATA_COLUMN", "metadata")

        # Newer SupabaseVectorStore requires direct Postgres connection string
        pg_conn = os.environ.get("SUPABASE_PG_CONN")
        collection_name = os.environ.get("SUPABASE_COLLECTION", table_name)

        if not pg_conn:
            print("[RAG] SUPABASE_PG_CONN not set; cannot initialize LlamaIndex SupabaseVectorStore. Set a Postgres connection string to enable.")
            return None, None

        try:
            vector_store = SupabaseVectorStore(
                postgres_connection_string=pg_conn,
                collection_name=collection_name,
                content_column=text_col,
                embedding_column=embedding_col,
                metadata_column=metadata_col,
            )
        except Exception as inner_e2:
            print(f"[RAG] SupabaseVectorStore init failed (pg conn): {inner_e2}")
            return None, None

        # Use the same embedding family as pre-embedding (BAAI/bge-m3)
        embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-m3")

        index = VectorStoreIndex.from_vector_store(vector_store=vector_store, embed_model=embed_model)
        print(f"[RAG] LlamaIndex vector index created for collection '{collection_name}' (text='{text_col}', embedding='{embedding_col}', metadata='{metadata_col}')")
        return index, vector_store
    except Exception as e:
        print(f"[RAG] LlamaIndex index build error: {e}")
        return None, None


def _apply_filters_to_query_kwargs(country: Optional[str], agency: Optional[str]) -> Dict[str, Any]:
    filters: Dict[str, Any] = {}
    # Many deployments store simple metadata columns named exactly like these
    # If schema differs, vector store may ignore these and we will fallback
    metadata_filters: List[Dict[str, str]] = []
    if country:
        metadata_filters.append({"key": "country", "value": country})
    if agency:
        metadata_filters.append({"key": "agency", "value": agency})
    if metadata_filters:
        filters["metadata_filters"] = metadata_filters
    return filters


def search_links_llamaindex(query: str, top_k: int = 5, country: Optional[str] = None, agency: Optional[str] = None, category: Optional[str] = None) -> List[Dict[str, Any]]:
    """Search policy/content chunks using LlamaIndex+Supabase when enabled, else fallback to RPC."""
    if _use_llamaindex_rpc():
        print("[RAG] Using LlamaIndex RPC retriever for links (no direct PG connection)")
        return rpc_search_chunks(query, top_k=top_k, country=country, agency=agency, category=category)

    if not _use_llamaindex():
        print("[RAG] LlamaIndex disabled via env; using RPC search for links")
        return rpc_search_chunks(query, top_k=top_k, country=country, agency=agency, category=category)

    # Hard route by category to specific table names if provided
    table_env = os.getenv("SUPABASE_CHUNKS_TABLE", "chunks")
    if category and category.lower() == "housing":
        table_env = os.getenv("SUPABASE_CHUNKS_TABLE_HOUSING", "chunks_housing")
        print(f"[RAG] Category=housing → using table {table_env}")
    elif category and category.lower() == "business":
        table_env = os.getenv("SUPABASE_CHUNKS_TABLE_BUSINESS", "chunks_business")
        print(f"[RAG] Category=business → using table {table_env}")

    index, _ = _build_llamaindex_index(table_env)
    if not index:
        print("[RAG] LlamaIndex index setup failed; falling back to RPC for links")
        return rpc_search_chunks(query, top_k=top_k, country=country, agency=agency, category=category)

    try:
        from llama_index.core.vector_stores import VectorStoreQuery

        query_kwargs = _apply_filters_to_query_kwargs(country, agency)
        vs_query = VectorStoreQuery(query_str=query, similarity_top_k=top_k, **query_kwargs)
        print("[RAG] Using LlamaIndex vector store for links query")
        res = index.vector_store.query(vs_query)

        results: List[Dict[str, Any]] = []
        if res and res.nodes:
            for node, score in zip(res.nodes, res.similarities or []):
                md = node.metadata or {}
                results.append({
                    "title": md.get("title"),
                    "url": md.get("url"),
                    "content": node.get_content(metadata_mode="none"),
                    "similarity": score,
                    "country": md.get("country"),
                    "agency": md.get("agency"),
                })
        return results
    except Exception as e:
        print(f"[RAG] LlamaIndex error for links; fallback to RPC: {e}")
        return rpc_search_chunks(query, top_k=top_k, country=country, agency=agency)


def search_forms_llamaindex(query: str, top_k: int = 5, country: Optional[str] = None, agency: Optional[str] = None) -> List[Dict[str, Any]]:
    """Search forms using LlamaIndex+Supabase when enabled, else fallback to RPC."""
    if _use_llamaindex_rpc():
        print("[RAG] Using LlamaIndex RPC retriever for forms (no direct PG connection)")
        return rpc_search_forms(query, top_k=top_k, country=country, agency=agency)

    if not _use_llamaindex():
        print("[RAG] LlamaIndex disabled via env; using RPC search for forms")
        return rpc_search_forms(query, top_k=top_k, country=country, agency=agency)

    index, _ = _build_llamaindex_index(os.getenv("SUPABASE_FORMS_TABLE", "forms"))
    if not index:
        print("[RAG] LlamaIndex index setup failed; falling back to RPC for forms")
        return rpc_search_forms(query, top_k=top_k, country=country, agency=agency)

    try:
        from llama_index.core.vector_stores import VectorStoreQuery

        query_kwargs = _apply_filters_to_query_kwargs(country, agency)
        vs_query = VectorStoreQuery(query_str=query, similarity_top_k=top_k, **query_kwargs)
        print("[RAG] Using LlamaIndex vector store for forms query")
        res = index.vector_store.query(vs_query)

        results: List[Dict[str, Any]] = []
        if res and res.nodes:
            for node, score in zip(res.nodes, res.similarities or []):
                md = node.metadata or {}
                # Ensure URL rewrite consistent with existing API behavior
                url = md.get("url")
                if url:
                    import os as _os
                    filename = _os.path.basename(url)
                    url = f"http://localhost:8000/forms/{filename}"
                results.append({
                    "title": md.get("title"),
                    "url": url,
                    "content": node.get_content(metadata_mode="none"),
                    "similarity": score,
                    "country": md.get("country"),
                    "agency": md.get("agency"),
                })
        return results
    except Exception as e:
        print(f"[RAG] LlamaIndex error for forms; fallback to RPC: {e}")
        return rpc_search_forms(query, top_k=top_k, country=country, agency=agency)


