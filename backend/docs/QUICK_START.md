# 🚀 Hybrid RAG v3.0 - Quick Start Guide

## What You Have Now

### ✅ **Production-Ready Hybrid RAG System**

Your system now has **real agentic RAG** capabilities:

1. **Real BGE Embeddings** (BAAI/bge-base-en-v1.5) - Not simulated!
2. **Persistent Vector Storage** (ChromaDB)
3. **Semantic Search** - True document understanding
4. **Intelligent Web Fallback** - Wikipedia search when confidence is low
5. **Document Type Detection** - Specialized handling for Python, TypeScript, SQL, etc.

---

## 🎯 Components Overview

### Your RAG Stack

| Component | Technology | Port | Status |
|-----------|-----------|------|--------|
| **Hybrid RAG v3.0** | BGE + ChromaDB + Groq | 8003 | ✅ Active |
| **Enhanced Fake RAG v2.0** | Groq (simulated BGE) | 8002 | ✅ Backup |
| **Frontend** | Next.js | 3000 | ✅ Active |

---

## 🏃 Running the System

### 1. Start Hybrid RAG v3.0 Server

```bash
cd /home/ghost/engunity-ai/backend/servers
/home/ghost/anaconda3/envs/engunity/bin/python hybrid_rag_v3_server.py
```

**Server URL**: http://localhost:8003

### 2. Check Server Status

```bash
# Quick health check
curl http://localhost:8003/health

# Detailed status
curl http://localhost:8003/status
```

### 3. Test with a Document

```bash
curl -X POST http://localhost:8003/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the main features of TypeScript?",
    "document_id": "test_typescript",
    "document_text": "TypeScript is a strongly typed programming language that builds on JavaScript. Key features include static type checking, type inference, interfaces, generics, and excellent IDE support."
  }'
```

---

## 🔍 How It Works

### Pipeline Flow

```
User Question
    ↓
[1. Index Document] (first time)
    - Split into chunks
    - Generate BGE embeddings
    - Store in ChromaDB
    ↓
[2. Semantic Search]
    - Find relevant chunks
    - Calculate similarity scores
    ↓
[3. Confidence Check]
    - If high (>0.85): Use document only
    - If low (<0.85): Add Wikipedia search
    ↓
[4. Groq Generation]
    - Generate answer with context
    - Use specialized prompts
    ↓
[5. Clean & Return]
    - Remove formatting artifacts
    - Return final answer + metadata
```

---

## 📊 What Makes This "Agentic"?

### Intelligence Features

1. **Autonomous Decision Making**
   - Automatically triggers web search when confidence is low
   - Detects document type without explicit instruction
   - Selects specialized prompts based on content

2. **Multi-Source Integration**
   - Combines document chunks intelligently
   - Merges web search results when needed
   - Attributes sources properly

3. **Self-Evaluation**
   - Calculates confidence scores
   - Knows when document doesn't have the answer
   - Transparently indicates fallback usage

4. **Adaptive Processing**
   - Python docs → Python expert prompt
   - SQL docs → Database expert prompt
   - TypeScript docs → TS expert prompt

---

## 🎓 Example Scenarios

### Scenario 1: High Confidence (Document Only)

**Query**: "What is TypeScript?"
**Document**: TypeScript documentation
**Confidence**: 0.94

**Result**:
- ✅ Uses document chunks only
- ❌ No web search triggered
- 📊 Source type: "document"

### Scenario 2: Low Confidence (Hybrid)

**Query**: "What's the latest TypeScript version?"
**Document**: Old TypeScript guide from 2020
**Confidence**: 0.72

**Result**:
- ✅ Uses document chunks
- ✅ Triggers Wikipedia search
- 📊 Source type: "hybrid"
- ⚠️  Notifies user about web enhancement

### Scenario 3: No Document (Web Fallback)

**Query**: "What is TypeScript?"
**Document**: Empty/Not indexed
**Confidence**: 0.0

