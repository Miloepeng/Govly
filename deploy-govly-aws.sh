#!/bin/bash

# Deploy Govly Application on AWS EC2
# Run this script from your govly-web directory

set -e

echo "🚀 Deploying Govly Application on AWS EC2..."

# Check if we're in the right directory
if [ ! -f "backend/main.py" ] || [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected files: backend/main.py and frontend/package.json"
    exit 1
fi

# Get EC2 public IP
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com/ 2>/dev/null || echo "UNKNOWN")
echo "🌐 EC2 Public IP: $PUBLIC_IP"

# Check environment variables
echo "📝 Checking environment variables..."
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ] || [ -z "$SEA_LION_API_KEY" ]; then
    echo "⚠️  Environment variables not set. Please set them first:"
    echo "   export SUPABASE_URL='your-supabase-url'"
    echo "   export SUPABASE_KEY='your-supabase-key'"
    echo "   export SEA_LION_API_KEY='your-sea-lion-key'"
    echo ""
    echo "   Or edit the .env files manually:"
    echo "   nano backend/.env"
    echo "   nano frontend/.env.local"
    echo ""
    read -p "   Do you want to set them now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "   Enter SUPABASE_URL: " SUPABASE_URL
        read -p "   Enter SUPABASE_KEY: " SUPABASE_KEY
        read -p "   Enter SEA_LION_API_KEY: " SEA_LION_API_KEY
        export SUPABASE_URL SUPABASE_KEY SEA_LION_API_KEY
    else
        echo "   Please set environment variables and run this script again."
        exit 1
    fi
fi

# Update environment files
echo "📝 Updating environment files..."

# Backend environment
cat > backend/.env << EOF
# Production Environment Variables
SEA_LION_API_KEY=${SEA_LION_API_KEY}
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_KEY=${SUPABASE_KEY}
USE_LLAMA_INDEX=true
SUPABASE_CHUNKS_TABLE=chunks
SUPABASE_FORMS_TABLE=forms
PORT=8000
ENVIRONMENT=production
EOF

# Frontend environment
cat > frontend/.env.local << EOF
# Production Frontend Environment
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_KEY}
NODE_ENV=production
EOF

# Stop existing PM2 processes
echo "🔄 Stopping existing PM2 processes..."
pm2 delete all 2>/dev/null || true

# Install dependencies
echo "📦 Installing dependencies..."

# Backend dependencies
cd backend
if [ ! -d "venv" ]; then
    python3.11 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt
cd ..

# Frontend dependencies
cd frontend
npm install
npm run build
cd ..

# Create PM2 ecosystem file
echo "📝 Creating PM2 configuration..."
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
echo "🚀 Starting applications with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
echo "⚠️  Run the command shown above to enable PM2 startup on boot"

# Update Nginx configuration
echo "🌐 Updating Nginx configuration..."
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

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx

echo "✅ Deployment complete!"
echo ""
echo "🌐 Your application should be accessible at:"
echo "   http://$PUBLIC_IP"
echo "   http://$PUBLIC_IP:8000/health (backend health check)"
echo "   http://$PUBLIC_IP:3000 (direct frontend)"
echo ""
echo "📊 Check application status:"
echo "   pm2 status"
echo "   pm2 logs"
echo ""
echo "🔧 Useful commands:"
echo "   pm2 restart all    # Restart both services"
echo "   pm2 stop all       # Stop both services"
echo "   pm2 monit          # Monitor applications"
echo ""
echo "🔍 Troubleshooting:"
echo "   ./troubleshoot-deployment.sh  # Run diagnostics"
echo "   ./fix-nginx-connection.sh     # Fix connection issues"

