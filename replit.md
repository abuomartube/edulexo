# Abu Omar EduLexo Project

## Overview

The Abu Omar EduLexo project is an AI-powered, bilingual (English + Arabic) learning platform offering three specialized courses: LEXO Intro (A2→B1, IELTS-prep entry course), LEXO for English (Oxford 3000, A1→C1), and LEXO for IELTS (full mock prep). Its primary purpose is to provide a comprehensive educational experience through features like Oxford 3000 flashcards, CEFR-aligned packages, structured IELTS courses, and full localization. The project envisions becoming a leading AI-powered educational platform, expanding its course offerings and market reach within the ed-tech sector. The platform landing page (`/`) presents all three courses as side-by-side cards in a 3-column grid, ordered Intro → English → IELTS.

## User Preferences

- Brand strings should remain in English, even when the rest of the page is in Arabic.
- The Arabic font should be Cairo.
- Email/phone inputs should be forced `dir="ltr"` even in Arabic mode.
- Internal package naming convention (A, B, C) is locked and must be maintained in database schemas, access codes, and lesson tags.
- The `orval` config for the IELTS API client should explicitly write to `lib/ielts-api-client-react` and `lib/ielts-api-zod` and must *never* be repointed to `lib/api-client-react/`.

## System Architecture

The project is a pnpm workspace monorepo built with TypeScript and Node.js 24, designed for scalability and maintainability.

**UI/UX Decisions:**
- **Branding:** Consistent use of `src/assets/edulexo-logo.png` and a brand gradient (`from-indigo-700 via-purple-600 to-blue-600`).
- **Color Scheme:** Utilizes a distinct palette of deep navy/indigo (`#1E2155`), vibrant violet (`#6B2FE6`), and royal blue (`#4F7FFF`).
- **Typography:** Dynamic application of Cairo font for all Arabic text to ensure proper display.
- **Layout:** Standardized design for landing pages, product cards, feature grids, and specific layouts for course detail pages.
- **Bilingual UI:** Features dynamic language switching with `localStorage` persistence, controlled via an EN/AR pill toggle in the header.

**Technical Implementations:**
- **API Framework:** Express 5.
- **Database:** PostgreSQL with Drizzle ORM for data management.
- **Validation:** Zod (`zod/v4`) integrated with `drizzle-zod` for schema validation.
- **API Codegen:** Orval generates client and Zod schemas from OpenAPI specifications.
- **Build System:** esbuild for efficient CJS bundle creation.
- **Routing:** `wouter` for client-side navigation.
- **Internationalization:** Custom i18n system supporting compile-time type checking for bilingual content.
- **Authentication:** `bcryptjs` (rounds=12) for password hashing, SHA-256 for password reset tokens, `express-session` with `connect-pg-simple` for session management. Rate limiting is implemented using `express-rate-limit`. Frontend authentication uses `QueryClientProvider`, `AuthProvider`, `useAuth()` hook, and `ProtectedRoute`.
- **Flashcard System:** Processes Oxford 3000 CEFR PDFs, supports various CEFR Levels and Word Families. Audio is generated via OpenAI TTS, cached server-side, and prefetched client-side.
- **IELTS Tiering:** Supports "Complete" (A2→C1) and "Advance" (B1→C1) tiers inside one unified app at `/lexo-ielts/?tier=<tier>`, with the tier persisted in `localStorage`. The legacy `/app-ielts/` URL has been retired in favor of `/lexo-ielts/`. The `Intro` tier still routes to the standalone `/app-ielts-intro/` artifact pending a planned merge of its voice/VAD/listening features into the unified IELTS app.
- **Unified App URLs:** The English course launches at `/lexo-english/` (formerly `/app-english/`). All in-app links and the central SSO redirector use these unified paths.
- **Dashboard Upsell Cards:** "My Courses" always renders three IELTS tier cards (intro/advance/complete) and three English tier cards (beginner/intermediate/advanced), regardless of enrollment. Owned tiers show launch/renew controls; unowned tiers show an "Enroll for 150 SAR" CTA linking directly to `/checkout/intro/<tier>` or `/checkout/english/<tier>`.
- **Cross-product SSO:** Secure single sign-on between different platform applications using HMAC-signed, single-use launch URLs.
- **Email Verification:** Includes dedicated tables, API endpoints, rate limiting, and a UI banner for user interaction.
- **Admin Content Management:** Provides CRUD operations for FAQs and courses (intro, English, IELTS) with bilingual fields and publishing status. The admin dashboard features sections for Overview, Students, Enrollments, FAQ, Courses, Communication, and Access Codes.
- **Email Notifications System:** Bilingual EN+AR templated emails with database logging. Supports 9 types of notifications triggered by user actions or admin interventions.
- **Payments (Tabby + Tamara):** Integration with BNPL providers for Intro and English courses at a flat 150 SAR. Features a dedicated `payments` table, idempotent enrollment activation, secure callback mechanisms, and client-side checkout. The admin dashboard includes a "Payments" tab for transaction monitoring.
- **Payments (Bank Transfer / Manual Verification):** Allows bank transfers as a payment option, priced at 150 SAR. Students can upload payment proof directly to GCS via presigned URLs. Admins can review, verify, or reject payments, triggering appropriate bilingual emails and audit logs. The system includes robust IDOR-safe upload binding and hardening against duplicate pending transfers and invalid content types.
- **Course Certificates System:** Enables server-side generation of bilingual EN+AR PDF certificates for course completion, managed by admins. `certificates` table tracks issuance and revocation, ensuring uniqueness.
- **Subscription Expiry System:** Implements a 1-year (365-day) subscription window for paid activations, renewals, and access-code redemptions for IELTS and English courses. Expiry is enforced at the API level, and the dashboard provides status badges and renewal options.

## External Dependencies

- **pnpm**: Monorepo management.
- **Node.js**: Runtime environment (version 24).
- **TypeScript**: Language (version 5.9).
- **Express 5**: API framework.
- **PostgreSQL**: Database.
- **Drizzle ORM**: Object-relational mapper.
- **Zod (`zod/v4`)**: Schema validation.
- **drizzle-zod**: Zod integration for Drizzle ORM.
- **Orval**: OpenAPI spec code generator.
- **esbuild**: JavaScript bundler.
- **wouter**: React-based routing library.
- **bcryptjs**: Password hashing.
- **express-session**: Session management.
- **connect-pg-simple**: PostgreSQL session store.
- **express-rate-limit**: Rate limiting.
- **OpenAI TTS API**: Text-to-speech audio generation.
- **Google Fonts (Cairo)**: Arabic typography.
- **recharts**: Charting library.
- **pdfkit**: PDF generation (server-side).
- **fontkit**: Font processing for `pdfkit`.
- **Tabby**: BNPL payment provider.
- **Tamara**: BNPL payment provider.