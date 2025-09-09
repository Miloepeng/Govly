#!/usr/bin/env python3
"""
Debug script to test form extraction step by step
"""

import os
import sys
import json
from pathlib import Path

# Add current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

def test_ocr_extraction():
    """Test OCR extraction directly"""
    try:
        from tesseract_extractor import extract_pdf_to_text, clean_ocr_text
        
        pdf_path = os.path.join(current_dir, "forms", "don-de-nghi-xac-nhan-tinh-trang-nha-o-mau-1.pdf")
        print(f"🔍 Testing OCR extraction for: {pdf_path}")
        
        # Test OCR with Vietnamese language
        result = extract_pdf_to_text(pdf_path, language="vie+eng")
        if "error" in result:
            print(f"❌ OCR Error: {result['error']}")
            return None, None
        
        text = result.get("text", "").strip()
        print(f"📝 OCR text length: {len(text)}")
        print(f"📄 First 500 chars: {text[:500]}")
        
        # Test cleaning
        cleaned_text = clean_ocr_text(text)
        print(f"🧹 Cleaned text length: {len(cleaned_text)}")
        print(f"📄 First 500 chars cleaned: {cleaned_text[:500]}")
        
        return text, cleaned_text
        
    except Exception as e:
        print(f"❌ Error in OCR test: {e}")
        return None, None

def test_form_extraction(cleaned_text):
    """Test form field extraction"""
    try:
        from chains.form_chain import FormProcessingChain
        from utils.chain_utils import get_form_chain
        
        print(f"\n🤖 Testing form field extraction...")
        
        # Test the chain method
        form_chain = get_form_chain()
        fields_json = form_chain.extract_form_fields(cleaned_text)
        
        print(f"📋 Form extraction result: {json.dumps(fields_json, indent=2, ensure_ascii=False)}")
        
        return fields_json
        
    except Exception as e:
        print(f"❌ Error in form extraction test: {e}")
        return None

def main():
    print("🔧 DEBUG: Form Extraction Step-by-Step")
    print("=" * 50)
    
    # Use a sample PDF from our forms directory
    pdf_path = os.path.join(current_dir, "forms", "don-de-nghi-xac-nhan-tinh-trang-nha-o-mau-1.pdf")
    if not os.path.exists(pdf_path):
        print(f"❌ Sample PDF not found: {pdf_path}")
        return
        
    print(f"📄 Using sample PDF: {pdf_path}")
    
    # Step 1: Test OCR
    text, cleaned_text = test_ocr_extraction()
    if not text:
        print("❌ OCR failed, stopping test")
        return
    
    # Step 2: Test form extraction
    if cleaned_text:
        fields_json = test_form_extraction(cleaned_text)
        if fields_json:
            print(f"\n✅ Final result: {json.dumps(fields_json, indent=2, ensure_ascii=False)}")
        else:
            print("❌ Form extraction failed")
    else:
        print("❌ Text cleaning failed")

if __name__ == "__main__":
    main()
