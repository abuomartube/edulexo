# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Build**: esbuild (CJS bundle)

## Churchill AI App

Full IELTS practice app with four AI tools: **Churchill AI** (speaking), **Orwell AI** (writing), **Attenborough AI** (listening), and **Hemingway AI** (reading).

### Branding
- **4 IELTS brand**: TEAL `#00B4C8`, YELLOW `#F5C518`, GREEN `#1DB954`, NAVY `#0A1A30`
- Per-tool accents: Churchill = TEAL, Orwell = YELLOW, Attenborough = SOFT_GREEN `#6EE7B7`, **Hemingway = VIOLET `#A78BFA`**
- Logo at `artifacts/churchill-ai/public/logo.png`; mentor portraits: `churchill.png`, `orwell.png`, `attenborough.png`, `hemingway.png`

### AI Integrations
- **OpenAI** (GPT-4o): Churchill AI speaking examiner + TTS (`gpt-4o-mini-tts` via `audio.speech.create` for Free Conversation; `gpt-audio` chat-completions still used in `/tts-stream` for Speaking)
- **Anthropic** (Claude Sonnet): Orwell AI writing analyzer (essay scoring, grammar corrections, example essays)
- Both use Replit AI Integrations proxy (no user API keys needed)

### Key Features
- **Churchill AI — two modes (post-login mode picker `ChurchillModeChoice.tsx`)**: 
  1. **For IELTS** (existing flow, `Speaking.tsx`): GPT-4o as IELTS speaking examiner, 120 topics, 3-part exam flow, Voice+Text modes, band score reports.
  2. **For Speaking — Free Conversation** (new, `FreeConversation.tsx`): natural ChatGPT-voice-mode-style chat. Student picks a preset topic (30 options) or types a custom topic, picks Voice or Text mode, and has a real conversation with Churchill (gpt-4o) that NEVER corrects, teaches, or mentions IELTS during the chat. **Voice mode is fully hands-free, ChatGPT-style**: one click on the Voice tile starts the entire session — no per-turn mic button. A custom RMS-based VAD running on an `AnalyserNode` detects when the student starts/stops speaking (speech threshold 0.020, 280ms minimum utterance, 850ms silence hangover before send). `SpeechRecognition` runs continuously with single-owner restart guards (max 6 consecutive failures, exponential backoff, fatal-flag bail on permission errors) — onresult/onerror/onend callbacks all check `recognitionRef.current === r` to ignore stale instance fires. **Real-time barge-in**: while AI TTS is playing, threshold rises to 0.040, and 220ms of sustained user speech instantly cancels TTS playback + aborts the LLM stream. **Echo gate**: SR results fired during AI playback are silently dropped unless barge-in has been positively detected by VAD, so AI's own TTS leaking back through the mic can never be sent as user input. Sentence-buffered TTS streaming (audio starts as the first sentence completes). The orb UI scales with mic level and changes color (teal idle / green user-speaking / gold AI-speaking). Only ends when student clicks "End & Get Feedback" — never auto-ends. Then a full IELTS-style report is generated (overall band, fluency/lexical/grammar/pronunciation scores, grammar corrections, vocabulary upgrades, sentence upgrades, tips). Sessions persist to `conversation_sessions` table; report screen shows an SVG progress chart of past band scores. Backend routes: `/api/churchill/conversation/{chat,feedback,sessions}` (mounted in `routes/index.ts`, code in `routes/conversation.ts`). Important: this code does NOT touch `Speaking.tsx` — it has its own independent mic + TTS implementation.
