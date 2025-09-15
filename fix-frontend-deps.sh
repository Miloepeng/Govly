#!/bin/bash

# Fix Frontend Dependencies Script
# Run this to fix the caniuse-lite and other dependency issues

set -e

echo "🔧 Fixing frontend dependencies..."

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected file: frontend/package.json"
    exit 1
fi

cd frontend

echo "🗑️ Cleaning existing node_modules and package-lock.json..."
rm -rf node_modules
rm -f package-lock.json

echo "🔄 Clearing npm cache..."
npm cache clean --force

echo "📦 Installing dependencies..."
npm install

echo "🔧 Fixing caniuse-lite specifically..."
npm install caniuse-lite@latest
npx browserslist@latest --update-db

echo "🏗️ Building frontend..."
npm run build

echo "✅ Frontend dependencies fixed!"
echo "You can now continue with the deployment process."
