from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import sys

# Add current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# Import your existing RAG functionality
from rag.query import search_chunks, supabase
from rag.match_forms import search_forms
print("✅ DEBUG: RAG imports successful")

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

app = FastAPI(title="Govly API", version="1.0.0")

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class ChatRequest(BaseModel):
    message: str
    conversationContext: list = []
    country: str = "Vietnam"
    language: str = "Vietnamese"
    settings: dict

class RAGRequest(BaseModel):
    query: str

class FormRequest(BaseModel):
    query: str

# Chat endpoint
@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        # Your existing SEA-LION API logic
        api_key = os.getenv("SEA_LION_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="SEA_LION_API_KEY not found")
        
        import requests
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Create context-aware system prompt based on response type
        response_type = request.settings.get("responseType", "default")
        rag_results = request.settings.get("ragResults", [])
        form_results = request.settings.get("formResults", [])
        country = request.country
        language = request.language
        
        # Debug: Print received data
        print(f"DEBUG: Received country: {country}, language: {language}")
        print(f"DEBUG: Response type: {response_type}")
        print(f"DEBUG: System prompt will include: 'The user is from {country}' and 'Respond in {language}'")
        
        if response_type == "ragLink":
            # Include specific document information in the prompt if available
            if rag_results:
                docs_info = "\n\nRelevant documents found:\n"
                for i, doc in enumerate(rag_results[:3], 1):
                    docs_info += f"{i}. {doc.get('title', 'Document')}: {doc.get('content', '')[:100]}...\n"
                
                system_prompt = f"You are SEA-LION, a Southeast Asian language model. The user is from {country}. Respond in {language}. Consider the full conversation context and provide country-specific information when relevant. When responding: 1) First give a general, helpful answer to the user's question. 2) Then carefully analyze and explain the context of each document you found - what information it contains, how it specifically relates to their query, and what insights or guidance it provides. 3) Help guide the user on how to use this information effectively. 4) Keep your response informative and actionable.\n\n{docs_info}"
            else:
                system_prompt = f"You are SEA-LION, a Southeast Asian language model. The user is from {country}. Respond in {language}. Consider the full conversation context and provide country-specific information when relevant. When responding: 1) First give a general, helpful answer to the user's question. 2) Then mention that you've found relevant documents and will show them below. 3) Explain that these documents will provide detailed context and guidance for their query. 4) Keep your response informative and actionable. IMPORTANT: Always mention the documents you found - never say you don't have links."
        elif response_type == "ragForm":
            # Include specific form information in the prompt if available
            if form_results:
                forms_info = "\n\nRelevant forms found:\n"
                for i, form in enumerate(form_results[:3], 1):
                    forms_info += f"{i}. {form.get('title', 'Form')}: {form.get('description', '')[:100]}...\n"
                
                system_prompt = f"You are SEA-LION, a Southeast Asian language model. The user is from {country}. Respond in {language}. Consider the full conversation context and provide country-specific information when relevant. When responding: 1) First give a general, helpful answer to the user's question. 2) Then carefully analyze and explain the context of each form you found - what the form is for, what information it requires, how it relates to their query, and provide step-by-step guidance on how to use it effectively. 3) Help guide the user through the form process and explain what they need to do next. 4) Keep your response informative and actionable.\n\n{forms_info}"
            else:
                system_prompt = f"You are SEA-LION, a Southeast Asian language model. The user is from {country}. Respond in {language}. Consider the full conversation context and provide country-specific information when relevant. When responding: 1) First give a general, helpful answer to the user's question. 2) Then mention that you've found relevant forms and will show them below. 3) Explain that these forms will provide step-by-step guidance and requirements for their needs. 4) Keep your response informative and actionable. IMPORTANT: Always mention the forms you found - never say you don't have forms."
        else:
            system_prompt = f"You are SEA-LION, a Southeast Asian language model. The user is from {country}. Respond in {language}. Consider the full conversation context and provide country-specific information when relevant. Give informative, helpful answers. Be direct and factual."
        
        # Build messages array with conversation context
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation context if provided
        if request.conversationContext:
            # Add all previous messages from the conversation
            for msg in request.conversationContext:
                if msg.get("role") in ["user", "assistant"] and msg.get("content"):
                    messages.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })
        else:
            # Fallback: just add the current user message
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
            
            return {"response": response_text}
        else:
            raise HTTPException(status_code=response.status_code, detail="SEA-LION API error")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# RAG Link search endpoint
@app.post("/api/ragLink")
async def rag_link_search(request: RAGRequest):
    try:
        results = search_chunks(request.query, top_k=3)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# RAG Form search endpoint
@app.post("/api/ragForm")
async def rag_form_search(request: FormRequest):
    try:
        results = search_forms(request.query, top_k=3)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 