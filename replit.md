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
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Apps

### Abu Omar EduLexo (`artifacts/oxford-flashcards`)

A bilingual (English + Arabic) learning **platform** branded as **Abu Omar EduLexo** ("Learn · Practice · Achieve · Powered by AI") that hosts two products: **LEXO for English** and **LEXO for IELTS**. Master logo: `src/assets/edulexo-logo.png`. Brand colors taken from the logo:
- Deep navy/indigo `#1E2155` — primary text & wordmark
- Vibrant violet `#6B2FE6` — gradient mid-tone
- Royal blue `#4F7FFF` — "Lexo" wordmark + accent
- Brand gradient: `from-indigo-700 via-purple-600 to-blue-600`

Routes (wouter):
- `/` — **Platform landing** (`src/pages/PlatformLanding.tsx`): EduLexo master brand. Hero ("Two powerful courses. One smart platform."), two product cards (LEXO for English in violet/purple, LEXO for IELTS in emerald/teal) each with View Details + Enroll Now, 6-feature platform-benefits grid, final CTA, footer. All copy is bilingual EN+AR.
- `/english` — **LEXO for English product detail** (`src/pages/LandingPage.tsx`): existing English landing kept intact (hero, three CEFR packages, modules grid, CTA). Header now has a "← Platform" breadcrumb back to `/`. CTA button is "Enroll Now" → `/app`.
- `/ielts` — **LEXO for IELTS product detail** (`src/pages/IeltsCourse.tsx`): emerald/teal palette. Hero with video placeholder, 12-module grid (Vocabulary 2,198 words, Churchill AI Speaking, Orwell AI Writing, Listening test, Reading test, Mock tests, LEXO AI chat, Stories, Spell-It, Spaced Repetition, Grammar/Phrasal verbs, Daily streaks/PDF), Enroll section showing all four payment methods (Tabby/Tamara/Stripe/Bank Transfer), footer.
- `/demo` — public **Demo flashcards** (`src/pages/DemoFlashcards.tsx`): 40-word sample (10 per CEFR level) for the English course.
- `/app` — full **Flashcard app** (`src/pages/FlashcardApp.tsx`): all 2,988 words + 75 word families. Phase 2 will gate this behind login.

**Package naming convention (locked):** internally the three packages are referenced as **A**, **B**, **C** in the database schema, access codes, and lesson tags:
- **A** = Foundation Package (CEFR A1→B1, Levels 1-3)
- **B** = Mastery Package (CEFR A1→C1, Levels 1-6) — featured "BEST VALUE" tier
- **C** = Fluency Package (CEFR B1+→C1, Levels 4-6)

Roadmap (per user-specified iterations):
- **Iteration 1 — DONE**: New EduLexo platform landing + IELTS detail page + brand applied across the site.
- **Iteration 2**: Auth (signup/login/password reset, protected routes, email verification via SendGrid) + Postgres schema for users + enrollments. **No access codes** — open registration.
- **Iteration 3**: Payments (Tabby, Tamara, Stripe, Bank Transfer) + confirmation emails + manual admin approval gate (payment ≠ access; admin must approve enrollment).
- **Iteration 4**: Student dashboard (enrolled courses, materials, account settings).
- **Iteration 5**: Admin dashboard (approve/reject enrollments, bulk + targeted emails, sales analytics, product/price management).

Oxford 3000 flashcards with Arabic translations, day/night theme, and consistent native British TTS via OpenAI `fable` voice.

Word list (`src/data/oxford-words.ts`) is parsed from the official Oxford 3000 by CEFR PDF (`attached_assets/The_Oxford_3000_by_CEFR_level_*.pdf`). Words appearing at multiple CEFR levels (homonyms with different POS) are assigned to their lowest level. Total: 2988 words (A1: 898, A2: 795, B1: 690, B2: 605).

Two browse modes (toggle pill at top of UI):
- **Levels** — filter by CEFR level (A1–B2) or all 2988 words.
- **Word Families** (`src/data/word-families.ts` + `src/components/WordFamilies.tsx`) — 75 themed categories of 10 related Oxford 3000 words each (750 words). Topics span everyday life, parts of speech (pronouns, prepositions, conjunctions, question words), feelings, jobs, materials, environment, government/law, daily routine, and more. Each category has an English title + Arabic title (RTL), a lucide icon, and a tailwind gradient. All words are programmatically validated against `oxford-words.ts`. Selecting a category opens a flashcard deck of those 10 words; "All Families" returns to the grid. The flashcard component is reused for both modes.

Audio architecture (instant playback):
- Server: `GET /api/tts?text=...&voice=fable` returns mp3. Cache layers: in-memory LRU (64MB) → on-disk persistent cache at `artifacts/api-server/data/tts-cache/<sha256>.mp3` → OpenAI generate. Disk cache survives restarts so each word is generated by OpenAI at most once, ever.
- Server: `POST /api/tts/warm` `{voice, texts: string[]}` returns 202 immediately and generates missing audio in the background (concurrency 4, batch ≤50). Used for look-ahead warming.
- Client (`src/lib/tts.ts`): blob URL cache + in-flight dedup, `prefetchTts()` for current/next/prev, `warmTtsBatch()` to ask the server to background-generate the next ~30 words. `AudioButton` skips the loading state on cache hit so prefetched audio plays with no spinner.
