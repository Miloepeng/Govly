#!/usr/bin/env python3
"""
PDF Form Field Extractor
Extracts form fields and text from PDF forms to help build dynamic forms
"""

import os
import json
import fitz  # PyMuPDF
import pdfplumber
from pathlib import Path
from typing import Dict, List, Any, Optional
import re

class PDFFormExtractor:
    def __init__(self, forms_dir: str = "forms"):
        self.forms_dir = Path(forms_dir)
        self.extracted_data = {}
        
    def extract_with_pymupdf(self, pdf_path: str) -> Dict[str, Any]:
        """Extract form fields using PyMuPDF (fitz)"""
        try:
            doc = fitz.open(pdf_path)
            page = doc[0]  # Get first page
            
            # Extract form fields
            form_fields = []
            for field in page.widgets():
                field_info = {
                    "type": field.field_type,
                    "name": field.field_name,
                    "value": field.field_value,
                    "rect": field.rect,
                    "required": field.required,
                    "readonly": field.readonly
                }
                form_fields.append(field_info)
            
            # Extract text
            text = page.get_text()
            
            doc.close()
            
            return {
                "form_fields": form_fields,
                "text": text,
                "method": "PyMuPDF"
            }
            
        except Exception as e:
            return {"error": f"PyMuPDF extraction failed: {str(e)}"}
    
    def extract_with_pdfplumber(self, pdf_path: str) -> Dict[str, Any]:
        """Extract form fields using pdfplumber"""
        try:
            with pdfplumber.open(pdf_path) as pdf:
                page = pdf.pages[0]  # Get first page
                
                # Extract text
                text = page.extract_text()
                
                # Look for form-like patterns
                form_patterns = self._find_form_patterns(text)
                
                # Extract tables (often contain form fields)
                tables = page.extract_tables()
                
                return {
                    "text": text,
                    "form_patterns": form_patterns,
                    "tables": tables,
                    "method": "pdfplumber"
                }
                
        except Exception as e:
            return {"error": f"pdfplumber extraction failed: {str(e)}"}
    
    def _find_form_patterns(self, text: str) -> List[Dict[str, Any]]:
        """Find common form field patterns in text"""
        patterns = []
        
        # Common form field indicators
        field_indicators = [
            r'([A-Z][a-z\s]+):\s*_+',  # "Name: _____"
            r'([A-Z][a-z\s]+):\s*\[.*?\]',  # "Name: [     ]"
            r'([A-Z][a-z\s]+):\s*\(.*?\)',  # "Name: (     )"
            r'([A-Z][a-z\s]+):\s*□',  # "Checkbox: □"
            r'([A-Z][a-z\s]+):\s*☐',  # "Checkbox: ☐"
            r'([A-Z][a-z\s]+):\s*○',  # "Radio button: ○"
            r'([A-Z][a-z\s]+):\s*●',  # "Radio button: ●"
        ]
        
        for pattern in field_indicators:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                field_name = match.group(1).strip()
                patterns.append({
                    "field_name": field_name,
                    "pattern": match.group(0),
                    "type": self._infer_field_type(match.group(0)),
                    "position": match.span()
                })
        
        return patterns
    
    def _infer_field_type(self, pattern: str) -> str:
        """Infer the type of form field based on pattern"""
        if '□' in pattern or '☐' in pattern:
            return "checkbox"
        elif '○' in pattern or '●' in pattern:
            return "radio"
        elif '_' in pattern:
            return "text_input"
        elif '[' in pattern and ']' in pattern:
            return "text_input"
        elif '(' in pattern and ')' in pattern:
            return "text_input"
        else:
            return "unknown"
    
    def extract_form(self, pdf_path: str) -> Dict[str, Any]:
        """Extract form information using multiple methods"""
        pdf_path = Path(pdf_path)
        
        if not pdf_path.exists():
            return {"error": f"PDF file not found: {pdf_path}"}
        
        print(f"🔍 Extracting form from: {pdf_path.name}")
        
        # Try PyMuPDF first (better for form fields)
        pymupdf_result = self.extract_with_pymupdf(str(pdf_path))
        
        # Try pdfplumber as backup
        pdfplumber_result = self.extract_with_pdfplumber(str(pdf_path))
        
        # Combine results
        combined_result = {
            "file_name": pdf_path.name,
            "file_path": str(pdf_path),
            "pymupdf": pymupdf_result,
            "pdfplumber": pdfplumber_result,
            "extraction_summary": self._create_summary(pymupdf_result, pdfplumber_result)
        }
        
        return combined_result
    
    def _create_summary(self, pymupdf_result: Dict, pdfplumber_result: Dict) -> Dict[str, Any]:
        """Create a summary of extracted form information"""
        summary = {
            "total_form_fields": 0,
            "field_types": {},
            "text_length": 0,
            "has_tables": False,
            "extraction_methods": []
        }
        
        # Count PyMuPDF form fields
        if "form_fields" in pymupdf_result:
            summary["total_form_fields"] += len(pymupdf_result["form_fields"])
            for field in pymupdf_result["form_fields"]:
                field_type = field.get("type", "unknown")
                summary["field_types"][field_type] = summary["field_types"].get(field_type, 0) + 1
            summary["extraction_methods"].append("PyMuPDF")
        
        # Count pdfplumber patterns
        if "form_patterns" in pdfplumber_result:
            summary["total_form_fields"] += len(pdfplumber_result["form_patterns"])
            for pattern in pdfplumber_result["form_patterns"]:
                field_type = pattern.get("type", "unknown")
                summary["field_types"][field_type] = summary["field_types"].get(field_type, 0) + 1
            summary["extraction_methods"].append("pdfplumber")
        
        # Text length
        if "text" in pymupdf_result:
            summary["text_length"] = len(pymupdf_result["text"])
        elif "text" in pdfplumber_result:
            summary["text_length"] = len(pdfplumber_result["text"])
        
        # Tables
        if "tables" in pdfplumber_result and pdfplumber_result["tables"]:
            summary["has_tables"] = True
        
        return summary
    
    def extract_all_forms(self) -> Dict[str, Any]:
        """Extract forms from all PDFs in the forms directory"""
        if not self.forms_dir.exists():
            return {"error": f"Forms directory not found: {self.forms_dir}"}
        
        pdf_files = list(self.forms_dir.glob("*.pdf"))
        
        if not pdf_files:
            return {"error": "No PDF files found in forms directory"}
        
        print(f"📁 Found {len(pdf_files)} PDF files")
        
        all_results = {}
        
        for pdf_file in pdf_files:
            print(f"\n🔍 Processing: {pdf_file.name}")
            result = self.extract_form(pdf_file)
            all_results[pdf_file.name] = result
        
        return all_results
    
    def save_results(self, results: Dict[str, Any], output_file: str = "form_extraction_results.json"):
        """Save extraction results to JSON file"""
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(results, f, indent=2, ensure_ascii=False)
            print(f"💾 Results saved to: {output_file}")
            return True
        except Exception as e:
            print(f"❌ Failed to save results: {str(e)}")
            return False
    
    def generate_form_builder_code(self, results: Dict[str, Any]) -> str:
        """Generate Python code for building forms based on extracted data"""
        code = []
        code.append("# Generated Form Builder Code")
        code.append("import streamlit as st")
        code.append("")
        
        for filename, result in results.items():
            if "error" in result:
                continue
                
            code.append(f"# Form: {filename}")
            code.append(f"def build_{filename.replace('.pdf', '').replace('-', '_').replace(' ', '_')}_form():")
            
            summary = result.get("extraction_summary", {})
            field_types = summary.get("field_types", {})
            
            if "text_input" in field_types:
                code.append("    # Text input fields")
                code.append("    text_inputs = st.text_input('Text Inputs')")
            
            if "checkbox" in field_types:
                code.append("    # Checkbox fields")
                code.append("    checkbox = st.checkbox('Checkbox')")
            
            if "radio" in field_types:
                code.append("    # Radio button fields")
                code.append("    radio = st.radio('Options', ['Option 1', 'Option 2'])")
            
            code.append("    return st.form_submit_button('Submit')")
            code.append("")
        
        return "\n".join(code)

