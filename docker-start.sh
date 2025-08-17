#!/bin/bash

echo "🚀 Starting Govly with Docker Compose..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "📝 Please copy env.example to .env and fill in your API keys:"
    echo "   cp env.example .env"
    echo "   # Then edit .env with your actual keys"
    exit 1
fi

# Build and start services
echo "🔨 Building Docker images..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service status
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "🎉 Govly is starting up!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:8000"
echo ""
echo "📝 To view logs: docker-compose logs -f"
echo "🛑 To stop:      docker-compose down"
echo "🔄 To restart:   docker-compose restart" 