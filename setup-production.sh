#!/bin/bash

# Production Environment Setup Script
# Run this from your govly-web directory

set -e

echo "🔧 Setting up production environment..."

# Check if we're in the right directory
if [ ! -f "backend/main.py" ] || [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected files: backend/main.py and frontend/package.json"
    exit 1
fi

# Create production environment files
echo "📝 Creating environment configuration..."

# Backend environment
cat > backend/.env << EOF
# Production Environment Variables
SEA_LION_API_KEY=${SEA_LION_API_KEY}
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_KEY=${SUPABASE_KEY}
USE_LLAMA_INDEX=true
SUPABASE_CHUNKS_TABLE=chunks
SUPABASE_FORMS_TABLE=forms
PORT=8000
ENVIRONMENT=production
EOF

# Frontend environment
cat > frontend/.env.local << EOF
# Production Frontend Environment
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_KEY}
NODE_ENV=production
EOF

# Install backend dependencies
echo "🐍 Installing Python dependencies..."
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Install frontend dependencies
echo "📦 Installing Node.js dependencies..."
cd ../frontend
npm install

# Build frontend for production
echo "🏗️ Building frontend for production..."
npm run build

echo "✅ Production environment setup complete!"

