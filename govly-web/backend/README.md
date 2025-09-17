# Govly Backend

## Document Management Setup

### 1. Database Setup
Run the SQL schema in Supabase:
```sql
-- Execute the contents of supabase_documents.sql in Supabase SQL Editor
```

### 2. Environment Variables
Create `.env` in the backend folder:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

### 3. Upload PDFs to Database
Use the upload script to add your PDFs to Supabase Storage and database:

```bash
# Install dependencies
pip install -r requirements.txt

# Upload PDFs from a folder
python scripts/upload_pdfs_to_supabase.py "C:\path\to\your\pdfs"

# Optional: add a subfolder prefix
python scripts/upload_pdfs_to_supabase.py "C:\path\to\your\pdfs" "business-docs"
```

### 4. API Endpoints Available
- `GET /api/documents` - List all documents
- `GET /api/documents/{id}` - Get specific document
- `POST /api/documents` - Create document record
- `DELETE /api/documents/{id}` - Delete document
- `GET /api/documents/search?query=...` - Search documents

### 5. Frontend Integration
The frontend document manager (`/documents`) now automatically:
- Loads documents from the database
- Provides real-time search via API
- Displays PDFs with public URLs
- Falls back to sample documents if API fails

### Notes
- Files are stored in Supabase Storage bucket `documents` (public)
- Metadata is stored in `public.documents` table
- Public URLs are computed via `public.documents_with_url` view
- The upload script sanitizes filenames for storage compatibility



