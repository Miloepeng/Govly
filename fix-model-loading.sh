#!/bin/bash

# Fix Model Loading Issues Script
# This script addresses PyTorch model loading problems

set -e

echo "🔧 Fixing model loading issues..."

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

echo "📝 Step 2: Setting up model caching and environment..."
# Set up proper caching directories
export TRANSFORMERS_CACHE="/tmp/transformers_cache"
export HF_HOME="/tmp/huggingface_cache"
export TORCH_HOME="/tmp/torch_cache"

# Create cache directories
mkdir -p $TRANSFORMERS_CACHE
mkdir -p $HF_HOME
mkdir -p $TORCH_HOME

echo "📝 Step 3: Creating .env file with model settings..."
cat > .env << EOF
SEA_LION_API_KEY=$SEA_LION_API_KEY
SUPABASE_URL=$SUPABASE_URL
SUPABASE_KEY=$SUPABASE_KEY
USE_LLAMA_INDEX=true
SUPABASE_CHUNKS_TABLE=chunks
SUPABASE_FORMS_TABLE=forms
PORT=8000
ENVIRONMENT=production
PYTHONPATH=/home/ubuntu/Govly/govly-web/backend
TRANSFORMERS_CACHE=$TRANSFORMERS_CACHE
HF_HOME=$HF_HOME
TORCH_HOME=$TORCH_HOME
EOF

echo "📝 Step 4: Pre-downloading models in background..."
source venv/bin/activate

# Pre-download models with timeout and retry
echo "   Downloading sentence-transformers model..."
timeout 300 python3.11 -c "
import os
os.environ['TRANSFORMERS_CACHE'] = '$TRANSFORMERS_CACHE'
os.environ['HF_HOME'] = '$HF_HOME'
os.environ['TORCH_HOME'] = '$TORCH_HOME'
try:
    from sentence_transformers import SentenceTransformer
    print('Downloading all-MiniLM-L6-v2 model...')
    model = SentenceTransformer('all-MiniLM-L6-v2')
    print('✅ Model downloaded successfully!')
except Exception as e:
    print(f'❌ Model download failed: {e}')
" || echo "   ⚠️ Model download timed out, will retry at runtime"

echo "📝 Step 5: Creating startup script with model settings..."
cat > start_backend.sh << 'EOF'
#!/bin/bash
cd /home/ubuntu/Govly/govly-web/backend
source venv/bin/activate

# Set environment variables
export PYTHONPATH="/home/ubuntu/Govly/govly-web/backend:$PYTHONPATH"
export SEA_LION_API_KEY="$SEA_LION_API_KEY"
export SUPABASE_URL="$SUPABASE_URL"
export SUPABASE_KEY="$SUPABASE_KEY"
export USE_LLAMA_INDEX=true
export PORT=8000
export ENVIRONMENT=production

# Set model cache directories
export TRANSFORMERS_CACHE="/tmp/transformers_cache"
export HF_HOME="/tmp/huggingface_cache"
export TORCH_HOME="/tmp/torch_cache"

# Create cache directories
mkdir -p $TRANSFORMERS_CACHE
mkdir -p $HF_HOME
mkdir -p $TORCH_HOME

# Set Python options for better model loading
export PYTHONUNBUFFERED=1
export OMP_NUM_THREADS=1

echo "Starting backend with model support..."
python3.11 main.py
EOF

chmod +x start_backend.sh

echo "📝 Step 6: Updating PM2 configuration with model settings..."
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
        USE_LLAMA_INDEX: 'true',
        ENVIRONMENT: 'production',
        TRANSFORMERS_CACHE: '/tmp/transformers_cache',
        HF_HOME: '/tmp/huggingface_cache',
        TORCH_HOME: '/tmp/torch_cache',
        PYTHONUNBUFFERED: '1',
        OMP_NUM_THREADS: '1'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      error_file: '/var/log/pm2/govly-backend-error.log',
      out_file: '/var/log/pm2/govly-backend-out.log',
      log_file: '/var/log/pm2/govly-backend.log',
      restart_delay: 5000,
      max_restarts: 10
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

echo "📝 Step 7: Restarting PM2 with model support..."
pm2 delete all
pm2 start ecosystem.config.js

echo "⏳ Step 8: Waiting for applications to start (this may take longer with models)..."
sleep 30

echo "📊 Step 9: Checking PM2 status..."
pm2 status

echo "📊 Step 10: Checking logs..."
pm2 logs --lines 10

echo "✅ Model loading issues addressed!"
echo ""
echo "🌐 Your application should now be accessible at:"
echo "   http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo ""
echo "📝 Note: The backend may take longer to start due to model loading"
echo "🔧 If you still have issues, check:"
echo "   pm2 logs"
echo "   pm2 status"
echo "   df -h (check disk space)"



