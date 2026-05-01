# Mentor AI — Churchill (IELTS Speaking) + Orwell (IELTS Writing)

Full-stack IELTS practice platform with two AI tutors, an admin panel,
student reviews, WhatsApp onboarding, and access-code registration.

- **Churchill AI** — IELTS Speaking practice, plus a hands-free
  ChatGPT-voice-mode style "Free Conversation" tutor (Silero neural VAD,
  Whisper STT, GPT-4o, OpenAI streaming TTS).
- **Orwell AI** — IELTS Writing analyser (Anthropic Claude) with band
  scoring, grammar fixes, vocabulary upgrades, and example essays.
- **Admin panel** — manage students, access codes, comments/reviews.

---

## 1. Tech stack

- **Monorepo:** pnpm workspaces (`pnpm-workspace.yaml`)
- **Frontend:** React 18 + Vite 7 + TypeScript + Tailwind
- **Backend:** Node.js + Express (`artifacts/api-server`) bundled with esbuild
- **Database:** PostgreSQL via Drizzle ORM (`lib/db`)
- **AI:** OpenAI (`gpt-4o`, `gpt-4o-mini-transcribe`, `gpt-4o-mini-tts`,
  `gpt-audio`) and Anthropic (`claude-sonnet`)
- **Voice:** `@ricky0123/vad-web` (Silero VAD) + custom WAV encoder + parallel
  energy-based barge-in pre-trigger

Project layout:

```
artifacts/
  api-server/        Express API (auth, churchill, orwell, conversation, admin)
  churchill-ai/      React+Vite SPA — student & admin UI
  mockup-sandbox/    Internal UI prototyping sandbox (not deployed)
lib/
  db/                          Drizzle schema + Postgres pool
  integrations-openai-ai-server/   OpenAI client wrapper
  integrations-anthropic-ai/       Anthropic client wrapper
scripts/             Build/dev helpers
```

---

## 2. Prerequisites

- **Node.js 20+** and **pnpm 9+** (`npm i -g pnpm`)
- A PostgreSQL database (local Postgres, Neon, Supabase, etc.)
- API keys: OpenAI **and** Anthropic
- A modern browser for the SPA (Chrome / Edge / Safari 17+)

---

## 3. First-time setup

```bash
# 1. Install all workspace dependencies
pnpm install

# 2. Configure environment variables
cp .env.example .env
#   …then edit .env and fill in real values
#   (DATABASE_URL, OpenAI key, Anthropic key, SESSION_SECRET)

# 3. Push the database schema (creates all tables)
pnpm --filter @workspace/db run db:push
#   if the command refuses for a destructive change:
#   pnpm --filter @workspace/db run db:push -- --force
```

> The schema lives in `lib/db/src/schema.ts`. It includes students,
> access codes, conversation sessions, writing submissions, comments,
> and admin users.

---

## 4. Running locally (dev mode, hot reload)

Open three terminals (or use a process manager like `concurrently`):

```bash
# Terminal 1 — API server (Express, port 8080 by default)
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend (Vite, prints its port on startup)
pnpm --filter @workspace/churchill-ai run dev

# Terminal 3 — (optional) component preview sandbox
pnpm --filter @workspace/mockup-sandbox run dev
```

The frontend proxies `/api/*` to the API server. Open the URL printed by
Vite in your browser.

---

## 5. Building for production

```bash
# Type-check everything
pnpm run typecheck

# Build all packages
pnpm run build

# Start the API server
pnpm --filter @workspace/api-server run start
```

The frontend build output lands in `artifacts/churchill-ai/dist/`. Serve
it with any static host (Nginx, Caddy, Cloudflare Pages, S3 + CDN, etc.)
and point the `/api/*` paths at the running API server.

The API server bundle is `artifacts/api-server/dist/index.mjs` —
`node --enable-source-maps ./dist/index.mjs` runs it.

---

## 6. Environment variables

See [`.env.example`](./.env.example) for the full list. Required for any
deployment:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | `https://api.openai.com/v1` |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | Your OpenAI API key |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | `https://api.anthropic.com` |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | Your Anthropic API key |
| `SESSION_SECRET` | Long random string for cookie signing |
| `NODE_ENV` | `production` in deploys |
| `PORT` | Server listen port (Express defaults to 8080) |

> The `AI_INTEGRATIONS_*` names exist because the project was originally
> wired through the Replit AI Integrations proxy. When self-hosting, just
> point them at the public OpenAI / Anthropic endpoints with your own keys.

---

## 7. Notable routes

API (`artifacts/api-server/src/routes/`):

- `POST /api/churchill/auth/*` — student & admin auth, access codes
- `POST /api/churchill/voice-message` — IELTS Speaking turn (audio in → SSE feedback + reply)
- `POST /api/churchill/whisper` — Whisper STT (used by Free Conversation)
- `POST /api/churchill/tts` — Speech via `gpt-4o-mini-tts` (Free Conversation)
- `POST /api/churchill/tts-stream` — streaming TTS (IELTS Speaking)
- `POST /api/churchill/conversation/chat` — Free Conversation streaming reply
- `POST /api/churchill/conversation/feedback` — IELTS-style report after a chat
- `POST /api/orwell/*` — Writing analyser
- `*    /api/admin/*` — admin panel CRUD

Frontend pages (`artifacts/churchill-ai/src/pages/`):

- `Speaking.tsx` — IELTS Speaking (untouched mic logic)
- `FreeConversation.tsx` — hands-free voice tutor
- `Writing.tsx` — Orwell IELTS Writing
- `Admin*.tsx` — admin dashboards

---

## 8. Deployment notes

- The API server reads `PORT` from the environment. Bind it on whichever
  port your platform assigns.
- For browsers behind a proxy / different origin, make sure the SPA's
  `/api/*` calls reach the API and that cookies (`SESSION_SECRET`) are
  forwarded.
- **HTTPS is required** for microphone access in modern browsers — the
  voice features (Speaking, Free Conversation) will not work on plain
  HTTP except on `localhost`.
- iOS Safari requires the audio unlock primer that fires inside the
  user's tap on "Voice" — already implemented in `FreeConversation.tsx`.

---

## 9. Project conventions / brand

- **Brand colours:** Teal `#00B4C8`, Gold `#F5C518`, Green `#1DB954`,
  Navy `#0A1A30`
- **Logo:** `artifacts/churchill-ai/public/logo.png`
- **Hard rule:** the IELTS Speaking mic implementation in `Speaking.tsx`
  must **not** be modified by Free Conversation work — they are
  independent.

---

## 10. Useful scripts

```bash
pnpm run typecheck                              # type-check everything
pnpm run build                                  # build everything
pnpm --filter @workspace/db run db:push         # sync DB schema
pnpm --filter @workspace/db run db:push -- --force   # destructive sync
pnpm --filter @workspace/api-server run dev     # API in watch mode
pnpm --filter @workspace/churchill-ai run dev   # SPA in watch mode
```

---

## 11. License

Proprietary — all rights reserved.
