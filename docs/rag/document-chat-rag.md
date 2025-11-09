# Document-Centric RAG: Upload-and-Chat System Blueprint (No Code)

This document describes a complete, implementation-ready plan for a document-centric RAG (Retrieval-Augmented Generation) experience where users upload documents and then chat to retrieve grounded answers from those documents (and optionally beyond), similar to ChatGPT’s “ask about your file” feature.

Note: This is a design and workflow guide only—no code. The backend can be implemented in a single Python file (e.g., `backend/document_chat_rag.py`) and the frontend integrated into `frontend/src/app/dashboard/chatandcode/page.tsx`.


## Goals and User Experience

- Users upload one or more documents (PDF, DOCX, TXT, HTML, Markdown).
- System parses, chunks, embeds, and stores vector representations with metadata.
- Users ask questions in a chat UI; the system retrieves relevant chunks and generates an answer grounded in the uploaded documents.
- Supports two modes:
  - Document-only: answer strictly from the uploaded documents; if insufficient, say so.
  - Hybrid: document-first with fallback to general model knowledge (clearly labeled).
- Streaming responses, accurate source citations (page/section), confidence cues, and follow-up suggestions.
- Session isolation and access control per user/workspace.


## Architecture Overview

- Frontend (Next.js, `page.tsx`):
  - Upload component: drag-and-drop, progress, validation.
  - Chat composer: text input, mode switch (document-only vs. hybrid), attach/remove files.
  - Chat window: streaming messages, citations UI with hover previews.
  - Session handling: create/select sessions; attach docs per session.

- Backend (FastAPI single file, e.g., `backend/document_chat_rag.py`):
  - REST endpoints: upload, index status, chat (streaming), delete.
  - Document pipeline: extract → preprocess → chunk → embed → store.
  - Retrieval: similarity search + optional reranking (cross-encoder or RRF).
  - Generation: prompt assembly with citations and safety constraints.
  - Guardrails: max tokens, confidence scoring, off-document checks, safety filters.

- Vector Store:
  - Use FAISS (e.g., via `backend/vector_store/faiss_manager.py`).
  - Index per user/session, or global index with namespace filters.

- Persistence:
  - Documents: original file + normalized text artifacts.
  - Metadata: doc_id, filename, pages, sections, timestamps, owner/session.
  - Chunks: id, doc_id, content, tokens, page range, section title, position.
  - Chats: messages, retrieval logs, model used, prompt template version, token stats.

- Security and Auth:
  - Leverage existing Supabase auth for user identity.
  - Enforce authorization per document/session; signed URLs for download if needed.
  - Rate limiting; file type/size validation at upload.


## Detailed Workflow

### 1) Upload
- User selects files in `page.tsx`.
- Frontend validates types (PDF, DOCX, TXT, MD, HTML), size limits, and optionally runs client-side checks.
- Calls `POST /api/rag/upload` with `multipart/form-data`.
- Backend returns: `doc_id(s)`, `filename(s)`, `page_count` (if known), `job_id(s)`, and status `queued`.

### 2) Ingestion and Indexing
- Backend steps:
  1. Store file in disk/object storage.
  2. Extract text + structure:
     - PDFs: page-wise text; capture page numbers and headings where possible.
     - DOCX/MD/HTML: convert to clean text; preserve headings as metadata.
  3. Split into chunks:
     - Semantic-aware chunking: heading-aware segmentation + token windows (e.g., ~800 tokens with ~150 overlap).
     - Attach metadata: `doc_id`, page range, section title, filename, position.
  4. Embed chunks (e.g., BGE-small, MiniLM, or hosted embeddings via env config).
  5. Upsert vectors to FAISS; store metadata in JSON/SQLite/MongoDB.
  6. Mark status `ready`.

### 3) Chat Query (Per Message)
- Frontend sends `POST /api/rag/chat` with:
  - `session_id`
  - `user_message`
  - `answer_mode`: `document-only` or `hybrid`
  - Optional: `top_k`, `temperature`, `max_tokens`, `doc_ids[]`
- Backend retrieval:
  - Embed the query.
  - Vector search over FAISS filtered by `user_id/session_id/doc_ids`.
  - Optional reranking (e.g., cross-encoder) for top quality.
  - Assemble context under token budget, deduplicate nearby chunks.
- Prompt assembly:
  - Document-only: “Use only provided context; if insufficient, say so; always cite sources.”
  - Hybrid: “Prioritize documents; label general knowledge when used; cite sources.”
  - Include citation markers like `[Doc:Title p.X]` with a final reference map.
- Generation:
  - Stream tokens via SSE or WebSocket.
  - Final payload includes: answer, citations (page/section/chunk), usage, retrieval stats.
- Frontend rendering:
  - Show streamed answer and citation chips with hover preview of source chunks.
  - Display token usage, latency metrics, and follow-up suggestions.

