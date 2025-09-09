#!/usr/bin/env python3
"""
Test S3 setup and form processing with the new S3-based approach.
"""

import os
import sys
from pathlib import Path

# Add current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

from preprocess_forms import FormPreprocessor

def test_s3_connection():
    """Test S3 connection and bucket access."""
    print("🧪 Testing S3 Connection")
    print("=" * 40)
    
    try:
        preprocessor = FormPreprocessor()
        
        # Test S3 bucket access
        print(f"🔍 Testing S3 bucket: {preprocessor.s3_bucket}")
        
        # Try to list objects (this tests bucket access)
        response = preprocessor.s3_client.list_objects_v2(
            Bucket=preprocessor.s3_bucket, 
            MaxKeys=1
        )
        
        print(f"✅ S3 connection successful!")
        print(f"   Bucket: {preprocessor.s3_bucket}")
        print(f"   Region: {preprocessor.aws_region}")
        
        return True
        
    except Exception as e:
        print(f"❌ S3 connection failed: {e}")
        print(f"\nTroubleshooting:")
        print(f"1. Check your AWS credentials in .env file")
        print(f"2. Ensure the S3 bucket '{preprocessor.s3_bucket}' exists")
        print(f"3. Verify your IAM user has S3 permissions")
        print(f"4. Run: python setup_aws_s3.py")
        return False

def test_single_form_processing():
    """Test processing a single form with S3."""
    print("\n🧪 Testing Single Form Processing")
    print("=" * 40)
    
    try:
        preprocessor = FormPreprocessor()
        
        # Find a PDF file to test
        forms_dir = os.path.join(current_dir, 'forms')
        pdf_files = list(Path(forms_dir).glob('*.pdf'))
        
        if not pdf_files:
            print("❌ No PDF files found in forms directory")
            return False
        
        test_file = str(pdf_files[0])
        print(f"📄 Testing with: {os.path.basename(test_file)}")
        
        # Test PDF compatibility check
        print("🔍 Checking PDF compatibility...")
        is_compatible = preprocessor.check_pdf_compatibility(test_file)
        print(f"   Compatible: {is_compatible}")
        
        # Test S3 upload
        print("📤 Testing S3 upload...")
        s3_key = preprocessor.upload_to_s3(test_file)
        print(f"   Uploaded to: s3://{preprocessor.s3_bucket}/{s3_key}")
        
        # Clean up test file
        preprocessor.s3_client.delete_object(
            Bucket=preprocessor.s3_bucket, 
            Key=s3_key
        )
        print(f"🗑️ Cleaned up test file")
        
        print("✅ S3 form processing test successful!")
        return True
        
    except Exception as e:
        print(f"❌ Form processing test failed: {e}")
        return False

def main():
    """Main test function."""
    print("🧪 S3 Setup and Form Processing Test")
    print("=" * 50)
    
    # Test S3 connection
    s3_ok = test_s3_connection()
    
    if s3_ok:
        # Test form processing
        form_ok = test_single_form_processing()
        
        if form_ok:
            print(f"\n🎉 All tests passed!")
            print(f"\nYou can now run:")
            print(f"  python preprocess_forms.py")
            return True
    
    print(f"\n❌ Some tests failed. Please fix the issues above.")
    return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
