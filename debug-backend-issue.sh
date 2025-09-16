#!/bin/bash

# Debug Backend Issue Script
# This will help identify why the backend isn't responding

set -e

echo "🔍 Debugging Backend Issue..."

# Check if we're in the right directory
if [ ! -f "backend/main.py" ] || [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    exit 1
fi

echo "📊 Step 1: Checking PM2 Status..."
pm2 status

echo ""
echo "📊 Step 2: Checking Backend Process..."
ps aux | grep -E "(python|main.py)" | grep -v grep

echo ""
echo "📊 Step 3: Checking Port 8000..."
if command -v ss >/dev/null 2>&1; then
    sudo ss -tlnp | grep ":8000" || echo "   No process listening on port 8000"
else
    sudo netstat -tlnp | grep ":8000" || echo "   No process listening on port 8000"
fi

echo ""
echo "📊 Step 4: Checking Backend Logs..."
echo "   PM2 Backend Logs:"
pm2 logs govly-backend --lines 20

echo ""
echo "📊 Step 5: Checking Backend Environment..."
echo "   Backend .env file:"
cat backend/.env

echo ""
echo "📊 Step 6: Testing Backend Manually..."
cd backend
echo "   Current directory: $(pwd)"
echo "   Checking if virtual environment exists..."
if [ -d "venv" ]; then
    echo "   ✅ Virtual environment exists"
    echo "   Activating virtual environment..."
    source venv/bin/activate
    echo "   Checking Python version..."
    python --version
    echo "   Checking if main.py exists..."
    ls -la main.py
    echo "   Testing if main.py can be imported..."
    python -c "import main; print('✅ main.py imports successfully')" 2>/dev/null || echo "❌ main.py has import errors"
else
    echo "   ❌ Virtual environment does not exist"
fi
cd ..

echo ""
echo "📊 Step 7: Checking Backend Dependencies..."
cd backend
if [ -d "venv" ]; then
    source venv/bin/activate
    echo "   Checking installed packages..."
    pip list | grep -E "(fastapi|uvicorn|supabase)" || echo "   No relevant packages found"
fi
cd ..

echo ""
echo "📊 Step 8: Testing Backend Startup..."
echo "   Attempting to start backend manually..."
cd backend
if [ -d "venv" ]; then
    source venv/bin/activate
    echo "   Starting backend with uvicorn..."
    timeout 10s python main.py 2>&1 || echo "   Backend startup failed or timed out"
fi
cd ..

echo ""
echo "🔧 Troubleshooting Steps:"
echo "   1. Check if backend virtual environment exists: ls -la backend/venv"
echo "   2. Check if backend dependencies are installed: cd backend && source venv/bin/activate && pip list"
echo "   3. Check if main.py has syntax errors: cd backend && python -m py_compile main.py"
echo "   4. Check if environment variables are set correctly"
echo "   5. Try starting backend manually: cd backend && source venv/bin/activate && python main.py"


