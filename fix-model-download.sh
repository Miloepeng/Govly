#!/bin/bash

# Fix Model Download Script
# This script addresses the sentence-transformers model download issue

set -e

echo "🔧 Fixing model download issues..."

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected file: frontend/package.json"
    exit 1
fi

cd backend

echo "📝 Step 1: Setting environment variables (if not already set)..."
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

echo "📝 Step 2: Creating .env file..."
cat > .env << EOF
SEA_LION_API_KEY=$SEA_LION_API_KEY
SUPABASE_URL=$SUPABASE_URL
SUPABASE_KEY=$SUPABASE_KEY
USE_LLAMA_INDEX=true
SUPABASE_CHUNKS_TABLE=chunks
SUPABASE_FORMS_TABLE=forms
PORT=8000
ENVIRONMENT=production
EOF

echo "📝 Step 3: Activating virtual environment..."
source venv/bin/activate

echo "📝 Step 4: Pre-downloading the sentence-transformers model..."
echo "This may take several minutes..."

# Set environment variables for model download
export TRANSFORMERS_CACHE=/tmp/transformers_cache
export HF_HOME=/tmp/huggingface_cache

# Create cache directories
mkdir -p $TRANSFORMERS_CACHE
mkdir -p $HF_HOME

# Pre-download the model
echo "Downloading sentence-transformers model..."
python3.11 -c "
import os
os.environ['TRANSFORMERS_CACHE'] = '/tmp/transformers_cache'
os.environ['HF_HOME'] = '/tmp/huggingface_cache'
from sentence_transformers import SentenceTransformer
print('Downloading model...')
model = SentenceTransformer('all-MiniLM-L6-v2')
print('Model downloaded successfully!')
"

echo "📝 Step 5: Testing backend startup..."
echo "Starting backend in background to test..."
timeout 30 python3.11 main.py &
BACKEND_PID=$!

# Wait a bit for startup
sleep 10

# Check if backend is running
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ Backend started successfully!"
    kill $BACKEND_PID
else
    echo "❌ Backend failed to start"
    exit 1
fi

echo "📝 Step 6: Restarting PM2 applications..."
cd ..
pm2 restart all

echo "⏳ Step 7: Waiting for applications to stabilize..."
sleep 15

echo "📊 Step 8: Checking PM2 status..."
pm2 status

echo "✅ Model download fix completed!"
echo ""
echo "🌐 Your application should now be accessible at:"
echo "   http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo ""
echo "🔧 If you still have issues, check:"
echo "   pm2 logs"
echo "   pm2 status"



