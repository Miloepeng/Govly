#!/bin/bash

# Fix Supabase Configuration Script
# Run this from your govly-web directory

set -e

echo "🔧 Fixing Supabase Configuration..."

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
echo "🔧 You need to update your Supabase credentials!"
echo ""
echo "📋 Your Supabase credentials should look like this:"
echo "   SUPABASE_URL=https://your-project-id.supabase.co"
echo "   SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
echo ""
echo "🔍 You can find these in your Supabase dashboard:"
echo "   1. Go to https://supabase.com/dashboard"
echo "   2. Select your project"
echo "   3. Go to Settings > API"
echo "   4. Copy the Project URL and anon/public key"
echo ""

# Ask user for credentials
read -p "Enter your Supabase URL (e.g., https://abc123.supabase.co): " SUPABASE_URL
read -p "Enter your Supabase anon key: " SUPABASE_KEY
read -p "Enter your SEA-LION API key: " SEA_LION_API_KEY

# Validate URL format
if [[ ! $SUPABASE_URL =~ ^https?:// ]]; then
    echo "❌ Invalid URL format. Please include http:// or https://"
    exit 1
fi

# Update backend environment
echo "📝 Updating backend environment..."
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

# Update frontend environment
echo "📝 Updating frontend environment..."
cat > frontend/.env.local << EOF
# Production Frontend Environment
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_KEY
NODE_ENV=production
EOF

echo "✅ Environment files updated!"

# Rebuild frontend with new environment
echo "🏗️ Rebuilding frontend with new environment..."
cd frontend
npm run build
cd ..

# Restart services
echo "🔄 Restarting services..."
pm2 restart all

echo "✅ Supabase configuration fixed!"
echo ""
echo "🌐 Test your application:"
echo "   http://$(curl -s http://checkip.amazonaws.com/)"
echo ""
echo "📊 Check status:"
echo "   pm2 status"
echo "   pm2 logs"
