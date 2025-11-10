# Engunity AI – Document RAG Feature Plan and Implementation Guide

Last updated: {{DATE}}

## Executive Summary
This document proposes a comprehensive set of enhancements across backend (FastAPI RAG service), frontend (Next.js Chat & Code page), database (MongoDB persistence layer), API routes, and service orchestration (start-all-services.sh) to make the Document RAG system fast, robust, and delightful to use. The plan focuses on:
- Speed: faster ingestion, retrieval, and generation
- Quality: better relevance with re-ranking, query reformulation, and grounded answers
- Reliability: health checks, retries, graceful degradation, and observability
- UX polish: document panel, sources, citations, previews, upload progress, and controls
- Data model: richer session metadata, metrics, and indexing

---

## 1) Backend – `backend/servers/document_chat_rag.py`

### A. Retrieval Quality and Relevance
1. Add re-ranking step (optional, behind a flag):
   - Use a cross-encoder or lightweight reranker (e.g., bge-reranker-base, Cohere Rerank if allowed) on top-K retrieved chunks (e.g., 30 → rerank → top 6).
   - Config flags: `ENABLE_RERANK=true`, `RERANK_TOP_K=30`, `FINAL_TOP_K=6`.
2. Add Max Marginal Relevance (MMR) deduplication over cosine retrieval to reduce redundancy.
3. Query rewrite / decomposition:
   - Use a short LLM call to reformulate conversational queries with context into a better search query.
   - Cache query rewrites per session to avoid extra cost on repeats.
4. Conversational memory-aware retrieval:
   - Keep a rolling conversation summary (at session level) and include as context while building queries.
   - Maintain a short window of last N messages for additional grounding.

### B. Ingestion and Chunking
1. Smarter chunking by structure:
   - Use header-aware (Markdown/Docx) and page-aware (PDF) chunking; prefer splitting on headings and sections.
   - Preserve section titles in metadata for better citations.
2. OCR support for scanned PDFs (via pytesseract + pdf2image) behind an `ENABLE_OCR` flag.
3. Language detection and multilingual embeddings (optional):
   - Auto-detect language; pick an appropriate embedding model (bge-small-en vs multilingual variant), or use a universal embedder.
4. Duplicate detection:
   - Hash full file bytes and first N KB; if same doc content was uploaded in session, short-circuit re-index.
5. Background indexing pipeline:
   - Immediately acknowledge upload; run embedding and Chroma add in an asyncio Task; emit SSE progress events (0–100%).

### C. Performance and Cost
1. Batch embeddings and use no_grad; optionally enable ONNX/accelerated inference.
2. Enable result caching:
   - LRU cache by `(session_id, normalized_query, doc_ids, top_k)` → stream replay; TTL via in-memory cache.
3. Adaptive k and threshold:
   - Auto-tune `TOP_K_CHUNKS` and similarity threshold per query difficulty; expose UI override.
4. Multi-vector retrieval (optional):
   - Create title/query expansion vectors to increase recall.

### D. Output, Citations, and Safety
1. Consolidated sources:
   - Group sources by document with chunk indices; provide `start_offset`/`end_offset` fields for UI highlighting.
2. Inline citation markers (e.g., [1], [2]) mapped to the sources array; guarantee final SSE “final” event includes mapping.
3. Safety and guardrails:
   - Enforce document-only mode to refuse answering when no doc context is found; provide helpful requery suggestions.
   - PII redaction hooks if needed for enterprise.

### E. API Enhancements
1. New endpoints:
   - `GET /documents/:doc_id/chunks` → chunk metadata preview for UIs.
   - `POST /feedback` → record user feedback (thumbs up/down) on answers; include sources and confidence.
   - `GET /sessions/:session_id/metrics` → retrieve session metrics.
2. Streaming SSE protocol revision:
   - Send structured `{"type":"token","token":...}` and `{"type":"final", ...}` consistently.
   - Optional per-token provenance (token-level is heavy; chunk-level markers are enough).
3. Configurable model routing:
   - Support environment-driven `GROQ_MODEL`, temperature, and max tokens via query params.

