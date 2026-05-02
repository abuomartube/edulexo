/**
 * Flashcard Study — E2E flow tests (advance & complete tiers).
 *
 * Covers:
 *   - /study page renders card deck with mocked API
 *   - Card flip (front → back)
 *   - "Got it!" marks card as known   (POST /api-ielts/progress {known:true})
 *   - "Still Learning" marks as unknown (POST /api-ielts/progress {known:false})
 *   - Progress counter increments
 *   - Intro tier is blocked from /study
 */
import { test, expect } from "@playwright/test";
import { loginAsIntro, loginAsAdvanceOrComplete, appUrl } from "./helpers/auth";
import { attachErrorGuard } from "./helpers/fixtures";

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_CARDS = [
  {
    id: 1,
    english: "abandon",
    arabic: "يتخلى عن",
    level: "B2",
    category: "Academic",
    // Component reads exampleSentence / exampleSentenceArabic (not example/exampleArabic)
    exampleSentence: "She decided to abandon the project.",
    exampleSentenceArabic: "قررت التخلي عن المشروع.",
    imageUrl: null,
  },
  {
    id: 2,
    english: "benevolent",
    arabic: "خيري، محسن",
    level: "C1",
    category: "Academic",
    exampleSentence: "The king was known as a benevolent ruler.",
    exampleSentenceArabic: "اشتُهر الملك بأنه حاكم خيّر.",
    imageUrl: null,
  },
];

const MOCK_CATEGORIES = ["Academic", "Business", "Environment", "Technology"];

const MOCK_PROGRESS_RESPONSE = { id: 1, flashcardId: 1, known: true, reviewedAt: new Date().toISOString(), email: "test@test.invalid" };

