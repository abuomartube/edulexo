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
- **Iteration 2 — DONE**: Auth (signup/login/forgot+reset password, protected routes, profile dropdown) + Postgres schema for users + sessions + a stub student dashboard. **No access codes** — open registration. Email is a logging stub for now (SendGrid wired in Iteration 5).
- **Iteration 2.5 — DONE**: Brand logos placed across the three landing pages. Master logo (`src/assets/edulexo-master-transparent.png`) headlines `/` in a dark navy/indigo gradient showcase panel above the "Two powerful courses" hero. Product logos appear large on each detail page: on `/ielts` the LEXO-for-IELTS logo (`src/assets/lexo-ielts.png`) replaces the video placeholder in the right hero column, and on `/english` a LEXO-for-English brand panel (`src/assets/lexo-english.png`) sits above the flashcard preview card. The two homepage course cards keep their lucide icon chips (BookOpen / Trophy). The `Header` keeps the small `edulexo-logo.png` AE icon. All logo panels use dark navy/teal/violet gradients matching the logos' native palette.
- **Iteration 2.7 — DONE (bilingual)**: Site is now truly bilingual with **Arabic as the default**. New i18n system replaces the old "EN+AR side-by-side" pattern with a single-language render that flips on toggle.
  - `src/lib/i18n.tsx` — `LanguageProvider` + `useLanguage()` + `useT()`. Default `"ar"`, persisted in `localStorage["edulexo:lang"]`. On change sets `document.documentElement.lang` + `dir`.
  - `src/lib/translations.ts` — central catalog of ~210 keys (common/nav/header/platform/english/ielts/auth/dashboard/comingSoon/admin) with `as const` typing and a compile-time `_Check` to enforce `{en, ar}` shape per entry.
  - `index.html` defaults `<html lang="ar" dir="rtl">` and a pre-mount script applies persisted language to avoid a flash.
  - `Header.tsx` has an EN/AR pill toggle (`data-testid="lang-toggle"`) on desktop and inside the mobile drawer.
  - **Brand strings stay English in both languages** (per user request): "Abu Omar EduLexo", "LEXO for English", "LEXO for IELTS", and the "Learn · Practice · Achieve" tagline are kept in English even when the rest of the page is Arabic. Arabic transliterations ("ليكسو", "إيدوليكسو", "أبو عمر") are not used anywhere.
  - Arabic font: **Cairo** (user-chosen). Loaded via Google Fonts in `index.html`; `src/index.css` applies it under `[lang="ar"], [dir="rtl"]`.
  - Email/phone inputs are forced `dir="ltr"` even in Arabic mode so addresses render correctly.
  - E2E verified: default Arabic load + toggle + persistence on reload + signup-in-Arabic → dashboard-in-Arabic → toggle-to-English on dashboard.
- **Iteration 3**: Free lessons gallery + Level Assessment + Affiliate program + FAQ.
- **Iteration 4**: Admin dashboard (approve/reject enrollments, bulk + targeted emails, sales analytics, product/price management).
- **Iteration 5**: Payments (Tabby, Tamara, Stripe, Bank Transfer) + SendGrid wiring (verification, reset, confirmation, marketing).

### Iteration 2 — Auth implementation notes

Backend (`artifacts/api-server`):
- `lib/db/src/schema/users.ts` — `users` table (`id`, `name`, `email` unique citext-style lower-case, `phone`, `password_hash`, `role` student|admin, `email_verified`, timestamps) and `password_reset_tokens` (`token` stores **SHA-256 hash** of the raw token, `user_id`, `expires_at`, `used_at`, `created_at`).
- `lib/db/src/schema/sessions.ts` — `user_sessions` table mirroring `connect-pg-simple` shape so the bundled server can use it without runtime SQL bootstrap.
- `lib/api-spec/openapi.yaml` — auth endpoints under `/auth/*`. Generated TS types live in `lib/api-types`, generated React Query hooks in `lib/api-client`, and Zod schemas in `lib/api-zod` (note orval names: `SignupBody/LoginBody/LoginResponse/GetCurrentUserResponse/ForgotPasswordResponse`).
- `artifacts/api-server/src/routes/auth.ts` — POST `/api/auth/{signup,login,logout,forgot-password,reset-password}` + GET `/api/auth/me`. Sessions are regenerated on signup/login (mitigates fixation). Logout destroys the session and clears the cookie.
- `artifacts/api-server/src/lib/session.ts` — `express-session` + `connect-pg-simple`, cookie name `edulexo.sid`, 30-day rolling expiry, `httpOnly`, `sameSite=lax`, `secure` in prod, `proxy=true` so Express trusts the X-Forwarded-Proto header from the path-based proxy. `createTableIfMissing:false` because the bundled output cannot read the package's `table.sql`.
- `artifacts/api-server/src/lib/auth.ts` — `bcryptjs` (rounds=12) helpers, `generateToken` (32-byte hex), `hashToken` (SHA-256) for at-rest reset tokens, `getAppOrigin()` builds reset URLs from `APP_PUBLIC_URL` → `REPLIT_DOMAINS` (never from request `Host`/`Origin` headers — host-poisoning safe), `requireAuth` + `requireAdmin` middleware.
- `artifacts/api-server/src/lib/rate-limit.ts` — `express-rate-limit` policies: `signupLimiter` (10/hour/IP in prod), `authIpLimiter` (20/15min/IP for login + reset), `forgotPasswordLimiter` (5/hour per IP+email key). Dev limits are loose (1000) so e2e tests don't hit them.
- `artifacts/api-server/src/lib/email.ts` — stub sender that logs only `to` + `subject` (never the email body or token). In dev only, the auth route logs the reset URL so we can complete the flow without real email; in prod no token ever reaches logs.
- DB schema is pushed via `pnpm --filter @workspace/db run push`.

