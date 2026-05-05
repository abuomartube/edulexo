# Abu Omar EduLexo Project

## Overview
The Abu Omar EduLexo project is an AI-powered, bilingual (English + Arabic) learning platform offering three specialized courses: LEXO Intro (A2→B1, IELTS-prep entry course), LEXO for English (Oxford 3000, A1→C1), and LEXO for IELTS (full mock prep). Its primary purpose is to provide a comprehensive educational experience through features like Oxford 3000 flashcards, CEFR-aligned packages, structured IELTS courses, and full localization. The project envisions becoming a leading AI-powered educational platform, expanding its course offerings and market reach within the ed-tech sector. The platform landing page (`/`) presents all three courses as side-by-side cards in a 3-column grid, ordered Intro → English → IELTS.

## User Preferences
- Brand strings should remain in English, even when the rest of the page is in Arabic.
- The Arabic font should be Cairo.
- Email/phone inputs should be forced `dir="ltr"` even in Arabic mode.
- Internal package naming convention (A, B, C) is locked and must be maintained in database schemas, access codes, and lesson tags.
- The `orval` config for the IELTS API client should explicitly write to `lib/ielts-api-client-react` and `lib/ielts-api-zod` and must _never_ be repointed to `lib/api-client-react/`.

## System Architecture
The project is a pnpm workspace monorepo built with TypeScript and Node.js 24, designed for scalability and maintainability.

**UI/UX Decisions:**
- **Branding:** Consistent use of `src/assets/edulexo-logo.png` and a brand gradient (`from-indigo-700 via-purple-600 to-blue-600`).
- **Color Scheme:** Utilizes a distinct palette of deep navy/indigo (`#1E2155`), vibrant violet (`#6B2FE6`), and royal blue (`#4F7FFF`).
- **Typography:** Dynamic application of Cairo font for all Arabic text.
- **Layout:** Standardized design for landing pages, product cards, feature grids, and course detail pages.
- **Bilingual UI:** Dynamic language switching with `localStorage` persistence, controlled via an EN/AR pill toggle in the header.

