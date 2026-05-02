/**
 * Listening (Attenborough AI) — E2E flow tests.
 *
 * Covers the full intro-tier journey:
 *   section-list → test-list → player → answer MCQ → submit → result
 *
 * All API calls are intercepted; no live backend or audio playback required.
 */
import { test, expect } from "@playwright/test";
import { loginAsIntro, loginAsAdvanceOrComplete, appUrl } from "./helpers/auth";
import { attachErrorGuard } from "./helpers/fixtures";

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_SECTIONS = [
  { id: 1, title: "Section 1 — Daily Life", description: "Conversations about everyday activities." },
  { id: 2, title: "Section 2 — Education", description: "Academic and educational contexts." },
];

const MOCK_TESTS_BY_SECTION: Record<number, object[]> = {
  1: [
    {
      id: "t1",
      sectionId: 1,
      title: "A Morning Routine",
      description: "A short conversation about daily habits.",
      questionCount: 2,
      completed: false,
      result: null,
    },
  ],
  2: [
    {
      id: "t2",
      sectionId: 2,
      title: "Campus Tour",
      description: "A university tour conversation.",
      questionCount: 1,
      completed: false,
      result: null,
    },
  ],
};

const ALL_TESTS = [...MOCK_TESTS_BY_SECTION[1], ...MOCK_TESTS_BY_SECTION[2]];

const MOCK_TEST_T1 = {
  test: {
    id: "t1",
    sectionId: 1,
    title: "A Morning Routine",
    description: "Listen carefully and answer the questions below.",
    questions: [
      {
        id: "q1",
        type: "mcq",
        prompt: "What time does the man wake up?",
        options: ["6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM"],
      },
      {
        id: "q2",
        type: "mcq",
        prompt: "What does the woman drink in the morning?",
        options: ["Coffee", "Tea", "Juice", "Milk"],
      },
    ],
  },
};

const MOCK_SUBMIT_RESULT = {
  attempt: {
    id: 1,
    answers: { q1: 1, q2: 0 },
    score: 2,
    total: 2,
    percent: 100,
    results: [
      {
        id: "q1",
        type: "mcq",
        prompt: "What time does the man wake up?",
        studentAnswer: 1,
        correctAnswer: 1,
        isCorrect: true,
        points: 1,
        maxPoints: 1,
      },
      {
        id: "q2",
        type: "mcq",
        prompt: "What does the woman drink in the morning?",
        studentAnswer: 0,
        correctAnswer: 0,
        isCorrect: true,
        points: 1,
        maxPoints: 1,
      },
    ],
    analysis: "Excellent work! You answered both questions correctly.",
  },
};