- **Churchill AI**: GPT-4o as IELTS speaking examiner, 120 topics, 3-part exam flow, Voice+Text modes, band score reports. Voice mode features: client-side WAV recording (PCM capture), manual mic control (tap to start/stop, no auto-activation, no silence auto-stop), voice-specific prompts (Churchill reads questions aloud naturally without emoji formatting), animated VoiceOrb UI with clear state labels (Churchill speaking / Your turn — tap to answer / Recording — tap to stop / Processing). Strict IELTS band scoring: Part 1 requires answer+reason+example for Band 6+, one-sentence answers capped at Band 5, basic vocabulary capped at Band 5. Part 1 questions are simple and personal (not analytical).
- **Orwell AI**: Claude-powered IELTS writing analyzer — Task 1/Task 2 essays + paragraph/email correction, annotated errors, corrected versions, Band 6 & Band 8 example essays, grammar recommendations (simple→complex/compound), linking words upgrades, new vocabulary with Arabic hints, personalized guidance
- **Orwell AI History**: Essay logs saved to `essay_logs` table, "My History" tab with progress dashboard (SVG chart), essay list with band scores, full analysis replay
- **Feedback System**: After speaking/writing sessions, popup asks students for improvement feedback; admin reads all feedback in Feedback tab
- **Student Reviews**: Students can rate (1-5 stars) and comment on the tool choice page; admin approves/rejects reviews; approved reviews appear publicly as testimonials
- Browser Web Speech API for voice transcription (NOT backend whisper)
- Post-login tool choice screen lets students pick Churchill AI or Orwell AI

### Auth System
- **Students table**: `students` (id, email, status: pending/approved/denied, expires_at, created_at)
- **Settings table**: `settings` (key, value) for shared passwords
- **Essay Logs table**: `essay_logs` (id, student_id FK, task_type, essay, overall_band, criterion bands, analysis JSONB, created_at)
- **Feedback table**: `feedback` (id, student_id FK, email, tool, message, created_at)
- **Comments table**: `comments` (id, student_id FK, email, text, rating 1-5, status: pending/approved/rejected, created_at)
- Registration uses a shared student password; admin approves/denies students
- Cookie-based auth with HMAC-signed tokens (SESSION_SECRET env var)
- Default passwords: student = `churchill2025`, admin = `admin2025`
- **Student Expiration**: Admin can set/clear expiration dates per student. Expired students see "Account Expired" badge with tools disabled. Server-side middleware (`requireActiveStudent`) blocks API access for expired/unapproved accounts.

### API Routes
- `/api/churchill/` — AI message, report, TTS (speaking)
- `/api/churchill/ielts/analyze` — Orwell AI essay/paragraph analysis (POST, uses Anthropic Claude, auto-saves to essay_logs)
- `/api/churchill/ielts/logs` — Student's essay history (GET, returns list)
- `/api/churchill/ielts/logs/:id` — Full essay log with analysis (GET)
- `/api/churchill/ielts/progress` — Student progress stats + band history (GET)
- `/api/churchill/auth/register` — student registration
- `/api/churchill/auth/login` — student login
- `/api/churchill/auth/me` — check session
- `/api/churchill/auth/logout` — clear session
- `/api/churchill/auth/admin/*` — admin login, students list, approve/deny, password management

### Frontend Pages
- `Login.tsx` — student register/login with shared password
- `Pending.tsx` — waiting for admin approval screen
- `Admin.tsx` — admin panel (login, student management, password changes)
- `ToolChoice.tsx` — post-login tool selection (Churchill AI vs Orwell AI)
- `Landing.tsx` — Churchill AI landing page (approved students only)
- `Speaking.tsx` — IELTS speaking practice session
- `Writing.tsx` — Orwell AI writing analyzer (essay input, analysis results, annotations)

## Hemingway AI — Reading Practice

A2 + B1 IELTS Reading practice with 10 question types per level (100 items total: 5 per level/type bucket). Each ITEM = one passage with all sub-questions; the student answers everything, sees a combined per-item result with per-sub-question correctness + explanation, then advances. After 5 items in a bucket, a summary screen shows the total score. UNIQUE(student_id, item_slug) on `reading_attempts` prevents redoing the same item (mirrors Listening).

### Question types (10)
`mcq`, `tfng`, `ynng`, `matching_headings`, `matching_features`, `sentence_completion`, `note_completion`, `table_completion`, `flow_chart_completion`, `short_answer`.

