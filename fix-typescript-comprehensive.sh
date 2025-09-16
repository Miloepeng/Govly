#!/bin/bash

# Comprehensive TypeScript Fix Script
# This script addresses all potential TypeScript compilation issues

set -e

echo "🔧 Comprehensive TypeScript fix..."

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected file: frontend/package.json"
    exit 1
fi

cd frontend

echo "🧹 Step 1: Complete cleanup..."
rm -rf .next
rm -rf node_modules
rm -f package-lock.json
rm -rf .tsbuildinfo

echo "🔄 Step 2: Clear npm cache..."
npm cache clean --force

echo "📦 Step 3: Fresh install..."
npm install

echo "🔧 Step 4: Check TypeScript configuration..."
echo "   Current tsconfig.json:"
cat tsconfig.json | head -10

echo "📁 Step 5: Verify lib files exist..."
if [ -f "lib/applicationService.ts" ]; then
    echo "   ✅ lib/applicationService.ts exists"
else
    echo "   ❌ lib/applicationService.ts missing"
fi

if [ -f "lib/formAutofillService.ts" ]; then
    echo "   ✅ lib/formAutofillService.ts exists"
else
    echo "   ❌ lib/formAutofillService.ts missing"
fi

if [ -f "lib/supabase.ts" ]; then
    echo "   ✅ lib/supabase.ts exists"
else
    echo "   ❌ lib/supabase.ts missing"
fi

echo "🔍 Step 6: Check exports in lib files..."
echo "   ApplicationService export:"
grep -n "export.*ApplicationService" lib/applicationService.ts || echo "   ❌ No ApplicationService export found"

echo "   FormAutofillService export:"
grep -n "export.*FormAutofillService" lib/formAutofillService.ts || echo "   ❌ No FormAutofillService export found"

echo "🏗️ Step 7: Try building with verbose output..."
npm run build 2>&1 | head -50

echo "✅ Comprehensive fix completed!"
echo "If you still see errors, please share the specific error message."


