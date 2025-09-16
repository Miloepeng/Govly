#!/bin/bash

# Preserve Environment Values Script
# This script will NOT overwrite your manually edited .env files

set -e

echo "🛡️ Preserving Your Environment Values..."

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
echo "🔍 Checking if files contain placeholder values..."

# Check if files contain placeholder values
if grep -q "your_supabase_project_url\|your_supabase_anon_key\|your_sea_lion_api_key" backend/.env; then
    echo "⚠️  Backend .env contains placeholder values"
    BACKEND_HAS_PLACEHOLDERS=true
else
    echo "✅ Backend .env looks good (no placeholders found)"
    BACKEND_HAS_PLACEHOLDERS=false
fi

if grep -q "your_supabase_project_url\|your_supabase_anon_key\|your_sea_lion_api_key" frontend/.env.local; then
    echo "⚠️  Frontend .env.local contains placeholder values"
    FRONTEND_HAS_PLACEHOLDERS=true
else
    echo "✅ Frontend .env.local looks good (no placeholders found)"
    FRONTEND_HAS_PLACEHOLDERS=false
fi

echo ""
if [ "$BACKEND_HAS_PLACEHOLDERS" = false ] && [ "$FRONTEND_HAS_PLACEHOLDERS" = false ]; then
    echo "🎉 Great! Your .env files already have real values!"
    echo "   No need to overwrite them."
    echo ""
    echo "🔄 Just restarting services..."
    pm2 restart all
    echo "✅ Services restarted!"
    echo ""
    echo "🌐 Test your application:"
    echo "   http://$(curl -s http://checkip.amazonaws.com/)"
    exit 0
fi

echo "🔧 Some files still have placeholder values."
echo "   This script will help you fix ONLY the placeholder values"
echo "   while preserving any real values you've already set."
echo ""

# Function to update only placeholder values
update_placeholders() {
    local file=$1
    local placeholder=$2
    local new_value=$3
    
    if grep -q "$placeholder" "$file"; then
        echo "   Updating $placeholder in $file"
        sed -i "s|$placeholder|$new_value|g" "$file"
    fi
}

# Get user input for any missing values
echo "📝 Please provide the values for any placeholders:"

if [ "$BACKEND_HAS_PLACEHOLDERS" = true ]; then
    echo "   Backend .env needs updating..."
    read -p "   Enter your Supabase URL: " SUPABASE_URL_INPUT
    read -p "   Enter your Supabase anon key: " SUPABASE_KEY_INPUT
    read -p "   Enter your SEA-LION API key: " SEA_LION_KEY_INPUT
    
    # Update only placeholder values in backend .env
    update_placeholders "backend/.env" "your_supabase_project_url" "$SUPABASE_URL_INPUT"
    update_placeholders "backend/.env" "your_supabase_anon_key" "$SUPABASE_KEY_INPUT"
    update_placeholders "backend/.env" "your_sea_lion_api_key" "$SEA_LION_KEY_INPUT"
fi

if [ "$FRONTEND_HAS_PLACEHOLDERS" = true ]; then
    echo "   Frontend .env.local needs updating..."
    if [ "$BACKEND_HAS_PLACEHOLDERS" = true ]; then
        echo "   Using the same values from backend..."
        SUPABASE_URL_INPUT=${SUPABASE_URL_INPUT:-"$SUPABASE_URL_INPUT"}
        SUPABASE_KEY_INPUT=${SUPABASE_KEY_INPUT:-"$SUPABASE_KEY_INPUT"}
    else
        read -p "   Enter your Supabase URL: " SUPABASE_URL_INPUT
        read -p "   Enter your Supabase anon key: " SUPABASE_KEY_INPUT
    fi
    
    # Update only placeholder values in frontend .env.local
    update_placeholders "frontend/.env.local" "your_supabase_project_url" "$SUPABASE_URL_INPUT"
    update_placeholders "frontend/.env.local" "your_supabase_anon_key" "$SUPABASE_KEY_INPUT"
fi

echo ""
echo "✅ Placeholder values updated!"
echo ""
echo "📝 Final .env files:"
echo "   Backend .env:"
cat backend/.env
echo ""
echo "   Frontend .env.local:"
cat frontend/.env.local

echo ""
echo "🏗️ Rebuilding frontend..."
cd frontend
npm run build
cd ..

echo "🔄 Restarting services..."
pm2 restart all

echo ""
echo "✅ Done! Your manually edited values have been preserved."
echo ""
echo "🌐 Test your application:"
echo "   http://$(curl -s http://checkip.amazonaws.com/)"
echo ""
echo "📊 Check status:"
echo "   pm2 status"
echo "   pm2 logs --lines 10"


