#!/bin/bash

# Fix Environment Variables Script
# This script sets up the environment variables properly

set -e

echo "🔧 Fixing environment variables..."

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected file: frontend/package.json"
    exit 1
fi

echo "📝 Step 1: Setting environment variables..."
echo "Please provide your Supabase credentials:"

# Get Supabase URL
read -p "Enter your Supabase URL (e.g., https://your-project.supabase.co): " SUPABASE_URL
if [ -z "$SUPABASE_URL" ]; then
    echo "❌ Supabase URL is required"
    exit 1
fi

# Get Supabase Key
read -p "Enter your Supabase Anon Key: " SUPABASE_KEY
if [ -z "$SUPABASE_KEY" ]; then
    echo "❌ Supabase Key is required"
    exit 1
fi

# Get SEA-LION API Key
read -p "Enter your SEA-LION API Key: " SEA_LION_API_KEY
if [ -z "$SEA_LION_API_KEY" ]; then
    echo "❌ SEA-LION API Key is required"
    exit 1
fi

echo "📝 Step 2: Creating backend .env file..."
cat > backend/.env << EOF
# Production Environment Variables
SEA_LION_API_KEY=$SEA_LION_API_KEY
SUPABASE_URL=$SUPABASE_URL
SUPABASE_KEY=$SUPABASE_KEY
USE_LLAMA_INDEX=true
SUPABASE_CHUNKS_TABLE=chunks
SUPABASE_FORMS_TABLE=forms
PORT=8000
ENVIRONMENT=production
EOF

echo "📝 Step 3: Creating frontend .env.local file..."
cat > frontend/.env.local << EOF
# Production Frontend Environment
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_KEY
NODE_ENV=production
EOF

echo "📝 Step 4: Setting system environment variables..."
export SEA_LION_API_KEY="$SEA_LION_API_KEY"
export SUPABASE_URL="$SUPABASE_URL"
export SUPABASE_KEY="$SUPABASE_KEY"

echo "📝 Step 5: Adding environment variables to shell profile..."
cat >> ~/.bashrc << EOF

# Govly Environment Variables
export SEA_LION_API_KEY="$SEA_LION_API_KEY"
export SUPABASE_URL="$SUPABASE_URL"
export SUPABASE_KEY="$SUPABASE_KEY"
EOF

echo "🔄 Step 6: Restarting PM2 applications..."
pm2 restart all

echo "⏳ Step 7: Waiting for applications to start..."
sleep 10

echo "📊 Step 8: Checking PM2 status..."
pm2 status

echo "✅ Environment variables fixed!"
echo ""
echo "🌐 Your application should now be accessible at:"
echo "   http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo ""
echo "🔧 If you still have issues, check:"
echo "   pm2 logs"
echo "   pm2 status"



