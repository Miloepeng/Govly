#!/bin/bash

# Fix Frontend Launching Issue Script
# This will fix the frontend that's stuck in "launching" status

set -e

echo "🔧 Fixing Frontend Launching Issue..."

# Check if we're in the right directory
if [ ! -f "backend/main.py" ] || [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    exit 1
fi

echo "📊 Step 1: Stopping Stuck Frontend Process..."
pm2 stop govly-frontend 2>/dev/null || true
pm2 delete govly-frontend 2>/dev/null || true

echo ""
echo "📊 Step 2: Checking Frontend Directory..."
cd frontend
echo "   Current directory: $(pwd)"
echo "   Contents:"
ls -la

echo ""
echo "📊 Step 3: Checking Frontend Dependencies..."
echo "   Checking node_modules..."
if [ -d "node_modules" ]; then
    echo "   ✅ node_modules exists"
    echo "   Checking Next.js installation..."
    ls -la node_modules/.bin/next 2>/dev/null && echo "   ✅ Next.js binary exists" || echo "   ❌ Next.js binary missing"
else
    echo "   ❌ node_modules missing, installing..."
    npm install
fi

echo ""
echo "📊 Step 4: Checking Frontend Build..."
echo "   Checking .next directory..."
if [ -d ".next" ]; then
    echo "   ✅ .next directory exists"
    echo "   Contents:"
    ls -la .next/
else
    echo "   ❌ .next directory missing, building..."
    npm run build
fi

echo ""
echo "📊 Step 5: Checking Frontend Environment..."
echo "   .env.local content:"
cat .env.local

echo ""
echo "📊 Step 6: Testing Frontend Startup Manually..."
echo "   Testing npm start..."
timeout 15s npm start 2>&1 || echo "   npm start failed or timed out"

echo ""
echo "📊 Step 7: Checking for Port Conflicts..."
echo "   Checking what's using port 3000..."
sudo lsof -i :3000 2>/dev/null || echo "   No process using port 3000"

echo ""
echo "📊 Step 8: Checking Frontend Configuration..."

# Check if Next.js config is correct
echo "   Checking next.config.js..."
if [ -f "next.config.js" ]; then
    echo "   ✅ next.config.js exists"
    cat next.config.js
else
    echo "   ❌ next.config.js missing"
fi

# Check package.json scripts
echo "   Checking package.json scripts..."
grep -A 5 '"scripts"' package.json

echo ""
echo "📊 Step 9: Fixing Frontend Configuration..."

# Create a simple next.config.js if missing
if [ ! -f "next.config.js" ]; then
    echo "   Creating next.config.js..."
    cat > next.config.js << EOF
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
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
fi

# Check if package.json has the right scripts
echo "   Checking package.json scripts..."
if ! grep -q '"start"' package.json; then
    echo "   Adding start script to package.json..."
    # This is a backup - usually package.json should have start script
    echo "   ⚠️  package.json might be missing start script"
fi

echo ""
echo "📊 Step 10: Starting Frontend with PM2..."
cd ..

# Create a simple PM2 config for frontend only
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
echo "📊 Step 11: Testing Frontend After Fix..."
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
echo "📊 Step 12: Checking Frontend Logs..."
pm2 logs govly-frontend --lines 10

echo ""
echo "🔍 If frontend is still not working:"
echo "   1. Check if port 3000 is available: sudo lsof -i :3000"
echo "   2. Check frontend logs: pm2 logs govly-frontend"
echo "   3. Try starting frontend manually: cd frontend && npm start"
echo "   4. Check if there are any errors in the build process"
echo "   5. Check if Next.js is configured correctly"
echo "   6. Check if there are any dependency issues"


