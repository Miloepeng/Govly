#!/bin/bash

# Fix Frontend Issue Script
# This will diagnose and fix the frontend connectivity problem

set -e

echo "🔧 Fixing Frontend Issue..."

# Check if we're in the right directory
if [ ! -f "backend/main.py" ] || [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    exit 1
fi

echo "📊 Step 1: Checking PM2 Frontend Status..."
pm2 status | grep frontend

echo ""
echo "📊 Step 2: Checking Frontend Process..."
ps aux | grep -E "(node|npm|next)" | grep -v grep

echo ""
echo "📊 Step 3: Checking Port 3000..."
if command -v ss >/dev/null 2>&1; then
    sudo ss -tlnp | grep ":3000" || echo "   No process listening on port 3000"
else
    sudo netstat -tlnp | grep ":3000" || echo "   No process listening on port 3000"
fi

echo ""
echo "📊 Step 4: Checking Frontend Logs..."
echo "   PM2 Frontend Logs:"
pm2 logs govly-frontend --lines 20

echo ""
echo "📊 Step 5: Checking Frontend Environment..."
echo "   Frontend .env.local:"
cat frontend/.env.local

echo ""
echo "📊 Step 6: Checking Frontend Build..."
echo "   Frontend .next directory:"
ls -la frontend/.next 2>/dev/null || echo "   .next directory not found"

echo ""
echo "📊 Step 7: Testing Frontend Manually..."
cd frontend
echo "   Current directory: $(pwd)"
echo "   Checking if node_modules exists..."
if [ -d "node_modules" ]; then
    echo "   ✅ node_modules exists"
else
    echo "   ❌ node_modules missing, installing..."
    npm install
fi

echo "   Checking if package.json exists..."
if [ -f "package.json" ]; then
    echo "   ✅ package.json exists"
    echo "   Package.json content:"
    head -10 package.json
else
    echo "   ❌ package.json missing"
fi

echo "   Checking if .next directory exists..."
if [ -d ".next" ]; then
    echo "   ✅ .next directory exists"
else
    echo "   ❌ .next directory missing, building..."
    npm run build
fi

echo "   Testing npm start..."
timeout 10s npm start 2>&1 || echo "   npm start failed or timed out"
cd ..

echo ""
echo "🔧 Step 8: Fixing Frontend..."

# Stop frontend process
pm2 stop govly-frontend 2>/dev/null || true
pm2 delete govly-frontend 2>/dev/null || true

# Rebuild frontend
echo "   Rebuilding frontend..."
cd frontend
npm install
npm run build
cd ..

# Restart frontend
echo "   Starting frontend..."
pm2 start ecosystem.config.js --only govly-frontend

echo ""
echo "📊 Step 9: Testing Frontend After Fix..."
sleep 5
curl -f http://localhost:3000 2>/dev/null && echo "   ✅ Frontend now accessible" || echo "   ❌ Frontend still not accessible"

echo ""
echo "📊 Step 10: Final Status Check..."
pm2 status

echo ""
echo "🔍 If frontend is still not working:"
echo "   1. Check if port 3000 is available: sudo netstat -tlnp | grep :3000"
echo "   2. Check frontend logs: pm2 logs govly-frontend"
echo "   3. Try starting frontend manually: cd frontend && npm start"
echo "   4. Check if there are any errors in the build process"
echo "   5. Check if Next.js is configured correctly"




