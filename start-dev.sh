#!/bin/bash

echo "🚀 Starting Engunity AI - Development Mode"
echo "=========================================="

# Kill any existing processes
echo "🛑 Cleaning up existing processes..."
pkill -f "python.*server.py" 2>/dev/null
pkill -f "python.*main.py" 2>/dev/null
pkill -f "next dev" 2>/dev/null
pkill -f "uvicorn" 2>/dev/null

# Wait for processes to terminate
sleep 2

# Check MongoDB
echo "💾 Checking MongoDB..."
if pgrep -x "mongod" > /dev/null; then
    echo "✅ MongoDB is running"
else
    echo "⚠️  MongoDB not detected, attempting to start..."
    sudo systemctl start mongod 2>/dev/null || echo "  MongoDB service not available, will use fallback"
fi

# Set environment variables
export NODE_ENV=development
export NEXT_TELEMETRY_DISABLED=1

# Navigate to project directory
cd /home/ghost/engunity-ai

echo "🔧 Configuration:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000" 
echo "   Mode:     Local Development (no external dependencies required)"

# Start backend services in background
echo ""
echo "🐍 Starting backend services..."

# Start main backend
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload > ../backend.log 2>&1 &
MAIN_PID=$!
echo "   Main Backend (PID: $MAIN_PID): http://localhost:8000"

# Start enhanced RAG server
python enhanced_fake_rag_server.py > ../rag.log 2>&1 &
RAG_PID=$!
echo "   Enhanced RAG (PID: $RAG_PID): http://localhost:8002"

# Wait for backends to initialize
echo ""
echo "⏳ Waiting for backends to start..."
sleep 5

# Test backends
echo "🧪 Testing backend connectivity..."
if curl -s -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "   ✅ Main Backend: Ready"
else
    echo "   ⚠️  Main Backend: Starting (may take a moment)"
fi

if curl -s -f http://localhost:8002/health > /dev/null 2>&1; then
    echo "   ✅ Enhanced RAG: Ready"
else
    echo "   ⚠️  Enhanced RAG: Starting (may take a moment)"
fi

# Start frontend
echo ""
echo "🎨 Starting frontend..."
cd ../frontend

echo "📝 Frontend will be available at: http://localhost:3000"
echo "📝 Backend logs: ../backend.log"
echo "📝 RAG logs: ../rag.log"
echo ""
echo "🔍 To stop all services: pkill -f 'python.*server' && pkill -f 'next dev'"
echo ""

# Start frontend (this will block)
npm run dev:frontend-only 2>&1

echo ""
echo "🛑 Frontend stopped. Backend services may still be running."
echo "   Use: pkill -f 'python.*server' to stop all backend services"