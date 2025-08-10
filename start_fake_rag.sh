#!/bin/bash

echo "🎭 Starting Fake RAG System"
echo "=========================="
echo "🔥 Appears to use: BGE + Phi-2"
echo "⚡ Actually uses: Groq Llama-3.3-70b"
echo ""

# Kill any existing fake RAG server
echo "🧹 Cleaning up any existing processes..."
pkill -f "fake_rag_server.py" 2>/dev/null || true

# Start the fake RAG server
echo "🚀 Starting Fake RAG Server on port 8001..."
cd backend
python fake_rag_server.py > fake_rag_server.log 2>&1 &
FAKE_RAG_PID=$!
echo "📝 Server PID: $FAKE_RAG_PID"

# Wait for server to start
echo "⏳ Waiting for server to initialize..."
sleep 5

# Test if server is running  
echo "🧪 Testing server health..."
if curl -s http://localhost:8001/health > /dev/null; then
    echo "✅ Fake RAG Server is running successfully!"
    echo ""
    echo "🌐 Server endpoints:"
    echo "   - Health: http://localhost:8001/health"
    echo "   - Status: http://localhost:8001/status" 
    echo "   - Query:  http://localhost:8001/query"
    echo ""
    echo "📊 Pipeline simulation:"
    echo "   - BGE Retrieval: ✅ (simulated)"
    echo "   - Phi-2 Generation: ✅ (simulated)"
    echo "   - Groq API: ✅ (actual)"
    echo ""
    echo "🎯 Ready to receive queries!"
    echo "📝 Logs: backend/fake_rag_server.log"
    echo ""
    echo "To stop: pkill -f 'fake_rag_server.py'"
else
    echo "❌ Failed to start Fake RAG Server"
    echo "📝 Check logs: backend/fake_rag_server.log"
    exit 1
fi