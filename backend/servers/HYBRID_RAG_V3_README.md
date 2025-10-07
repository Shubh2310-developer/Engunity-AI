# 🚀 Hybrid RAG v3.0 - Production System

## Overview

Hybrid RAG v3.0 is a **production-ready** document analysis system that combines real semantic search, powerful LLM generation, and intelligent web fallback for accurate, grounded answers.

### 🎯 Key Differences from Previous Versions

| Feature | Enhanced Fake RAG v2.0 | **Hybrid RAG v3.0** |
|---------|----------------------|-------------------|
| **Embeddings** | ❌ Simulated | ✅ Real BGE embeddings |
| **Vector Store** | ❌ None | ✅ ChromaDB (persistent) |
| **Retrieval** | ❌ Fake chunks | ✅ True semantic search |
| **LLM** | ✅ Groq Llama-3.3-70B | ✅ Groq Llama-3.3-70B |
| **Web Fallback** | ✅ Wikipedia | ✅ Wikipedia (confidence-based) |
| **Document Type Detection** | ✅ Basic | ✅ Advanced |
| **Response Quality** | ⚠️  Simulated | ✅ Real scoring |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Hybrid RAG v3.0 Pipeline                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Query Received  │
                    └──────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
    ┌──────────────────┐           ┌──────────────────┐
    │ Document Indexing│           │ Query Processing │
    │  (if new doc)    │           │                  │
    └──────────────────┘           └──────────────────┘
              │                               │
              │    ┌─────────────────────────┤
              │    │                         │
              ▼    ▼                         ▼
    ┌──────────────────┐           ┌──────────────────┐
    │  BGE Embeddings  │           │  BGE Retrieval   │
    │ (BAAI/bge-base)  │           │  (Top 5 chunks)  │
    └──────────────────┘           └──────────────────┘
              │                               │
              │                               ▼
              │                     ┌──────────────────┐
              │                     │ Confidence Check │
              │                     │   (threshold)    │
              │                     └──────────────────┘
              │                               │
              │                    ┌──────────┴──────────┐
              │                    │                     │
              │              High (>0.85)          Low (<0.85)
              │                    │                     │
              │                    ▼                     ▼
              │          ┌──────────────────┐  ┌──────────────────┐
              │          │ Document Context │  │ Wikipedia Search │
              │          │      Only        │  │  + Doc Context   │
              │          └──────────────────┘  └──────────────────┘
              │                    │                     │
              │                    └──────────┬──────────┘
              │                               │
              │                               ▼
              │                     ┌──────────────────┐
              │                     │   Groq LLM       │
              │                     │ (Llama-3.3-70B)  │
              │                     └──────────────────┘
              │                               │
              │                               ▼
              │                     ┌──────────────────┐
              │                     │ Response Cleaner │
              │                     │  (Remove noise)  │
              │                     └──────────────────┘
              │                               │
              └───────────────────────────────┼───────────────┐
                                              │               │
                                              ▼               ▼
                                    ┌──────────────────┬──────────────────┐
                                    │  Final Response  │    Metadata      │
                                    └──────────────────┴──────────────────┘
```

---

## 🧩 Components

### 1. **BGE Retriever**
- **Model**: `BAAI/bge-base-en-v1.5`
- **Embedding Dimension**: 768
- **Features**:
  - Real semantic embeddings (not simulated)
  - Document chunking with overlap
  - Automatic document type detection
  - Cosine similarity scoring

### 2. **Vector Store (ChromaDB)**
- **Persistent Storage**: `./data/chroma_db`
- **Features**:
  - Per-document collections
  - Metadata filtering
  - Efficient nearest neighbor search
  - Automatic persistence

### 3. **Groq Generator**
- **Model**: `llama-3.3-70b-versatile`
- **Features**:
  - Document-grounded generation
  - Specialized prompts per document type
  - Configurable temperature (0.7)
  - Max tokens: 1024

### 4. **Web Fallback Search**
- **Source**: Wikipedia
- **Trigger**: Confidence < 0.85
- **Features**:
  - Query enhancement based on document type
  - Content extraction and cleaning
  - Source attribution

### 5. **Response Cleaner**
- **Removes**:
  - Markdown formatting (```, **, *, #)
  - Artifacts (===, ---, ___)
  - Extra whitespace
  - Code blocks

---

## 📊 Configuration

### Key Parameters

```python
# BGE Embeddings
BGE_MODEL = "BAAI/bge-base-en-v1.5"
EMBEDDING_DIM = 768

# Retrieval Settings
TOP_K_CHUNKS = 5                    # Number of chunks to retrieve
SIMILARITY_THRESHOLD = 0.75         # Min similarity for relevance
WEB_FALLBACK_THRESHOLD = 0.85       # Trigger web search below this

# Groq LLM
GROQ_MODEL = "llama-3.3-70b-versatile"
MAX_TOKENS = 1024
TEMPERATURE = 0.7

# Document Processing
CHUNK_SIZE = 512                    # Characters per chunk
CHUNK_OVERLAP = 50                  # Overlap between chunks
MAX_CONTEXT_LENGTH = 4000           # Max context for LLM
```

---

## 🔄 Processing Pipeline

### Step-by-Step Flow

1. **Document Indexing** (on first query or upload)
   - Detect document type (Python, TypeScript, SQL, etc.)
   - Split into chunks with overlap
   - Generate BGE embeddings
   - Store in ChromaDB collection

2. **Query Processing**
   - Encode query using BGE
   - Retrieve top K chunks via semantic search
   - Calculate similarity scores

3. **Confidence Evaluation**
   - Compute mean similarity score
   - If < 0.85: **Trigger web fallback**
   - If ≥ 0.85: **Use document context only**

