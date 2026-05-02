/**
 * Auth flow tests — landing page, login form, register form, pending state,
 * admin approve, successful login, SSO-launch token-bootstrap, and regression.
 *
 * T01/T02/T03/T03b/T03c: fully mocked so no live backend is needed and the
 * auto error-guard fixture never sees a stray 4xx/5xx response.
 *
 * T04: exercises the real intro-auth API; tests are skipped unless
 * ADMIN_PASSWORD env var is present.
 */
import { test, expect } from "./helpers/fixtures";
import { appUrl } from "./helpers/auth";

const ADMIN_URL = "http://localhost:80/api-ielts/admin/intro";
const AUTH_URL = "http://localhost:80/api-ielts/auth/intro";

function uniqueEmail(label: string): string {
  const ts = Date.now().toString(36);
  return `e2e.${label}.${ts}@ieltstest.invalid`;
}

// ---------------------------------------------------------------------------
// T01 — Landing page (no stored session → landing view rendered)
// ---------------------------------------------------------------------------
test.describe("Landing page (unauthenticated)", () => {
  test("shows Log In and Register buttons", async ({ page }) => {
    await page.goto(appUrl("/"));
    await expect(
      page.getByRole("button", { name: /Log In/i }).first(),
    ).toBeVisible({ timeout: 8000 });
    await expect(
      page.getByRole("button", { name: /Register/i }).first(),
    ).toBeVisible();
  });

  test("clicking Log In reveals email + password fields", async ({ page }) => {
    await page.goto(appUrl("/"));
    await page.getByRole("button", { name: /Log In/i }).first().click();
    await expect(
      page.getByPlaceholder(/email/i).first(),
    ).toBeVisible({ timeout: 6000 });
    await expect(
      page.getByPlaceholder(/password/i).first(),
    ).toBeVisible();
  });

  test("clicking Register reveals email, password and access-code fields", async ({
    page,
  }) => {
    await page.goto(appUrl("/"));
    const registerBtn = page.getByRole("button", { name: /Register/i }).first();
    await registerBtn.click();
    await expect(page.getByPlaceholder(/email/i).first()).toBeVisible({
      timeout: 6000,
    });
    await expect(
      page.getByPlaceholder(/7K9M2P4XAB|e\.g\./i).first(),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// T02 — Login error case (mocked endpoint, error body returned as HTTP 200)
// ---------------------------------------------------------------------------
test.describe("Login error handling", () => {
  test("wrong credentials shows an error message", async ({ page }) => {
    // Mock /access/login to return HTTP 200 with a status:"not_found" body.
    // This mirrors the real API behaviour for unknown accounts and ensures the
    // auto error-guard fixture does not catch a stray 4xx response.
    await page.route("**/api-ielts/access/login", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "not_found", error: "No account found with that email." }),
      }),
    );
    await page.goto(appUrl("/"));
    await page.getByRole("button", { name: /Log In/i }).first().click();
    await page.getByPlaceholder(/email/i).first().fill("nobody@example.com");
    await page.getByPlaceholder(/password/i).first().fill("wrongpassword");
    await page.getByRole("button", { name: /sign in|log in/i }).last().click();
    await expect(
      page.getByText(/(not found|incorrect|invalid|error|failed|account|unauthorized|No account)/i).first(),
    ).toBeVisible({ timeout: 12000 });
  });
});

// ---------------------------------------------------------------------------
// T03 — Registration error case (mocked endpoint, error body as HTTP 200)
// ---------------------------------------------------------------------------
test.describe("Registration error handling", () => {
  test("invalid access code shows an error message", async ({ page }) => {
    // Mock the intro-registration endpoint so the UI receives an error body
    // without a real DB call or any 4xx that would trip the error-guard.
    await page.route("**/api-ielts/auth/intro/register", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ error: "Invalid access code. Check with your instructor." }),
      }),
    );
    await page.goto(appUrl("/"));
    const registerBtn = page.getByRole("button", { name: /Register/i }).first();
    await registerBtn.click();
    await page.getByPlaceholder(/email/i).first().fill(uniqueEmail("regfail"));
    await page.getByPlaceholder(/password/i).first().fill("password123");
    const codeField = page.getByPlaceholder(/7K9M2P4XAB|e\.g\./i).first();
    await codeField.fill("XXXX-XXXX-XXXX");
    await page.getByRole("button", { name: /create account|register|sign up/i }).last().click();
    await expect(
      page.getByText(/(invalid access code|already been used|check with your instructor)/i).first(),
    ).toBeVisible({ timeout: 8000 });
  });
});

