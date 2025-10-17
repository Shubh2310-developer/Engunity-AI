#!/bin/bash

cd "$(dirname "$0")"

echo "🚀 Starting Engunity AI - Minimal Mode (Lazy Loading)"
echo "======================================================"

# Set resource limits
export MALLOC_ARENA_MAX=2
export PYTHONOPTIMIZE=1

# Check system resources
AVAILABLE_RAM=$(free -m | awk 'NR==2{print $7}')
echo "💾 Available RAM: ${AVAILABLE_RAM}MB"

# Function to check if a port is in use
check_port() {
    local port=$1
    if ss -tulpn | grep -q ":$port "; then
        echo "⚠️  Port $port is already in use"
        return 0
    else
        return 1
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    lsof -ti:$port | xargs -r kill -9 2>/dev/null || true
}

echo ""
echo "🧹 Cleaning up existing processes..."

# Kill only main backend if running
kill_port 8000

# Wait for cleanup
sleep 2

echo ""
echo "💾 Checking MongoDB..."
if systemctl is-active --quiet mongod; then
    echo "✅ MongoDB already running"
else
    echo "⚠️  MongoDB is not running - attempting to start..."
    systemctl start mongod 2>/dev/null && echo "✅ MongoDB started" || echo "⚠️  MongoDB not started (may need: sudo systemctl start mongod)"
fi

echo ""
echo "🐳 Checking Docker..."
if systemctl is-active --quiet docker; then
    echo "✅ Docker service is running"
    if docker info > /dev/null 2>&1; then
        echo "✅ Docker daemon is accessible"
    else
        echo "⚠️  Docker daemon not accessible"
    fi
else
    echo "⚠️  Docker service is not running"
    echo "💡 Services requiring Docker will be started on-demand"
fi

echo ""
echo "🚀 Starting Main Backend Server (Port 8000)..."
cd backend

if ! check_port 8000; then
    PYTHONUNBUFFERED=1 /home/ghost/anaconda3/envs/engunity/bin/python -u main.py > main_backend.log 2>&1 &
    MAIN_BACKEND_PID=$!
    echo "📝 Main Backend PID: $MAIN_BACKEND_PID"

    # Wait for backend to start
    echo -n "⏳ Waiting for backend to be ready..."
    MAX_WAIT=30
    ELAPSED=0

    while [ $ELAPSED -lt $MAX_WAIT ]; do
        if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
            echo " ✅ Ready!"
            break
        fi
        sleep 1
        ELAPSED=$((ELAPSED + 1))
        echo -n "."
    done

    if [ $ELAPSED -eq $MAX_WAIT ]; then
        echo " ⏳ Still starting (check backend/main_backend.log)"
    fi
else
    echo "✅ Main Backend Server already running on port 8000"
fi

cd ..

echo ""
echo "=========================================="
echo "✅ Minimal Mode Started Successfully!"
echo "=========================================="
echo ""
echo "📊 Active Services:"
echo "   ✅ Main Backend: http://localhost:8000"
echo "   ✅ MongoDB: Port 27017"
echo ""
echo "⚡ On-Demand Services (will start when needed):"
echo "   🔶 Hybrid RAG v3 (Port 8002) - for Document Analysis"
echo "   🔶 Citation Classifier (Port 8003) - for Research"
echo "   🔶 Agentic RAG (Port 8001) - for Advanced Chat"
echo "   🔶 Code Executor (Port 4001) - for Code Editor"
echo ""
echo "🎯 How It Works:"
echo "   1. Navigate to any dashboard feature"
echo "   2. Required services will auto-start on first access"
echo "   3. Services remain active until you stop them"
echo ""
echo "📊 Service Management:"
echo "   - Check status: curl http://localhost:8000/api/services/status"
echo "   - Manual start: curl -X POST http://localhost:8000/api/services/start/{service_id}"
echo "   - Stop service: curl -X POST http://localhost:8000/api/services/stop/{service_id}"
echo ""
echo "📝 Logs:"
echo "   - Main Backend: backend/main_backend.log"
echo "   - On-demand services: backend/{service}_server.log"
echo ""
echo "💾 Memory Usage:"
USED_RAM=$((16000 - AVAILABLE_RAM))
NEW_AVAILABLE=$(free -m | awk 'NR==2{print $7}')
BACKEND_RAM=$((AVAILABLE_RAM - NEW_AVAILABLE))
echo "   - Main Backend: ~${BACKEND_RAM}MB"
echo "   - Available: ${NEW_AVAILABLE}MB"
echo ""
echo "🛑 To stop: ./stop-minimal.sh or pkill -f 'main.py'"
echo ""
