/**
 * Reading (intro tier) — E2E flow tests.
 *
 * Covers the full reading journey:
 *   level-picker → type-picker → player (mocked items) → TFNG answer → submit → result banner
 *
 * All API calls are intercepted; no live backend required.
 */
import { test, expect } from "./helpers/fixtures";
import { loginAsIntro, loginAsAdvanceOrComplete, appUrl } from "./helpers/auth";

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_LEVELS_TYPES = {
  levels: [
    {
      id: "a2",
      label: "A2",
      description: "Pre-intermediate — short factual passages.",
    },
    {
      id: "b1",
      label: "B1",
      description: "Intermediate — descriptive and narrative texts.",
    },
  ],
  types: [
    {
      id: "tfng",
      label: "True / False / Not Given",
      tagline: "Read statements and decide if they match the passage.",
    },
    {
      id: "mcq",
      label: "Multiple Choice",
      tagline: "Choose the best answer from four options.",
    },
  ],
  counts: { tfng: 5, mcq: 3 },
};

const MOCK_ATTEMPTS = { attempts: [] };

const MOCK_ITEMS_LIST = {
  items: [
    {
      slug: "the-sahara-desert",
      title: "The Sahara Desert",
      questionCount: 2,
      completed: false,
      result: null,
    },
  ],
};

const MOCK_ITEM_DETAIL = {
  item: {
    slug: "the-sahara-desert",
    level: "a2",
    type: "tfng",
    title: "The Sahara Desert",
    instructions:
      "Read the passage below. Decide whether each statement is TRUE, FALSE or NOT GIVEN based on the information in the text.",
    passage:
      "The Sahara Desert is the largest hot desert in the world. It covers most of North Africa. " +
      "Many people think the Sahara is all sand, but in fact large parts of it are covered in rock and gravel. " +
      "Some animals, such as the fennec fox, have adapted to survive in extreme heat.",
    paragraphs: [],
    options: [],
    questions: [
      {
        id: "q1",
        prompt: "The Sahara Desert is the largest desert in the world.",
      },
      { id: "q2", prompt: "The fennec fox cannot survive in the Sahara." },
    ],
  },
  alreadyCompleted: false,
  attempt: null,
};

const MOCK_SUBMIT_RESULT = {
  attempt: {
    id: 42,
    answers: { q1: "true", q2: "false" },
    score: 2,
    total: 2,
    percent: 100,
    results: [
      {
        id: "q1",
        prompt: "The Sahara Desert is the largest desert in the world.",
        studentAnswer: "true",
        correctAnswer: "true",
        isCorrect: true,
        explanation:
          "The passage explicitly states the Sahara is the largest hot desert.",
      },
      {
        id: "q2",
        prompt: "The fennec fox cannot survive in the Sahara.",
        studentAnswer: "false",
        correctAnswer: "false",
        isCorrect: true,
        explanation:
          "The passage says the fennec fox has adapted to survive there.",
      },
    ],
    createdAt: new Date().toISOString(),
  },
};