**Technical Implementations:**
- **API Framework:** Express 5.
- **Database:** PostgreSQL with Drizzle ORM.
- **Validation:** Zod (`zod/v4`) integrated with `drizzle-zod`.
- **API Codegen:** Orval generates client and Zod schemas from OpenAPI specifications.
- **Build System:** esbuild for CJS bundle creation.
- **Routing:** `wouter` for client-side navigation.
- **Internationalization:** Custom i18n system supporting compile-time type checking for bilingual content.
- **Authentication:** `bcryptjs` (rounds=12) for password hashing, SHA-256 for password reset tokens, `express-session` with `connect-pg-simple` for session management. Rate limiting with `express-rate-limit`. Frontend authentication uses `QueryClientProvider`, `AuthProvider`, `useAuth()` hook, and `ProtectedRoute`.
- **Flashcard System:** Processes Oxford 3000 CEFR PDFs, supports various CEFR Levels and Word Families. Audio generated via OpenAI TTS, cached server-side, and prefetched client-side.
- **IELTS Tiering:** Supports "Complete" (A2→C1) and "Advance" (B1→C1) tiers at `/lexo-ielts/?tier=<tier>`, with tier persisted in `localStorage`. The `Intro` tier voice/VAD conversation feature is merged into the unified IELTS app.
- **Free Conversation (Churchill):** VAD-based hands-free voice mode using `@ricky0123/vad-web` + Whisper STT at `/lexo-ielts/free-conversation`. Backend uses OpenAI gpt-4o.
- **Unified App URLs:** English course at `/lexo-english/`. All in-app links and central SSO redirector use unified paths.
- **Platform Integration (English):** English app (`/lexo-english/`) is designed for embedding, with authentication and subscription handled by the main platform SSO.
- **Package Details Pages (English):** Full details pages at `/lexo-english/package/a1-b1`, `/package/b1-c1`, `/package/full` — accessible to both authenticated and unauthenticated users. Each page shows: hero header with CEFR level badge, "What you will learn" (5 items), "Skills included" (Churchill Speaking, Orwell Writing, Attenborough Listening, Hemingway Reading, Video Lessons), "What makes this course special" (3 cards), "Who this course is for", and a "Join this course" CTA linking to platform enrollment. Glassmorphism design, fully bilingual EN+AR. Linked from Landing page package cards and Dashboard TierCard "View details" links.
- **Shopping Cart:** localStorage-backed cart system with React Context (`CartProvider`/`useCart`). Cart icon with badge in header (desktop + mobile drawer). "Add to Cart" buttons on English LandingPage package cards and course detail pages (English + IELTS). Cart page at `/cart` with item list, prices (fetched from checkout preview API), remove buttons, subtotal/total, single "Proceed to Checkout" button (no per-item checkout). Empty state with "Continue shopping" link. Full bilingual EN+AR support with RTL layout. Cart items stored as `"course:tier"` strings supporting `intro`, `english`, and `ielts` courses.
- **Discount Code System:** Full admin-managed discount code system with DB tables `discount_codes` (with `first_purchase_only`, `new_users_only` fields) and `discount_code_usages`. Payments table extended with `discount_code_id` and `original_amount_minor` columns to track discounts on payments. Admin "Discount Codes" tab in AdminDashboard for creating/editing/deleting codes with fields: code name, type (percentage/fixed), value, start/end dates, never-expires option, scope (general/specific course+tier), total usage limit, per-user limit, one-time-per-user toggle, first-purchase-only toggle, new-users-only toggle, active/inactive status. Cart page integrates discount validation via `POST /api/discount/validate` with detailed error messages (expired, already used, not applicable, usage limit reached, first purchase only, new users only). Price summary shows subtotal, discount line with code name, and final total. **Server-side discount enforcement:** Discount codes are re-validated at checkout time in `loadStartContext()` — the discounted price is computed server-side and sent to payment providers (Tabby/Tamara/bank transfer). Discount usage is recorded atomically inside `activateEnrollmentForPayment()` only on successful payment capture (not via a standalone client-callable endpoint). Discount code passed from Cart → Checkout URL (`?discount=CODE`) → payment API body (`discountCode` field). Admin CRUD via `/api/admin/discount-codes`. Checkout page includes "Back to Cart" button preserving cart items and applied discount. Full bilingual EN+AR support.
- **Abandoned Cart Reminders:** Detects when users leave items in cart without completing checkout. Tracks `lastActivityAt` timestamp in localStorage. In-app banner (`AbandonedCartBanner`) shows after 30min (soft, amber) or 24h (strong, purple gradient) of inactivity with "Complete Checkout" CTA. Banner is dismissable and won't reappear until new cart activity. For logged-in users, `useAbandonedCartSync` hook periodically syncs cart state to backend via `POST /api/cart/sync`, which sends a bilingual abandoned cart email (via Resend) with 24h cooldown dedup (only counts successful sends, in-flight guard prevents concurrent duplicates). Email type `abandoned_cart` added to `EMAIL_TYPE_VALUES`. Timer-based reevaluation every 60s ensures banner and sync trigger even without user interaction. Full EN+AR support for banner text and email templates.
- **Dashboard Upsell Cards:** Displays three IELTS tier cards and three English tier cards regardless of enrollment, with launch/renew controls or "Enroll for 150 SAR" CTA linking to checkout.
- **Cross-product SSO:** Secure single sign-on using HMAC-signed, single-use launch URLs.
- **Email Verification:** Dedicated tables, API endpoints, rate limiting, and UI banner.
- **Admin Dashboard (Redesigned):** Professional sidebar-based layout via `AdminLayout` component with collapsible sidebar, mobile overlay, topbar with breadcrumbs, and EduLexo branding. 17 tabs: Overview (enhanced with bar/line/pie charts via recharts), Students, Enrollments, FAQs, Courses, Landing Pages, English Cards, IELTS Cards, Communication, Access Codes, Discount Codes, Certificates, Payments, Reports, Live Sessions, Support, and Roles & Permissions. Shared UI primitives in `AdminPrimitives.tsx` (StatCard, Th, Td, Field, LoadingPanel, ErrorPanel, RadioPill). New backend routes in `admin-content.ts` for landing pages and course cards CRUD. DB schemas: `landing_pages` and `course_cards` tables.
- **Email Notifications System:** Bilingual EN+AR templated emails with database logging, supporting 12 types of notifications (including abandoned_cart).
- **Payments (Tabby + Tamara):** Integration with BNPL providers for Intro and English courses (150 SAR flat fee). Features `payments` table, idempotent enrollment activation, secure callbacks, client-side checkout. Admin dashboard includes "Payments" tab.
- **Chat AI Notes (Phase 3):** Students can save AI results (Correct/Translate/Explain) to `chat_ai_notes` table via "Save to My Notes" button. Dedicated `/chat/notes` page with filtering and delete functionality.
- **Private AI Feedback (Phase 4):** Students receive private, per-room AI feedback reports based on their messages. Features include an AI Feedback On/Off toggle, "My Feedback" button, `POST /api/chat/my-feedback` endpoint using GPT-4o-mini for structured feedback, and a glassmorphism feedback modal.
- **Payments (Bank Transfer / Manual Verification):** Allows bank transfers (150 SAR). Students upload proof to GCS; admins verify/reject, triggering emails and audit logs. Includes IDOR-safe upload binding and hardening.
- **Course Certificates System:** Server-side generation of bilingual EN+AR PDF certificates, managed by admins. `certificates` table tracks issuance/revocation.
- **Subscription Expiry System:** 1-year (365-day) subscription window for paid activations, renewals, and access-code redemptions for IELTS and English courses. Enforced at API level, dashboard shows status and renewal options.
- **MENTOR Integration (Phase 1-6):** AI-powered English practice tools integrated into LEXO for English at `/lexo-english/tools`. Includes:
    - **Tool Choice Hub:** 7 tools, Lessons page with Vimeo player + progress tracking, CEFR level-grouped layout with package-exclusive level gating.
    - **IELTS→General English Conversion:** CEFR package labels (A1–B1, B1+–C1, Full Package), package-exclusive access model.
    - **Churchill Speaking:** AI conversation tool at `/lexo-english/tools/speaking` with setup flow (mode→level→type→topic→chat→feedback). Features text/voice modes, CEFR level selection, Free/Topic-based conversation, SSE-streamed chat with GPT-4o-mini, and post-conversation feedback.
    - **Orwell Writing:** AI paragraph writing practice at `/lexo-english/tools/writing` with setup flow (level→task→write→feedback). Features CEFR level selection, 20 writing tasks per level, word count guidance, and comprehensive AI feedback.
    - **Attenborough Listening:** AI listening comprehension practice at `/lexo-english/tools/listening` with setup flow (level→topic→exercise→results). Features 20 topics per level, AI-generated scripts, 5 questions, vocabulary highlights, score display.
    - **Hemingway Reading:** AI reading comprehension practice at `/lexo-english/tools/reading` with setup flow (level→topic→exercise→results). Features CEFR level selection, 20 reading topics per level, AI-generated passages, 6 comprehension questions (MCQ, T/F, Short Answer, Matching), score display, and vocabulary section.

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
- **@vimeo/player**: Vimeo Player SDK for video playback tracking.