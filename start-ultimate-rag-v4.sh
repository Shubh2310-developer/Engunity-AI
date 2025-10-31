#!/bin/bash
# Start Ultimate RAG v4.0 and ensure it's the only RAG server running

set -e

echo "=============================================="
echo "Starting Ultimate RAG v4.0 System"
echo "=============================================="
echo ""

# Kill any old RAG servers on ports 8000-8003
echo "1. Stopping old RAG servers..."
for port in 8000 8001 8002 8003; do
    PID=$(lsof -ti:$port 2>/dev/null || echo "")
    if [ ! -z "$PID" ]; then
        echo "   Killing process on port $port (PID: $PID)"
        kill -9 $PID 2>/dev/null || true
    fi
done
sleep 2
echo "   ✅ Old servers stopped"
echo ""

# Activate conda environment
echo "2. Activating conda environment..."
source ~/anaconda3/etc/profile.d/conda.sh
conda activate engunity
echo "   ✅ Environment activated"
echo ""

# Navigate to backend
cd /home/ghost/Engunity-AI/backend

# Start Ultimate RAG v4.0 server
echo "3. Starting Ultimate RAG v4.0 server on port 8003..."
nohup python -u servers/ultimate_rag_v4_server.py > /tmp/ultimate_rag_v4.log 2>&1 &
ULTIMATE_PID=$!
echo "   ✅ Ultimate RAG v4.0 started (PID: $ULTIMATE_PID)"
echo ""

# Wait for server to be ready
echo "4. Waiting for server to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:8003/health >/dev/null 2>&1; then
        echo "   ✅ Server is ready!"
        break
    fi
    echo "   Waiting... ($i/30)"
    sleep 1
done
echo ""

# Verify health
echo "5. Verifying server health..."
HEALTH=$(curl -s http://localhost:8003/health)
echo "$HEALTH" | jq '.'
echo ""

# Show status
echo "=============================================="
echo "✅ ULTIMATE RAG V4.0 SYSTEM READY"
echo "=============================================="
echo ""
echo "Server Details:"
echo "  URL: http://localhost:8003"
echo "  PID: $ULTIMATE_PID"
echo "  Logs: tail -f /tmp/ultimate_rag_v4.log"
echo ""
echo "Features Active:"
echo "  ✅ Advanced text preprocessing"
echo "  ✅ Semantic chunking (800 chars, 200 overlap)"
echo "  ✅ BGE-large embeddings (1024-dim)"
echo "  ✅ Hybrid retrieval (BM25 + FAISS)"
echo "  ✅ Cross-encoder re-ranking"
echo "  ✅ Best-of-N generation (N=3)"
echo "  ✅ Gemini web search"
echo "  ✅ Quality metrics & grounding"
echo ""
echo "Next Steps:"
echo "  1. Refresh frontend: Ctrl+Shift+R"
echo "  2. Ask your question in browser"
echo "  3. Monitor logs: tail -f /tmp/ultimate_rag_v4.log"
echo ""
echo "Test query:"
echo "  curl -X POST http://localhost:8003/query \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"query\": \"test\", \"document_id\": \"test\"}'"
echo ""
