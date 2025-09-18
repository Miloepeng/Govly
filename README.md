# 🏛️ Govly – AI Government Services Assistant

Govly is an AI-powered assistant that helps residents navigate government services. It routes queries intelligently, retrieves relevant policy documents and forms via RAG, and tracks application progress through a modern chat UI.

Built with Next.js (frontend) and FastAPI (backend), vector search on Supabase pgvector, and the SEA-LION LLM.

## ✨ Highlights

- **Smart chat routing**: Classifies intent and routes to document search, form discovery, agency selection, or general advice
- **RAG document and form search**: Uses BAAI/bge-m3 embeddings (1024-d) over Supabase pgvector
- **PDF form understanding**: OCR + extraction to generate dynamic fillable schemas
- **Browse database documents + AI explanations**: Inspect retrieved items with contextual explanations
- **Upload forms for field extraction**: Turn PDFs into structured, fillable forms
- **Multi-country, multi-language**: Context-aware responses for Southeast Asia
- **Application tracking**: Local progress timeline (Applied → Under Review → Confirmed)

## 🗂 Project Structure

```
govly-web/
├── backend/               # FastAPI server & RAG
│   ├── main.py            # API endpoints
│   └── rag/               # Embedding, matching, preprocessing
└── frontend/              # Next.js 14 app
    ├── pages/             # Chat, status pages
    └── components/        # ChatMessage, DynamicForm, Sidebar
```

## 🚀 Quick Start

### Option A: Docker (Recommended)

Prereqs: Docker Desktop, Git

```bash
git clone <your-repo-url>
cd Govly
cp env.example .env
docker-compose up -d
```

Services:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

```bash
# Stop
docker-compose down
```

### Option B: Manual Setup

Prereqs: Node.js 18+, Python 3.11+, Git, Supabase project (pgvector), SEA-LION API key

1) Backend

```bash
cd govly-web/backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `.env` in `govly-web/backend`:

```bash
SEA_LION_API_KEY=your_api_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```

Run backend:

```bash
python main.py
# API: http://localhost:8000, Docs: http://localhost:8000/docs
```

2) Frontend

```bash
cd govly-web/frontend
npm install
npm run dev
# App: http://localhost:3000
```

## 🧩 Core Endpoints

- `POST /api/smartChat` – Intent detection and routing
- `POST /api/ragLink` – Policy/regulation document search
- `POST /api/ragForm` – Government form search
- `POST /api/explain` – Explain relevance of retrieved items
- `POST /api/extractForm` – PDF form field extraction
- `POST /api/fillForm` – AI-assisted form filling using chat context
- `POST /api/documentChat` – Ask questions about a specific document (document-aware chat)

Additional endpoints for documents and forms:

- `GET /api/pdf/{filename}` – Serve local PDF from backend/forms for preview
- `POST /api/upload` – Upload PDF/JPG/PNG (≤10MB) to backend/forms
- `POST /api/extractFormPreprocessed` – Use preprocessed DB fields by filename
- `POST /api/extractFormById` – Use preprocessed DB fields by numeric ID
- `POST /api/extractFormDirect` – Force OCR-based extraction (skip DB)
- `POST /api/forms` – Alias to RAG form search (frontend compatibility)

Document management API (Supabase storage-backed):

- `GET /api/documents` – List documents with public URLs
- `GET /api/documents/{document_id}` – Get document metadata
- `POST /api/documents` – Create document record
- `DELETE /api/documents/{document_id}` – Delete document and storage file
- `GET /api/documents/search?query=...` – Search documents by title

Form data retrieval:

- `GET /api/formData/{form_id}` – Full stored form data
- `GET /api/formSchema/{form_id}` – Schema formatted for filling
- `GET /api/formsByCategory/{category}` – Forms by category
- `GET /api/formCategories` – List categories
- `GET /api/formsSummary` – Summary of available forms
- `GET /api/formByFilename/{filename}` – Form data by filename

## 📚 Document Browser & AI Explanations

Use the RAG endpoints to browse documents stored in the vector database, then call `explain` for AI-generated context.

Example flow:

1) Search documents

```bash
curl -X POST http://localhost:8000/api/ragLink \
  -H "Content-Type: application/json" \
  -d '{
    "query":"housing assistance policies",
    "country":"Vietnam",
    "language":"Vietnamese"
  }'
