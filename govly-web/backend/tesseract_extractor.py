#!/usr/bin/env python3
"""
Improved Tesseract PDF to Text + SEA-LION Form Field Extractor
Better OCR quality and comprehensive field detection
"""

import sys
import pytesseract
from PIL import Image, ImageFilter, ImageOps
import pdf2image
from pathlib import Path
import requests
import os
import json
from dotenv import load_dotenv
import re

# Load environment variables
load_dotenv()

def clean_ocr_text(text: str) -> str:
    """Improved text cleaning that preserves form field indicators and Vietnamese text"""
    
    # Remove common OCR noise patterns
    cleaned = re.sub(r'[0-9]{5,}', '', text)  # Remove very long numbers
    cleaned = re.sub(r'[<>]{2,}', '', cleaned)  # Remove multiple < or >
    cleaned = re.sub(r'([a-zA-Z])\1{3,}', '.', cleaned)  # Replace repeated chars with dots
    cleaned = re.sub(r'[\.]{3,}', '...', cleaned)  # Normalize multiple dots
    cleaned = re.sub(r'\s{3,}', ' ', cleaned)  # Normalize multiple spaces
    
    # Split into lines and process each line
    lines = cleaned.split('\n')
    clean_lines = []
    current_section = []
    
    for line in lines:
        line = line.strip()
        if not line or len(line) < 3:  # Skip empty or very short lines
            if current_section:  # Save accumulated section
                clean_lines.extend(current_section)
                current_section = []
            continue
        
        # Keep lines with Vietnamese text or form field indicators
        if (re.search(r'[ÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]', line) or
            re.search(r'(Họ và tên|Sinh năm|Sinh ngày|Giấy CCCD|CMND|Ngày cấp|Nơi cấp|Hộ khẩu|Chỗ ở|Nơi ở|Địa chỉ|Đơn|Xác nhận|UBND|Ngày|Tháng|Năm|Diện tích|Chiều dài|Chiều rộng|Phía|giáp|Tôi là|Tôi làm|Kính gửi|Kính đề nghị|Cam đoan|Chân thành|Xin chịu|Số|Tên|Địa điểm|Thời gian|Lý do|Mục đích|Nghề nghiệp|Điện thoại|Email|Chức vụ|Nơi sinh|Quốc tịch|Dân tộc|Tôn giáo|Trình độ|Chuyên môn|Nơi làm việc|Quan hệ|Ghi chú)', line, re.IGNORECASE)):
            
            # Clean up common OCR errors in Vietnamese text
            line = re.sub(r'(?<=[^_])\s+(?=[^_])', ' ', line)  # Keep underscores but normalize other spaces
            line = re.sub(r'[.,]\s*(?=[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄ])', '.\n', line)  # Split sentences
            current_section.append(line)
            
        # Keep lines with form field markers
        elif re.search(r'[_]{3,}|[:]{1}|[\.]{3,}', line):
            if current_section:  # Save accumulated section
                clean_lines.extend(current_section)
                current_section = []
            clean_lines.append(line)
            
        # Keep lines with reasonable length and content
        elif len(line) > 3 and not re.search(r'[0-9]{5,}', line):
            current_section.append(line)
    
    # Add any remaining section
    if current_section:
        clean_lines.extend(current_section)
    
    # Join lines and normalize final text
    cleaned_text = '\n'.join(clean_lines)
    cleaned_text = re.sub(r'\n{3,}', '\n\n', cleaned_text)  # Normalize multiple newlines
    return cleaned_text

