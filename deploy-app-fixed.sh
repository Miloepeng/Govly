#!/bin/bash

# Fixed Application Deployment Script for AWS EC2
# Run this from your govly-web directory to start your application with PM2

set -e

echo "🚀 Deploying Govly application on AWS EC2..."

# Check if we're in the right directory
if [ ! -f "backend/main.py" ] || [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected files: backend/main.py and frontend/package.json"
    exit 1
fi

# Get EC2 public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
echo "🌐 EC2 Public IP: $PUBLIC_IP"

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

# Stop any existing PM2 processes
pm2 delete all 2>/dev/null || true

# Start applications with PM2
echo "🔄 Starting applications with PM2..."
cd backend
source venv/bin/activate
cd ..
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
echo "⚠️  Run the command shown above to enable PM2 startup on boot"

# Setup Nginx reverse proxy with dynamic IP
echo "🌐 Setting up Nginx reverse proxy..."
sudo tee /etc/nginx/sites-available/govly << EOF
server {
    listen 80;
    server_name $PUBLIC_IP _;  # Use EC2 public IP

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

echo "✅ Deployment complete!"
echo "🌐 Your application should be accessible at:"
echo "   http://$PUBLIC_IP"
echo "   http://$PUBLIC_IP:8000 (direct backend)"
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
