#!/bin/bash

# Test Full Application Script
# This will test if your complete application is working

set -e

echo "🌐 Testing Full Application..."

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
echo "📊 Step 1: Testing Backend (Local)..."
echo "   Health Check:"
curl -s http://localhost:8000/health && echo "   ✅ Backend health check OK" || echo "   ❌ Backend health check failed"

echo ""
echo "   API Documentation:"
curl -s http://localhost:8000/docs | head -1 && echo "   ✅ API docs accessible" || echo "   ❌ API docs not accessible"

echo ""
echo "📊 Step 2: Testing Frontend (Local)..."
echo "   Frontend Check:"
curl -s http://localhost:3000 | head -1 && echo "   ✅ Frontend accessible" || echo "   ❌ Frontend not accessible"

echo ""
echo "📊 Step 3: Testing Nginx (Local)..."
echo "   Nginx Check:"
curl -s http://localhost | head -1 && echo "   ✅ Nginx accessible" || echo "   ❌ Nginx not accessible"

echo ""
echo "📊 Step 4: Testing Public Access..."
echo "   Main Application (http://$PUBLIC_IP):"
curl -s http://$PUBLIC_IP | head -1 && echo "   ✅ Main application accessible publicly" || echo "   ❌ Main application not accessible publicly"

echo ""
echo "   Backend API (http://$PUBLIC_IP/api/):"
curl -s http://$PUBLIC_IP/api/ | head -1 && echo "   ✅ Backend API accessible publicly" || echo "   ❌ Backend API not accessible publicly"

echo ""
echo "   API Documentation (http://$PUBLIC_IP/docs):"
curl -s http://$PUBLIC_IP/docs | head -1 && echo "   ✅ API docs accessible publicly" || echo "   ❌ API docs not accessible publicly"

echo ""
echo "📊 Step 5: Testing Direct Port Access..."
echo "   Backend Direct (http://$PUBLIC_IP:8000/health):"
curl -s http://$PUBLIC_IP:8000/health && echo "   ✅ Backend direct access OK" || echo "   ❌ Backend direct access failed"

echo ""
echo "   Frontend Direct (http://$PUBLIC_IP:3000):"
curl -s http://$PUBLIC_IP:3000 | head -1 && echo "   ✅ Frontend direct access OK" || echo "   ❌ Frontend direct access failed"

echo ""
echo "📊 Step 6: Checking Service Status..."
pm2 status

echo ""
echo "📊 Step 7: Checking Nginx Status..."
sudo systemctl status nginx --no-pager -l

echo ""
echo "🌐 Your Application URLs:"
echo "   Main Application: http://$PUBLIC_IP"
echo "   Backend API: http://$PUBLIC_IP/api/"
echo "   API Documentation: http://$PUBLIC_IP/docs"
echo "   Direct Backend: http://$PUBLIC_IP:8000"
echo "   Direct Frontend: http://$PUBLIC_IP:3000"

echo ""
echo "🎉 If everything shows ✅, your application is successfully deployed!"
echo ""
echo "🔍 If some tests fail:"
echo "   1. Check AWS Security Group settings"
echo "   2. Check if ports 80, 3000, 8000 are open"
echo "   3. Check PM2 status: pm2 status"
echo "   4. Check Nginx status: sudo systemctl status nginx"
echo "   5. Check logs: pm2 logs"


