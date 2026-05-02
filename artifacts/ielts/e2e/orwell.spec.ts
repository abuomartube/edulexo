/**
 * Orwell AI (Essay Checker) — E2E flow tests.
 *
 * Covers the full "Free Check" journey for advance/complete tier:
 *   intro screen → select screen → Free Check card → freechoose screen
 *   → freewriting screen → type essay → submit (SSE mocked) → freeresult screen
 *
 * Also covers the structured Task 1 path:
 *   select → Task 1 card → writing screen → type essay → submit → result screen
 *
 * All API calls are intercepted.
 */
import { test, expect, sseOneDelta, sseDone } from "./helpers/fixtures";
import { loginAsAdvanceOrComplete, appUrl } from "./helpers/auth";

// ── Mock response payloads ────────────────────────────────────────────────────

const FREE_CHECK_RESULT = {
  taskType: "Task 2",
  overallBand: 6.5,
  wordCount: 52,
  wordCountWarning: null,
  scores: {
    taskResponse: { band: 7, feedback: "The response addresses the task clearly." },
    coherenceCohesion: { band: 6, feedback: "Ideas are generally well-organised." },
    lexicalResource: { band: 6, feedback: "Adequate range of vocabulary." },
    grammaticalRange: { band: 7, feedback: "Good use of complex structures." },
  },
  grammarErrors: [
    { original: "peoples", correction: "people", explanation: "'People' is already plural." },
  ],
  vocabularyUpgrades: [
    { original: "big", better: "substantial", reason: "More academic and precise." },
  ],
  coherenceIssues: [],
  strengths: ["Clear thesis statement.", "Good use of examples."],
  improvements: ["Develop the conclusion further.", "Vary sentence length more."],
};

const TASK1_RESULT = {
  taskType: "Task 1",
  overallBand: 6.0,
  wordCount: 18,
  wordCountWarning: "Your essay is too short — please write at least 150 words for Task 1.",
  scores: {
    taskResponse: { band: 6, feedback: "Basic coverage of the data." },
    coherenceCohesion: { band: 6, feedback: "Some logical progression." },
    lexicalResource: { band: 6, feedback: "Adequate but limited vocabulary." },
    grammaticalRange: { band: 6, feedback: "Some grammatical errors present." },
  },
  grammarErrors: [],
  vocabularyUpgrades: [],
  coherenceIssues: [],
  strengths: ["Some key features are highlighted."],
  improvements: ["Write a longer response.", "Include an overview paragraph."],
};

/** Build an SSE stream: one delta preview + one done payload */
function makeOrwellSse(result: Record<string, unknown>): string {
  return (
    sseOneDelta("Analysing your writing…\n") +
    `data: ${JSON.stringify({ done: result })}\n\n` +
    "data: [DONE]\n\n"
  );
}

