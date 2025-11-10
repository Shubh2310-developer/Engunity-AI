# Document RAG – Visual Response Upgrade (Frontend-only, Gemini/ChatGPT style)

Last updated: {{DATE}}

Scope
- Visual and UX upgrades only (no backend/protocol changes)
- Make answers look polished like Gemini/ChatGPT: skimmable, structured, and trustworthy
- Focus on Markdown rendering, layout, components, motion, theming, and accessibility

Target outcomes
- Messages are easy to scan: headings, bullets, spacing, subtle dividers
- Sources are clear and clickable: chips with icons, confidence, and preview
- Streaming feels alive: caret, pulse, token rate hint
- Looks great in light/dark, mobile/desktop

---

1) Message Layout and Typography

- Container
  - Max width for readability (e.g., `max-w-3xl`) centered with side gutters
  - Message bubbles or card style with subtle elevation
- Typography
  - Headings: H1/H2/H3 scale with consistent line-height
  - Body: 16–18px base, 1.6 line-height
  - Use a mono font only for code blocks
- Spacing
  - Consistent rhythm: 8/12/16px increments
  - More space above headings than below
- Colors (Tailwind tokens suggested)
  - Text: `text-zinc-900` (light), `text-zinc-100` (dark)
  - Muted: `text-zinc-500` (light), `text-zinc-400` (dark)
  - Accents: `text-sky-600` or `text-emerald-600`
- Dividers
  - Subtle separators between sections using `border-zinc-200/20` or `divide-y`

Component example (bubble)
```tsx
<div className="mx-auto max-w-3xl">
  <article className="prose prose-zinc dark:prose-invert bg-white/60 dark:bg-zinc-900/50 shadow-sm rounded-xl p-5 border border-zinc-200/30">
    {/* Rendered Markdown content here */}
  </article>
</div>
```

---

2) Markdown Rendering Rules (Presentation Only)

- Headings
  - H1: section title (rare in messages), H2/H3 for structure
  - Auto-anchor H2/H3 for in-message navigation
- Lists
  - Use bullets for key points, never long comma-separated chains
  - Indent nested bullets with consistent spacing
- Tables
  - Use for comparisons; add zebra stripes and sticky header on overflow
- Callouts
  - Map blockquotes starting with `Note:`/`Warning:` to callout boxes with icons
- Inline citations
  - Render `[1]` as a clickable chip that scrolls to Sources; show tooltip on hover
- Code
  - Syntax highlighting for ` ``` ` blocks; inline code with subtle background

Implementation hints
- remark + rehype + custom component mapping
- Tailwind Typography plugin (`prose`)
- Safe links (noopener, noreferrer), and external icon for http(s)

---

3) Sources Panel (Trust UI)

- Placement
  - Always render beneath the assistant message if `sources.length > 0`
- Layout
  - Grid of source chips or a list with: file icon, name, page/section (if given), confidence bar, preview button
- Interactions
  - Click chip → open right-side drawer (or modal on mobile) with chunk preview and surrounding context
  - Hover chip → tooltip with snippet and confidence
- Confidence meter
  - Thin bar (0–100%) with color ramp: red→amber→green (e.g., 0.5 threshold amber, 0.75 green)

Component sketch
```tsx
<section className="mt-6 border-t pt-4">
  <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300 mb-2">Sources</h3>
  <ul className="space-y-2">
    {sources.map((s, i) => (
      <li key={i} className="flex items-center gap-3 p-2 rounded-lg border hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50">
        <DocIcon />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{s.filename}</div>
          <div className="mt-1 h-1.5 rounded bg-zinc-200 dark:bg-zinc-700">
            <div className="h-1.5 rounded bg-emerald-500" style={{ width: `${Math.round((s.confidence ?? 0)*100)}%` }} />
          </div>
        </div>
        <button className="text-xs px-2 py-1 rounded border">Preview</button>
      </li>
    ))}
  </ul>
