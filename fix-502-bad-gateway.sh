#!/bin/bash

# Fix 502 Bad Gateway Script
# This will diagnose and fix the Nginx 502 error

set -e

echo "🔧 Fixing 502 Bad Gateway Error..."

# Check if we're in the right directory
if [ ! -f "backend/main.py" ] || [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    exit 1
fi

echo "📊 Step 1: Checking PM2 Status..."
pm2 status

echo ""
echo "📊 Step 2: Checking if services are running on correct ports..."
if command -v ss >/dev/null 2>&1; then
    sudo ss -tlnp | grep -E ':(80|3000|8000)' || echo "   No services found on ports 80, 3000, 8000"
else
    sudo netstat -tlnp | grep -E ':(80|3000|8000)' || echo "   No services found on ports 80, 3000, 8000"
fi

echo ""
echo "📊 Step 3: Testing direct service access..."
echo "   Backend (localhost:8000):"
curl -f http://localhost:8000/health 2>/dev/null && echo "   ✅ Backend accessible" || echo "   ❌ Backend not accessible"

echo "   Frontend (localhost:3000):"
curl -f http://localhost:3000 2>/dev/null && echo "   ✅ Frontend accessible" || echo "   ❌ Frontend not accessible"

echo ""
echo "📊 Step 4: Checking Nginx configuration..."
sudo nginx -t

echo ""
echo "📊 Step 5: Checking Nginx error logs..."
echo "   Recent Nginx errors:"
sudo tail -10 /var/log/nginx/error.log

echo ""
echo "📊 Step 6: Checking Nginx access logs..."
echo "   Recent Nginx access:"
sudo tail -5 /var/log/nginx/access.log

echo ""
echo "📊 Step 7: Checking Nginx status..."
sudo systemctl status nginx --no-pager -l

echo ""
echo "🔧 Step 8: Fixing the issue..."

# Check if services are running
if ! curl -f http://localhost:8000/health 2>/dev/null; then
    echo "   Backend not accessible, restarting..."
    pm2 restart govly-backend
    sleep 5
fi

if ! curl -f http://localhost:3000 2>/dev/null; then
    echo "   Frontend not accessible, restarting..."
    pm2 restart govly-frontend
    sleep 5
fi

# Restart Nginx
echo "   Restarting Nginx..."
sudo systemctl restart nginx

echo ""
echo "📊 Step 9: Testing after fixes..."
sleep 3

echo "   Backend test:"
curl -f http://localhost:8000/health 2>/dev/null && echo "   ✅ Backend working" || echo "   ❌ Backend still not working"

echo "   Frontend test:"
curl -f http://localhost:3000 2>/dev/null && echo "   ✅ Frontend working" || echo "   ❌ Frontend still not working"

echo "   Nginx test:"
curl -f http://localhost 2>/dev/null && echo "   ✅ Nginx working" || echo "   ❌ Nginx still not working"

echo ""
echo "📊 Step 10: Final status check..."
pm2 status
sudo systemctl status nginx --no-pager -l

echo ""
echo "🌐 Test your application:"
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com/)
echo "   http://$PUBLIC_IP"

echo ""
echo "🔍 If still getting 502 error:"
echo "   1. Check AWS Security Group - ensure port 80 is open"
echo "   2. Check if services are binding to correct interfaces"
echo "   3. Check Nginx configuration: sudo nginx -t"
echo "   4. Check service logs: pm2 logs"
echo "   5. Check Nginx logs: sudo tail -f /var/log/nginx/error.log"

