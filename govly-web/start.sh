#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Govly Web Application...${NC}"

# Check if Python 3.11 is available
if ! command -v python3.11 &> /dev/null; then
    echo -e "${RED}❌ Python 3.11 not found!${NC}"
    echo -e "${YELLOW}📥 Installing Python 3.11...${NC}"
    brew install python@3.11
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install Python 3.11${NC}"
        echo -e "${YELLOW}💡 You can install it manually: brew install python@3.11${NC}"
        exit 1
    fi
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found!${NC}"
    echo -e "${YELLOW}💡 Please install Node.js from https://nodejs.org/${NC}"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found!${NC}"
    echo -e "${YELLOW}💡 Please install npm${NC}"
    exit 1
fi

# Function to cleanup background processes
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down servers...${NC}"
    pkill -f "python3.11 main.py"
    pkill -f "npm run dev"
    echo -e "${GREEN}✅ Servers stopped${NC}"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend server
echo -e "${GREEN}🐍 Starting Python backend...${NC}"
cd backend

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found in backend directory${NC}"
    echo -e "${YELLOW}💡 Please create .env file with your Supabase credentials${NC}"
    echo -e "${YELLOW}   Example:${NC}"
    echo -e "${YELLOW}   SUPABASE_URL=your_supabase_url${NC}"
    echo -e "${YELLOW}   SUPABASE_KEY=your_supabase_key${NC}"
    echo -e "${YELLOW}   SEA_LION_API_KEY=your_sea_lion_key${NC}"
fi

# Install Python dependencies
echo -e "${GREEN}📦 Installing Python dependencies...${NC}"
python3.11 -m pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install Python dependencies${NC}"
    exit 1
fi

# Start backend server
echo -e "${GREEN}🚀 Starting FastAPI backend on port 8000...${NC}"
python3.11 main.py &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Check if backend is running
if ! curl -s http://localhost:8000/docs > /dev/null; then
    echo -e "${RED}❌ Backend failed to start${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backend is running on http://localhost:8000${NC}"

# Start frontend server
echo -e "${GREEN}⚛️  Starting React frontend...${NC}"
cd ../frontend

# Install Node.js dependencies
echo -e "${GREEN}📦 Installing Node.js dependencies...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install Node.js dependencies${NC}"
    exit 1
fi

# Start frontend server
echo -e "${GREEN}🚀 Starting Next.js frontend on port 3000...${NC}"
npm run dev &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 5

# Check if frontend is running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo -e "${RED}❌ Frontend failed to start${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend is running on http://localhost:3000${NC}"
echo -e "${GREEN}🎉 Govly is ready!${NC}"
echo -e "${GREEN}🌐 Open http://localhost:3000 in your browser${NC}"
echo -e "${YELLOW}💡 Press Ctrl+C to stop all servers${NC}"

# Wait for user to stop
wait 