async function setupListeningMocks(page: Parameters<Parameters<typeof test>[1]>[0]["page"]) {
  // Section + full test list
  await page.route("**/api-ielts/listening/tests", (route) => {
    const url = route.request().url();
    if (route.request().method() === "GET" && !url.match(/\/tests\/[^/]+/)) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ sections: MOCK_SECTIONS, tests: ALL_TESTS }),
      });
    }
    return route.continue();
  });

  // Single test detail (but NOT audio or submit sub-paths)
  await page.route("**/api-ielts/listening/tests/t1", (route) => {
    const url = route.request().url();
    if (!url.includes("/audio") && !url.includes("/submit")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_TEST_T1),
      });
    }
    return route.continue();
  });

  // Audio endpoint — return empty segments so the player skips playback
  await page.route("**/api-ielts/listening/tests/t1/audio", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ segments: [] }),
    }),
  );

  // Submit endpoint
  await page.route("**/api-ielts/listening/tests/t1/submit", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_SUBMIT_RESULT),
    }),
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Listening — intro tier full flow", () => {
  test("section-list → test-list → player → answer both MCQs → submit → result", async ({
    page,
  }) => {
    const guard = attachErrorGuard(page);
    await loginAsIntro(page, "listening@test.invalid", "intro");
    await setupListeningMocks(page);
    await page.goto(appUrl("/intro-listening"));

    // ── Section list ─────────────────────────────────────────────────────────
    await expect(page.getByText("Attenborough AI")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Section 1 — Daily Life")).toBeVisible();
    await expect(page.getByText("Section 2 — Education")).toBeVisible();

    // ── Drill into Section 1 → test list ────────────────────────────────────
    await page.getByText("Section 1 — Daily Life").click();
    await expect(page.getByText("A Morning Routine")).toBeVisible({ timeout: 6_000 });
    // A back button (icon-only ArrowLeft, class "p-2 rounded-xl") should be present
    await expect(page.locator("button.p-2").first()).toBeVisible();

    // ── Start the test → player ──────────────────────────────────────────────
    await page.getByRole("button", { name: /Start/i }).click();
    await expect(
      page.getByText("A Morning Routine").first(),
    ).toBeVisible({ timeout: 8_000 });

    // Both questions should render
    await expect(page.getByText("What time does the man wake up?")).toBeVisible();
    await expect(page.getByText("What does the woman drink in the morning?")).toBeVisible();

    // Answer options are present
    await expect(page.getByText("6:00 AM")).toBeVisible();
    await expect(page.getByText("Coffee")).toBeVisible();

    // Submit is disabled while questions are unanswered
    const submitBtn = page.getByRole("button", { name: /Submit answers/i });
    await expect(submitBtn).toBeDisabled();

    // Answer Q1: "7:00 AM" (index 1)
    await page.getByText("7:00 AM").click();
    // Progress counter updates: 1 / 2
    await expect(page.getByText(/1\s*\/\s*2/)).toBeVisible();
    await expect(submitBtn).toBeDisabled(); // still 1 unanswered

    // Answer Q2: "Coffee" (index 0)
    await page.getByText("Coffee").click();
    // Progress counter: 2 / 2
    await expect(page.getByText(/2\s*\/\s*2/)).toBeVisible();
    // Submit button is now enabled
    await expect(submitBtn).toBeEnabled();

    // ── Submit → result ──────────────────────────────────────────────────────
    await submitBtn.click();
    // 100% result from mock
    await expect(
      page.getByText(/100%|Perfect|Excellent|2\s*\/\s*2/i).first(),
    ).toBeVisible({ timeout: 10_000 });
    // Analysis text from mock
    await expect(page.getByText(/Excellent work|answered.*correctly/i)).toBeVisible({
      timeout: 5_000,
    });

    guard.assertClean();
  });

  test("advance tier is blocked from Listening and sees upgrade CTA", async ({ page }) => {
    await loginAsAdvanceOrComplete(page, "advance@listening.invalid", "advance");
    await page.goto(appUrl("/intro-listening"));

    await expect(
      page.getByText("Not Included in Your Plan"),
    ).toBeVisible({ timeout: 8_000 });
    await expect(
      page.getByRole("link", { name: /Upgrade Your Plan/i }),
    ).toBeVisible();
  });

  test("complete tier CAN access Listening (all features included)", async ({ page }) => {
    await loginAsAdvanceOrComplete(page, "complete@listening.invalid", "complete");
    await setupListeningMocks(page);
    await page.goto(appUrl("/intro-listening"));

    // Complete tier includes all features — Listening is accessible
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8_000 });
    await expect(
      page.getByText("Attenborough AI"),
    ).toBeVisible({ timeout: 8_000 });
  });
});

test.describe("Listening — additional player interactions", () => {
  test("back button from test-list returns to section list", async ({ page }) => {
    await loginAsIntro(page, "listenback@test.invalid", "intro");
    await setupListeningMocks(page);
    await page.goto(appUrl("/intro-listening"));

    await expect(page.getByText("Section 1 — Daily Life")).toBeVisible({ timeout: 8_000 });
    await page.getByText("Section 1 — Daily Life").click();
    await expect(page.getByText("A Morning Routine")).toBeVisible({ timeout: 5_000 });

    // The back button is icon-only (ArrowLeft, class "p-2 rounded-xl") — target by class
    await page.locator("button.p-2").first().click();
    // Section list is restored
    await expect(page.getByText("Section 1 — Daily Life")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Section 2 — Education")).toBeVisible();
  });
});
