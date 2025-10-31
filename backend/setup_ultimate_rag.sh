#!/bin/bash
# Ultimate RAG Setup Script for Python 3.10
# Properly installs all dependencies without conflicts

set -e

echo "=========================================="
echo "Ultimate RAG Setup for Python 3.10"
echo "=========================================="
echo ""

# Check Python version
PYTHON_VERSION=$(python --version 2>&1 | awk '{print $2}')
echo "✓ Python version: $PYTHON_VERSION"

# Verify we're in the correct environment
if [[ "$VIRTUAL_ENV" != *"engunity"* ]]; then
    echo "⚠️  Warning: Not in 'engunity' virtual environment"
    echo "   Current environment: ${VIRTUAL_ENV:-none}"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "Step 1: Installing base dependencies..."
echo "----------------------------------------"
pip install -r requirements.txt

echo ""
echo "Step 2: Installing RAG-specific dependencies..."
echo "------------------------------------------------"
pip install -r requirements_ultimate_rag_compatible.txt

echo ""
echo "Step 3: Verifying Groq API key..."
echo "-----------------------------------"
if [ -f .env ]; then
    if grep -q "GROQ_API_KEY" .env; then
        GROQ_KEY=$(grep "GROQ_API_KEY" .env | cut -d '=' -f2)
        if [ -z "$GROQ_KEY" ]; then
            echo "❌ GROQ_API_KEY is empty in .env file"
            exit 1
        else
            echo "✓ GROQ_API_KEY found in .env: ${GROQ_KEY:0:20}..."
        fi
    else
        echo "❌ GROQ_API_KEY not found in .env file"
        echo "   Please add: GROQ_API_KEY=your_key_here"
        exit 1
    fi
else
    echo "❌ .env file not found"
    echo "   Please create .env file with GROQ_API_KEY"
    exit 1
fi

echo ""
echo "Step 4: Testing imports..."
echo "--------------------------"
python -c "
import sys
print('Testing imports...')

try:
    import torch
    print('✓ PyTorch:', torch.__version__)
except ImportError as e:
    print('❌ PyTorch import failed:', e)
    sys.exit(1)

try:
    import sentence_transformers
    print('✓ sentence-transformers:', sentence_transformers.__version__)
except ImportError as e:
    print('❌ sentence-transformers import failed:', e)
    sys.exit(1)

try:
    import faiss
    print('✓ FAISS:', faiss.__version__)
except ImportError as e:
    print('❌ FAISS import failed:', e)
    sys.exit(1)

try:
    from groq import Groq
    print('✓ Groq client:', 'OK')
except ImportError as e:
    print('❌ Groq import failed:', e)
    sys.exit(1)

try:
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    print('✓ LangChain:', 'OK')
except ImportError as e:
    print('❌ LangChain import failed:', e)
    sys.exit(1)

try:
    import redis
    print('✓ Redis:', redis.__version__)
except ImportError as e:
    print('⚠️  Redis not available (optional):', e)

print('')
print('All critical imports successful!')
"

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Import tests failed. Please check error messages above."
    exit 1
fi

echo ""
echo "Step 5: Verifying RAG module..."
echo "--------------------------------"
python -c "
import sys
sys.path.insert(0, '.')

try:
    from app.services.rag.ultimate_groq_rag import (
        UltimateHybridRAG,
        RAGConfig,
        create_ultimate_rag
    )
    print('✓ Ultimate RAG module imports successfully')

    config = RAGConfig()
    print('✓ RAGConfig created')
    print(f'  - BGE model: {config.bge_model}')
    print(f'  - Groq model: {config.groq_model}')
    print(f'  - Chunk size: {config.chunk_size}')
    print(f'  - Top-k retrieval: {config.top_k_retrieval}')
    print(f'  - Top-k rerank: {config.top_k_rerank}')

except Exception as e:
    print(f'❌ RAG module import/init failed: {e}')
    import traceback
    traceback.print_exc()
    sys.exit(1)
"

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ RAG module verification failed. Please check error messages above."
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Start the backend server:"
echo "   cd /home/ghost/Engunity-AI/backend"
echo "   uvicorn app.main:app --reload --port 8000"
echo ""
echo "2. Test the RAG system:"
echo "   python test_ultimate_rag.py"
echo ""
echo "3. Use the API endpoints:"
echo "   - POST /api/v1/ultimate-rag/upload"
echo "   - POST /api/v1/ultimate-rag/query"
echo "   - GET /api/v1/ultimate-rag/health"
echo "   - GET /api/v1/ultimate-rag/stats"
echo ""
echo "Configuration:"
echo "  - Model: llama-3.1-70b-versatile"
echo "  - BGE embeddings: BAAI/bge-small-en-v1.5"
echo "  - FAISS index: HNSW"
echo "  - Re-ranking: Enabled"
echo "  - Redis cache: Enabled (if Redis available)"
echo ""
