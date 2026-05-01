# Abu Omar EduLexo Project

## Overview

The Abu Omar EduLexo project is a bilingual (English + Arabic) AI-powered learning platform offering LEXO for English and LEXO for IELTS. It aims to provide a comprehensive educational experience with features like Oxford 3000 flashcards, CEFR-level packages, structured IELTS courses, and full localization. The project's vision is to become a leading AI-powered educational platform, expanding course offerings and market reach.

## User Preferences

- Brand strings should remain in English, even when the rest of the page is in Arabic.
- The Arabic font should be Cairo.
- Email/phone inputs should be forced `dir="ltr"` even in Arabic mode.
- Internal package naming convention (A, B, C) is locked and must be maintained in database schemas, access codes, and lesson tags.
- The `orval` config for the IELTS API client should explicitly write to `lib/ielts-api-client-react` and `lib/ielts-api-zod` and must *never* be repointed to `lib/api-client-react/`.

## System Architecture

The project is a pnpm workspace monorepo utilizing TypeScript, Node.js 24, and pnpm.

**UI/UX Decisions:**
- **Branding:** Master logo `src/assets/edulexo-logo.png` with a brand gradient of `from-indigo-700 via-purple-600 to-blue-600`.
- **Color Scheme:** Deep navy/indigo (`#1E2155`), vibrant violet (`#6B2FE6`), and royal blue (`#4F7FFF`).
- **Typography:** Cairo font for Arabic text, dynamically applied.
- **Layout:** Standardized layouts for landing pages, product cards, feature grids, and specific designs for English and IELTS course detail pages.
- **Bilingual UI:** Dynamic language switching with `localStorage` persistence, managed by an EN/AR pill toggle in the header.

**Technical Implementations:**
- **API Framework:** Express 5.
- **Database:** PostgreSQL with Drizzle ORM for schema management and queries.
- **Validation:** Zod (`zod/v4`) integrated with `drizzle-zod`.
- **API Codegen:** Orval generates client and Zod schemas from OpenAPI specifications.
- **Build System:** esbuild for CJS bundles.
- **Routing:** `wouter` for client-side navigation.
- **Internationalization:** Custom i18n system with compile-time type checking.
- **Authentication:** `bcryptjs` (rounds=12) for password hashing, SHA-256 for password reset tokens. `express-session` with `connect-pg-simple` for session management. Rate limiting via `express-rate-limit`. Frontend uses `QueryClientProvider` and `AuthProvider` with a `useAuth()` hook and `ProtectedRoute` for access control.
- **Flashcard System:** Words parsed from Oxford 3000 CEFR PDFs. Supports "Levels" (CEFR A1-B2) and "Word Families" (75 categories). Audio is generated using OpenAI TTS, cached server-side, and prefetched client-side.
- **IELTS Tiering:** Supports "Complete" (A2→C1) and "Advance" (B1→C1) tiers, controlled by URL parameters and `localStorage`.
- **Cross-product SSO:** Implemented for seamless navigation between the platform, IELTS, and Intro applications using HMAC-signed, single-use launch URLs. The English app shares the platform's session cookie directly.
- **Email Verification:** Features a `email_verification_tokens` table, API endpoints for sending and verifying, rate limiting, and a UI component (`UnverifiedEmailBanner`) for user interaction.
- **Admin Content Management:** CRUD operations for FAQs and courses (intro, English, IELTS) with bilingual fields, display ordering, and publishing status. Admin dashboard uses a 7-section sidebar layout (collapses to a horizontal scroll on mobile) with breadcrumbs: Overview, Students, Enrollments, FAQ, Courses, Communication, Access Codes.
  - **Overview:** stat cards (total users, active today/week, active enrollments, conversion rate, revenue placeholder), per-tier enrollment breakdown, two recharts line charts (sign-ups + new enrollments over the last 30 days, zero-filled UTC), and a recent sign-ups table. "Active" is a proxy (signup or enrollment activity in window) until last-login tracking is added.
  - **Enrollments:** unioned across the intro and english enrollment tables (each table keyed by `course`), with course/status/tier filters and Approve/Reject/Edit/Delete row actions.
  - **Courses:** each course card shows total active enrollments plus per-tier counts.
  - **Communication:** broadcast email form (audience: all users or by course), an **Expiry reminders** card (window selector 3/7/14/30 days, table preview, send-with-confirm button), and an **Email log** card (filters by type/status, refreshable table). Email delivery is currently a stub — the server logs each message via the request logger and writes a row to `emails_sent` for every send (success or fail), reporting `stubMode: true` until a provider (e.g., SendGrid/Resend) is wired with no code changes needed. Recipients are filtered by `emailVerified=true`.
  - Server endpoints: `GET /api/admin/stats`, `GET /api/admin/email/recipients`, `POST /api/admin/email/broadcast`, `GET /api/admin/emails`, `GET /api/admin/email/expiring?days=N`, `POST /api/admin/email/send-expiry-reminders?days=N`, and `DELETE /api/admin/enrollments/:id?course=` (existing GET/PATCH on the same path now also accept `?course=intro|english`). `GET /api/admin/courses` now returns `totalActiveEnrollments` and per-tier counts.
