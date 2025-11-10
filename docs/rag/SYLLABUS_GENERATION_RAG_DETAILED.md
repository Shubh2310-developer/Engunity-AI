

Last updated: {{DATE}}

## Overview
This document explains how systems like ChatGPT or Gemini are able to produce a detailed, professional “Semester VI syllabus” upon request. It covers two primary modes of operation:
- Pure Generation: Synthesizing a plausible syllabus using learned world knowledge and patterns.
- Grounded Generation (RAG): Retrieving authoritative documents (handbooks, syllabi PDFs, academic regulations), then generating a syllabus constrained by those sources with citations and validation.

We also provide a reference architecture, prompts, validation strategies, and a concrete implementation plan for the Engunity-AI stack.

---

## 1) Core Capabilities Behind Syllabus Generation

1. Pretraining Prior
- LLMs learn patterns from large corpora containing educational materials (syllabi, handbooks, course descriptions, academic blogs). This gives them a strong sense of structure and content distribution (objectives, weekly plan, assessments, readings, policies).

2. Instruction Following
- Instruction tuning (SFT + RLHF/RLAIF) teaches LLMs to follow user requests like “generate a Semester VI syllabus,” structure their outputs, and produce professional formatting.

3. Planning and Decomposition
- Many systems implicitly or explicitly prompt the model to plan before writing (think: outline → fill). Hidden chain-of-thought or tool-augmented planning improves coherence.

4. Tool Use and Retrieval (RAG)
- To ensure correctness for a specific university/department/year, the system retrieves relevant documents and constrains the model to only use that context. This prevents hallucination and aligns with official policies.

---

## 2) Two Pathways

A) Pure Generation (Template Synthesis)
- Pros: Fast, fluent, immediately useful as a generic template.
- Cons: May diverge from official syllabus requirements (credits, contact hours, prerequisites) and can be outdated.

Typical Flow:
1. Parse intent: semester = VI, domain = syllabus, optional department/university.
2. Build outline: Objectives → Weekly Plan (12–15 weeks) → Readings → Assessment → Policies → Outcomes.
3. Generate content using patterns; ensure professional tone.
4. Optional self-checks: credits sum to total, assessment weights sum to 100%.

B) Grounded Generation (RAG)
- Pros: Accurate and aligned with institution-specific rules; supports citations for trust.
- Cons: Requires a retrieval pipeline, embeddings, and curated corpora.

Typical Flow:
1. Slot extraction: {semester: VI, dept, degree, university, year}.
2. Query rewriting: Build search string and embedding query variants.
3. Retrieval: Fetch top-k chunks from vector DB (e.g., handbooks, syllabi PDFs, policy docs).
4. Re-ranking: Cross-encoder reranker to select final, most relevant N chunks.
5. Synthesis: Prompt the model with context and instructions to produce a syllabus; include citations [1], [2].
6. Validation: Enforce credit/contact-hour/weights constraints; fix via a repair pass.
7. Output: Deliver Markdown/JSON with a Sources section and inline citations.

---

## 3) End-to-End Reference Pipeline

Step 0: Safety/Policy Filters
- Verify the content is allowed. Syllabus requests are generally safe.

Step 1: Intent and Slot Filling
- Detect task = syllabus_generation.
- Extract slots: semester (VI), program/department, institution, year/term, level (UG/PG), optional constraints.
- If key slots are missing (e.g., institution), ask clarifying questions.

Step 2: Orchestration
- Decide between pure generation and grounded generation based on settings or availability of official docs.

Step 3: Retrieval (for RAG)
- Build embedding query: combine slots into a focused query.
- Retrieve top-k chunks (e.g., k=30) from the syllabus corpus with filters (institution, year, department).
- Apply MMR to diversify and optionally rerank with a cross-encoder to final N (e.g., 6).

Step 4: Synthesis Prompting
- Feed selected chunks + strict instructions:
  - Required sections and order
  - Credit/contact-hour rules
  - Inline citations next to claims derived from sources
  - Style and tone guides

Step 5: Validation and Repair
- Schema validation: ensure all sections exist.
- Constraint checks: assessment weights sum to 100%, credits to required totals, weekly plan 12–15 weeks, prerequisites included if required.
- If validation fails, generate a repair pass that modifies only failing parts.

Step 6: Output and Telemetry
- Emit final Markdown/JSON with citations and a Sources block.
- Log retrieval stats, latency, token usage, and confidence.

---

## 4) Prompt and Schema Templates

A) Pure Generation Prompt (Template)

System:
“You are an experienced academic program designer. Generate a professional Semester VI syllabus for [Program], targeting [Level], covering [Topics]. Follow institutional best practices. Use clear headings and concise writing.”

User:
“Generate a full syllabus including: Objectives, Weekly Plan (12–15 weeks), Required/Recommended Readings, Assessments (with weights summing to 100%), Policies, Outcomes. Ensure total credits = [X], contact hours compliant with [Y]. If information is missing, use plausible defaults and clearly mark them as assumptions.”

B) Grounded Generation Prompt (RAG)

System:
“You are a syllabus generator constrained to the provided sources. Only use the sources to answer. Include inline citations like [1], [2] for claims derived from the sources.”

Context:
- [Chunk 1: …]
- [Chunk 2: …]
- …

