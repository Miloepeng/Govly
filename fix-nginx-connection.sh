#!/bin/bash

# Fix Nginx Connection Issues Script
# This script troubleshoots and fixes connection problems

set -e

echo "🔧 Fixing Nginx connection issues..."

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected file: frontend/package.json"
    exit 1
fi

echo "📊 Step 1: Checking PM2 status..."
pm2 status

echo ""
echo "📊 Step 2: Checking if applications are running on correct ports..."
# Try ss first, then install net-tools if needed
if command -v ss >/dev/null 2>&1; then
    sudo ss -tlnp | grep -E ':(80|3000|8000)' || echo "   No processes found on ports 80, 3000, 8000"
else
    echo "   Installing net-tools..."
    sudo apt update && sudo apt install -y net-tools
    sudo netstat -tlnp | grep -E ':(80|3000|8000)' || echo "   No processes found on ports 80, 3000, 8000"
fi

echo ""
echo "📊 Step 3: Checking Nginx status..."
sudo systemctl status nginx

echo ""
echo "📊 Step 4: Checking Nginx configuration..."
sudo nginx -t

echo ""
echo "📊 Step 5: Checking Nginx error logs..."
sudo tail -20 /var/log/nginx/error.log

echo ""
echo "📊 Step 6: Testing local connectivity..."
echo "   Testing backend on localhost:8000..."
curl -f http://localhost:8000/health || echo "   ❌ Backend not responding on localhost:8000"

echo "   Testing frontend on localhost:3000..."
curl -f http://localhost:3000 || echo "   ❌ Frontend not responding on localhost:3000"

echo ""
echo "📊 Step 7: Checking EC2 public IP..."
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
echo "   Public IP: $PUBLIC_IP"

echo ""
echo "📊 Step 8: Testing direct backend access..."
curl -f http://$PUBLIC_IP:8000/health || echo "   ❌ Backend not accessible on public IP:8000"

echo ""
echo "📊 Step 9: Testing direct frontend access..."
curl -f http://$PUBLIC_IP:3000 || echo "   ❌ Frontend not accessible on public IP:3000"

echo ""
echo "📊 Step 10: Checking security group (manual check needed)..."
echo "   ⚠️  Please check your AWS EC2 Security Group:"
echo "   - HTTP (80) from 0.0.0.0/0"
echo "   - HTTPS (443) from 0.0.0.0/0"
echo "   - Custom TCP (3000) from 0.0.0.0/0"
echo "   - Custom TCP (8000) from 0.0.0.0/0"

echo ""
echo "🔧 Step 11: Attempting to fix Nginx..."
sudo systemctl start nginx
sudo systemctl enable nginx

echo ""
echo "📊 Step 12: Final status check..."
sudo systemctl status nginx --no-pager -l
pm2 status

echo ""
echo "✅ Troubleshooting complete!"
echo ""
echo "🌐 Try accessing your application at:"
echo "   http://$PUBLIC_IP"
echo "   http://$PUBLIC_IP:8000 (direct backend)"
echo "   http://$PUBLIC_IP:3000 (direct frontend)"
echo ""
echo "🔧 If still not working, check:"
echo "   1. AWS Security Group settings"
echo "   2. PM2 status: pm2 status"
echo "   3. Nginx status: sudo systemctl status nginx"
echo "   4. Application logs: pm2 logs"
