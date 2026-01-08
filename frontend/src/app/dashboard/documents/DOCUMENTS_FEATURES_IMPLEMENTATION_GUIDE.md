# Document Intelligence: End-to-End Features Implementation Guide

This guide explains how to implement and extend the Documents module based on:
- docs/development/DOCUMENT_FEATURES_RESEARCH.md (existing research and roadmap)
- Current frontend code under frontend/src/app/dashboard/documents
- Available frontend APIs in frontend/src/lib/api/documents.ts

It provides:
- Button-wise mapping of UI to actions and APIs
- Detailed implementation steps for each feature area
- Expected outputs/results and UX behaviors
- Extensibility notes for upcoming functionality (annotations, classification, entity/topic extraction, analytics)

Note: The .docx feature catalog could not be parsed in this environment, so this guide consolidates all implementable features using the existing research document and the live codebase.

---

## Architecture Overview (Current)

- Pages
  - Documents List: /dashboard/documents/page.tsx
  - Document Details + Q&A: /dashboard/documents/[id]/page.tsx
  - Upload: /dashboard/documents/upload/page.tsx
- Frontend API client: frontend/src/lib/api/documents.ts
  - Key functions: uploadDocument, uploadToRAG, getUserDocuments, getDocument, getDocumentStatus, deleteDocument, trackView, askQuestion, addAnnotation, getAnnotations, getDashboardStats, getDocumentAnalytics, getUserAnalytics
- Backend assumptions
  - REST endpoints under `${API_BASE}` (NEXT_PUBLIC_API_URL) with /api prefix
  - Chat/Q&A via `${BACKEND_BASE}/api/v1/chat/stream` (non-streaming JSON mode)

---

## Feature Matrix: UI Buttons, Handlers, APIs, and Results

### A. Documents List Page (/dashboard/documents)

1) Upload Document button
- UI: Link to `/dashboard/documents/upload`
- Code: <Link href="/dashboard/documents/upload">
- Action: Navigates to Upload page
- Result: User can upload PDF/DOCX/TXT/MD

2) Search input
- UI: Text input with Search icon
- Code: `searchQuery` state + `onChange`
- Action: Filters docs in-memory on `filename` and `tags`
- Extension: Add server-side search by passing `search` to `getUserDocuments(userId, { search })`
- Result: Filtered list updates live; for large datasets, debounce and hit API

3) Filter button dropdown
- UI: Filter icon opens dropdown (All/Product/Technical/Financial)
- Code: `filterCategory`, `setFilterCategory`, `showFilterMenu`
- Backend: `getUserDocuments(userId, { category })`
- Result: Refreshed list scoped by category; optional: persist to URL query

4) View mode toggle (Grid/List)
- UI: Grid3x3 and List icons
- Code: `viewMode` state toggles rendering branch
- Result: Visual change; optional: persist per user via localStorage or settings API

5) Analytics link
- UI: Link to `/dashboard/documents/analytics`
- Backend: Use `getUserAnalytics(userId)` to power analytics page when implemented
- Result: Navigate to analytics dashboard (ensure page exists)

6) Per-document card actions (Grid/List)
- Open
  - UI: Link to `/dashboard/documents/${doc.doc_id}`
  - Backend: `getDocument(docId)` on details page
  - Result: Navigates to document viewer + Q&A
- Share (icon button)
  - UI: <Share2 />
  - Implementation:
    - Open a share modal with options: Public link (toggle), Team link, Expire after X days, Copy URL
    - Backend: Create share tokens and permissions; optional signed URL if using object storage
    - Result: Copyable link; store share policy in DB; toast feedback
- Delete (List layout currently)
  - UI: Trash icon
  - Backend: `deleteDocument(docId)`
  - Result: Confirm; on success remove from local state and refresh stats via `getDashboardStats`

7) Empty state CTA
- UI: Upload button when no documents match
- Result: Navigates to upload page

8) Stats cards (Total Documents, Questions Asked, Time Saved, Avg Confidence)
- Backend: `getDashboardStats(userId)`
- Result: Show fetched metrics; add skeletons while loading

---

### B. Document Details + Q&A Page (/dashboard/documents/[id])

1) Back to Documents
- UI: Link back
- Result: Navigate to list

