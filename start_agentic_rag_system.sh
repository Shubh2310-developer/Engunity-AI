#!/bin/bash

# Agentic RAG System Startup Script
# ==================================

echo "🚀 Starting Agentic RAG System..."
echo "=================================="

# Set environment variables
export RAG_BACKEND_URL="http://localhost:8000"

# Check if backend directory exists
if [ ! -d "/home/ghost/engunity-ai/backend" ]; then
    echo "❌ Backend directory not found!"
    exit 1
fi

# Check if FAISS index exists
if [ ! -f "/home/ghost/engunity-ai/backend/models/documents/nq_faiss_index.faiss" ]; then
    echo "❌ FAISS index not found!"
    exit 1
fi

# Start the agentic RAG backend
echo "Starting Agentic RAG Backend on port 8000..."
cd /home/ghost/engunity-ai/backend

# Kill any existing backend process
pkill -f "agentic_rag_server" 2>/dev/null || true

# Start the backend server
python agentic_rag_server.py &
BACKEND_PID=$!

echo "✅ Backend started with PID: $BACKEND_PID"
echo "⏳ Waiting for backend to initialize..."

# Wait for backend to be ready
for i in {1..30}; do
    if curl -s http://localhost:8000/health >/dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    echo "   Waiting... ($i/30)"
    sleep 2
done

# Check if backend is running
if ! curl -s http://localhost:8000/health >/dev/null 2>&1; then
    echo "❌ Backend failed to start properly"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo "🎉 Agentic RAG System is now running!"
echo "======================================"
echo "Backend URL: http://localhost:8000"
echo "Health Check: http://localhost:8000/health"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "To stop the system:"
echo "  pkill -f agentic_rag_server"
echo ""
echo "Backend PID: $BACKEND_PID"

# Wait for user input to stop
echo "Press Enter to stop the system..."
read

# Cleanup
echo "Stopping Agentic RAG System..."
kill $BACKEND_PID 2>/dev/null || true
echo "✅ System stopped"