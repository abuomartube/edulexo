# Abu Omar EduLexo Project

## Overview

The Abu Omar EduLexo project is an AI-powered, bilingual (English + Arabic) learning platform offering specialized courses: LEXO for English and LEXO for IELTS. It aims to provide a comprehensive educational experience through features like Oxford 3000 flashcards, CEFR-aligned packages, structured IELTS courses, and full localization. The project's vision is to become a leading AI-powered educational platform, expanding its course offerings and market reach within the educational technology sector.

## User Preferences

- Brand strings should remain in English, even when the rest of the page is in Arabic.
- The Arabic font should be Cairo.
- Email/phone inputs should be forced `dir="ltr"` even in Arabic mode.
- Internal package naming convention (A, B, C) is locked and must be maintained in database schemas, access codes, and lesson tags.
- The `orval` config for the IELTS API client should explicitly write to `lib/ielts-api-client-react` and `lib/ielts-api-zod` and must *never* be repointed to `lib/api-client-react/`.

## System Architecture

The project is a pnpm workspace monorepo built with TypeScript and Node.js 24.

**UI/UX Decisions:**
- **Branding:** Uses `src/assets/edulexo-logo.png` with a brand gradient (`from-indigo-700 via-purple-600 to-blue-600`).
- **Color Scheme:** Deep navy/indigo (`#1E2155`), vibrant violet (`#6B2FE6`), and royal blue (`#4F7FFF`).
- **Typography:** Cairo font for Arabic text, dynamically applied.
- **Layout:** Standardized layouts for landing pages, product cards, feature grids, and specific designs for English and IELTS course detail pages.
- **Bilingual UI:** Dynamic language switching with `localStorage` persistence, controlled by an EN/AR pill toggle in the header.

**Technical Implementations:**
- **API Framework:** Express 5.
- **Database:** PostgreSQL with Drizzle ORM.
- **Validation:** Zod (`zod/v4`) integrated with `drizzle-zod`.
- **API Codegen:** Orval generates client and Zod schemas from OpenAPI specifications.
- **Build System:** esbuild for CJS bundles.
- **Routing:** `wouter` for client-side navigation.
- **Internationalization:** Custom i18n system with compile-time type checking.
- **Authentication:** `bcryptjs` (rounds=12) for password hashing, SHA-256 for password reset tokens. `express-session` with `connect-pg-simple` for session management. Rate limiting via `express-rate-limit`. Frontend uses `QueryClientProvider` and `AuthProvider` with a `useAuth()` hook and `ProtectedRoute`.
- **Flashcard System:** Parses Oxford 3000 CEFR PDFs, supports CEFR Levels (A1-B2) and Word Families (75 categories). Audio generated via OpenAI TTS, cached server-side, prefetched client-side.
- **IELTS Tiering:** Supports "Complete" (A2→C1) and "Advance" (B1→C1) tiers, controlled by URL parameters and `localStorage`.
- **Cross-product SSO:** Seamless navigation between platform, IELTS, and Intro apps using HMAC-signed, single-use launch URLs.
- **Email Verification:** Features a dedicated table, API endpoints for sending/verifying, rate limiting, and a UI banner for user interaction.
- **Admin Content Management:** CRUD operations for FAQs and courses (intro, English, IELTS) with bilingual fields and publishing status. Admin dashboard includes Overview (stats, charts, recent sign-ups), Students, Enrollments, FAQ, Courses, Communication (broadcast email, expiry reminders, email log), and Access Codes sections.
- **Email Notifications System:** Bilingual EN+AR templated emails with database logging (`emails_sent` table). User locale from `users.preferred_language`. Covers 9 types (verification, password reset, welcome, enrollment confirmation, course access, expiry reminder, admin notifications, broadcast). Triggers are fire-and-forget, activated on signup, enrollment, and admin actions.
- **Payments (Tabby + Tamara):** BNPL checkout for intro and English courses at a flat 150 SAR per tier. Mode-aware via environment variables (`TABBY_MODE`, `TAMARA_MODE`). Dedicated `payments` table stores transaction details. Enrollment activation is idempotent and handles concurrent races. Secure callback mechanisms with provider re-fetch for webhooks. Client-side checkout page handles order summary, provider selection, and redirects. Admin dashboard includes a "Payments" tab for monitoring and filtering transactions.
- **Course Certificates System:** Bilingual EN+AR PDF certificates issued by admins for course completion (intro + English tiers). `certificates` table tracks issuance, revocation, and ensures uniqueness per user/course/tier. Sequential certificate IDs are generated. PDFs rendered server-side using `pdfkit` with Cairo font for proper Arabic shaping. Endpoints for issuing, revoking, and retrieving certificates. Client UI includes `MyCertificates` on the dashboard and an admin "Certificates" tab for management.

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