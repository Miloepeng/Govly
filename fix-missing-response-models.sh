#!/bin/bash

# Fix Missing Response Models Script
# This script creates the missing response_models.py file

set -e

echo "🔧 Creating missing response_models.py file..."

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected file: frontend/package.json"
    exit 1
fi

cd backend

echo "📝 Step 1: Creating models directory if it doesn't exist..."
mkdir -p models

echo "📝 Step 2: Creating __init__.py file in models directory..."
touch models/__init__.py

echo "📝 Step 3: Creating response_models.py..."
cat > models/response_models.py << 'EOF'
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class ChatResponse(BaseModel):
    response: str
    status: str = "success"
    rag_results: Optional[List[Dict[str, Any]]] = None
    form_results: Optional[List[Dict[str, Any]]] = None

class RAGResult(BaseModel):
    title: str
    content: str
    url: str
    similarity: float

class FormResult(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    url: str

class ChatRequest(BaseModel):
    message: str
    chat_history: List[Dict[str, Any]] = []
    country: str = "VN"
    language: str = "vi"
    max_tokens: int = 200
    temperature: float = 0.7
    thinking_mode: bool = False

class ExtractFormRequest(BaseModel):
    message: str
    chat_history: List[Dict[str, Any]] = []

class ExtractFormByIdRequest(BaseModel):
    form_id: int

class FillFormRequest(BaseModel):
    form_schema: Dict[str, Any]
    chat_history: List[Dict[str, Any]] = []
    user_profile: Optional[Dict[str, Any]] = None
EOF

echo "📝 Step 4: Setting environment variables..."
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

echo "📝 Step 5: Creating .env file..."
cat > .env << EOF
SEA_LION_API_KEY=$SEA_LION_API_KEY
SUPABASE_URL=$SUPABASE_URL
SUPABASE_KEY=$SUPABASE_KEY
USE_LLAMA_INDEX=false
SUPABASE_CHUNKS_TABLE=chunks
SUPABASE_FORMS_TABLE=forms
PORT=8000
ENVIRONMENT=production
PYTHONPATH=/home/ubuntu/Govly/govly-web/backend
EOF

echo "📝 Step 6: Testing imports..."
source venv/bin/activate
export PYTHONPATH="/home/ubuntu/Govly/govly-web/backend:$PYTHONPATH"

python3.11 -c "
import sys
sys.path.insert(0, '/home/ubuntu/Govly/govly-web/backend')
try:
    from models.response_models import ChatResponse
    print('✅ models.response_models import successful')
except ImportError as e:
    print(f'❌ models.response_models import failed: {e}')

try:
    from chains.chat_chain import ChatChain
    print('✅ chains.chat_chain import successful')
except ImportError as e:
    print(f'❌ chains.chat_chain import failed: {e}')

try:
    from utils.chain_utils import get_chat_chain
    print('✅ utils.chain_utils import successful')
except ImportError as e:
    print(f'❌ utils.chain_utils import failed: {e}')
"

echo "📝 Step 7: Creating startup script..."
cat > start_backend.sh << 'EOF'
#!/bin/bash
cd /home/ubuntu/Govly/govly-web/backend
source venv/bin/activate
export PYTHONPATH="/home/ubuntu/Govly/govly-web/backend:$PYTHONPATH"
export SEA_LION_API_KEY="$SEA_LION_API_KEY"
export SUPABASE_URL="$SUPABASE_URL"
export SUPABASE_KEY="$SUPABASE_KEY"
export USE_LLAMA_INDEX=false
export PORT=8000
export ENVIRONMENT=production
python3.11 main.py
EOF

chmod +x start_backend.sh

echo "📝 Step 8: Updating PM2 configuration..."
cd ..
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'govly-backend',
      cwd: './backend',
      script: './start_backend.sh',
      interpreter: 'bash',
      env: {
        NODE_ENV: 'production',
        PORT: 8000,
        PYTHONPATH: '/home/ubuntu/Govly/govly-web/backend',
        SEA_LION_API_KEY: '$SEA_LION_API_KEY',
        SUPABASE_URL: '$SUPABASE_URL',
        SUPABASE_KEY: '$SUPABASE_KEY',
        USE_LLAMA_INDEX: 'false',
        ENVIRONMENT: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/pm2/govly-backend-error.log',
      out_file: '/var/log/pm2/govly-backend-out.log',
      log_file: '/var/log/pm2/govly-backend.log'
    },
    {
      name: 'govly-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/pm2/govly-frontend-error.log',
      out_file: '/var/log/pm2/govly-frontend-out.log',
      log_file: '/var/log/pm2/govly-frontend.log'
    }
  ]
};
EOF

echo "📝 Step 9: Restarting PM2..."
pm2 delete all
pm2 start ecosystem.config.js

echo "⏳ Step 10: Waiting for applications to start..."
sleep 15

echo "📊 Step 11: Checking PM2 status..."
pm2 status

echo "📊 Step 12: Checking logs..."
pm2 logs --lines 5

echo "✅ Missing response_models.py file created!"
echo ""
echo "🌐 Your application should now be accessible at:"
echo "   http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo ""
echo "🔧 If you still have issues, check:"
echo "   pm2 logs"
echo "   pm2 status"



