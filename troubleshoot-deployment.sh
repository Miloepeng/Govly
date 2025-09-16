#!/bin/bash

# Troubleshoot Deployment Script
# This script helps diagnose and fix deployment issues

set -e

echo "🔍 Troubleshooting deployment issues..."

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected file: frontend/package.json"
    exit 1
fi

echo "📊 Step 1: Check PM2 status..."
pm2 status

echo ""
echo "📊 Step 2: Check if applications are running..."
pm2 logs --lines 10

echo ""
echo "📊 Step 3: Check Nginx status..."
sudo systemctl status nginx

echo ""
echo "📊 Step 4: Check Nginx configuration..."
sudo nginx -t

echo ""
echo "📊 Step 5: Check if ports are listening..."
sudo netstat -tlnp | grep -E ':(80|3000|8000)'

echo ""
echo "📊 Step 6: Check Nginx error logs..."
sudo tail -20 /var/log/nginx/error.log

echo ""
echo "📊 Step 7: Test local connectivity..."
echo "   Testing backend on localhost:8000..."
curl -f http://localhost:8000/health || echo "   ❌ Backend not responding on localhost:8000"

echo "   Testing frontend on localhost:3000..."
curl -f http://localhost:3000 || echo "   ❌ Frontend not responding on localhost:3000"

echo ""
echo "📊 Step 8: Check EC2 public IP..."
curl -s http://169.254.169.254/latest/meta-data/public-ipv4
echo ""

echo "✅ Troubleshooting complete!"
echo ""
echo "🔧 Common fixes:"
echo "1. If Nginx is not running: sudo systemctl start nginx"
echo "2. If ports are not listening: Check PM2 status and restart apps"
echo "3. If security group issue: Add HTTP (80) rule to EC2 security group"
echo "4. If Nginx config error: Fix the configuration and reload"