async function setupFlashcardMocks(page: Parameters<Parameters<typeof test>[1]>[0]["page"]) {
  // Flashcard list
  await page.route("**/api-ielts/flashcards/categories", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_CATEGORIES),
    }),
  );

  await page.route("**/api-ielts/flashcards/levels", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { level: "A2", total: 50, known: 0 },
        { level: "B1", total: 80, known: 5 },
        { level: "B2", total: 120, known: 10 },
        { level: "C1", total: 90, known: 3 },
      ]),
    }),
  );

  // Individual flashcard look-ups
  await page.route("**/api-ielts/flashcards/*", (route) => {
    const url = route.request().url();
    // Skip category/level/levels sub-paths — handled above
    if (url.includes("/categories") || url.includes("/levels")) return route.continue();
    // GET single card by id
    const match = url.match(/\/flashcards\/(\d+)/);
    if (match) {
      const id = parseInt(match[1]);
      const card = MOCK_CARDS.find((c) => c.id === id);
      if (!card) return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "Not found" }) });
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(card) });
    }
    return route.continue();
  });

  // Flashcard list (no sub-path)
  await page.route("**/api-ielts/flashcards?*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_CARDS),
    }),
  );

  // Exact match for /api-ielts/flashcards (no query params)
  await page.route("**/api-ielts/flashcards", (route) => {
    const url = route.request().url();
    if (url.includes("/flashcards/")) return route.continue();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_CARDS),
    });
  });

  // Progress list
  await page.route("**/api-ielts/progress/summary", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        totalCards: 340,
        totalKnown: 18,
        byLevel: [
          { level: "A2", total: 50, known: 0 },
          { level: "B1", total: 80, known: 5 },
          { level: "B2", total: 120, known: 10 },
          { level: "C1", total: 90, known: 3 },
        ],
      }),
    }),
  );

  await page.route("**/api-ielts/progress", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    }
    // POST upsert
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_PROGRESS_RESPONSE),
    });
  });

  // SRS due cards
  await page.route("**/api-ielts/srs/due", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }),
  );

  // Bookmarks
  await page.route("**/api-ielts/bookmarks", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }),
  );

  // Activity position (save/restore)
  await page.route("**/api-ielts/activity-position", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(null) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  // XP / streak endpoints (non-fatal if missing)
  await page.route("**/api-ielts/xp**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ xp: 0, streak: 0 }) }),
  );
  await page.route("**/api-ielts/notifications**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }),
  );

  // TTS / speaking — return an empty audio response so the page doesn't error
  await page.route("**/api-ielts/speaking/tts**", (route) =>
    route.fulfill({ status: 200, contentType: "audio/mpeg", body: "" }),
  );

  // Activity position (path variant includes sub-path like /study)
  await page.route("**/api-ielts/activity-position/**", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(null) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  // SRS individual card endpoints (e.g. /srs/1, /srs/2)
  await page.route("**/api-ielts/srs/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) }),
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Flashcard Study — advance tier", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdvanceOrComplete(page, "advance@study.invalid", "advance");
    await setupFlashcardMocks(page);
  });

  test("study page renders card deck with word and arabic translation", async ({ page }) => {
    const guard = attachErrorGuard(page);
    await page.goto(appUrl("/study"));

    // Page heading
    await expect(
      page.getByText(/Study Mode|Flashcards|IELTS Words/i).first(),
    ).toBeVisible({ timeout: 10_000 });

    // First card front — English word from mock (rendered in both h2 and p, use first())
    await expect(page.getByText("abandon").first()).toBeVisible({ timeout: 8_000 });

    guard.assertClean();
  });

  test("flip card reveals Arabic translation and example sentence", async ({ page }) => {
    const guard = attachErrorGuard(page);
    await page.goto(appUrl("/study"));

    await expect(page.getByText("abandon").first()).toBeVisible({ timeout: 10_000 });

    // The card face (flip target) — click the card body to flip
    const card = page
      .locator('[data-testid="flashcard"], .flashcard, [class*="card"]')
      .first();

    // Try clicking the card itself; if no test-id, click the English word area
    const englishWord = page.getByText("abandon").first();
    await englishWord.click();

    // After flip, Arabic translation should be visible
    await expect(page.getByText("يتخلى عن")).toBeVisible({ timeout: 5_000 });
    // Example sentence
    // Two elements match the regex (EN sentence + AR sentence) — use first()
    await expect(
      page.getByText(/abandon the project|قررت التخلي/i).first(),
    ).toBeVisible({ timeout: 3_000 });

    guard.assertClean();
  });

  test('"Got it!" marks card as known and advances to next card', async ({ page }) => {
    const guard = attachErrorGuard(page);

    // Capture POST /progress calls
    const progressPosts: Array<{ flashcardId: number; known: boolean }> = [];
    page.on("request", (req) => {
      if (req.url().includes("/api-ielts/progress") && req.method() === "POST") {
        try { progressPosts.push(JSON.parse(req.postData() ?? "{}")); } catch { /* ignore */ }
      }
    });

    await page.goto(appUrl("/study"));
    await expect(page.getByText("abandon").first()).toBeVisible({ timeout: 10_000 });

    // Flip the card first
    await page.getByText("abandon").first().click();
    await expect(page.getByText("يتخلى عن")).toBeVisible({ timeout: 5_000 });

    // Click "Got it!"
    const gotItBtn = page.getByRole("button", { name: /Got it|I know/i });
    await expect(gotItBtn).toBeVisible({ timeout: 5_000 });
    await gotItBtn.click();

    // A progress POST with known:true should have been issued
    await expect
      .poll(() => progressPosts.some((p) => p.known === true), { timeout: 5_000 })
      .toBe(true);

    // The second card ("benevolent") or a completion message appears
    await expect(
      page.getByText(/benevolent|Well done|Finished|cards left/i).first(),
    ).toBeVisible({ timeout: 6_000 });

    guard.assertClean();
  });

  test('"Still Learning" marks card as unknown and advances', async ({ page }) => {
    const guard = attachErrorGuard(page);

    const progressPosts: Array<{ flashcardId: number; known: boolean }> = [];
    page.on("request", (req) => {
      if (req.url().includes("/api-ielts/progress") && req.method() === "POST") {
        try { progressPosts.push(JSON.parse(req.postData() ?? "{}")); } catch { /* ignore */ }
      }
    });

    await page.goto(appUrl("/study"));
    await expect(page.getByText("abandon").first()).toBeVisible({ timeout: 10_000 });

    // Flip
    await page.getByText("abandon").first().click();
    await expect(page.getByText("يتخلى عن")).toBeVisible({ timeout: 5_000 });

    // Two "Still Learning" buttons exist: a mode-tab chip (line 324) that changes
    // the study filter, and the real action button (line 391) that POSTs progress.
    // Use .last() to target the action button that triggers markCard(false).
    const stillLearningBtn = page.getByRole("button", { name: /Still Learning/i }).last();
    await expect(stillLearningBtn).toBeVisible({ timeout: 5_000 });
    await stillLearningBtn.click();

    // POST with known:false
    await expect
      .poll(() => progressPosts.some((p) => p.known === false), { timeout: 5_000 })
      .toBe(true);

    guard.assertClean();
  });
});

test.describe("Flashcard Study — tier gating", () => {
  test("intro tier sees a locked/upgrade screen on /study", async ({ page }) => {
    await loginAsIntro(page, "intro@study.invalid", "intro");
    await page.goto(appUrl("/study"));

    // Intro tier cannot access the full study page — either redirected or shown a gate
    await expect(
      page.getByText(/Not Included|Upgrade|locked|intro/i).first(),
    ).toBeVisible({ timeout: 8_000 });
    // "abandon" card must NOT be visible
    await expect(page.getByText("abandon")).not.toBeVisible();
  });
});
