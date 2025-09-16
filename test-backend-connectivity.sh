#!/bin/bash

# Test Backend Connectivity Script
# This will test if the backend is actually accessible

set -e

echo "🔍 Testing Backend Connectivity..."

# Check if we're in the right directory
if [ ! -f "backend/main.py" ] || [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    exit 1
fi

echo "📊 Step 1: Checking if backend process is running..."
ps aux | grep -E "(python|main.py)" | grep -v grep

echo ""
echo "📊 Step 2: Checking port 8000..."
if command -v ss >/dev/null 2>&1; then
    sudo ss -tlnp | grep ":8000" || echo "   No process listening on port 8000"
else
    sudo netstat -tlnp | grep ":8000" || echo "   No process listening on port 8000"
fi

echo ""
echo "📊 Step 3: Testing different localhost addresses..."
echo "   Testing localhost:8000..."
curl -v http://localhost:8000/health 2>&1 | head -10

echo ""
echo "   Testing 127.0.0.1:8000..."
curl -v http://127.0.0.1:8000/health 2>&1 | head -10

echo ""
echo "   Testing 0.0.0.0:8000..."
curl -v http://0.0.0.0:8000/health 2>&1 | head -10

echo ""
echo "📊 Step 4: Testing with different curl options..."
echo "   Testing with timeout..."
timeout 10s curl http://localhost:8000/health || echo "   Timeout or error"

echo ""
echo "   Testing with verbose output..."
curl -v --connect-timeout 5 http://localhost:8000/health 2>&1 | head -20

echo ""
echo "📊 Step 5: Testing other endpoints..."
echo "   Testing /docs endpoint..."
curl -s http://localhost:8000/docs | head -5

echo ""
echo "   Testing /api endpoint..."
curl -s http://localhost:8000/api/ | head -5

echo ""
echo "📊 Step 6: Checking firewall and network..."
echo "   Checking if port 8000 is accessible..."
sudo ufw status | grep 8000 || echo "   Port 8000 not in firewall rules"

echo ""
echo "📊 Step 7: Testing from different user context..."
echo "   Testing as current user..."
curl -s http://localhost:8000/health || echo "   Failed as current user"

echo ""
echo "📊 Step 8: Checking backend logs for errors..."
echo "   Recent backend logs:"
pm2 logs govly-backend --lines 10

echo ""
echo "🔧 If backend is running but not accessible:"
echo "   1. Check if it's binding to the right interface"
echo "   2. Check if there are firewall rules blocking it"
echo "   3. Check if there are network issues"
echo "   4. Try accessing it directly: curl http://localhost:8000/health"