def send_to_sealion(cleaned_text: str) -> dict:
    """Improved SEA-LION prompt for comprehensive form field extraction"""
    
    api_key = os.getenv("SEA_LION_API_KEY")
    if not api_key:
        return {"error": "SEA_LION_API_KEY not found in environment variables"}
    
    # More comprehensive prompt
    system_prompt = """You are an expert at analyzing Vietnamese government forms. 
    Your task is to extract ALL form fields, including:
    - Text input fields (marked with dots, underscores, or brackets)
    - Date fields (ngày, tháng, năm)
    - Address fields (địa chỉ, nơi ở, hộ khẩu)
    - Personal information fields (tên, sinh ngày, CCCD)
    - Signature fields (ký, ghi rõ họ tên)
    - Checkbox/radio fields
    - Any field that requires user input
    
    ⚠️ IMPORTANT: Each field should appear only ONCE in the output.
    - If you see the same field name multiple times, include it only once
    - Focus on unique, distinct fields
    - Avoid repetitive or redundant field entries
    
    Be thorough and don't miss any fields. Return ONLY valid JSON."""
    
    user_prompt = f"""Analyze this Vietnamese form text and extract ALL form fields in JSON format.
    Look for any text that indicates a field needs to be filled in.

{cleaned_text}

Return a comprehensive JSON object with this structure:
{{
  "form_title": "Title of the form",
  "form_type": "Type of form (e.g., confirmation, application)",
  "recipient": "Who this form is sent to",
  "form_fields": [
    {{
      "field_name": "Field name in Vietnamese",
      "field_type": "text_input|date|address|signature|checkbox|radio|label",
      "required": true/false,
      "description": "What this field is for",
      "input_format": "Expected input format (e.g., text, date, signature)"
    }}
  ],
  "total_fields": "Total number of fields found"
}}

⚠️ CRITICAL: Ensure NO duplicate fields in the output.
- Each field name should appear only once
- If you see repeated field names, include only the first occurrence
- Focus on unique, distinct form fields

Be extremely thorough - extract every single field that requires input."""
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "max_completion_tokens": 1500,  # Increased for more comprehensive response
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "model": "aisingapore/Llama-SEA-LION-v3-70B-IT",
        "temperature": 0.05,  # Lower temperature for more consistent extraction
        "thinking_mode": "off"
    }
    
    try:
        response = requests.post(
            "https://api.sea-lion.ai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=90  # Increased timeout
        )
        
        if response.status_code == 200:
            response_data = response.json()
            response_text = response_data["choices"][0]["message"]["content"]
            
            # Try to parse JSON from response
            try:
                # Extract JSON from the response
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    json_str = json_match.group(0)
                    return json.loads(json_str)
                else:
                    return {"error": "No JSON found in response", "raw_response": response_text}
            except json.JSONDecodeError:
                return {"error": "Invalid JSON in response", "raw_response": response_text}
        else:
            return {"error": f"API Error: {response.status_code} - {response.text}"}
            
    except Exception as e:
        return {"error": f"Request failed: {str(e)}"}

def extract_pdf_to_text(file_path: str, language: str = "vie+eng"):
    """Improved text extraction with better OCR settings for both PDFs and images"""
    
    file_path = Path(file_path)
    if not file_path.exists():
        return {"error": f"File not found: {file_path}"}
    
    print(f"🔍 Processing: {file_path.name}")
    
    try:
        # Check if file is PDF or image
        is_pdf = file_path.suffix.lower() == '.pdf'
        
        if is_pdf:
            # Convert PDF to images with higher DPI for better OCR
            print("📄 Converting PDF to images (high quality)...")
            images = pdf2image.convert_from_path(
                file_path, 
                dpi=400,  # Increased from 300 to 400
                grayscale=False,  # Keep color for better recognition
                size=(None, None)  # Keep original size
            )
        else:
            # Load image directly
            print("📄 Loading image file...")
            try:
                image = Image.open(file_path)
                images = [image]  # Wrap in list to match PDF format
            except Exception as e:
                return {"error": f"Failed to load image: {str(e)}"}
        
        extracted_texts = []
        
        for i, image in enumerate(images):
            print(f"  Processing page {i+1}/{len(images)}...")
            # --- Image preprocessing for better OCR on screenshots/scans ---
            try:
                # Convert to grayscale
                processed = image.convert("L")
                # Auto-contrast and slight sharpen via median filter noise reduction
                processed = ImageOps.autocontrast(processed)
                processed = processed.filter(ImageFilter.MedianFilter(size=3))
                # 2x upscale to help small text
                width, height = processed.size
                processed = processed.resize((width * 2, height * 2), Image.LANCZOS)
                # Adaptive-like threshold (simple)
                processed = processed.point(lambda x: 0 if x < 180 else 255, mode='1')
            except Exception:
                processed = image

            # Enhanced OCR settings for better Vietnamese text recognition
            custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ0123456789.,:;()[]{}_-\s'
            
            # Extract text using Tesseract with custom config
            text = pytesseract.image_to_string(
                processed, 
                lang=language,
                config=custom_config
            )
            extracted_texts.append(text)
        
        # Combine all text
        full_text = "\n".join(extracted_texts)
        
        return {
            "text": full_text,
            "pages": len(images),
            "text_length": len(full_text)
        }
        
    except Exception as e:
        return {"error": f"Extraction failed: {str(e)}"}

