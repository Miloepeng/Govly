#!/bin/bash

# Check Backend Structure Script
# This script examines the actual backend directory structure

set -e

echo "🔍 Checking backend directory structure..."

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected file: frontend/package.json"
    exit 1
fi

cd backend

echo "📁 Current directory: $(pwd)"
echo "📁 Directory contents:"
ls -la

echo ""
echo "📁 Checking for models directory:"
if [ -d "models" ]; then
    echo "   ✅ models directory exists"
    ls -la models/
else
    echo "   ❌ models directory does not exist"
fi

echo ""
echo "📁 Checking for chains directory:"
if [ -d "chains" ]; then
    echo "   ✅ chains directory exists"
    ls -la chains/
else
    echo "   ❌ chains directory does not exist"
fi

echo ""
echo "📁 Checking for utils directory:"
if [ -d "utils" ]; then
    echo "   ✅ utils directory exists"
    ls -la utils/
else
    echo "   ❌ utils directory does not exist"
fi

echo ""
echo "📁 Checking for rag directory:"
if [ -d "rag" ]; then
    echo "   ✅ rag directory exists"
    ls -la rag/
else
    echo "   ❌ rag directory does not exist"
fi

echo ""
echo "📁 Checking main.py imports:"
echo "   First 30 lines of main.py:"
head -30 main.py

echo ""
echo "📁 Checking if response_models.py exists:"
find . -name "response_models.py" -type f

echo ""
echo "📁 Checking if chat_chain.py exists:"
find . -name "chat_chain.py" -type f

echo ""
echo "📁 Checking if chain_utils.py exists:"
find . -name "chain_utils.py" -type f

echo ""
echo "✅ Backend structure check complete!"
echo "This will help us understand what files are missing or misplaced."



