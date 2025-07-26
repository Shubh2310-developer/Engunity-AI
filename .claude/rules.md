# Claude Rules for Engunity AI

You are assisting with building and maintaining the codebase for **Engunity AI**, a full-stack AI SaaS platform. Use these rules to guide your decisions:

---

## 🌐 General Philosophy

- Write **clean**, **modular**, and **typed** code.
- Favor **clarity over cleverness**.
- Assume we use **Next.js App Router**, **Tailwind CSS**, **TypeScript**, **ShadCN UI**, **Framer Motion**, and **Supabase/MongoDB**.
- Use **serverless functions**, **lazy loading**, and **code splitting** where needed.
- Prioritize **developer experience**, **scalability**, and **accessibility**.

---

## 🧱 Folder & File Structure

- All pages are in `/app/...` using Next.js 14's app router.
- Keep business logic in `/lib/`, types in `/types/`, and components in `/components/`.
- Firebase utilities live in `/lib/firebase/`.
- Backend Python services live in `/backend/app/services/`.
- Shared constants, validators, and crypto utilities go in `/lib/utils/`.

---

## 🧠 Component Guidelines

- Use ShadCN components, customize with Tailwind.
- Animate with Framer Motion where appropriate.
- Use `use client` only when necessary.
- Always extract reusable UI pieces into `components/ui/` or `components/shared/`.

---

## 🔐 Auth Rules

- Use Supabase for auth.
- All protected routes must go through `AuthGuard.tsx`.
- Use JWT/session tokens for secure API calls.

---

## 📂 File Uploads & Document Q&A

- Documents uploaded are stored via Supabase or Firebase.
- Trigger RAG pipeline via `/api/documents/upload/route.ts`.
- Use `DocumentViewer.tsx` to render file previews.
- Claude should understand we are chunking documents and vectorizing for Q&A.

---

## ⚙️ Backend Services (Python)

- Handle all doc analysis using modular files:
  - `extractor.py`, `chunker.py`, `vectorizer.py`, `rag.py`
- Use `document_tasks.py` for background jobs via Celery or FastAPI background tasks.
- Claude should never rewrite these services unless explicitly asked.

---

## 🧪 Testing

- Use `jest` and `react-testing-library` for frontend.
- Use `pytest` for backend.
- Every service should have at least one basic test.

---

## 💡 Claude’s Behavior

- Never hallucinate imports — if not sure, leave a TODO.
- Use consistent naming (`camelCase` for vars, `PascalCase` for components).
- Avoid unnecessary comments — write **self-documenting** code.
- Don't create new folders or files unless asked.
- Never touch `.env` or secrets.
- Always ask before:
  - Adding third-party libraries
  - Deleting core files
  - Refactoring across multiple services

---

## 📌 Misc

- Dark mode by default.
- Respect existing UI styles and gradients.
- All text content should be minimal and elegant.
- Claude should ask clarification when user input is vague.

---

## ✅ Claude: Summary
You are a **coding copilot**, **not an auto-pilot**. Guide the user with clean code, predictable changes, and ask before big decisions.

