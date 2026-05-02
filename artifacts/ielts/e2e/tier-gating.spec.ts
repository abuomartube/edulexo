/**
 * Tier-gating tests — verifies that the correct features are accessible or
 * blocked based on the student's tier (intro / advance / complete).
 *
 * Feature matrix (from lib/tier.ts):
 *   "churchill"  → intro + complete  (advance BLOCKED)
 *   "listening"  → intro + complete  (advance BLOCKED)
 *   "reading"    → intro + complete  (advance BLOCKED)
 *   "flashcards" → advance + complete (intro BLOCKED)
 *   "speaking"   → advance + complete (intro BLOCKED)
 *   "writing"    → advance + complete (intro BLOCKED)
 */
import { test, expect } from "./helpers/fixtures";
import { loginAsIntro, loginAsAdvanceOrComplete, appUrl } from "./helpers/auth";

// ---------------------------------------------------------------------------
// Intro tier
// ---------------------------------------------------------------------------
test.describe("Intro tier", () => {
  test("home shows IntroHome with 'Your Tools' section", async ({ page }) => {
    await loginAsIntro(page, "intro@test.invalid", "intro");
    await page.goto(appUrl("/"));
    await expect(page.getByText("Your Tools")).toBeVisible({ timeout: 10000 });
  });

  test("Churchill (free-conversation) is accessible — no blocked screen", async ({
    page,
  }) => {
    await loginAsIntro(page, "intro@test.invalid", "intro");
    await page.goto(appUrl("/free-conversation"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8000 });
  });

  test("Listening (intro-listening) is accessible — no blocked screen", async ({
    page,
  }) => {
    await loginAsIntro(page, "intro@test.invalid", "intro");
    await page.goto(appUrl("/intro-listening"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8000 });
  });

  test("Reading (intro-reading) is accessible — no blocked screen", async ({
    page,
  }) => {
    await loginAsIntro(page, "intro@test.invalid", "intro");
    await page.goto(appUrl("/intro-reading"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8000 });
  });

  test("Flashcards page (/study) is blocked for intro tier", async ({
    page,
  }) => {
    await loginAsIntro(page, "intro@test.invalid", "intro");
    await page.goto(appUrl("/study"));
    // Intro students see the IntroTierBanner which explains that B2/C1 levels
    // are unavailable and that Advance/Comprehensive plans unlock them.
    // The banner renders text like "Intro tier · A2 → B1" and
    // "Available in Advance and Comprehensive tiers."
    await expect(
      page.getByText(/Intro tier|Advance.*Comprehensive|Comprehensive.*Advance/i).first(),
    ).toBeVisible({ timeout: 8000 });
  });
});

