# Document RAG Response Upgrade Plan

Last updated: {{DATE}}

This guide explains how to make responses produced by the Document RAG chatbot significantly more appealing, structured, and professional. It covers frontend presentation, backend output shaping, prompt and schema design, automatic post‑processing, and evaluation. A worked example shows how to transform a raw, repetitive syllabus dump into a clean syllabus summary with citations and scannable structure.

---

## 1) Target Response Style and UX

Aim for outputs that are:
- Skimmable: clear headings, bullets, short paragraphs, TL;DR
- Credible: inline citations [1], [2] with a Sources block
- Actionable: highlights, callouts, and next steps
- Consistent: stable section order and typography

Recommended sections (as applicable):
- TL;DR (1–3 bullets)
- Key Highlights (checklist-style)
- Detailed Sections (with H2/H3)
- Notes/Assumptions (if context is incomplete)
- Sources with confidence bars

Typography and components (frontend):
- Headings (H1–H3), bullet lists, numbered lists, tables
- Callouts for warnings/assumptions (e.g., colored boxes)
- Collapsible sections for long content (details/summary)
- Source chips with file icons and confidence meter

---

## 2) Backend Output Shaping (RAG server)

Implement structured, citation-ready outputs in `backend/servers/document_chat_rag.py`:

1) Prompted structure and schema
- Use a fixed section order in the prompt (see §4) and instruct the model to produce Markdown with inline citations like `[1]`, `[2]` mapped to a provided `sources` array.
- Provide a compact TL;DR first, then progressively reveal details.

2) Rich final SSE event
- Final event (type="final") should include:
  - message: Markdown string with inline citations
  - sources: [{ doc_id, filename, chunk_index, title?, page?, confidence, start_offset, end_offset }]
  - confidence: overall value (0–1)
  - usage: token counts
  - processing_time
  - mode_used and retrieval stats (top_k, reranked_k, avg_similarity)

3) Post‑processing hooks
- De‑dup repeated commas/spaces, normalize lists, and fix basic punctuation.
- Ensure section headers are capitalized and present even if content is short.
- Validate citation markers: every [n] must exist in sources; drop orphan markers.

4) Guardrails
- If no sufficiently similar chunks are found, return a short apology with suggested queries, not a hallucinated answer.

---

## 3) Frontend Rendering (chatandcode page)

Enhance `frontend/src/app/dashboard/chatandcode/page.tsx` to render richer responses:

1) Markdown renderer
- Support headings, bullets, tables, and callouts (MDX-like components or a mapper over remark/rehype).
- Convert `[1]`, `[2]` citation markers into clickable anchors.

2) Sources panel
- Render a Sources section beneath the answer with:
  - File icon + filename
  - Confidence meter (e.g., bar with exact value in tooltip)
  - Chunk preview button → opens a drawer with the chunk text and surrounding context

3) UX polish
- TL;DR box (subtle background), Highlights as checklists with icons, Collapsible detailed sections.
- Token count + words/sec indicator during streaming.

4) Consistency options
- Add a user setting: “Concise / Standard / Detailed” response length; pass to backend.

---

## 4) Prompt and Schema Templates

System prompt (RAG mode):
- "You are a precise technical writer. Using only the provided sources, produce a clean, professional Markdown answer with the following structure: TL;DR, Key Highlights, Detailed Sections (H2/H3), Notes/Assumptions (if needed), and a Sources section. Use inline citations like [1], [2] near claims taken from sources. Avoid repetition and stray punctuation."

Content template hints:
- Start with 2–4 bullet TL;DR
- Use bullets instead of long paragraphs
- Prefer parallel structure (consistent phrasing across bullets)
- Keep section headings concise

Validation rules (in prompt or tool):
- Remove duplicate commas and extra spaces
- Ensure citations [n] map to sources[n-1]
- If info is missing, add a short "Notes/Assumptions" section

---

## 5) Automatic Post‑Processing

Pipeline step after generation:
- Punctuation cleanup: collapse multiple commas/spaces; trim trailing commas.
- List normalization: ensure bullets start with a capital letter and end consistently (no trailing commas).
- Citation check: remove orphan [n] markers; ensure numbering increments without gaps.
- Section completion: if TL;DR missing, synthesize from first 3 bullets; ensure Sources present when any citation exists.

Example pseudo‑code:
```python
def postprocess_markdown(md: str, sources: list[dict]) -> str:
    md = re.sub(r",\s*,+", ", ", md)         # collapse ", , ,"
    md = re.sub(r"\s{2,}", " ", md)            # collapse multi-spaces
    md = normalize_lists(md)
    md = ensure_headings(md)
    md = renumber_or_prune_citations(md, sources)
    return md
```

---

## 6) Worked Example – Transforming Your Sample

Original (excerpt, with repetitions and stray commas):
> "The DA 2026 syllabus , covers a wide range of topics ... Probability and Statistics , , ... Linear Algebra , , , , ... Calculus and Optimization , , , , ..."

Improved answer (what the bot should output):

