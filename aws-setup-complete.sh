#!/bin/bash

# Complete AWS EC2 Setup Script for Govly
# Run this script on your EC2 instance

set -e

echo "🚀 Starting Complete AWS EC2 Setup for Govly..."

# Check if we're in the right directory
if [ ! -f "backend/main.py" ] || [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected files: backend/main.py and frontend/package.json"
    echo "   If you're in /home/ubuntu/Govly/govly-web, you're in the right place!"
    exit 1
fi

# Get EC2 public IP
echo "🌐 Getting EC2 public IP..."
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com/ 2>/dev/null || echo "UNKNOWN")
echo "   Public IP: $PUBLIC_IP"

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python 3.11
echo "🐍 Installing Python 3.11..."
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Install system dependencies
echo "📦 Installing system dependencies..."
sudo apt install -y nginx supervisor git curl wget unzip net-tools

# Install PM2 globally
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install Python dependencies
echo "🐍 Installing Python dependencies..."
cd govly-web/backend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cd ..

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
cd frontend
npm install
cd ..

# Create environment files
echo "📝 Creating environment files..."

# Backend environment
cat > backend/.env << EOF
# Production Environment Variables
SEA_LION_API_KEY=your_sea_lion_api_key_here
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
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
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NODE_ENV=production
EOF

# Update CORS settings
echo "🔧 Updating CORS settings..."
sed -i 's/allow_origins=\[.*\]/allow_origins=["*"]/' backend/main.py

# Build frontend
echo "🏗️ Building frontend for production..."
cd frontend
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
echo "📁 Creating log directory..."
sudo mkdir -p /var/log/pm2
sudo chown $USER:$USER /var/log/pm2

# Setup Nginx
echo "🌐 Setting up Nginx..."
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

# Test Nginx configuration
sudo nginx -t

# Start services
echo "🚀 Starting services..."
sudo systemctl start nginx
sudo systemctl enable nginx

# Start applications with PM2
pm2 start ecosystem.config.js
pm2 save

# Setup PM2 to start on boot
pm2 startup
echo "⚠️  Run the command shown above to enable PM2 startup on boot"

echo "✅ Setup complete!"
echo ""
echo "📝 IMPORTANT: You need to update your environment variables:"
echo "   nano backend/.env"
echo "   nano frontend/.env.local"
echo ""
echo "🌐 Your application should be accessible at:"
echo "   http://$PUBLIC_IP"
echo "   http://$PUBLIC_IP:8000/health (backend health check)"
echo "   http://$PUBLIC_IP:3000 (direct frontend)"
echo ""
echo "📊 Check status:"
echo "   pm2 status"
echo "   sudo systemctl status nginx"
echo ""
echo "🔧 Next steps:"
echo "   1. Update environment variables with your actual credentials"
echo "   2. Restart services: pm2 restart all"
echo "   3. Test your application"
