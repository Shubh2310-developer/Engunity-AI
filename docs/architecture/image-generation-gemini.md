# Fast, Best-in-Class Image Generation with Gemini (Imagen 3.0 Fast)

This document details a production-grade design to add prompt-to-image generation to Engunity AI's Chat & Code experience using Google's Gemini Images (Imagen 3.0 Fast) via the REST API. It prioritizes speed, simplicity, and robust UX.

## Goals
- Seamless image generation directly in the Chat & Code UI
- Low-latency, scalable server-side integration
- First-class developer ergonomics and security (no API keys client-side)
- Maintainable, testable architecture consistent with existing patterns

## High-Level Architecture
- Frontend (Next.js):
  - UX pattern: a simple "/imagine" prefix in the chat input and a dedicated Imagine button
  - Renders results inline as markdown images (data URLs), so no additional hosting is required
- Next.js API Route: `POST /api/ai/image`
  - Authenticated via Supabase session
  - Calls a small service wrapper to Google "Imagen 3.0 Fast" REST endpoint
  - Returns base64 data URLs for direct rendering
- Service: `frontend/src/lib/services/gemini-images.ts`
  - Thin wrapper around Imagen REST API using server env key (`GEMINI_API_KEY`)
  - Avoids SDK drift; swappable model string and parameters (n, aspectRatio, quality)

## Request Flow
1. User enters `/imagine a photorealistic robot writing code on a whiteboard, cinematic lighting`
2. Frontend detects the prefix and calls `POST /api/ai/image` with `{ prompt, n, aspectRatio, quality }`
3. API route validates auth, invokes `generateImagesViaRest`
4. Google API returns base64 images; API wraps them as data URLs
5. Frontend inserts the images as an assistant message with markdown `![](...)`

## API Contract
- Endpoint: `POST /api/ai/image`
- Request JSON:
  - `prompt: string` (required)
  - `aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'`
  - `n?: number` (1-4)
  - `quality?: 'standard' | 'high' | 'draft'`
- Response JSON:
  - `success: boolean`
  - `images: { mimeType: string; dataUrl: string; }[]`
  - `model: string`
  - `prompt: string`
  - `timingMs: number`

## Environment
- Use `GEMINI_API_KEY` on the server (or `NEXT_PUBLIC_GEMINI_API_KEY` for local dev fallback). Add to `.env`:
```
GEMINI_API_KEY=your_google_ai_studio_key
```

## Frontend Integration Details
- UX triggers:
  - Press Enter with input starting `/imagine ...`
  - Click the Imagine button (auto-adds the prefix if missing)
- Visual feedback: spinner on the Imagine button and a temporary "Generating image..." assistant bubble
- Rendering: images embedded as markdown `![alt](dataUrl)` rendered by the existing `MessageRenderer`

## Service Implementation (`gemini-images.ts`)
- Model: `imagen-3.0-fast` (low-latency, high-throughput)
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateImage?key=${API_KEY}`
- Parameters kept minimal for speed; safely clamp `n` to [1, 4]

## Security & Compliance
- API key never exposed to the browser; requests go through Next.js route with session check
- Data URLs avoid needing an image CDN for MVP; can be switched to S3/Supabase storage later
- Add simple server-side input validation and error handling

## Performance Considerations
- Use Imagen 3.0 Fast for best latency/price balance
- Data URL size: keep `n` small by default (1) and allow explicit user control
- If responses become large, consider returning short-lived signed URLs instead of data URLs (future enhancement)

## Testing Strategy
- Unit test the service wrapper with mocked fetch
- Integration test `POST /api/ai/image` happy path and error path
- E2E test: user enters `/imagine` in Chat & Code and images render inline

## Future Enhancements
- Persist images to object storage and reference by URL (with gallery view)
- Negative prompts, style presets, safety settings
- User rate limiting and usage metering
- Batch generation UI with selectable grids and upscaling

## Implementation Files
- Frontend page: `frontend/src/app/dashboard/chatandcode/page.tsx`
- API route: `frontend/src/app/api/ai/image/route.ts`
- Service: `frontend/src/lib/services/gemini-images.ts`

This design is minimal, fast, and maintainable, and it integrates naturally with Engunity AI's existing architecture.
