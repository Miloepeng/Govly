#!/usr/bin/env python3
"""
Setup script to create AWS S3 bucket for form processing.
"""

import os
import sys
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_s3_bucket(bucket_name: str, region: str = 'us-east-1'):
    """Create S3 bucket for form processing."""
    try:
        # Initialize S3 client
        s3_client = boto3.client(
            's3',
            region_name=region,
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            aws_session_token=os.getenv('AWS_SESSION_TOKEN')
        )
        
        print(f"🪣 Creating S3 bucket: {bucket_name}")
        
        # Create bucket
        if region == 'us-east-1':
            # us-east-1 doesn't need LocationConstraint
            s3_client.create_bucket(Bucket=bucket_name)
        else:
            s3_client.create_bucket(
                Bucket=bucket_name,
                CreateBucketConfiguration={'LocationConstraint': region}
            )
        
        print(f"✅ S3 bucket created successfully: {bucket_name}")
        
        # Set up lifecycle policy to clean up old files
        lifecycle_policy = {
            'Rules': [
                {
                    'ID': 'DeleteOldForms',
                    'Status': 'Enabled',
                    'Filter': {'Prefix': 'forms/'},
                    'Expiration': {'Days': 7}  # Delete files after 7 days
                }
            ]
        }
        
        s3_client.put_bucket_lifecycle_configuration(
            Bucket=bucket_name,
            LifecycleConfiguration=lifecycle_policy
        )
        
        print(f"✅ Lifecycle policy set (files deleted after 7 days)")
        
        return True
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'BucketAlreadyExists':
            print(f"✅ S3 bucket already exists: {bucket_name}")
            return True
        elif error_code == 'BucketAlreadyOwnedByYou':
            print(f"✅ S3 bucket already owned by you: {bucket_name}")
            return True
        else:
            print(f"❌ Error creating S3 bucket: {e}")
            return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_s3_access(bucket_name: str):
    """Test S3 bucket access."""
    try:
        s3_client = boto3.client(
            's3',
            region_name=os.getenv('AWS_REGION', 'us-east-1'),
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            aws_session_token=os.getenv('AWS_SESSION_TOKEN')
        )
        
        # Test listing objects
        response = s3_client.list_objects_v2(Bucket=bucket_name, MaxKeys=1)
        print(f"✅ S3 bucket access confirmed: {bucket_name}")
        return True
        
    except Exception as e:
        print(f"❌ S3 access test failed: {e}")
        return False

def main():
    """Main setup function."""
    print("🚀 AWS S3 Setup for Form Processing")
    print("=" * 50)
    
    # Check environment variables
    aws_access_key = os.getenv('AWS_ACCESS_KEY_ID')
    aws_secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
    aws_region = os.getenv('AWS_REGION', 'us-east-1')
    aws_session_token = os.getenv('AWS_SESSION_TOKEN')
    bucket_name = os.getenv('AWS_S3_BUCKET', 'govly-forms')
    
    if not aws_access_key or not aws_secret_key:
        print("❌ AWS credentials not found in .env file")
        print("Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY")
        return False
    
    print(f"🔧 Configuration:")
    print(f"   Region: {aws_region}")
    print(f"   Bucket: {bucket_name}")
    print(f"   Access Key: {aws_access_key[:8]}...")
    
    # Create S3 bucket
    if create_s3_bucket(bucket_name, aws_region):
        # Test access
        if test_s3_access(bucket_name):
            print(f"\n🎉 S3 setup completed successfully!")
            print(f"\nNext steps:")
            print(f"1. Update your .env file with:")
            print(f"   AWS_S3_BUCKET={bucket_name}")
            print(f"2. Run the form preprocessing:")
            print(f"   python preprocess_forms.py")
            return True
    
    print(f"\n❌ S3 setup failed")
    return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