2) Download
- UI: Download button
- Implementation:
  - If backend serves raw files: navigate to `${BACKEND_BASE}/api/v1/documents/${docId}/download` (or storage URL)
  - If stored in object storage: call API to get signed URL, then `window.open(signedUrl)`
- Result: Browser downloads original file

3) Share
- Same share modal approach as list page. Display public status and link if already shared.

4) Delete
- UI: Trash icon
- Backend: `deleteDocument(docId)` then `router.push('/dashboard/documents')`
- Result: Removed and user returned to list; toast feedback

5) PDF Viewer controls
- Prev/Next page
  - UI: ChevronLeft/ChevronRight
  - State: `currentPage`
  - Implementation: Integrate `react-pdf` to render pages; bind page index
- Zoom In/Out/Maximize
  - State: `zoom`
  - Implementation: Adjust container scale or pass `scale` prop; Maximize via Fullscreen API
- Result: Smooth viewing; optional keyboard shortcuts

6) AI summary and key points sections
- Data: `document.summary`, `document.key_points`
- Backend: Ensure enrichment pipeline fills these fields after processing
- Result: Readable overview

7) Document content
- Data: `document.text_content`
- Implementation: For PDFs, consider page thumbnails and in-document search with highlights

8) Quick Stats toggle
- UI: Collapsible showing Pages and Words
- Result: Quick glance metrics

9) Q&A Chat
- Send button and Enter to send
  - Backend: `askQuestion([docId], question, sessionId, 'document-only', 5)`
  - Error UX: Clear messages if RAG service down; disable while loading
- Display confidence and sources count
  - Data: `data.confidence`, `data.sources`
  - Enhancement: Show source snippets; clicking scrolls/highlights in viewer
- Modes (future): document-only, web-enhanced, hybrid; expose a dropdown to change `mode`
- Result: Fast, grounded answers

10) Track View
- On load: `trackView(docId)` increments analytics
- Result: Accurate per-document engagement metrics

11) Annotations (planned; API available)
- APIs: `addAnnotation(docId, annotation)`, `getAnnotations(docId)`
- UI: Add Annotations panel/tools (highlight, comment, bookmark)
- Storage: Each annotation stores user info, type, content, page number, coordinates
- Result: Collaborative review with inline notes

---

### C. Upload Page (/dashboard/documents/upload)

1) Drag & Drop area
- UI: DnD with hover
- Validation: Types [pdf, docx, txt, md]; size <= 50MB
- On drop: Calls `handleFiles`
- Result: Files listed with progress

2) Browse Files button
- UI: Triggers hidden input multiple file picker
- Result: Same as DnD

3) Upload pipeline (per file)
- Step 1: status 'uploading' (20%)
- Step 2: `uploadDocument(file, userId, sessionId)` to backend (metadata persistence)
- Step 3: status 'processing' (40%); store `docId`
- Step 4: `uploadToRAG(file, userId, sessionId)` to trigger indexing (vectorization)
- Step 5: status 'enriching' (60%); record pages/chunks
- Step 6: poll `getDocumentStatus(docId)` until `processing_status === 'ready'` or timeout
- On success: status 'success', progress 100, display computed metadata (word count, reading time, topics, etc.)
- On error: status 'error' with message; allow Retry

4) Completion CTA
- When allCompleted: show "Done - View Documents" -> router.push('/dashboard/documents')

---

## Backend Integration Checklist

- Documents Service (FastAPI/Node):
  - POST /api/documents/upload (multipart) -> returns { success, doc_id, metadata }
  - GET /api/documents/user/:userId?search=&category=&skip=&limit=
  - GET /api/documents/:docId
  - PUT /api/documents/:docId (update metadata/tags/summary)
  - DELETE /api/documents/:docId
  - POST /api/documents/:docId/view (analytics)
  - GET /api/documents/:docId/status (processing + enrichment state)
  - GET /api/documents/:docId/analytics
  - POST /api/documents/:docId/annotations; GET /api/documents/:docId/annotations
  - Optional: POST /api/documents/:docId/share (create token); DELETE /share; GET /share

- RAG/Chat Service (via main backend proxy):
  - POST /api/v1/chat/stream (non-stream mode) with { session_id, message, doc_ids, mode, stream:false }