**Result**:
- ❌ No document chunks
- ✅ Wikipedia search only
- 📊 Source type: "web_fallback"

---

## 🔧 Configuration

### Key Thresholds

```python
SIMILARITY_THRESHOLD = 0.75      # Min score to consider relevant
WEB_FALLBACK_THRESHOLD = 0.85    # Trigger Wikipedia below this
TOP_K_CHUNKS = 5                 # Retrieve top 5 chunks
```

### Adjusting Behavior

**Want more Wikipedia searches?**
```python
WEB_FALLBACK_THRESHOLD = 0.90  # Higher = more web searches
```

**Want stricter document matching?**
```python
SIMILARITY_THRESHOLD = 0.80    # Higher = stricter filtering
```

**Want more context?**
```python
TOP_K_CHUNKS = 8              # More chunks = more context
```

---

## 📈 Monitoring

### Check Logs

The server provides detailed logging:

```
2025-10-07 11:06:15 - INFO - 🔧 Initializing BGE Retriever
2025-10-07 11:06:18 - INFO - ✅ BGE model loaded successfully
2025-10-07 11:06:19 - INFO - 🔍 Indexing document: test_doc
2025-10-07 11:06:20 - INFO - 📊 Retrieved 5 chunks | Mean similarity: 0.92
2025-10-07 11:06:23 - INFO - ✅ Query processed in 3.45s | Confidence: 0.92
```

### Interpret Confidence Scores

| Confidence | Meaning | Action |
|-----------|---------|--------|
| **0.90 - 1.00** | Excellent match | Document only |
| **0.85 - 0.90** | Good match | Document only |
| **0.70 - 0.85** | Moderate match | Document + Wikipedia |
| **0.50 - 0.70** | Weak match | Wikipedia + Document |
| **< 0.50** | Poor match | Mainly Wikipedia |

---

## 🐛 Troubleshooting

### "Server won't start"

**Check if port 8003 is in use:**
```bash
lsof -ti:8003
# If something running, kill it: kill $(lsof -ti:8003)
```

**Check dependencies:**
```bash
pip list | grep -E "(sentence-transformers|chromadb|groq)"
```

### "Low confidence on good documents"

**Possible causes:**
- Document text is too short
- Document needs better chunking
- Query is too vague

**Solution:**
- Provide more document context
- Rephrase query more specifically
- Check document text quality

### "Groq API errors"

**Check API key:**
```bash
echo $GROQ_API_KEY
```

**Test API directly:**
```bash
curl -X POST https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"llama-3.3-70b-versatile","messages":[{"role":"user","content":"Hi"}]}'
```

---

## 🚀 Next Steps

### Recommended Improvements

1. **Add More Document Types**
   - Edit `detect_document_type()` in hybrid_rag_v3_server.py
   - Add specialized prompts in `_get_system_prompt()`

2. **Enhance Web Search**
   - Replace Wikipedia with Tavily or SerpAPI
   - Add search result ranking
   - Implement source citation

3. **Improve Chunking**
   - Use semantic chunking instead of fixed size
   - Add code-aware chunking for programming docs
   - Implement recursive chunking

4. **Add Reranking**
   - Install cross-encoder: `pip install sentence-transformers`
   - Add reranker model after initial retrieval
   - Improve relevance scoring

---

## 📚 Resources

- **Full Documentation**: [HYBRID_RAG_V3_README.md](./HYBRID_RAG_V3_README.md)
- **Server Code**: [hybrid_rag_v3_server.py](./hybrid_rag_v3_server.py)
- **Frontend Integration**: `/frontend/src/app/api/documents/[id]/qa/route.ts`

---

## ✅ Verification Checklist

- [x] Server running on port 8003
- [x] BGE model loaded successfully
- [x] ChromaDB initialized
- [x] Groq API configured
- [x] Frontend updated to use v3.0
- [x] Documentation complete

---

**You now have a production-ready agentic RAG system! 🎉**

Questions? Check the full docs or test with your own documents.
