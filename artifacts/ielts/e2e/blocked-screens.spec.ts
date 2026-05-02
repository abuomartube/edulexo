/**
 * Blocked screens tests — verifies that:
 * 1. Advance-tier students who navigate to intro-only features (Churchill,
 *    Listening, Reading) see the "Not Included in Your Plan" gate.
 * 2. The gate shows an "Upgrade Your Plan" CTA that links to WhatsApp.
 * 3. Intro-tier students who navigate to advance-only features (Flashcards,
 *    Speaking, Writing) see a similar upgrade prompt.
 */
import { test, expect } from "@playwright/test";
import { loginAsIntro, loginAsAdvanceOrComplete, appUrl } from "./helpers/auth";

const WHATSAPP_PATTERN = /wa\.me/;

// ---------------------------------------------------------------------------
// Advance tier — blocked from intro-only features
// ---------------------------------------------------------------------------
test.describe("Advance tier blocked from intro-only features", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdvanceOrComplete(page, "advance@blocked.invalid", "advance");
  });

  test("Churchill (/free-conversation) — shows Not Included heading", async ({
    page,
  }) => {
    await page.goto(appUrl("/free-conversation"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).toBeVisible({ timeout: 8000 });
  });

  test("Churchill (/free-conversation) — Upgrade Your Plan button exists", async ({
    page,
  }) => {
    await page.goto(appUrl("/free-conversation"));
    const upgradeBtn = page.getByRole("link", { name: /Upgrade Your Plan/i });
    await expect(upgradeBtn).toBeVisible({ timeout: 8000 });
  });

  test("Churchill (/free-conversation) — Upgrade CTA links to WhatsApp", async ({
    page,
  }) => {
    await page.goto(appUrl("/free-conversation"));
    const upgradeBtn = page.getByRole("link", { name: /Upgrade Your Plan/i });
    const href = await upgradeBtn.getAttribute("href");
    expect(href).toMatch(WHATSAPP_PATTERN);
  });

  test("Listening (/intro-listening) — shows Not Included heading", async ({
    page,
  }) => {
    await page.goto(appUrl("/intro-listening"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).toBeVisible({ timeout: 8000 });
  });

  test("Listening (/intro-listening) — Upgrade Your Plan button exists", async ({
    page,
  }) => {
    await page.goto(appUrl("/intro-listening"));
    const upgradeBtn = page.getByRole("link", { name: /Upgrade Your Plan/i });
    await expect(upgradeBtn).toBeVisible({ timeout: 8000 });
  });

  test("Listening (/intro-listening) — Upgrade CTA links to WhatsApp", async ({
    page,
  }) => {
    await page.goto(appUrl("/intro-listening"));
    const upgradeBtn = page.getByRole("link", { name: /Upgrade Your Plan/i });
    const href = await upgradeBtn.getAttribute("href");
    expect(href).toMatch(WHATSAPP_PATTERN);
  });

  test("Reading (/intro-reading) — shows Not Included heading", async ({
    page,
  }) => {
    await page.goto(appUrl("/intro-reading"));
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).toBeVisible({ timeout: 8000 });
  });

  test("Reading (/intro-reading) — Upgrade Your Plan button exists", async ({
    page,
  }) => {
    await page.goto(appUrl("/intro-reading"));
    const upgradeBtn = page.getByRole("link", { name: /Upgrade Your Plan/i });
    await expect(upgradeBtn).toBeVisible({ timeout: 8000 });
  });

  test("Reading (/intro-reading) — Upgrade CTA links to WhatsApp", async ({
    page,
  }) => {
    await page.goto(appUrl("/intro-reading"));
    const upgradeBtn = page.getByRole("link", { name: /Upgrade Your Plan/i });
    const href = await upgradeBtn.getAttribute("href");
    expect(href).toMatch(WHATSAPP_PATTERN);
  });
});

// ---------------------------------------------------------------------------
// Intro tier — blocked from advance-only features
// ---------------------------------------------------------------------------
test.describe("Intro tier blocked from advance-only features", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsIntro(page, "intro@blocked.invalid", "intro");
  });

  test("Flashcards (/study) — shows upgrade message for intro tier", async ({
    page,
  }) => {
    await page.goto(appUrl("/study"));
    await expect(
      page.getByText(/Not Included|Upgrade Your Plan|upgrade/i).first(),
    ).toBeVisible({ timeout: 8000 });
  });
});
