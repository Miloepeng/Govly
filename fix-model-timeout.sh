#!/bin/bash

# Fix Model Loading Timeout Issues
# This script addresses PyTorch model loading timeout problems

set -e

echo "🔧 Fixing model loading timeout issues..."

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

echo "📝 Step 2: Setting up proper model caching (using HF_HOME instead of TRANSFORMERS_CACHE)..."
# Use HF_HOME instead of TRANSFORMERS_CACHE to avoid deprecation warning
export HF_HOME="/home/ubuntu/.cache/huggingface"
export TORCH_HOME="/home/ubuntu/.cache/torch"

# Create cache directories
mkdir -p $HF_HOME
mkdir -p $TORCH_HOME

echo "📝 Step 3: Creating .env file with updated model settings..."
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
HF_HOME=$HF_HOME
TORCH_HOME=$TORCH_HOME
EOF

echo "📝 Step 4: Pre-downloading models with proper timeout handling..."
source venv/bin/activate

# Pre-download models with longer timeout and better error handling
echo "   Downloading sentence-transformers model (this may take 5-10 minutes)..."
timeout 600 python3.11 -c "
import os
import warnings
warnings.filterwarnings('ignore', category=FutureWarning)
os.environ['HF_HOME'] = '$HF_HOME'
os.environ['TORCH_HOME'] = '$TORCH_HOME'
try:
    from sentence_transformers import SentenceTransformer
    print('Downloading all-MiniLM-L6-v2 model...')
    model = SentenceTransformer('all-MiniLM-L6-v2')
    print('✅ Model downloaded successfully!')
    # Test the model
    embeddings = model.encode(['test sentence'])
    print('✅ Model test successful!')
except Exception as e:
    print(f'❌ Model download failed: {e}')
    import traceback
    traceback.print_exc()
" || echo "   ⚠️ Model download timed out or failed, will retry at runtime"

echo "📝 Step 5: Creating a model initialization script..."
cat > init_models.py << 'EOF'
#!/usr/bin/env python3
"""
Model initialization script
This script pre-loads models to avoid timeout issues during startup
"""
import os
import warnings
warnings.filterwarnings('ignore', category=FutureWarning)

def init_models():
    """Initialize models with proper error handling"""
    try:
        print("🔄 Initializing sentence-transformers model...")
        from sentence_transformers import SentenceTransformer
        
        # Load the model
        model = SentenceTransformer('all-MiniLM-L6-v2')
        print("✅ SentenceTransformer model loaded successfully")
        
        # Test the model
        test_embeddings = model.encode(['test sentence'])
        print(f"✅ Model test successful, embedding shape: {test_embeddings.shape}")
        
        return model
    except Exception as e:
        print(f"❌ Model initialization failed: {e}")
        return None

if __name__ == "__main__":
    model = init_models()
    if model:
        print("🎉 All models initialized successfully!")
    else:
        print("⚠️ Model initialization failed, but continuing...")
EOF

chmod +x init_models.py

echo "📝 Step 6: Creating startup script with model initialization..."
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

# Set model cache directories (using HF_HOME instead of TRANSFORMERS_CACHE)
export HF_HOME="/home/ubuntu/.cache/huggingface"
export TORCH_HOME="/home/ubuntu/.cache/torch"

# Create cache directories
mkdir -p $HF_HOME
mkdir -p $TORCH_HOME

# Set Python options for better model loading
export PYTHONUNBUFFERED=1
export OMP_NUM_THREADS=1

echo "🔄 Pre-initializing models..."
python3.11 init_models.py

echo "🚀 Starting backend with model support..."
python3.11 main.py
EOF

chmod +x start_backend.sh

echo "📝 Step 7: Updating PM2 configuration with extended timeouts..."
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
        HF_HOME: '/home/ubuntu/.cache/huggingface',
        TORCH_HOME: '/home/ubuntu/.cache/torch',
        PYTHONUNBUFFERED: '1',
        OMP_NUM_THREADS: '1'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '3G',
      error_file: '/var/log/pm2/govly-backend-error.log',
      out_file: '/var/log/pm2/govly-backend-out.log',
      log_file: '/var/log/pm2/govly-backend.log',
      restart_delay: 10000,
      max_restarts: 5,
      min_uptime: '30s'
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

echo "📝 Step 8: Restarting PM2 with extended timeouts..."
pm2 delete all
pm2 start ecosystem.config.js

echo "⏳ Step 9: Waiting for applications to start (this may take 2-3 minutes with models)..."
sleep 60

echo "📊 Step 10: Checking PM2 status..."
pm2 status

echo "📊 Step 11: Checking logs..."
pm2 logs --lines 10

echo "✅ Model timeout issues addressed!"
echo ""
echo "🌐 Your application should now be accessible at:"
echo "   http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo ""
echo "📝 Note: The backend may take 2-3 minutes to start due to model loading"
echo "🔧 If you still have issues, check:"
echo "   pm2 logs"
echo "   pm2 status"
echo "   df -h (check disk space)"
echo "   free -h (check memory)"



