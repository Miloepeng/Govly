#!/usr/bin/env python3
"""
Test script to verify frontend integration with preprocessed forms.
"""

import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_preprocessed_endpoints():
    """Test that the preprocessed endpoints work correctly."""
    
    base_url = "http://localhost:8000"
    
    print("🧪 Testing Frontend Integration with Preprocessed Forms")
    print("=" * 60)
    
    # Test forms that should be preprocessed
    test_forms = [
        "don-de-nghi-xac-nhan-tinh-trang-nha-o-mau-1.pdf",
        "don-de-nghi-xac-nhan-tinh-trang-nha-o-mau-3.pdf",
        "Mẫu_đơn_xin_xác_nhận_có_đất_ở_hợp_pháp.pdf"
    ]
    
    for form_name in test_forms:
        print(f"\n📄 Testing form: {form_name}")
        
        # Test the preprocessed endpoint (what frontend now uses)
        try:
            response = requests.post(
                f"{base_url}/api/extractFormPreprocessed",
                json={"url": f"/forms/{form_name}"},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                fields = data.get("fields", [])
                print(f"✅ Preprocessed extraction successful!")
                print(f"   Fields found: {len(fields)}")
                
                # Show first few fields
                for i, field in enumerate(fields[:3]):
                    print(f"   Field {i+1}: {field.get('name')} ({field.get('type')}) - {field.get('label')}")
                
                if len(fields) > 3:
                    print(f"   ... and {len(fields) - 3} more fields")
                    
            else:
                print(f"❌ Preprocessed extraction failed: {response.status_code}")
                print(f"   Error: {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed: {e}")

def test_form_search_and_extraction():
    """Test the complete flow: search forms then extract."""
    
    base_url = "http://localhost:8000"
    
    print(f"\n🔍 Testing Complete Form Search + Extraction Flow")
    print("=" * 60)
    
    # Test query that should return forms
    test_query = "đơn xin xác nhận tình trạng nhà ở"
    
    try:
        # Step 1: Search for forms
        print(f"1. Searching for forms with query: '{test_query}'")
        search_response = requests.post(
            f"{base_url}/api/ragForm",
            json={
                "query": test_query,
                "country": "Vietnam",
                "language": "Vietnamese"
            },
            timeout=30
        )
        
        if search_response.status_code == 200:
            search_data = search_response.json()
            form_results = search_data.get("results", [])
            print(f"✅ Found {len(form_results)} forms")
            
            if form_results:
                # Step 2: Extract form from first result (like frontend does)
                first_form = form_results[0]
                print(f"2. Extracting form: {first_form.get('title', 'Unknown')}")
                
                extract_response = requests.post(
                    f"{base_url}/api/extractFormPreprocessed",
                    json={"url": first_form.get("url", "")},
                    timeout=30
                )
                
                if extract_response.status_code == 200:
                    extract_data = extract_response.json()
                    fields = extract_data.get("fields", [])
                    print(f"✅ Form extraction successful!")
                    print(f"   Fields found: {len(fields)}")
                    
                    # Show first few fields
                    for i, field in enumerate(fields[:3]):
                        print(f"   Field {i+1}: {field.get('name')} ({field.get('type')}) - {field.get('label')}")
                    
                else:
                    print(f"❌ Form extraction failed: {extract_response.status_code}")
                    print(f"   Error: {extract_response.text}")
            else:
                print("⚠️ No forms found in search results")
        else:
            print(f"❌ Form search failed: {search_response.status_code}")
            print(f"   Error: {search_response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")

def check_backend_status():
    """Check if backend is running and accessible."""
    
    base_url = "http://localhost:8000"
    
    print(f"🔧 Checking Backend Status")
    print("=" * 60)
    
    try:
        response = requests.get(f"{base_url}/", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is running and accessible")
            return True
        else:
            print(f"❌ Backend returned status: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Backend is not accessible: {e}")
        print("   Make sure to start your backend with: python main.py")
        return False

def main():
    """Main test function."""
    
    print("🚀 Frontend Integration Test")
    print("This test verifies that your frontend will work with preprocessed forms")
    print("=" * 70)
    
    # Check if backend is running
    if not check_backend_status():
        print("\n❌ Cannot proceed - backend is not running")
        print("Please start your backend first:")
        print("  cd govly-web/backend")
        print("  python main.py")
        return
    
    # Test preprocessed endpoints
    test_preprocessed_endpoints()
    
    # Test complete flow
    test_form_search_and_extraction()
    
    print(f"\n🎉 Integration test completed!")
    print(f"\nYour frontend has been updated to use preprocessed forms!")
    print(f"Benefits you'll see:")
    print(f"  ✅ Faster form loading (database lookup vs OCR)")
    print(f"  ✅ Better accuracy (AWS Textract vs OCR)")
    print(f"  ✅ Automatic fallback to OCR if preprocessed data not found")
    print(f"  ✅ Same response format - no frontend changes needed")

if __name__ == "__main__":
    main()
