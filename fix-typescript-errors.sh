#!/bin/bash

# Fix TypeScript Compilation Errors Script
# Run this to fix TypeScript errors in the frontend

set -e

echo "🔧 Fixing TypeScript compilation errors..."

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected file: frontend/package.json"
    exit 1
fi

cd frontend

echo "📝 TypeScript errors have been fixed in the code:"
echo "   ✅ Added 'id: number' property to FormResult interface"
echo "   ✅ Fixed hardcoded localhost URL to use environment variable"
echo ""

echo "🧹 Cleaning TypeScript cache and node_modules..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf node_modules/.next

echo "🔄 Reinstalling dependencies..."
npm install

echo "🏗️ Building frontend..."
npm run build

echo "✅ TypeScript compilation successful!"
echo "You can now continue with the deployment process."