// ---------------------------------------------------------------------------
// Advance tier
// ---------------------------------------------------------------------------
test.describe("Advance tier", () => {
  test("home shows standard Home page (not IntroHome)", async ({ page }) => {
    await loginAsAdvanceOrComplete(page, "advance@test.invalid", "advance");
    await page.goto(appUrl("/"));
    // Standard home should not show the "Your Tools" heading of IntroHome
    await expect(page.getByText("Your Tools")).not.toBeVisible({
      timeout: 8000,
    });
  });

  test("Churchill (free-conversation) is BLOCKED for advance tier", async ({
    page,
  }) => {
    await loginAsAdvanceOrComplete(page, "advance@test.invalid", "advance");
    await page.goto(appUrl("/free-conversation"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).toBeVisible({ timeout: 8000 });
  });

  test("Listening (intro-listening) is BLOCKED for advance tier", async ({
    page,
  }) => {
    await loginAsAdvanceOrComplete(page, "advance@test.invalid", "advance");
    await page.goto(appUrl("/intro-listening"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).toBeVisible({ timeout: 8000 });
  });

  test("Reading (intro-reading) is BLOCKED for advance tier", async ({
    page,
  }) => {
    await loginAsAdvanceOrComplete(page, "advance@test.invalid", "advance");
    await page.goto(appUrl("/intro-reading"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).toBeVisible({ timeout: 8000 });
  });

  test("Flashcards page (/study) is accessible for advance tier", async ({
    page,
  }) => {
    await loginAsAdvanceOrComplete(page, "advance@test.invalid", "advance");
    await page.goto(appUrl("/study"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8000 });
  });
});

// ---------------------------------------------------------------------------
// Complete tier
// ---------------------------------------------------------------------------
test.describe("Complete tier", () => {
  test("Churchill (free-conversation) is accessible for complete tier", async ({
    page,
  }) => {
    await loginAsAdvanceOrComplete(page, "complete@test.invalid", "complete");
    await page.goto(appUrl("/free-conversation"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8000 });
  });

  test("Listening (intro-listening) is accessible for complete tier", async ({
    page,
  }) => {
    await loginAsAdvanceOrComplete(page, "complete@test.invalid", "complete");
    await page.goto(appUrl("/intro-listening"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8000 });
  });

  test("Reading (intro-reading) is accessible for complete tier", async ({
    page,
  }) => {
    await loginAsAdvanceOrComplete(page, "complete@test.invalid", "complete");
    await page.goto(appUrl("/intro-reading"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8000 });
  });

  test("Flashcards (/study) is accessible for complete tier", async ({
    page,
  }) => {
    await loginAsAdvanceOrComplete(page, "complete@test.invalid", "complete");
    await page.goto(appUrl("/study"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8000 });
  });
});

// ---------------------------------------------------------------------------
// Nav visibility by tier
//
// layout.tsx wires `showIntroFeatures = canAccess("churchill")` which is true
// only for "intro" and "complete".  When true, three extra items are prepended
// to navItems:
//   • Churchill Free Conv.  → /free-conversation
//   • Attenborough Listening → /intro-listening
//   • Hemingway Reading      → /intro-reading
//
// Advance tier skips these items entirely; it gets Churchill AI (/speaking),
// Orwell AI, Listening Practice, Reading Practice instead.
// ---------------------------------------------------------------------------
test.describe("Nav link visibility by tier", () => {
  test("intro tier: Churchill Free Conv. / Attenborough Listening / Hemingway Reading appear in nav", async ({
    page,
  }) => {
    await loginAsIntro(page, "navintro@test.invalid", "intro");
    await page.goto(appUrl("/"));
    await expect(page.getByText("Your Tools")).toBeVisible({ timeout: 10_000 });

    // Intro-only nav items (added when showIntroFeatures = true)
    await expect(
      page.getByRole("link", { name: /Churchill Free Conv\./i }).first(),
    ).toBeVisible({ timeout: 6_000 });
    await expect(
      page.getByRole("link", { name: /Attenborough Listening/i }).first(),
    ).toBeVisible({ timeout: 6_000 });
    await expect(
      page.getByRole("link", { name: /Hemingway Reading/i }).first(),
    ).toBeVisible({ timeout: 6_000 });
  });

  test("advance tier: Churchill Free Conv. / Attenborough Listening / Hemingway Reading are absent from nav", async ({
    page,
  }) => {
    await loginAsAdvanceOrComplete(page, "navadvance@test.invalid", "advance");
    await page.goto(appUrl("/"));
    // Wait for the app to finish rendering before asserting absence
    await expect(
      page.getByRole("link", { name: /Churchill AI/i }).first(),
    ).toBeVisible({ timeout: 10_000 });

    // Intro-only items must NOT appear for advance tier
    await expect(
      page.getByRole("link", { name: /Churchill Free Conv\./i }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("link", { name: /Attenborough Listening/i }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("link", { name: /Hemingway Reading/i }),
    ).not.toBeVisible();

    // But advance-tier nav items ARE present
    await expect(
      page.getByRole("link", { name: /Orwell AI/i }).first(),
    ).toBeVisible();
  });

  test("complete tier: has both intro features AND advance features in nav", async ({
    page,
  }) => {
    await loginAsAdvanceOrComplete(page, "navcomplete@test.invalid", "complete");
    await page.goto(appUrl("/"));

    // Intro-only items (showIntroFeatures = true for complete tier)
    await expect(
      page.getByRole("link", { name: /Churchill Free Conv\./i }).first(),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("link", { name: /Attenborough Listening/i }).first(),
    ).toBeVisible({ timeout: 6_000 });
    await expect(
      page.getByRole("link", { name: /Hemingway Reading/i }).first(),
    ).toBeVisible({ timeout: 6_000 });

    // Advance-tier items also present
    await expect(
      page.getByRole("link", { name: /Churchill AI/i }).first(),
    ).toBeVisible({ timeout: 6_000 });
    await expect(
      page.getByRole("link", { name: /Orwell AI/i }).first(),
    ).toBeVisible({ timeout: 6_000 });
  });
});
