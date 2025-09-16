#!/bin/bash

# Diagnose and Fix AWS EC2 Issues
# Run this script on your EC2 instance

set -e

echo "🔍 Diagnosing AWS EC2 Issues..."

# Check if we're in the right directory
if [ ! -f "backend/main.py" ] || [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected files: backend/main.py and frontend/package.json"
    exit 1
fi

echo "📊 Step 1: Checking EC2 metadata access..."
# Try different ways to get the public IP
echo "   Trying metadata service..."
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "FAILED")
if [ "$PUBLIC_IP" = "FAILED" ] || [[ "$PUBLIC_IP" == *"html"* ]]; then
    echo "   Metadata service failed, trying alternative method..."
    PUBLIC_IP=$(curl -s http://checkip.amazonaws.com/ 2>/dev/null || echo "UNKNOWN")
fi
echo "   Public IP: $PUBLIC_IP"

echo "📊 Step 2: Checking PM2 status..."
pm2 status

echo "📊 Step 3: Checking if services are running..."
# Check if ports are in use
if command -v ss >/dev/null 2>&1; then
    echo "   Ports in use:"
    sudo ss -tlnp | grep -E ':(80|3000|8000)' || echo "   No services found on ports 80, 3000, 8000"
else
    echo "   Installing net-tools..."
    sudo apt update && sudo apt install -y net-tools
    sudo netstat -tlnp | grep -E ':(80|3000|8000)' || echo "   No services found on ports 80, 3000, 8000"
fi

echo "📊 Step 4: Checking environment variables..."
echo "   SUPABASE_URL: ${SUPABASE_URL:-NOT_SET}"
echo "   SUPABASE_KEY: ${SUPABASE_KEY:-NOT_SET}"
echo "   SEA_LION_API_KEY: ${SEA_LION_API_KEY:-NOT_SET}"

echo "📊 Step 5: Checking Nginx status..."
sudo systemctl status nginx --no-pager -l

echo ""
echo "🔧 Starting fixes..."

# Fix 1: Set environment variables if not set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo "📝 Setting environment variables..."
    echo "   Please set your environment variables:"
    echo "   export SUPABASE_URL='your-supabase-url'"
    echo "   export SUPABASE_KEY='your-supabase-key'"
    echo "   export SEA_LION_API_KEY='your-sea-lion-key'"
    echo ""
    echo "   Or create a .env file in the backend directory with:"
    echo "   SUPABASE_URL=your-supabase-url"
    echo "   SUPABASE_KEY=your-supabase-key"
    echo "   SEA_LION_API_KEY=your-sea-lion-key"
    echo ""
    read -p "   Do you want to set them now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "   Enter SUPABASE_URL: " SUPABASE_URL
        read -p "   Enter SUPABASE_KEY: " SUPABASE_KEY
        read -p "   Enter SEA_LION_API_KEY: " SEA_LION_API_KEY
        export SUPABASE_URL SUPABASE_KEY SEA_LION_API_KEY
    fi
fi

# Fix 2: Update frontend environment
echo "📝 Updating frontend environment..."
cat > frontend/.env.local << EOF
# Production Frontend Environment
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL:-your-supabase-url}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_KEY:-your-supabase-key}
NODE_ENV=production
EOF

# Fix 3: Update backend environment
echo "📝 Updating backend environment..."
cat > backend/.env << EOF
# Production Environment Variables
SEA_LION_API_KEY=${SEA_LION_API_KEY:-your-sea-lion-key}
SUPABASE_URL=${SUPABASE_URL:-your-supabase-url}
SUPABASE_KEY=${SUPABASE_KEY:-your-supabase-key}
USE_LLAMA_INDEX=true
SUPABASE_CHUNKS_TABLE=chunks
SUPABASE_FORMS_TABLE=forms
PORT=8000
ENVIRONMENT=production
EOF

# Fix 4: Update backend CORS
echo "📝 Updating backend CORS settings..."
# Create a backup
cp backend/main.py backend/main.py.backup

# Update CORS to allow all origins
sed -i 's/allow_origins=\[.*\]/allow_origins=["*"]/' backend/main.py

# Fix 5: Start services
echo "📝 Starting services..."

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

# Create log directory
sudo mkdir -p /var/log/pm2
sudo chown $USER:$USER /var/log/pm2

# Start applications with PM2
echo "🔄 Starting applications with PM2..."
cd backend
if [ ! -d "venv" ]; then
    echo "   Creating Python virtual environment..."
    python3.11 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt
cd ..
pm2 start ecosystem.config.js

# Fix 6: Setup Nginx
echo "📝 Setting up Nginx..."
sudo tee /etc/nginx/sites-available/govly << EOF
server {
    listen 80;
    server_name $PUBLIC_IP _;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend docs
    location /docs {
        proxy_pass http://localhost:8000/docs;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/govly /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx

echo "✅ Diagnosis and fixes complete!"
echo ""
echo "📊 Final status check:"
pm2 status
sudo systemctl status nginx --no-pager -l

echo ""
echo "🌐 Test your application at:"
echo "   http://$PUBLIC_IP"
echo "   http://$PUBLIC_IP:8000/health (backend health check)"
echo "   http://$PUBLIC_IP:3000 (direct frontend)"
echo ""
echo "🔍 If still not working, check logs:"
echo "   pm2 logs"
echo "   sudo tail -f /var/log/nginx/error.log"

