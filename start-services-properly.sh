#!/bin/bash

# Start Services Properly Script
# This will start your services correctly

set -e

echo "🚀 Starting Services Properly..."

# Check if we're in the right directory
if [ ! -f "backend/main.py" ] || [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    exit 1
fi

echo "📝 Current .env files:"
echo "   Backend .env:"
cat backend/.env
echo ""
echo "   Frontend .env.local:"
cat frontend/.env.local

echo ""
echo "🔍 Checking if PM2 ecosystem file exists..."
if [ -f "ecosystem.config.js" ]; then
    echo "✅ Found ecosystem.config.js"
    cat ecosystem.config.js
else
    echo "❌ No ecosystem.config.js found, creating one..."
    
    # Get public IP
    PUBLIC_IP=$(curl -s http://checkip.amazonaws.com/ 2>/dev/null || echo "UNKNOWN")
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'govly-backend',
      cwd: './backend',
      script: 'python3.11',
      args: 'main.py',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PORT: 8000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/pm2/govly-backend-error.log',
      out_file: '/var/log/pm2/govly-backend-out.log',
      log_file: '/var/log/pm2/govly-backend.log'
    },
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
    echo "✅ Created ecosystem.config.js"
fi

echo ""
echo "🔍 Checking if log directory exists..."
if [ ! -d "/var/log/pm2" ]; then
    echo "📁 Creating log directory..."
    sudo mkdir -p /var/log/pm2
    sudo chown $USER:$USER /var/log/pm2
    echo "✅ Log directory created"
else
    echo "✅ Log directory exists"
fi

echo ""
echo "🔍 Checking if backend virtual environment exists..."
if [ ! -d "backend/venv" ]; then
    echo "🐍 Creating backend virtual environment..."
    cd backend
    python3.11 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    cd ..
    echo "✅ Backend virtual environment created"
else
    echo "✅ Backend virtual environment exists"
fi

echo ""
echo "🔍 Checking if frontend is built..."
if [ ! -d "frontend/.next" ]; then
    echo "🏗️ Building frontend..."
    cd frontend
    npm run build
    cd ..
    echo "✅ Frontend built"
else
    echo "✅ Frontend already built"
fi

echo ""
echo "🚀 Starting services with PM2..."

# Stop any existing processes
pm2 delete all 2>/dev/null || true

# Start services
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

echo ""
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "🔍 Checking if services are running..."
sleep 5

# Check if ports are listening
echo "🔌 Checking ports:"
if command -v ss >/dev/null 2>&1; then
    sudo ss -tlnp | grep -E ':(3000|8000)' || echo "   No services found on ports 3000, 8000"
else
    sudo netstat -tlnp | grep -E ':(3000|8000)' || echo "   No services found on ports 3000, 8000"
fi

echo ""
echo "🏥 Health checks:"
echo "   Backend (localhost:8000):"
curl -f http://localhost:8000/health 2>/dev/null && echo "   ✅ Backend is healthy" || echo "   ❌ Backend is not responding"

echo "   Frontend (localhost:3000):"
curl -f http://localhost:3000 2>/dev/null && echo "   ✅ Frontend is healthy" || echo "   ❌ Frontend is not responding"

echo ""
echo "📋 PM2 Logs (last 10 lines):"
pm2 logs --lines 10

echo ""
echo "🌐 Test your application:"
echo "   http://$(curl -s http://checkip.amazonaws.com/)"
echo ""
echo "🔧 If services are not running, check logs:"
echo "   pm2 logs"
echo "   pm2 logs govly-backend"
echo "   pm2 logs govly-frontend"

