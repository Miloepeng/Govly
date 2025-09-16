#!/bin/bash

# Prevent Environment Files from Being Overwritten
# This script will help you protect your .env files

set -e

echo "🛡️ Protecting Environment Files..."

# Check if we're in the right directory
if [ ! -f "backend/main.py" ] || [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    exit 1
fi

echo "📝 Step 1: Creating backup of current .env files..."
cp backend/.env backend/.env.backup
cp frontend/.env.local frontend/.env.local.backup

echo "📝 Step 2: Making .env files read-only..."
chmod 444 backend/.env
chmod 444 frontend/.env.local

echo "📝 Step 3: Checking file permissions..."
ls -la backend/.env
ls -la frontend/.env.local

echo "📝 Step 4: Stopping any processes that might overwrite files..."
pm2 stop all 2>/dev/null || true

echo "📝 Step 5: Checking for any cron jobs that might be running..."
crontab -l 2>/dev/null || echo "No cron jobs found"

echo ""
echo "✅ Environment files are now protected!"
echo ""
echo "🔧 To edit them:"
echo "   1. Make them writable: chmod 644 backend/.env frontend/.env.local"
echo "   2. Edit them: nano backend/.env"
echo "   3. Make them read-only again: chmod 444 backend/.env frontend/.env.local"
echo ""
echo "🔍 To test if something is overwriting them:"
echo "   1. Make them writable: chmod 644 backend/.env frontend/.env.local"
echo "   2. Edit them with your real values"
echo "   3. Make them read-only: chmod 444 backend/.env frontend/.env.local"
echo "   4. Wait and check if they change"
echo ""
echo "💡 If they still change, something is running with sudo/root privileges"


