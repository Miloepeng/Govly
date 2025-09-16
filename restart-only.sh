#!/bin/bash

# Restart Services Only Script
# This script ONLY restarts services, it does NOT touch .env files

set -e

echo "🔄 Restarting Services Only..."

# Check if we're in the right directory
if [ ! -f "backend/main.py" ] || [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    exit 1
fi

echo "📝 Current .env files (showing first few lines):"
echo "   Backend .env:"
head -3 backend/.env
echo ""
echo "   Frontend .env.local:"
head -3 frontend/.env.local

echo ""
echo "🔄 Restarting PM2 processes..."
pm2 restart all

echo ""
echo "🔄 Restarting Nginx..."
sudo systemctl restart nginx

echo ""
echo "✅ Services restarted!"
echo ""
echo "📊 Check status:"
pm2 status

echo ""
echo "🌐 Test your application:"
echo "   http://$(curl -s http://checkip.amazonaws.com/)"
echo ""
echo "🔍 Check logs if there are issues:"
echo "   pm2 logs --lines 20"