### Backend
- Schemas: `lib/db/src/schema/reading_items.ts` + `reading_attempts.ts` (exported via schema index).
- Item bank: `artifacts/api-server/src/reading/itemBank.ts` — pure TS, 100 items. Verbatim items use slugs `<level>-<type>-1`; generated ones `<level>-<type>-2..5`.
- Store + grader: `artifacts/api-server/src/reading/{store,grader}.ts`. `store.ts` uses `CREATE TABLE IF NOT EXISTS` so both reading tables auto-create + seed on boot (no `db:push` required for fresh DBs).
- Routes: `artifacts/api-server/src/routes/reading.ts` mounted at `/api/churchill/reading`:
  - `GET /levels-types` — metadata for menu
  - `GET /items?level=&type=` — bucket list (no answer keys leak), with completion flags
  - `GET /items/:slug` — single item (no answer keys) + existing attempt if any
  - `POST /items/:slug/submit` — grades + inserts attempt; returns 409 on duplicate
  - `GET /attempts` — student history
- Admin CRUD (cookie-gated, mounted before `requireActiveStudent`):
  - `GET /admin/items` (list summaries + type metadata), `GET /admin/items/:slug` (full row)
  - `POST/PUT /admin/items[:slug]` — per-type validation (mcq ≥2 options, tfng/ynng enums, matching needs paragraphs/options, completion answers must be strings)
  - `DELETE /admin/items/:slug`
- Admin UI: `pages/Admin.tsx` "Reading" tab → `components/AdminReadingItems.tsx` (list grouped by level + type with per-bucket "+ New" buttons; full editor with type-aware answer inputs).

### Hemingway production seed

The reading tables auto-create and self-seed from `itemBank.ts` on first
boot, which is fine for dev but a fragile contract on Railway. To
deliberately seed the production DB once (and verify), run:

```
PROD_DATABASE_URL=postgres://... \
  pnpm --filter @workspace/api-server run seed:reading:prod
```

(equivalent to `pnpm --filter @workspace/api-server exec tsx scripts/seed-reading.ts`).

The script (`artifacts/api-server/scripts/seed-reading.ts`) reuses
`ensureReadingItemsTable` + `seedReadingItemsIfEmpty` from `store.ts`,
plus an `INSERT ... ON CONFLICT (slug) DO NOTHING` safety net to fill in
any individual missing slugs from a partial previous run. Existing rows
are never overwritten, so admin edits made through the UI are
preserved. The script probes connectivity up front and verifies the
final row count is ≥ 100 — the boot-time helpers swallow errors on
purpose, so this wrapper exits non-zero if the seed didn't actually
take effect (no silent "Done." next to a half-empty table). Safe to
re-run.

### Frontend pages
- `pages/ReadingLevelPicker.tsx` — A2 / B1 cards
- `pages/ReadingTypePicker.tsx` — 10-type grid with per-bucket progress bar
- `pages/ReadingPlayer.tsx` — passage + 4 input UIs (radios for mcq/tfng/ynng, dropdown for matching_*, text for completion + short_answer); inline result with Next / See bucket summary
- `pages/ReadingSummary.tsx` — bucket totals + per-passage breakdown
- App.tsx screens: `reading-levels`, `reading-types`, `reading-player`, `reading-summary`; `ToolChoice.tsx` adds the 4th violet Hemingway card + tagline pill.

## Listening tests audio (Attenborough)

The 20 IELTS Listening tests (4 sections × 5 tests, 280 unique segments)
have all their TTS audio pre-rendered and committed to the repo at
`artifacts/api-server/static-audio/listening/<sha256-hash>.mp3`. The
`/api/storage/public-objects/listening/<hash>.mp3` route serves these
straight from disk so the app works on hosts without Replit object
storage (notably Railway, where `PUBLIC_OBJECT_SEARCH_PATHS` is
intentionally unset). When that env var IS set (Replit), the route
still falls back to object storage for any hash not found locally.

To regenerate after editing the test bank:

```
pnpm --filter @workspace/api-server exec tsx scripts/prepare-static-audio.ts
```

The script is idempotent (skips files already on disk), prefers
downloading existing files from object storage when available, and only
calls OpenAI TTS as a last resort. Writes are atomic (temp file + rename)
so an interrupted run leaves no half-written `.mp3`.

A `prebuild` guard (`scripts/verify-static-audio.ts`, also exposed as
`pnpm --filter @workspace/api-server run verify:static-audio`) re-hashes
every segment in the test bank and **fails `pnpm build`** if any
referenced `<hash>.mp3` is missing on disk, listing each offender. This
makes it impossible to ship a build whose test bank references audio
that wasn't regenerated. See `artifacts/api-server/static-audio/README.md`
for the workflow.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
