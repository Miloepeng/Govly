#!/bin/bash

# Govly Service Management Script
# Run this script from your govly-web directory

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "backend/main.py" ] || [ ! -f "frontend/package.json" ]; then
    print_error "Please run this script from your govly-web directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected files: backend/main.py and frontend/package.json"
    exit 1
fi

# Get EC2 public IP
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com/ 2>/dev/null || echo "UNKNOWN")

# Function to show status
show_status() {
    echo "📊 Service Status:"
    echo "=================="
    
    # PM2 status
    echo "🔄 PM2 Processes:"
    pm2 status
    
    # Nginx status
    echo ""
    echo "🌐 Nginx Status:"
    sudo systemctl status nginx --no-pager -l
    
    # Port status
    echo ""
    echo "🔌 Port Status:"
    if command -v ss >/dev/null 2>&1; then
        sudo ss -tlnp | grep -E ':(80|3000|8000)' || echo "   No services found on ports 80, 3000, 8000"
    else
        sudo netstat -tlnp | grep -E ':(80|3000|8000)' || echo "   No services found on ports 80, 3000, 8000"
    fi
    
    # Health checks
    echo ""
    echo "🏥 Health Checks:"
    echo "   Backend (localhost:8000):"
    curl -f http://localhost:8000/health 2>/dev/null && print_status "Backend is healthy" || print_error "Backend is not responding"
    
    echo "   Frontend (localhost:3000):"
    curl -f http://localhost:3000 2>/dev/null && print_status "Frontend is healthy" || print_error "Frontend is not responding"
    
    echo ""
    echo "🌐 Public Access:"
    echo "   http://$PUBLIC_IP"
    echo "   http://$PUBLIC_IP:8000/health"
    echo "   http://$PUBLIC_IP:3000"
}

# Function to start services
start_services() {
    print_info "Starting all services..."
    
    # Start Nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    print_status "Nginx started"
    
    # Start PM2 processes
    pm2 start ecosystem.config.js
    print_status "PM2 processes started"
    
    # Save PM2 configuration
    pm2 save
    print_status "PM2 configuration saved"
    
    print_status "All services started successfully!"
}

# Function to stop services
stop_services() {
    print_info "Stopping all services..."
    
    # Stop PM2 processes
    pm2 stop all
    print_status "PM2 processes stopped"
    
    # Stop Nginx
    sudo systemctl stop nginx
    print_status "Nginx stopped"
    
    print_status "All services stopped successfully!"
}

# Function to restart services
restart_services() {
    print_info "Restarting all services..."
    
    # Restart PM2 processes
    pm2 restart all
    print_status "PM2 processes restarted"
    
    # Restart Nginx
    sudo systemctl restart nginx
    print_status "Nginx restarted"
    
    print_status "All services restarted successfully!"
}

# Function to show logs
show_logs() {
    echo "📋 Service Logs:"
    echo "================"
    
    echo "🔄 PM2 Logs (last 20 lines):"
    pm2 logs --lines 20
    
    echo ""
    echo "🌐 Nginx Error Logs (last 10 lines):"
    sudo tail -10 /var/log/nginx/error.log
    
    echo ""
    echo "🌐 Nginx Access Logs (last 10 lines):"
    sudo tail -10 /var/log/nginx/access.log
}

# Function to update environment
update_environment() {
    print_info "Updating environment variables..."
    
    if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ] || [ -z "$SEA_LION_API_KEY" ]; then
        print_warning "Environment variables not set. Please set them first:"
        echo "   export SUPABASE_URL='your-supabase-url'"
        echo "   export SUPABASE_KEY='your-supabase-key'"
        echo "   export SEA_LION_API_KEY='your-sea-lion-key'"
        echo ""
        read -p "   Do you want to set them now? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            read -p "   Enter SUPABASE_URL: " SUPABASE_URL
            read -p "   Enter SUPABASE_KEY: " SUPABASE_KEY
            read -p "   Enter SEA_LION_API_KEY: " SEA_LION_API_KEY
            export SUPABASE_URL SUPABASE_KEY SEA_LION_API_KEY
        else
            print_error "Please set environment variables and run this script again."
            exit 1
        fi
    fi
    
    # Update backend environment
    cat > backend/.env << EOF
# Production Environment Variables
SEA_LION_API_KEY=${SEA_LION_API_KEY}
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_KEY=${SUPABASE_KEY}
USE_LLAMA_INDEX=true
SUPABASE_CHUNKS_TABLE=chunks
SUPABASE_FORMS_TABLE=forms
PORT=8000
ENVIRONMENT=production
EOF
    
    # Update frontend environment
    cat > frontend/.env.local << EOF
# Production Frontend Environment
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_KEY}
NODE_ENV=production
EOF
    
    print_status "Environment variables updated"
    
    # Restart services to apply changes
    restart_services
}

# Function to show help
show_help() {
    echo "🔧 Govly Service Management Script"
    echo "=================================="
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  status     - Show service status"
    echo "  start      - Start all services"
    echo "  stop       - Stop all services"
    echo "  restart    - Restart all services"
    echo "  logs       - Show service logs"
    echo "  update     - Update environment variables"
    echo "  help       - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 status"
    echo "  $0 restart"
    echo "  $0 logs"
}

# Main script logic
case "${1:-status}" in
    "status")
        show_status
        ;;
    "start")
        start_services
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        restart_services
        ;;
    "logs")
        show_logs
        ;;
    "update")
        update_environment
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac

