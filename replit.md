# Abu Omar EduLexo Project

## Overview

The Abu Omar EduLexo project is a bilingual (English + Arabic) learning platform offering two main products: LEXO for English and LEXO for IELTS. The platform aims to provide a comprehensive and AI-powered learning experience.

**Key Capabilities:**
- **LEXO for English:** Features Oxford 3000 flashcards, CEFR-level packages, and word families.
- **LEXO for IELTS:** Offers a structured course with modules covering vocabulary, speaking, writing, listening, reading, and mock tests.
- **Bilingual Support:** Full Arabic and English localization with dynamic language switching.
- **User Authentication:** Secure signup, login, and password management.

The business vision is to become a leading AI-powered educational platform, expanding course offerings and market reach.

## User Preferences

- Brand strings should remain in English, even when the rest of the page is in Arabic.
- The Arabic font should be Cairo.
- Email/phone inputs should be forced `dir="ltr"` even in Arabic mode.
- Internal package naming convention (A, B, C) is locked and must be maintained in database schemas, access codes, and lesson tags.
- The `orval` config for the IELTS API client should explicitly write to `lib/ielts-api-client-react` and `lib/ielts-api-zod` and must *never* be repointed to `lib/api-client-react/`.

## System Architecture

The project is built as a pnpm workspace monorepo using TypeScript, Node.js 24, and pnpm as the package manager.

**UI/UX Decisions:**
- **Branding:** Master logo `src/assets/edulexo-logo.png` with a brand gradient of `from-indigo-700 via-purple-600 to-blue-600`.
- **Color Scheme:** Deep navy/indigo (`#1E2155`), vibrant violet (`#6B2FE6`), and royal blue (`#4F7FFF`).
- **Typography:** Cairo font for Arabic text, applied via `index.css` under `[lang="ar"], [dir="rtl"]`.
- **Layout:** Platform landing page features a hero section, product cards, a 6-feature benefits grid, and a final CTA. Product detail pages have specific layouts for English and IELTS courses.
- **Bilingual UI:** Uses a single-language render that flips on toggle, with `localStorage` persistence. An EN/AR pill toggle is present in the header.

**Technical Implementations:**
- **API Framework:** Express 5.
- **Database:** PostgreSQL with Drizzle ORM.
- **Validation:** Zod (`zod/v4`) and `drizzle-zod`.
- **API Codegen:** Orval, generating client and Zod schemas from OpenAPI specs.
- **Build System:** esbuild for CJS bundles.
- **Routing:** `wouter` for client-side routing.
- **Internationalization:** Custom i18n system (`src/lib/i18n.tsx`, `src/lib/translations.ts`) with compile-time type checking.
- **Authentication:**
    - Backend: `bcryptjs` (rounds=12) for password hashing, SHA-256 for password reset token hashing. `express-session` with `connect-pg-simple` for session management. Rate limiting implemented using `express-rate-limit`.
    - Frontend: `QueryClientProvider` + `AuthProvider` for state management. `useAuth()` hook provides authentication status and methods. `ProtectedRoute` component for access control.
- **Flashcard System:**
    - Words parsed from official Oxford 3000 CEFR PDFs.
    - Two browse modes: "Levels" (filter by CEFR A1-B2) and "Word Families" (75 themed categories).
    - Audio Architecture: Instant playback via server-side TTS. Server generates mp3s using OpenAI `fable` voice, with in-memory LRU and on-disk persistent caching. Client-side prefetching and batch warming for seamless audio.
- **IELTS Tiering:** The IELTS application supports "Complete" (A2→C1) and "Advance" (B1→C1) tiers, controlled by a `?tier=` URL parameter and persisted in `localStorage`. Filtering is UX-only; API enforcement is a future consideration.

**Feature Specifications:**
- **Abu Omar EduLexo Platform:** `/` (landing), `/english` (LEXO for English details), `/ielts` (LEXO for IELTS details), `/demo` (public flashcards), `/app` (full flashcard app, to be gated).
- **IELTS Application:** Hosted at `/app-ielts/`, with its API at `/api-ielts/` (port 8082). Uses a separate OpenAPI spec (`lib/ielts-api-spec/openapi.yaml`).

## External Dependencies

- **pnpm workspaces**: Monorepo management.
- **Node.js**: Runtime environment (version 24).
- **TypeScript**: Language (version 5.9).
- **Express 5**: API framework.
- **PostgreSQL**: Database.
- **Drizzle ORM**: Object-relational mapper.
- **Zod (`zod/v4`)**: Schema validation library.
- **drizzle-zod**: Zod integration for Drizzle ORM.
- **Orval**: OpenAPI spec code generator.
- **esbuild**: JavaScript bundler.
- **wouter**: React-based routing library.
- **bcryptjs**: Password hashing library.
- **express-session**: Session management middleware for Express.
- **connect-pg-simple**: PostgreSQL session store for `express-session`.
- **express-rate-limit**: Rate limiting middleware for Express.
- **OpenAI TTS API**: For generating text-to-speech audio.
- **Google Fonts (Cairo)**: For Arabic typography.