// ---------------------------------------------------------------------------
// T03b — Advance / complete login form (mocked)
// ---------------------------------------------------------------------------
test.describe("Advance/complete session login (mocked)", () => {
  test("valid credentials store session token and unlock the app", async ({
    page,
  }) => {
    await page.route("**/api-ielts/access/login", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "approved", token: "test-advance-token" }),
      }),
    );
    // After successful login, handleLogin() calls saveSessionToDb() which hits
    // /session/save.  Mock it so the fake token is not rejected with 401.
    await page.route("**/api-ielts/session/save", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      }),
    );
    await page.route("**/api-ielts/me/tier", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ tier: "advance", authenticated: true }),
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
    await page.route("**/api-ielts/user-data/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ value: "test" }),
      }),
    );
    await page.addInitScript(() => {
      localStorage.setItem("lexo_tour_completed", "1");
      try { sessionStorage.setItem("exitCommentDismissed", "1"); } catch { /* ignore */ }
    });

    await page.goto(appUrl("/"));
    await expect(
      page.getByRole("button", { name: /Log In/i }).first(),
    ).toBeVisible({ timeout: 8_000 });
    await page.getByRole("button", { name: /Log In/i }).first().click();
    await expect(
      page.getByPlaceholder(/email/i).first(),
    ).toBeVisible({ timeout: 6_000 });
    await page.getByPlaceholder(/email/i).first().fill("advance@4ielts.com");
    await page.getByPlaceholder(/password/i).first().fill("TestPassword123!");
    await page.getByRole("button", { name: /sign in|log in/i }).last().click();
    await expect(
      page.getByRole("link", { name: /Study Mode/i }).first(),
    ).toBeVisible({ timeout: 12_000 });
  });

  test("complete-tier session login also unlocks the app", async ({ page }) => {
    await page.route("**/api-ielts/access/login", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "approved", token: "test-complete-token" }),
      }),
    );
    // After successful login, handleLogin() calls saveSessionToDb() which hits
    // /session/save.  Mock it so the fake token is not rejected with 401.
    await page.route("**/api-ielts/session/save", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      }),
    );
    await page.route("**/api-ielts/me/tier", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ tier: "complete", authenticated: true }),
      }),
    );
    await page.route("**/api-ielts/me/onboarding", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ completed: true }) }),
    );
    await page.route("**/api-ielts/notifications/unread-count", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ unread: 0 }) }),
    );
    await page.route("**/api-ielts/user-data/**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ value: "test" }) }),
    );
    await page.addInitScript(() => {
      localStorage.setItem("lexo_tour_completed", "1");
      try { sessionStorage.setItem("exitCommentDismissed", "1"); } catch { /* ignore */ }
    });

    await page.goto(appUrl("/"));
    await page.getByRole("button", { name: /Log In/i }).first().click();
    await page.getByPlaceholder(/email/i).first().fill("complete@4ielts.com");
    await page.getByPlaceholder(/password/i).first().fill("TestPassword123!");
    await page.getByRole("button", { name: /sign in|log in/i }).last().click();
    await expect(
      page.getByRole("link", { name: /Churchill AI/i }).first(),
    ).toBeVisible({ timeout: 12_000 });
  });
});

// ---------------------------------------------------------------------------
// T03c — SSO-launch / token-bootstrap regression
// ---------------------------------------------------------------------------
test.describe("SSO-launch / token-bootstrap regression", () => {
  /**
   * An advance/complete student who already has a valid session token in
   * localStorage (e.g. from a previous login or an SSO deep-link) must be
   * re-authenticated silently on every page load.
   *
   * PasswordGate.init() flow (password-gate.tsx):
   *   1. Reads STORAGE_KEY ("4ielts_email") from localStorage → { email, token }
   *   2. POSTs to /api-ielts/session/save  — persists token to server DB
   *   3. GETs  /api-ielts/session/check   — verifies session is still active
   *   4. Calls bootstrapTierFromServer()   — fetches tier from /api-ielts/me/tier
   *   5. Sets phase = "unlocked"           — app renders without login form
   *
   * This test simulates step 1 (pre-seeded localStorage), mocks steps 2-4,
   * and asserts step 5: the app unlocks immediately, no login UI is shown,
   * and /session/save was actually called (SSO path exercised).
   */
  test("stored token triggers session/save + session/check and unlocks gate without login UI", async ({
    page,
  }) => {
    const sessionSaveCalls: string[] = [];

    await page.route("**/api-ielts/session/save", (route) => {
      sessionSaveCalls.push(route.request().postData() ?? "");
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.route("**/api-ielts/session/check", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "active", token: "sso-token-xyz" }),
      }),
    );

    await page.route("**/api-ielts/me/tier", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ tier: "advance", authenticated: true }),
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

    await page.route("**/api-ielts/user-data/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ value: "test" }),
      }),
    );

    // Pre-seed the token — simulates a returning user or SSO deep-link
    await page.addInitScript(() => {
      localStorage.setItem(
        "4ielts_email",
        JSON.stringify({ email: "sso@4ielts.com", token: "sso-token-xyz" }),
      );
      localStorage.setItem("lexo_tour_completed", "1");
      try { sessionStorage.setItem("exitCommentDismissed", "1"); } catch { /* ignore */ }
    });

    await page.goto(appUrl("/"));

    // Gate unlocks silently — advance nav is visible without any form interaction
    await expect(
      page.getByRole("link", { name: /Study Mode/i }).first(),
    ).toBeVisible({ timeout: 12_000 });

    // /session/save must have been called — confirms the SSO bootstrap path ran
    expect(sessionSaveCalls.length).toBeGreaterThan(0);

    // Login form must NOT be visible — the user was bootstrapped from the token
    await expect(
      page.getByRole("button", { name: /Log In/i }),
    ).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// T04 — Full intro-auth flow (admin API + DB + browser)