4. **Context Construction**
   - Merge top 3 chunks
   - Add web search results if triggered
   - Prepare specialized prompt

5. **Answer Generation**
   - Call Groq Llama-3.3-70B
   - Use document type-specific system prompt
   - Generate grounded answer

6. **Response Cleaning**
   - Remove formatting artifacts
   - Clean whitespace
   - Return polished answer

---

## 🎯 Document Type Detection

The system automatically detects document types for specialized processing:

| Document Type | Detection Method | Specialized Prompt |
|---------------|------------------|-------------------|
| **Python** | File extension (`.py`) or content keywords (`def`, `import`, `class`) | Python expert system prompt |
| **TypeScript** | File extension (`.ts`, `.tsx`) or content keywords (`interface`, `type`) | TypeScript expert prompt |
| **JavaScript** | File extension (`.js`, `.jsx`) or keywords (`function`, `const`, `let`) | JavaScript expert prompt |
| **SQL** | File extension (`.sql`) or keywords | Database expert prompt |
| **PostgreSQL** | Content keywords (`postgresql`, `postgres`) | PostgreSQL expert prompt |
| **General** | Default fallback | Technical assistant prompt |

---

## 📈 Example Metadata Response

```json
{
  "answer": "TypeScript is a strongly typed programming language...",
  "confidence": 0.92,
  "source_type": "document",
  "source_chunks_used": [
    "TypeScript extends JavaScript by adding...",
    "The TypeScript compiler performs...",
    "Key features include static typing..."
  ],
  "processing_time": 3.45,
  "metadata": {
    "pipeline_type": "hybrid_rag_v3",
    "components_used": [
      "BGE Retriever",
      "Groq Llama-3.3-70B"
    ],
    "document_type": "typescript",
    "retrieval_stats": {
      "chunks_retrieved": 5,
      "mean_similarity": 0.92,
      "top_similarity": 0.96,
      "fallback_triggered": false
    },
    "response_cleaning": "completed",
    "model": "llama-3.3-70b-versatile",
    "bge_model": "BAAI/bge-base-en-v1.5"
  }
}
```

---

## 🚀 Usage

### Starting the Server

```bash
cd /home/ghost/engunity-ai/backend/servers
/home/ghost/anaconda3/envs/engunity/bin/python hybrid_rag_v3_server.py
```

Server will start on: **http://localhost:8003**

### API Endpoints

#### 1. Process Query
```bash
POST /query

{
  "query": "What is TypeScript?",
  "document_id": "doc123",
  "document_text": "TypeScript is a strongly typed...",
  "metadata": {
    "filename": "typescript_guide.md"
  }
}
```

#### 2. Health Check
```bash
GET /health
```

#### 3. System Status
```bash
GET /status
```

---

## 🧪 Testing

### Test with curl

```bash
# Health check
curl http://localhost:8003/health

# Status check
curl http://localhost:8003/status

# Query test
curl -X POST http://localhost:8003/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the main features?",
    "document_id": "test_doc",
    "document_text": "This is a test document about Python programming. Python is a high-level language with features like dynamic typing, garbage collection, and extensive libraries."
  }'
```

---

## 🔧 Environment Variables

```bash
# Required
GROQ_API_KEY=your_groq_api_key_here

# Optional (defaults shown)
HYBRID_RAG_V3_BACKEND_URL=http://localhost:8003
CHROMA_PERSIST_DIR=./data/chroma_db
```

---

## 📦 Dependencies

```
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
sentence-transformers>=2.2.2
chromadb>=0.4.18
numpy>=1.24.0
groq>=0.4.0
wikipedia>=1.4.0
```

Install with:
```bash
pip install -r requirements_hybrid_rag.txt
```

---

## 🎓 Advanced Features

### Future Enhancements

- [ ] **Cross-encoder reranking** for better relevance
- [ ] **FAISS HNSW** for faster retrieval
- [ ] **Citation injection** with source tracking
- [ ] **Conversation memory** in vector DB
- [ ] **Tavily/SerpAPI** for better web search
- [ ] **LLM ensemble** for verification

---

## 🐛 Troubleshooting

### Issue: "Collection not found"
**Solution**: Document hasn't been indexed yet. The first query will automatically index it.

### Issue: "Groq API error"
**Solution**: Check that `GROQ_API_KEY` is set correctly in environment.

### Issue: "Low confidence scores"
**Solution**: Document text might be too short or irrelevant. Check document content quality.

### Issue: "ChromaDB permission error"
**Solution**: Ensure `./data/chroma_db` directory has write permissions.

---

## 📝 Comparison Table

| Metric | Fake RAG v2.0 | **Hybrid RAG v3.0** |
|--------|--------------|-------------------|
| Embeddings Quality | ❌ Simulated | ✅ Real BGE |
| Retrieval Accuracy | ⚠️  Random | ✅ Semantic |
| Vector Storage | ❌ None | ✅ Persistent |
| Confidence Scoring | ⚠️  Random | ✅ Real similarity |
| Document Types | ⚠️  Basic | ✅ Advanced |
| Production Ready | ❌ No | ✅ Yes |

---

## 📄 License

MIT License - Engunity AI Team

---

## 🙏 Credits

- **BGE Embeddings**: [BAAI/bge-base-en-v1.5](https://huggingface.co/BAAI/bge-base-en-v1.5)
- **LLM**: [Groq Llama-3.3-70B](https://groq.com/)
- **Vector Store**: [ChromaDB](https://www.trychroma.com/)
- **Web Search**: [Wikipedia API](https://pypi.org/project/wikipedia/)

---

**Version**: 3.0.0
**Status**: ✅ Production Ready
**Last Updated**: October 2025
