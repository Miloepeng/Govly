from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
import os
import sys
import requests
import tempfile
import json

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

from fastapi.staticfiles import StaticFiles
app = FastAPI(title="Govly API", version="1.0.0")

# Serve static forms directory
forms_dir = os.path.join(current_dir, "forms")  # adjust if forms are in ../forms
if os.path.exists(forms_dir):
    app.mount("/forms", StaticFiles(directory=forms_dir), name="forms")

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your Next.js frontend
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

# ---------------- Models ----------------
from typing import Optional

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

class AgencyDetectionRequest(BaseModel):
    query: str
    country: str
    conversationContext: list = []

# ---------------- Chat endpoint (LangChain version) ----------------
@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
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
        
        # LLM-based intent detection for routing
        detected_category, needs_agency, suggested_agencies, llm_response_type = await detect_intent_with_llm(request.message, country, language)
        
        # Use LLM's response_type for routing instead of settings
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
        print(f"DEBUG: LLM Response type: {llm_response_type}")
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
            return await chat(request)
            
        else:
            print(f"DEBUG: Unknown response type: {response_type}, routing to General Chat")
            # Route to general chat as fallback
            return await chat(request)
        
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

@app.post("/api/extractFormPreprocessed")
async def extract_form_preprocessed(request: ExtractFormRequest):
    """Extract form fields using preprocessed data from database."""
    try:
        pdf_url = request.url
        print(f"📥 Received form path/url: {pdf_url}")

        # Resolve filename and map to backend/forms
        filename = os.path.basename(pdf_url)
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

async def extract_form_fallback(request: ExtractFormRequest):
    """Fallback to OCR processing when preprocessed data is not available."""
    try:
        pdf_url = request.url
        print(f"🔄 Using OCR fallback for: {pdf_url}")

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
        
        # Process form filling through LangChain pipeline
        result = form_chain.fill_form(
            form_schema=request.form_schema,
            chat_history=request.chat_history
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