- **Email Notifications System (Phase 4 P3):** Bilingual EN+AR templated emails with DB logging via the `emails_sent` table (id, user_id FK→users SET NULL, to_email, subject, body, email_type, status sent|failed, error, related_id, sent_at + indexes on user_id, email_type, sent_at). User locale resolved from `users.preferred_language` (varchar(8), default 'en'). Template factories in `artifacts/api-server/src/lib/email.ts` cover 9 types: `email_verification`, `password_reset`, `welcome`, `enrollment_confirmation`, `course_access`, `expiry_reminder`, `admin_new_signup`, `admin_new_enrollment`, `broadcast`. Triggers (fire-and-forget, never block primary action) wired in `artifacts/api-server/src/lib/email-triggers.ts`: signup → welcome + admin_new_signup to all admins; intro/english redeem → course_access + admin_new_enrollment; admin grant or PATCH→active → enrollment_confirmation. Expiry reminders are admin-triggered (no cron yet) and dedupe via `emails_sent.related_id` 30-day lookback. Broadcast endpoint reused for send-expiry-reminders rate limiting (5/hr prod, 1000/hr dev, per-admin).
- **Course Certificates System (Phase 4 P4):** Bilingual EN+AR PDF certificates issued by admins for course completion (intro + english tiers). Schema: `certificates` table (id uuid pk, user_id FK→users CASCADE, course varchar(16) — `intro`|`english`, tier varchar(32), enrollment_id uuid nullable polymorphic — no FK, certificate_id text UNIQUE in format `EDULEXO-YYYY-NNNNNN`, completion_date date, issued_at timestamptz, issued_by FK→users SET NULL, revoked_at timestamptz, revoke_reason text). Indexes on user_id and issued_at desc, plus a partial UNIQUE on (user_id, course, tier) WHERE revoked_at IS NULL so a learner can only hold one active cert per (course, tier) but may receive a new one after a revocation. Sequential ID via the postgres `certificates_seq` sequence. PDF rendered server-side with `pdfkit` (A4 landscape, navy/violet/royal-blue accents, gold inner border, "Abu Omar — Founder & Lead Instructor" signature line, EN + AR completion lines, certificate ID at bottom-right) using a single Cairo TTF (`artifacts/api-server/assets/fonts/Cairo-Regular.ttf`) registered with OpenType `rlig`/`calt`/`liga` for proper Arabic shaping; English/Arabic course and tier labels are passed in as separate strings to avoid bidi mixing, and the Arabic completion date is rendered with `Intl` `ar-EG`. `pdfkit` and `fontkit` are added to the api-server esbuild externals. Endpoints (in `artifacts/api-server/src/routes/certificates.ts`): `POST /api/admin/certificates/issue` (zod-validated, allocates next ID via `nextval('certificates_seq')`, returns 409 if an active cert already exists for user/course/tier), `GET /api/admin/certificates?search=&course=&status=` (joined with users, max 200), `POST /api/admin/certificates/:id/revoke {reason?}`, `GET /api/certificates/mine` (auth, non-revoked only), and `GET /api/certificates/:id/pdf` (authorization is checked **before** existence/revocation so non-admins/non-owners get a uniform 404; admins/owners get 200 active or 410 revoked). Issue route also handles concurrent races by mapping Postgres unique-violation (23505) on the partial-unique index back to a deterministic 409, and `tier` is lowercased server-side so casing variants can't bypass the dedupe. Client UI in `oxford-flashcards`: a `MyCertificates` component on `/dashboard` (cards with Download PDF), and a new admin "Certificates" sidebar tab with searchable table, per-row Download/Revoke, and an "Issue certificate" modal that picks a student, course (intro/english), tier, and completion date. ~28 new EN+AR i18n keys under `certs.*` and `admin.certs.*`.

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
- **recharts**: Charting library used for admin Overview line charts.