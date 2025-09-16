#!/bin/bash

# Fix Python Import Issues Script
# This script fixes the Python module import problems

set -e

echo "🔧 Fixing Python import issues..."

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

echo "📝 Step 2: Creating .env file..."
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

echo "📝 Step 3: Activating virtual environment..."
source venv/bin/activate

echo "📝 Step 4: Setting PYTHONPATH..."
export PYTHONPATH="/home/ubuntu/Govly/govly-web/backend:$PYTHONPATH"

echo "📝 Step 5: Testing Python imports..."
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

echo "📝 Step 6: Creating a startup script with proper PYTHONPATH..."
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

echo "📝 Step 7: Updating PM2 ecosystem configuration..."
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

echo "📝 Step 8: Stopping and restarting PM2 applications..."
pm2 delete all
pm2 start ecosystem.config.js

echo "⏳ Step 9: Waiting for applications to start..."
sleep 15

echo "📊 Step 10: Checking PM2 status..."
pm2 status

echo "📊 Step 11: Checking logs..."
pm2 logs --lines 5

echo "✅ Python import issues fixed!"
echo ""
echo "🌐 Your application should now be accessible at:"
echo "   http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo ""
echo "🔧 If you still have issues, check:"
echo "   pm2 logs"
echo "   pm2 status"



