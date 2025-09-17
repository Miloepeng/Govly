#!/bin/bash

# Fix Frontend Final Issues Script
# This will fix the missing BUILD_ID and config issues

set -e

echo "🔧 Fixing Frontend Final Issues..."

# Check if we're in the right directory
if [ ! -f "backend/main.py" ] || [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    exit 1
fi

echo "📊 Step 1: Stopping Frontend Process..."
pm2 stop govly-frontend 2>/dev/null || true
pm2 delete govly-frontend 2>/dev/null || true

echo ""
echo "📊 Step 2: Fixing Frontend Configuration..."
cd frontend

# Fix next.config.js - remove deprecated appDir option
echo "   Fixing next.config.js..."
cat > next.config.js << EOF
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // In production, Nginx handles the API routing
    // Only use rewrites for local development
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:8000/api/:path*',
        },
      ]
    }
    return []
  },
}

module.exports = nextConfig
EOF

echo "   ✅ Fixed next.config.js"

echo ""
echo "📊 Step 3: Rebuilding Frontend..."
echo "   Cleaning previous build..."
rm -rf .next

echo "   Installing dependencies..."
npm install

echo "   Building frontend..."
npm run build

echo "   ✅ Frontend rebuilt successfully"

echo ""
echo "📊 Step 4: Checking Build Files..."
echo "   Checking .next directory..."
ls -la .next/

echo "   Checking BUILD_ID file..."
if [ -f ".next/BUILD_ID" ]; then
    echo "   ✅ BUILD_ID file exists"
    cat .next/BUILD_ID
else
    echo "   ❌ BUILD_ID file still missing"
fi

echo ""
echo "📊 Step 5: Testing Frontend Startup Manually..."
echo "   Testing npm start..."
timeout 15s npm start 2>&1 || echo "   npm start failed or timed out"

echo ""
echo "📊 Step 6: Starting Frontend with PM2..."
cd ..

# Create PM2 config for frontend
cat > frontend-ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'govly-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/pm2/govly-frontend-error.log',
      out_file: '/var/log/pm2/govly-frontend-out.log',
      log_file: '/var/log/pm2/govly-frontend.log'
    }
  ]
};
EOF

# Start frontend
pm2 start frontend-ecosystem.config.js

echo ""
echo "📊 Step 7: Testing Frontend After Fix..."
sleep 10

echo "   Checking PM2 status..."
pm2 status

echo "   Checking port 3000..."
if command -v ss >/dev/null 2>&1; then
    sudo ss -tlnp | grep ":3000" || echo "   No process listening on port 3000"
else
    sudo netstat -tlnp | grep ":3000" || echo "   No process listening on port 3000"
fi

echo "   Testing frontend access..."
curl -f http://localhost:3000 2>/dev/null && echo "   ✅ Frontend accessible" || echo "   ❌ Frontend still not accessible"

echo ""
echo "📊 Step 8: Checking Frontend Logs..."
pm2 logs govly-frontend --lines 10

echo ""
echo "📊 Step 9: Testing Full Application..."
echo "   Testing backend..."
curl -f http://localhost:8000/health 2>/dev/null && echo "   ✅ Backend accessible" || echo "   ❌ Backend not accessible"

echo "   Testing frontend..."
curl -f http://localhost:3000 2>/dev/null && echo "   ✅ Frontend accessible" || echo "   ❌ Frontend not accessible"

echo "   Testing Nginx..."
curl -f http://localhost 2>/dev/null && echo "   ✅ Nginx accessible" || echo "   ❌ Nginx not accessible"

echo ""
echo "🌐 Test your application:"
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com/)
echo "   http://$PUBLIC_IP"

echo ""
echo "🔍 If frontend is still not working:"
echo "   1. Check frontend logs: pm2 logs govly-frontend"
echo "   2. Check if BUILD_ID file exists: ls -la frontend/.next/BUILD_ID"
echo "   3. Try starting frontend manually: cd frontend && npm start"
echo "   4. Check if there are any errors in the build process"




