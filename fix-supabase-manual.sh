#!/bin/bash

# Manual Supabase Configuration Fix
# This script will help you manually edit the files

set -e

echo "🔧 Manual Supabase Configuration Fix..."

# Check if we're in the right directory
if [ ! -f "backend/main.py" ] || [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    exit 1
fi

echo "📝 Current environment files:"
echo "   Backend .env:"
cat backend/.env
echo ""
echo "   Frontend .env.local:"
cat frontend/.env.local

echo ""
echo "🔧 Let's fix this step by step..."
echo ""

# Step 1: Fix backend .env
echo "📝 Step 1: Fixing backend .env file..."
echo "   Please enter your actual Supabase credentials:"
echo ""

read -p "Enter your Supabase URL (e.g., https://abc123.supabase.co): " SUPABASE_URL_INPUT
read -p "Enter your Supabase anon key: " SUPABASE_KEY_INPUT
read -p "Enter your SEA-LION API key: " SEA_LION_KEY_INPUT

# Validate URL format
if [[ ! $SUPABASE_URL_INPUT =~ ^https?:// ]]; then
    echo "❌ Invalid URL format. Please include http:// or https://"
    exit 1
fi

# Create backend .env with actual values
cat > backend/.env << EOF
# Production Environment Variables
SEA_LION_API_KEY=$SEA_LION_KEY_INPUT
SUPABASE_URL=$SUPABASE_URL_INPUT
SUPABASE_KEY=$SUPABASE_KEY_INPUT
USE_LLAMA_INDEX=true
SUPABASE_CHUNKS_TABLE=chunks
SUPABASE_FORMS_TABLE=forms
PORT=8000
ENVIRONMENT=production
EOF

echo "✅ Backend .env updated!"

# Step 2: Fix frontend .env.local
echo "📝 Step 2: Fixing frontend .env.local file..."

cat > frontend/.env.local << EOF
# Production Frontend Environment
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL_INPUT
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_KEY_INPUT
NODE_ENV=production
EOF

echo "✅ Frontend .env.local updated!"

# Step 3: Verify the files
echo "📝 Step 3: Verifying the files..."
echo ""
echo "   Backend .env:"
cat backend/.env
echo ""
echo "   Frontend .env.local:"
cat frontend/.env.local

# Step 4: Rebuild and restart
echo ""
echo "🏗️ Step 4: Rebuilding frontend..."
cd frontend
npm run build
cd ..

echo "🔄 Step 5: Restarting services..."
pm2 restart all

echo ""
echo "✅ Supabase configuration fixed!"
echo ""
echo "🌐 Test your application:"
echo "   http://$(curl -s http://checkip.amazonaws.com/)"
echo ""
echo "📊 Check status:"
echo "   pm2 status"
echo "   pm2 logs --lines 10"


