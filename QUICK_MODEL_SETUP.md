# 🚀 Quick Model Setup Guide

## ⚡ One-Command Installation

```bash
# Run the automated installer
python install_all_models.py
```

## 📋 What Gets Installed

Based on git commits and project configuration:

### 🔤 **Embedding Models (BGE - Beijing Academy of AI)**
- ✅ `BAAI/bge-small-en-v1.5` - Development/testing (133MB)
- ✅ `BAAI/bge-base-en-v1.5` - Balanced performance (438MB)  
- ✅ `BAAI/bge-large-en-v1.5` - Production model (1.34GB)
- ✅ `BAAI/bge-reranker-base` - Enhanced search reranking (278MB)

### 🤖 **Language Models**
- ✅ `microsoft/phi-2` - Local text generation (5.2GB)

### 🎯 **Reranking Models**
- ✅ `cross-encoder/ms-marco-MiniLM-L-6-v2` - Relevance scoring (90MB)

### 📊 **Total Storage**: ~7.5GB

## 🔧 Manual Installation (Alternative)

```bash
# Install dependencies first
pip install torch>=2.1.0 transformers>=4.40.0 sentence-transformers>=2.7.0

# Download BGE models
python -c "
from sentence_transformers import SentenceTransformer
SentenceTransformer('BAAI/bge-small-en-v1.5')
SentenceTransformer('BAAI/bge-base-en-v1.5')
SentenceTransformer('BAAI/bge-large-en-v1.5')
SentenceTransformer('BAAI/bge-reranker-base')
SentenceTransformer('cross-encoder/ms-marco-MiniLM-L-6-v2')
"

# Download Phi-2
python -c "
from transformers import AutoTokenizer, AutoModel
AutoTokenizer.from_pretrained('microsoft/phi-2', trust_remote_code=True)
AutoModel.from_pretrained('microsoft/phi-2', trust_remote_code=True)
"
```

## ✅ Verification

```bash
# Test model loading
cd backend && python preload_models.py

# Start the application
./start-app.sh
```

## 🔄 Environment Variables

Your restored `.env` files already have these models configured:

```bash
BGE_MODEL=BAAI/bge-small-en-v1.5
GROQ_MODEL=llama-3.3-70b-versatile  
CROSS_ENCODER_MODEL=cross-encoder/ms-marco-MiniLM-L-6-v2
PHI2_MODEL=microsoft/phi-2
EMBEDDING_MODEL_PATH=backend/models/production/cs_document_embeddings
```

---
**🎯 After installation, your Engunity AI system will have complete RAG functionality!**