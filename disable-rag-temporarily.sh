#!/bin/bash

# Disable RAG Temporarily Script
# This script disables RAG functionality to get the app running quickly

set -e

echo "🔧 Disabling RAG functionality temporarily..."

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected file: frontend/package.json"
    exit 1
fi

cd backend

echo "📝 Step 1: Setting environment variables..."
if [ -z "$SEA_LION_API_KEY" ]; then
    read -p "Enter your SEA-LION API Key: " SEA_LION_API_KEY
    export SEA_LION_API_KEY="$SEA_LION_API_KEY"
fi

if [ -z "$SUPABASE_URL" ]; then
    read -p "Enter your Supabase URL: " SUPABASE_URL
    export SUPABASE_URL="$SUPABASE_URL"
fi

if [ -z "$SUPABASE_KEY" ]; then
    read -p "Enter your Supabase Key: " SUPABASE_KEY
    export SUPABASE_KEY="$SUPABASE_KEY"
fi

echo "📝 Step 2: Creating .env file with RAG disabled..."
cat > .env << EOF
SEA_LION_API_KEY=$SEA_LION_API_KEY
SUPABASE_URL=$SUPABASE_URL
SUPABASE_KEY=$SUPABASE_KEY
USE_LLAMA_INDEX=false
SUPABASE_CHUNKS_TABLE=chunks
SUPABASE_FORMS_TABLE=forms
PORT=8000
ENVIRONMENT=production
DISABLE_RAG=true
EOF

echo "📝 Step 3: Creating a simple main.py without RAG..."
# Backup original main.py
cp main.py main.py.backup

# Create a simplified version without RAG
cat > main.py << 'EOF'
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Govly API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    chat_history: List[dict] = []
    country: str = "VN"
    language: str = "vi"
    max_tokens: int = 200
    temperature: float = 0.7
    thinking_mode: bool = False

class ChatResponse(BaseModel):
    response: str
    status: str = "success"

@app.get("/")
async def root():
    return {"message": "Govly API is running!", "status": "success"}

@app.get("/health")
async def health():
    return {"status": "healthy", "message": "API is running"}

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Simple chat endpoint without RAG"""
    try:
        # Simple response for now
        response = f"I received your message: '{request.message}'. RAG functionality is temporarily disabled."
        return ChatResponse(response=response, status="success")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ragLink")
async def rag_link(request: ChatRequest):
    """RAG link endpoint - disabled"""
    return {"message": "RAG functionality is temporarily disabled", "results": []}

@app.post("/api/ragForm")
async def rag_form(request: ChatRequest):
    """RAG form endpoint - disabled"""
    return {"message": "RAG functionality is temporarily disabled", "results": []}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
EOF

echo "📝 Step 4: Testing backend startup..."
source venv/bin/activate
echo "Starting backend in background to test..."
timeout 10 python3.11 main.py &
BACKEND_PID=$!

# Wait for startup
sleep 5

# Check if backend is running
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ Backend started successfully!"
    kill $BACKEND_PID
else
    echo "❌ Backend failed to start"
    exit 1
fi

echo "📝 Step 5: Restarting PM2 applications..."
cd ..
pm2 restart all

echo "⏳ Step 6: Waiting for applications to stabilize..."
sleep 10

echo "📊 Step 7: Checking PM2 status..."
pm2 status

echo "✅ RAG disabled temporarily!"
echo ""
echo "🌐 Your application should now be accessible at:"
echo "   http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo ""
echo "📝 Note: RAG functionality is disabled. To re-enable:"
echo "   1. Run: ./fix-model-download.sh"
echo "   2. Or restore: cp backend/main.py.backup backend/main.py"
echo ""
echo "🔧 If you still have issues, check:"
echo "   pm2 logs"
echo "   pm2 status"



