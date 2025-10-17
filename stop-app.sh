#!/bin/bash

echo "🛑 Stopping Engunity AI Application..."
echo ""

# Function to kill process on port
kill_port() {
    local port=$1
    local name=$2
    if lsof -ti:$port > /dev/null 2>&1; then
        echo "   Stopping $name (Port $port)..."
        lsof -ti:$port | xargs -r kill -9 2>/dev/null || true
    fi
}

# Stop main services
kill_port 8000 "Main Backend"
kill_port 3000 "Frontend"

# Stop lazy-loaded services if running
kill_port 8001 "Agentic RAG"
kill_port 8002 "Hybrid RAG v3"
kill_port 8003 "Citation Classifier"
kill_port 4001 "Code Executor"

# Kill by process name as backup
pkill -f "main.py" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true

echo ""
echo "✅ All services stopped"
echo ""
echo "💡 MongoDB and Docker are still running (stop manually if needed)"
echo "   sudo systemctl stop mongod"
echo "   sudo systemctl stop docker"
echo ""
