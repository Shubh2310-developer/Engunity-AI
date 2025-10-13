#!/bin/bash

# Engunity AI - Simple Startup (No Docker Required)
echo "🚀 Starting Engunity AI Platform (Simplified Mode)..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Create logs directory
mkdir -p logs

# Function to check if port is in use
check_port() {
    lsof -i :$1 > /dev/null 2>&1
    return $?
}

# Function to kill process on port
kill_port() {
    echo -e "${YELLOW}  Stopping existing service on port $1...${NC}"
    lsof -ti :$1 | xargs kill -9 2>/dev/null
    sleep 1
}

echo "═══════════════════════════════════════════════"
echo "  STEP 1: Backend API Server (Port 4000)"
echo "═══════════════════════════════════════════════"
echo ""

echo "🔧 Starting Backend..."
cd code-executor

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "  Installing backend dependencies..."
    npm install
fi

# Kill existing backend if running
if check_port 4000; then
    kill_port 4000
fi

# Start backend in background
echo "  Starting backend server..."
npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../logs/backend.pid

# Wait for backend to start
echo "  Waiting for backend to initialize..."
sleep 3
for i in {1..15}; do
    if check_port 4000; then
        echo -e "${GREEN}  ✅ Backend API running on http://localhost:4000${NC}"
        break
    fi
    sleep 1
done

if ! check_port 4000; then
    echo -e "${RED}  ⚠️  Backend starting up (check logs/backend.log if issues persist)${NC}"
else
    # Test backend health
    HEALTH_CHECK=$(curl -s http://localhost:4000/health 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✅ Backend health check passed${NC}"
    fi
fi

cd ..

echo ""
echo "═══════════════════════════════════════════════"
echo "  STEP 2: Frontend Next.js App (Port 3000)"
echo "═══════════════════════════════════════════════"
echo ""

echo "💻 Starting Frontend..."
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "  Installing frontend dependencies..."
    npm install
fi

# Kill existing frontend if running
if check_port 3000; then
    kill_port 3000
fi

# Start frontend in background
echo "  Starting Next.js development server..."
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../logs/frontend.pid

# Wait for frontend to start
echo "  Waiting for frontend to compile..."
sleep 5
for i in {1..30}; do
    if check_port 3000; then
        echo -e "${GREEN}  ✅ Frontend running on http://localhost:3000${NC}"
        break
    fi
    sleep 1
done

if ! check_port 3000; then
    echo -e "${RED}  ⚠️  Frontend starting up (check logs/frontend.log if issues persist)${NC}"
fi

cd ..

echo ""
echo "═══════════════════════════════════════════════"
echo "  🎉 ENGUNITY AI READY!"
echo "═══════════════════════════════════════════════"
echo ""
echo -e "${BLUE}📱 Access the application:${NC}"
echo -e "   ${GREEN}Main App:${NC}        http://localhost:3000"
echo -e "   ${GREEN}Code Editor:${NC}     http://localhost:3000/dashboard/editor"
echo -e "   ${GREEN}Backend API:${NC}     http://localhost:4000/api"
echo -e "   ${GREEN}Health Check:${NC}    http://localhost:4000/health"
echo ""
echo -e "${BLUE}📊 Process Management:${NC}"
echo "   View logs:      tail -f logs/backend.log"
echo "                   tail -f logs/frontend.log"
echo "   Stop all:       ./stop-simple.sh"
echo ""
echo -e "${YELLOW}⚡ Quick Commands:${NC}"
echo "   Test backend:   curl http://localhost:4000/health"
echo "   View logs:      tail -f logs/*.log"
echo "   Stop services:  ./stop-simple.sh"
echo ""
echo -e "${GREEN}✨ Running in simplified mode (no Docker/MongoDB required)${NC}"
echo ""
echo -e "${BLUE}Note:${NC} Code execution features require Docker to be installed."
echo "      Authentication features require MongoDB for persistence."
echo "      Both are optional - the app will work without them!"
echo ""