### F. Observability and Resilience
1. Structured logs with request IDs and timings; include retrieval stats (#candidates, #kept, avg similarity).
2. Health and readiness:
   - `GET /health` already exists; add `GET /ready` that verifies vector store connectivity and embedding model.
3. Graceful error modes:
   - Fallback to general chat if hybrid mode and no document matches (configurable).
4. Rate limit and concurrency guard to protect the service.

---

## 2) Frontend – `frontend/src/app/dashboard/chatandcode/page.tsx`

### A. Document Panel and Workflow
1. Multi-file upload and drag-drop zone, with per-file progress and status (Queued → Extracting → Chunking → Embedding → Indexed).
2. Document chips with selection toggles; persisted per session (already saving `uploadedDocuments`, add `selectedDocIds`).
3. Chunk/source preview:
   - Click a source to open a right-side drawer showing chunk content, around context, and jump-to-next.
4. Modes and controls:
   - Toggle: Document-only vs Hybrid.
   - Sliders/inputs: Top-K, similarity threshold, temperature, model.
   - Persist user preferences per session in MongoDB (`session.settings`).

### B. Streaming and Sources UX
1. Real-time token counter and words-per-second indicator.
2. Source footnotes with confidence bars; clicking scrolls to source preview drawer.
3. Inline citation markers in the assistant message; hover tooltip shows filename/chunk.
4. Error banners with retry and auto-diagnostic (check port 8004, health endpoints).

### C. Session Management
1. Pin/rename/archive sessions; context menu on session list.
2. Quick filters: has documents, high confidence answers, last 24h.
3. Session metrics mini-cards (total messages, avg confidence, total tokens) under the header.

### D. Visual Polish
1. Animated skeletons during streaming and upload.
2. Modern chips, progress bars, and segmented controls (Tailwind + motion).
3. Consistent empty states and helper prompts after upload (suggested questions derived from doc headings).

---

## 3) Database – `frontend/src/lib/database/mongodb.ts`

### A. Schema and Indexing
1. Create indexes (run once on startup):
   - `chat_sessions`: `{ sessionId: 1 } (unique)`, `{ userId: 1, updatedAt: -1 }`.
   - `chat_messages`: `{ sessionId: 1, timestamp: 1 }`, `{ messageId: 1 } (unique)`.
   - `document_chats`: `{ documentId: 1 } (unique)`.
2. Extend `ChatSession` with:
   - `settings`: `{ mode: 'hybrid' | 'document-only', topK: number, threshold: number, temperature: number, model: string, selectedDocIds: string[] }`.
   - `metrics`: `{ totalTokens, avgConfidence, avgProcessingTime }` (already present; standardize types).
3. Add `Feedback` collection:
   - Schema: `{ messageId, sessionId, userId, rating: 'up' | 'down', createdAt, comment?, sources? }`.

### B. Service Methods
1. `ChatService.ensureIndexes()` to create/verify indexes.
2. `ChatService.saveFeedback({...})` and `ChatService.getSessionMetrics(sessionId)`.
3. `ChatService.updateSessionSettings(sessionId, settings)` for UI controls.
4. `ChatService.addUploadedDocuments(sessionId, docs)` with dedupe.

---

## 4) API – `frontend/src/app/api/chat/sessions/route.ts` (and related)

### A. Sessions Route
1. Support `settings` updates (mode, topK, threshold, temperature, model, selectedDocIds).
2. Add endpoints (new route files):
   - `POST /api/chat/feedback` → stores feedback.
   - `GET /api/chat/sessions/:sessionId/metrics` → aggregates session metrics.
   - `GET /api/chat/documents?sessionId=...` → list uploaded docs for session.

### B. Chat Stream Route Integration (if using `/api/chat/stream`)
1. Forward selected settings and document IDs to backend RAG when doc mode is active.
2. Persist assistant messages with returned `sources`, `confidence`, `processing_time`.

---

## 5) Orchestration – `start-all-services.sh`

1. Config and secrets validation:
   - Check `GROQ_API_KEY` and fail fast with a helpful message if missing.
   - Print CHROMA path and ensure directories exist.
2. Health and readiness:
   - Keep existing `wait_for_service`; add `/ready` check for RAG.
3. Auto-restart (development convenience):
   - Optional: wrap python servers with `entr` or a small watchdog to restart on crash.
4. Logs and diagnostics:
   - Print tail commands and where to find logs when a service fails readiness.
5. Memory-aware knobs:
   - When `LIGHTWEIGHT_MODE=true`, disable OCR and reranker via env (`ENABLE_OCR=false`, `ENABLE_RERANK=false`).

---

## 6) Concrete Code Change Checklist

Backend (`document_chat_rag.py`):
- [ ] Add config flags for reranking, OCR, query rewrite, caching, and UI overrides.
- [ ] Implement MMR and (optional) reranker step.
- [ ] Add `/feedback`, `/documents/:doc_id/chunks`, `/ready` endpoints.
- [ ] Add OCR path and structured chunking with headings.
- [ ] Include inline citation markers and richer `sources` metadata in final SSE event.
- [ ] Add query rewrite utility and session-level memory summary.

Frontend (`page.tsx`):
- [ ] Add multi-file drag-drop upload with progress.
- [ ] Add controls panel (mode, topK, threshold, temperature, model) and persist via session settings.
- [ ] Show source chips with confidence; drawer to preview chunk text.
- [ ] Token counter and WPS indicator during streaming.
- [ ] Error banner with quick diagnostics and retry.

Database (`mongodb.ts`):
- [ ] Add `ensureIndexes()` and call it from first API hit or a dedicated health endpoint.
- [ ] Add `saveFeedback`, `updateSessionSettings`, `getSessionMetrics`.
- [ ] Extend `ChatSession` with `settings` and `selectedDocIds`.

API (`/api/chat/sessions/route.ts` and new routes):
- [ ] Update PUT to accept `settings`.
- [ ] Add `POST /api/chat/feedback`, `GET /api/chat/sessions/:id/metrics`, `GET /api/chat/documents`.

Orchestration (`start-all-services.sh`):
- [ ] Add `GROQ_API_KEY` check and helpful hint.
- [ ] Add RAG `/ready` endpoint check.
- [ ] Respect `ENABLE_OCR` and `ENABLE_RERANK` in lightweight mode.

---

## 7) Phased Rollout Plan

Phase 1 – Foundations (performance + UX basics)
- Backend: MMR, caching, richer sources, `/ready` endpoint
- Frontend: controls for mode, topK, threshold; source chips; upload progress
- DB: indexes and session settings
- Orchestration: env checks and readiness

Phase 2 – Quality uplift
- Reranker, query rewrite, conversational summary memory
- Source preview drawer and inline citation markers
- Feedback capture and session metrics

Phase 3 – Advanced features
- OCR, multilingual embeddings, result analytics dashboard
- Auto-suggestions from document headings
- Knowledge base export/import and sharing

---

## 8) Acceptance Criteria and KPIs
- p50 time to first token < 1.2s for cached queries; p95 end-to-end < 6s on typical docs
- >20% fewer redundant chunks displayed (MMR on)
- >10% accuracy lift on a 50-question eval set (with reranker)
- Session metrics surfaces in UI; feedback stored and queryable
- No crashes on missing env; clear diagnostics and fallbacks

---

## 9) Appendix – Example API Shapes

Final SSE event (backend):
```json
{
  "type": "final",
  "final": true,
  "message": "... final answer ... [1] [2]",
  "sources": [
    {"filename": "spec.pdf", "chunk_index": 12, "doc_id": "abc123", "confidence": 0.86,
     "start_offset": 1234, "end_offset": 1560, "title": "2.1 Retrieval"}
  ],
  "confidence": 0.83,
  "mode_used": "hybrid",
  "processing_time": 2.91,
  "usage": {"promptTokens": 321, "completionTokens": 512, "totalTokens": 833},
  "sessionId": "session_...",
  "messageId": "msg_...",
  "timestamp": 1731258130
}
```

Session settings (DB):
```json
{
  "settings": { "mode": "hybrid", "topK": 6, "threshold": 0.5, "temperature": 0.7, "model": "llama-3.3-70b-versatile", "selectedDocIds": ["abc123","def456"] }
}
```

Feedback payload:
```json
{ "messageId": "msg_...", "sessionId": "session_...", "userId": "user_...", "rating": "up", "comment": "Helpful", "sources": ["abc123#12"] }
```

---

## 10) Work Items (Backlog)
- Backend
  - Implement MMR and reranker module (flagged)
  - Add OCR path and header-aware chunking
  - Add `/feedback`, `/chunks`, and `/ready` endpoints
- Frontend
  - Controls panel and session settings persistence
  - Source preview drawer and inline citations
  - Multi-file drag-drop with progress
- DB/API
  - Index creation function and feedback endpoints
  - Session metrics aggregation
- Orchestration
  - Env checks and readiness enforcement; lightweight flags