- Storage/Download:
  - Either direct file streaming endpoint or signed URL provider

---

## Step-by-Step Implementation Details

1) Server-side search & filter
- Update DocumentsPage to debounce search (300ms) and call `getUserDocuments(userId, { search, category })` on change
- When typing, set loading indicator for list only (avoid blocking header)
- Preserve local filtering as fallback when API errors occur

2) Share modal and policies
- Create a `ShareDialog` component with options: public toggle, expiration, team scope
- Add endpoints for share policy CRUD and token generation
- On confirm, call API, show toast, and display a copyable link
- Add visual indicator on cards for public sharing state

3) Document download
- Add `downloadOriginal(docId)` API to request signed URL or stream
- Bind to Download button; handle errors gracefully

4) PDF rendering and in-document search
- Add react-pdf; render <Document><Page pageNumber={currentPage}/></Document>
- Implement search-in-document: send query to backend to get page+offsets (from text_content index) or do client-side in extracted text
- Highlight results; add Next/Prev match controls

5) Q&A Enhancements
- Add mode selector (document-only, web-enhanced, hybrid) that passes `mode` to askQuestion
- Render source list with snippet + page; clicking navigates viewer to page
- Streamed responses (optional): integrate server-sent events endpoint when available

6) Annotations
- Add sidebar or overlay for annotations
- Implement add (selection -> modal), list, delete/edit
- Persist via addAnnotation/getAnnotations APIs

7) Tags & categories management
- Add inline tag editor in details header or list item menu
- Use updateDocument to persist tags, category
- Suggest topics from metadata.topics as quick-add chips

8) Analytics page
- New route /dashboard/documents/analytics
- Use getUserAnalytics(userId) to render
  - Overview KPIs
  - Top Documents by views/questions
  - Category breakdown chart
- Link back into documents and details pages

---

## Expected Results & KPIs

- Faster document discovery: server-side search reduces client filtering gaps
- Higher engagement: share links and annotations drive collaboration
- Better quality answers: mode selector and source linking improve trust
- Operational visibility: analytics (views, questions, avg confidence, time saved)

---

## Security & Privacy Considerations

- Enforce per-user access control on document endpoints
- Share tokens must be scoped, time-bound, and revocable; log accesses
- Sanitize and validate uploaded files; virus scan optional
- PII handling in entities/topics: redact when sharing publicly
- Rate-limit Q&A and downloads; audit logs for sensitive reads

---

## Implementation Tips

- Use React Query or SWR for caching and revalidation of lists and details
- Centralize toasts and error handling; standardize API error shapes
- Keep `userId` from real auth context instead of hardcoded user_123
- Use feature flags to roll out advanced features progressively

---

## Roadmap Alignment (from DOCUMENT_FEATURES_RESEARCH.md)

- Tier 1 (Quick Wins): server-side search & filters, download, basic share links, tags
- Tier 2: annotations, in-doc search, source-linked QA, analytics dashboard
- Tier 3: auto-classification, entity extraction UI, templates and collaboration workflows

---

## Button-wise Summary (Cheat Sheet)

- Documents List
  - Upload: navigate to /upload
  - Search: debounce -> getUserDocuments({ search })
  - Filter: getUserDocuments({ category })
  - Grid/List: toggle state
  - Analytics: navigate to /analytics (uses getUserAnalytics)
  - Card: Open (navigate), Share (open ShareDialog), Delete (deleteDocument)

- Document Details
  - Back: navigate to list
  - Download: downloadOriginal(docId)
  - Share: ShareDialog
  - Delete: deleteDocument + router.push('/dashboard/documents')
  - Viewer: Prev/Next page, Zoom +/-/Maximize (react-pdf)
  - Chat: askQuestion([...], question, sessionId, mode)
  - Quick Stats: toggle

- Upload
  - Drag/Drop + Browse: handleFiles -> uploadDocument -> uploadToRAG -> getDocumentStatus
  - Retry/Remove: retryUpload/removeFile
  - Done: router.push('/dashboard/documents')

---

If you want, I can also scaffold the Analytics page, the ShareDialog component, and a basic Annotations panel using the existing API surface.