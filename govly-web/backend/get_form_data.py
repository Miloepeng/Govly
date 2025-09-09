"""
Get Form Data for Chatbot

This module provides functions to retrieve processed form data from the database
for use by the chatbot in form filling operations.
"""

import os
import sys
from typing import Dict, List, Any, Optional
from supabase import create_client
from dotenv import load_dotenv

# Add current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

load_dotenv()

# Initialize Supabase client
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Supabase client initialized for form data retrieval")
    except Exception as e:
        print(f"❌ Failed to initialize Supabase client: {e}")
        supabase = None
else:
    print("⚠️ Supabase credentials not found")
    supabase = None

def get_form_by_id(form_id: int) -> Optional[Dict[str, Any]]:
    """Get a specific form by ID with all its extracted data."""
    if not supabase:
        return None
    
    try:
        result = supabase.table('forms').select('*').eq('id', form_id).eq('is_active', True).execute()
        
        if result.data:
            form = result.data[0]
            return format_form_for_chatbot(form)
        return None
        
    except Exception as e:
        print(f"❌ Error getting form by ID {form_id}: {e}")
        return None

def get_form_by_filename(filename: str) -> Optional[Dict[str, Any]]:
    """Get a form by its filename."""
    if not supabase:
        return None
    
    try:
        result = supabase.table('forms').select('*').ilike('url', f'%{filename}').eq('is_active', True).execute()
        
        if result.data:
            form = result.data[0]
            return format_form_for_chatbot(form)
        return None
        
    except Exception as e:
        print(f"❌ Error getting form by filename {filename}: {e}")
        return None

def search_forms_by_category(category: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Search forms by category."""
    if not supabase:
        return []
    
    try:
        result = supabase.rpc('search_forms_by_category', {
            'search_category': category,
            'match_count': limit
        }).execute()
        
        if result.data:
            return [format_form_for_chatbot(form) for form in result.data]
        return []
        
    except Exception as e:
        print(f"❌ Error searching forms by category {category}: {e}")
        return []

def get_all_form_categories() -> List[Dict[str, Any]]:
    """Get all available form categories."""
    if not supabase:
        return []
    
    try:
        result = supabase.rpc('get_forms_categories').execute()
        return result.data or []
        
    except Exception as e:
        print(f"❌ Error getting form categories: {e}")
        return []

def search_forms_by_query(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Search forms using the existing vector search with additional data."""
    if not supabase:
        return []
    
    try:
        # Use the existing match_forms function
        from rag.query import search_chunks
        
        # Get basic search results
        results = search_chunks(query, top_k=limit)
        
        # Enhance with additional form data
        enhanced_results = []
        for result in results:
            # Get the full form data
            form_id = result.get('id')
            if form_id:
                full_form = get_form_by_id(form_id)
                if full_form:
                    enhanced_results.append(full_form)
        
        return enhanced_results
        
    except Exception as e:
        print(f"❌ Error searching forms by query: {e}")
        return []

def format_form_for_chatbot(form: Dict[str, Any]) -> Dict[str, Any]:
    """Format form data for chatbot consumption."""
    formatted = {
        'id': form.get('id'),
        'title': form.get('title', 'Untitled Form'),
        'url': form.get('url'),
        'category': form.get('category', 'general'),
        'subcategory': form.get('subcategory'),
        'agency': form.get('agency'),
        'country': form.get('country'),
        'description': form.get('content', '')[:500] + '...' if len(form.get('content', '')) > 500 else form.get('content', ''),
        'tags': form.get('tags', []),
        'keywords': form.get('keywords', []),
        'processing_status': form.get('processing_status', 'unknown'),
        'last_processed_at': form.get('last_processed_at'),
    }
    
    # Add form fields if available
    if form.get('form_fields'):
        formatted['form_fields'] = form['form_fields']
        formatted['field_count'] = len(form['form_fields']) if isinstance(form['form_fields'], list) else 0
    else:
        formatted['form_fields'] = []
        formatted['field_count'] = 0
    
    # Add confidence scores if available
    if form.get('confidence_scores'):
        formatted['confidence_scores'] = form['confidence_scores']
        formatted['avg_confidence'] = form['confidence_scores'].get('average_confidence', 0)
    else:
        formatted['confidence_scores'] = {}
        formatted['avg_confidence'] = 0
    
    # Add tables if available
    if form.get('tables'):
        formatted['tables'] = form['tables']
        formatted['table_count'] = len(form['tables']) if isinstance(form['tables'], list) else 0
    else:
        formatted['tables'] = []
        formatted['table_count'] = 0
    
    return formatted

def get_form_schema_for_filling(form_id: int) -> Optional[Dict[str, Any]]:
    """Get form schema specifically formatted for form filling."""
    form = get_form_by_id(form_id)
    if not form:
        return None
    
    # Extract form fields and format for form filling
    form_fields = form.get('form_fields', [])
    
    # Convert to the format expected by the form filling system
    schema = {
        'form_id': form_id,
        'title': form['title'],
        'category': form['category'],
        'fields': []
    }
    
    for field in form_fields:
        if isinstance(field, dict):
            schema_field = {
                'name': field.get('name', 'unnamed_field'),
                'type': field.get('type', 'text'),
                'label': field.get('label', 'Unnamed Field'),
                'required': field.get('required', False),
                'description': field.get('description', ''),
                'confidence': field.get('confidence', 0)
            }
            
            # Add value if it exists (for pre-filled forms)
            if 'value' in field:
                schema_field['value'] = field['value']
            
            schema['fields'].append(schema_field)
    
    return schema

def get_available_forms_summary() -> Dict[str, Any]:
    """Get a summary of all available forms."""
    if not supabase:
        return {'total': 0, 'categories': [], 'forms': []}
    
    try:
        # Get total count
        total_result = supabase.table('forms').select('id', count='exact').eq('is_active', True).execute()
        total = total_result.count or 0
        
        # Get categories
        categories = get_all_form_categories()
        
        # Get recent forms
        recent_result = supabase.table('forms').select('id, title, category, processing_status, last_processed_at').eq('is_active', True).order('last_processed_at', desc=True).limit(10).execute()
        recent_forms = recent_result.data or []
        
        return {
            'total': total,
            'categories': categories,
            'recent_forms': recent_forms,
            'processing_status': {
                'completed': len([f for f in recent_forms if f.get('processing_status') == 'completed']),
                'pending': len([f for f in recent_forms if f.get('processing_status') == 'pending']),
                'failed': len([f for f in recent_forms if f.get('processing_status') == 'failed'])
            }
        }
        
    except Exception as e:
        print(f"❌ Error getting forms summary: {e}")
        return {'total': 0, 'categories': [], 'forms': []}

# Test function
if __name__ == "__main__":
    print("Testing form data retrieval...")
    
    # Test getting forms summary
    summary = get_available_forms_summary()
    print(f"Total forms: {summary['total']}")
    print(f"Categories: {[c['category'] for c in summary['categories']]}")
    
    # Test getting categories
    categories = get_all_form_categories()
    print(f"Available categories: {categories}")
    
    # Test searching forms
    if summary['total'] > 0:
        forms = search_forms_by_query("housing", limit=3)
        print(f"Found {len(forms)} forms for 'housing' query")
        
        for form in forms:
            print(f"  - {form['title']} (Category: {form['category']}, Fields: {form['field_count']})")
