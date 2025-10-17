#!/usr/bin/bash

cd "$(dirname "$0")"

echo "🚀 Starting Engunity AI - Main Server Only (Lazy Loading Mode)"
echo "================================================================"

# Set resource limits
export MALLOC_ARENA_MAX=2
export PYTHONOPTIMIZE=1

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

# Clean up any existing backend processes
echo "🧹 Cleaning up existing backend processes..."
for port in 8000 8001 8002 8003; do
    lsof -ti:$port | xargs -r kill -9 2>/dev/null || true
done
pkill -f "run_server.py\|hybrid_rag_v3_server.py\|agentic_rag_server.py\|citation_classification_server.py" 2>/dev/null || true
sleep 2

echo ""
echo "💾 Checking MongoDB..."
if systemctl is-active --quiet mongod; then
    echo "✅ MongoDB already running"
else
    echo "⚠️  MongoDB is not running"
    echo "   Run: sudo systemctl start mongod"
fi

echo ""
echo "🚀 Starting Main Backend Server ONLY (Port 8000)..."
cd backend

if ! check_port 8000; then
    PYTHONUNBUFFERED=1 /home/ghost/anaconda3/envs/engunity/bin/python -u main.py > main_backend.log 2>&1 &
    MAIN_BACKEND_PID=$!
    echo "📝 Main Backend PID: $MAIN_BACKEND_PID"
    sleep 3
else
    echo "✅ Main Backend Server already running on port 8000"
fi

cd ..

# Wait for main backend
echo ""
echo "🧪 Waiting for main backend to be ready..."
max_wait=20
elapsed=0

while [ $elapsed -lt $max_wait ]; do
    if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
        echo "✅ Main Backend ready (${elapsed}s)"
        break
    fi
    sleep 1
    elapsed=$((elapsed + 1))
done

echo ""
echo "================================================================"
echo "✅ Main Backend Server Started"
echo ""
echo "🎯 Active Services:"
echo "   ✅ Main Backend: http://localhost:8000"
echo "   💤 Hybrid RAG v3: Will start on-demand (when accessing Documents)"
echo "   💤 Agentic RAG: Will start on-demand (when accessing Chat & Code)"
echo "   💤 Citation Classifier: Will start on-demand (when accessing Research)"
echo "   💤 Code Executor: Will start on-demand (when accessing Editor)"
echo ""
echo "📊 Service Management:"
echo "   - Services will auto-start when you access their features"
echo "   - Check service status: curl http://localhost:8000/api/services/status"
echo "   - Manual service start: curl -X POST http://localhost:8000/api/services/start/{service_name}"
echo ""
echo "📝 Logs:"
echo "   - Main Backend: backend/main_backend.log"
echo "   - Services will create logs when started: backend/*.log"
echo ""
echo "🛑 To stop: pkill -f main.py"
echo ""
