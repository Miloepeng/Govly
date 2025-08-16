# 🏛️ Govly - Smart Government Services Advisor

A comprehensive AI-powered government services advisor that intelligently routes user queries, provides relevant policy documents and forms, and tracks application progress through a conversational interface.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Python 3.8+
- Supabase account with pgvector extension enabled
- SEA-LION API key

### Backend Setup
   ```bash
cd govly-web/backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set environment variables
export SEA_LION_API_KEY="your_api_key_here"
export SUPABASE_URL="your_supabase_project_url"
export SUPABASE_KEY="your_supabase_anon_key"

# Start the backend
python main.py
```

### Frontend Setup
   ```bash
cd govly-web/frontend
npm install
npm run dev
   ```

### Database Setup
   ```bash
# Enable pgvector extension in Supabase
# Go to your Supabase dashboard → Database → Extensions → Enable 'vector'

# Create the required tables (run in Supabase SQL editor)
CREATE TABLE IF NOT EXISTS chunks (
  id SERIAL PRIMARY KEY,
  country TEXT,
  agency TEXT,
  title TEXT,
  url TEXT,
  content TEXT,
  embedding vector(1024)
);

CREATE TABLE IF NOT EXISTS forms (
  id SERIAL PRIMARY KEY,
  country TEXT,
  agency TEXT,
  title TEXT,
  url TEXT,
  content TEXT,
  embedding vector(1024)
);

# Create the similarity search functions
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(1024),
  match_count int DEFAULT 5,
  filter_country text DEFAULT NULL,
  filter_agency text DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  country text,
  agency text,
  title text,
  url text,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    chunks.id,
    chunks.country,
    chunks.agency,
    chunks.title,
    chunks.url,
    chunks.content,
    1 - (chunks.embedding <=> query_embedding) AS similarity
  FROM chunks
  WHERE (filter_country IS NULL OR chunks.country = filter_country)
    AND (filter_agency IS NULL OR chunks.agency = filter_agency)
  ORDER BY chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION match_forms(
  query_embedding vector(1024),
  match_count int DEFAULT 5,
  filter_country text DEFAULT NULL,
  filter_agency text DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  country text,
  agency text,
  title text,
  url text,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    forms.id,
    forms.country,
    forms.agency,
    forms.title,
    forms.url,
    forms.content,
    1 - (forms.embedding <=> query_embedding) AS similarity
  FROM forms
  WHERE (filter_country IS NULL OR forms.country = filter_country)
    AND (filter_agency IS NULL OR forms.agency = filter_agency)
  ORDER BY forms.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

# Run the embedding scripts
cd govly-web/backend/rag
python pre-embedding.py
python embed_forms.py
```

## 🏗️ System Architecture

### Core Components
- **FastAPI Backend**: Python-based API server with LLM integration
- **Next.js Frontend**: React-based chat interface with dynamic forms
- **Supabase + pgvector**: Cloud vector database for RAG functionality
- **SEA-LION LLM**: Southeast Asian language model for intent detection
- **Tesseract OCR**: PDF text extraction for form processing
- **BAAI/bge-m3**: 1024-dimensional embedding model for vector search

## 🔌 API Endpoints

### `/api/smartChat` - Main Routing Endpoint
The core endpoint that intelligently routes user queries to appropriate services.

**Request:**
```json
{
  "message": "I need housing assistance",
  "conversationContext": [...],
  "country": "Vietnam",
  "language": "Vietnamese",
  "selectedAgency": null,
  "settings": {
    "responseType": "smart"
  }
}
```

**Response Types:**
- `ragLink`: Route to policy document search
- `ragForm`: Route to government form search  
- `agency`: Route to agency selection
- `general`: Route to general chat

### `/api/ragLink` - Policy Document Search
Searches for relevant government policies, regulations, and documents.

**Request:**
```json
{
  "query": "housing assistance policies",
  "country": "Vietnam",
  "language": "Vietnamese"
}
```

**Response:**
```json
{
  "results": [
    {
      "title": "Housing Assistance Policy 2024",
      "content": "Government housing support for low-income families...",
      "url": "https://example.com/policy",
      "similarity": 0.89
    }
  ]
}
```

### `/api/ragForm` - Government Form Search
Finds relevant government forms and applications.

**Request:**
```json
{
  "query": "housing application form",
  "country": "Vietnam", 
  "language": "Vietnamese"
}
```

