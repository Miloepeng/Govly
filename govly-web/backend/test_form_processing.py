#!/usr/bin/env python3
"""
Test script to check form processing results and debug issues.
"""

import os
import sys
import json
from pathlib import Path

# Add current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from preprocess_forms import FormPreprocessor
from get_form_data import get_available_forms_summary, get_form_by_id

def test_single_form(file_path: str):
    """Test processing a single form."""
    print(f"🧪 Testing form processing for: {file_path}")
    print("=" * 60)
    
    try:
        preprocessor = FormPreprocessor()
        
        # Check if file exists
        if not os.path.exists(file_path):
            print(f"❌ File not found: {file_path}")
            return False
        
        # Check PDF compatibility
        print("🔍 Checking PDF compatibility...")
        is_compatible = preprocessor.check_pdf_compatibility(file_path)
        print(f"   Compatible: {is_compatible}")
        
        # Process the form
        print("🔄 Processing form...")
        form_data = preprocessor.process_single_form(file_path)
        
        if form_data:
            print("✅ Form processed successfully!")
            print(f"   Title: {form_data['title']}")
            print(f"   Category: {form_data['category']}")
            print(f"   Fields extracted: {len(form_data['form_fields'])}")
            print(f"   Processing method: {form_data['processing_status']}")
            
            if form_data['form_fields']:
                print("\n📋 Extracted fields:")
                for i, field in enumerate(form_data['form_fields'][:5], 1):  # Show first 5
                    print(f"   {i}. {field['label']} ({field['type']}) - Confidence: {field['confidence']:.1f}%")
                
                if len(form_data['form_fields']) > 5:
                    print(f"   ... and {len(form_data['form_fields']) - 5} more fields")
            
            # Store in database
            print("\n💾 Storing in database...")
            stored_form = preprocessor.store_form_in_database(form_data)
            
            if stored_form:
                print(f"✅ Stored successfully! Form ID: {stored_form['id']}")
                return True
            else:
                print("❌ Failed to store in database")
                return False
        else:
            print("❌ Form processing failed")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_database_retrieval():
    """Test retrieving forms from database."""
    print("\n🔍 Testing database retrieval...")
    print("=" * 60)
    
    try:
        # Get forms summary
        summary = get_available_forms_summary()
        print(f"📊 Database summary:")
        print(f"   Total forms: {summary['total']}")
        print(f"   Categories: {[c['category'] for c in summary['categories']]}")
        
        if summary['total'] > 0:
            # Get the first form
            first_form_id = summary['recent_forms'][0]['id']
            form_data = get_form_by_id(first_form_id)
            
            if form_data:
                print(f"\n📋 Sample form data (ID: {first_form_id}):")
                print(f"   Title: {form_data['title']}")
                print(f"   Category: {form_data['category']}")
                print(f"   Fields: {form_data['field_count']}")
                print(f"   Processing status: {form_data['processing_status']}")
                
                if form_data['form_fields']:
                    print(f"\n   Sample fields:")
                    for field in form_data['form_fields'][:3]:
                        print(f"     - {field['label']} ({field['type']})")
        
        return True
        
    except Exception as e:
        print(f"❌ Database retrieval error: {e}")
        return False

def main():
    """Main test function."""
    print("🧪 Form Processing Test Suite")
    print("=" * 60)
    
    # Test with forms in the forms directory
    forms_dir = os.path.join(current_dir, 'forms')
    
    if not os.path.exists(forms_dir):
        print(f"❌ Forms directory not found: {forms_dir}")
        return False
    
    # Find PDF files
    pdf_files = list(Path(forms_dir).glob('*.pdf'))
    if not pdf_files:
        print(f"❌ No PDF files found in {forms_dir}")
        return False
    
    print(f"📄 Found {len(pdf_files)} PDF files to test")
    
    # Test each form
    success_count = 0
    for pdf_file in pdf_files:
        print(f"\n{'='*60}")
        success = test_single_form(str(pdf_file))
        if success:
            success_count += 1
    
    print(f"\n📊 Test Results:")
    print(f"   Successfully processed: {success_count}/{len(pdf_files)} forms")
    
    # Test database retrieval
    test_database_retrieval()
    
    print(f"\n🎉 Test completed!")
    return success_count > 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