def main():
    """Main function to run the PDF form extractor"""
    print("🔍 PDF Form Field Extractor")
    print("=" * 50)
    
    # Initialize extractor
    extractor = PDFFormExtractor()
    
    # Extract all forms
    print("📁 Starting form extraction...")
    results = extractor.extract_all_forms()
    
    if "error" in results:
        print(f"❌ {results['error']}")
        return
    
    # Display results
    print("\n📊 EXTRACTION RESULTS")
    print("=" * 50)
    
    for filename, result in results.items():
        if "error" in result:
            print(f"❌ {filename}: {result['error']}")
            continue
        
        summary = result.get("extraction_summary", {})
        print(f"\n📄 {filename}")
        print(f"  Form fields: {summary.get('total_form_fields', 0)}")
        print(f"  Text length: {summary.get('text_length', 0)} characters")
        print(f"  Field types: {summary.get('field_types', {})}")
        print(f"  Has tables: {summary.get('has_tables', False)}")
        print(f"  Methods: {', '.join(summary.get('extraction_methods', []))}")
    
    # Save results
    extractor.save_results(results)
    
    # Generate form builder code
    print("\n🔧 GENERATING FORM BUILDER CODE")
    print("=" * 50)
    
    form_code = extractor.generate_form_builder_code(results)
    
    # Save form builder code
    with open("generated_form_builder.py", "w") as f:
        f.write(form_code)
    
    print("💾 Form builder code saved to: generated_form_builder.py")
    print("\n✅ Extraction complete! Check the generated files for results.")

if __name__ == "__main__":
    main() 