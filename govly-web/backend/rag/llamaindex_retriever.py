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


def _build_llamaindex_index(table_name: str):
    """
    Try to build a LlamaIndex VectorStoreIndex backed by Supabase.
    Returns (index, vector_store) or (None, None) if setup fails.
    """
    try:
        from supabase import create_client
        from llama_index.embeddings.huggingface import HuggingFaceEmbedding
        from llama_index.core import VectorStoreIndex, StorageContext
        from llama_index.vector_stores.supabase import SupabaseVectorStore

        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_KEY")
        if not supabase_url or not supabase_key:
            return None, None

        client = create_client(supabase_url, supabase_key)

        # Table name can be customized per deployment; default to provided
        vector_store = SupabaseVectorStore(client=client, table_name=table_name)

        # Use the same embedding family as pre-embedding (BAAI/bge-m3)
        embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-m3")

        index = VectorStoreIndex.from_vector_store(vector_store=vector_store, embed_model=embed_model)
        return index, vector_store
    except Exception:
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


def search_links_llamaindex(query: str, top_k: int = 5, country: Optional[str] = None, agency: Optional[str] = None) -> List[Dict[str, Any]]:
    """Search policy/content chunks using LlamaIndex+Supabase when enabled, else fallback to RPC."""
    if not _use_llamaindex():
        print("[RAG] LlamaIndex disabled via env; using RPC search for links")
        return rpc_search_chunks(query, top_k=top_k, country=country, agency=agency)

    index, _ = _build_llamaindex_index(os.getenv("SUPABASE_CHUNKS_TABLE", "chunks"))
    if not index:
        print("[RAG] LlamaIndex index setup failed; falling back to RPC for links")
        return rpc_search_chunks(query, top_k=top_k, country=country, agency=agency)

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


