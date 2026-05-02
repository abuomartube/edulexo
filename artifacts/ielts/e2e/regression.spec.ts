/**
 * Regression tests — smoke-level checks for every core page across all tiers.
 *
 * Each test asserts a specific heading or landmark element that proves the page
 * actually mounted (not just that the HTML body is non-empty). This catches
 * blank-screen JS crashes and routing regressions without duplicating the
 * full-flow coverage in the feature-specific spec files.
 */
import { test, expect } from "@playwright/test";
import { loginAsIntro, loginAsAdvanceOrComplete, appUrl } from "./helpers/auth";
import { attachErrorGuard } from "./helpers/fixtures";

// ── Advance tier ──────────────────────────────────────────────────────────────

test.describe("Advance tier — core page smoke tests", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdvanceOrComplete(page, "advance@regression.invalid", "advance");
  });

  test("/study (Flashcards) renders study-mode heading without gate screen", async ({
    page,
  }) => {
    const guard = attachErrorGuard(page);
    await page.goto(appUrl("/study"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8_000 });
    // Study page renders at least one known heading
    await expect(
      page.getByText(/Study Mode|Flashcards|IELTS Words|Word List/i).first(),
    ).toBeVisible({ timeout: 10_000 });
    guard.assertClean();
  });

  test("/speaking (Speaking Topics) renders speaking topics list", async ({
    page,
  }) => {
    const guard = attachErrorGuard(page);
    await page.goto(appUrl("/speaking"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8_000 });
    await expect(
      page.getByText(/Speaking|Topics|Practice/i).first(),
    ).toBeVisible({ timeout: 10_000 });
    guard.assertClean();
  });

  test("/essay-checker (Orwell AI) renders intro branding screen", async ({
    page,
  }) => {
    const guard = attachErrorGuard(page);
    await page.goto(appUrl("/essay-checker"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8_000 });
    // "Orwell AI" appears in both the nav link and the h1 — target the heading
    await expect(
      page.getByRole("heading", { name: "Orwell AI" }),
    ).toBeVisible({ timeout: 10_000 });
    guard.assertClean();
  });

  test("/browse (Word Browser) renders browse heading", async ({ page }) => {
    const guard = attachErrorGuard(page);
    await page.goto(appUrl("/browse"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8_000 });
    await expect(
      page.getByText(/Browse|Word Browser|Vocabulary|Explore/i).first(),
    ).toBeVisible({ timeout: 10_000 });
    guard.assertClean();
  });

  test("/sentence-builder renders Sentence Builder heading", async ({ page }) => {
    const guard = attachErrorGuard(page);
    // The route is /sentence-builder (sentence-builder.tsx), not /sentence-check
    await page.goto(appUrl("/sentence-builder"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8_000 });
    // Level-picker screen renders immediately with h1 "Sentence Builder"
    await expect(
      page.getByRole("heading", { name: /Sentence Builder/i }),
    ).toBeVisible({ timeout: 10_000 });
    guard.assertClean();
  });
});

// ── Complete tier ─────────────────────────────────────────────────────────────

test.describe("Complete tier — all features render", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdvanceOrComplete(page, "complete@regression.invalid", "complete");
  });

  test("Churchill (/free-conversation) renders topic-source screen", async ({
    page,
  }) => {
    const guard = attachErrorGuard(page);
    // Intercept session fetch so the page doesn't wait for a real DB
    await page.route("**/api-ielts/conversation/sessions", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ sessions: [] }) }),
    );
    await page.goto(appUrl("/free-conversation"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8_000 });
    await expect(
      page.getByText(/What would you like to talk about|Choose a topic|Your own topic/i).first(),
    ).toBeVisible({ timeout: 10_000 });
    guard.assertClean();
  });

  test("Listening (/intro-listening) renders section list for complete tier", async ({
    page,
  }) => {
    const guard = attachErrorGuard(page);
    await page.route("**/api-ielts/listening/tests", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          sections: [{ id: 1, title: "Section 1 — Daily Life", description: "Daily topics." }],
          tests: [],
        }),
      }),
    );
    await page.goto(appUrl("/intro-listening"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8_000 });
    await expect(
      page.getByText(/Attenborough AI|Section 1|Listening/i).first(),
    ).toBeVisible({ timeout: 10_000 });
    guard.assertClean();
  });

  test("Reading (/intro-reading) renders level picker for complete tier", async ({
    page,
  }) => {
    const guard = attachErrorGuard(page);
    await page.route("**/api-ielts/reading/levels-types", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          levels: [{ id: "a2", label: "A2", description: "Pre-intermediate." }],
          types: [{ id: "tfng", label: "True / False / Not Given", tagline: "..." }],
          counts: { tfng: 5 },
        }),
      }),
    );
    await page.goto(appUrl("/intro-reading"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8_000 });
    await expect(
      page.getByText(/A2|Reading|Level|Pre-intermediate/i).first(),
    ).toBeVisible({ timeout: 10_000 });
    guard.assertClean();
  });

  test("/study (Flashcards) renders for complete tier", async ({ page }) => {
    const guard = attachErrorGuard(page);
    await page.goto(appUrl("/study"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8_000 });
    await expect(
      page.getByText(/Study Mode|Flashcards|IELTS Words|Word List/i).first(),
    ).toBeVisible({ timeout: 10_000 });
    guard.assertClean();
  });

  test("/essay-checker (Orwell AI) renders for complete tier", async ({ page }) => {
    const guard = attachErrorGuard(page);
    await page.goto(appUrl("/essay-checker"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8_000 });
    await expect(
      page.getByRole("heading", { name: "Orwell AI" }),
    ).toBeVisible({ timeout: 10_000 });
    guard.assertClean();
  });
});