### 4) Hybrid Fallback (Optional)
- If document-only is off and retrieval confidence is low, supplement with general model knowledge.
- Clearly label sources as `Document` or `General`.

### 5) Document Maintenance
- `DELETE /api/rag/document/{doc_id}` removes a document and vectors owned by the user.
- Re-index endpoint to refresh with new settings (chunk size, model changes).


## Backend Single-File Service (Outline Only)

Suggested location: `backend/document_chat_rag.py`.

### Settings (Environment Variables)
- `RAG_EMBEDDING_MODEL`, `RAG_LLM_MODEL`
- `RAG_TOP_K`, `RAG_CHUNK_SIZE`, `RAG_CHUNK_OVERLAP`
- `VECTOR_STORE_PATH` (FAISS path), `STORAGE_PATH` (raw/processed docs)
- `ALLOW_HYBRID`, `MAX_UPLOAD_MB`, `ALLOWED_MIME_TYPES`

Reuse utilities:
- Vector store: `backend/vector_store/faiss_manager.py`
- LLM client patterns: `backend/services/llm.py`
- Auth: `backend/auth/supabase_auth.py`
- DB (optional): `backend/database/mongodb.py`

### HTTP API (FastAPI)
- `POST /api/rag/upload` — validate, store, enqueue indexing; returns `doc_id(s)`, `job_id(s)`.
- `GET /api/rag/status?job_id=…` — `queued|processing|ready|error`, progress, error.
- `POST /api/rag/chat` — accepts session/message/mode; streams tokens; returns final answer + citations + usage.
- `DELETE /api/rag/document/{doc_id}` — delete document and vectors if authorized.

### Pipeline Helpers
- `extract_text(file)`: adapters for PDF/DOCX/TXT/MD/HTML.
- `split_into_chunks(text, metadata)`: semantic + token-window chunking.
- `embed_texts(chunks)`: batch embeddings with backpressure.
- `upsert_vectors(vectors, metadata)`: FAISS + side store.
- `retrieve(query, filters)`: vector search + optional rerank.
- `assemble_prompt(query, contexts, mode)`: build safe, reproducible prompt.
- `generate_stream(prompt)`: stream from LLM.

### Observability
- Logging: pipeline timings, token usage, retrieval hit-rate, cache stats.
- Metrics: Prometheus counters/histograms (latency by step, retrieval precision proxy).

### Safety and Guardrails
- Document-only guard: if no good matches, respond with “insufficient information.”
- PII filtering (optional); prompt injection defenses (strip instructions from source text).
- Max context per request; truncation with rationale.


## Data Models and Metadata
- Document: `doc_id`, `owner_id`, `filename`, `mime_type`, `size_bytes`, `page_count`, `created_at`, `status`.
- Chunk: `chunk_id`, `doc_id`, `content`, `tokens`, `start_page`, `end_page`, `section_title`, `position_index`.
- Embedding: `embedding_id`, `chunk_id`, vector (in store), `model_name`.
- Session: `session_id`, `owner_id`, `title`, `attached_doc_ids[]`, `created_at`.
- ChatMessage: `message_id`, `session_id`, `role`, `content`, `citations[]`, `usage`, `created_at`.
- Citation: `doc_id`, `page(s)`, `section_title`, `chunk_id`, `char_start/end`.


## Retrieval Strategy
- Similarity: cosine similarity with FAISS IVF/Flat (as available).
- Filters: by `owner_id`, `session_id`, `doc_ids`, type, and time.
- Reranking (recommended): cross-encoder (e.g., `msmarco-distilbert-base-v4`) to rerank top-50 to top-6/10.
- Alternatively, Reciprocal Rank Fusion across multi-query variants of the user question.
- Context packing:
  - Token budget-aware (e.g., 2k tokens for a 4k context model).
  - Avoid redundant neighbors (distance threshold); sort by source/page.
  - Build a compact citations map for rendering.


## Prompting Guidelines
- Document-only system message:
  - “You are a precise assistant. Answer using only the provided context. If unsure or information is not present, explicitly say so and propose follow-up questions. Provide citations for each factual claim.”
- Hybrid system message:
  - “Prioritize provided documents. If insufficient, you may use your general knowledge. Label each claim with Document or General and provide citations where applicable.”
- Output format:
  - Executive answer
  - Sources with page/section
  - Optional quotes/excerpts
  - Follow-up questions
- Safety:
  - Never invent citations; if a claim is unsupported, say so.


## Frontend Plan (`page.tsx`, No Code)

### UI Sections
- Header: session selector, “New session,” settings (model/top_k/temperature).
- Left pane: uploaded documents with status, size, page count, delete and re-index.
- Main chat pane:
  - Chat history with roles.
  - Streaming answer with token-by-token updates.
  - Citation chips with hover previews (snippet + page).
  - Footer: input, send, document-only/hybrid toggle, attach-doc dropdown.

