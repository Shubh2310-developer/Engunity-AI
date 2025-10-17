#!/bin/bash

echo "🛑 Stopping Engunity AI Services..."

# Function to kill process on port
kill_port() {
    local port=$1
    local name=$2
    if lsof -ti:$port > /dev/null 2>&1; then
        echo "   Stopping $name (Port $port)..."
        lsof -ti:$port | xargs -r kill -9 2>/dev/null || true
    fi
}

# Kill all services
kill_port 8000 "Main Backend"
kill_port 8001 "Agentic RAG"
kill_port 8002 "Hybrid RAG v3"
kill_port 8003 "Citation Classifier"
kill_port 4001 "Code Executor"

echo "✅ All services stopped"
