#!/bin/bash

cd "$(dirname "$0")"

echo "🚀 Starting Engunity AI - Full Application"
echo "============================================="
echo ""

# Set resource limits
export MALLOC_ARENA_MAX=2
export PYTHONOPTIMIZE=1

# Check system resources
AVAILABLE_RAM=$(free -m | awk 'NR==2{print $7}')
echo "💾 Available RAM: ${AVAILABLE_RAM}MB"

if [ "$AVAILABLE_RAM" -lt 2000 ]; then
    echo "⚠️  WARNING: Low memory detected (<2GB available)"
    echo "💡 The system will use lazy loading to conserve memory..."
    echo ""
fi

# Function to check if a port is in use
check_port() {
    local port=$1
    if ss -tulpn 2>/dev/null | grep -q ":$port " || lsof -i:$port >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    local name=$2
    if lsof -ti:$port > /dev/null 2>&1; then
        echo "   🧹 Stopping existing $name (Port $port)..."
        lsof -ti:$port | xargs -r kill -9 2>/dev/null || true
        sleep 1
    fi
}

echo "🧹 Cleaning up existing processes..."
kill_port 8000 "Backend"
kill_port 3000 "Frontend"

# Wait for cleanup
sleep 2

echo ""
echo "💾 Checking MongoDB..."
if systemctl is-active --quiet mongod 2>/dev/null; then
    echo "✅ MongoDB already running"
else
    echo "⚠️  MongoDB is not running - attempting to start..."
    systemctl start mongod 2>/dev/null && echo "✅ MongoDB started" || echo "⚠️  MongoDB not started (may need: sudo systemctl start mongod)"
fi

echo ""
echo "🐳 Checking Docker..."
if systemctl is-active --quiet docker 2>/dev/null; then
    echo "✅ Docker service is running"
    if docker info > /dev/null 2>&1; then
        echo "✅ Docker daemon is accessible"
    else
        echo "⚠️  Docker daemon not accessible"
    fi
else
    echo "⚠️  Docker service is not running"
    echo "💡 Code Editor will auto-start Docker when needed"
fi

echo ""
echo "=========================================="
echo "🚀 Starting Backend Server..."
echo "=========================================="

cd backend

# Start backend in background
PYTHONUNBUFFERED=1 /home/ghost/anaconda3/envs/engunity/bin/python -u main.py > main_backend.log 2>&1 &
BACKEND_PID=$!
echo "📝 Backend PID: $BACKEND_PID"

# Wait for backend to be ready
echo -n "⏳ Waiting for backend to be ready"
MAX_WAIT=30
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
    if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
        echo " ✅"
        break
    fi
    sleep 1
    ELAPSED=$((ELAPSED + 1))
    echo -n "."
done

if [ $ELAPSED -eq $MAX_WAIT ]; then
    echo " ⏳"
    echo "⚠️  Backend is taking longer than expected"
    echo "💡 Check backend/main_backend.log for details"
else
    echo "✅ Backend is ready at http://localhost:8000"
fi

cd ..

echo ""
echo "=========================================="
echo "🎨 Starting Frontend Server..."
echo "=========================================="

cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install --silent
fi

# Start frontend in background
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "📝 Frontend PID: $FRONTEND_PID"

# Wait for frontend to be ready
echo -n "⏳ Waiting for frontend to be ready"
MAX_WAIT=30
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo " ✅"
        break
    fi
    sleep 1
    ELAPSED=$((ELAPSED + 1))
    echo -n "."
done

if [ $ELAPSED -eq $MAX_WAIT ]; then
    echo " ⏳"
    echo "⚠️  Frontend is taking longer than expected"
    echo "💡 Check frontend/frontend.log for details"
else
    echo "✅ Frontend is ready at http://localhost:3000"
fi

cd ..

echo ""
echo "=========================================="
echo "✅ Application Started Successfully!"
echo "=========================================="
echo ""
echo "🌐 Access Points:"
echo "   📱 Frontend:  http://localhost:3000"
echo "   🔧 Backend:   http://localhost:8000"
echo "   📊 API Docs:  http://localhost:8000/docs"
echo ""
echo "⚡ Lazy Loading Enabled:"
echo "   Services will auto-start when you access features:"
echo "   - Documents → Hybrid RAG v3 (Port 8002)"
echo "   - Research → Citation Classifier (Port 8003)"
echo "   - Code Editor → Code Executor (Port 4001)"
echo "   - Chat & Code → Agentic RAG (Port 8001)"
echo ""
echo "📊 Process IDs:"
echo "   Backend:  $BACKEND_PID"
echo "   Frontend: $FRONTEND_PID"
echo ""
echo "📝 Logs:"
echo "   Backend:  backend/main_backend.log"
echo "   Frontend: frontend/frontend.log"
echo "   Services: backend/*_server.log"
echo ""
echo "💾 Memory Usage:"
NEW_AVAILABLE=$(free -m | awk 'NR==2{print $7}')
USED_RAM=$((AVAILABLE_RAM - NEW_AVAILABLE))
echo "   Used: ~${USED_RAM}MB"
echo "   Available: ${NEW_AVAILABLE}MB"
echo ""
echo "🔍 Check service status:"
echo "   curl http://localhost:8000/api/services/status"
echo ""
echo "🛑 To stop everything:"
echo "   ./stop-app.sh"
echo "   (or press Ctrl+C in this terminal, then run ./stop-app.sh)"
echo ""
echo "🎉 Open http://localhost:3000 in your browser to get started!"
echo ""

# Keep script running and handle Ctrl+C
trap 'echo ""; echo "⚠️  Received interrupt signal"; echo "🛑 Stopping services..."; ./stop-app.sh; exit 0' INT TERM

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
