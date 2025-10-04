#!/bin/bash

echo "🔧 Fixing Engunity AI Startup Issues..."
echo "======================================"

# Kill existing processes
echo "🛑 Stopping existing services..."
pkill -f 'python.*server.py' 2>/dev/null
pkill -f 'python.*main.py' 2>/dev/null
pkill -f 'next dev' 2>/dev/null

# Wait a moment for processes to terminate
sleep 2

# Start MongoDB if not running
echo "💾 Ensuring MongoDB is running..."
sudo systemctl start mongod 2>/dev/null || echo "MongoDB service not found, assuming it's already running"

# Set proper environment variables
export NODE_ENV=development
export NEXT_TELEMETRY_DISABLED=1

# Navigate to project root
cd /home/ghost/engunity-ai

echo "🚀 Starting backend services..."

# Start main backend
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload > /dev/null 2>&1 &
BACKEND_PID=$!
echo "📝 Main Backend PID: $BACKEND_PID"

# Start fake RAG server
python enhanced_fake_rag_server.py > /dev/null 2>&1 &
RAG_PID=$!
echo "📝 Enhanced RAG PID: $RAG_PID"

# Wait for backends to start
echo "⏳ Waiting for backends to start..."
sleep 5

# Test backend
echo "🧪 Testing backend connectivity..."
curl -s http://localhost:8000/health > /dev/null && echo "✅ Main Backend: OK" || echo "❌ Main Backend: Failed"
curl -s http://localhost:8002/health > /dev/null && echo "✅ Enhanced RAG: OK" || echo "❌ Enhanced RAG: Failed"

cd ../frontend

echo "🎨 Starting frontend..."
echo "📝 Frontend will start at http://localhost:3000"
echo "📝 API will proxy to http://localhost:8000"

# Start frontend with better error handling
npm run dev:frontend-only

echo "🔧 Startup fix completed!"