# Engunity AI – Performance and RAM Optimization Plan

This document provides a comprehensive, practical plan to reduce RAM usage, improve cold-start and steady-state performance, and address loading issues across the stack (backend, vector store, model pipelines, database, frontend, Docker, and infra). All recommendations are tailored to this repository after scanning key files and configs.

Key files referenced:
- Backend model preload: `backend/preload_models.py`
- FAISS vector store: `backend/vector_store/cs_faiss_manager.py`
- MongoDB client: `backend/database/mongodb.py`
- Optimized RAG server (alt path): `backend/servers/optimized_rag_server.py`
- RAG pipeline: `backend/app/services/rag/rag_pipeline.py`
- Next.js configs: `frontend/next.config.js`, `frontend/next.config.mjs`
- Dockerfiles: `backend/Dockerfile.dev`, `code-executor/Dockerfile`, `backend/training/Dockerfile.opal`
- Requirements show heavy AI deps: `backend/requirements_*.txt`

---

## Executive Summary (Prioritized)

1) Fix heavy preload and hard-coded paths; adopt lazy + on-demand loading for models and indexes
- Problem: `backend/preload_models.py` eagerly loads BGE retriever (FAISS), Phi-2 generator, classifier, and a Wikipedia agent at process start, with hard-coded absolute paths. This increases RAM and lengthens startup.
- Action:
  - Remove or gate preloading behind an env flag: `ENABLE_PRELOAD=false` by default.
  - Refactor services to lazy-init model instances on first use and cache them.
  - Replace hard-coded paths with envs, default to storage paths inside repo or mounted volume.

2) Optimize FAISS memory and persistence strategy
- Problem: `cs_faiss_manager.py` uses multiple in-memory IndexFlatIP indexes; GPU resources are created on-demand and written to disk explicitly, but there’s no memory map/on-disk mode and resource reuse may be suboptimal.
- Action:
  - Use IVF or HNSW for large indexes (HNSW already appears conditionally) with tuned parameters; enable PQ for memory reduction when recall is acceptable.
  - Enable memory-mapped indices (faiss-mmap) where applicable; store on disk and mmapped at load.
  - Reuse a single `StandardGpuResources` instance; avoid per-index instantiation.
  - Prefer CPU for steady-state if GPU RAM is constrained; serialize GPU indices to CPU before saving.

3) Right-size model stack and quantize
- Use sentence-transformers small models (already BGE-small is used in optimized server) and quantize generators (bitsandbytes 4-bit where feasible).
- Consider offloading generation to Groq/OpenAI (already configured in optimized server) for smaller infra RAM.

4) Database connection and query hygiene
- Motor client currently uses defaults; set explicit pool sizes, timeouts, compressors.
- Ensure indexes are created (helper present) and use projection/limits everywhere to reduce payloads.

5) FastAPI/uvicorn server performance defaults
- Enable HTTP compression, keep-alive tuning, workers based on CPU; use uvloop and httptools; stream responses where applicable.

6) Frontend build and runtime memory
- There are two Next.js config files (`next.config.js` and `next.config.mjs`) – risk of confusion/duplication. Consolidate to a single config.
- Leverage code-splitting and dynamic imports; analyze bundle and trim heavy libs; enable image optimization and caching.

7) Docker and runtime flags for low RAM
- Use multi-stage images, wheels cache, pip `--no-cache-dir`, set thread envs (OMP/MKL/NUMBA) and PyTorch thread caps; Node’s `NODE_OPTIONS=--max-old-space-size=2048` during build to prevent OOM while bounding RAM.

8) Introduce centralized caching (Redis) for RAG outputs and embeddings to reduce repeated work.

---

## Backend – Models and Pipelines

### A. Replace eager preloading with lazy, on-demand loading
File: `backend/preload_models.py`
- Issue: Eager loads multiple heavy components and hard-codes absolute paths like `/home/ghost/engunity-ai/...`.
- Plan:
  - Guard entire script with env: `ENABLE_PRELOAD`.
  - Move preloading logic behind try/except with timeouts, or remove and rely on lazy-init inside services.
  - Replace absolute paths with envs: `FAISS_INDEX_PATH`, `FAISS_META_PATH`, `CITATION_MODEL_PATH`.

Implementation pattern (example wrapper):
```python
# lazy_resource.py
from functools import lru_cache

def lazy_singleton(factory):
    instance = None
    def get():
        nonlocal instance
        if instance is None:
            instance = factory()
        return instance
    return get
```

Apply to model services (pseudo):
```python
from functools import lru_cache
from sentence_transformers import SentenceTransformer

@lru_cache(maxsize=1)
def get_embedder():
    model_name = os.getenv("EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    return SentenceTransformer(model_name, device=os.getenv("EMBED_DEVICE", "cpu"))
```