// ── Intro tier ────────────────────────────────────────────────────────────────

test.describe("Intro tier — core features render", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsIntro(page, "intro@regression.invalid", "intro");
  });

  test("Churchill (/free-conversation) renders topic-source screen for intro tier", async ({
    page,
  }) => {
    const guard = attachErrorGuard(page);
    await page.route("**/api-ielts/conversation/sessions", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ sessions: [] }) }),
    );
    await page.goto(appUrl("/free-conversation"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8_000 });
    await expect(
      page.getByText(/What would you like to talk about|Choose a topic/i).first(),
    ).toBeVisible({ timeout: 10_000 });
    guard.assertClean();
  });

  test("Listening (/intro-listening) renders Attenborough AI heading with sections", async ({
    page,
  }) => {
    const guard = attachErrorGuard(page);
    await page.route("**/api-ielts/listening/tests", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          sections: [
            { id: 1, title: "Section 1 — Daily Life", description: "Daily topics." },
            { id: 2, title: "Section 2 — Education", description: "Academic topics." },
          ],
          tests: [],
        }),
      }),
    );
    await page.goto(appUrl("/intro-listening"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8_000 });
    await expect(page.getByText("Attenborough AI")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Section 1 — Daily Life")).toBeVisible();
    guard.assertClean();
  });

  test("Reading (/intro-reading) renders level picker with A2 and B1", async ({
    page,
  }) => {
    const guard = attachErrorGuard(page);
    await page.route("**/api-ielts/reading/levels-types", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          levels: [
            { id: "a2", label: "A2", description: "Pre-intermediate." },
            { id: "b1", label: "B1", description: "Intermediate." },
          ],
          types: [{ id: "tfng", label: "True / False / Not Given", tagline: "..." }],
          counts: { tfng: 5 },
        }),
      }),
    );
    await page.goto(appUrl("/intro-reading"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8_000 });
    await expect(page.getByText("A2")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("B1")).toBeVisible();
    guard.assertClean();
  });
});

// ── Navigation regression ─────────────────────────────────────────────────────

test.describe("Navigation regression — direct URL access and back/forward", () => {
  test("advance tier: navigate home → /browse → back to home via browser back", async ({
    page,
  }) => {
    await loginAsAdvanceOrComplete(page, "advance@nav.invalid", "advance");
    await page.goto(appUrl("/"));
    await expect(page.locator("body")).not.toBeEmpty({ timeout: 8_000 });

    await page.goto(appUrl("/browse"));
    await expect(
      page.getByText(/Browse|Word Browser|Vocabulary|Explore/i).first(),
    ).toBeVisible({ timeout: 10_000 });

    await page.goBack();
    // After navigating back, the SPA root should still mount
    await expect(page.locator("body")).not.toBeEmpty({ timeout: 5_000 });
  });

  test("intro tier: direct deep-link to /intro-listening resolves correctly", async ({
    page,
  }) => {
    await loginAsIntro(page, "introdeep@regression.invalid", "intro");
    await page.route("**/api-ielts/listening/tests", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          sections: [{ id: 1, title: "Section 1 — Daily Life", description: "D." }],
          tests: [],
        }),
      }),
    );
    await page.goto(appUrl("/intro-listening"));
    await expect(page.getByText("Attenborough AI")).toBeVisible({ timeout: 10_000 });
  });
});

// ── Advance/complete flow: stage transitions ──────────────────────────────────

test.describe("Advance tier — Orwell AI intro → select transition", () => {
  test("clicking start button transitions intro → select screen", async ({ page }) => {
    await loginAsAdvanceOrComplete(page, "advance@orwellreg.invalid", "advance");
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
    await page.goto(appUrl("/essay-checker"));

    // Target the h1 to avoid strict-mode violation (nav link also says "Orwell AI")
    await expect(
      page.getByRole("heading", { name: "Orwell AI" }),
    ).toBeVisible({ timeout: 8_000 });
    await page.getByText(/ابدأ التدريب/).click();

    // Select screen appears
    await expect(
      page.getByText("Orwell AI Assignments"),
    ).toBeVisible({ timeout: 6_000 });
    // Task buttons — use role to avoid strict-mode when the label appears in help text too
    await expect(page.getByRole("button", { name: /IELTS Task 1/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /IELTS Task 2/i })).toBeVisible();
    await expect(page.getByText("Free Check")).toBeVisible();
  });
});
