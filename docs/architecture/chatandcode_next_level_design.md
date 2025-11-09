# Chat & Code – Next-Level Architecture and Upgrade Blueprint

Location: /home/shahs/Engunity-AI/frontend/src/app/dashboard/chatandcode/page.tsx
Related: frontend/src/lib/services/serviceLoader.ts (feature="chatandcode" => agentic_rag), MessageRenderer formatting, code-executor service, RAG services

Hardware context provided:
- GPU: NVIDIA GeForce RTX 4050 Laptop (6 GB VRAM reported)
- CUDA 13, Driver 581.15
- CPU: AMD Ryzen 7 7735HS (8 cores / 16 threads)
- RAM: 16 GB
- OS: Windows (Hyper-V detected) + WSL likely; Dev env shows (base) conda

This blueprint is tailored for a hybrid (local + backend) AI stack where we can exploit GPU acceleration when available while falling back to cloud when needed, and elevates the user experience beyond standard chat into an interactive “AI software lab” for building, testing, and shipping code.

--------------------------------------------------------------------------------

## Vision: From Chat to an AI Software Lab

Transform Chat & Code into a multimodal, tool-augmented agent workspace:
- Streaming, tool-use aware conversation with real-time partial rendering
- Contextual programming environment (repo-aware, file-aware, project-aware)
- Secure code execution with artifacts (stdout, logs, plots, test reports)
- Hybrid RAG: documents, repos, API specs, runbooks, Confluence, Jira, code intelligence
- Multi-agent collaboration (Architect, Coder, Reviewer, Ops) with synchronized context
- Prompt engineering UX (templates, slash-commands, prompt variables, chains)
- Experiment tracking and reproducibility (prompts, inputs, outputs, artifacts)
- Human-in-the-loop change staging (diffs, PR drafts, commit messages, test plans)

--------------------------------------------------------------------------------

## High-Impact Feature Set (Mind-blowing but feasible on your stack)

1) Realtime streaming + partial formatting
- Upgrade /api/chat/stream to true SSE/WebSocket streaming.
- Incrementally render assistant tokens with MessageRenderer and maintain code fences.
- Add a token-rate meter and latency watermark per chunk; show tool-call phases.

2) Tool calling (actions) with visual affordances
- Supported tools: RAG search, file read/write (guarded), code-executor run, unit tests, lint, db query, web fetch, diagram generation, Git.
- Structured tool-call schema with JSON arguments; show a collapsible timeline ("Agent Trace").
- Allow user to accept/deny tool calls, edit arguments before execution, and configure guardrails.

3) Repo-aware context panel
- Left secondary panel (toggleable) showing project tree, open buffers, git status, tests, and docs discovered with embeddings.
- Inline "Add to context" chips to attach files/snippets to the next prompt.
- Auto-suggest context from recent edits and failing tests.

4) Code cells + runnable blocks inside chat
- Any assistant code block can become a runnable cell.
- Execute via code-executor service; capture stdout, stderr, exit code, and artifacts (images, files).
- Support Python/Node/TS/Shell initial; extendable to Rust via sandbox.

5) Test-driven loops and CI-lite
- "Run tests" action uses project test commands (scripts/dev/run-tests.sh).
- Display fail summary, failing snapshots, coverage; auto-generate fix suggestions.
- One-click "Apply patch" to stage multi-file edits after human review.

6) Multi-agent roles
- Architect (design), Coder (impl), Reviewer (CR), Ops (deploy/perf). User composes an ensemble per task.
- Round-robin or planner-driven orchestration; each agent writes a short rationale visible in trace.
- Configurable temperature/top-k per role; share the same scratchpad memory.

7) Memory: session, long-term, and vector hints
- Session memory: decisions, conventions, env vars.
- Long-term: per-project memory persisted in MongoDB with embeddings.
- Vector hints: allow pinning of passages; display citations inline.

8) Prompt UX: templates, variables, slash-commands
- Templates: "Implement feature X" -> variables (files, acceptance tests, edge cases).
- Slash-commands: /design, /refactor, /tests, /fix, /docs, /migrate, /perf, /sec.
- Prompt chains: pre/post hooks (context expansion, safety precheck) and output validators.

9) Safety & guardrails
- File operations policy (allow-list paths, dry-run by default, diff preview).
- Resource caps for code-executor (time, memory, disk, network egress).
- Secrets redaction in logs; PII scrubbing; allow local-only execution toggle.

10) Observability
- Per-message metrics: latency, tokens, cost estimate, GPU/CPU inference path label.
- Persistent traces with unique run IDs, exportable as a run report.
- Console view for backend health via ServiceLoader; restart and health-check buttons.

11) Multimodal I/O (optional, staged rollout)
- Voice dictation (Web Speech API) and TTS playback of answers.
- Image uploads for OCR or code screenshots; diagram-to-code via Vision model, then render.

--------------------------------------------------------------------------------

## Frontend Architecture Upgrades (Next.js app/dashboard/chatandcode)