### B. Quantization and CPU/GPU threading
- Use bitsandbytes for 4-bit, 8-bit loading where appropriate for local LLMs.
- Cap threads to avoid RAM spikes and contention:
```bash
export OMP_NUM_THREADS=1
export OPENBLAS_NUM_THREADS=1
export MKL_NUM_THREADS=1
export NUMEXPR_NUM_THREADS=1
export PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:64
```
- In Python startup (uvicorn entry):
```python
import torch, os
threads = int(os.getenv("TORCH_NUM_THREADS", "1"))
torch.set_num_threads(threads)
torch.set_num_interop_threads(threads)
```

### C. Prefer external inference for generation
- `backend/servers/optimized_rag_server.py` already uses Groq’s Llama 3.3; use this path in production to minimize local RAM.
- Keep local small generator only for offline or fallback.

### D. Cache responses and partial results
- The optimized server includes response caching metrics. Generalize: add Redis-backed cache for RAG answers (key: hash(query+topk_ctx)) with TTL.
- Cache embeddings per document chunk (hash text) to avoid recompute.

---

## Vector Store – FAISS

File: `backend/vector_store/cs_faiss_manager.py`

### A. Use approximate indexes for scale
- For large corpora, `IndexFlatIP` is memory hungry. Switch to:
  - `IndexIVFPQ` with product quantization for substantial RAM savings, or
  - `IndexHNSWFlat` (already partially used) with tuned M (32) and efSearch (64–200).

Example (IVFPQ skeleton):
```python
quantizer = faiss.IndexFlatIP(d)
index = faiss.IndexIVFPQ(quantizer, d, nlist=4096, m=16, nbits=8)
index.train(train_vectors)
index.add(vectors)
index.nprobe = 16
```

### B. Memory-mapped indices
- Save and load with memory mapping to avoid full resident set in RAM after startup:
```python
faiss.write_index(index, path)
# Load with mmap
faiss.cvar.use_mmap = True
faiss.cvar.mmap_prefetch = 0
index = faiss.read_index(path, faiss.IO_FLAG_MMAP)
```
- Keep a configurable `IO_FLAG_MMAP` path in your manager; fall back to normal read if not supported.

### C. GPU resource management
- Create a single `StandardGpuResources` and reuse across indexes; avoid per-call creation.
- When saving, convert GPU -> CPU, write, and optionally discard GPU copy when memory constrained.

### D. Batch and streaming add
- For ingestion, add vectors in batches and call `faiss.Index.pretransform` or `add_with_ids` as needed; avoid holding large arrays at once.

---

## Database – MongoDB (Motor)

File: `backend/database/mongodb.py`

### A. Connection string with pool, timeouts, compression
Use env for a tuned URI, e.g.:
```
MONGO_URI=mongodb://host:27017/engunity-ai?maxPoolSize=50&minPoolSize=5&serverSelectionTimeoutMS=5000&connectTimeoutMS=3000&socketTimeoutMS=10000&compressors=zstd,snappy&retryWrites=true&w=majority
```
- For Atlas, also add Stable API versions where applicable.

### B. Motor client options
```python
_mongo_client = AsyncIOMotorClient(
    MONGO_URI,
    appname="engunity-backend",
    uuidRepresentation="standard",
    serverSelectionTimeoutMS=5000
)
```

### C. Query hygiene
- Always apply projections to limit fields.
- Use indexes (your `ensure_indexes` already helps). Add TTL where useful for temp data.
- Paginate all list endpoints; cap per-page.

---

## FastAPI / Uvicorn / Asgi

- Enable uvloop/httptools for event loop and parser:
```bash
uvicorn app.main:app \
  --host 0.0.0.0 --port 8000 \
  --workers ${WEB_CONCURRENCY:-1} \
  --loop uvloop --http httptools \
  --proxy-headers --forwarded-allow-ips "*" \
  --timeout-keep-alive 5
```
- GZip/Brotli middleware for responses >1KB.
- StreamingResponse for long generations; send tokens as they arrive to avoid buffering RAM.
- Use `async` HTTP clients (httpx) with connection pooling and timeouts for external APIs.

---

## Frontend – Next.js

Files: `frontend/next.config.js`, `frontend/next.config.mjs`

### A. Consolidate config
- Maintain a single Next.js config (prefer `.mjs` with ESM). Remove duplication to avoid conflicts. Merge settings:
  - `experimental.optimizePackageImports` and `optimizeCss` (already present)
  - `images` domain list, caching TTL
  - `webpack` production chunking and dev memory caps

### B. Dev build memory and speed
- Keep `config.parallelism = 1` in dev to lower peak RAM (already in `.js` config).
- Use `babel`/SWC cache and `turbo` if applicable.
- Set `NODE_OPTIONS=--max-old-space-size=2048` during `next build` to prevent OOM but cap RAM.