**Response:**
```json
{
  "results": [
    {
      "title": "Housing Application Form",
      "description": "Official form for housing assistance...",
      "url": "https://example.com/form.pdf"
    }
  ]
}
```

### `/api/explain` - Document Explanation
Generates intelligent explanations of how retrieved documents relate to user queries.

**Request:**
```json
{
  "user_query": "I need housing assistance",
  "documents": [...],
  "document_type": "ragLink",
  "country": "Vietnam",
  "language": "Vietnamese"
}
```

### `/api/extractForm` - Form Field Extraction
Extracts form fields from PDF documents using OCR and LLM analysis.

**Request:**
```json
{
  "url": "path/to/form.pdf"
}
```

**Response:**
```json
{
  "fields": [
    {
      "name": "full_name",
      "type": "text",
      "label": "Full Name",
      "required": true,
      "description": "Enter your full legal name"
    }
  ]
}
```

### `/api/fillForm` - AI Form Filling
Uses conversation context to intelligently fill form fields.

**Request:**
```json
{
  "form_schema": {...},
  "chat_history": [...]
}
```

## 🧠 Smart Response System

### Intent Detection Flow
1. **User Query Analysis**: SEA-LION LLM analyzes user intent
2. **Category Classification**: Determines government service category
3. **Agency Suggestion**: Identifies relevant government agencies
4. **Routing Decision**: Chooses appropriate response type

### LLM Prompt Structure
```
You are an AI assistant that analyzes user messages to determine their intent and routing needs.

IMPORTANT ROUTING RULES:
- If user asks for "policies", "documents", "regulations" → route to ragLink
- If user asks for "forms", "applications", "submit" → route to ragForm  
- If user needs agency help → route to agency selection
- If user wants general advice → route to general chat
```

### Response Type Detection
- **ragLink**: Policy/document queries
- **ragForm**: Form/application queries
- **agency**: Agency-specific assistance needed
- **general**: General government advice

## 🔍 RAG (Retrieval-Augmented Generation) System

### RAG Models & Components
- **Embedding Model**: BAAI/bge-m3 (1024-dimensional vectors)
- **Text Chunking**: 1200-word chunks with 150-word overlap
- **Vector Database**: Supabase with pgvector extension
- **Similarity Search**: Cosine distance using pgvector operators
- **Document Processing**: PDF text extraction with PyPDF2
- **Content Cleaning**: Unicode normalization and noise removal

### Document Processing Pipeline
1. **PDF Upload**: Vietnamese government forms uploaded to forms directory
2. **OCR Extraction**: Tesseract extracts text from PDFs (Vietnamese + English)
3. **Text Cleaning**: Removes noise and normalizes text
4. **Text Chunking**: Splits text into 1200-word chunks with 150-word overlap
5. **Vector Embedding**: BAAI/bge-m3 model creates 1024-dimensional embeddings
6. **Database Storage**: Embeddings stored in Supabase with pgvector extension

### Current Vietnamese Forms
- **Đơn xác nhận nhà ở hợp pháp** (Housing confirmation form)
- **Đơn xin xác nhận chỗ ở hợp pháp** (Residence confirmation form)  
- **Đơn xin xác nhận có nhà ở trên đất** (Land ownership confirmation form)

### Search Process
1. **Query Embedding**: User query converted to 1024-dimensional vector using BAAI/bge-m3
2. **Supabase Query**: Calls `match_chunks()` or `match_forms()` RPC functions
3. **Vector Search**: pgvector performs cosine distance search with country/agency filtering
4. **Result Ranking**: Top 3 most relevant documents returned with similarity scores
5. **LLM Explanation**: SEA-LION generates contextual explanation of document relevance
6. **Frontend Display**: Results shown with intelligent context and similarity scores

### Vector Similarity Calculation
```python
# Cosine similarity using pgvector
# The match_chunks and match_forms functions use:
similarity = 1 - (embedding <=> query_embedding)

# Where <=> is the cosine distance operator
# Higher similarity = lower distance = more relevant
```

## 🏢 Agency Detection System

### Agency Categories
- **Housing**: Accommodation, real estate, construction
- **Land**: Property, planning, permits, development
- **Immigration**: Passports, visas, citizenship
- **Employment**: Work, labor laws, contracts
- **Transport**: Driving licenses, vehicle registration
- **Environment**: Environmental protection, waste management
- **Business**: Business registration, taxes, investment
- **Education**: Schools, universities, training

