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
echo "🚀 Starting Main Backend Server (Port 8000)..."
if ! check_port 8000; then
    nohup /home/ghost/anaconda3/envs/enginuity-ai/bin/python main.py > main_backend.log 2>&1 &
    MAIN_BACKEND_PID=$!
    echo "📝 Main Backend PID: $MAIN_BACKEND_PID"
else
    echo "✅ Main Backend Server already running on port 8000"
fi

# Wait for main backend to start
sleep 3

echo ""
echo "🔥 Starting Enhanced Fake RAG Server (Port 8002)..."
if ! check_port 8002; then
    nohup /home/ghost/anaconda3/envs/enginuity-ai/bin/python enhanced_fake_rag_server.py > enhanced_fake_rag_server.log 2>&1 &
    ENHANCED_RAG_PID=$!
    echo "📝 Enhanced RAG PID: $ENHANCED_RAG_PID"
else
    echo "✅ Enhanced RAG Server already running on port 8002"
fi

# Wait for enhanced RAG to start
sleep 3

echo ""
echo "🤖 Starting Agentic RAG Server (Port 8001)..."
if ! check_port 8001; then
    if [ -f "agentic_rag_server.py" ]; then
        nohup /home/ghost/anaconda3/envs/enginuity-ai/bin/python agentic_rag_server.py > agentic_rag_server.log 2>&1 &
        AGENTIC_RAG_PID=$!
        echo "📝 Agentic RAG PID: $AGENTIC_RAG_PID"
        sleep 3
    else
        echo "⚠️  agentic_rag_server.py not found - skipping"
    fi
else
    echo "✅ Agentic RAG Server already running on port 8001"
fi

echo ""
echo "🧠 Starting Citation Classification Server (Port 8003)..."
if ! check_port 8003; then
    if [ -f "citation_classification_server.py" ]; then
        nohup /home/ghost/anaconda3/envs/enginuity-ai/bin/python citation_classification_server.py > citation_classification_server.log 2>&1 &
        CITATION_PID=$!
        echo "📝 Citation Classifier PID: $CITATION_PID"
        sleep 4  # Give it more time to load the ML model
    else
        echo "⚠️  citation_classification_server.py not found - skipping"
    fi
else
    echo "✅ Citation Classification Server already running on port 8003"
fi

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
echo "🧪 Testing backend services..."

# Test Main Backend
echo -n "Testing Main Backend (8000)... "
if curl -s http://localhost:8000/api/health > /dev/null; then
    echo "✅"
else
    echo "❌"
fi

# Test Enhanced RAG
echo -n "Testing Enhanced RAG (8002)... "
if curl -s http://localhost:8002/health > /dev/null; then
    echo "✅"
else
    echo "❌"
fi

# Test Agentic RAG
echo -n "Testing Agentic RAG (8001)... "
if curl -s http://localhost:8001/health > /dev/null; then
    echo "✅"
else
    echo "❌"
fi

# Test Citation Classification
echo -n "Testing Citation Classifier (8003)... "
if curl -s http://localhost:8003/health > /dev/null; then
    echo "✅"
else
    echo "❌"
fi

echo ""
echo "🎯 All Backend Services Status:"
echo "   - Main Backend: http://localhost:8000 (File uploads, data analysis)"
echo "   - Enhanced Fake RAG: http://localhost:8002 (CS-specific queries)"
echo "   - Agentic RAG: http://localhost:8001 (General queries)"
echo "   - Citation Classifier: http://localhost:8003 (AI citation classification)"
echo "   - MongoDB: Running"
echo ""
echo "📊 Service Logs:"
echo "   - Main Backend: backend/main_backend.log"
echo "   - Enhanced RAG: backend/enhanced_fake_rag_server.log"
echo "   - Agentic RAG: backend/agentic_rag_server.log"
echo "   - Citation Classifier: backend/citation_classification_server.log"
echo ""
echo "🛑 To stop all services: pkill -f 'server.py' || pkill -f 'run_server.py'"
echo ""
echo "✅ Backend services are ready!"
echo "🚀 You can now start the frontend with 'npm run dev'"
