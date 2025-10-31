# 🚀 ULTIMATE RAG SYSTEM - QUICK START GUIDE

**Get your production-grade RAG system running in 5 minutes!**

---

## ✅ PREREQUISITES CHECK

Before starting, verify you have:

```bash
# 1. Python 3.9+
python --version  # Should show 3.9 or higher

# 2. Git (to clone repositories)
git --version

# 3. 8GB+ RAM recommended
free -h

# 4. Groq API Key (get free at https://console.groq.com)
# Sign up and get your API key

# 5. Redis (optional but recommended)
redis-cli ping  # Should return "PONG"
# If not installed:
# Ubuntu/Debian: sudo apt-get install redis-server
# macOS: brew install redis && brew services start redis
```

---

## 📦 STEP 1: INSTALL DEPENDENCIES

```bash
cd /home/ghost/Engunity-AI/backend

# Install Ultimate RAG dependencies
pip install -r requirements_ultimate_rag.txt

# If you have GPU:
pip install faiss-gpu --upgrade

# Verify installation
python -c "import torch; print(f'PyTorch: {torch.__version__}')"
python -c "import sentence_transformers; print('Sentence Transformers: OK')"
python -c "import groq; print('Groq: OK')"
python -c "import faiss; print('FAISS: OK')"
```

---

## 🔑 STEP 2: SET UP ENVIRONMENT

```bash
# Create .env file
cat > .env << EOF
GROQ_API_KEY=your_actual_groq_api_key_here
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
EOF

# Or export directly
export GROQ_API_KEY="your_actual_groq_api_key_here"
```

---

## 🧪 STEP 3: RUN TESTS (OPTIONAL)

```bash
# Test the Ultimate RAG system
python test_ultimate_rag.py

# Expected output:
# ✓ System initialization: PASSED
# ✓ Document ingestion: PASSED
# ✓ Query execution: 5/5 PASSED
# ✓ Performance benchmarks: PASSED
# ✓ Error handling: PASSED
```

---

## 🚀 STEP 4: START THE SERVER

```bash
# Start the FastAPI backend
cd /home/ghost/Engunity-AI/backend
python app/main.py

# Or with uvicorn directly
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Server will start at: http://localhost:8000
# API docs at: http://localhost:8000/docs
```

---

## 📄 STEP 5: TEST WITH CURL

### Upload a Document

```bash
# Test with sample text
curl -X POST "http://localhost:8000/api/v1/ultimate-rag/upload?document_id=test_doc" \
  -H "Content-Type: multipart/form-data" \
  -F 'text=Deep learning is a subset of machine learning that uses neural networks with multiple layers. CNNs are specialized for image processing. RNNs are designed for sequential data.'

# Response:
# {
#   "success": true,
#   "document_id": "test_doc",
#   "chunk_count": 3,
#   "embedding_dim": 768,
#   "index_size": 3,
#   "ingestion_time_ms": 234.5,
#   "message": "Document processed successfully into 3 chunks"
# }
```

### Query the Document

```bash
# Ask a question
curl -X POST "http://localhost:8000/api/v1/ultimate-rag/query" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is deep learning?",
    "document_id": "test_doc"
  }'

# Response:
# {
#   "success": true,
#   "answer": "Deep learning is a subset of machine learning that uses neural networks with multiple layers...",
#   "confidence": 0.87,
#   "total_latency_ms": 456.7,
#   ...
# }
```

### Upload PDF

```bash
# Upload a PDF file
curl -X POST "http://localhost:8000/api/v1/ultimate-rag/upload?document_id=my_pdf" \
  -F "file=@/path/to/your/document.pdf"
```

### Check Health

```bash
curl http://localhost:8000/api/v1/ultimate-rag/health

# Response:
# {
#   "status": "healthy",
#   "components": {
#     "bge_embedder": "healthy",
#     "faiss_index": "healthy",
#     "groq_generator": "healthy",
#     "redis_cache": "healthy",
#     "cross_encoder": "healthy"
#   },
#   "version": "1.0.0"
# }
```

---

## 🎯 STEP 6: USE IN PYTHON

```python
import requests

# Base URL
BASE_URL = "http://localhost:8000/api/v1/ultimate-rag"

# 1. Upload document
with open("document.pdf", "rb") as f:
    response = requests.post(
        f"{BASE_URL}/upload",
        params={"document_id": "my_doc"},
        files={"file": f}
    )
    print(response.json())

# 2. Query document
response = requests.post(
    f"{BASE_URL}/query",
    json={
        "query": "What is the main topic?",
        "document_id": "my_doc",
        "top_k": 5
    }
)

result = response.json()
print(f"Answer: {result['answer']}")
print(f"Confidence: {result['confidence']:.2%}")
print(f"Latency: {result['total_latency_ms']}ms")
```

