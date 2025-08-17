# 🐳 Docker Setup for Govly

This guide will help you run Govly using Docker and Docker Compose.

## 🚀 Quick Start

### 1. **Prerequisites**
- Docker Desktop installed and running
- Docker Compose (usually comes with Docker Desktop)
- API keys (contact @ShaoZhi21 on Telegram)

### 2. **Setup Environment**
```bash
# Copy environment template
cp env.example .env

# Edit .env with your actual API keys
nano .env  # or use your preferred editor
```

### 3. **Start the Application**
```bash
# Option 1: Use the startup script (recommended)
./docker-start.sh

# Option 2: Manual commands
docker-compose build
docker-compose up -d
```

### 4. **Access the Application**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Health Check**: http://localhost:8000/health

## 🛠️ Docker Commands

### **Basic Operations**
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# View logs
docker-compose logs -f

# View service status
docker-compose ps
```

### **Development Commands**
```bash
# Rebuild after code changes
docker-compose build --no-cache

# Rebuild specific service
docker-compose build backend

# View logs for specific service
docker-compose logs -f frontend
docker-compose logs -f backend
```

### **Cleanup Commands**
```bash
# Stop and remove containers
docker-compose down

# Remove all containers, networks, and images
docker-compose down --rmi all --volumes --remove-orphans

# Clean up Docker system
docker system prune -a
```

## 🏗️ Architecture

### **Services**
- **Backend**: FastAPI server with Python 3.11
- **Frontend**: Next.js application with Node.js 18
- **Network**: Custom network for service communication

### **Ports**
- **Backend**: 8000 (internal and external)
- **Frontend**: 3000 (internal and external)

### **Volumes**
- **Forms**: Backend forms directory mounted for PDF access
- **Environment**: Variables passed from host to containers

## 🔧 Configuration

### **Environment Variables**
```bash
# Required
SEA_LION_API_KEY=your_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# Optional
PORT=8000  # Backend port
NODE_ENV=production  # Frontend environment
```

### **Health Checks**
- **Backend**: Checks `/health` endpoint every 30s
- **Frontend**: Checks root endpoint every 30s
- **Dependencies**: Frontend waits for backend to be healthy

## 🐛 Troubleshooting

### **Common Issues**

#### **Port Already in Use**
```bash
# Check what's using the port
lsof -i :8000
lsof -i :3000

# Stop conflicting services or change ports in docker-compose.yml
```

#### **Build Failures**
```bash
# Clean build
docker-compose build --no-cache

# Check Docker logs
docker-compose logs build
```

#### **Service Won't Start**
```bash
# Check service logs
docker-compose logs backend
docker-compose logs frontend

# Check health status
docker-compose ps
```

#### **Environment Variables Not Working**
```bash
# Verify .env file exists
ls -la .env

# Check if variables are loaded
docker-compose config
```

### **Debug Mode**
```bash
# Run in foreground to see logs
docker-compose up

# Run specific service in foreground
docker-compose up backend
```

## 📱 Production Considerations

### **Security**
- Non-root users in containers
- Health checks enabled
- Environment variables for sensitive data

### **Performance**
- Multi-stage builds for frontend
- Optimized Python base image
- Volume mounting for forms

### **Monitoring**
- Health check endpoints
- Structured logging
- Service dependency management

## 🔄 Updates

### **Code Changes**
```bash
# After making code changes
docker-compose build
docker-compose up -d
```

### **Dependency Updates**
```bash
# Update requirements.txt or package.json
docker-compose build --no-cache
docker-compose up -d
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [FastAPI Docker Guide](https://fastapi.tiangolo.com/deployment/docker/)
- [Next.js Docker Guide](https://nextjs.org/docs/deployment#docker-image)

---

**Need help?** Contact @ShaoZhi21 on Telegram for support! 