#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Govly Web Application...${NC}"

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 not found!${NC}"
    echo -e "${YELLOW}💡 Please install Python 3${NC}"
    exit 1
fi

# Check if Homebrew is available
if ! command -v brew &> /dev/null; then
    echo -e "${RED}❌ Homebrew not found!${NC}"
    echo -e "${YELLOW}💡 Please install Homebrew first: https://brew.sh/${NC}"
    exit 1
fi

# Install system dependencies
echo -e "${BLUE}📦 Installing system dependencies...${NC}"
echo -e "${YELLOW}📥 Installing Poppler...${NC}"
brew install poppler
echo -e "${YELLOW}📥 Installing Tesseract...${NC}"
brew install tesseract

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
    pkill -f "python main.py"
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

# Set up virtual environment
echo -e "${BLUE}🐍 Setting up Python virtual environment...${NC}"
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}📁 Creating virtual environment...${NC}"
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to create virtual environment${NC}"
        exit 1
    fi
fi

# Activate virtual environment
echo -e "${YELLOW}🔌 Activating virtual environment...${NC}"
source venv/bin/activate

# Upgrade pip
echo -e "${YELLOW}⬆️  Upgrading pip...${NC}"
pip install --upgrade pip

# Install Python dependencies
echo -e "${GREEN}📦 Installing Python dependencies...${NC}"
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install Python dependencies from requirements.txt${NC}"
    echo -e "${YELLOW}💡 Trying to install dependencies individually...${NC}"
    
    # Install dependencies one by one
    pip install fastapi==0.115.6
    pip install "uvicorn[standard]==0.32.1"
    pip install python-dotenv==1.0.0
    pip install requests==2.31.0
    pip install pydantic==2.10.4
    pip install supabase==2.0.2
    pip install pytesseract
    pip install pdf2image
    pip install Pillow
    pip install sentence-transformers
    pip install torch
    pip install transformers
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install Python dependencies${NC}"
        exit 1
    fi
fi

# Install additional dependencies that might be missing
echo -e "${BLUE}📦 Installing additional dependencies...${NC}"
pip install pytesseract pdf2image Pillow sentence-transformers torch transformers

# Start backend server
echo -e "${GREEN}🚀 Starting FastAPI backend on port 8000...${NC}"
python main.py &
BACKEND_PID=$!

# Wait longer for backend to start (models need time to load)
echo -e "${YELLOW}⏳ Waiting for backend to fully start (this may take 10-15 seconds)...${NC}"
sleep 15

# Check if backend is running with retries
echo -e "${YELLOW}🔍 Checking if backend is ready...${NC}"
for i in {1..3}; do
    if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
        break
    fi
    if [ $i -eq 3 ]; then
        echo -e "${RED}❌ Backend failed to start after 3 attempts${NC}"
        echo -e "${YELLOW}💡 Checking backend logs...${NC}"
        echo -e "${YELLOW}💡 You can check the backend manually:${NC}"
        echo -e "${YELLOW}   cd backend && source venv/bin/activate && python main.py${NC}"
        exit 1
    fi
    echo -e "${YELLOW}⏳ Backend not ready yet, waiting 5 more seconds... (attempt $i/3)${NC}"
    sleep 5
done

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
sleep 8

# Check if frontend is running
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${RED}❌ Frontend failed to start${NC}"
    echo -e "${YELLOW}💡 You can check the frontend manually:${NC}"
    echo -e "${YELLOW}   cd frontend && npm run dev${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend is running on http://localhost:3000${NC}"
echo -e "${GREEN}🎉 Govly is ready!${NC}"
echo -e "${GREEN}🌐 Open http://localhost:3000 in your browser${NC}"
echo -e "${GREEN}📚 API docs available at http://localhost:8000/docs${NC}"
echo -e "${YELLOW}💡 Press Ctrl+C to stop all servers${NC}"

# Wait for user to stop
wait 