### Interactions
- Upload:
  - Drag-and-drop, progress bar, server response with `doc_id` and `queued` status.
- Chat:
  - Send `POST /api/rag/chat` with `session_id`, `message`, `answer_mode`, selected `doc_ids`.
  - Streamed rendering with ability to abort.
- Maintenance:
  - Delete or re-index doc with confirmation dialogs.
- Errors:
  - Friendly messages for upload format issues, indexer errors, or rate limits.

### State Management
- Keep active `session_id` in local store (Zustand/Context).
- Cache messages client-side; refetch on load.
- Map `doc_id → doc metadata` for quick lookup.

### Streaming
- Prefer SSE for simplicity; WS for bi-directional needs.
- Reconnect logic and partial rendering.

### Accessibility
- Keyboard shortcuts (Enter/Shift+Enter), focus management, skeleton states.


## API Contract (No Code)

- `POST /api/rag/upload` (multipart)
  - Request: `files[]`, `session_id?`, `tags[]?`
  - Response: `{ documents: [{ doc_id, filename, size, pages, status }], session_id }`

- `GET /api/rag/status?job_id=…`
  - Response: `{ job_id, status: queued|processing|ready|error, progress, error }`

- `POST /api/rag/chat`
  - Request: `{ session_id, message, answer_mode: "document-only"|"hybrid", top_k?, temperature?, max_tokens?, doc_ids?[] }`
  - Streamed Events (SSE/WS): `token`, `partial`, `final`, `error`
  - Final Payload: `{ answer, citations: [{ doc_id, page, section_title, chunk_id }], usage: { prompt_tokens, completion_tokens, total_tokens }, retrieval: { hits, mean_similarity } }`

- `DELETE /api/rag/document/{doc_id}`
  - Response: `{ ok: true }`


## Performance, Scaling, Reliability
- Indexing:
  - Batch embeddings; back-pressure queue; resume on restart.
  - Persist FAISS on disk; warm caches on startup.
- Retrieval:
  - Pre-filter by `doc_ids/session` to reduce search space.
  - Keep embedding model loaded and pinned.
- Generation:
  - Stream; enforce per-request limits (timeout, max tokens).
- Caching:
  - Cache query embeddings and recent retrievals per session.
- Failure Modes:
  - Extraction/embedding failures flagged with actionable error messages; retries with backoff.
  - Auto-rebuild FAISS from chunk store if corruption detected.
- Monitoring:
  - Metrics: uploads/hour, indexing time, chat latency p50/p95, retrieval errors, token usage/day.
  - Logs: structured with correlation IDs (session_id, job_id).


## Security and Compliance
- Validate and virus-scan uploads server-side.
- Enforce per-user/session access control; no cross-user retrieval.
- Redact sensitive content in logs; encrypt at rest if required.
- Rate limiting for upload and chat endpoints.


## Testing and Evaluation
- Unit Tests:
  - Extractors: PDF/DOCX variants and page extraction accuracy.
  - Chunker: token boundaries and overlap logic.
  - Embeddings: vector shape and performance.
  - Retrieval: deterministic top-k on seeded vectors.
- Integration Tests:
  - Upload → index → chat round-trip with synthetic docs.
  - Streaming correctness (SSE).
- Quality Eval:
  - QA pairs over known documents; measure groundedness, citation accuracy, hallucination rate.
- Load Tests:
  - Concurrent uploads and chats; measure latency/throughput and resource usage.


## Mapping to This Repository
- Vector store: `backend/vector_store/faiss_manager.py` and `cs_faiss_manager.py` can be reused.
- RAG servers: references in `backend/servers/*` (e.g., `ultimate_rag_v4_server.py`) for patterns.
- Auth & DB: `backend/auth/supabase_auth.py` and `backend/database/mongodb.py` if persistent metadata is needed.
- Frontend integration: Next.js dashboard at `frontend/src/app/dashboard/chatandcode/page.tsx`.
- Environment: `.env.example` and `backend/.env.example` — add `RAG_*` variables accordingly.


## Rollout Steps (Non-Coding)
1. Define environment variables and add to `.env` files.
2. Create folder paths for FAISS and document storage.
3. Choose embedding model (local vs. hosted) and set rate limits.
4. Finalize API shapes with frontend.
5. MVP scope:
   - Single-document upload; single-session; document-only Q&A; page-number citations.
   - Iterate: hybrid mode, reranker, multi-doc, session management, streaming.


## Deliverables
- This Markdown file: `docs/rag/document-chat-rag.md`.
- Backend single-file service (when implemented): `backend/document_chat_rag.py`.
- Frontend integration (when implemented): `frontend/src/app/dashboard/chatandcode/page.tsx`.
