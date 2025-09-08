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
from tesseract_extractor import extract_pdf_to_text, clean_ocr_text, send_to_sealion

# Import LangChain components
from langchain_components import get_chat_chain, get_intent_chain

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
            rag_response = await rag_link_search(RAGRequest(query=request.message))
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


# ---------------- Choose Agency endpoint ----------------
async def choose_agency(request: ChatRequest, detected_category: str, suggested_agencies: list):
    """Handle agency choice routing"""
    try:
        api_key = os.getenv("SEA_LION_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="SEA_LION_API_KEY not found")
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        country = request.country
        language = request.language
        detected_category_name = detected_category.replace("_", " ").title() if detected_category else "relevant"
        category_agencies = suggested_agencies
        
        system_prompt = f"""You are a government agency advisor from {country}, responding in {language}. Your main job is to advise people on relevant policies, laws, actions to take, and what kind of applications or appeals they can sign up for.

The user's question appears to need specialized help from a {detected_category_name} government agency in {country}. 

Respond by:
1) Giving a helpful general answer to their question
2) Explaining that you can connect them to a specialized {detected_category_name} agency for more detailed help
3) Suggesting the most relevant agency from {country} based on their query
4) Asking if they'd like to be connected to that agency

Available {detected_category_name} agencies in {country}:
{chr(10).join([f"- {agency}" for agency in category_agencies])}

IMPORTANT: Before connecting them to the agency, ask 1-2 probing questions to better understand their specific situation:
- Ask about their timeline, documents, or specific circumstances
- Gather key details that will help the agency provide better assistance
- Make sure you have enough context before the handoff

End your response with: "Would you like me to connect you to [Agency Name] for specialized assistance?" But first, ask 1-2 specific questions to gather more context about their situation."""

        messages = [{"role": "system", "content": system_prompt}]
        if request.conversationContext:
            for msg in request.conversationContext:
                if msg.get("role") in ["user", "assistant"] and msg.get("content"):
                    messages.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })
        else:
            messages.append({
                "role": "user",
                "content": request.message
            })
        
        payload = {
            "max_completion_tokens": request.settings.get("maxTokens", 150),
            "messages": messages,
            "model": "aisingapore/Llama-SEA-LION-v3-70B-IT",
            "temperature": request.settings.get("temperature", 0.7),
            "thinking_mode": request.settings.get("thinkingMode", "off")
        }
        
        response = requests.post(
            "https://api.sea-lion.ai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=60
        )
        
        if response.status_code == 200:
            response_data = response.json()
            response_text = response_data["choices"][0]["message"]["content"]
            
            # Add agency detection info to help frontend
            response_payload = {
                "response": response_text,
                "agency_detection": {
                    "needs_agency": True,
                    "should_offer_agency": True,
                    "suggested_agency": category_agencies[0] if category_agencies else None,
                    "available_agencies": category_agencies,
                    "category": detected_category
                }
            }
            
            return response_payload
        else:
            raise HTTPException(status_code=response.status_code, detail="SEA-LION API error")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------- RAG Link search endpoint ----------------
@app.post("/api/ragLink")
async def rag_link_search(request: RAGRequest):
    try:
        results = search_chunks(request.query, top_k=3)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------- Agency Detection endpoint ----------------
