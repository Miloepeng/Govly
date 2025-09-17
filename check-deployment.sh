#!/bin/bash

# Check Deployment Status Script
# This will verify if your website is properly deployed

set -e

echo "🔍 Checking Deployment Status..."

# Check if we're in the right directory
if [ ! -f "backend/main.py" ] || [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    exit 1
fi

# Get public IP
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com/ 2>/dev/null || echo "UNKNOWN")
echo "🌐 EC2 Public IP: $PUBLIC_IP"

echo ""
echo "📊 Step 1: Checking PM2 Status..."
pm2 status

echo ""
echo "📊 Step 2: Checking Nginx Status..."
sudo systemctl status nginx --no-pager -l

echo ""
echo "📊 Step 3: Checking Port Status..."
if command -v ss >/dev/null 2>&1; then
    sudo ss -tlnp | grep -E ':(80|3000|8000)' || echo "   No services found on ports 80, 3000, 8000"
else
    sudo netstat -tlnp | grep -E ':(80|3000|8000)' || echo "   No services found on ports 80, 3000, 8000"
fi

echo ""
echo "📊 Step 4: Testing Local Connectivity..."
echo "   Backend (localhost:8000):"
if curl -f http://localhost:8000/health 2>/dev/null; then
    echo "   ✅ Backend is responding locally"
else
    echo "   ❌ Backend is not responding locally"
fi

echo "   Frontend (localhost:3000):"
if curl -f http://localhost:3000 2>/dev/null; then
    echo "   ✅ Frontend is responding locally"
else
    echo "   ❌ Frontend is not responding locally"
fi

echo ""
echo "📊 Step 5: Testing Public Connectivity..."
echo "   Main Application (http://$PUBLIC_IP):"
if curl -f http://$PUBLIC_IP 2>/dev/null; then
    echo "   ✅ Main application is accessible publicly"
else
    echo "   ❌ Main application is not accessible publicly"
fi

echo "   Backend API (http://$PUBLIC_IP:8000/health):"
if curl -f http://$PUBLIC_IP:8000/health 2>/dev/null; then
    echo "   ✅ Backend API is accessible publicly"
else
    echo "   ❌ Backend API is not accessible publicly"
fi

echo "   Frontend Direct (http://$PUBLIC_IP:3000):"
if curl -f http://$PUBLIC_IP:3000 2>/dev/null; then
    echo "   ✅ Frontend is accessible directly"
else
    echo "   ❌ Frontend is not accessible directly"
fi

echo ""
echo "📊 Step 6: Checking Recent Logs..."
echo "   PM2 Logs (last 10 lines):"
pm2 logs --lines 10

echo ""
echo "📊 Step 7: Checking Nginx Logs..."
echo "   Nginx Error Logs (last 5 lines):"
sudo tail -5 /var/log/nginx/error.log

echo ""
echo "📊 Step 8: Testing API Endpoints..."
echo "   API Health Check:"
curl -s http://localhost:8000/health | head -1

echo "   API Documentation:"
curl -s http://localhost:8000/docs | head -1

echo ""
echo "🌐 Your Application URLs:"
echo "   Main Application: http://$PUBLIC_IP"
echo "   Backend API: http://$PUBLIC_IP/api/"
echo "   API Documentation: http://$PUBLIC_IP/docs"
echo "   Direct Backend: http://$PUBLIC_IP:8000"
echo "   Direct Frontend: http://$PUBLIC_IP:3000"

echo ""
echo "🔍 If something is not working:"
echo "   1. Check PM2 logs: pm2 logs"
echo "   2. Check Nginx logs: sudo tail -f /var/log/nginx/error.log"
echo "   3. Check if ports are open in AWS Security Group"
echo "   4. Check if services are running: pm2 status"




