#!/bin/bash

# Simple Manual Fix for AWS EC2
# Run this script on your EC2 instance

echo "🔧 Simple Manual Fix for AWS EC2..."

# Check if we're in the right directory
if [ ! -f "backend/main.py" ] || [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    exit 1
fi

# Get public IP (try multiple methods)
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com/ 2>/dev/null || echo "UNKNOWN")
echo "🌐 Public IP: $PUBLIC_IP"

echo "📝 Step 1: Setting up environment variables..."
# Create backend .env file
cat > backend/.env << EOF
# Production Environment Variables
SEA_LION_API_KEY=your-sea-lion-api-key-here
SUPABASE_URL=your-supabase-url-here
SUPABASE_KEY=your-supabase-key-here
USE_LLAMA_INDEX=true
SUPABASE_CHUNKS_TABLE=chunks
SUPABASE_FORMS_TABLE=forms
PORT=8000
ENVIRONMENT=production
EOF

# Create frontend .env.local file
cat > frontend/.env.local << EOF
# Production Frontend Environment
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url-here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key-here
NODE_ENV=production
EOF

echo "📝 Step 2: Updating CORS settings..."
# Update CORS to allow all origins
sed -i 's/allow_origins=\[.*\]/allow_origins=["*"]/' backend/main.py

echo "📝 Step 3: Starting backend..."
cd backend
if [ ! -d "venv" ]; then
    python3.11 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt
python3.11 main.py &
BACKEND_PID=$!
cd ..

echo "📝 Step 4: Starting frontend..."
cd frontend
npm install
npm run build
npm start &
FRONTEND_PID=$!
cd ..

echo "📝 Step 5: Setting up Nginx..."
sudo tee /etc/nginx/sites-available/govly << EOF
server {
    listen 80;
    server_name $PUBLIC_IP _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/govly /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Simple fix complete!"
echo ""
echo "⚠️  IMPORTANT: You need to edit the .env files with your actual credentials:"
echo "   nano backend/.env"
echo "   nano frontend/.env.local"
echo ""
echo "🌐 Test at: http://$PUBLIC_IP"
echo "🔍 Check logs: pm2 logs (if using PM2) or check process status"