async function setupOrwellMocks(page: Parameters<Parameters<typeof test>[1]>[0]["page"]) {
  // Global progress (called when select screen mounts)
  await page.route("**/api-ielts/orwell/progress", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        task1: { submitted: 0, skipped: 0, submittedIds: [], skippedIds: [] },
        task2: { submitted: 0, skipped: 0, submittedIds: [], skippedIds: [] },
        paragraph: { submitted: 0, skipped: 0, submittedIds: [], skippedIds: [] },
      }),
    }),
  );

  // Next-assignment hint (non-fatal if missing)
  await page.route("**/api-ielts/orwell/next*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ submittedIds: [], skippedIds: [] }),
    }),
  );

  // Submit — SSE stream
  await page.route("**/api-ielts/orwell/submit", (route) => {
    let body: string;
    try {
      const payload = JSON.parse(route.request().postData() ?? "{}") as { category?: string };
      body = payload.category === "freecheck"
        ? makeOrwellSse(FREE_CHECK_RESULT)
        : makeOrwellSse(TASK1_RESULT);
    } catch {
      body = makeOrwellSse(TASK1_RESULT);
    }
    return route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: { "Cache-Control": "no-cache", "X-Accel-Buffering": "no" },
      body,
    });
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Orwell AI — advance tier", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdvanceOrComplete(page, "advance@orwell.invalid", "advance");
    await setupOrwellMocks(page);
  });

  test("intro screen renders Orwell AI branding and start button", async ({ page }) => {
    await page.goto(appUrl("/essay-checker"));

    // "Orwell AI" appears in the nav link and the h1 — target the heading
    await expect(
      page.getByRole("heading", { name: "Orwell AI" }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Structured IELTS Writing Assignments")).toBeVisible();
    // The Arabic start button
    await expect(page.getByText(/ابدأ التدريب/)).toBeVisible();
    // Writing History link
    await expect(page.getByText("📚 Writing History")).toBeVisible();

  });

  test("Free Check full flow: intro → select → Free Check → freewriting → submit → result", async ({
    page,
  }) => {
    await page.goto(appUrl("/essay-checker"));

    // ── Intro screen: click start ────────────────────────────────────────────
    await expect(page.getByText(/ابدأ التدريب/)).toBeVisible({ timeout: 8_000 });
    await page.getByText(/ابدأ التدريب/).click();

    // ── Select screen ────────────────────────────────────────────────────────
    await expect(page.getByText("Orwell AI Assignments")).toBeVisible({ timeout: 6_000 });
    // "Task 1" text appears twice (label + help text); use the button role
    await expect(
      page.getByRole("button", { name: /IELTS Task 1/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /IELTS Task 2/i }),
    ).toBeVisible();
    await expect(page.getByText("Free Check")).toBeVisible();

    // ── Click "Free Check" → freechoose screen ───────────────────────────────
    await page.getByText("Free Check").click();

    // freechoose screen: pick a mode (task1 / task2 / paragraph)
    // The screen shows mode selection cards; pick "Task 2" or the first available
    await expect(
      page.getByText(/Task 2|Task 1|Paragraph|What type/i).first(),
    ).toBeVisible({ timeout: 6_000 });

    // Navigate to freewriting — find Continue or a mode card to click
    const task2Option = page.getByRole("button", { name: /Task 2/i });
    if (await task2Option.isVisible()) {
      await task2Option.click();
    } else {
      // Fallback: click first mode card
      await page.locator("button").filter({ hasText: /Task|Paragraph/i }).first().click();
    }

    // ── Freewriting screen ───────────────────────────────────────────────────
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible({ timeout: 8_000 });

    const essayText =
      "Technology has transformed the way people communicate. " +
      "Social media platforms allow instant connection across vast distances. " +
      "However, there are both benefits and drawbacks to consider carefully.";
    await textarea.fill(essayText);

    // Submit button should now be enabled (text ≥ 10 chars)
    const submitBtn = page.getByRole("button", { name: /Submit|Check|Send/i }).last();
    await expect(submitBtn).toBeEnabled({ timeout: 3_000 });
    await submitBtn.click();

    // ── Freeresult screen ────────────────────────────────────────────────────
    await expect(
      page.getByText(/6\.5|Overall Band|Band Score/i).first(),
    ).toBeVisible({ timeout: 12_000 });
    // Grammar error from mock
    await expect(page.getByText(/peoples|people/i).first()).toBeVisible({ timeout: 5_000 });
    // Strength from mock
    await expect(page.getByText(/Clear thesis|thesis statement/i).first()).toBeVisible({
      timeout: 5_000,
    });

  });

  test("Task 1 structured flow: select → writing → submit → result", async ({ page }) => {
    await page.goto(appUrl("/essay-checker"));

    // Navigate to select screen
    await page.getByText(/ابدأ التدريب/).click();
    await expect(page.getByText("Orwell AI Assignments")).toBeVisible({ timeout: 6_000 });

    // Choose Task 1 — use role because "Task 1" text appears twice on screen
    await page.getByRole("button", { name: /IELTS Task 1/i }).click();

    // Writing screen: assignment prompt appears (from static data)
    await expect(page.locator("textarea").first()).toBeVisible({ timeout: 8_000 });

    // The assignment title should be visible
    await expect(
      page.getByText(/Task 1|IELTS|chart|graph|table|diagram/i).first(),
    ).toBeVisible({ timeout: 5_000 });

    // Fill in a short essay (≥ 10 chars)
    await page.locator("textarea").first().fill(
      "The bar chart shows the population growth in five cities between 2000 and 2020. " +
      "Overall, all cities experienced an increase. City A saw the greatest growth.",
    );

    // Submit
    const submitBtn = page
      .getByRole("button", { name: /Submit|Check my|Grade/i })
      .last();
    await expect(submitBtn).toBeEnabled({ timeout: 3_000 });
    await submitBtn.click();

    // Result screen — overall band from mock (6.0)
    await expect(
      page.getByText(/6\.0|Overall Band|Task Response/i).first(),
    ).toBeVisible({ timeout: 12_000 });
    // Word count warning from mock
    await expect(
      page.getByText(/too short|at least 150/i).first(),
    ).toBeVisible({ timeout: 5_000 });

  });
});

test.describe("Orwell AI — complete tier", () => {
  test("complete tier can access essay-checker and reach select screen", async ({ page }) => {
    await loginAsAdvanceOrComplete(page, "complete@orwell.invalid", "complete");
    await setupOrwellMocks(page);
    await page.goto(appUrl("/essay-checker"));

    await page.getByText(/ابدأ التدريب/).click();
    await expect(
      page.getByText("Orwell AI Assignments"),
    ).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText("Free Check")).toBeVisible();
  });
});
