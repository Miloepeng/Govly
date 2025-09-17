#!/bin/bash

# Debug Environment Files Script
# This will help us figure out what's overwriting your .env files

set -e

echo "🔍 Debugging Environment Files..."

# Check if we're in the right directory
if [ ! -f "backend/main.py" ] || [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    exit 1
fi

echo "📁 Current directory: $(pwd)"
echo "📁 Directory contents:"
ls -la

echo ""
echo "📝 Current .env files:"
echo "   Backend .env:"
cat backend/.env
echo ""
echo "   Frontend .env.local:"
cat frontend/.env.local

echo ""
echo "🔍 Checking for scripts that might be overwriting files..."

# Check for any scripts that might be running
echo "📋 PM2 processes:"
pm2 status

echo ""
echo "📋 Cron jobs:"
crontab -l 2>/dev/null || echo "No cron jobs found"

echo ""
echo "📋 System services:"
sudo systemctl list-units --type=service --state=running | grep -E "(govly|nginx|pm2)" || echo "No relevant services found"

echo ""
echo "🔍 Checking file permissions and ownership:"
ls -la backend/.env
ls -la frontend/.env.local

echo ""
echo "🔍 Checking for any startup scripts:"
echo "   ~/.bashrc:"
grep -n "govly\|supabase\|env" ~/.bashrc 2>/dev/null || echo "No relevant entries in ~/.bashrc"

echo "   ~/.profile:"
grep -n "govly\|supabase\|env" ~/.profile 2>/dev/null || echo "No relevant entries in ~/.profile"

echo ""
echo "🔍 Checking for any running processes that might modify files:"
ps aux | grep -E "(govly|supabase|env)" || echo "No relevant processes found"

echo ""
echo "🔍 Checking for any scripts in the current directory:"
ls -la *.sh

echo ""
echo "🔍 Checking for any hidden files:"
ls -la .*

echo ""
echo "🔍 Checking for any backup files:"
find . -name "*.env*" -o -name "*.backup" -o -name "*.bak"

echo ""
echo "✅ Debug complete!"
echo ""
echo "🔧 To prevent files from being overwritten:"
echo "   1. Check if any scripts are running automatically"
echo "   2. Check if PM2 is restarting and overwriting files"
echo "   3. Check if there are any cron jobs"
echo "   4. Make sure you're editing the right files"
echo ""
echo "💡 Try this test:"
echo "   1. Edit the files manually"
echo "   2. Check if they're correct: cat backend/.env"
echo "   3. Wait a few minutes"
echo "   4. Check again: cat backend/.env"
echo "   5. If they changed, something is overwriting them"




