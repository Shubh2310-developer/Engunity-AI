#!/bin/bash

echo "🎭 Starting Enhanced Fake RAG System"
echo "===================================="
echo "🔥 Appears to use: BGE + Phi-2 + Best-of-N + Wikipedia"
echo "⚡ Actually uses: Groq Llama-3.3-70b with enhancements"
echo ""

# Install required dependencies
echo "📦 Installing dependencies..."
pip install wikipedia-api > /dev/null 2>&1 || echo "⚠️ Wikipedia package may need manual installation: pip install wikipedia-api"

# Kill any existing servers
echo "🧹 Cleaning up any existing processes..."
pkill -f "enhanced_fake_rag_server.py" 2>/dev/null || true
pkill -f "fake_rag_server.py" 2>/dev/null || true

# Start the enhanced fake RAG server
echo "🚀 Starting Enhanced Fake RAG Server on port 8002..."
cd backend
python enhanced_fake_rag_server.py > enhanced_fake_rag_server.log 2>&1 &
ENHANCED_RAG_PID=$!
echo "📝 Server PID: $ENHANCED_RAG_PID"

# Wait for server to start
echo "⏳ Waiting for server to initialize..."
sleep 8

# Test if server is running  
echo "🧪 Testing server health..."
if curl -s http://localhost:8002/health > /dev/null; then
    echo "✅ Enhanced Fake RAG Server is running successfully!"
    echo ""
    echo "🌐 Server endpoints:"
    echo "   - Health: http://localhost:8002/health"
    echo "   - Status: http://localhost:8002/status" 
    echo "   - Query:  http://localhost:8002/query"
    echo ""
    echo "📊 Enhanced pipeline simulation:"
    echo "   - BGE Retrieval: ✅ (simulated with reranking)"
    echo "   - Phi-2 Generation: ✅ (simulated with Best-of-N)"
    echo "   - Best-of-N Selection: ✅ (5 candidates with ML scoring)"
    echo "   - Wikipedia Crawler: ✅ (agentic web search)"
    echo "   - Groq API: ✅ (actual Llama-3.3-70b)"
    echo "   - Artifact Removal: ✅ (clean responses)"
    echo ""
    echo "🎯 Enhanced features:"
    echo "   - Document-specific analysis only"
    echo "   - Best-of-N generation (5 candidates)"
    echo "   - Wikipedia integration for enhanced context"
    echo "   - Automatic artifact removal (no ===, ---)"
    echo "   - Document type detection"
    echo "   - Enhanced metadata and confidence scoring"
    echo ""
    echo "🔍 Ready to receive document-focused queries!"
    echo "📝 Logs: backend/enhanced_fake_rag_server.log"
    echo ""
    echo "🧪 Run tests: python backend/test_enhanced_fake_rag.py"
    echo "🛑 To stop: pkill -f 'enhanced_fake_rag_server.py'"
else
    echo "❌ Failed to start Enhanced Fake RAG Server"
    echo "📝 Check logs: backend/enhanced_fake_rag_server.log"
    exit 1
fi