async function setupReadingMocks(
  page: Parameters<Parameters<typeof test>[1]>[0]["page"],
) {
  // Catch ALL /api-ielts/reading/** with one handler.
  // Playwright's * does not span path separators, so "items*" would not match
  // "items/the-sahara-desert" — we use "reading/**" to cover every sub-path.
  await page.route("**/api-ielts/reading/**", (route) => {
    const url = route.request().url();

    if (url.includes("/reading/levels-types")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_LEVELS_TYPES),
      });
    }

    if (url.includes("/reading/attempts")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_ATTEMPTS),
      });
    }

    // /reading/items/<slug>/submit
    if (url.includes("/items/") && url.endsWith("/submit")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_SUBMIT_RESULT),
      });
    }

    // /reading/items/<slug>  (individual item detail)
    if (url.match(/\/reading\/items\/[^?/]+$/)) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_ITEM_DETAIL),
      });
    }

    // /reading/items?level=…&type=… (list)
    if (url.includes("/reading/items")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_ITEMS_LIST),
      });
    }

    return route.continue();
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Reading — intro tier full flow", () => {
  test("level-picker → A2 → TFNG type → player → answer both questions → submit → result", async ({
    page,
  }) => {
    await loginAsIntro(page, "reading@test.invalid", "intro");
    await setupReadingMocks(page);
    await page.goto(appUrl("/intro-reading"));

    // ── Level picker ─────────────────────────────────────────────────────────
    await expect(page.getByText("A2")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("B1")).toBeVisible();
    await expect(
      page.getByText(/Pre-intermediate|Short factual/i).first(),
    ).toBeVisible();

    await page.getByText("A2").click();

    // ── Type picker ──────────────────────────────────────────────────────────
    await expect(page.getByText("True / False / Not Given")).toBeVisible({
      timeout: 6_000,
    });
    await expect(page.getByText("Multiple Choice")).toBeVisible();
    // Counts badge — use first() because "5" may appear in multiple contexts
    await expect(page.getByText("5").first()).toBeVisible();

    // Each type card has a "Start" button; TFNG is first → click first Start button
    await page
      .getByRole("button", { name: /^(Start|Continue|Review)$/i })
      .first()
      .click();

    // ── Reading player — passage + questions ─────────────────────────────────
    await expect(page.getByText("The Sahara Desert").first()).toBeVisible({
      timeout: 8_000,
    });
    // Passage text
    await expect(page.getByText(/largest hot desert/i)).toBeVisible({
      timeout: 6_000,
    });
    // Both questions render
    await expect(
      page.getByText("The Sahara Desert is the largest desert in the world."),
    ).toBeVisible();
    await expect(
      page.getByText("The fennec fox cannot survive in the Sahara."),
    ).toBeVisible();

    // Answer choices: TRUE / FALSE / NOT GIVEN buttons
    const trueButtons = page.getByRole("button", { name: /^True$/i });
    const falseButtons = page.getByRole("button", { name: /^False$/i });
    await expect(trueButtons.first()).toBeVisible();
    await expect(falseButtons.first()).toBeVisible();

    // Submit (Check answers) should be disabled until all answered
    const submitBtn = page.getByRole("button", { name: /Check answers/i });
    await expect(submitBtn).toBeDisabled();

    // Answer Q1 → TRUE
    await trueButtons.first().click();
    await expect(submitBtn).toBeDisabled(); // Q2 still unanswered

    // Answer Q2 → FALSE
    await falseButtons.last().click();
    await expect(submitBtn).toBeEnabled();

    // ── Submit → result banner ────────────────────────────────────────────────
    await submitBtn.click();
    await expect(
      page.getByText(/100%|2\s*\/\s*2|Perfect|Excellent/i).first(),
    ).toBeVisible({ timeout: 10_000 });
    // Correct-answer feedback from mock
    await expect(page.getByText(/True|Correct/i).first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test("advance tier is blocked from Reading and sees upgrade CTA", async ({
    page,
  }) => {
    await loginAsAdvanceOrComplete(page, "advance@reading.invalid", "advance");
    await page.goto(appUrl("/intro-reading"));

    await expect(page.getByText("Not Included in Your Plan")).toBeVisible({
      timeout: 8_000,
    });
    await expect(
      page.getByRole("link", { name: /Upgrade Your Plan/i }),
    ).toBeVisible();
  });

  test("B1 level tile is present in level picker", async ({ page }) => {
    await loginAsIntro(page, "readingb1@test.invalid", "intro");
    await setupReadingMocks(page);
    await page.goto(appUrl("/intro-reading"));

    await expect(page.getByText("B1")).toBeVisible({ timeout: 8_000 });
    await expect(
      page.getByText(/Intermediate|descriptive/i).first(),
    ).toBeVisible();
  });
});
