# Data Integration Audit — oxford-flashcards

Scope: the four surfaces that were paused mid-investigation before the
new English Dashboard work — `Dashboard.tsx`, the `MyCourses`
component, `EnglishCourseDetail.tsx`, and `Header.tsx`. Within those
files this report covers every place that displays student-facing
numbers (XP, streak, CEFR level, progress, certificates, ranks,
expiries, counts). Other pages in the artifact (LexoHub, IELTS course
landing, admin, etc.) are out of scope here — LexoHub was already
cleared in the earlier read-only inspection.

Each item is labelled:

- **real** — value comes from a live API call (`platform-api.ts`)
- **local-real** — value comes from real client-side state (e.g. cart
  context backed by `localStorage`), not the server
- **placeholder** — intentional non-personal content (course metadata,
  marketing copy, decorative figures); not the current student's data
- **mock** — fake student-facing data that pretends to be real and must
  be replaced before shipping

---

## `src/pages/Dashboard.tsx`

| Where | What is shown | Source | Label |
| --- | --- | --- | --- |
| `SummarySection` → "Active courses" card (`summary.activeCount` / `summary.totalOwned`) | "{active} / {total}" subscriptions | Derived from `fetchMyEnrollments` + `fetchMyEnglishEnrollments` | **real** |
| `SummarySection` → "Certificates" card (`summary.certCount`) | Number of certificates | `fetchMyCertificates` | **real** |
| `SummarySection` → "Next expiry" card (`summary.minDays`) | Days until soonest expiry / ∞ / "no active" | Derived from API `expiresAt` of active enrollments | **real** |
| `ProfileCard` → `memberSince` | Month + year | `user.createdAt` from `useAuth` | **real** |
| `ProfileCard` → email / phone / role / bio | Profile fields | `useAuth` user object (live `/auth/me`) | **real** |

No XP, streak, CEFR level, or rank widgets exist on Dashboard.

---

## `src/components/MyCourses.tsx`

This is the component embedded in Dashboard (there is no `pages/MyCourses.tsx`).

| Where | What is shown | Source | Label |
| --- | --- | --- | --- |
| IELTS / English tier cards → enrollment date | "Enrolled on …" | `e.grantedAt` from `fetchMyEnrollments` / `fetchMyEnglishEnrollments` | **real** |
| Tier cards → expiry date | "Expires on …" | `e.expiresAt` (API) | **real** |
| Tier cards → days remaining (`daysUntil`) | "{n} days remaining" / "1 day remaining" | Derived from `e.expiresAt` | **real** |
| Tier cards → `StatusBadge` (active / expired) | active/expired pill | `e.isActive` (API) | **real** |
| Tier metadata → CEFR ranges ("A2 → B1", "B1 → C1", "A1 → C1", etc.) | Tier-level CEFR label | Hardcoded in `IELTS_TIER_META` / `ENGLISH_TIER_META` | **placeholder** (course metadata, not student level) |
| Upsell cards → price label / access note | Marketing copy | Translation strings | **placeholder** |

No XP, streak, per-student CEFR level, or rank.

---

## `src/pages/EnglishCourseDetail.tsx`

| Where | What is shown | Source | Label |
| --- | --- | --- | --- |
| Hero CTA → enrolled / not enrolled state | Show "Launch course" only if active enrollment exists | `fetchMyEnglishEnrollments` | **real** |
| Hero pill → `meta.levelKey` ("Foundations / Advanced / Complete") | Tier level label | Hardcoded `TIER_META` | **placeholder** |
| Hero subtitle → "CEFR {range}" (e.g. "A1 → B1") | Tier CEFR range | Hardcoded `TIER_META` | **placeholder** (tier metadata, not student level) |
| Hero preview card → "2:14" duration | Static text | Hardcoded literal | **placeholder** (decorative — preview video isn't wired up yet) |
| Goals / Showcase / FAQ sections | Static content | Translation strings | **placeholder** |
| Testimonials (`TESTIMONIALS` array) | 3 fake students with fake names, "Reached C1"-style level claims, and 5/5 star ratings | Hardcoded translation keys | **placeholder** (marketing content; clearly not the current user) |
| Reviews (`loadReviews` / `submitReview`) | User-submitted name + rating + comment | `localStorage` per browser | **placeholder** (intentional — local-only until a backend reviews API exists) |
| Bottom CTA → price | Price string | Translation string | **placeholder** |

No widget on this page claims to display the current student's XP,
streak, CEFR level, or progress.

---

## `src/components/Header.tsx`

| Where | What is shown | Source | Label |
| --- | --- | --- | --- |
| Avatar initials | First letter of each name part | `user.name` from `useAuth` | **real** |
| Account menu → name + email | User profile | `useAuth` | **real** |
| Cart badge count | Number of items in cart | `useCart` (cart context backed by `localStorage`) | **local-real** |
| Admin link visibility | Only when `isAdmin` | `useAuth` | **real** |

No XP, streak, CEFR level, certificates, or rank in the header.

---

## Summary

- **Mock items found: 0.** Nothing in these four areas displays
  fabricated student-progress data dressed up as real data.
- All student-facing numbers (active courses, certificates, expiry
  countdown, enrollment dates, member-since, cart count) are wired to
  live API endpoints in `platform-api.ts`.
- The only items that are not from a backend are:
  1. Tier-level CEFR ranges in `MyCourses` and `EnglishCourseDetail`
     — these describe the *course tier*, not the student, so they are
     correctly **placeholder**.
  2. The `TESTIMONIALS` array on `EnglishCourseDetail` — clearly
     marketing testimonials with fictional names, **placeholder**.
  3. The preview-video "2:14" label and reviews-in-`localStorage`
     feature on `EnglishCourseDetail` — both intentional placeholders
     for features without a backend yet.

No code changes were required: the new English Dashboard work can
proceed knowing these pages do not show any mocked XP / streak /
level / progress data that needs to be torn out first.
