# 🤖 Complete Models Installation Guide

## 📋 Based on Git Commits and Project Configuration

This guide lists ALL models required for the Engunity AI project to work properly, extracted from git commits, requirements files, and configuration files.

## 🚀 Core AI Models Required

### 1. **BGE Embedding Models** (BAAI - Beijing Academy of AI)

#### Primary Embedding Models:
```bash
# Small model (recommended for development)
BAAI/bge-small-en-v1.5

# Base model (balanced performance)  
BAAI/bge-base-en-v1.5

# Large model (best accuracy, used in production)
BAAI/bge-large-en-v1.5

# Reranker model for enhanced search
BAAI/bge-reranker-base
```

### 2. **Microsoft Phi-2 Model**
```bash
# Local text generation model
microsoft/phi-2
```

### 3. **Cross-Encoder Reranker**
```bash
# For document reranking and relevance scoring
cross-encoder/ms-marco-MiniLM-L-6-v2
```

### 4. **Citation Classifier Model**
```bash
# Custom trained model (already in project)
./backend/training/citation_classifier_arxiv/checkpoint-1501/
```

## 📦 Installation Commands

### Method 1: Automatic Installation (Recommended)
```bash
# Navigate to backend
cd backend

# Install core dependencies first
pip install -r requirements_ultimate_rag.txt

# Preload all models (this will download them)
python preload_models.py

# Setup specific models
python setup_phi2.py
python setup_rag_system.py
```

### Method 2: Manual Model Installation
```bash
# Install sentence-transformers first
pip install sentence-transformers>=2.7.0
pip install transformers>=4.40.0
pip install torch>=2.1.0

# Download models using Python
python -c "
from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer, AutoModel

# BGE Models
print('Downloading BGE models...')
SentenceTransformer('BAAI/bge-small-en-v1.5')
SentenceTransformer('BAAI/bge-base-en-v1.5') 
SentenceTransformer('BAAI/bge-large-en-v1.5')
SentenceTransformer('BAAI/bge-reranker-base')

# Cross-encoder
SentenceTransformer('cross-encoder/ms-marco-MiniLM-L-6-v2')

# Phi-2 Model  
print('Downloading Phi-2 model...')
AutoTokenizer.from_pretrained('microsoft/phi-2')
AutoModel.from_pretrained('microsoft/phi-2')

print('✅ All models downloaded successfully!')
"
```

## 🔧 Model Configuration in Environment

Your `.env` files already have these configurations:
```bash
# Model paths (from restored environment)
EMBEDDING_MODEL_PATH=backend/models/production/cs_document_embeddings
BGE_MODEL=BAAI/bge-small-en-v1.5
GROQ_MODEL=llama-3.3-70b-versatile
CROSS_ENCODER_MODEL=cross-encoder/ms-marco-MiniLM-L-6-v2
PHI2_MODEL=microsoft/phi-2
```

## 🏗️ Project-Specific Model Structure

### Local Model Directories:
```
backend/models/
├── production/
│   └── cs_document_embeddings/    # Custom CS embeddings
├── documents/
│   ├── nq_faiss_index.faiss      # FAISS vector index
│   └── nq_metadata.pkl           # Document metadata
└── training/
    └── citation_classifier_arxiv/
        └── checkpoint-1501/       # Citation classifier
```

## 📊 Model Usage by Component

| Component | Models Used | Purpose |
|-----------|-------------|---------|
| **Document Search** | BGE-small/base/large | Text embeddings |
| **Reranking** | BGE-reranker, Cross-encoder | Result refinement |
| **Text Generation** | Phi-2, GROQ API | Answer generation |
| **Citation Classification** | Custom ArXiv model | Research paper analysis |
| **Fallback Search** | Wikipedia API | External knowledge |

## 🚦 Verification Commands

### Check if models are installed:
```bash
# Check BGE models
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-small-en-v1.5')"

# Check Phi-2
python -c "from transformers import AutoModel; AutoModel.from_pretrained('microsoft/phi-2')"

# Check cross-encoder
python -c "from sentence_transformers import CrossEncoder; CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')"
```

### Test model loading:
```bash
cd backend
python preload_models.py
```

## 💾 Storage Requirements

| Model | Size | Storage Location |
|-------|------|------------------|
| BGE-small-en-v1.5 | ~133MB | ~/.cache/huggingface/ |
| BGE-base-en-v1.5 | ~438MB | ~/.cache/huggingface/ |
| BGE-large-en-v1.5 | ~1.34GB | ~/.cache/huggingface/ |
| microsoft/phi-2 | ~5.2GB | ~/.cache/huggingface/ |
| Cross-encoder | ~90MB | ~/.cache/huggingface/ |
| Citation classifier | ~400MB | ./backend/training/ |

**Total: ~7.5GB** (for all models)

## 🔧 Hardware Requirements

### Minimum:
- **RAM**: 8GB+ (for BGE + Phi-2)
- **Storage**: 10GB free space
- **CPU**: Multi-core recommended

### Recommended:
- **RAM**: 16GB+ 
- **GPU**: RTX 4050+ (for faster inference)
- **Storage**: SSD with 15GB+ free space

## 🚀 Quick Start After Installation

```bash
# Start the complete system
./start-app.sh

# Or start minimal RAG system
./start-minimal.sh

# Test model loading
cd backend && python preload_models.py
```

---

**✅ Follow this guide to install all required models for complete Engunity AI functionality!**