A) State model extensions
- message.toolCalls: [{ id, name, args, status, result, latencyMs }]
- message.partial: boolean, message.streamId
- context.attachments: Array<{type: 'file'|'snippet'|'url'|'doc', id, path?, title, content?, size?}>
- runArtifacts: saved outputs per runnable cell (files, images, logs)
- agentTrace: structured nodes rendered in a timeline component

B) Components
- AgentHeader: status, model switch, token/cost/latency, GPU/local indicator
- ContextPanel: repo tree, attachments, RAG sources, vector citations
- MessageList (virtualized): token streaming, code-cell affordances, inline actions
- ToolCallTimeline: collapsible per-message trace of tools
- RunnableCell: execute code blocks, show outputs; promote to notebook
- DiffPreviewModal: file changes preview with approve/apply buttons
- PromptBar: templates, slash command hinting, variables panel, attachments tray

C) Streaming and token handling
- Prefer WebSocket (binary framing) or SSE with structured events:
  {type:'token'|'tool_start'|'tool_result'|'final', id, data}
- Use an incremental Markdown builder to safely render partial code fences.
- Debounce UI updates on token flood; keep last N chunks for smoothness.

D) Accessibility and performance
- Virtualize message list (react-virtualized/react-virtuoso) for long sessions.
- Keyboard-first interactions; ARIA roles; focus management on new token chunks.

--------------------------------------------------------------------------------

## Backend Touchpoints (align with existing stack)

- agentic_rag service: extend to support structured tool calling and streaming.
- code-executor service: already present; ensure endpoints to run snippets per language and return artifacts.
- message persistence: keep current /api/chat/messages; extend schema for toolCalls, artifacts, citations.
- RAG: consolidate hybrid_rag + agentic_rag; expose /api/rag/search for source previews.

API contracts (proposed):

1) POST /api/chat/stream (WebSocket or SSE)
Request: {sessionId, message, model, temperature, maxTokens, tools: string[], attachments: AttachmentRef[]}
Stream events:
- token: {delta}
- tool_start: {tool, args}
- tool_result: {tool, result, usage}
- partial_citation: {sourceId, text}
- final: {message, usage, citations, tools}

2) POST /api/execute
Body: {language: 'python'|'node'|'bash'|..., code, timeoutSec, files?:[{path, content}]}
Response: {stdout, stderr, exitCode, artifacts:[{name, type, path, size}], durationMs}

3) POST /api/git/patch
Body: {changes:[{path, before, after}], message, dryRun?:boolean}
Response: {diff, applied:boolean}

4) GET /api/context/repo, /api/context/search, /api/context/file
- Expose repo tree, fuzzy search, and file contents; enforce allow-lists.

--------------------------------------------------------------------------------

## Step-by-Step Implementation Plan (phased)

Phase 1 – Streaming + UI foundations
1. Add WebSocket/SSE client in page.tsx and switch sendChatMessage to streaming mode.
2. Create components: AgentHeader, ToolCallTimeline, RunnableCell (rendering-only initially).
3. Integrate virtualized message list and incremental markdown renderer.
4. Add ContextPanel placeholder + attachments tray in PromptBar.

Phase 2 – Tools & runnable cells
5. Implement tool-call visualization; mock tool events if backend not ready.
6. Detect code fences and render Run buttons with language detection.
7. Wire to code-executor with sandbox and artifact rendering (images, files download).

Phase 3 – Repo-aware context & RAG
8. Add repo tree via backend endpoints; allow attaching files/snippets to prompt.
9. Add /api/rag/search with source previews and inline citations.
10. Memory: save pinned vector hints and session memory summaries.

Phase 4 – Guardrails, diffs, and apply-patch
11. Introduce DiffPreviewModal and /api/git/patch dry-run -> apply.
12. Add per-tool policies and approval prompts; persist audit logs.

Phase 5 – Multi-agent and prompt UX
13. Agent roles configuration UI + round management and trace rendering.
14. Prompt templates, slash-commands, variable editor, and chains.

Phase 6 – Multimodal
15. Optional: speech-to-text and TTS; image input with OCR/vision chain.

--------------------------------------------------------------------------------

## Detailed Frontend Changes (TypeScript/React snippets)

1) Message model extensions
- Add fields to Message interface in page.tsx:
  - isStreaming, tokens already present
  - Add: toolCalls?: ToolCall[]; streamId?: string; citations?: Citation[]; artifacts?: Artifact[]

2) Streaming client
- Replace fetch('/api/chat/stream') with WebSocket/SSE.
- For SSE, consume EventSource with event types token/tool_start/tool_result/final.

3) RunnableCell component
- Parse MessageRenderer output; where code fences found, wrap with a Run button and language badge.
- When run: POST /api/execute, then append a system message with result and captured artifacts.

4) ContextPanel
- List repo files; search; attach files to next prompt (store in a local state attachments[]).
- Show selected attachments as chips above the input.

5) Tool Trace
- For each message, if toolCalls present, show a timeline with expand/collapse.

6) Diff preview
- When backend proposes a patch (final event includes changes), present DiffPreviewModal to approve and POST /api/git/patch.

--------------------------------------------------------------------------------

