#!/bin/bash

# Script to run frontend locally with proper environment setup
echo "🚀 Starting Govly Frontend in local development mode..."

# Check if .env file exists
if [ ! -f "../.env" ]; then
    echo "❌ Error: .env file not found in parent directory"
    echo "Please create govly-web/.env with your Supabase credentials:"
    echo ""
    echo "NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co"
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
    echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:8000"
    echo ""
    exit 1
fi

# Set environment variables for local development
export NODE_ENV=development
export NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

echo "✅ Environment configured for local development"
echo "📡 Backend URL: $NEXT_PUBLIC_BACKEND_URL"
echo "🔧 Node Environment: $NODE_ENV"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🌐 Starting Next.js development server..."
echo "Frontend will be available at: http://localhost:3000"
echo "Make sure your backend is running on: http://localhost:8000"
echo ""

npm run dev