</section>
```

---

4) Streaming Feel and Micro‑interactions

- Typing indicator
  - Show an animated caret or three-dot pulse at line end while streaming
- Token rate hint (optional)
  - Tiny caption: “Streaming… 12 tok/s” (computed on client)
- Section reveal
  - Fade-in each section as it completes (intersect observer or chunked render)
- Hover states
  - Subtle lift (`shadow-sm → shadow`) and background tint on hover for chips and buttons
- Transitions
  - Use 150–250ms ease-out; avoid bounce/ease-in for readability

---

5) Message Chrome and Avatars

- Role avatars
  - Assistant: circular avatar with gradient or brand mark
  - User: initials or user pic
- Bubble pointers (optional)
  - Small notch for chat vibe; hide on narrow screens
- Timestamp and actions
  - Tiny row under each message: time, copy, feedback (👍/👎), ‘View sources’

---

6) Themes and Accessibility

- Light/Dark
  - Provide dark theme with appropriate contrast; ensure confidence bars and callouts remain legible
- High contrast mode
  - Optional toggle or media query support
- Motion reduce
  - Respect `prefers-reduced-motion` to disable heavy animations
- Keyboard and ARIA
  - Focus states on interactive elements; ESC to close drawers; ARIA labels for buttons and landmarks

---

7) Mobile Responsiveness

- Layout
  - Single column, comfortable padding, avoid overflowing code/table
- Sources
  - Use modal instead of drawer; full-width list with larger tap targets
- Sticky actions
  - Keep message composer pinned; ensure preview modals don’t cover it entirely

---

8) Component Kit (Recommended)

- Markdown container: `ProseMessage`
- Sources panel: `SourceList`, `SourceChip`, `SourceDrawer`
- Callout: `Callout` with variants (info, warn, note)
- Citation chip: `Citation` linking to a source
- Streaming: `TypingCaret`, `StreamStats`
- Message shell: `ChatBubble`

Example usage
```tsx
<ChatBubble role="assistant">
  <ProseMessage markdown={message} onCitationClick={openSource} />
  <SourceList sources={sources} onPreview={openSource} />
</ChatBubble>
```

---

9) Design Tokens (Tailwind suggestions)

- Spacing: `1 2 3 4 6 8 10`
- Radius: `rounded-lg` (bubbles), `rounded-xl` (cards)
- Shadows: `shadow-sm`, hover→`shadow`
- Borders: `border-zinc-200 dark:border-zinc-800`
- Backgrounds: `bg-white/60 dark:bg-zinc-900/50`
- Prose: `prose-zinc dark:prose-invert prose-headings:scroll-mt-24`

---

10) Visual Only Post‑processing (Client)

- Whitespace cleanup: collapse duplicate commas/spaces in display layer only
- Listify long comma-chains into bullets (non-destructive; don’t modify stored text)
- Auto-insert section dividers if headings absent
- Convert `[n]` citations to chips with a map to sources

Pseudo-code
```ts
function present(markdown: string, sources: Source[]): ReactNode {
  const cleaned = markdown
    .replace(/,\s*,+/g, ', ')   // collapse duplicate commas visually
    .replace(/\s{2,}/g, ' ');
  return <ProseMessage markdown={cleaned} citationMap={mapCitations(sources)} />;
}
```

---

11) Acceptance Criteria (Visual)

- Message width ≤ 720px content column; readable line-length
- Headings, bullets, and tables render consistently in light/dark
- Sources panel with confidence and preview available when sources exist
- Streaming shows typing indicator; completion removes indicator
- Mobile: no horizontal scroll; tappable targets ≥ 40px height
- A11y: focus outline visible; ESC closes drawers; labels on interactive elements

---

12) Implementation Steps (Frontend-only)

1. Add a Markdown renderer with typography and custom components (remark/rehype + Tailwind Typography)
2. Implement `ProseMessage` and callouts; map blockquotes and `Note:` prefixes
3. Implement `Citation` chips and `SourceList` with `SourceDrawer`
4. Add streaming indicator and fade-in sections
5. Apply theme-aware styles and test mobile responsiveness
6. QA with contrived examples (headings, long lists, tables, citations)

---

Appendix – Example Styled Output (Markdown)

### TL;DR
- Concise scope of DA 2026 with strong DS/AI foundations.
- Includes statistics, algebra, optimization, programming/DSA, DB & warehousing, ML, and AI. [1]

### Key Highlights
- Probability & Statistics: axioms, independence, Bayes, distributions, CLT, tests, CIs. [1]
- Linear Algebra: vector spaces, eigenvalues/eigenvectors, decompositions (LU, SVD). [1]
- Calculus & Optimization: single-variable calc, Taylor series, extrema, basics of optimization. [1]
- Programming/DSA/Algorithms: Python, data structures, search/sort, divide-and-conquer, graphs. [1]
- Databases & Warehousing: ER/model, SQL, normalization, indexing, dimensional modeling. [1]
- Machine Learning: regression, classification, SVM, trees, CV, NN, clustering, PCA. [1]
- AI: search, logic, uncertain reasoning (variable elimination, sampling). [1]

> Note: Credits, contact hours, and weights vary by institution; consult the official syllabus. [2]

---

Sources
1. Official DA 2026 syllabus PDF.  2. Academic regulations/handbook.
