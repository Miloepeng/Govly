#!/bin/bash

# Fix Module Resolution Script
# This script addresses the specific module resolution issue

set -e

echo "🔧 Fixing module resolution issue..."

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected file: frontend/package.json"
    exit 1
fi

cd frontend

echo "📁 Step 1: Check current directory structure..."
pwd
ls -la

echo "📁 Step 2: Check lib directory..."
if [ -d "lib" ]; then
    echo "   ✅ lib directory exists"
    ls -la lib/
else
    echo "   ❌ lib directory missing - creating it"
    mkdir -p lib
fi

echo "📁 Step 3: Check if lib files exist..."
if [ -f "lib/applicationService.ts" ]; then
    echo "   ✅ lib/applicationService.ts exists"
    echo "   File size: $(wc -c < lib/applicationService.ts) bytes"
    echo "   First few lines:"
    head -5 lib/applicationService.ts
else
    echo "   ❌ lib/applicationService.ts missing"
fi

if [ -f "lib/formAutofillService.ts" ]; then
    echo "   ✅ lib/formAutofillService.ts exists"
    echo "   File size: $(wc -c < lib/formAutofillService.ts) bytes"
    echo "   First few lines:"
    head -5 lib/formAutofillService.ts
else
    echo "   ❌ lib/formAutofillService.ts missing"
fi

if [ -f "lib/supabase.ts" ]; then
    echo "   ✅ lib/supabase.ts exists"
    echo "   File size: $(wc -c < lib/supabase.ts) bytes"
else
    echo "   ❌ lib/supabase.ts missing"
fi

echo "🔍 Step 4: Check imports in DynamicForm.tsx..."
echo "   Current imports:"
grep -n "import.*lib" components/DynamicForm.tsx

echo "🧹 Step 5: Clean and rebuild..."
rm -rf .next
rm -rf node_modules/.cache
npm cache clean --force

echo "📦 Step 6: Reinstall dependencies..."
npm install

echo "🏗️ Step 7: Try building..."
npm run build

echo "✅ Module resolution fix completed!"



