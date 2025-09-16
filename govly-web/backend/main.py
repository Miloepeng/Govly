from fastapi import FastAPI, HTTPException, Depends, Header, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
import os
import sys
import requests
import tempfile
import json
import jwt
from datetime import datetime, timedelta
import shutil

# Add current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# Import your existing RAG functionality
from rag.query import search_chunks, supabase
from rag.match_forms import search_forms
from rag.llamaindex_retriever import search_links_llamaindex, search_forms_llamaindex
from tesseract_extractor import extract_pdf_to_text, clean_ocr_text, send_to_sealion

# Import form data retrieval
from get_form_data import get_form_by_id, get_form_by_filename, search_forms_by_category, get_all_form_categories, get_form_schema_for_filling, get_available_forms_summary

# Import LangChain components from organized structure
from utils.chain_utils import get_chat_chain, get_intent_chain, get_agency_chain, get_agency_detection_chain, get_rag_chain, get_form_chain

print("✅ DEBUG: RAG imports successful")

# Load environment variables
from dotenv import load_dotenv
import os

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # Service role key for backend
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

# Authentication utilities
def verify_supabase_token(authorization: str = Header(None)) -> Optional[Dict[str, Any]]:
    """Verify Supabase JWT token and return user info"""
    if not authorization:
        return None
    
    try:
        # Extract token from "Bearer <token>" format
        token = authorization.replace("Bearer ", "")
        
        # Verify token (you might need to adjust this based on your Supabase setup)
        # For now, we'll do basic validation
        if not token:
            return None
            
        # In a real implementation, you would verify the JWT signature
        # For this demo, we'll assume the token is valid if it exists
        return {"user_id": "demo-user", "email": "demo@example.com"}
        
    except Exception as e:
        print(f"Token verification error: {e}")
        return None

def get_current_user(authorization: str = Header(None)) -> Optional[Dict[str, Any]]:
    """Get current authenticated user"""
    return verify_supabase_token(authorization)

# Try to load .env from multiple possible locations
env_paths = [
    ".env",  # Current directory
    "../.env",  # Parent directory (root of project)
    "../../.env",  # Two levels up
    os.path.join(os.path.dirname(__file__), "../.env"),  # Relative to this file
    os.path.join(os.path.dirname(__file__), "../../.env"),  # Two levels up from this file
]

for env_path in env_paths:
    if load_dotenv(env_path):
        print(f"✅ Loaded environment from: {env_path}")
        break
else:
    print("⚠️  No .env file found in any expected location")

async def should_trigger_rag(message: str, conversation_context: List[Dict[str, Any]], response_type: str, conversation_turns: int, max_turns: int) -> bool:
    """
    Determine if we should trigger RAG or continue with general chat for clarification.
    Returns True if we should use RAG, False if we should continue clarification.
    """
    try:
        # If this is the first turn and the query is very vague, ask for clarification first
        if conversation_turns == 0:
            vague_keywords = ['help', 'information', 'what', 'how', 'need', 'want', 'about', 'question']
            if len(message.split()) <= 3 or any(word in message.lower() for word in vague_keywords):
                return False

        # If we've already hit max turns, force RAG (user might be frustrated)
        if conversation_turns >= max_turns:
            return True

        # Quick LLM check to see if we have enough context for useful RAG
        from simple_llm import send_to_sealion

        # Build conversation summary
        recent_context = ""
        for msg in conversation_context[-6:]:  # Last 6 messages for context
            role = msg.get('role', 'unknown')
            content = msg.get('content', '')
            recent_context += f"{role}: {content}\n"

        prompt = f"""Analyze this conversation to determine if we have enough context to provide useful document/form recommendations.

Current message: "{message}"
Conversation history:
{recent_context}

Do we have enough specific details to recommend relevant government forms or documents? Consider:
- Is the user's goal/need clear?
- Do we know what type of service/document they want?
- Are there still important unknowns that would make document recommendations unhelpful?

Respond with just "YES" if we should search for documents, or "NO" if we need more clarification first."""

        llm_response = send_to_sealion(prompt, max_tokens=10, temperature=0.1)
        should_use = "yes" in llm_response.lower().strip()

        print(f"DEBUG: RAG confidence check - Response: {llm_response.strip()}, Should use RAG: {should_use}")
        return should_use

    except Exception as e:
        print(f"DEBUG: Error in should_trigger_rag: {e}")
        # Fallback: If it's a form/link request and we have some context, use RAG
        return response_type in ["ragLink", "ragForm"] and conversation_turns >= 2

from fastapi.staticfiles import StaticFiles
app = FastAPI(title="Govly API", version="1.0.0")

# Serve static forms directory
forms_dir = os.path.join(current_dir, "forms")  # adjust if forms are in ../forms
if os.path.exists(forms_dir):
    app.mount("/forms", StaticFiles(directory=forms_dir), name="forms")

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "http://localhost:80",    # Local Nginx
        "http://127.0.0.1:3000",  # Local development alternative
        "http://127.0.0.1:80",    # Local Nginx alternative
        # Add your EC2 public IP and domain here
        # "http://YOUR_EC2_PUBLIC_IP",
        # "https://YOUR_DOMAIN.com",
        "*"  # Allow all origins for now (remove in production)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add exception handler for validation errors
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    print(f"🚨 VALIDATION ERROR: {exc}")
    print(f"📋 Request URL: {request.url}")
    body = await request.body()
    print(f"📄 Request body: {body}")
    print(f"💥 Validation details: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": f"Validation error: {exc.errors()}"}
    )

# Health check endpoint for Docker
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Govly Backend API"}