## Security, Privacy, and Resource Controls
- Do not expose raw environment variables in UI or logs.
- code-executor must enforce CPU/mem/time caps; disallow outbound network unless explicitly permitted.
- Secrets redaction in assistant output (regex for tokens, keys); PII scrubbing option.
- Path allow-list for file operations outside /frontend/src and whitelisted backend directories.

--------------------------------------------------------------------------------

## Performance Considerations for Your Hardware
- Prefer 4-bit/8-bit quantized local models when running on the 6 GB VRAM RTX 4050 (e.g., Llama 3.1 8B 4-bit) for on-device helpers; keep heavy reasoning in backend/cloud.
- Stream responses aggressively to reduce perceived latency.
- Avoid rendering bottlenecks with virtualization and chunked updates.

--------------------------------------------------------------------------------

## Testing Strategy
- Unit tests: component rendering for streaming, RunnableCell, DiffPreviewModal.
- Integration: mock SSE/WebSocket server; golden tests for token streaming.
- E2E: playwright flows—send message, stream, run cell, approve patch, open PR.

--------------------------------------------------------------------------------

## Rollout Plan
- Feature flags per phase; per-user opt-in in settings.
- Telemetry opt-in with anonymized metrics.
- Progressive enhancement: legacy fetch path remains as fallback.

--------------------------------------------------------------------------------

## Example UX Flow (Happy Path)
1. User types "/refactor frontend/src/app/dashboard/chatandcode/page.tsx to streaming WebSocket and runnable code"
2. Agent streams design then triggers tool calls: RAG search (collect related files), repo-read (open current page), code patch proposal.
3. User reviews diff, approves; code-executor runs tests; failing test -> agent generates fix -> new diff -> all green -> agent drafts PR.

--------------------------------------------------------------------------------

## Deliverables Summary
- Updated page.tsx with streaming and components (AgentHeader, ContextPanel, RunnableCell, ToolCallTimeline, DiffPreviewModal)
- Extended /api/chat/stream and /api/execute contracts
- Documentation (this file) and component-level README snippets

--------------------------------------------------------------------------------

## Full Super-Prompt (to drive implementation)

You are an expert full-stack engineer tasked with upgrading the Engunity AI Chat & Code page at frontend/src/app/dashboard/chatandcode/page.tsx into a next-level AI Software Lab. Follow these constraints and steps:

Context and Capabilities:
- Frontend: Next.js App Router, MessageRenderer for GPT-style formatting, ServiceLoader feature="chatandcode". Use TypeScript and Tailwind.
- Backend: agentic_rag for chat; code-executor available; MongoDB persistence; RAG endpoints; services health via /api/services.
- Hardware: RTX 4050 (6 GB), Ryzen 7 7735HS, 16 GB RAM. Prefer streaming and lightweight local helpers when possible.

Objectives:
1) Replace fetch-based chat with true streaming (WebSocket or SSE) delivering events: token, tool_start, tool_result, final. Render tokens incrementally and update MessageRenderer safely with partial code fences.
2) Implement tool-call visualization and control: show a per-message ToolCallTimeline with status and latency; require user approval for file write, network, and patch apply operations.
3) Add repo-aware ContextPanel with:
   - Repo tree, fuzzy search, and quick open
   - Attachments: files/snippets/docs added to prompt
   - RAG source previews and citation pins
4) Enable RunnableCell for code blocks (python, node, bash). On run, call /api/execute, render stdout/stderr, and list artifacts (files/images) with download links.
5) Add DiffPreviewModal to review and apply patches from the assistant; wire /api/git/patch (dry-run first); show unified diff.
6) Introduce PromptBar enhancements: templates, slash-commands (/design, /refactor, /tests, /fix, /docs, /perf, /sec), and variable editor; display attachments as chips.
7) Multi-agent roles (Architect, Coder, Reviewer, Ops) with a simple round-robin and per-role temperature settings. Show AgentHeader with model switch, token/latency/cost, and GPU/local indicator.
8) Persist extended message schema (toolCalls, citations, artifacts). Maintain session and long-term memory summaries.
9) Add guardrails: path allow-lists, secrets redaction, resource caps in code-executor; approval prompts for high-risk actions.

Acceptance criteria:
- Real-time token streaming visible with stable markdown rendering.
- Tool-call timeline shows at least RAG search and code-executor actions with arguments and results.
- Code fences have a Run button; execution returns stdout/stderr and artifacts.
- ContextPanel allows attaching repo files (content visible) and RAG sources to the next prompt.
- DiffPreviewModal allows approving a patch and applying it via /api/git/patch.
- All features behind feature flags; graceful fallback to current fetch mode when disabled.

Provide:
- TypeScript components (AgentHeader, ContextPanel, MessageList with virtualization, RunnableCell, ToolCallTimeline, DiffPreviewModal, PromptBar with templates and slash-commands)
- Updated page.tsx wiring to new components and streaming client
- Minimal backend stubs for streaming and execution if not present
- Tests for streaming rendering and runnable cells

Be meticulous about UX latency, safety, and accessibility. Keep code modular, typed, and documented.

--------------------------------------------------------------------------------

End of document.
