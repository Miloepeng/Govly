#!/bin/bash

# Development startup script with hot reloading
echo "🚀 Starting Govly Development Environment with Hot Reloading..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Please create one from env.example"
    echo "   cp env.example .env"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Start development services
echo "📦 Starting Docker Compose with development configuration..."
docker-compose -f docker-compose.dev.yml up --build

echo "✅ Development environment started!"
echo "🌐 Backend: http://localhost:8000"
echo "🌐 Frontend: http://localhost:3000"
echo "🔄 Hot reloading enabled - changes to backend code will auto-restart"
