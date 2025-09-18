#!/usr/bin/env python3

from rag.query import supabase

def check_document_ids():
    try:
        result = supabase.table('documents').select('id, title').execute()
        print("Document IDs in database:")
        print("-" * 50)
        for doc in result.data:
            print(f"ID: {doc['id']} (type: {type(doc['id']).__name__}) - Title: {doc['title']}")
        print(f"\nTotal documents: {len(result.data)}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_document_ids()