Frontend (`artifacts/oxford-flashcards`):
- `src/main.tsx` — wraps the app in `QueryClientProvider` + `AuthProvider`.
- `src/lib/auth-context.tsx` — `useAuth()` returns `{ user, isAuthenticated, isAdmin, isLoading, signup, login, logout, forgotPassword, resetPassword, refresh }`. Uses orval-generated functions; `setQueryData` updates the `/me` cache after signup/login so UI flips immediately.
- `src/components/Header.tsx` — shared header with logo + brand + tagline, nav links (Courses / Features / Free Lessons / Level Assessment / Become an Affiliate), dark-mode toggle, hamburger drawer for `<lg`. When authed, shows a gradient initials avatar with a dropdown (My Dashboard, Admin Panel for admins, Log Out).
- `src/components/ProtectedRoute.tsx` — redirects unauth users to `/login` (or `/dashboard` if a non-admin hits an admin route). Shows a spinner while `isLoading`.
- Pages: `Signup`, `Login`, `ForgotPassword`, `ResetPassword`, `Dashboard`, `ComingSoon`. Signup/Login redirect via a `useEffect` keyed on `isAuthenticated` (declarative, avoids a render-order race where ProtectedRoute could fire a stale-state redirect on direct `navigate("/dashboard")`).
- Routes: `/signup`, `/login`, `/forgot-password`, `/reset-password`, `/dashboard` (protected), `/admin` (protected, requireAdmin), and `ComingSoon` placeholders for `/free-lessons`, `/assessment`, `/affiliate`, `/faq`.

E2E verified flow: signup → dashboard → avatar dropdown → logout → unauth `/dashboard` redirects to `/login` → login → forgot-password → reset (hashed token verified, replay rejected, old password rejected). Mobile hamburger drawer verified at 480x800.

Env: `SESSION_SECRET` is set. `APP_PUBLIC_URL` is optional — falls back to `https://${REPLIT_DOMAINS[0]}` then `http://localhost:80`.

Oxford 3000 flashcards with Arabic translations, day/night theme, and consistent native British TTS via OpenAI `fable` voice.

Word list (`src/data/oxford-words.ts`) is parsed from the official Oxford 3000 by CEFR PDF (`attached_assets/The_Oxford_3000_by_CEFR_level_*.pdf`). Words appearing at multiple CEFR levels (homonyms with different POS) are assigned to their lowest level. Total: 2988 words (A1: 898, A2: 795, B1: 690, B2: 605).

Two browse modes (toggle pill at top of UI):
- **Levels** — filter by CEFR level (A1–B2) or all 2988 words.
- **Word Families** (`src/data/word-families.ts` + `src/components/WordFamilies.tsx`) — 75 themed categories of 10 related Oxford 3000 words each (750 words). Topics span everyday life, parts of speech (pronouns, prepositions, conjunctions, question words), feelings, jobs, materials, environment, government/law, daily routine, and more. Each category has an English title + Arabic title (RTL), a lucide icon, and a tailwind gradient. All words are programmatically validated against `oxford-words.ts`. Selecting a category opens a flashcard deck of those 10 words; "All Families" returns to the grid. The flashcard component is reused for both modes.

Audio architecture (instant playback):
- Server: `GET /api/tts?text=...&voice=fable` returns mp3. Cache layers: in-memory LRU (64MB) → on-disk persistent cache at `artifacts/api-server/data/tts-cache/<sha256>.mp3` → OpenAI generate. Disk cache survives restarts so each word is generated by OpenAI at most once, ever.
- Server: `POST /api/tts/warm` `{voice, texts: string[]}` returns 202 immediately and generates missing audio in the background (concurrency 4, batch ≤50). Used for look-ahead warming.
- Client (`src/lib/tts.ts`): blob URL cache + in-flight dedup, `prefetchTts()` for current/next/prev, `warmTtsBatch()` to ask the server to background-generate the next ~30 words. `AudioButton` skips the loading state on cache hit so prefetched audio plays with no spinner.
