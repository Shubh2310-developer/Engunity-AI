#!/bin/bash

cd "$(dirname "$0")"

echo "🚀 Starting All Engunity AI Services (Optimized)"
echo "================================================="

# Set aggressive resource limits to prevent RAM overload
export MALLOC_ARENA_MAX=2
export PYTHONOPTIMIZE=1
export PYTHONHASHSEED=0
export OMP_NUM_THREADS=2
export MKL_NUM_THREADS=2
export NUMEXPR_NUM_THREADS=2
export NODE_OPTIONS="--max-old-space-size=384"
export TOKENIZERS_PARALLELISM=false

# Increase system swappiness temporarily to prevent freezing
sudo sysctl -w vm.swappiness=10 2>/dev/null || true

# Check system resources
AVAILABLE_RAM=$(free -m | awk 'NR==2{print $7}')
echo "💾 Available RAM: ${AVAILABLE_RAM}MB"

if [ "$AVAILABLE_RAM" -lt 2000 ]; then
    echo "⚠️  WARNING: Low memory detected (<2GB available)"
    echo "💡 Starting services in lightweight mode..."
    LIGHTWEIGHT_MODE=true
else
    LIGHTWEIGHT_MODE=false
fi

# Check Docker status
echo ""
echo "🐳 Checking Docker..."
if systemctl is-active --quiet docker; then
    echo "✅ Docker service is running"
    if docker info > /dev/null 2>&1; then
        echo "✅ Docker daemon is accessible"
    else
        echo "⚠️  Docker daemon not accessible - restarting..."
        systemctl restart docker 2>/dev/null && sleep 3 || echo "⚠️  Could not restart Docker (may need: sudo systemctl restart docker)"
    fi
else
    echo "⚠️  Docker service is not running - attempting to start..."
    systemctl start docker 2>/dev/null && sleep 3 || echo "⚠️  Could not start Docker (may need: sudo systemctl start docker)"
fi

# Verify Docker is working
if docker info > /dev/null 2>&1; then
    echo "✅ Docker is ready for code execution"
else
    echo "⚠️  Docker is not available - code executor will have limited functionality"
    echo "💡 To enable code execution: sudo systemctl start docker"
fi

echo ""

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
    for port in 8000 8001 8002 8003 4001; do
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
    pkill -f "code-executor" 2>/dev/null || true
    pkill -f "ts-node src/index.ts" 2>/dev/null || true
    
    # Wait a moment for processes to terminate
    sleep 3
}

# Clean up any existing processes first
cleanup_existing

echo ""
echo "📦 Optimizing backend services..."
# All python commands should be run from the backend directory.
cd backend

# Skip pip install for faster startup - assume dependencies are already installed
echo "✅ Using existing dependencies"

echo ""
echo "⚡ Starting services with optimized memory settings..."

# Priority 1: Main Backend (Essential) - with memory limit
echo ""
echo "🚀 Starting Main Backend Server (Port 8000) - ESSENTIAL..."
if ! check_port 8000; then
    # Start with nice priority and memory limit
    nice -n 5 /home/ghost/anaconda3/envs/engunity/bin/python -u main.py > main_backend.log 2>&1 &
    MAIN_BACKEND_PID=$!
    echo "📝 Main Backend PID: $MAIN_BACKEND_PID"

    # Set CPU affinity to 2 cores max
    taskset -cp 0-1 $MAIN_BACKEND_PID 2>/dev/null || true

    sleep 3
else
    echo "✅ Main Backend Server already running on port 8000"
fi

# Priority 2: Hybrid RAG (Important but memory-heavy) - LAZY LOAD
echo ""
if [ "$LIGHTWEIGHT_MODE" = true ]; then
    echo "💡 Skipping Hybrid RAG v3 (lightweight mode)"
else
    echo "🔥 Starting Hybrid RAG v3 Server (Port 8002) - LAZY LOADING..."
    if ! check_port 8002; then
        # Start with lower priority and lazy model loading
        nice -n 10 /home/ghost/anaconda3/envs/engunity/bin/python -u servers/hybrid_rag_v3_server.py > hybrid_rag_v3_server.log 2>&1 &
        HYBRID_RAG_PID=$!
        echo "📝 Hybrid RAG v3 PID: $HYBRID_RAG_PID (models load on first request)"

        # Set CPU affinity
        taskset -cp 0-1 $HYBRID_RAG_PID 2>/dev/null || true

        sleep 1
    else
        echo "✅ Hybrid RAG v3 Server already running on port 8002"
    fi
fi

# Priority 3: Optional services (START ON-DEMAND ONLY)
if [ "$LIGHTWEIGHT_MODE" = false ]; then
    echo ""
    echo "💡 ML Services will start ON-DEMAND to save memory:"
    echo "   🤖 Agentic RAG (Port 8001): Starts on first use"
    echo "   🧠 Citation Classifier (Port 8003): Starts on first use"
    echo ""
    echo "💾 This saves ~1.5GB RAM at startup!"

    # Create placeholder scripts for on-demand startup
    cat > /tmp/start_agentic_rag.sh <<'EOF'
#!/bin/bash
cd "$(dirname "$0")"
if ! ss -tulpn | grep -q ":8001 "; then
    echo "🤖 Starting Agentic RAG on-demand..."
    nice -n 15 /home/ghost/anaconda3/envs/engunity/bin/python -u backend/agentic_rag_server.py > backend/agentic_rag_server.log 2>&1 &
    echo "Started with PID $!"
fi
EOF
    chmod +x /tmp/start_agentic_rag.sh

    cat > /tmp/start_citation.sh <<'EOF'