// ---------------------------------------------------------------------------
test.describe("Full intro-auth flow", () => {
  let accessCode = "";
  let testEmail = "";

  test("admin can create an access code", async ({ request }) => {
    const adminPwd = process.env["ADMIN_PASSWORD"] || "";
    test.skip(!adminPwd, "ADMIN_PASSWORD env var not set — skipping admin API tests");

    const res = await request.post(`${ADMIN_URL}/access-codes`, {
      headers: { "x-admin-password": adminPwd },
      data: {},
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.code).toBeTruthy();
    accessCode = body.code as string;
  });

  test("student can register with a valid access code and lands on pending screen", async ({
    page,
    request,
  }) => {
    const adminPwd = process.env["ADMIN_PASSWORD"] || "";
    test.skip(!adminPwd, "ADMIN_PASSWORD env var not set — skipping");
    test.skip(!accessCode, "access code not created — skipping");

    testEmail = uniqueEmail("regok");

    const reg = await request.post(`${AUTH_URL}/register`, {
      data: { email: testEmail, password: "TestPass123!", accessCode },
    });
    expect(reg.ok()).toBeTruthy();
    const regBody = await reg.json();
    expect(regBody.status).toBe("pending");

    await page.addInitScript((em) => {
      localStorage.setItem("lexo-ielts:intro_pending_email", em);
    }, testEmail);

    await page.route("**/api-ielts/auth/intro/check", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "pending" }),
      }),
    );

    await page.goto(appUrl("/"));
    await expect(
      page.getByText(/(pending|awaiting|review|approval)/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("admin can approve the student", async ({ request }) => {
    const adminPwd = process.env["ADMIN_PASSWORD"] || "";
    test.skip(!adminPwd, "ADMIN_PASSWORD env var not set — skipping");
    test.skip(!testEmail, "test email not set — skipping");

    const list = await request.get(`${ADMIN_URL}/students`, {
      headers: { "x-admin-password": adminPwd },
    });
    expect(list.ok()).toBeTruthy();
    const students = (await list.json()) as Array<{ id: number; email: string }>;
    const student = students.find((s) => s.email === testEmail);
    expect(student).toBeTruthy();

    const approve = await request.post(
      `${ADMIN_URL}/students/${student!.id}/approve`,
      { headers: { "x-admin-password": adminPwd }, data: {} },
    );
    expect(approve.ok()).toBeTruthy();
  });

  test("approved student can log in and reaches the app home screen", async ({
    page,
    request,
  }) => {
    const adminPwd = process.env["ADMIN_PASSWORD"] || "";
    test.skip(!adminPwd, "ADMIN_PASSWORD env var not set — skipping");
    test.skip(!testEmail, "test email not set — skipping");

    const login = await request.post(`${AUTH_URL}/login`, {
      data: { email: testEmail, password: "TestPass123!" },
    });
    expect(login.ok()).toBeTruthy();
    const loginBody = await login.json();
    expect(loginBody.status).toBe("approved");
    const { token } = loginBody as { token: string };

    await page.addInitScript(
      ({ em, tok }) => {
        localStorage.setItem("lexo-ielts:intro_email", em);
        localStorage.setItem("lexo-ielts:intro_token", tok);
        localStorage.setItem(
          "4ielts_email",
          JSON.stringify({ email: em, token: tok }),
        );
        localStorage.setItem("lexo-ielts:tier", "intro");
      },
      { em: testEmail, tok: token },
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

    await page.goto(appUrl("/"));
    await expect(
      page.getByText(/Your Tools|Churchill|Listening Practice/i).first(),
    ).toBeVisible({ timeout: 12000 });
  });
});
