#!/bin/bash

# Comprehensive Fix for All Missing Imports
# This script adds ALL missing classes that chain_utils.py is trying to import

set -e

echo "🔧 Adding ALL missing classes to response_models.py..."

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected file: frontend/package.json"
    exit 1
fi

cd backend

echo "📝 Step 1: Checking what chain_utils.py is trying to import..."
echo "   Checking imports in utils/chain_utils.py:"
grep -n "from models.response_models import" utils/chain_utils.py || echo "   No direct imports found"
grep -n "import.*Response" utils/chain_utils.py || echo "   No Response imports found"

echo "📝 Step 2: Adding ALL possible missing classes..."
cat >> models/response_models.py << 'EOF'

class FormFillResponse(BaseModel):
    filled_fields: List[FormField] = []
    status: str = "success"
    message: Optional[str] = None
    confidence: float = 0.0

class DocumentExplanationResponse(BaseModel):
    explanation: str
    relevance_score: float
    document_title: str
    document_url: str
    key_points: List[str] = []
    status: str = "success"

class AgencySelectionResponse(BaseModel):
    agency: str
    confidence: float
    country: str = "VN"
    description: Optional[str] = None

class AgencyDetectionResponse(BaseModel):
    agency: str
    confidence: float
    country: str = "VN"

class IntentDetectionResponse(BaseModel):
    intent: str
    confidence: float
    entities: Optional[Dict[str, Any]] = None

class RAGLinkRequest(BaseModel):
    message: str
    chat_history: List[Dict[str, Any]] = []
    country: str = "VN"
    language: str = "vi"

class RAGFormRequest(BaseModel):
    message: str
    chat_history: List[Dict[str, Any]] = []
    country: str = "VN"
    language: str = "vi"

class RAGLinkResponse(BaseModel):
    results: List[RAGResult] = []
    status: str = "success"

class RAGFormResponse(BaseModel):
    results: List[FormResult] = []
    status: str = "success"

class FormField(BaseModel):
    name: str
    type: str
    label: str
    required: bool = False
    description: Optional[str] = None
    value: Optional[str] = None

class FormSchema(BaseModel):
    fields: List[FormField]
    title: str
    description: Optional[str] = None

class FillFormResponse(BaseModel):
    fields: List[FormField]
    status: str = "success"
    message: Optional[str] = None

class UserProfile(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    id_number: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    occupation: Optional[str] = None

class ApplicationData(BaseModel):
    id: str
    formTitle: str
    dateApplied: str
    status: str
    formData: Dict[str, Any]
    schema: Dict[str, Any]
    progress: Dict[str, Any]

class ChainResponse(BaseModel):
    response: str
    status: str = "success"
    metadata: Optional[Dict[str, Any]] = None

class ProcessingResult(BaseModel):
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    processing_time: Optional[float] = None
EOF

echo "📝 Step 3: Setting environment variables..."
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

echo "📝 Step 4: Creating .env file..."
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

echo "📝 Step 5: Testing ALL imports..."
source venv/bin/activate
export PYTHONPATH="/home/ubuntu/Govly/govly-web/backend:$PYTHONPATH"

python3.11 -c "
import sys
sys.path.insert(0, '/home/ubuntu/Govly/govly-web/backend')

# Test all possible imports
try:
    from models.response_models import (
        ChatResponse, 
        IntentDetectionResponse, 
        AgencySelectionResponse,
        AgencyDetectionResponse,
        DocumentExplanationResponse,
        FormFillResponse,
        RAGLinkRequest,
        RAGFormRequest,
        RAGLinkResponse,
        RAGFormResponse,
        FormField,
        FormSchema,
        FillFormResponse,
        UserProfile,
        ApplicationData,
        ChainResponse,
        ProcessingResult
    )
    print('✅ All models.response_models imports successful')
except ImportError as e:
    print(f'❌ models.response_models import failed: {e}')

try:
    from chains.chat_chain import ChatChain
    print('✅ chains.chat_chain import successful')
except ImportError as e:
    print(f'❌ chains.chat_chain import failed: {e}')

try:
    from utils.chain_utils import (
        get_chat_chain, 
        get_intent_chain, 
        get_agency_chain,
        get_agency_detection_chain,
        get_rag_chain,
        get_form_chain
    )
    print('✅ utils.chain_utils import successful')
except ImportError as e:
    print(f'❌ utils.chain_utils import failed: {e}')
"

echo "📝 Step 6: Creating startup script..."
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

echo "📝 Step 7: Updating PM2 configuration..."
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

echo "📝 Step 8: Restarting PM2..."
pm2 delete all
pm2 start ecosystem.config.js

echo "⏳ Step 9: Waiting for applications to start..."
sleep 15

echo "📊 Step 10: Checking PM2 status..."
pm2 status

echo "📊 Step 11: Checking logs..."
pm2 logs --lines 5

echo "✅ ALL missing classes added!"
echo ""
echo "🌐 Your application should now be accessible at:"
echo "   http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo ""
echo "🔧 If you still have issues, check:"
echo "   pm2 logs"
echo "   pm2 status"