---

## 📊 PERFORMANCE TIPS

### For Speed (< 300ms queries)

```python
# Optimize config for speed
config = RAGConfig(
    top_k_retrieval=10,      # Reduce from 20
    top_k_rerank=3,          # Reduce from 5
    enable_redis_cache=True, # MUST enable
    temperature=0.1,         # Lower = faster
    max_tokens=300           # Reduce from 500
)
```

### For Accuracy (best quality)

```python
# Optimize config for accuracy
config = RAGConfig(
    top_k_retrieval=30,      # Increase
    top_k_rerank=10,         # Increase
    enable_reranking=True,   # MUST enable
    score_threshold_strict=0.75,  # Stricter
    temperature=0.2          # Balanced
)
```

### For Large Documents (10k+ words)

```python
# Optimize for large documents
config = RAGConfig(
    chunk_size=800,          # Larger chunks
    chunk_overlap=200,       # More overlap
    faiss_index_type="HNSW", # Fast search
    hnsw_ef_search=256       # More accurate
)
```

---

## 🐛 TROUBLESHOOTING

### Issue: "GROQ_API_KEY not set"

```bash
# Solution 1: Export in terminal
export GROQ_API_KEY="gsk_your_key_here"

# Solution 2: Add to .env file
echo "GROQ_API_KEY=gsk_your_key_here" >> .env

# Solution 3: Pass directly in code
rag = UltimateHybridRAG(config, groq_api_key="gsk_your_key_here")
```

### Issue: "CUDA out of memory"

```bash
# Solution: Use CPU
export CUDA_VISIBLE_DEVICES=""
# Or in config:
config = RAGConfig(device="cpu", fp16=False)
```

### Issue: "Redis connection failed"

```bash
# Check if Redis is running
redis-cli ping

# Start Redis
# Ubuntu: sudo systemctl start redis
# macOS: brew services start redis

# Or disable Redis
config = RAGConfig(enable_redis_cache=False)
```

### Issue: "Import errors"

```bash
# Reinstall dependencies
pip install --upgrade --force-reinstall -r requirements_ultimate_rag.txt

# Check installations
pip list | grep -E "(torch|faiss|groq|sentence)"
```

### Issue: "Slow performance"

```bash
# 1. Enable Redis caching
export REDIS_HOST=localhost

# 2. Use GPU if available
# Install: pip install faiss-gpu torch torchvision

# 3. Reduce retrieval size
# Set top_k_retrieval=10 in config

# 4. Check system resources
htop  # Monitor CPU/RAM usage
nvidia-smi  # Monitor GPU (if available)
```

---

## 📚 NEXT STEPS

1. **Read Full Documentation**
   ```bash
   cat ULTIMATE_RAG_SYSTEM.md
   ```

2. **Explore API Docs**
   - Open browser: http://localhost:8000/docs
   - Try interactive API testing

3. **Integrate with Frontend**
   - Frontend hook already available at: `frontend/src/hooks/useRAG.ts`
   - Update API URL to point to Ultimate RAG endpoints

4. **Production Deployment**
   - Set up proper reverse proxy (Nginx)
   - Configure SSL/TLS
   - Set up monitoring (Prometheus/Grafana)
   - Enable proper logging
   - Scale Redis for high traffic

5. **Monitor Performance**
   ```bash
   # Check stats
   curl http://localhost:8000/api/v1/ultimate-rag/stats

   # Monitor logs
   tail -f logs/ultimate_rag.log
   ```

---

## 🎉 YOU'RE DONE!

Your Ultimate RAG system is now running!

**Quick verification:**
```bash
# Health check
curl http://localhost:8000/api/v1/ultimate-rag/health | jq

# Upload test
curl -X POST "http://localhost:8000/api/v1/ultimate-rag/upload?document_id=test" \
  -F 'text=AI is transforming industries worldwide.'

# Query test
curl -X POST "http://localhost:8000/api/v1/ultimate-rag/query" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is AI doing?", "document_id": "test"}' | jq
```

**Expected latency:**
- Cold query (first time): 400-600ms
- Warm query (cached): 50-100ms
- Document ingestion: 2-5s per 1000 words

---

## 💡 PRO TIPS

1. **Always use Redis** for production (10x speedup)
2. **Enable GPU** if available (2-3x faster embeddings)
3. **Monitor confidence scores** - if consistently < 0.5, review documents
4. **Batch upload** large documents in chunks for better progress tracking
5. **Clear cache** periodically to free memory: `curl -X POST http://localhost:8000/api/v1/ultimate-rag/clear-cache`

---

**Need help?** Check the full documentation in `ULTIMATE_RAG_SYSTEM.md`

**Found a bug?** Open an issue on GitHub

**Happy RAGing! 🚀**
