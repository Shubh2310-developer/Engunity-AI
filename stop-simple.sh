#!/bin/bash

# Engunity AI - Stop Services (Simplified)
echo "🛑 Stopping Engunity AI Services..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

# Stop Backend (Port 4000)
echo "🔧 Backend API (Port 4000)"
kill_port 4000 "Backend"
if [ -f logs/backend.pid ]; then
    kill -9 $(cat logs/backend.pid) 2>/dev/null
    rm logs/backend.pid
fi

echo ""
echo -e "${GREEN}✨ All services stopped!${NC}"
echo ""
echo "To start again: ./start-simple.sh"
echo ""