# PDF serving endpoint for document viewer
@app.get("/api/pdf/{filename}")
async def serve_pdf(filename: str):
    """Serve PDF files from the forms directory"""
    try:
        pdf_path = os.path.join(current_dir, "forms", filename)

        if not os.path.exists(pdf_path):
            raise HTTPException(status_code=404, detail="PDF file not found")

        # Verify it's a PDF file
        if not filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="File is not a PDF")

        return FileResponse(
            pdf_path,
            media_type='application/pdf',
            filename=filename
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error serving PDF: {str(e)}")

# File upload endpoint for scan functionality
@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Handle file uploads for scan functionality"""
    try:
        # Validate file type and extension
        allowed_types = {
            'application/pdf': '.pdf',
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png'
        }
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="File type not supported. Please upload PDF or image files (JPEG, PNG).")
            
        # Ensure file has correct extension
        file_ext = os.path.splitext(file.filename)[1].lower()
        expected_ext = allowed_types[file.content_type]
        if file_ext not in ['.pdf', '.jpg', '.jpeg', '.png']:
            raise HTTPException(status_code=400, detail=f"Invalid file extension. Expected {expected_ext} for {file.content_type}")

        # Validate file size (10MB limit)
        file_size = 0
        file_content = await file.read()
        file_size = len(file_content)

        if file_size > 10 * 1024 * 1024:  # 10MB
            raise HTTPException(status_code=400, detail="File size exceeds 10MB limit.")

        # Save file to the forms directory
        forms_dir = os.path.join(current_dir, "forms")
        os.makedirs(forms_dir, exist_ok=True)

        # Generate unique filename to avoid conflicts
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{int(datetime.now().timestamp())}_{file.filename}"
        file_path = os.path.join(forms_dir, unique_filename)

        # Write file to disk
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)

        # Return the file URL/path for further processing
        return {
            "success": True,
            "filename": unique_filename,
            "url": unique_filename,  # This will be used by extractFormPreprocessed
            "size": file_size,
            "content_type": file.content_type
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# ---------------- Models ----------------
from typing import Optional

class DocumentRequest(BaseModel):
    title: str
    storage_bucket: str = "documents"
    storage_path: str
    mime_type: str = "application/pdf"
    size_bytes: Optional[int] = None

class DocumentResponse(BaseModel):
    id: str
    title: str
    storage_bucket: str
    storage_path: str
    public_url: Optional[str]
    mime_type: str
    size_bytes: Optional[int]
    created_at: str
    updated_at: str

class ChatRequest(BaseModel):
    message: str
    conversationContext: list = []
    country: str = "Vietnam"
    language: str = "Vietnamese"
    settings: dict = {}
    selectedAgency: Optional[str] = None  # Current agency context, can be None

class RAGRequest(BaseModel):
    query: str
    country: str = "Vietnam"
    language: str = "Vietnamese"
    category: Optional[str] = None

class FormRequest(BaseModel):
    query: str
    country: str = "Vietnam"
    language: str = "Vietnamese"

class ExtractFormRequest(BaseModel):
    url: str

class ExtractFormByIdRequest(BaseModel):
    form_id: int

class AgencyDetectionRequest(BaseModel):
    query: str
    country: str
    conversationContext: list = []

class DocumentChatRequest(BaseModel):
    message: str
    documentId: str
    documentTitle: str
    documentContent: str
    documentType: str = "pdf"
    conversationContext: List[Dict[str, Any]] = []
    queryType: Optional[str] = "auto"  # auto, summary, search, explain, compare, steps

class DocumentSummaryRequest(BaseModel):
    documentId: str
    documentTitle: str
    documentContent: str
    documentType: str = "pdf"
    summaryType: str = "overview"  # overview, key-points, requirements

class DocumentSearchRequest(BaseModel):
    query: str
    documentId: str
    documentTitle: str
    documentContent: str
    documentType: str = "pdf"

class DocumentExplainRequest(BaseModel):
    concept: str
    documentId: str
    documentTitle: str
    documentContent: str
    documentType: str = "pdf"
    detailLevel: str = "medium"  # brief, medium, detailed

# ---------------- Main Chatbot Specialized Requests ----------------

class QuickAnswerRequest(BaseModel):
    question: str
    context: Optional[str] = ""
    conversationHistory: List[Dict[str, Any]] = []

class StepGuideRequest(BaseModel):
    task: str
    userContext: Optional[str] = ""  # User's situation/constraints
    detailLevel: str = "standard"  # brief, standard, detailed
    conversationHistory: List[Dict[str, Any]] = []

class ComparisonRequest(BaseModel):
    options: List[str]  # Things to compare
    criteria: Optional[str] = ""  # What to compare on
    userNeeds: Optional[str] = ""  # User's specific requirements
    conversationHistory: List[Dict[str, Any]] = []

class ProblemSolverRequest(BaseModel):
    problem: str
    context: Optional[str] = ""  # Additional context about the situation
    urgency: str = "medium"  # low, medium, high
    conversationHistory: List[Dict[str, Any]] = []

class CreativeAssistRequest(BaseModel):
    prompt: str
    domain: Optional[str] = ""  # business, marketing, personal, etc.
    constraints: Optional[str] = ""  # Any limitations or requirements
    ideaCount: int = 5  # Number of ideas to generate
    conversationHistory: List[Dict[str, Any]] = []

class WebsiteRenderRequest(BaseModel):
    url: str
    scrollToSection: Optional[str] = None
    highlightTerms: Optional[List[str]] = []
    viewportWidth: int = 1280
    viewportHeight: int = 800

# ---------------- Helper Functions for Smart AI ----------------

def classify_query_type(message: str) -> str:
    """Classify the user's query to determine appropriate response style"""
    message_lower = message.lower()

    # Summary queries
    if any(word in message_lower for word in ['summarize', 'overview', 'summary', 'what is this', 'explain this document']):
        return 'summary'

    # Search queries
    if any(word in message_lower for word in ['find', 'where', 'search', 'locate', 'show me']):
        return 'search'

    # Explanation queries
    if any(word in message_lower for word in ['explain', 'how does', 'what does', 'clarify', 'break down']):
        return 'explain'

    # Step/process queries
    if any(word in message_lower for word in ['steps', 'process', 'how to', 'procedure', 'guide']):
        return 'steps'

    # Comparison queries
    if any(word in message_lower for word in ['compare', 'difference', 'vs', 'versus', 'contrast']):
        return 'compare'

    # Default to general chat
    return 'general'

def get_smart_token_limit(query_type: str, message_length: int) -> int:
    """Determine appropriate response length based on query type and complexity"""
    base_limits = {
        'summary': 300,
        'search': 200,
        'explain': 500,
        'steps': 400,
        'compare': 350,
        'general': 300
    }

    # Adjust based on message length (longer questions get longer answers)
    if message_length > 100:
        return min(base_limits[query_type] + 200, 800)
    elif message_length < 20:
        return max(base_limits[query_type] - 100, 150)

    return base_limits[query_type]

def create_smart_prompt(request, query_type: str, token_limit: int) -> str:
    """Create context-aware prompts based on query type"""

    # Base context
    base_context = f"""You are an AI assistant helping users understand documents.

DOCUMENT: {request.documentTitle} ({request.documentType})
CONTENT: {request.documentContent[:2500]}

CONVERSATION HISTORY:
{get_conversation_context(request.conversationContext)}

USER QUESTION: {request.message}"""

    # Query-specific instructions
    type_instructions = {
        'summary': """Provide a CONCISE summary focusing on:
1. Main purpose of the document
2. Key requirements or information
3. Important deadlines or fees
Keep it brief and scannable.""",

        'search': """Find and extract the SPECIFIC information requested.
Quote exactly from the document and indicate the section.
Be precise and direct.""",

        'explain': """Provide a CLEAR explanation that:
1. Defines the concept in simple terms
2. Explains its relevance to the document
3. Gives practical implications
Use examples when helpful.""",

        'steps': """Provide a STEP-BY-STEP guide:
1. List actions in chronological order
2. Include requirements for each step
3. Mention timeframes and costs
Format as numbered steps.""",

        'compare': """Make a CLEAR comparison:
1. Identify key differences
2. Highlight pros/cons
3. Recommend best option if applicable
Use a structured format.""",

        'general': """Provide a helpful response that directly answers the question.
Be conversational but informative."""
    }

    # Response length guidance
    length_guidance = f"""
RESPONSE LENGTH: Aim for {token_limit//4}-{token_limit//3} words. {"Be concise and direct." if token_limit < 300 else "Provide thorough details." if token_limit > 500 else "Balance detail with brevity."}"""

    return f"""{base_context}

{type_instructions.get(query_type, type_instructions['general'])}

{length_guidance}

SECTION REFERENCES: End with "REFERENCED_SECTIONS: [exact quotes from document]" for auto-scroll."""

def get_conversation_context(context_list: List[Dict[str, Any]]) -> str:
    """Format conversation history for prompt"""
    if not context_list:
        return "No previous conversation."

    formatted = []
    for msg in context_list[-3:]:  # Last 3 messages for context
        role = msg.get("role", "").title()
        content = msg.get("content", "")[:200]  # Truncate long messages
        formatted.append(f"{role}: {content}")

    return "\n".join(formatted)

def classify_main_chat_query(message: str) -> str:
    """Classify general chat queries for appropriate endpoint routing"""
    message_lower = message.lower()

    # Quick answer patterns
    if any(pattern in message_lower for pattern in [
        'what is', 'what are', 'define', 'meaning of', 'who is', 'when is', 'where is',
        'how much', 'how many', 'quick question', 'simply put'
    ]):
        return 'quick'

    # Step guide patterns
    if any(pattern in message_lower for pattern in [
        'how to', 'how do i', 'steps to', 'procedure', 'guide me', 'walk me through',
        'process of', 'instructions', 'tutorial'
    ]):
        return 'steps'

    # Comparison patterns
    if any(pattern in message_lower for pattern in [
        'compare', 'vs', 'versus', 'difference between', 'which is better',
        'pros and cons', 'advantages', 'disadvantages', 'options'
    ]):
        return 'compare'

    # Problem solving patterns
    if any(pattern in message_lower for pattern in [
        'problem', 'issue', 'error', 'not working', 'help with', 'stuck',
        'troubleshoot', 'fix', 'solve', 'resolve'
    ]):
        return 'solve'

    # Creative patterns
    if any(pattern in message_lower for pattern in [
        'ideas for', 'brainstorm', 'creative', 'suggest', 'think of',
        'come up with', 'innovative', 'alternatives'
    ]):
        return 'creative'

    # Default to general conversation
    return 'general'

def format_chat_history(history: List[Dict[str, Any]]) -> str:
    """Format conversation history for main chat prompts"""
    if not history:
        return ""

    formatted = []
    for msg in history[-4:]:  # Last 4 messages
        role = msg.get("role", "").title()
        content = msg.get("content", "")[:150]  # Truncate
        formatted.append(f"{role}: {content}")

    return "\n".join(formatted)

# ---------------- Document-Aware Chat endpoint ----------------
@app.post("/api/documentChat")
async def document_chat(request: DocumentChatRequest):
    """Smart AI chat endpoint with adaptive response length and query classification"""
    try:
        print(f"📖 Document chat request for: {request.documentTitle}")

        # Get SEA-LION API key
        api_key = os.getenv("SEA_LION_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="SEA-LION API key not configured")

        # Classify query type if not specified
        query_type = request.queryType
        if query_type == "auto":
            query_type = classify_query_type(request.message)

        # Determine smart token limit
        message_length = len(request.message)
        token_limit = get_smart_token_limit(query_type, message_length)

        print(f"🤖 Query classified as: {query_type}, Token limit: {token_limit}")

        # Initialize the LLM with dynamic parameters
        from simple_llm import SimpleSeaLionLLM
        llm = SimpleSeaLionLLM(
            api_key=api_key,
            model="aisingapore/Llama-SEA-LION-v3-70B-IT",
            temperature=0.2 if query_type in ['search', 'summary'] else 0.4,  # Lower temp for factual queries
            max_tokens=token_limit
        )

        # Create smart prompt based on query type
        prompt = create_smart_prompt(request, query_type, token_limit)

        # Get AI response
        response = llm._call(prompt)

        # Parse out referenced sections for auto-scrolling
        referenced_sections = []
        if "REFERENCED_SECTIONS" in response:
            sections_part = response.split("REFERENCED_SECTIONS")[-1]
            # Clean response to remove the referenced sections part
            clean_response = response.split("REFERENCED_SECTIONS")[0].strip()

            # Extract section references
            import re
            section_matches = re.findall(r'"([^"]+)"', sections_part)
            referenced_sections = section_matches[:3]  # Limit to 3 sections
        else:
            clean_response = response

        return {
            "response": clean_response,
            "referencedSections": referenced_sections,
            "documentId": request.documentId,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        print(f"💥 Document chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------- Specialized Document AI Endpoints ----------------

@app.post("/api/documentSummary")
async def document_summary(request: DocumentSummaryRequest):
    """Quick document summaries with different focus types"""
    try:
        print(f"📋 Summary request for: {request.documentTitle} ({request.summaryType})")

        api_key = os.getenv("SEA_LION_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="SEA-LION API key not configured")

        from simple_llm import SimpleSeaLionLLM
        llm = SimpleSeaLionLLM(
            api_key=api_key,
            model="aisingapore/Llama-SEA-LION-v3-70B-IT",
            temperature=0.2,
            max_tokens=250  # Concise summaries
        )

        summary_prompts = {
            'overview': f"""Provide a 3-sentence overview of this document:

DOCUMENT: {request.documentTitle}
CONTENT: {request.documentContent[:2000]}

Focus on: (1) What this document is, (2) Who needs it, (3) Main requirements or purpose.
Be extremely concise.""",

            'key-points': f"""Extract 4-5 key bullet points from this document:

DOCUMENT: {request.documentTitle}
CONTENT: {request.documentContent[:2000]}

Format as bullet points. Focus on the most important information someone needs to know.""",

            'requirements': f"""List the main requirements from this document:

DOCUMENT: {request.documentTitle}
CONTENT: {request.documentContent[:2000]}

Focus only on what users need to provide, do, or meet. Be specific with numbers, timeframes, and fees."""
        }

        prompt = summary_prompts.get(request.summaryType, summary_prompts['overview'])
        response = llm._call(prompt)

        return {
            "summary": response,
            "summaryType": request.summaryType,
            "documentId": request.documentId,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        print(f"💥 Summary error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/documentSearch")
async def document_search(request: DocumentSearchRequest):
    """Precise information lookup within documents"""
    try:
        print(f"🔍 Search request: '{request.query}' in {request.documentTitle}")

        api_key = os.getenv("SEA_LION_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="SEA-LION API key not configured")

        from simple_llm import SimpleSeaLionLLM
        llm = SimpleSeaLionLLM(
            api_key=api_key,
            model="aisingapore/Llama-SEA-LION-v3-70B-IT",
            temperature=0.1,  # Very precise for search
            max_tokens=200
        )

        prompt = f"""Find specific information in this document:

DOCUMENT: {request.documentTitle}
CONTENT: {request.documentContent[:2500]}

SEARCH QUERY: {request.query}

Instructions:
1. Quote the exact text that answers the query
2. Indicate which section it's from
3. If not found, say "Information not found in this document"
4. Be precise and direct

REFERENCED_SECTIONS: [exact headings where info was found]"""

        response = llm._call(prompt)

        # Parse referenced sections
        referenced_sections = []
        if "REFERENCED_SECTIONS" in response:
            sections_part = response.split("REFERENCED_SECTIONS")[-1]
            clean_response = response.split("REFERENCED_SECTIONS")[0].strip()

            import re
            section_matches = re.findall(r'"([^"]+)"', sections_part)
            referenced_sections = section_matches[:2]
        else:
            clean_response = response

        return {
            "result": clean_response,
            "query": request.query,
            "referencedSections": referenced_sections,
            "documentId": request.documentId,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        print(f"💥 Search error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/documentExplain")
async def document_explain(request: DocumentExplainRequest):
    """Detailed explanations of concepts found in documents"""
    try:
        print(f"💡 Explain request: '{request.concept}' in {request.documentTitle}")

        api_key = os.getenv("SEA_LION_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="SEA-LION API key not configured")

        token_limits = {'brief': 200, 'medium': 400, 'detailed': 600}
        token_limit = token_limits.get(request.detailLevel, 400)

        from simple_llm import SimpleSeaLionLLM
        llm = SimpleSeaLionLLM(
            api_key=api_key,
            model="aisingapore/Llama-SEA-LION-v3-70B-IT",
            temperature=0.3,
            max_tokens=token_limit
        )

        detail_instructions = {
            'brief': "Explain in 2-3 sentences. Be concise.",
            'medium': "Provide a clear explanation with practical examples.",
            'detailed': "Give a comprehensive explanation with context, examples, and implications."
        }

        prompt = f"""Explain this concept from the document:

DOCUMENT: {request.documentTitle}
CONTENT: {request.documentContent[:2500]}

CONCEPT TO EXPLAIN: {request.concept}

{detail_instructions.get(request.detailLevel, detail_instructions['medium'])}

Structure:
1. What it means in simple terms
2. How it applies in this document context
3. Practical implications for users

REFERENCED_SECTIONS: [relevant document sections]"""

        response = llm._call(prompt)

        # Parse referenced sections
        referenced_sections = []
        if "REFERENCED_SECTIONS" in response:
            sections_part = response.split("REFERENCED_SECTIONS")[-1]
            clean_response = response.split("REFERENCED_SECTIONS")[0].strip()

            import re
            section_matches = re.findall(r'"([^"]+)"', sections_part)
            referenced_sections = section_matches[:3]
        else:
            clean_response = response

        return {
            "explanation": clean_response,
            "concept": request.concept,
            "detailLevel": request.detailLevel,
            "referencedSections": referenced_sections,
            "documentId": request.documentId,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        print(f"💥 Explain error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------- Specialized Main Chatbot Endpoints ----------------

@app.post("/api/quickAnswer")
async def quick_answer(request: QuickAnswerRequest):
    """Direct, concise answers for factual questions"""
    try:
        print(f"⚡ Quick answer request: {request.question[:50]}...")

        api_key = os.getenv("SEA_LION_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="SEA-LION API key not configured")

        from simple_llm import SimpleSeaLionLLM
        llm = SimpleSeaLionLLM(
            api_key=api_key,
            model="aisingapore/Llama-SEA-LION-v3-70B-IT",
            temperature=0.1,  # Very factual
            max_tokens=150   # Keep it short
        )

        history = format_chat_history(request.conversationHistory)
        context_part = f"\nContext: {request.context}" if request.context else ""

        prompt = f"""You are a government services assistant helping citizens with quick, factual answers about policies, laws, forms, and procedures.

CONVERSATION HISTORY:
{history}

CITIZEN QUESTION: {request.question}{context_part}

Instructions:
1. Provide direct, official information
2. Use 1-3 sentences maximum
3. Focus on government policies, laws, or procedures
4. Mention relevant authorities or departments when applicable
5. If unsure about specific regulations, advise consulting official sources

Answer:"""

        response = llm._call(prompt)

        return {
            "answer": response.strip(),
            "responseType": "quick",
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        print(f"💥 Quick answer error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/stepGuide")
async def step_guide(request: StepGuideRequest):
    """Step-by-step procedural guidance"""
    try:
        print(f"📋 Step guide request: {request.task[:50]}...")

        api_key = os.getenv("SEA_LION_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="SEA-LION API key not configured")

        token_limits = {'brief': 300, 'standard': 500, 'detailed': 700}
        token_limit = token_limits.get(request.detailLevel, 500)

        from simple_llm import SimpleSeaLionLLM
        llm = SimpleSeaLionLLM(
            api_key=api_key,
            model="aisingapore/Llama-SEA-LION-v3-70B-IT",
            temperature=0.3,
            max_tokens=token_limit
        )

        history = format_chat_history(request.conversationHistory)
        context_part = f"\nUser Context: {request.userContext}" if request.userContext else ""

        detail_instructions = {
            'brief': "Provide 3-5 key steps. Be concise.",
            'standard': "Provide detailed steps with explanations.",
            'detailed': "Provide comprehensive steps with tips, warnings, and alternatives."
        }

        prompt = f"""You are a government services assistant helping citizens navigate government procedures, applications, and compliance requirements.

CONVERSATION HISTORY:
{history}

GOVERNMENT TASK/PROCEDURE: {request.task}{context_part}

{detail_instructions.get(request.detailLevel, detail_instructions['standard'])}

Provide government-focused guidance:
1. [Action] - [Requirements, documents needed, or authorities involved]
2. [Action] - [Timeframes, fees, or important compliance notes]

Include:
- Required documents and forms
- Processing times and fees
- Relevant government departments/agencies
- Legal requirements or deadlines
- Contact information where helpful

Steps:"""

        response = llm._call(prompt)

        return {
            "guide": response.strip(),
            "task": request.task,
            "detailLevel": request.detailLevel,
            "responseType": "steps",
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        print(f"💥 Step guide error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/comparison")
async def comparison(request: ComparisonRequest):
    """Structured comparison and analysis"""
    try:
        print(f"⚖️ Comparison request: {len(request.options)} options")

        api_key = os.getenv("SEA_LION_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="SEA-LION API key not configured")

        from simple_llm import SimpleSeaLionLLM
        llm = SimpleSeaLionLLM(
            api_key=api_key,
            model="aisingapore/Llama-SEA-LION-v3-70B-IT",
            temperature=0.3,
            max_tokens=600
        )

        history = format_chat_history(request.conversationHistory)
        criteria_part = f"\nComparison Criteria: {request.criteria}" if request.criteria else ""
        needs_part = f"\nUser Needs: {request.userNeeds}" if request.userNeeds else ""

        prompt = f"""You are a government services assistant helping citizens compare government policies, programs, visa types, permits, or legal options.

CONVERSATION HISTORY:
{history}

GOVERNMENT OPTIONS TO COMPARE: {', '.join(request.options)}{criteria_part}{needs_part}

Structure your government-focused comparison:
1. **Overview** - What each option provides and who it serves
2. **Requirements** - Eligibility criteria, documents, and qualifications for each
3. **Costs & Timeline** - Fees, processing times, and validity periods
4. **Benefits & Limitations** - Rights, restrictions, and practical implications
5. **Recommendation** - Best fit based on citizen needs and circumstances

Focus on official regulations, legal implications, and practical government processes.

Comparison:"""

        response = llm._call(prompt)

        return {
            "comparison": response.strip(),
            "options": request.options,
            "criteria": request.criteria,
            "responseType": "compare",
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        print(f"💥 Comparison error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/problemSolver")
async def problem_solver(request: ProblemSolverRequest):
    """Troubleshooting and solution-finding"""
    try:
        print(f"🔧 Problem solver request: {request.problem[:50]}...")

        api_key = os.getenv("SEA_LION_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="SEA-LION API key not configured")

        # Urgency affects response length and detail
        token_limits = {'low': 400, 'medium': 500, 'high': 300}  # High urgency = shorter, more direct
        token_limit = token_limits.get(request.urgency, 500)

        from simple_llm import SimpleSeaLionLLM
        llm = SimpleSeaLionLLM(
            api_key=api_key,
            model="aisingapore/Llama-SEA-LION-v3-70B-IT",
            temperature=0.2,  # More focused for problem-solving
            max_tokens=token_limit
        )

        history = format_chat_history(request.conversationHistory)
        context_part = f"\nAdditional Context: {request.context}" if request.context else ""

        urgency_instructions = {
            'low': "Provide thorough analysis with multiple approaches.",
            'medium': "Provide practical solutions with clear priorities.",
            'high': "Focus on immediate, actionable solutions first."
        }

        prompt = f"""You are a government services assistant helping citizens resolve issues with applications, permits, compliance, legal matters, or government procedures.

CONVERSATION HISTORY:
{history}

GOVERNMENT-RELATED PROBLEM: {request.problem}{context_part}
URGENCY: {request.urgency}

{urgency_instructions.get(request.urgency, urgency_instructions['medium'])}

Structure your government-focused solution:
1. **Immediate Actions** - What to do right now (contact agencies, gather documents)
2. **Official Channels** - Which government departments/offices can help
3. **Required Steps** - Formal procedures to resolve the issue
4. **Legal Considerations** - Rights, appeals, or compliance requirements
5. **Prevention** - How to avoid similar issues with future government processes

Focus on official procedures, legal remedies, and government resources.

Solution:"""

        response = llm._call(prompt)

        return {
            "solution": response.strip(),
            "problem": request.problem,
            "urgency": request.urgency,
            "responseType": "solve",
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        print(f"💥 Problem solver error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/creativeAssist")
async def creative_assist(request: CreativeAssistRequest):
    """Creative brainstorming and ideation"""
    try:
        print(f"💡 Creative assist request: {request.prompt[:50]}...")

        api_key = os.getenv("SEA_LION_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="SEA-LION API key not configured")

        from simple_llm import SimpleSeaLionLLM
        llm = SimpleSeaLionLLM(
            api_key=api_key,
            model="aisingapore/Llama-SEA-LION-v3-70B-IT",
            temperature=0.8,  # High creativity
            max_tokens=600
        )

        history = format_chat_history(request.conversationHistory)
        domain_part = f"\nDomain/Field: {request.domain}" if request.domain else ""
        constraints_part = f"\nConstraints: {request.constraints}" if request.constraints else ""

        prompt = f"""You are a government policy and services innovation assistant helping suggest creative but practical solutions for government processes, citizen engagement, or policy improvements.

CONVERSATION HISTORY:
{history}

GOVERNMENT CHALLENGE/REQUEST: {request.prompt}{domain_part}{constraints_part}

Generate {request.ideaCount} innovative government-focused ideas:

1. **[Solution Name]** - [How it improves government services or citizen experience]
2. **[Solution Name]** - [Policy benefits and implementation feasibility]
[Continue for all ideas]

Then pick your **top recommendation** considering:
- Public benefit and accessibility
- Government resource requirements
- Legal and regulatory feasibility
- Citizen satisfaction impact

Focus on solutions that enhance government transparency, efficiency, citizen services, or policy effectiveness.

Ideas:"""

        response = llm._call(prompt)

        return {
            "ideas": response.strip(),
            "prompt": request.prompt,
            "domain": request.domain,
            "ideaCount": request.ideaCount,
            "responseType": "creative",
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        print(f"💥 Creative assist error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------- Chat endpoint (LangChain version) ----------------
@app.post("/api/chat")
async def chat(request: ChatRequest, current_user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    try:
        # Optional: Log user activity
        if current_user:
            print(f"Chat request from user: {current_user.get('email', 'unknown')}")
        else:
            print("Chat request from anonymous user")
        # Get singleton LangChain chat handler instance
        chat_chain = get_chat_chain()
        
        print(f"DEBUG: General chat - country: {request.country}, language: {request.language}")
        print(f"DEBUG: Selected agency: {request.selectedAgency}")
        
        # Process chat through LangChain pipeline (prompt -> llm -> parser)
        result = chat_chain.chat(
            message=request.message,
            country=request.country,
            language=request.language,
            selected_agency=request.selectedAgency,
            conversation_context=request.conversationContext,
            settings=request.settings
        )
        
        # Return only the response text (follow_up_questions handled by frontend)
        return {"response": result["response"]}
        
    except Exception as e:
        print(f"💥 Exception in chat: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------- Smart Chat Routing endpoint ----------------
@app.post("/api/smartChat")
async def smart_chat(request: ChatRequest):
    print(f"🚀 SmartChat endpoint hit!")
    print(f"📥 Raw request received")
    try:
        print(f"🔍 Validating request...")
        print(f"📝 Message: {getattr(request, 'message', 'NOT FOUND')}")
        print(f"🌍 Country: {getattr(request, 'country', 'NOT FOUND')}")
        print(f"⚙️ Settings: {getattr(request, 'settings', 'NOT FOUND')}")
        
        # Validate required fields
        if not request.message:
            print(f"❌ Validation failed: Message is empty")
            raise HTTPException(status_code=422, detail="Message is required")
        
        # Smart routing: Determine response type based on message content and context
        response_type = request.settings.get("responseType", "smart")  # Default to smart
        rag_results = request.settings.get("ragResults", [])
        form_results = request.settings.get("formResults", [])
        country = request.country
        language = request.language
        selected_agency = request.selectedAgency
        
        print(f"\n🎯 DEBUG: ===== SMARTCHAT REQUEST RECEIVED =====")
        print(f"📝 Message: {request.message}")
        print(f"🌍 Country: {country}, Language: {language}")
        print(f"🔄 Response type: {response_type}")
        print(f"🏢 Selected agency: {selected_agency}")
        print(f"⚙️ Settings: {request.settings}")
        print(f"📚 RAG Results: {rag_results}")
        print(f"📋 Form Results: {form_results}")
        print(f"🔍 Request received at: /api/smartChat")
        
        # No hardcoded mappings - let LLM handle everything
        user_country = request.country
        
        # Count conversation turns to understand how much context we have
        conversation_turns = len([msg for msg in request.conversationContext if msg.get('role') == 'user'])
        max_clarification_turns = 5

        print(f"DEBUG: Conversation turns: {conversation_turns}")

        # LLM-based intent detection for routing
        detected_category, needs_agency, suggested_agencies, llm_response_type = await detect_intent_with_llm(request.message, country, language)

        # Analyze conversation context to determine if we have enough information for RAG
        should_use_rag = await should_trigger_rag(request.message, request.conversationContext, llm_response_type, conversation_turns, max_clarification_turns)

        print(f"DEBUG: Should use RAG: {should_use_rag}")
        print(f"DEBUG: LLM Response type: {llm_response_type}")

        # If we don't have enough context and haven't exceeded max turns, use general chat for clarification
        if not should_use_rag and conversation_turns < max_clarification_turns and llm_response_type in ["ragLink", "ragForm"]:
            print(f"DEBUG: Using general chat for clarification (turn {conversation_turns + 1}/{max_clarification_turns})")
            response_type = "chat"  # Force general chat for clarification
        else:
            # Use LLM's response_type for routing
            response_type = llm_response_type

        # Determine if we should offer agency choice
        should_offer_agency = (
            needs_agency and
            not selected_agency and
            response_type == "agency"
        )

        # Debug prints for smart routing
        print(f"DEBUG: Message: {request.message}")
        print(f"DEBUG: LLM Detected category: {detected_category}")
        print(f"DEBUG: LLM Needs agency: {needs_agency}")
        print(f"DEBUG: Final response type: {response_type}")
        print(f"DEBUG: Should offer agency: {should_offer_agency}")
        print(f"DEBUG: LLM Suggested agencies: {suggested_agencies}")
        
        # Route to appropriate endpoint based on LLM response type
        print(f"DEBUG: Routing decision:")
        print(f"DEBUG: - LLM response_type: {llm_response_type}")
        print(f"DEBUG: - should_offer_agency: {should_offer_agency}")
        
        if response_type == "ragLink":
            print(f"DEBUG: Routing to: RAG Link Search")
            # Route to RAG link search and create proper response structure
            # Thread category from settings if provided
            rag_response = await rag_link_search(RAGRequest(query=request.message, category=request.settings.get("category")))
            if rag_response.get('results'):
                # Get explanation for the documents
                explain_response = await explain_documents(ExplainRequest(
                    user_query=request.message,
                    documents=rag_response.get('results', [])[:3],  # Top 3 documents
                    document_type="ragLink",
                    country=country,
                    language=language
                ))
                return {
                    "response": explain_response["explanation"],
                    "response_type": "ragLink",
                    "results": rag_response.get('results', []),
                    "category": detected_category,
                    "needs_agency": needs_agency,
                    "suggested_agencies": suggested_agencies
                }
            else:
                return {
                    "response": f"I couldn't find any relevant policy documents for your query about '{request.message}'. Please try rephrasing your question.",
                    "response_type": "ragLink",
                    "results": [],
                    "category": detected_category,
                    "needs_agency": needs_agency,
                    "suggested_agencies": suggested_agencies
                }
            
        elif response_type == "ragForm":
            print(f"DEBUG: Routing to: RAG Form Search")
            # Route to RAG form search and create proper response structure
            form_response = await rag_form_search(FormRequest(query=request.message))
            if form_response.get('results'):
                # Get explanation for the forms
                explain_response = await explain_documents(ExplainRequest(
                    user_query=request.message,
                    documents=form_response.get('results', [])[:3],  # Top 3 forms
                    document_type="ragForm",
                    country=country,
                    language=language
                ))
                return {
                    "response": explain_response["explanation"],
                    "response_type": "ragForm",
                    "results": form_response.get('results', []),
                    "category": detected_category,
                    "needs_agency": needs_agency,
                    "suggested_agencies": suggested_agencies
                }
            else:
                return {
                    "response": f"I couldn't find any relevant forms for your query about '{request.message}'. Please try rephrasing your question.",
                    "response_type": "ragForm",
                    "results": [],
                    "category": detected_category,
                    "needs_agency": needs_agency,
                    "suggested_agencies": suggested_agencies
                }
            
        elif response_type == "agency" and should_offer_agency:
            print(f"DEBUG: Routing to: Choose Agency")
            # Route to agency choice
            return await choose_agency(request, detected_category, suggested_agencies)
            
        elif response_type == "general":
            print(f"DEBUG: Routing to: General Chat")
            # Route to general chat
            return await chat(request, current_user=None)

        elif response_type == "chat":
            print(f"DEBUG: Routing to: General Chat for clarification")
            # Route to general chat for clarification
            return await chat(request, current_user=None)

        else:
            print(f"DEBUG: Unknown response type: {response_type}, routing to General Chat")
            # Route to general chat as fallback
            return await chat(request, current_user=None)
        
        print(f"DEBUG: ===== SMARTCHAT END =====")
            
    except HTTPException as e:
        print(f"❌ HTTP Exception in SmartChat: {e.status_code} - {e.detail}")
        raise e
    except Exception as e:
        print(f"💥 Unexpected error in SmartChat: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------- LLM Intent Detection (LangChain version) ----------------
async def detect_intent_with_llm(message: str, country: str, language: str) -> tuple[str, bool, list, str]:
    """Use LangChain to detect user intent and determine routing needs"""
    print(f"DEBUG: ===== LLM INTENT DETECTION START =====")
    print(f"DEBUG: Analyzing message: {message}")
    print(f"DEBUG: Country: {country}, Language: {language}")
    
    try:
        # Get LangChain intent detection handler
        intent_chain = get_intent_chain()
        
        # Process intent detection through LangChain pipeline
        result = intent_chain.detect_intent(message, country, language)
        
        category, needs_agency, suggested_agencies, response_type = result
        
        print(f"DEBUG: LLM Intent Detection - Category: {category}, Needs Agency: {needs_agency}")
        print(f"DEBUG: LLM Suggested Agencies: {suggested_agencies}")
        print(f"DEBUG: LLM Response Type: {response_type}")
        print(f"DEBUG: LLM Intent Detection SUCCESS")
        print(f"DEBUG: ===== LLM INTENT DETECTION END =====")
        
        return result
        
    except Exception as e:
        print(f"DEBUG: Intent detection error: {str(e)}")
        print(f"DEBUG: ===== LLM INTENT DETECTION END (ERROR) =====")
        return None, False, [], "general"


# ---------------- Choose Agency endpoint (LangChain version) ----------------
async def choose_agency(request: ChatRequest, detected_category: str, suggested_agencies: list):
    """Handle agency choice routing using LangChain"""
    try:
        # Get LangChain agency selection handler
        agency_chain = get_agency_chain()
        
        print(f"DEBUG: Agency selection - category: {detected_category}, agencies: {suggested_agencies}")
        
        # Process agency selection through LangChain pipeline
        result = agency_chain.select_agency(
            message=request.message,
            country=request.country,
            language=request.language,
            category=detected_category,
            suggested_agencies=suggested_agencies,
            conversation_context=request.conversationContext,
            settings=request.settings
        )
        
        # Add agency detection info to help frontend
        response_payload = {
            "response": result["response"],
            "agency_detection": {
                "needs_agency": True,
                "should_offer_agency": True,
                "suggested_agency": result["suggested_agency"],
                "available_agencies": result["available_agencies"],
                "category": result["category"]
            }
        }
        
        return response_payload
        
    except Exception as e:
        print(f"💥 Exception in choose_agency: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------- RAG Link search endpoint ----------------
@app.post("/api/ragLink")
async def rag_link_search(request: RAGRequest):
    try:
        # Prefer LlamaIndex when enabled; module falls back automatically
        results = search_links_llamaindex(request.query, top_k=3, country=request.country, category=request.category)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------- Agency Detection endpoint (LangChain version) ----------------
@app.post("/api/detectAgency")
async def detect_agency(request: AgencyDetectionRequest):
    try:
        # Get LangChain agency detection handler
        agency_detection_chain = get_agency_detection_chain()
        
        print(f"DEBUG: Agency detection - query: {request.query}, country: {request.country}")
        
        # Process agency detection through LangChain pipeline
        result = agency_detection_chain.detect_agency(
            query=request.query,
            country=request.country,
            conversation_context=request.conversationContext
        )
        
        return result
        
    except Exception as e:
        print(f"💥 Exception in detect_agency: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ---------------- RAG Form search endpoint ----------------
@app.post("/api/ragForm")
async def rag_form_search(request: FormRequest):
    try:
        # Prefer LlamaIndex when enabled; module falls back automatically
        results = search_forms_llamaindex(request.query, top_k=3, country=request.country)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------- Form search endpoint (for frontend compatibility) ----------------
@app.post("/api/forms")
async def form_search(request: FormRequest):
    """Search forms using RAG - same as /api/ragForm but with different endpoint name."""
    try:
        # Use the same form search logic as ragForm
        results = search_forms_llamaindex(request.query, top_k=5, country=request.country)
        return {"results": results}
    except Exception as e:
        print(f"❌ Error in form search: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------- Extract Form endpoint (new) ----------------
def map_field_type(ftype: str) -> str:
    """Map SEA-LION field types to frontend-compatible input types."""
    mapping = {
        "text_input": "text",
        "address": "text",
        "date": "date",
        "checkbox": "checkbox",
        "signature": "signature"
    }
    return mapping.get(ftype, "text")

def normalize_field_name(field_name: str) -> str:
    """Normalize field names to prevent duplicates and ensure consistency"""
    if not field_name:
        return "unnamed_field"
    
    # Convert to lowercase and replace spaces with underscores
    normalized = field_name.lower().strip()
    
    # Remove special characters except underscores and Vietnamese characters
    normalized = re.sub(r'[^a-z0-9_\u00c0-\u017f]', '_', normalized)
    
    # Replace multiple underscores with single underscore
    normalized = re.sub(r'_+', '_', normalized)
    
    # Remove leading/trailing underscores
    normalized = normalized.strip('_')
    
    # Ensure it's not empty
    if not normalized:
        normalized = "unnamed_field"
    
    return normalized


@app.post("/api/extractForm")
async def extract_form(request: ExtractFormRequest):
    try:
        pdf_url = request.url
        print(f"📥 Received form path/url: {pdf_url}")

        # Resolve filename and map to backend/forms
        filename = os.path.basename(pdf_url)
        forms_dir = os.path.join(current_dir, "forms")
        tmp_pdf_path = os.path.join(forms_dir, filename)

        if not os.path.exists(tmp_pdf_path):
            raise HTTPException(status_code=404, detail=f"PDF not found: {tmp_pdf_path}")

        print(f"📄 Using local PDF path: {tmp_pdf_path}")

        # OCR step
        result = extract_pdf_to_text(tmp_pdf_path)
        if "error" in result:
            print("❌ OCR error:", result["error"])
            raise HTTPException(status_code=500, detail=result["error"])

        text = result.get("text", "").strip()
        print(f"📝 OCR text length: {len(text)}")
        print(f"📝 First 500 chars of OCR text: {text[:500]}")

        if not text:
            return {
                "fields": [
                    {
                        "name": "manual_entry",
                        "type": "text",
                        "label": "⚠️ OCR produced no text, please fill manually"
                    }
                ]
            }

        # Clean OCR text and process with LangChain
        cleaned_text = clean_ocr_text(text)
        print(f"📝 First 500 chars of cleaned text: {cleaned_text[:500]}")
        
        # Get LangChain form processing handler
        form_chain = get_form_chain()
        fields_json = form_chain.extract_form_fields(cleaned_text)
        print(f"🤖 LangChain form extraction response: {fields_json}")

        if "error" in fields_json:
            print("❌ Form extraction error:", fields_json)
            raise HTTPException(status_code=500, detail=str(fields_json))

        # ✅ Normalize LLM response and remove duplicates
        fields_list = []
        if "fields" in fields_json and isinstance(fields_json["fields"], list):
            fields_list = fields_json["fields"]
        elif "form_fields" in fields_json and isinstance(fields_json["form_fields"], list):
            # Convert old format to new format
            fields_list = [
                {
                    "name": f.get("field_name", ""),
                    "type": map_field_type(f.get("field_type", "")),
                    "label": f.get("field_name", "Unnamed field"),
                    "required": f.get("required", False),
                    "description": f.get("description", "")
                }
                for f in fields_json["form_fields"]
            ]
            
        # Normalize all fields
        all_fields = [
            {
                "name": normalize_field_name(f.get("name", "")),
                "type": map_field_type(f.get("type", "")),
                "label": f.get("label", "Unnamed field"),
                "required": f.get("required", False),
                "description": f.get("description", "")
            }
            for f in fields_list
        ]
        
        # Remove duplicate fields and merge similar ones
        seen_fields = set()
        unique_fields = []
        duplicates_removed = 0
        merged_fields = 0
        renamed_fields = 0
        
        for field in all_fields:
            # Create a unique identifier for the field
            field_key = (field["name"], field["type"])
            
            # Also check for similar field names (e.g., "ho_ten" vs "ho_ten_1")
            base_name = field["name"].split("_")[0] if "_" in field["name"] else field["name"]
            base_key = (base_name, field["type"])
            
            if field_key not in seen_fields and base_key not in seen_fields:
                seen_fields.add(field_key)
                seen_fields.add(base_key)
                unique_fields.append(field)
            else:
                # Check if we can merge with existing field (enhance description)
                existing_field = next((f for f in unique_fields if f["name"] == field["name"] or f["name"].split("_")[0] == base_name), None)
                if existing_field and field.get("description") and field["description"] != existing_field.get("description"):
                    # Merge descriptions if they're different
                    existing_field["description"] = f"{existing_field.get('description', '')} | {field['description']}"
                    merged_fields += 1
                    print(f"🔄 Merged descriptions for field: {field['name']}")
                else:
                    # Try to create a unique name by adding a suffix
                    counter = 1
                    new_name = f"{field['name']}_{counter}"
                    while (new_name, field["type"]) in seen_fields:
                        counter += 1
                        new_name = f"{field['name']}_{counter}"
                    
                    field["name"] = new_name
                    field["label"] = f"{field['label']} ({counter})"
                    seen_fields.add((new_name, field["type"]))
                    unique_fields.append(field)
                    renamed_fields += 1
                    print(f"🔄 Renamed duplicate field: {field['name']} -> {new_name}")
        
        # Final validation: ensure all field names are unique and properly formatted
        final_fields = []
        final_names = set()
        
        for field in unique_fields:
            if field["name"] not in final_names:
                final_names.add(field["name"])
                final_fields.append(field)
            else:
                print(f"⚠️ Final validation: duplicate field name found: {field['name']}")
        
        normalized = {"fields": final_fields}
        print(f"✅ Successfully normalized {len(final_fields)} unique fields (removed {duplicates_removed} duplicates, merged {merged_fields}, renamed {renamed_fields})")
        print(f"🔍 Final field names: {[f['name'] for f in final_fields]}")
        return normalized

        # Fallback if SEA-LION doesn’t return expected structure
        print("⚠️ SEA-LION returned empty or unexpected response")
        return {
            "fields": [
                {
                    "name": "manual_entry",
                    "type": "text",
                    "label": "⚠️ Could not extract fields, please fill manually"
                }
            ]
        }

    except Exception as e:
        print("💥 Exception in extract_form:", e)
        raise HTTPException(status_code=500, detail=str(e))

def extract_filename_from_url(url: str) -> str:
    """Extract filename from URL, handling Windows paths and various URL formats."""
    try:
        # Remove any URL prefix
        if url.startswith('http://') or url.startswith('https://'):
            # Extract path from URL
            from urllib.parse import urlparse
            parsed = urlparse(url)
            path = parsed.path
        else:
            path = url
        
        # Handle Windows paths that might be in the URL
        if '\\' in path:
            # Split by backslashes and take the last part
            filename = path.split('\\')[-1]
        else:
            # Split by forward slashes and take the last part
            filename = path.split('/')[-1]
        
        # Clean up the filename
        filename = filename.strip()
        
        # If it's still empty or contains path separators, try os.path.basename
        if not filename or '/' in filename or '\\' in filename:
            filename = os.path.basename(path)
        
        return filename
        
    except Exception as e:
        print(f"⚠️ Error extracting filename from URL {url}: {e}")
        # Fallback to simple basename
        return os.path.basename(url)

@app.post("/api/extractFormPreprocessed")
async def extract_form_preprocessed(request: ExtractFormRequest):
    """Extract form fields using preprocessed data from database."""
    try:
        pdf_url = request.url
        print(f"📥 Received form path/url: {pdf_url}")

        # Extract filename from URL (handles Windows paths)
        filename = extract_filename_from_url(pdf_url)
        print(f"🔍 Looking for preprocessed form: {filename}")

        # Try to get preprocessed form data from database
        form_data = get_form_by_filename(filename)
        
        if form_data and form_data.get('form_fields'):
            print(f"✅ Found preprocessed form data in database!")
            print(f"   Form ID: {form_data['id']}")
            print(f"   Title: {form_data['title']}")
            print(f"   Fields: {form_data['field_count']}")
            print(f"   Processing method: {form_data['processing_status']}")
            
            # Convert preprocessed form fields to the expected format
            preprocessed_fields = form_data['form_fields']
            
            if isinstance(preprocessed_fields, dict) and 'fields' in preprocessed_fields:
                # New format with fields array
                fields_list = preprocessed_fields['fields']
            elif isinstance(preprocessed_fields, list):
                # Direct list format
                fields_list = preprocessed_fields
            else:
                print("⚠️ Unexpected form_fields format, falling back to OCR")
                return await extract_form_fallback(request)
            
            # Convert to the format expected by the frontend
            converted_fields = []
            for field in fields_list:
                converted_field = {
                    "name": field.get("name", "unnamed_field"),
                    "type": field.get("type", "text"),
                    "label": field.get("label", field.get("name", "Unnamed field")),
                    "required": field.get("required", False),
                    "description": field.get("description", ""),
                    "confidence": field.get("confidence", 0)
                }
                
                # Add value if it exists (for pre-filled forms)
                if "value" in field:
                    converted_field["value"] = field["value"]
                
                converted_fields.append(converted_field)
            
            print(f"✅ Converted {len(converted_fields)} preprocessed fields")
            return {"fields": converted_fields}
        
        else:
            print(f"⚠️ No preprocessed data found for {filename}, falling back to OCR")
            return await extract_form_fallback(request)

    except Exception as e:
        print("💥 Exception in extract_form_preprocessed:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/extractFormById")
async def extract_form_by_id(request: ExtractFormByIdRequest):
    """Extract form fields using preprocessed data by form ID."""
    try:
        form_id = request.form_id
        print(f"🔍 Looking for preprocessed form ID: {form_id}")

        # Get preprocessed form data from database
        form_data = get_form_by_id(form_id)
        
        if not form_data:
            raise HTTPException(status_code=404, detail=f"Form with ID {form_id} not found")
        
        if not form_data.get('form_fields'):
            raise HTTPException(status_code=404, detail=f"No form fields found for form ID {form_id}")
        
        print(f"✅ Found preprocessed form data!")
        print(f"   Form ID: {form_data['id']}")
        print(f"   Title: {form_data['title']}")
        print(f"   Fields: {form_data['field_count']}")
        print(f"   Processing method: {form_data['processing_status']}")
        
        # Convert preprocessed form fields to the expected format
        preprocessed_fields = form_data['form_fields']
        
        if isinstance(preprocessed_fields, dict) and 'fields' in preprocessed_fields:
            # New format with fields array
            fields_list = preprocessed_fields['fields']
        elif isinstance(preprocessed_fields, list):
            # Direct list format
            fields_list = preprocessed_fields
        else:
            raise HTTPException(status_code=500, detail="Unexpected form_fields format")
        
        # Convert to the format expected by the frontend
        converted_fields = []
        for field in fields_list:
            converted_field = {
                "name": field.get("name", "unnamed_field"),
                "type": field.get("type", "text"),
                "label": field.get("label", field.get("name", "Unnamed field")),
                "required": field.get("required", False),
                "description": field.get("description", ""),
                "confidence": field.get("confidence", 0)
            }
            
            # Add value if it exists (for pre-filled forms)
            if "value" in field:
                converted_field["value"] = field["value"]
            
            converted_fields.append(converted_field)
        
        print(f"✅ Converted {len(converted_fields)} preprocessed fields")
        return {"fields": converted_fields}

    except HTTPException:
        raise
    except Exception as e:
        print("💥 Exception in extract_form_by_id:", e)
        raise HTTPException(status_code=500, detail=str(e))

async def extract_form_fallback(request: ExtractFormRequest):
    """Fallback to OCR processing when preprocessed data is not available."""
    try:
        pdf_url = request.url
        print(f"🔄 Using OCR fallback for: {pdf_url}")

        # Extract filename from URL (handles Windows paths)
        filename = extract_filename_from_url(pdf_url)
        forms_dir = os.path.join(current_dir, "forms")
        tmp_pdf_path = os.path.join(forms_dir, filename)

        if not os.path.exists(tmp_pdf_path):
            raise HTTPException(status_code=404, detail=f"PDF not found: {tmp_pdf_path}")

        print(f"📄 Using local PDF path: {tmp_pdf_path}")

        # OCR step
        result = extract_pdf_to_text(tmp_pdf_path)
        if "error" in result:
            print("❌ OCR error:", result["error"])
            raise HTTPException(status_code=500, detail=result["error"])

        text = result.get("text", "").strip()
        print(f"📝 OCR text length: {len(text)}")

        if not text:
            return {
                "fields": [
                    {
                        "name": "manual_entry",
                        "type": "text",
                        "label": "⚠️ OCR produced no text, please fill manually"
                    }
                ]
            }

        # Clean OCR text and process with LangChain
        cleaned_text = clean_ocr_text(text)

        # Get LangChain form processing handler
        form_chain = get_form_chain()
        fields_json = form_chain.extract_form_fields(cleaned_text)
        print(f"🤖 LangChain form extraction response: {fields_json}")

        if "error" in fields_json:
            print("❌ Form extraction error:", fields_json)
            raise HTTPException(status_code=500, detail=str(fields_json))

        # Normalize LLM response
        fields_list = []
        if "fields" in fields_json and isinstance(fields_json["fields"], list):
            fields_list = fields_json["fields"]
        elif "form_fields" in fields_json and isinstance(fields_json["form_fields"], list):
            fields_list = [
                {
                    "name": f.get("field_name", ""),
                    "type": map_field_type(f.get("field_type", "")),
                    "label": f.get("field_name", "Unnamed field"),
                    "required": f.get("required", False),
                    "description": f.get("description", "")
                }
                for f in fields_json["form_fields"]
            ]
        
        # Normalize all fields
        all_fields = [
            {
                "name": normalize_field_name(f.get("name", "")),
                "type": map_field_type(f.get("type", "")),
                "label": f.get("label", "Unnamed field"),
                "required": f.get("required", False),
                "description": f.get("description", "")
            }
            for f in fields_list
        ]
        
        # Remove duplicates
        seen_fields = set()
        unique_fields = []
        
        for field in all_fields:
            field_key = (field["name"], field["type"])
            if field_key not in seen_fields:
                seen_fields.add(field_key)
                unique_fields.append(field)
        
        print(f"✅ OCR fallback extracted {len(unique_fields)} fields")
        return {"fields": unique_fields}

    except Exception as e:
        print("💥 Exception in extract_form_fallback:", e)
        raise HTTPException(status_code=500, detail=str(e))

# Explain API endpoint
import json
import re
from typing import List, Dict, Any
from fastapi import HTTPException

class ExplainRequest(BaseModel):
    user_query: str
    documents: List[Dict[str, Any]]
    document_type: str  # "ragLink" or "ragForm"
    country: str = "Vietnam"
    language: str = "Vietnamese"

@app.post("/api/explain")
async def explain_documents(request: ExplainRequest):
    """Generate intelligent explanation of how retrieved documents relate to user's query (LangChain version)"""
    try:
        # Get LangChain RAG handler
        rag_chain = get_rag_chain()
        
        print(f"DEBUG: Document explanation - query: {request.user_query}, docs: {len(request.documents)}")
        
        # Process document explanation through LangChain pipeline
        result = rag_chain.explain_documents(
            user_query=request.user_query,
            documents=request.documents,
            document_type=request.document_type,
            country=request.country,
            language=request.language
        )
        
        return result
        
    except Exception as e:
        print("💥 Exception in explain_documents:", e)
        raise HTTPException(status_code=500, detail=str(e))

#Fill form endpoint

class FillFormRequest(BaseModel):
    form_schema: Dict[str, Any]
    chat_history: List[Dict[str, Any]]   # allow extra keys
    user_profile: Optional[Dict[str, Any]] = None  # User profile data for AI context

def clean_llm_output(text: str) -> str:
    """Remove markdown fences and stray chars from LLM JSON output."""
    text = re.sub(r"^```[a-zA-Z]*\s*", "", text)  # remove leading ```json
    text = re.sub(r"```$", "", text)              # remove trailing ```
    return text.strip()

def try_parse_json(text: str):
    text = clean_llm_output(text)

    # First: direct parse
    try:
        return json.loads(text)
    except Exception:
        pass

    # Second: extract full { ... }
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        json_str = match.group(0)
        json_str = re.sub(r"[\x00-\x1F\x7F]", "", json_str)
        try:
            return json.loads(json_str)
        except Exception:
            pass

    # Third: salvage just the "fields" array
    match = re.search(r'\"fields\"\s*:\s*\[.*', text, re.DOTALL)
    if match:
        arr_str = match.group(0)

        # Close dangling quotes
        if arr_str.count('"') % 2 == 1:
            arr_str += '"'

        # Ensure closing ]
        if not arr_str.endswith("]"):
            arr_str += "]"

        json_str = "{ " + arr_str + " }"
        json_str = re.sub(r"[\x00-\x1F\x7F]", "", json_str)

        try:
            return json.loads(json_str)
        except Exception:
            # Last resort: drop any trailing incomplete object
            fixed = re.sub(r",\s*{[^}]*$", "", arr_str) + "]"
            json_str = "{ " + fixed + " }"
            return json.loads(json_str)

    raise ValueError("Unable to parse JSON")

@app.post("/api/fillForm")
async def fill_form(request: FillFormRequest):
    """Fill form using LangChain (migrated from direct API calls)"""
    try:
        # Get LangChain form processing handler
        form_chain = get_form_chain()
        
        print(f"🚀 fillForm: Processing form with {len(request.chat_history)} chat messages, {len(request.form_schema.get('fields', []))} fields")
        if request.user_profile:
            print(f"👤 User profile provided: {request.user_profile.get('full_name', 'Unknown')} ({request.user_profile.get('email', 'No email')})")
        
        # Process form filling through LangChain pipeline
        result = form_chain.fill_form(
            form_schema=request.form_schema,
            chat_history=request.chat_history,
            user_profile=request.user_profile
        )
        
        print(f"✅ fillForm: Successfully processed form with {len(result.get('fields', []))} fields")
        return result
        
    except Exception as e:
        print("💥 Exception in fill_form:", e)
        raise HTTPException(status_code=500, detail=str(e))

# ---------------- Form Data Retrieval Endpoints ----------------

@app.get("/api/formData/{form_id}")
async def get_form_data_endpoint(form_id: int):
    """Get complete form data including extracted fields for chatbot use."""
    try:
        form_data = get_form_by_id(form_id)
        if not form_data:
            raise HTTPException(status_code=404, detail="Form not found")
        
        return form_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 Exception in get_form_data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/formSchema/{form_id}")
async def get_form_schema_endpoint(form_id: int):
    """Get form schema formatted for form filling."""
    try:
        schema = get_form_schema_for_filling(form_id)
        if not schema:
            raise HTTPException(status_code=404, detail="Form not found or no schema available")
        
        return schema
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 Exception in get_form_schema: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/formsByCategory/{category}")
async def get_forms_by_category_endpoint(category: str, limit: int = 10):
    """Get forms by category."""
    try:
        forms = search_forms_by_category(category, limit)
        return {
            "category": category,
            "forms": forms,
            "total": len(forms)
        }
        
    except Exception as e:
        print(f"💥 Exception in get_forms_by_category: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/formCategories")
async def get_form_categories_endpoint():
    """Get all available form categories."""
    try:
        categories = get_all_form_categories()
        return {
            "categories": categories,
            "total": len(categories)
        }
        
    except Exception as e:
        print(f"💥 Exception in get_form_categories: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/formsSummary")
async def get_forms_summary_endpoint():
    """Get summary of all available forms."""
    try:
        summary = get_available_forms_summary()
        return summary
        
    except Exception as e:
        print(f"💥 Exception in get_forms_summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/formByFilename/{filename}")
async def get_form_by_filename_endpoint(filename: str):
    """Get form data by filename."""
    try:
        form_data = get_form_by_filename(filename)
        if not form_data:
            raise HTTPException(status_code=404, detail="Form not found")
        
        return form_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 Exception in get_form_by_filename: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ---------------- Document Management Endpoints ----------------

@app.get("/api/documents")
async def get_documents(limit: int = 50, offset: int = 0):
    """Get all documents with public URLs"""
    try:
        # Use the existing supabase client from rag.query
        client = supabase
        
        # Query documents from the base table (not the view with broken URL)
        result = client.table("documents").select("*").order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        
        documents = []
        for doc in result.data:
            # Construct proper Supabase Storage public URL
            public_url = None
            if doc["storage_bucket"] == "documents" and doc["storage_path"]:
                # Extract project ID from SUPABASE_URL
                supabase_url = SUPABASE_URL
                if supabase_url:
                    # Convert https://your-project.supabase.co to https://your-project.supabase.co/storage/v1/object/public/
                    public_url = f"{supabase_url}/storage/v1/object/public/{doc['storage_bucket']}/{doc['storage_path']}"
            
            documents.append({
                "id": doc["id"],
                "title": doc["title"],
                "storage_bucket": doc["storage_bucket"],
                "storage_path": doc["storage_path"],
                "public_url": public_url,
                "mime_type": doc["mime_type"],
                "size_bytes": doc["size_bytes"],
                "created_at": doc["created_at"],
                "updated_at": doc["updated_at"]
            })
        
        return {"documents": documents, "total": len(documents)}
        
    except Exception as e:
        print(f"💥 Exception in get_documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documents/{document_id}")
async def get_document(document_id: str):
    """Get a specific document by ID"""
    try:
        # Use the existing supabase client from rag.query
        client = supabase
        
        # Try to parse as integer first, then as UUID
        try:
            # Try as integer first
            doc_id = int(document_id)
            result = client.table("documents").select("*").eq("id", doc_id).execute()
        except ValueError:
            # Not an integer, try as UUID
            result = client.table("documents").select("*").eq("id", document_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        doc = result.data[0]
        
        # Construct proper Supabase Storage public URL
        public_url = None
        if doc["storage_bucket"] == "documents" and doc["storage_path"]:
            supabase_url = SUPABASE_URL
            if supabase_url:
                public_url = f"{supabase_url}/storage/v1/object/public/{doc['storage_bucket']}/{doc['storage_path']}"
        
        return {
            "id": doc["id"],
            "title": doc["title"],
            "storage_bucket": doc["storage_bucket"],
            "storage_path": doc["storage_path"],
            "public_url": public_url,
            "mime_type": doc["mime_type"],
            "size_bytes": doc["size_bytes"],
            "created_at": doc["created_at"],
            "updated_at": doc["updated_at"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 Exception in get_document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/documents")
async def create_document(request: DocumentRequest, current_user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    """Create a new document record"""
    try:
        # Use the existing supabase client from rag.query
        client = supabase
        
        # Insert document metadata
        result = client.table("documents").insert({
            "title": request.title,
            "storage_bucket": request.storage_bucket,
            "storage_path": request.storage_path,
            "mime_type": request.mime_type,
            "size_bytes": request.size_bytes,
            "uploaded_by": current_user.get("user_id") if current_user else None
        }).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create document")
        
        doc = result.data[0]
        return {
            "id": doc["id"],
            "title": doc["title"],
            "storage_bucket": doc["storage_bucket"],
            "storage_path": doc["storage_path"],
            "mime_type": doc["mime_type"],
            "size_bytes": doc["size_bytes"],
            "created_at": doc["created_at"],
            "updated_at": doc["updated_at"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 Exception in create_document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/documents/{document_id}")
async def delete_document(document_id: str, current_user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    """Delete a document and its storage file"""
    try:
        # Use the existing supabase client from rag.query
        client = supabase
        
        # Get document info first - handle both UUID and integer IDs
        try:
            import uuid
            uuid.UUID(document_id)
            # It's a valid UUID, use as-is
            doc_result = client.table("documents").select("*").eq("id", document_id).execute()
        except ValueError:
            # Not a UUID, try as integer
            doc_result = client.table("documents").select("*").eq("id", int(document_id)).execute()
        
        if not doc_result.data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        doc = doc_result.data[0]
        
        # Delete from storage
        storage = client.storage.from_(doc["storage_bucket"])
        storage.remove([doc["storage_path"]])
        
        # Delete from database
        client.table("documents").delete().eq("id", document_id).execute()
        
        return {"message": "Document deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"💥 Exception in delete_document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documents/search")
async def search_documents(query: str, limit: int = 10):
    """Search documents by title"""
    try:
        # Use the existing supabase client from rag.query
        client = supabase
        
        # Search documents by title (case-insensitive)
        result = client.table("documents").select("*").ilike("title", f"%{query}%").order("created_at", desc=True).limit(limit).execute()
        
        documents = []
        for doc in result.data:
            # Construct proper Supabase Storage public URL
            public_url = None
            if doc["storage_bucket"] == "documents" and doc["storage_path"]:
                supabase_url = SUPABASE_URL
                if supabase_url:
                    public_url = f"{supabase_url}/storage/v1/object/public/{doc['storage_bucket']}/{doc['storage_path']}"
            
            documents.append({
                "id": doc["id"],
                "title": doc["title"],
                "storage_bucket": doc["storage_bucket"],
                "storage_path": doc["storage_path"],
                "public_url": public_url,
                "mime_type": doc["mime_type"],
                "size_bytes": doc["size_bytes"],
                "created_at": doc["created_at"],
                "updated_at": doc["updated_at"]
            })
        
        return {"documents": documents, "query": query, "total": len(documents)}

    except Exception as e:
        print(f"💥 Exception in search_documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------- Website Renderer endpoint ----------------
@app.post("/api/render-website")
async def render_website(request: WebsiteRenderRequest):
    """Render website using Playwright with precise scroll and highlight control"""
    try:
        from playwright.async_api import async_playwright
        import base64

        async with async_playwright() as p:
            # Launch Chromium browser
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-web-security'
                ]
            )

            context = await browser.new_context(
                viewport={'width': request.viewportWidth, 'height': request.viewportHeight}
            )
            page = await context.new_page()

            # Navigate to URL
            await page.goto(request.url, wait_until='networkidle', timeout=30000)

            # Extract page text for search capabilities
            page_text = await page.evaluate('() => document.body.innerText')

            # If scrollToSection is specified, try to scroll to it
            scroll_position = None
            if request.scrollToSection:
                scroll_position = await page.evaluate('''(searchTerm) => {
                    const searchTermLower = searchTerm.toLowerCase();
                    const walker = document.createTreeWalker(
                        document.body,
                        NodeFilter.SHOW_TEXT,
                        null,
                        false
                    );

                    let node;
                    while (node = walker.nextNode()) {
                        if (node.textContent.toLowerCase().includes(searchTermLower)) {
                            const element = node.parentElement;
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });

                            // Highlight the found element
                            element.style.backgroundColor = '#ffeb3b';
                            element.style.padding = '4px';
                            element.style.borderRadius = '4px';
                            element.style.border = '2px solid #ff9800';

                            return {
                                found: true,
                                text: node.textContent.substring(0, 100),
                                scrollTop: window.pageYOffset
                            };
                        }
                    }
                    return { found: false };
                }''', request.scrollToSection)

            # Highlight additional terms if specified
            if request.highlightTerms:
                for term in request.highlightTerms:
                    await page.evaluate('''(term) => {
                        const walker = document.createTreeWalker(
                            document.body,
                            NodeFilter.SHOW_TEXT,
                            null,
                            false
                        );

                        let node;
                        while (node = walker.nextNode()) {
                            if (node.textContent.toLowerCase().includes(term.toLowerCase())) {
                                const element = node.parentElement;
                                element.style.backgroundColor = '#e3f2fd';
                                element.style.border = '1px solid #2196f3';
                                element.style.borderRadius = '2px';
                            }
                        }
                    }''', term)

            # Take screenshot
            screenshot_bytes = await page.screenshot(full_page=True, type='png')

            # Get page dimensions
            dimensions = await page.evaluate('''() => {
                return {
                    width: document.documentElement.scrollWidth,
                    height: document.documentElement.scrollHeight,
                    viewportHeight: window.innerHeight
                };
            }''')

            await browser.close()

        # Convert screenshot to base64
        screenshot_base64 = base64.b64encode(screenshot_bytes).decode('utf-8')

        return {
            "success": True,
            "screenshot": screenshot_base64,
            "pageText": page_text,
            "scrollPosition": scroll_position,
            "dimensions": dimensions,
            "url": request.url,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        print(f"💥 Website render error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to render website: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

