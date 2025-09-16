#!/bin/bash

# Quick Fix for AWS EC2 Frontend-Backend Connection Issues
# Run this script on your EC2 instance

set -e

echo "🔧 Quick Fix for AWS EC2 Connection Issues..."

# Get EC2 public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
echo "🌐 EC2 Public IP: $PUBLIC_IP"

# Check if we're in the right directory
if [ ! -f "backend/main.py" ] || [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected files: backend/main.py and frontend/package.json"
    exit 1
fi

echo "📝 Step 1: Updating frontend environment..."
# Update frontend environment to use relative API URLs
cat > frontend/.env.local << EOF
# Production Frontend Environment
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_KEY}
NODE_ENV=production
EOF

echo "📝 Step 2: Updating backend CORS settings..."
# Update backend CORS to allow all origins temporarily
sed -i 's/allow_origins=\[.*\]/allow_origins=["*"]/' backend/main.py

echo "📝 Step 3: Rebuilding frontend..."
cd frontend
npm run build
cd ..

echo "📝 Step 4: Restarting services..."
pm2 restart all

echo "📝 Step 5: Updating Nginx configuration..."
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

echo "✅ Quick fix complete!"
echo ""
echo "🌐 Test your application at:"
echo "   http://$PUBLIC_IP"
echo "   http://$PUBLIC_IP:8000/health (backend health check)"
echo "   http://$PUBLIC_IP:3000 (direct frontend)"
echo ""
echo "📊 Check status:"
echo "   pm2 status"
echo "   pm2 logs --lines 20"
echo ""
echo "🔍 If still not working, run:"
echo "   ./troubleshoot-deployment.sh"
