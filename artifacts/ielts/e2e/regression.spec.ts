/**
 * Regression tests — smoke-tests for the core advance/complete-tier flows
 * (flashcards, speaking, essay checker) and the intro-tier flows
 * (listening, reading) to guard against breakages.
 *
 * These tests do not click through entire flows — they verify that the main
 * UI of each page loads without a blocked-screen or JS crash.
 */
import { test, expect } from "@playwright/test";
import { loginAsIntro, loginAsAdvanceOrComplete, appUrl } from "./helpers/auth";

// ---------------------------------------------------------------------------
// Advance/complete regression
// ---------------------------------------------------------------------------
test.describe("Advance tier — core features render", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdvanceOrComplete(page, "advance@regression.invalid", "advance");
  });

  test("/study (Flashcards) page renders without crash", async ({ page }) => {
    await page.goto(appUrl("/study"));
    // Page should load. Not showing a blocked screen is sufficient.
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8000 });
    // Some study-page content should appear
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("/speaking (Speaking Topics) page renders without crash", async ({
    page,
  }) => {
    await page.goto(appUrl("/speaking"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8000 });
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("/essay-checker (Orwell AI) page renders without crash", async ({
    page,
  }) => {
    await page.goto(appUrl("/essay-checker"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8000 });
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("/browse (Word Browser) page renders without crash", async ({
    page,
  }) => {
    await page.goto(appUrl("/browse"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8000 });
    await expect(page.locator("body")).not.toBeEmpty();
  });
});

// ---------------------------------------------------------------------------
// Complete tier regression — advance + intro features
// ---------------------------------------------------------------------------
test.describe("Complete tier — all features render", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdvanceOrComplete(
      page,
      "complete@regression.invalid",
      "complete",
    );
  });

  test("Churchill (/free-conversation) renders without crash", async ({
    page,
  }) => {
    await page.goto(appUrl("/free-conversation"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8000 });
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("Listening (/intro-listening) renders without crash", async ({
    page,
  }) => {
    await page.goto(appUrl("/intro-listening"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8000 });
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("Reading (/intro-reading) renders without crash", async ({ page }) => {
    await page.goto(appUrl("/intro-reading"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8000 });
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("/study (Flashcards) renders without crash", async ({ page }) => {
    await page.goto(appUrl("/study"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8000 });
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("/essay-checker (Orwell AI) renders without crash", async ({ page }) => {
    await page.goto(appUrl("/essay-checker"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8000 });
    await expect(page.locator("body")).not.toBeEmpty();
  });
});

// ---------------------------------------------------------------------------
// Intro tier regression
// ---------------------------------------------------------------------------
test.describe("Intro tier — core features render", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsIntro(page, "intro@regression.invalid", "intro");
  });

  test("Churchill (/free-conversation) renders without crash", async ({
    page,
  }) => {
    await page.goto(appUrl("/free-conversation"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8000 });
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("Listening (/intro-listening) renders without crash", async ({
    page,
  }) => {
    await page.goto(appUrl("/intro-listening"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8000 });
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("Reading (/intro-reading) renders without crash", async ({ page }) => {
    await page.goto(appUrl("/intro-reading"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible({ timeout: 8000 });
    await expect(page.locator("body")).not.toBeEmpty();
  });
});

// ---------------------------------------------------------------------------
// Advance/complete flow regression — navigating from home to sub-page
// ---------------------------------------------------------------------------
test.describe("Advance tier — navigation regression", () => {
  test("can navigate from home to /browse and back", async ({ page }) => {
    await loginAsAdvanceOrComplete(
      page,
      "advance@nav.invalid",
      "advance",
    );
    await page.goto(appUrl("/"));
    // Navigate to browse
    await page.goto(appUrl("/browse"));
    await expect(page.locator("body")).not.toBeEmpty();
    // Back to home
    await page.goto(appUrl("/"));
    await expect(page.locator("body")).not.toBeEmpty();
  });
});
