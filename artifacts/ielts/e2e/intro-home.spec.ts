/**
 * IntroHome layout tests — verifies that intro-tier students see the
 * correct "Your Tools" section with Churchill, Listening, and Reading CTAs
 * as the three primary entry points.
 */
import { test, expect } from "./helpers/fixtures";
import { loginAsIntro, appUrl } from "./helpers/auth";

test.describe("IntroHome (intro tier home screen)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsIntro(page, "introstudent@test.invalid", "intro");
    await page.goto(appUrl("/"));
    // Wait for the app to finish checking localStorage and render the home
    await expect(page.getByText("Your Tools")).toBeVisible({ timeout: 10000 });
  });

  test("shows 'Your Tools' section heading", async ({ page }) => {
    await expect(page.getByText("Your Tools")).toBeVisible();
  });

  test("shows Churchill Free Conversation tool card", async ({ page }) => {
    await expect(
      page.getByText(/Churchill Free Conversation/i),
    ).toBeVisible();
  });

  test("shows Listening tool card", async ({ page }) => {
    await expect(
      page.getByText(/Listening/i).first(),
    ).toBeVisible();
  });

  test("shows Reading tool card", async ({ page }) => {
    await expect(
      page.getByText(/Reading/i).first(),
    ).toBeVisible();
  });

  test("Churchill card links to /free-conversation", async ({ page }) => {
    const churchillLink = page
      .getByRole("link")
      .filter({ hasText: /Churchill/i })
      .first();
    await expect(churchillLink).toHaveAttribute("href", /free-conversation/);
  });

  test("Listening card links to /intro-listening", async ({ page }) => {
    const listeningLink = page
      .getByRole("link")
      .filter({ hasText: /Listening/i })
      .first();
    await expect(listeningLink).toHaveAttribute("href", /intro-listening/);
  });

  test("Reading card links to /intro-reading", async ({ page }) => {
    const readingLink = page
      .getByRole("link")
      .filter({ hasText: /Reading/i })
      .first();
    await expect(readingLink).toHaveAttribute("href", /intro-reading/);
  });
});
