# Form Preprocessing with AWS Textract

This approach preprocesses all your PDF forms using AWS Textract and stores the extracted JSON data in your existing Supabase database, so your chatbot can access structured form data for form filling.

## 🚀 Quick Start

### 1. Set up AWS Services

1. Create an AWS account
2. Enable AWS Textract service
3. Create an S3 bucket for form processing
4. Create an IAM user with Textract and S3 permissions
5. Get your AWS credentials

### 2. Configure Environment

Add these to your `.env` file:

```env
# AWS Textract Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here
AWS_REGION=us-east-1
AWS_S3_BUCKET=govly-forms

# Your existing Supabase configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_anon_key_here
```

### 3. Set up S3 Bucket

Create an S3 bucket for form processing:

```bash
python setup_aws_s3.py
```

Or manually create a bucket named `govly-forms` in your AWS console.

### 4. Update Database Schema

Run the SQL schema update in your Supabase SQL Editor:

```sql
-- Run the contents of update_forms_schema.sql
```

### 5. Install Dependencies

```bash
pip install boto3 botocore
```

### 6. Preprocess Your Forms

```bash
python preprocess_forms.py
```

This will:
- Upload PDFs to S3 temporarily
- Process all PDF files using AWS Textract (supports multi-page PDFs)
- Extract form fields, tables, and text
- Store the data in your existing `forms` table
- Generate embeddings for search
- Clean up temporary S3 files

## 📊 What Gets Extracted

For each form, the script extracts:

- **Form Fields**: All input fields with names, types, and confidence scores
- **Tables**: Any tables in the form
- **Text Content**: All readable text from the form
- **Metadata**: File info, categories, tags, keywords
- **Confidence Scores**: Quality metrics for each field

## 🔍 API Endpoints

After preprocessing, you can access form data via these endpoints:

### Get Form Data
```http
GET /api/formData/{form_id}
```
Returns complete form data including extracted fields.

### Get Form Schema for Filling
```http
GET /api/formSchema/{form_id}
```
Returns form schema formatted for form filling.

### Get Forms by Category
```http
GET /api/formsByCategory/{category}
```
Returns all forms in a specific category.

### Get All Categories
```http
GET /api/formCategories
```
Returns all available form categories.

### Get Forms Summary
```http
GET /api/formsSummary
```
Returns summary of all processed forms.

## 💡 Usage in Your Chatbot

### 1. Search for Forms
```python
import requests

# Get forms by category
response = requests.get('http://localhost:8000/api/formsByCategory/housing')
forms = response.json()['forms']

# Get specific form data
form_data = requests.get(f'http://localhost:8000/api/formData/{form_id}').json()
```

### 2. Get Form Schema for Filling
```python
# Get form schema for form filling
schema = requests.get(f'http://localhost:8000/api/formSchema/{form_id}').json()

# The schema contains:
# - form_id: ID of the form
# - title: Form title
# - category: Form category
# - fields: Array of form fields with:
#   - name: Field name
#   - type: Field type (text, date, signature, etc.)
#   - label: Display label
#   - required: Whether field is required
#   - description: Field description
#   - confidence: Extraction confidence score
```

### 3. Use in Form Filling
```python
# Example: Fill a form using the extracted schema
def fill_form_with_chatbot_data(form_id, user_data):
    # Get the form schema
    schema = requests.get(f'http://localhost:8000/api/formSchema/{form_id}').json()
    
    # Map user data to form fields
    filled_fields = []
    for field in schema['fields']:
        field_name = field['name']
        field_type = field['type']
        
        # Get user data for this field
        if field_name in user_data:
            filled_fields.append({
                'name': field_name,
                'value': user_data[field_name],
                'type': field_type
            })
    
    return filled_fields
```

## 📋 Form Field Types

The system automatically detects these field types:

- **text**: Regular text input fields
- **date**: Date fields (ngày, date, thời gian)
- **signature**: Signature fields (ký tên, signature, chữ ký)
- **checkbox**: Checkbox fields (checkbox, tích, chọn)
- **email**: Email fields (email, thư điện tử)
- **tel**: Phone number fields (số điện thoại, phone)

## 🏷️ Categories

Forms are automatically categorized based on filename:

- **housing**: Nhà ở, đất đai, bất động sản
- **business**: Doanh nghiệp, kinh doanh, đăng ký
- **education**: Giáo dục, học tập, trường học
- **health**: Y tế, sức khỏe, bệnh viện
- **general**: Default category

## 🔧 Troubleshooting

### Common Issues

1. **AWS Textract not working**
   - Check AWS credentials in `.env`
   - Verify AWS region is correct
   - Ensure AWS Textract service is enabled

2. **Database errors**
   - Run the schema update SQL
   - Check Supabase credentials
   - Verify table permissions

3. **No forms processed**
   - Check if PDF files exist in `forms/` directory
   - Verify file permissions
   - Check AWS Textract limits

### Debug Commands

```bash
# Test the preprocessing script
python preprocess_forms.py

# Test form data retrieval
python get_form_data.py

# Check API endpoints
curl http://localhost:8000/api/formsSummary
curl http://localhost:8000/api/formCategories
```

## 📈 Benefits

- **No API calls during chat**: All form data is preprocessed and stored
- **Fast access**: Form data is immediately available from the database
- **Rich metadata**: Confidence scores, field types, and categories
- **Searchable**: Forms can be searched by category, content, or fields
- **Scalable**: Process hundreds of forms offline

## 🔄 Workflow

1. **Preprocessing**: Run `python preprocess_forms.py` to extract all form data
2. **Storage**: Data is stored in your existing Supabase `forms` table
3. **Chatbot Access**: Your chatbot can query form data via API endpoints
4. **Form Filling**: Use extracted schemas to fill forms with user data

## 📝 Example: Complete Form Processing

```python
# 1. Preprocess all forms
python preprocess_forms.py

# 2. Get available forms
response = requests.get('http://localhost:8000/api/formsSummary')
print(f"Total forms: {response.json()['total']}")

# 3. Get forms by category
housing_forms = requests.get('http://localhost:8000/api/formsByCategory/housing').json()
print(f"Housing forms: {len(housing_forms['forms'])}")

# 4. Get specific form schema
form_id = housing_forms['forms'][0]['id']
schema = requests.get(f'http://localhost:8000/api/formSchema/{form_id}').json()
print(f"Form fields: {len(schema['fields'])}")

# 5. Use in your chatbot
for field in schema['fields']:
    print(f"Field: {field['label']} (Type: {field['type']}, Required: {field['required']})")
```

This approach gives you a robust, scalable system for form processing that integrates seamlessly with your existing chatbot infrastructure!
