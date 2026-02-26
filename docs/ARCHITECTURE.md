# The AI Playground — Game Card Generator

## Project Overview

An interactive web app where users scan a QR code, enter a theme prompt, and receive a fully designed instant-win game card with AI-generated images and copy — all in real time. Built for a live company presentation where 30-50 simultaneous users generate unique cards on their phones.

## Tech Stack

- **Monorepo**: Turborepo
- **Language**: TypeScript (strict) throughout
- **Frontend**: Vite + React + Zustand + Tailwind CSS
- **Backend**: Express
- **Queue**: BullMQ + Redis
- **Real-time**: Server-Sent Events (SSE)
- **Image Generation**: Midjourney API through [https://apify.com/](https://apify.com/) for artistic designs and Gemini (Nano Banana Pro) for precise designs
- **Background Removal**: remove.bg API
- **Package Manager**: npm

## Monorepo Structure

```
apps/
  web/          → Vite + React frontend
  server/       → Express 5 API server
packages/
  shared/       → Shared types, constants, validation schemas
```

## System Flow

```
User enters theme prompt (e.g., "retro space arcade")
  → Server receives prompt
  → Server creates a job in BullMQ
  → Job triggers in parallel: design decisions, image generations, etc.
progress.
  → User sees a nice user experience as the card comes to life
  → Progress updates streamed via SSE throughout
```

---

## Frontend (`apps/web`)

### Pages / Views

**Landing / Lobby**

- Displays presentation title and branding
- Single input: theme prompt (text field + submit button)
- Mobile-first responsive design — most users will be on phones
- Should feel playful and polished, not enterprise-y

**Generation View**

- Appears after user submits a prompt
- Shows real-time progress of card generation via SSE
- Progress should feel alive — not just a spinner. Show stages: "Generating images...", "Removing backgrounds...", "Composing your card..." The user should see the card come alive as it progresses but shouldn't be able to interact before the card is finished.
- As text content (title, tagline) arrives first, it should appear on the card template immediately while images are still loading
- Images should appear progressively as each one completes

**Card Result View**

- Displays the final composed game card
- Option to download as image
- Option to "Generate Another" (if under rate limit)
- Shareable — users will want to show each other

### Frontend Requirements

- Mobile-first. Assume 80%+ of users are on phones.
- Smooth animations and transitions between states
- Handle error states gracefully (API failure, rate limit reached, queue full)
- No authentication required
- Works on any modern mobile browser

---

## Backend (`apps/server`)

### API Endpoints

**POST `/api/generate`**

- Accepts: `{ prompt: string }`
- Validates prompt (length, basic sanitization)
- Creates a BullMQ job
- Returns: `{ jobId: string }`

**GET `/api/status/:jobId`**

- SSE endpoint
- Streams progress updates for the given job
- Event types should include: `text-ready`, `image-progress`, `image-ready`, `composing`, `complete`, `error`
- Each event carries relevant partial data (e.g., `text-ready` includes title + tagline)

**GET `/api/card/:jobId`**

- Returns the final composed json data that can fully populate and drive a scratch-card layout/template

**GET `/api/health`**

- Health check endpoint for monitoring

### Job Pipeline (BullMQ)

Each generation job runs the following steps. Steps that can run in parallel should run in parallel.

**Step 1 — AI Design Step**

- Given the user's theme prompt, decide which scratch-card layout to use, what the title should be, and description for each image asset required for that specific layout.

**Step 2 — AI Image Generation**

- Generate the images based on the specific scratch card layout (TBD)
- Images should be stylistically consistent with each other
- The prompt engineering for image generation should produce results that work well as game card elements (objects, icons, characters, spritesheets)
- If needed needed the backgrounds should be removed.
- Each image should stream to the frontend as it completes.

**Step 3— Card Composition**

- Take the card template, the generated text, and the processed images
- Send the data to the frontend to update the scratch-card
- The template layout should have designated slots/zones for where images and text go

### Rate Limiting & Safety

- Max 2 generations per user (tracked by IP or session token)
- Max concurrent jobs: configurable, default 10
- Prompt validation: reject empty, too long (>200 chars), or obviously inappropriate prompts
- Queue overflow: if queue exceeds threshold, return a friendly "we're at capacity" message

---

## Shared Package (`packages/shared`)

- TypeScript types for API requests/responses
- SSE event type definitions
- Validation schemas (zod) shared between frontend and backend
- Constants (rate limits, max prompt length, etc.)

---

## Card Template System

The game card template is a static design with dynamic slots. It should look like a realistic instant-win game card (scratch card style).

**Template slots to be determined.**

The template design itself should be hardcoded — the AI only fills the dynamic slots. The card should look polished and branded even before AI content is inserted.

---

## Environment Variables

```
# AI APIs
GEMINI_API_KEY=
IMAGE_GEN_PROVIDER=
REMOVEBG_API_KEY=          # if using remove.bg

# Redis
REDIS_URL=redis://localhost:6379

# Server
PORT=3001
MAX_CONCURRENT_JOBS=10
MAX_GENERATIONS_PER_USER=2
MAX_PROMPT_LENGTH=200

# Frontend
VITE_API_URL=http://localhost:3001
```

---

## Non-Goals (Explicitly Out of Scope)

- No user authentication or accounts
- No database / persistence — jobs and cards only need to live for the duration of the presentation
- No connection to any TimePlay backend services
- No admin dashboard
- No analytics
- Not a production app — this is a one-time demo tool. Optimize for wow factor, not scalability.

---

## Success Criteria

1. 30 users can scan a QR code and generate cards simultaneously without crashing
2. Time from prompt submission to final card: under 45 seconds
3. The card output looks polished enough that people want to screenshot and share it
4. Zero configuration needed by end users — scan, type, get card
