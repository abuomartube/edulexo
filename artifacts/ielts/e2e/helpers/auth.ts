import type { Page } from "@playwright/test";

export const BASE = "/lexo-ielts";

/** Injects intro-student auth into localStorage and mocks the auth API so
 *  PasswordGate's bootstrap check succeeds without a real DB session. */
export async function loginAsIntro(
  page: Page,
  email = "testintro@example.com",
  tier: "intro" | "complete" = "intro",
) {
  await page.route("**/api-ielts/auth/intro/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: { id: 1, email, status: "approved" } }),
    }),
  );

  await page.route("**/api-ielts/me/tier", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ tier, authenticated: true }),
    }),
  );

  await page.route("**/api-ielts/me/onboarding", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ completed: true }),
    }),
  );

  await page.route("**/api-ielts/notifications/unread-count", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ unread: 0 }),
    }),
  );

  await page.route("**/api-ielts/user-data/**", (route) => {
    const url = route.request().url();
    const key = url.split("/user-data/").pop()?.split("?")[0] ?? "";
    const VALUE_MAP: Record<string, string> = {
      current_level: "B2",
      target_band: "7",
      exam_date: "2026-12-31",
      name: "Test Student",
      tour_completed: "1",
    };
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ value: VALUE_MAP[key] ?? "test" }),
    });
  });

  await page.addInitScript(
    ({ em, tok, tierValue }) => {
      localStorage.setItem("lexo-ielts:intro_email", em);
      localStorage.setItem("lexo-ielts:intro_token", tok);
      localStorage.setItem("lexo-ielts:tier", tierValue);
      localStorage.setItem(
        "4ielts_email",
        JSON.stringify({ email: em, token: tok }),
      );
      localStorage.setItem("lexo_tour_completed", "1");
      try { sessionStorage.setItem("exitCommentDismissed", "1"); } catch { /* ignore */ }
    },
    { em: email, tok: "test-intro-token-123", tierValue: tier },
  );
}

/** Injects advance/complete-student auth into localStorage and mocks the
 *  session endpoints so PasswordGate's bootstrap check succeeds. */
export async function loginAsAdvanceOrComplete(
  page: Page,
  email = "testadvance@example.com",
  tier: "advance" | "complete" = "advance",
) {
  const fakeToken = "test-advance-token-456";

  await page.route("**/api-ielts/session/save", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    }),
  );

  await page.route("**/api-ielts/session/check", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "active", token: fakeToken }),
    }),
  );

  await page.route("**/api-ielts/me/tier", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ tier, authenticated: true }),
    }),
  );

  await page.route("**/api-ielts/me/onboarding", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ completed: true }),
    }),
  );

  await page.route("**/api-ielts/notifications/unread-count", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ unread: 0 }),
    }),
  );

  await page.route("**/api-ielts/user-data/**", (route) => {
    const url = route.request().url();
    const key = url.split("/user-data/").pop()?.split("?")[0] ?? "";
    const VALUE_MAP: Record<string, string> = {
      current_level: "B2",
      target_band: "7",
      exam_date: "2026-12-31",
      name: "Test Student",
      tour_completed: "1",
    };
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ value: VALUE_MAP[key] ?? "test" }),
    });
  });

  await page.addInitScript(
    ({ em, tok, tierValue }) => {
      localStorage.setItem(
        "4ielts_email",
        JSON.stringify({ email: em, token: tok }),
      );
      localStorage.setItem("lexo-ielts:tier", tierValue);
      localStorage.setItem("lexo_tour_completed", "1");
      try { sessionStorage.setItem("exitCommentDismissed", "1"); } catch { /* ignore */ }
    },
    { em: email, tok: fakeToken, tierValue: tier },
  );
}

/** Navigate to an app path within the base. */
export function appUrl(path: string) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${BASE}${clean}`;
}
