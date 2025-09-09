#!/usr/bin/env python3
"""
Check what forms have been processed and stored in the database.
"""

import os
import sys
import json

# Add current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from get_form_data import get_available_forms_summary, get_form_by_id, get_all_form_categories

def main():
    """Check processed forms in database."""
    print("🔍 Checking Processed Forms in Database")
    print("=" * 50)
    
    try:
        # Get forms summary
        summary = get_available_forms_summary()
        
        print(f"📊 Database Summary:")
        print(f"   Total forms: {summary['total']}")
        print(f"   Processing status:")
        for status, count in summary['processing_status'].items():
            print(f"     - {status}: {count}")
        
        # Get categories
        categories = get_all_form_categories()
        print(f"\n📂 Categories:")
        for category in categories:
            print(f"   - {category['category']}: {category['count']} forms")
        
        # Show recent forms
        if summary['recent_forms']:
            print(f"\n📋 Recent Forms:")
            for form in summary['recent_forms'][:5]:  # Show first 5
                print(f"   - ID {form['id']}: {form['title']} ({form['category']})")
                print(f"     Status: {form['processing_status']}")
                print(f"     Last processed: {form.get('last_processed_at', 'Unknown')}")
                print()
        
        # Get detailed info for the first form
        if summary['recent_forms']:
            first_form_id = summary['recent_forms'][0]['id']
            print(f"🔍 Detailed info for form ID {first_form_id}:")
            
            form_data = get_form_by_id(first_form_id)
            if form_data:
                print(f"   Title: {form_data['title']}")
                print(f"   Category: {form_data['category']}")
                print(f"   Agency: {form_data['agency']}")
                print(f"   Fields extracted: {form_data['field_count']}")
                print(f"   Processing method: {form_data['processing_status']}")
                print(f"   Average confidence: {form_data.get('avg_confidence', 0):.1f}%")
                
                if form_data['form_fields']:
                    print(f"\n   📋 Form Fields:")
                    for i, field in enumerate(form_data['form_fields'][:10], 1):  # Show first 10
                        print(f"     {i}. {field['label']} ({field['type']})")
                        if field.get('confidence'):
                            print(f"        Confidence: {field['confidence']:.1f}%")
                        if field.get('required'):
                            print(f"        Required: Yes")
                        print()
                
                if len(form_data['form_fields']) > 10:
                    print(f"     ... and {len(form_data['form_fields']) - 10} more fields")
        
        print("✅ Database check completed!")
        return True
        
    except Exception as e:
        print(f"❌ Error checking database: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