### Detection Process
1. **LLM Analysis**: SEA-LION analyzes user query context
2. **Category Mapping**: Maps to government service categories
3. **Agency Suggestion**: Suggests relevant agencies
4. **User Choice**: Presents agency options with Yes/No buttons
5. **Context Persistence**: Selected agency saved for future interactions

## 💬 Chat System

### Message Flow
1. **User Input**: Message typed in chat interface
2. **SmartChat Routing**: Backend determines response type
3. **Service Execution**: Calls appropriate endpoint (RAG, agency, general)
4. **Response Generation**: Creates intelligent response with context
5. **Frontend Display**: Shows response with relevant results

### Auto-scroll Features
- **Message Tracking**: Automatically scrolls to new messages
- **Loading States**: Shows progress during processing
- **Dynamic Updates**: Scrolls when content changes

### Loading States
- `understanding`: Analyzing user query
- `retrieving_links`: Searching for policy documents
- `retrieving_forms`: Searching for government forms
- `finding`: Locating relevant information
- `found`: Results located
- `generating`: Creating AI response

## 📋 Form Tracking System

### Application Lifecycle
1. **Form Submission**: User completes and submits form
2. **Data Storage**: Application saved to localStorage
3. **Status Tracking**: Progress tracked through 3 stages
4. **Timeline Updates**: Status changes update progress timeline

### Progress Stages
```
Applied → Under Review → Confirmed
   ↓           ↓           ↓
Blue Status  Yellow Status  Green Status
```

### Data Structure
```typescript
interface Application {
  id: string;
  formTitle: string;
  dateApplied: string;
  status: 'applied' | 'reviewed' | 'confirmed';
  formData: Record<string, any>;
  schema: any;
  progress: {
    applied: { date: string | null; completed: boolean };
    reviewed: { date: string | null; completed: boolean };
    confirmed: { date: string | null; completed: boolean };
  };
}
```

### Status Page Features
- **Application Cards**: Visual representation of each application
- **Progress Timeline**: 3-stage progress visualization
- **Status Filtering**: Filter by application status
- **Action Buttons**: Update status or view details
- **Date Tracking**: Timestamps for each stage

## 🔧 Configuration

### Environment Variables
```bash
SEA_LION_API_KEY=your_api_key_here
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```

### Database Configuration
```sql
-- Enable pgvector extension in Supabase
-- Go to Dashboard → Database → Extensions → Enable 'vector'

-- Create tables for documents and forms
CREATE TABLE IF NOT EXISTS chunks (
  id SERIAL PRIMARY KEY,
  country TEXT,
  agency TEXT,
  title TEXT,
  url TEXT,
  content TEXT,
  embedding vector(1024)
);

CREATE TABLE IF NOT EXISTS forms (
  id SERIAL PRIMARY KEY,
  country TEXT,
  agency TEXT,
  title TEXT,
  url TEXT,
  content TEXT,
  embedding vector(1024)
);

-- Create similarity search functions (see Database Setup section above)
```

## 📁 Project Structure
```
govly-web/
├── backend/
│   ├── main.py              # FastAPI server & endpoints
│   ├── rag/                 # RAG implementation
│   │   ├── embed_forms.py   # Form embedding with BAAI/bge-m3
│   │   ├── match_forms.py   # Form matching using Supabase
│   │   ├── query.py         # Document chunk querying
│   │   └── pre-embedding.py # Document preprocessing
│   ├── forms/               # PDF documents
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── pages/
│   │   ├── index.tsx        # Main chat interface
│   │   └── status.tsx       # Application tracking
│   ├── components/
│   │   ├── ChatMessage.tsx  # Chat message display
│   │   ├── DynamicForm.tsx  # Dynamic form interface
│   │   └── Sidebar.tsx      # Navigation sidebar
│   └── package.json         # Node.js dependencies
└── README.md                # This file
```

## 🚀 Usage Examples

### Basic Chat
```
User: "I need help with housing assistance"
System: Routes to ragLink, finds housing policies, explains relevance
```

### Form Application
```
User: "I want to apply for housing assistance"
System: Routes to ragForm, finds housing application form, extracts fields
```

### Agency Selection
```
User: "I need help with my business registration"
System: Suggests business agencies, offers connection
```

## 🔒 Security & Privacy

- **Local Storage**: Form data stored locally in browser
- **API Keys**: Secure environment variable storage
- **Data Validation**: Input validation on all endpoints
- **Error Handling**: Comprehensive error handling and logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the code examples

---

**Built with ❤️ for better government services**
