#!/bin/bash

echo "🧪 Testing Docker Setup for Govly..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found. Please install Docker Compose."
    exit 1
fi

echo "✅ Docker and docker-compose are available"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "📝 Creating .env from template..."
    cp env.example .env
    echo "🔑 Please edit .env with your actual API keys"
    echo "   Then run this script again"
    exit 1
fi

echo "✅ Environment file found"

# Test build
echo "🔨 Testing Docker build..."
if docker-compose build --no-cache; then
    echo "✅ Docker build successful"
else
    echo "❌ Docker build failed"
    exit 1
fi

# Test startup
echo "🚀 Testing service startup..."
if docker-compose up -d; then
    echo "✅ Services started successfully"
    
    # Wait for services to be ready
    echo "⏳ Waiting for services to be ready..."
    sleep 15
    
    # Check service status
    echo "📊 Service Status:"
    docker-compose ps
    
    # Test health endpoints
    echo "🏥 Testing health endpoints..."
    
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ Backend health check passed"
    else
        echo "❌ Backend health check failed"
    fi
    
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ Frontend health check passed"
    else
        echo "❌ Frontend health check failed"
    fi
    
    echo ""
    echo "🎉 Docker setup test completed!"
    echo "🌐 Frontend: http://localhost:3000"
    echo "🔧 Backend:  http://localhost:8000"
    echo ""
    echo "📝 To view logs: docker-compose logs -f"
    echo "🛑 To stop:      docker-compose down"
    
else
    echo "❌ Service startup failed"
    docker-compose logs
    exit 1
fi 