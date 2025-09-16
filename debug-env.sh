#!/bin/bash

echo "🔍 Debug: Docker Environment Variables"
echo "======================================="

echo ""
echo "1. 📄 Checking .env file..."
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    echo "📝 Supabase variables in .env:"
    grep "NEXT_PUBLIC_SUPABASE" .env | head -5
else
    echo "❌ .env file not found!"
fi

echo ""
echo "2. 🌍 Checking current environment..."
echo "NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL:-NOT_SET}"
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY:0:20}... (first 20 chars)"

echo ""
echo "3. 🐳 Checking Docker container environment..."
docker-compose exec frontend env | grep NEXT_PUBLIC || echo "❌ Container not running or no NEXT_PUBLIC vars found"

echo ""
echo "4. 🔧 Testing Supabase connection from container..."
docker-compose exec frontend node -e "
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET (length: ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length + ')' : 'NOT SET');
" 2>/dev/null || echo "❌ Could not execute test in container"

echo ""
echo "5. 📊 Container logs (last 20 lines)..."
docker-compose logs frontend --tail 20

echo ""
echo "🔄 To fix issues:"
echo "1. Rebuild containers: docker-compose build --no-cache"
echo "2. Restart services: docker-compose down && docker-compose up -d"
echo "3. Check logs: docker-compose logs frontend -f"