User:
“Using only the sources, generate a Semester VI syllabus for [Program] at [University], [Year]. Include sections: Objectives, Weekly Plan (12–15 weeks), Readings, Assessments (weights sum to 100%), Policies, Outcomes. Where sources conflict, prefer the most recent and note conflicts in ‘Notes’. If context is insufficient, ask one clarifying question.”

Output Schema (Markdown or JSON):
- Course Overview
- Learning Objectives
- Weekly Plan (Week 1..N)
- Required Readings
- Recommended Readings
- Assessments (with weights; sum=100%)
- Grading Policy
- Attendance/Conduct Policy
- Outcomes and Mapping
- Notes (conflicts/assumptions)
- Sources (with citation mapping)

---

## 5) Validation and Self-Checks

1. Structural Checks
- All required sections present; weekly plan has consistent week numbering.

2. Numeric/Constraint Checks
- Credits total equals program requirement.
- Assessment weights sum to 100%.
- Contact hours per week and total contact hours align with policy.

3. Consistency Checks
- If RAG is used, ensure each claim marked with [n] is backed by a source n.
- If sources conflict, include a note in ‘Notes’.

4. Repair Pass Strategy
- If checks fail, run a focused prompt: “Adjust only assessments so weights sum to 100%.” or “Add missing weeks to reach 14.”

---

## 6) Pitfalls and Mitigations

- Hallucination: Use RAG with strict ‘document-only’ constraints and require citations.
- Wrong institution/year: Slot detection + clarifying questions + filtered retrieval by year/department.
- Inconsistent totals: Numeric validation and targeted repair prompts.
- Outdated policies: Keep the syllabus corpus fresh; optionally enable web browsing for public university sites.
- Latency: Cache queries, use MMR to shrink context, adopt reranker only when needed, and stream output.

---

## 7) Implementation in Engunity-AI

Backend (`backend/servers/document_chat_rag.py`)
- Add a ‘syllabus mode’ that:
  - Applies query rewrite with slots (semester, dept, institution, year).
  - Runs retrieval → MMR → (optional) rerank.
  - Uses a syllabus-specific prompt and output schema.
  - Validates assessment weights and credits; runs a repair pass on failure.
  - Emits a final SSE event with inline citations and a structured Sources array (filename, chunk_index, confidence).

Frontend (`frontend/src/app/dashboard/chatandcode/page.tsx`)
- Add a ‘Syllabus Generator’ preset UI with fields: Program/Department, University, Year/Term, Semester, Level.
- Toggle: ‘Grounded (use docs) vs Generic template’. Persist settings in session.
- Display a Sources panel with citations; enable chunk preview drawer.

Database (`frontend/src/lib/database/mongodb.ts`)
- Extend ChatSession.settings with fields for syllabus mode, selectedDocIds, and last-used institution/dept.
- Store outputs in a structured format (Markdown + JSON metadata for sections) for reuse and publishing.
- Add Feedback collection to capture thumbs up/down and comments.

API (`frontend/src/app/api/chat/sessions/route.ts` and new endpoints)
- Support saving session settings and syllabus metadata.
- Add `/api/chat/feedback` and `/api/chat/sessions/:id/metrics`.

Retrieval Corpus
- Index official program handbooks, syllabi, and policy PDFs with metadata: {institution, department, year, program, level}.
- Keep a crawler/ingestion script to refresh documents annually or on change.

---

## 8) Example Pseudocode (Grounded)

```python
slots = extract_slots(user_query)  # semester, dept, university, year, level
if not slots.get('university'):
    return ask_clarifying_question('Which university?')

search_query = rewrite_query(slots)
candidates = vector_search(search_query, filters=slots, top_k=30)
mmr_candidates = apply_mmr(candidates, k=20)
final_chunks = rerank(mmr_candidates, final_k=6)  # optional

prompt = build_syllabus_prompt(slots, final_chunks)
draft = llm.generate(prompt, temperature=0.2)

if not validate(draft):
    draft = llm.generate(repair_prompt(draft, violations))

return attach_citations(draft, final_chunks)
```

---

## 9) Evaluation and Quality Metrics

- Coverage: portion of official requirements present in output.
- Accuracy: consistency with source documents; citation correctness.
- Consistency: assessment weights = 100%, credits = required total; weekly plan length.
- Latency: time to first token (TTFT), total generation time.
- User Satisfaction: feedback ratings; acceptance in academic review.

---

## 10) Roadmap Extensions

- Multilingual support: detect language, use multilingual embeddings, translate outputs.
- Institution-specific templates: per-university schema and style guides.
- Policy checker: rule engine for validating grading/attendance policies.
- Publishing/export: export to PDF/Word and LMS-friendly formats.
- Reviewer workflow: collect faculty feedback and approval status per syllabus.

---

## 11) Quick Start Checklist (Engunity-AI)

- [ ] Add syllabus mode flags and prompt templates in backend.
- [ ] Implement MMR, optional reranker, and validation hooks.
- [ ] Extend session settings and feedback endpoints.
- [ ] Build Syllabus Generator UI (form + grounded toggle).
- [ ] Index institution syllabus corpora with rich metadata.
- [ ] Add evaluation harness for 20–50 sample requests and track KPIs.

---

## 12) References
- RAG best practices (MMR, reranking): Karpukhin et al., ColBERT, Cohere Rerank.
- Instruction following and schema prompting: OpenAI function calling, JSON schema prompting.
- Academic policy examples: typical university handbooks and accreditation standards.