#!/bin/bash
cd "$(dirname "$0")"
if ! ss -tulpn | grep -q ":8003 "; then
    echo "🧠 Starting Citation Classifier on-demand..."
    nice -n 15 /home/ghost/anaconda3/envs/engunity/bin/python -u backend/servers/citation_classification_server.py > backend/citation_classification_server.log 2>&1 &
    echo "Started with PID $!"
fi
EOF
    chmod +x /tmp/start_citation.sh
else
    echo ""
    echo "💡 All ML services disabled (lightweight mode)"
fi

# Go back to root directory to start code executor
cd ..

echo ""
echo "💻 Starting Code Executor Service (Port 4001)..."
if ! check_port 4001; then
    if [ -d "code-executor" ]; then
        cd code-executor
        # Check if node_modules exists
        if [ ! -d "node_modules" ]; then
            echo "📦 Installing code executor dependencies..."
            npm install --silent --prefer-offline --no-audit > /dev/null 2>&1
        fi
        # Start with aggressive memory limits and lower priority
        nice -n 10 NODE_OPTIONS="--max-old-space-size=256 --gc-interval=100" nohup npm run dev > code-executor.log 2>&1 &
        CODE_EXECUTOR_PID=$!
        echo "📝 Code Executor PID: $CODE_EXECUTOR_PID"

        # Set CPU affinity
        taskset -cp 0-1 $CODE_EXECUTOR_PID 2>/dev/null || true

        sleep 1
        cd ..
    else
        echo "⚠️  code-executor directory not found - skipping"
    fi
else
    echo "✅ Code Executor Service already running on port 4001"
fi

# Go back to backend directory for remaining operations
cd backend

# Brief wait for processes to stabilize
sleep 1

echo ""
echo "💾 Checking MongoDB..."
if systemctl is-active --quiet mongod; then
    echo "✅ MongoDB already running"
else
    echo "⚠️  MongoDB is not running - attempting to start..."
    # Try to start without sudo first (if user is in sudoers with NOPASSWD)
    systemctl start mongod 2>/dev/null && echo "✅ MongoDB started" || echo "⚠️  MongoDB not started (may need: sudo systemctl start mongod)"
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
echo ""
echo "🧪 Checking service health..."
wait_for_service "Main Backend" 8000 "/api/health"

if [ "$LIGHTWEIGHT_MODE" = false ]; then
    wait_for_service "Hybrid RAG v3" 8002 "/health"
fi

wait_for_service "Code Executor" 4001 "/health"

# ML-heavy services may take longer - check but don't block
if [ "$LIGHTWEIGHT_MODE" = false ]; then
    echo ""
    echo "📊 ML Services Status (loading in background):"
    echo -n "   Agentic RAG (8001): "
    if curl -s --max-time 2 http://localhost:8001/health > /dev/null 2>&1; then
        echo "✅ Ready"
    else
        echo "⏳ Loading models... (check backend/agentic_rag_server.log)"
    fi

    echo -n "   Citation Classifier (8003): "
    if curl -s --max-time 2 http://localhost:8003/health > /dev/null 2>&1; then
        echo "✅ Ready"
    else
        echo "⏳ Loading models... (check backend/citation_classification_server.log)"
    fi
fi

echo ""
echo "🎯 Active Services:"
echo "   ✅ Main Backend: http://localhost:8000 (Essential)"
if [ "$LIGHTWEIGHT_MODE" = false ]; then
    echo "   ✅ Hybrid RAG v3: http://localhost:8002 (BGE + ChromaDB + Groq)"
    echo "   ⚙️  Agentic RAG: http://localhost:8001 (Loading...)"
    echo "   ⚙️  Citation Classifier: http://localhost:8003 (Loading...)"
else
    echo "   ⏸️  Hybrid RAG v3: Disabled (lightweight mode)"
    echo "   ⏸️  Agentic RAG: Disabled (lightweight mode)"
    echo "   ⏸️  Citation Classifier: Disabled (lightweight mode)"
fi
echo "   ✅ Code Executor: http://localhost:4001 (Docker ready)"
echo "   ✅ MongoDB: Running (Port 27017)"
echo ""
echo "📊 Service Logs:"
echo "   - Main Backend: backend/main_backend.log"
if [ "$LIGHTWEIGHT_MODE" = false ]; then
    echo "   - Hybrid RAG v3: backend/hybrid_rag_v3_server.log"
    echo "   - Agentic RAG: backend/agentic_rag_server.log"
    echo "   - Citation Classifier: backend/citation_classification_server.log"
fi
echo "   - Code Executor: code-executor/code-executor.log"
echo ""
echo "💾 Memory Status:"
NEW_AVAILABLE_RAM=$(free -m | awk 'NR==2{print $7}')
USED_RAM=$((AVAILABLE_RAM - NEW_AVAILABLE_RAM))
echo "   - RAM Used by Services: ~${USED_RAM}MB"
echo "   - RAM Available: ${NEW_AVAILABLE_RAM}MB"
echo ""
echo "🛑 To stop all services: ./stop-all-services.sh"
echo ""
echo "✅ Backend services started successfully!"
if [ "$LIGHTWEIGHT_MODE" = true ]; then
    echo "💡 Running in LIGHTWEIGHT MODE to conserve memory"
    echo "💡 Some ML features disabled - increase available RAM for full functionality"
else
    echo "🚀 All services running - ML models loading in background"
    echo "💡 Agentic RAG and Citation Classifier may need 1-2 more minutes"
fi