@app.post("/api/detectAgency")
async def detect_agency(request: AgencyDetectionRequest):
    try:
        api_key = os.getenv("SEA_LION_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="SEA_LION_API_KEY not found")
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Country-specific agency mapping
        country_agencies = {
            "Vietnam": {
                "housing": ["Ministry of Construction", "Housing Development Authority", "Urban Development Agency"],
                "land": ["Ministry of Natural Resources", "Land Administration Department", "Planning Institute"],
                "immigration": ["Immigration Department", "Ministry of Public Security", "Border Guard Command"],
                "employment": ["Ministry of Labor", "Social Insurance Agency", "Employment Service Center"],
                "transport": ["Ministry of Transport", "Traffic Police", "Public Transport Authority"],
                "environment": ["Ministry of Environment", "Environmental Protection Agency", "Forest Protection Department"],
                "business": ["Ministry of Planning", "Business Registration Office", "Tax Department"],
                "education": ["Ministry of Education", "University System", "Vocational Training Authority"]
            },
            "Singapore": {
                "housing": ["Housing Development Board (HDB)", "Urban Redevelopment Authority (URA)"],
                "land": ["Urban Redevelopment Authority (URA)", "Singapore Land Authority (SLA)"],
                "immigration": ["Immigration & Checkpoints Authority (ICA)", "Ministry of Home Affairs"],
                "employment": ["Ministry of Manpower (MOM)", "Central Provident Fund (CPF)"],
                "transport": ["Land Transport Authority (LTA)", "Public Transport Council"],
                "environment": ["National Environment Agency (NEA)", "Public Utilities Board"],
                "business": ["Accounting and Corporate Regulatory Authority (ACRA)", "Enterprise Singapore"],
                "education": ["Ministry of Education (MOE)", "SkillsFuture Singapore"]
            },
            "Thailand": {
                "housing": ["Ministry of Interior", "Department of Public Works", "Bangkok Metropolitan Administration"],
                "land": ["Department of Lands", "Ministry of Natural Resources", "Town Planning Department"],
                "immigration": ["Immigration Bureau", "Ministry of Foreign Affairs", "Royal Thai Police"],
                "employment": ["Ministry of Labor", "Social Security Office", "Department of Employment"],
                "transport": ["Ministry of Transport", "Department of Highways", "Bangkok Mass Transit Authority"],
                "environment": ["Ministry of Natural Resources", "Pollution Control Department", "Department of Environmental Quality"],
                "business": ["Department of Business Development", "Ministry of Commerce", "Board of Investment"],
                "education": ["Ministry of Education", "Office of Higher Education Commission", "Department of Non-Formal Education"]
            }
        }
        
        # Build context-aware prompt for agency detection
        system_prompt = f"""You are an AI assistant that helps determine which government agency a user needs to talk to in {request.country}.

Analyze the user's query and conversation context to identify if they need specialized help from a specific government agency.

Available agencies in {request.country}:
{chr(10).join([f"- {agency}" for category_agencies in country_agencies.get(request.country, {}).values() for agency in category_agencies])}

Respond with ONLY a JSON object in this exact format:
{{
    "needs_agency": true/false,
    "agency": "Agency Name" or null,
    "confidence": 0.0-1.0,
    "reasoning": "Brief explanation of why this agency is needed"
}}

If the user doesn't need specialized agency help, set needs_agency to false and agency to null."""

        # Build messages array
        messages = [{"role": "system", "content": system_prompt}]
        if request.conversationContext:
            for msg in request.conversationContext:
                if msg.get("role") in ["user", "assistant"] and msg.get("content"):
                    messages.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })
        
        messages.append({
            "role": "user",
            "content": request.query
        })
        
        payload = {
            "max_completion_tokens": 200,
            "messages": messages,
            "model": "aisingapore/Llama-SEA-LION-v3-70B-IT",
            "temperature": 0.1,  # Low temperature for consistent JSON output
        }
        
        response = requests.post(
            "https://api.sea-lion.ai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=60
        )
        
        if response.status_code == 200:
            response_data = response.json()
            response_text = response_data["choices"][0]["message"]["content"].strip()
            
            try:
                # Parse JSON response
                import json
                agency_data = json.loads(response_text)
                return agency_data
            except json.JSONDecodeError:
                # Fallback if JSON parsing fails
                return {
                    "needs_agency": False,
                    "agency": None,
                    "confidence": 0.0,
                    "reasoning": "Could not determine agency from response"
                }
        else:
            raise HTTPException(status_code=response.status_code, detail="SEA-LION API error")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------- RAG Form search endpoint ----------------