### TL;DR
- DA 2026 covers core DS/AI foundations: Probability & Statistics, Linear Algebra, Calculus & Optimization, Programming/DSA, Databases & Warehousing, Machine Learning, and AI fundamentals.
- Includes rigorous statistical tests, linear algebra decompositions, classical ML, and AI reasoning. [1]
- Assessment and contact‑hour details depend on the institution’s official document. [2]

### Key Highlights
- Probability & Statistics: Counting (permutations/combinations), probability axioms, independence, Bayes’ theorem, expectation/variance; distributions (Bernoulli, Binomial, Poisson, Uniform, Exponential, Normal, t, chi‑square); CLT; hypothesis testing (z, t, chi‑square); CIs. [1]
- Linear Algebra: Vector spaces, subspaces, independence; matrices (projection, orthogonal, idempotent, partitioned); rank, determinant, nullity; eigenvalues/eigenvectors; LU and SVD decompositions. [1]
- Calculus & Optimization: Single‑variable calculus (limits, continuity, differentiability, Taylor series), maxima/minima; basics of constrained optimization. [1]
- Programming, DSA, Algorithms: Python; stacks/queues/lists/trees/hash tables; search (linear/binary); sorting (selection, bubble, insertion, merge, quick); divide‑and‑conquer; graph basics and shortest paths. [1]
- Databases & Warehousing: ER model; relational algebra/tuple calculus; SQL; constraints; normalization; file organization and indexing; data transformation; dimensional modeling and measures. [1]
- Machine Learning: Regression (simple/multiple/ridge), logistic regression; k‑NN, Naive Bayes, LDA, SVM, decision trees; bias‑variance; cross‑validation (LOO, k‑fold); MLP/FFNN; unsupervised clustering (k‑means/medoids, hierarchical); PCA. [1]
- Artificial Intelligence: Search (informed/uninformed/adversarial); logic (propositional/predicate); uncertain reasoning (conditional independence; exact inference via variable elimination; approximate inference via sampling). [1]

<details>
<summary>Detailed Sections</summary>

#### Probability & Statistics
Topics include counting, axioms, independence, Bayes; moments and measures (mean, median, mode, variance, covariance, correlation); distributions (discrete and continuous) and CDF/PDF; CLT; confidence intervals; hypothesis tests (z, t, chi‑square). [1]

#### Linear Algebra
Covers vector spaces and subspaces; linear dependence/independence; matrices and properties (projection, orthogonal, idempotent, partitioned); quadratic forms; systems and Gaussian elimination; eigenvalues/eigenvectors; determinant, rank, nullity; LU and SVD. [1]

#### Calculus & Optimization
Single‑variable functions: limit, continuity, differentiability, Taylor series; maxima/minima; basics of single‑variable optimization. [1]

#### Programming, DSA & Algorithms
Python programming; data structures (stacks, queues, linked lists, trees, hash tables); search and sort; divide‑and‑conquer; graphs (traversal, shortest path). [1]

#### Databases & Warehousing
ER and relational models, SQL, constraints, normalization; file organization and indexing; data transformations (normalization, discretization, sampling, compression); dimensional modeling, hierarchies, and measures. [1]

#### Machine Learning
Supervised: regression family, logistic regression, k‑NN, Naive Bayes, LDA, SVM, decision trees; bias‑variance; cross‑validation; neural networks (MLP/FFNN). Unsupervised: clustering (k‑means/medoids, hierarchical), dimensionality reduction (PCA). [1]

#### Artificial Intelligence
Search strategies; logical reasoning; uncertainty: conditional independence, variable elimination, sampling‑based approximation. [1]

</details>

### Notes/Assumptions
- Exact credits, contact hours, and assessment weights may vary by institution and year. Consult the official syllabus for your university. [2]

### Sources
1. Official DA 2026 syllabus document (PDF) – sections on foundations and course topics. [confidence: 0.86]
2. Academic regulations/handbook for credit/contact‑hour policies. [confidence: 0.78]

---

## 7) Implementation Steps (Cross‑stack)

Backend
- Add prompt template and ensure final SSE event includes citations, confidence, usage, and retrieval stats.
- Enable post‑processing hooks (punctuation cleanup, list normalization, citation validation).

Frontend
- Upgrade Markdown rendering; map [n] to clickable sources.
- Add TL;DR pillbox, highlights checklist, collapsible details, and a Sources panel with confidence bars and preview drawer.
- Add a “Conciseness” control and pass to backend.

Database/API
- Persist per‑session response settings (conciseness, mode); store sources and confidence per assistant message.
- Add feedback endpoint to capture user rating of presentation quality.

---

## 8) QA and Acceptance Criteria
- No duplicated commas or obvious punctuation artifacts.
- TL;DR present in ≤ 4 bullets; Key Highlights ≤ 8 bullets.
- Every inline citation [n] maps to an entry in Sources.
- Sources show confidence and are clickable with chunk preview.
- Rendering remains readable on mobile (wrap long lines; collapsible details).

---

## 9) Developer Tips
- Keep prompts short and crisp; prefer explicit checklists in instructions.
- Avoid giant context windows; use MMR+rereanking for quality over quantity.
- Unit test post‑processors with tricky punctuation and list cases.
- Log retrieval stats and present a dev-only diagnostics drawer in the UI.
