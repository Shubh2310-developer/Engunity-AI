#!/bin/bash

# Engunity AI - Stop All Services Script
echo "🛑 Stopping Engunity AI Platform..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to kill process on port
kill_port() {
    PORT=$1
    NAME=$2
    if lsof -i :$PORT > /dev/null 2>&1; then
        echo -e "${YELLOW}Stopping $NAME on port $PORT...${NC}"
        lsof -ti :$PORT | xargs kill -9 2>/dev/null
        sleep 1
        echo -e "${GREEN}✓ $NAME stopped${NC}"
    else
        echo -e "  $NAME not running on port $PORT"
    fi
}

# Stop Frontend (Port 3000)
echo "💻 Frontend (Port 3000)"
kill_port 3000 "Frontend"
if [ -f logs/frontend.pid ]; then
    kill -9 $(cat logs/frontend.pid) 2>/dev/null
    rm logs/frontend.pid
fi

echo ""

# Stop Backend Services
echo "🔧 Backend Services"
kill_port 8000 "Main Backend"
kill_port 8001 "Agentic RAG"
kill_port 8002 "Hybrid RAG v3"
kill_port 8003 "Citation Classifier"
kill_port 4001 "Code Executor"

# Kill any remaining frontend processes
pkill -f "next-server" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true

# Kill any remaining backend processes
pkill -f "run_server.py" 2>/dev/null || true
pkill -f "enhanced_fake_rag_server.py" 2>/dev/null || true
pkill -f "hybrid_rag_v3_server.py" 2>/dev/null || true
pkill -f "agentic_rag_server.py" 2>/dev/null || true
pkill -f "citation_classification_server.py" 2>/dev/null || true
pkill -f "ts-node src/index.ts" 2>/dev/null || true

echo ""

# Note: MongoDB service is left running by default (systemd service)
# To stop MongoDB manually: sudo systemctl stop mongod
echo "📊 MongoDB"
if systemctl is-active --quiet mongod; then
    echo -e "  MongoDB is running (left active for data persistence)"
    echo -e "  ${YELLOW}To stop: sudo systemctl stop mongod${NC}"
else
    echo "  MongoDB not running"
fi

echo ""
echo -e "${GREEN}✨ All services stopped!${NC}"
echo ""
echo "To start again: ./start-all-services.sh"
echo ""