@app.post("/api/ragForm")
async def rag_form_search(request: FormRequest):
    try:
        results = search_forms(request.query, top_k=3)
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

        # Clean OCR text and send to SEA-LION
        cleaned_text = clean_ocr_text(text)
        fields_json = send_to_sealion(cleaned_text)
        print(f"🤖 SEA-LION raw response: {fields_json}")

        if "error" in fields_json:
            print("❌ SEA-LION error:", fields_json)
            raise HTTPException(status_code=500, detail=str(fields_json))

        # ✅ Normalize SEA-LION response and remove duplicates
        if "form_fields" in fields_json and isinstance(fields_json["form_fields"], list):
            # First normalize all fields
            all_fields = [
                {
                    "name": normalize_field_name(f["field_name"]),
                    "type": map_field_type(f.get("field_type", "")),
                    "label": f.get("field_name", "Unnamed field"),
                    "required": f.get("required", False),
                    "description": f.get("description", "")
                }
                for f in fields_json["form_fields"]
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
    """Generate intelligent explanation of how retrieved documents relate to user's query"""
    try:
        api_key = os.getenv("SEA_LION_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="SEA_LION_API_KEY not found")

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        # Build context for the LLM
        doc_context = ""
        for i, doc in enumerate(request.documents, 1):
            doc_context += f"\nDocument {i}:\n"
            doc_context += f"Title: {doc.get('title', 'No title')}\n"
            doc_context += f"Content: {doc.get('content', 'No content')[:500]}...\n"
            doc_context += f"URL: {doc.get('url', 'No URL')}\n"
            doc_context += f"Relevance: {doc.get('similarity', 'Unknown')}\n"

        system_prompt = f"""You are an expert government services advisor. Your task is to analyze how retrieved documents relate to the user's query and explain their relevance.

IMPORTANT: Generate a response in {request.language} that:
1. Shows you understand the user's issue/question
2. Explains how each document relates to their query
3. Highlights which documents are most helpful and why
4. Provides context on how these documents can help solve their problem
5. Is conversational and helpful

BE PROACTIVE: After explaining the documents, ask 1-2 follow-up questions to better understand their specific situation:
- Ask about their timeline, specific circumstances, or documents they have
- Gather details that will help provide more targeted assistance
- Show you're invested in solving their complete problem

Document type: {request.document_type}
User query: {request.user_query}

Available documents:
{doc_context}

Respond in a helpful, conversational tone in {request.language}. End with 1-2 specific follow-up questions to gather more context."""

        messages = [{"role": "system", "content": system_prompt}]

        payload = {
            "max_completion_tokens": 800,
            "messages": messages,
            "model": "aisingapore/Llama-SEA-LION-v3-70B-IT",
            "temperature": 0.3,
        }

        response = requests.post(
            "https://api.sea-lion.ai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=60
        )

        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="SEA-LION API error")

        response_data = response.json()
        explanation = response_data["choices"][0]["message"]["content"].strip()

        return {
            "explanation": explanation,
            "document_type": request.document_type,
            "documents": request.documents,
            "user_query": request.user_query
        }

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
    try:
        # Validate request size
        if len(request.chat_history) > 50:
            raise HTTPException(status_code=400, detail="Chat history too long. Please keep conversations shorter.")
        
        if not request.form_schema or not request.form_schema.get('fields'):
            raise HTTPException(status_code=400, detail="Invalid form schema")
        
        api_key = os.getenv("SEA_LION_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="SEA_LION_API_KEY not found")

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        # --- Enhanced system prompt for better field mapping ---
        system_prompt = """You are SEA-LION helping fill government forms. 

IMPORTANT INSTRUCTIONS:
1. Analyze the chat history to find personal information
2. Map that information to the form fields by name
3. For each field, either provide the value found in chat OR "ASK_USER" if unclear
4. Look for: names, addresses, dates, phone numbers, occupations, etc.
5. Output ONLY valid JSON: {"fields": [{"name": "field_name", "value": "value_or_ASK_USER"}]}

EXAMPLES:
- If chat says "My name is John Smith" and form has field "name" → {"name": "name", "value": "John Smith"}
- If chat says "I live in Hanoi" and form has field "address" → {"name": "address", "value": "Hanoi"}
- If no info found for a field → {"name": "field_name", "value": "ASK_USER"}

No explanations, no markdown, just JSON."""

        messages = [{"role": "system", "content": system_prompt}]
        for msg in request.chat_history:
            if msg.get("role") in ["user", "assistant"] and msg.get("content"):
                messages.append({"role": msg["role"], "content": msg["content"]})

        messages.append({
            "role": "user",
            "content": f"Here is the form schema: {request.form_schema}"
        })

        # Limit chat history to last 10 messages to reduce processing time
        limited_messages = messages[:11]  # system + last 10 messages
        
        payload = {
            "max_completion_tokens": 300,   # reduced for faster response
            "messages": limited_messages,
            "model": "aisingapore/Llama-SEA-LION-v3-70B-IT",
            "temperature": 0.1,  # lower temperature for more consistent output
        }

        print(f"🚀 fillForm: Sending request with {len(limited_messages)} messages, {len(request.form_schema.get('fields', []))} fields")
        print(f"📋 Form fields: {[f.get('name', 'unknown') for f in request.form_schema.get('fields', [])]}")
        chat_summary = []
        for msg in limited_messages[1:]:
            role = msg.get('role', 'unknown')
            content = msg.get('content', '')[:50]
            chat_summary.append(f"{role}: {content}...")
        print(f"💬 Chat messages: {chat_summary}")
        
        response = requests.post(
            "https://api.sea-lion.ai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=45  # reduced timeout for faster failure detection
        )

        if response.status_code != 200:
            print(f"❌ SEA-LION API error: {response.status_code}")
            raise HTTPException(status_code=response.status_code, detail="SEA-LION API error")

        response_data = response.json()
        raw_text = response_data["choices"][0]["message"]["content"].strip()
        
        print(f"✅ fillForm: Received response in {len(raw_text)} characters")

        # --- Robust parse ---
        try:
            result = try_parse_json(raw_text)
            print(f"✅ fillForm: Successfully parsed JSON with {len(result.get('fields', []))} fields")
            return result
        except Exception as e:
            print("❌ Final JSON parse failure:", e, raw_text)
            raise HTTPException(status_code=500, detail="Invalid JSON from LLM")

    except Exception as e:
        print("💥 Exception in fill_form:", e)
        raise HTTPException(status_code=500, detail=str(e))



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