### C. Code splitting and dynamic import
- Use `next/dynamic` for heavy components (charts, editors) with `ssr:false` when client-only.
- Split vendor libs (already configured in `.mjs` via cacheGroups).
- Remove unused heavy dependencies; run `next-bundle-analyzer` periodically.

### D. Image and asset hygiene
- Enforce WebP/AVIF output, proper sizes, and long-term cache headers (already configured).
- Lazy-load offscreen images.

---

## Docker and Runtime Images

- Use multi-stage builds for backend and frontend.
- Backend Python image
  - Base: `python:3.10-slim`
  - Install build deps only in builder; copy wheels to runtime stage.
  - `pip install --no-cache-dir` and use `PIP_NO_CACHE_DIR=1`.
  - Set env threads: `OMP/MKL/OPENBLAS/NUMEXPR` to 1.
- Frontend Node image
  - Base: `node:20-slim`
  - During build: `NODE_OPTIONS=--max-old-space-size=2048`
  - Use `pnpm` or `npm ci` with cache mounts.
- Consider `--mount=type=cache` in Dockerfile for pip and npm caches to speed builds without RAM bloat.

Example snippet for pip cache in Docker:
```dockerfile
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -r requirements.txt
```

---

## Observability and Leak Detection

- Enable Prometheus metrics for process RSS, GC, and request latencies.
- Use `tracemalloc` sampling in a debug endpoint to spot growth.
- Add a memory watchdog (`backend/utils/memory_monitor.py` exists) – integrate it and emit alerts.

---

## Loading Issues – Common Root Causes & Fixes

1) Eager preloading of heavy models or indexes
- Fix by lazy-init and on-demand caching.

2) Large FAISS indices fully loaded on start
- Use memory-mapped load; defer loading specific domain indexes until first query in that domain.

3) Next.js dev server exhausts RAM
- Reduce parallelism (already), limit JS source maps, use dynamic imports; consider splitting workspaces.

4) MongoDB slow starts under DNS/SSL misconfig
- Set timeouts, warm ping with retry, log detailed connection timings.

---

## Concrete Action Checklist

- [ ] Remove absolute paths and enable env-driven paths for models and FAISS.
- [ ] Convert preloading to lazy-init with in-process caches; disable by default via `ENABLE_PRELOAD`.
- [ ] Implement FAISS mmapped load and consider IVFPQ/HNSW for large datasets; reuse single GPU resource.
- [ ] Add Redis and wire response/embedding caches in RAG pipeline.
- [ ] Set Torch thread caps and BLAS thread envs in server startup.
- [ ] Tune Motor client and MongoDB URI with pool/timeouts/compression.
- [ ] Consolidate Next.js configs; keep dev parallelism=1; add bundle analyzer, dynamic imports.
- [ ] Update Dockerfiles to multi-stage with caches; cap Node memory during build.
- [ ] Integrate `memory_monitor.py` in server; expose `/metrics`.

---

## Snippets to Drop In

### Env variables (example)
```
# models and indices
EMBED_MODEL=sentence-transformers/all-MiniLM-L6-v2
EMBED_DEVICE=cpu
FAISS_INDEX_PATH=/data/faiss/index.faiss
FAISS_META_PATH=/data/faiss/meta.pkl
CITATION_MODEL_PATH=/models/citation_classifier
ENABLE_PRELOAD=false

# torch / blas
TORCH_NUM_THREADS=1
OMP_NUM_THREADS=1
OPENBLAS_NUM_THREADS=1
MKL_NUM_THREADS=1
NUMEXPR_NUM_THREADS=1
PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:64

# mongodb
MONGO_URI=mongodb://localhost:27017/engunity-ai?maxPoolSize=50&minPoolSize=5&serverSelectionTimeoutMS=5000&connectTimeoutMS=3000&socketTimeoutMS=10000&compressors=zstd,snappy

# node build
NODE_OPTIONS=--max-old-space-size=2048
```

### FastAPI middleware (gzip + caching headers)
```python
from fastapi.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=1024)
```

### Uvicorn prod command
```
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --workers 2 --loop uvloop --http httptools --timeout-keep-alive 5
```

---

## Notes on Repository-Specific Observations

- There are multiple RAG server variants; prefer `optimized_rag_server.py` for production due to lighter local RAM usage via external LLM and caching.
- `cs_faiss_manager.py` already contains HNSW support; extend usage and make it default for large corpora; add mmap load path.
- Next.js configs are duplicated (.js and .mjs). Choose one and merge; prefer `.mjs` to keep ESM. Ensure dev optimization (parallelism=1) remains.
- Heavy requirements indicate potential for large installs; pin consistent versions and remove unused extras. Consider optional extras groups.

---

If you want, I can turn these into PR-ready changes with env templates, Dockerfile updates, and refactors for lazy model loading and FAISS mmap.
