#!/usr/bin/env python3
"""
Form Preprocessing Script with AWS Textract

This script processes all PDF forms in the forms directory using AWS Textract
and stores the extracted JSON data in your existing Supabase database.
"""

import os
import sys
import json
import base64
import hashlib
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

# Add current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

import boto3
from botocore.exceptions import ClientError, BotoCoreError
from supabase import create_client
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class FormPreprocessor:
    """Preprocess forms using AWS Textract and store in Supabase."""
    
    def __init__(self):
        """Initialize the preprocessor with AWS and Supabase clients."""
        # Initialize Supabase
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in .env file")
        
        self.supabase = create_client(self.supabase_url, self.supabase_key)
        
        # Initialize AWS services
        self.aws_access_key = os.getenv('AWS_ACCESS_KEY_ID')
        self.aws_secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        self.aws_region = os.getenv('AWS_REGION', 'us-east-1')
        self.aws_session_token = os.getenv("AWS_SESSION_TOKEN")
        self.s3_bucket = os.getenv('AWS_S3_BUCKET', 'govly-forms')
        
        if not self.aws_access_key or not self.aws_secret_key:
            raise ValueError("AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set in .env file")
        
        # Initialize AWS clients
        self.textract_client = boto3.client(
            'textract',
            region_name=self.aws_region,
            aws_access_key_id=self.aws_access_key,
            aws_secret_access_key=self.aws_secret_key,
            aws_session_token=self.aws_session_token
        )
        
        self.s3_client = boto3.client(
            's3',
            region_name=self.aws_region,
            aws_access_key_id=self.aws_access_key,
            aws_secret_access_key=self.aws_secret_key,
            aws_session_token=self.aws_session_token
        )
        
        # Initialize embedding model
        try:
            self.embedding_model = SentenceTransformer("BAAI/bge-m3")
            print("✅ Embedding model loaded")
        except Exception as e:
            print(f"⚠️ Failed to load embedding model: {e}")
            self.embedding_model = None
    
    def process_forms_directory(self, forms_dir: str = None) -> Dict[str, Any]:
        """Process all PDF forms in the specified directory."""
        if not forms_dir:
            forms_dir = os.path.join(current_dir, 'forms')
        
        if not os.path.exists(forms_dir):
            raise FileNotFoundError(f"Forms directory not found: {forms_dir}")
        
        # Find all PDF files
        pdf_files = list(Path(forms_dir).glob('*.pdf'))
        if not pdf_files:
            print(f"❌ No PDF files found in {forms_dir}")
            return {"processed": 0, "failed": 0, "errors": []}
        
        print(f"📄 Found {len(pdf_files)} PDF files to process")
        
        results = {
            "processed": 0,
            "failed": 0,
            "errors": [],
            "forms": []
        }
        
        for pdf_file in pdf_files:
            print(f"\n🔄 Processing: {pdf_file.name}")
            
            try:
                # Process the form
                form_data = self.process_single_form(str(pdf_file))
                
                if form_data:
                    # Store in database
                    stored_form = self.store_form_in_database(form_data)
                    
                    if stored_form:
                        results["processed"] += 1
                        results["forms"].append({
                            "filename": pdf_file.name,
                            "form_id": stored_form.get("id"),
                            "title": stored_form.get("title"),
                            "fields_count": len(form_data.get("form_fields", []))
                        })
                        print(f"✅ Successfully processed and stored: {pdf_file.name}")
                    else:
                        results["failed"] += 1
                        results["errors"].append(f"Failed to store {pdf_file.name}")
                        print(f"❌ Failed to store: {pdf_file.name}")
                else:
                    results["failed"] += 1
                    results["errors"].append(f"Failed to process {pdf_file.name}")
                    print(f"❌ Failed to process: {pdf_file.name}")
                    
            except Exception as e:
                results["failed"] += 1
                error_msg = f"Error processing {pdf_file.name}: {str(e)}"
                results["errors"].append(error_msg)
                print(f"❌ {error_msg}")
        
        return results
    
    def check_pdf_compatibility(self, file_path: str) -> bool:
        """Check if PDF is compatible with AWS Textract."""
        try:
            # Check file size (AWS Textract has limits)
            file_size = os.path.getsize(file_path)
            if file_size > 10 * 1024 * 1024:  # 10MB limit
                print(f"⚠️ File too large for AWS Textract: {file_size / 1024 / 1024:.1f}MB")
                return False
            
            # Try to read the file as PDF
            with open(file_path, 'rb') as file:
                file_bytes = file.read()
            
            # Check if it's a valid PDF
            if not file_bytes.startswith(b'%PDF-'):
                print(f"⚠️ File doesn't appear to be a valid PDF")
                return False
            
            # Check for common problematic PDF characteristics
            if b'/Type /XObject' in file_bytes and b'/Subtype /Image' in file_bytes:
                print(f"⚠️ PDF contains scanned images, may not work well with Textract")
                return False
            
            return True
            
        except Exception as e:
            print(f"⚠️ Error checking PDF compatibility: {e}")
            return False

    def upload_to_s3(self, file_path: str) -> str:
        """Upload PDF to S3 and return the S3 object key."""
        try:
            filename = os.path.basename(file_path)
            s3_key = f"forms/{filename}"
            
            print(f"📤 Uploading {filename} to S3...")
            self.s3_client.upload_file(file_path, self.s3_bucket, s3_key)
            print(f"✅ Uploaded to S3: s3://{self.s3_bucket}/{s3_key}")
            
            return s3_key
            
        except Exception as e:
            print(f"❌ Failed to upload to S3: {e}")
            raise

    def process_single_form(self, file_path: str) -> Optional[Dict[str, Any]]:
        """Process a single PDF form using AWS Textract with S3."""
        try:
            # Read file for hash calculation
            with open(file_path, 'rb') as file:
                file_bytes = file.read()
            
            # Calculate file hash for deduplication
            file_hash = hashlib.sha256(file_bytes).hexdigest()
            
            # Check if already processed
            existing = self.check_existing_form(file_hash)
            if existing:
                print(f"⚠️ Form already processed: {os.path.basename(file_path)}")
                return None
            
            # Check PDF compatibility
            if not self.check_pdf_compatibility(file_path):
                print(f"⚠️ PDF may not be compatible with AWS Textract, using fallback method...")
                return self.process_with_fallback(file_path, file_hash)
            
            # Upload to S3
            s3_key = self.upload_to_s3(file_path)
            
            # Try AWS Textract with S3
            print(f"🔍 Calling AWS Textract for: {os.path.basename(file_path)}")
            try:
                # Use StartDocumentAnalysis for multi-page PDFs
                response = self.textract_client.start_document_analysis(
                    DocumentLocation={'S3Object': {'Bucket': self.s3_bucket, 'Name': s3_key}},
                    FeatureTypes=['FORMS', 'TABLES']
                )
                
                job_id = response['JobId']
                print(f"📋 Started Textract job: {job_id}")
                
                # Poll for completion
                extracted_data = self.wait_for_textract_completion(job_id, file_path, file_hash)
                
                # Clean up S3 object (optional)
                try:
                    self.s3_client.delete_object(Bucket=self.s3_bucket, Key=s3_key)
                    print(f"🗑️ Cleaned up S3 object: {s3_key}")
                except Exception as e:
                    print(f"⚠️ Failed to clean up S3 object: {e}")
                
                return extracted_data
                
            except ClientError as e:
                error_code = e.response['Error']['Code']
                error_message = e.response['Error']['Message']
                
                print(f"❌ AWS Textract error: {error_code} - {error_message}")
                print(f"🔄 Trying fallback method...")
                return self.process_with_fallback(file_path, file_hash)
                    
        except Exception as e:
            print(f"❌ Error processing {file_path}: {e}")
            raise

    def wait_for_textract_completion(self, job_id: str, file_path: str, file_hash: str) -> Optional[Dict[str, Any]]:
        """Wait for Textract job to complete and return results."""
        import time
        
        max_attempts = 60  # 5 minutes max
        attempt = 0
        
        print(f"⏳ Waiting for Textract job to complete...")
        
        while attempt < max_attempts:
            try:
                response = self.textract_client.get_document_analysis(JobId=job_id)
                status = response['JobStatus']
                
                if status == 'SUCCEEDED':
                    print(f"✅ Textract job completed successfully!")
                    
                    # Extract data from all pages
                    all_blocks = response.get('Blocks', [])
                    
                    # If there are more pages, get them
                    next_token = response.get('NextToken')
                    while next_token:
                        next_response = self.textract_client.get_document_analysis(
                            JobId=job_id, 
                            NextToken=next_token
                        )
                        all_blocks.extend(next_response.get('Blocks', []))
                        next_token = next_response.get('NextToken')
                    
                    # Create a complete response object
                    complete_response = {
                        'Blocks': all_blocks,
                        'JobStatus': 'SUCCEEDED'
                    }
                    
                    return self.extract_form_data(complete_response, file_path, file_hash)
                    
                elif status == 'FAILED':
                    error_message = response.get('StatusMessage', 'Unknown error')
                    print(f"❌ Textract job failed: {error_message}")
                    return None
                    
                elif status in ['IN_PROGRESS', 'PARTIAL_SUCCESS']:
                    print(f"⏳ Job status: {status}, waiting...")
                    time.sleep(5)
                    attempt += 1
                else:
                    print(f"⚠️ Unknown job status: {status}")
                    time.sleep(5)
                    attempt += 1
                    
            except ClientError as e:
                print(f"❌ Error checking job status: {e}")
                return None
        
        print(f"⏰ Timeout waiting for Textract job to complete")
        return None
    
    def process_with_fallback(self, file_path: str, file_hash: str) -> Optional[Dict[str, Any]]:
        """Process form using fallback method when AWS Textract fails."""
        try:
            print(f"🔄 Using fallback processing for: {os.path.basename(file_path)}")
            
            # Use your existing OCR extraction as fallback
            from tesseract_extractor import extract_pdf_to_text, clean_ocr_text
            
            # Extract text using OCR
            ocr_result = extract_pdf_to_text(file_path)
            if "error" in ocr_result:
                print(f"❌ OCR extraction failed: {ocr_result['error']}")
                return None
            
            extracted_text = ocr_result.get("text", "").strip()
            if not extracted_text:
                print(f"❌ No text extracted from {os.path.basename(file_path)}")
                return None
            
            # Clean the text
            cleaned_text = clean_ocr_text(extracted_text)
            
            # Generate basic form fields from text patterns
            form_fields = self.extract_form_fields_from_text(cleaned_text)
            
            # Generate embedding if model is available
            embedding = []
            if self.embedding_model:
                try:
                    embedding = self.embedding_model.encode([cleaned_text], normalize_embeddings=True).tolist()[0]
                except Exception as e:
                    print(f"⚠️ Failed to generate embedding: {e}")
            
            # Determine category from filename
            category = self.determine_category_from_filename(os.path.basename(file_path))
            
            # Generate title from filename
            title = self.generate_title_from_filename(os.path.basename(file_path))
            
            return {
                "title": title,
                "description": f"Form extracted from {os.path.basename(file_path)} (OCR fallback)",
                "category": category,
                "original_filename": os.path.basename(file_path),
                "file_path": file_path,
                "file_size_bytes": os.path.getsize(file_path),
                "file_hash": file_hash,
                "textract_json": {"fallback_method": "ocr", "extracted_text": cleaned_text},
                "extracted_text": cleaned_text,
                "form_fields": form_fields,
                "tables": [],  # OCR doesn't extract tables well
                "confidence_scores": self.calculate_confidence_scores(form_fields),
                "country": "VN",
                "agency": "UBND xã/phường",
                "tags": self.generate_tags_from_content(cleaned_text, category),
                "keywords": self.extract_keywords(cleaned_text),
                "language": "vi",
                "embedding": embedding,
                "processing_status": "completed_fallback",
                "last_processed_at": datetime.now().isoformat(),
                "is_active": True
            }
            
        except Exception as e:
            print(f"❌ Fallback processing failed for {file_path}: {e}")
            return None
    
    def extract_form_fields_from_text(self, text: str) -> List[Dict[str, Any]]:
        """Extract form fields from text using pattern matching (fallback method)."""
        form_fields = []
        
        # Common Vietnamese form field patterns
        field_patterns = [
            r'(?:Họ và tên|Tên|Họ tên|Full name)[\s:]*',
            r'(?:Ngày sinh|Date of birth|DOB)[\s:]*',
            r'(?:Địa chỉ|Address)[\s:]*',
            r'(?:Số điện thoại|Phone|Tel)[\s:]*',
            r'(?:Email|E-mail)[\s:]*',
            r'(?:CMND|CCCD|ID|Identity)[\s:]*',
            r'(?:Nghề nghiệp|Occupation|Job)[\s:]*',
            r'(?:Nơi sinh|Place of birth)[\s:]*',
            r'(?:Quốc tịch|Nationality)[\s:]*',
            r'(?:Giới tính|Gender|Sex)[\s:]*',
            r'(?:Ngày|Date)[\s:]*',
            r'(?:Tháng|Month)[\s:]*',
            r'(?:Năm|Year)[\s:]*',
            r'(?:Ký tên|Signature|Chữ ký)[\s:]*',
            r'(?:Ghi chú|Note|Comment)[\s:]*',
            r'(?:Lý do|Reason)[\s:]*',
            r'(?:Mục đích|Purpose)[\s:]*',
            r'(?:Yêu cầu|Request)[\s:]*',
            r'(?:Đề nghị|Proposal)[\s:]*',
            r'(?:Xác nhận|Confirm)[\s:]*'
        ]
        
        import re
        
        for pattern in field_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                field_name = match.group().strip().rstrip(':').strip()
                if field_name:
                    # Determine field type
                    field_type = self.determine_field_type(field_name)
                    
                    form_fields.append({
                        "name": self.clean_field_name(field_name),
                        "label": field_name,
                        "value": "",  # Empty for form filling
                        "type": field_type,
                        "confidence": 70.0,  # Lower confidence for OCR
                        "required": self.is_required_field(field_name),
                        "description": f"Field: {field_name} (OCR extracted)"
                    })
        
        # Remove duplicates based on field name
        seen = set()
        unique_fields = []
        for field in form_fields:
            if field['name'] not in seen:
                seen.add(field['name'])
                unique_fields.append(field)
        
        return unique_fields
    
    def extract_form_data(self, textract_response: Dict, file_path: str, file_hash: str) -> Dict[str, Any]:
        """Extract structured data from Textract response."""
        blocks = textract_response.get('Blocks', [])
        
        # Extract all text
        extracted_text = self.extract_text_from_blocks(blocks)
        
        # Extract form fields (key-value pairs)
        form_fields = self.extract_form_fields(blocks)
        
        # Extract tables
        tables = self.extract_tables(blocks)
        
        # Generate embedding if model is available
        embedding = []
        if self.embedding_model:
            try:
                embedding = self.embedding_model.encode([extracted_text], normalize_embeddings=True).tolist()[0]
            except Exception as e:
                print(f"⚠️ Failed to generate embedding: {e}")
        
        # Determine category from filename
        category = self.determine_category_from_filename(os.path.basename(file_path))
        
        # Generate title from filename
        title = self.generate_title_from_filename(os.path.basename(file_path))
        
        return {
            "title": title,
            "description": f"Form extracted from {os.path.basename(file_path)}",
            "category": category,
            "original_filename": os.path.basename(file_path),
            "file_path": file_path,
            "file_size_bytes": os.path.getsize(file_path),
            "file_hash": file_hash,
            "textract_json": textract_response,
            "extracted_text": extracted_text,
            "form_fields": form_fields,
            "tables": tables,
            "confidence_scores": self.calculate_confidence_scores(form_fields),
            "country": "VN",
            "agency": "UBND xã/phường",  # Default agency
            "tags": self.generate_tags_from_content(extracted_text, category),
            "keywords": self.extract_keywords(extracted_text),
            "language": "vi",
            "embedding": embedding,
            "processing_status": "completed",
            "last_processed_at": datetime.now().isoformat(),
            "is_active": True
        }
    
    def extract_text_from_blocks(self, blocks: List[Dict]) -> str:
        """Extract all text from Textract blocks."""
        text_blocks = [block for block in blocks if block.get('BlockType') == 'LINE']
        text_lines = [block.get('Text', '') for block in text_blocks]
        return '\n'.join(text_lines)
    
    def extract_form_fields(self, blocks: List[Dict]) -> List[Dict[str, Any]]:
        """Extract form fields from Textract blocks using multiple strategies."""
        form_fields = []
        
        # Strategy 1: Extract key-value pairs (existing method)
        kv_fields = self.extract_key_value_fields(blocks)
        form_fields.extend(kv_fields)
        
        # Strategy 2: Extract form labels and input areas
        label_fields = self.extract_form_labels(blocks)
        form_fields.extend(label_fields)
        
        # Strategy 3: Extract table-based form fields
        table_fields = self.extract_table_form_fields(blocks)
        form_fields.extend(table_fields)
        
        # Remove duplicates based on field name
        seen = set()
        unique_fields = []
        for field in form_fields:
            field_name = field['name']
            if field_name not in seen:
                seen.add(field_name)
                unique_fields.append(field)
        
        print(f"📋 Extracted {len(unique_fields)} unique form fields:")
        print(f"   - Key-value pairs: {len(kv_fields)}")
        print(f"   - Form labels: {len(label_fields)}")
        print(f"   - Table fields: {len(table_fields)}")
        
        return unique_fields
    
    def extract_key_value_fields(self, blocks: List[Dict]) -> List[Dict]:
        """Extract key-value pairs from Textract blocks."""
        form_fields = []
        
        # Find all key-value pairs
        key_value_blocks = [block for block in blocks if block.get('BlockType') == 'KEY_VALUE_SET']
        
        for kv_block in key_value_blocks:
            if kv_block.get('EntityTypes') == ['KEY']:
                # This is a key block
                key_text = self.get_text_from_block(kv_block, blocks)
                value_text = ""
                confidence = kv_block.get('Confidence', 0)
                
                # Find the corresponding value
                if 'Relationships' in kv_block:
                    for relationship in kv_block['Relationships']:
                        if relationship.get('Type') == 'VALUE':
                            value_blocks = relationship.get('Ids', [])
                            for value_id in value_blocks:
                                value_block = next((b for b in blocks if b.get('Id') == value_id), None)
                                if value_block:
                                    value_text = self.get_text_from_block(value_block, blocks)
                                    confidence = min(confidence, value_block.get('Confidence', 0))
                
                if key_text and value_text:
                    # Determine field type
                    field_type = self.determine_field_type(key_text)
                    
                    form_fields.append({
                        "name": self.clean_field_name(key_text),
                        "label": key_text.strip(),
                        "value": value_text.strip(),
                        "type": field_type,
                        "confidence": confidence,
                        "required": self.is_required_field(key_text),
                        "description": f"Field: {key_text.strip()}"
                    })
        
        return form_fields
    
    def extract_form_labels(self, blocks: List[Dict]) -> List[Dict]:
        """Extract form labels and input areas from blocks."""
        form_fields = []
        
        # Look for text blocks that might be form labels
        text_blocks = [block for block in blocks if block.get('BlockType') == 'LINE']
        
        for text_block in text_blocks:
            text = self.get_text_from_block(text_block, blocks).strip()
            if not text:
                continue
            
            # Check if this looks like a form field label
            if self.looks_like_form_field(text):
                confidence = text_block.get('Confidence', 0)
                field_type = self.determine_field_type(text)
                
                form_fields.append({
                    "name": self.clean_field_name(text),
                    "label": text,
                    "value": "",  # Empty for form filling
                    "type": field_type,
                    "confidence": confidence,
                    "required": self.is_required_field(text),
                    "description": f"Form label: {text}"
                })
        
        return form_fields
    
    def extract_table_form_fields(self, blocks: List[Dict]) -> List[Dict]:
        """Extract form fields from tables."""
        form_fields = []
        
        # Find table blocks
        table_blocks = [block for block in blocks if block.get('BlockType') == 'TABLE']
        
        for table_block in table_blocks:
            # Extract cells from table
            if 'Relationships' in table_block:
                for relationship in table_block['Relationships']:
                    if relationship.get('Type') == 'CHILD':
                        cell_ids = relationship.get('Ids', [])
                        cells = [block for block in blocks if block.get('Id') in cell_ids and block.get('BlockType') == 'CELL']
                        
                        for cell in cells:
                            cell_text = self.get_text_from_block(cell, blocks).strip()
                            if cell_text and self.looks_like_form_field(cell_text):
                                confidence = cell.get('Confidence', 0)
                                field_type = self.determine_field_type(cell_text)
                                
                                form_fields.append({
                                    "name": self.clean_field_name(cell_text),
                                    "label": cell_text,
                                    "value": "",  # Empty for form filling
                                    "type": field_type,
                                    "confidence": confidence,
                                    "required": self.is_required_field(cell_text),
                                    "description": f"Table field: {cell_text}"
                                })
        
        return form_fields
    
    def looks_like_form_field(self, text: str) -> bool:
        """Check if text looks like a form field label."""
        if not text or len(text.strip()) < 2:
            return False
        
        text_lower = text.lower().strip()
        
        # Common Vietnamese form field patterns
        form_patterns = [
            'họ và tên', 'tên', 'họ tên', 'full name',
            'ngày sinh', 'date of birth', 'dob',
            'địa chỉ', 'address',
            'số điện thoại', 'phone', 'tel', 'điện thoại',
            'email', 'e-mail', 'thư điện tử',
            'cmnd', 'cccd', 'id', 'identity', 'chứng minh',
            'nghề nghiệp', 'occupation', 'job', 'công việc',
            'nơi sinh', 'place of birth',
            'quốc tịch', 'nationality',
            'giới tính', 'gender', 'sex',
            'ngày', 'date', 'thời gian',
            'ký tên', 'signature', 'chữ ký',
            'ghi chú', 'note', 'comment',
            'lý do', 'reason',
            'mục đích', 'purpose',
            'yêu cầu', 'request',
            'đề nghị', 'proposal',
            'xác nhận', 'confirm',
            'kính gửi', 'gửi',
            'tôi là', 'tôi',
            'ngôi nhà', 'nhà',
            'đất', 'land', 'property',
            'hợp pháp', 'legal',
            'tình trạng', 'status', 'condition',
            'xác nhận', 'confirmation'
        ]
        
        # Check if text contains any form field patterns
        for pattern in form_patterns:
            if pattern in text_lower:
                return True
        
        # Check if text ends with colon (common in forms)
        if text.strip().endswith(':'):
            return True
        
        # Check if text is short and contains common form words
        if len(text.split()) <= 5:  # Short phrases
            form_words = ['tên', 'ngày', 'địa chỉ', 'số', 'điện thoại', 'email', 'cmnd', 'cccd']
            for word in form_words:
                if word in text_lower:
                    return True
        
        return False
    
    def extract_tables(self, blocks: List[Dict]) -> List[Dict]:
        """Extract tables from Textract blocks."""
        tables = []
        table_blocks = [block for block in blocks if block.get('BlockType') == 'TABLE']
        
        for table_block in table_blocks:
            table_data = {
                'id': table_block.get('Id'),
                'confidence': table_block.get('Confidence', 0),
                'rows': []
            }
            
            # Extract cells
            if 'Relationships' in table_block:
                for relationship in table_block['Relationships']:
                    if relationship.get('Type') == 'CHILD':
                        cell_ids = relationship.get('Ids', [])
                        cells = [block for block in blocks if block.get('Id') in cell_ids and block.get('BlockType') == 'CELL']
                        
                        # Group cells by row
                        rows = {}
                        for cell in cells:
                            row_index = cell.get('RowIndex', 0)
                            col_index = cell.get('ColumnIndex', 0)
                            cell_text = self.get_text_from_block(cell, blocks)
                            
                            if row_index not in rows:
                                rows[row_index] = {}
                            rows[row_index][col_index] = cell_text
                        
                        # Convert to list of lists
                        for row_index in sorted(rows.keys()):
                            row_data = []
                            for col_index in sorted(rows[row_index].keys()):
                                row_data.append(rows[row_index][col_index])
                            table_data['rows'].append(row_data)
            
            tables.append(table_data)
        
        return tables
    
    def get_text_from_block(self, block: Dict, all_blocks: List[Dict]) -> str:
        """Get text content from a block by following relationships to word blocks."""
        text_parts = []
        
        if 'Relationships' in block:
            for relationship in block['Relationships']:
                if relationship.get('Type') == 'CHILD':
                    child_ids = relationship.get('Ids', [])
                    for child_id in child_ids:
                        child_block = next((b for b in all_blocks if b.get('Id') == child_id), None)
                        if child_block and child_block.get('BlockType') == 'WORD':
                            text_parts.append(child_block.get('Text', ''))
        
        return ' '.join(text_parts)
    
    def determine_field_type(self, field_name: str) -> str:
        """Determine the type of form field based on name."""
        name_lower = field_name.lower()
        
        if any(keyword in name_lower for keyword in ['ngày', 'date', 'thời gian']):
            return 'date'
        elif any(keyword in name_lower for keyword in ['ký tên', 'signature', 'chữ ký']):
            return 'signature'
        elif any(keyword in name_lower for keyword in ['checkbox', 'tích', 'chọn']):
            return 'checkbox'
        elif any(keyword in name_lower for keyword in ['email', 'thư điện tử']):
            return 'email'
        elif any(keyword in name_lower for keyword in ['số điện thoại', 'phone', 'điện thoại']):
            return 'tel'
        else:
            return 'text'
    
    def clean_field_name(self, field_name: str) -> str:
        """Clean and normalize field names."""
        if not field_name:
            return "unnamed_field"
        
        # Convert to lowercase and replace spaces with underscores
        cleaned = field_name.lower().strip()
        
        # Remove special characters except underscores and Vietnamese characters
        import re
        cleaned = re.sub(r'[^a-z0-9_\u00c0-\u017f]', '_', cleaned)
        
        # Replace multiple underscores with single underscore
        cleaned = re.sub(r'_+', '_', cleaned)
        
        # Remove leading/trailing underscores
        cleaned = cleaned.strip('_')
        
        # Ensure it's not empty
        if not cleaned:
            cleaned = "unnamed_field"
        
        return cleaned
    
    def is_required_field(self, field_name: str) -> bool:
        """Determine if a field is required based on its name."""
        required_keywords = ['bắt buộc', 'required', 'phải', 'cần thiết']
        name_lower = field_name.lower()
        return any(keyword in name_lower for keyword in required_keywords)
    
    def calculate_confidence_scores(self, form_fields: List[Dict]) -> Dict[str, float]:
        """Calculate confidence scores for form fields."""
        if not form_fields:
            return {}
        
        confidences = [field.get('confidence', 0) for field in form_fields]
        return {
            'average_confidence': sum(confidences) / len(confidences),
            'min_confidence': min(confidences),
            'max_confidence': max(confidences),
            'total_fields': len(form_fields),
            'high_confidence_fields': len([c for c in confidences if c >= 90]),
            'medium_confidence_fields': len([c for c in confidences if 70 <= c < 90]),
            'low_confidence_fields': len([c for c in confidences if c < 70])
        }
    
    def determine_category_from_filename(self, filename: str) -> str:
        """Determine form category from filename."""
        filename_lower = filename.lower()
        
        if any(keyword in filename_lower for keyword in ['nhà', 'đất', 'housing', 'property']):
            return 'housing'
        elif any(keyword in filename_lower for keyword in ['doanh nghiệp', 'business', 'company']):
            return 'business'
        elif any(keyword in filename_lower for keyword in ['giáo dục', 'education', 'school']):
            return 'education'
        elif any(keyword in filename_lower for keyword in ['y tế', 'health', 'medical']):
            return 'health'
        else:
            return 'general'
    
    def generate_title_from_filename(self, filename: str) -> str:
        """Generate a title from the filename."""
        # Remove extension and clean up
        title = os.path.splitext(filename)[0]
        # Replace underscores and hyphens with spaces
        title = title.replace('_', ' ').replace('-', ' ')
        # Capitalize words
        title = ' '.join(word.capitalize() for word in title.split())
        return title
    
    def generate_tags_from_content(self, text: str, category: str) -> List[str]:
        """Generate tags from form content."""
        tags = [category]
        
        # Add category-specific tags
        category_tags = {
            'housing': ['bất động sản', 'nhà ở', 'đất đai'],
            'business': ['doanh nghiệp', 'kinh doanh', 'đăng ký'],
            'education': ['giáo dục', 'học tập', 'trường học'],
            'health': ['y tế', 'sức khỏe', 'bệnh viện']
        }
        
        if category in category_tags:
            tags.extend(category_tags[category])
        
        return tags
    
    def extract_keywords(self, text: str) -> List[str]:
        """Extract keywords from form content."""
        content = text.lower()
        
        keywords = []
        keyword_patterns = [
            'đơn', 'form', 'mẫu', 'giấy tờ', 'thủ tục', 'hành chính',
            'xác nhận', 'chứng nhận', 'đăng ký', 'khai báo', 'báo cáo'
        ]
        
        for pattern in keyword_patterns:
            if pattern in content:
                keywords.append(pattern)
        
        return keywords[:10]  # Limit to 10 keywords
    
    def check_existing_form(self, file_hash: str) -> Optional[Dict]:
        """Check if a form with the same hash already exists."""
        try:
            result = self.supabase.table('forms').select('id').eq('file_hash', file_hash).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"⚠️ Error checking existing form: {e}")
            return None
    
    def store_form_in_database(self, form_data: Dict[str, Any]) -> Optional[Dict]:
        """Store the processed form data in the database."""
        try:
            # Store in the existing forms table with additional fields
            result = self.supabase.table('forms').insert({
                'title': form_data['title'],
                'url': form_data['file_path'],
                'content': form_data['extracted_text'],
                'country': form_data['country'],
                'agency': form_data['agency'],
                'embedding': form_data['embedding'],
                # Additional fields for enhanced functionality
                'textract_json': form_data['textract_json'],
                'form_fields': form_data['form_fields'],
                'tables': form_data['tables'],
                'confidence_scores': form_data['confidence_scores'],
                'category': form_data['category'],
                'tags': form_data['tags'],
                'keywords': form_data['keywords'],
                'file_hash': form_data['file_hash'],
                'file_size_bytes': form_data['file_size_bytes'],
                'processing_status': form_data['processing_status'],
                'last_processed_at': form_data['last_processed_at']
            }).execute()
            
            if result.data:
                return result.data[0]
            else:
                print("❌ Failed to store form in database")
                return None
                
        except Exception as e:
            print(f"❌ Error storing form in database: {e}")
            return None

def main():
    """Main function to run the form preprocessing."""
    print("🚀 Form Preprocessing with AWS Textract")
    print("=" * 50)
    
    try:
        # Initialize preprocessor
        preprocessor = FormPreprocessor()
        print("✅ Preprocessor initialized successfully")
        
        # Process forms
        results = preprocessor.process_forms_directory()
        
        # Print results
        print("\n📊 Processing Results:")
        print(f"✅ Successfully processed: {results['processed']} forms")
        print(f"❌ Failed: {results['failed']} forms")
        
        if results['forms']:
            print("\n📋 Processed Forms:")
            for form in results['forms']:
                print(f"  - {form['filename']} (ID: {form['form_id']}, Fields: {form['fields_count']})")
        
        if results['errors']:
            print("\n❌ Errors:")
            for error in results['errors']:
                print(f"  - {error}")
        
        print(f"\n🎉 Preprocessing completed!")
        print(f"📄 Total forms processed: {results['processed']}")
        print(f"📄 Total forms failed: {results['failed']}")
        
        return results['processed'] > 0
        
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
