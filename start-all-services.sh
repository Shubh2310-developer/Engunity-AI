#!/bin/bash

cd "$(dirname "$0")"

echo "🚀 Starting All Engunity AI Services"
echo "===================================="

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

# Function to kill existing processes
cleanup_existing() {
    echo "🧹 Cleaning up existing processes..."
    
    # Kill processes by port
    for port in 8000 8001 8002 8003; do
        lsof -ti:$port | xargs -r kill -9 2>/dev/null || true
    done
    
    # Kill existing backend processes
    pkill -f "run_server.py" 2>/dev/null || true
    pkill -f "enhanced_fake_rag_server.py" 2>/dev/null || true
    pkill -f "hybrid_rag_v3_server.py" 2>/dev/null || true
    pkill -f "agentic_rag_server.py" 2>/dev/null || true
    pkill -f "fake_rag_server.py" 2>/dev/null || true
    pkill -f "simple_server.py" 2>/dev/null || true
    pkill -f "citation_classification_server.py" 2>/dev/null || true
    
    # Wait a moment for processes to terminate
    sleep 3
}

# Clean up any existing processes first
cleanup_existing

echo ""
echo "📦 Checking backend dependencies..."
# All python commands should be run from the backend directory.
cd backend

# Skip pip install for faster startup - assume dependencies are already installed
echo "✅ Using existing dependencies (run 'pip install -r requirements_rag.txt' if needed)"

echo ""
echo "⚡ Starting services with lazy model loading..."
echo "   (Models will load in background when servers start)"

echo ""
echo "🚀 Starting Main Backend Server (Port 8000)..."
if ! check_port 8000; then
    nohup /home/ghost/anaconda3/envs/engunity/bin/python main.py > main_backend.log 2>&1 &
    MAIN_BACKEND_PID=$!
    echo "📝 Main Backend PID: $MAIN_BACKEND_PID"
else
    echo "✅ Main Backend Server already running on port 8000"
fi

# Start all services in parallel for faster startup
echo ""
echo "🔥 Starting Hybrid RAG v3 Server (BGE + ChromaDB + Groq) (Port 8002)..."
if ! check_port 8002; then
    nohup /home/ghost/anaconda3/envs/engunity/bin/python servers/hybrid_rag_v3_server.py > hybrid_rag_v3_server.log 2>&1 &
    HYBRID_RAG_PID=$!
    echo "📝 Hybrid RAG v3 PID: $HYBRID_RAG_PID"
else
    echo "✅ Hybrid RAG v3 Server already running on port 8002"
fi

echo ""
echo "🤖 Starting Agentic RAG Server (Port 8001)..."
if ! check_port 8001; then
    if [ -f "agentic_rag_server.py" ]; then
        nohup /home/ghost/anaconda3/envs/engunity/bin/python agentic_rag_server.py > agentic_rag_server.log 2>&1 &
        AGENTIC_RAG_PID=$!
        echo "📝 Agentic RAG PID: $AGENTIC_RAG_PID"
    else
        echo "⚠️  agentic_rag_server.py not found - skipping"
    fi
else
    echo "✅ Agentic RAG Server already running on port 8001"
fi

echo ""
echo "🧠 Starting Citation Classification Server (Port 8003)..."
if ! check_port 8003; then
    if [ -f "servers/citation_classification_server.py" ]; then
        nohup /home/ghost/anaconda3/envs/engunity/bin/python servers/citation_classification_server.py > citation_classification_server.log 2>&1 &
        CITATION_PID=$!
        echo "📝 Citation Classifier PID: $CITATION_PID"
    else
        echo "⚠️  servers/citation_classification_server.py not found - skipping"
    fi
else
    echo "✅ Citation Classification Server already running on port 8003"
fi

# Brief wait for processes to start
sleep 2

echo ""
echo "💾 Starting MongoDB (if not running)..."
if ! systemctl is-active --quiet mongod; then
    sudo systemctl start mongod 2>/dev/null || echo "⚠️  MongoDB might need manual start"
else
    echo "✅ MongoDB already running"
fi

# Go back to root directory before testing
cd ..

echo ""
echo "🧪 Waiting for services to be ready..."

# Function to wait for service (non-blocking)
wait_for_service() {
    local name=$1
    local port=$2
    local endpoint=$3
    local max_wait=30
    local elapsed=0

    echo -n "Checking $name ($port)... "

    while [ $elapsed -lt $max_wait ]; do
        if curl -s http://localhost:$port$endpoint > /dev/null 2>&1; then
            echo "✅ Ready (${elapsed}s)"
            return 0
        fi
        sleep 1
        elapsed=$((elapsed + 1))

        # Show progress every 5 seconds
        if [ $((elapsed % 5)) -eq 0 ]; then
            echo -n "${elapsed}s..."
        fi
    done

    echo "⏳ Still loading (will be ready soon)"
    return 1
}

# Wait for essential services (reduced timeout)
wait_for_service "Main Backend" 8000 "/api/health"
wait_for_service "Hybrid RAG v3" 8002 "/health"

# ML-heavy services may take longer - check but don't block
echo ""
echo "📊 ML Services Status (loading in background):"
echo -n "   Agentic RAG (8001): "
if curl -s http://localhost:8001/health > /dev/null 2>&1; then
    echo "✅ Ready"
else
    echo "⏳ Loading models... (check backend/agentic_rag_server.log)"
fi

echo -n "   Citation Classifier (8003): "
if curl -s http://localhost:8003/health > /dev/null 2>&1; then
    echo "✅ Ready"
else
    echo "⏳ Loading models... (check backend/citation_classification_server.log)"
fi

echo ""
echo "🎯 All Backend Services Status:"
echo "   - Main Backend: http://localhost:8000 (File uploads, data analysis)"
echo "   - Hybrid RAG v3: http://localhost:8002 (BGE Embeddings + ChromaDB + Groq LLM)"
echo "   - Agentic RAG: http://localhost:8001 (General queries)"
echo "   - Citation Classifier: http://localhost:8003 (AI citation classification)"
echo "   - MongoDB: Running"
echo ""
echo "📊 Service Logs:"
echo "   - Main Backend: backend/main_backend.log"
echo "   - Hybrid RAG v3: backend/hybrid_rag_v3_server.log"
echo "   - Agentic RAG: backend/agentic_rag_server.log"
echo "   - Citation Classifier: backend/citation_classification_server.log"
echo ""
echo "🛑 To stop all services: pkill -f 'server.py' || pkill -f 'run_server.py'"
echo ""
echo "✅ Backend services are starting!"
echo "🚀 Frontend will start now - ML services will become available as models finish loading"
echo "💡 Tip: Agentic RAG and Citation Classifier may need 1-2 more minutes to load models"