def main():
    """Main function - Improved extraction and analysis"""
    
    if len(sys.argv) < 2:
        print("❌ Usage: python3 tesseract_extractor.py <pdf_file_path>")
        print("Example: python3 tesseract_extractor.py forms/vietnamese_form.pdf")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    
    print("�� IMPROVED Tesseract + SEA-LION Form Field Extractor")
    print("=" * 70)
    
    # Step 1: Extract text from PDF with improved settings
    print("\n📄 STEP 1: High-Quality PDF Text Extraction")
    print("-" * 50)
    result = extract_pdf_to_text(pdf_path)
    
    if "error" in result:
        print(f"❌ Error: {result['error']}")
        sys.exit(1)
    
    print(f"✅ Text extracted: {result['pages']} pages, {result['text_length']} characters")
    
    # Step 2: Improved text cleaning
    print("\n🧹 STEP 2: Enhanced Text Cleaning")
    print("-" * 50)
    cleaned_text = clean_ocr_text(result['text'])
    print("✅ Text cleaned with improved field preservation")
    
    # Save raw and cleaned text
    output_file = f"EXTRACTED_{Path(pdf_path).stem}.txt"
    cleaned_file = f"CLEANED_{Path(pdf_path).stem}.txt"
    
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(result['text'])
    
    with open(cleaned_file, "w", encoding="utf-8") as f:
        f.write(cleaned_text)
    
    print(f"�� Raw text saved to: {output_file}")
    print(f"�� Cleaned text saved to: {cleaned_file}")
    
    # Step 3: Send to SEA-LION with improved prompt
    print("\n🤖 STEP 3: Comprehensive SEA-LION Form Field Extraction")
    print("-" * 50)
    print("Sending to SEA-LION LLM with enhanced prompt...")
    
    form_fields = send_to_sealion(cleaned_text)
    
    if "error" in form_fields:
        print(f"❌ Error: {form_fields['error']}")
        if "raw_response" in form_fields:
            print(f"\nRaw response: {form_fields['raw_response']}")
        return
    
    # Step 4: Display comprehensive results
    print("\n✅ COMPREHENSIVE FORM FIELDS EXTRACTED:")
    print("=" * 70)
    
    # Pretty print the JSON
    print(json.dumps(form_fields, indent=2, ensure_ascii=False))
    
    # Save JSON to file
    json_file = f"FORM_FIELDS_{Path(pdf_path).stem}.json"
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(form_fields, f, indent=2, ensure_ascii=False)
    
    print(f"\n�� Comprehensive form fields saved to: {json_file}")
    print("\n🎉 IMPROVED extraction and analysis finished!")
    print("📊 This should now capture ALL form fields!")

if __name__ == "__main__":
    main()