```

2) Ask AI to explain how results relate to your query

```bash
curl -X POST http://localhost:8000/api/explain \
  -H "Content-Type: application/json" \
  -d '{
    "user_query":"I need housing assistance",
    "documents":[{"title":"...","content":"...","url":"..."}],
    "document_type":"ragLink",
    "country":"Vietnam",
    "language":"Vietnamese"
  }'
```

The frontend surfaces this as a browsable list with contextual explanations.

## 🧾 Form Upload & Field Extraction

Upload a government PDF form and extract a structured schema, then let AI prefill it with your chat context.

1) Extract fields from a PDF

```bash
curl -X POST http://localhost:8000/api/extractForm \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/form.pdf"}'
```

2) AI-assisted fill from chat history

```bash
curl -X POST http://localhost:8000/api/fillForm \
  -H "Content-Type: application/json" \
  -d '{
    "form_schema": {"fields": [{"name":"full_name","type":"text"}]},
    "chat_history": [{"role":"user","content":"My name is Jane Doe"}]
  }'
```

In the UI, you can upload a PDF, review detected fields, edit if needed, and export the filled result.

## 🧠 RAG & Models

- Embeddings: `BAAI/bge-m3` (1024-d)
- Database: Supabase with pgvector
- Chunking: ~1200 words with ~150 overlap
- Similarity: cosine distance via `<=>`, reported as `1 - distance`

Supabase SQL (create tables and RPC helpers): see `govly-web/README.md` for full snippets.

## 🖹 OCR Engines

- **Tesseract OCR**: Default on-demand OCR for PDFs and images via `tesseract_extractor`
  - Used by: `POST /api/extractForm`, `POST /api/extractFormDirect`, and OCR fallback paths
  - Supports Vietnamese and English extraction, with cleaning and field inference

- **AWS Textract (preprocessing pipeline)**: Optional batch/preload flow
  - Script: `govly-web/backend/preprocess_forms.py`
  - Uploads PDFs to S3, runs Textract, parses key-values/tables, stores normalized fields to DB
  - At runtime, APIs can use preprocessed schemas via `extractFormPreprocessed`/`extractFormById`

AWS setup (optional):

1) Configure AWS credentials with Textract and S3 permissions
2) Set environment variables for bucket/region/keys
3) Run the preprocessing script to seed the database

See inline comments in `preprocess_forms.py` for parameters and execution flow.

## 🔑 Configuration & Keys

- SEA-LION API key is required for LLM responses
- Supabase URL and anon key for RAG queries
- Optional: pre-seeded Supabase instance and keys are available on request
 - Optional (AWS Textract): AWS credentials with Textract + S3 access, target S3 bucket

## 🧪 Development

Frontend

```bash
cd govly-web/frontend
npm run dev
npm run build
npm run start
npm run lint
```

Backend

```bash
cd govly-web/backend
python main.py
```

## 🩺 Troubleshooting

- Ports 3000/8000 busy → stop conflicting services
- Backend fails → check venv, `.env`, Python >= 3.8/3.11
- Frontend fails → ensure Node 18+, rerun `npm install`
- RAG empty results → verify Supabase, pgvector, and RPC SQL installed
- OCR issues → verify Tesseract installed and language packs; for Textract, check IAM and job status

## 📜 License

MIT

## 🖥️ Frontend Features & Pages

- `pages/dashboard.tsx`: Entry dashboard aggregating chat, quick actions, and navigation
- `pages/documents.tsx`: Document browser backed by `GET /api/documents` and search
- `pages/documents/[id].tsx`: Document detail with preview and AI Q&A via `POST /api/documentChat`
- `pages/scan.tsx`: Upload PDFs/images (`POST /api/upload`) and extract fields via `extractForm*` APIs
- `pages/status.tsx`: Application progress tracking (Applied → Under Review → Confirmed)
- `pages/edit-application/[id].tsx`: Review and edit captured application data
- Components: `PDFViewer.tsx`, `WebsiteViewer.tsx`, `DynamicForm.tsx`, `AgencyDetection.tsx`, `Sidebar.tsx`, `DashboardHeader.tsx`

Usage highlights:

- Browse documents, open details, and ask AI targeted questions about the current document
- Upload a PDF form, extract fields (preprocessed or OCR), review schema, and AI-prefill using chat context
- Track applications and view progress with timestamps; edit or continue later

## 🙌 Credits

Built by Shao Zhi, Yi Ting, Yong Sheng (NUS). Demo links and extended docs are in `govly-web/README.md`.


