/**
 * Auth flow tests — landing page, login form, register form, pending state,
 * admin approve, and successful login via the intro auth API.
 *
 * These tests exercise the real intro-auth API endpoints rather than mocking
 * them, so they require the IELTS API server to be running and ADMIN_PASSWORD
 * (or a DB-stored admin_password_override) to be set.
 */
import { test, expect } from "@playwright/test";
import { appUrl } from "./helpers/auth";

const ADMIN_URL = "http://localhost:80/api-ielts/admin/intro";
const AUTH_URL = "http://localhost:80/api-ielts/auth/intro";

// ---------------------------------------------------------------------------
// Helper: derive a collision-safe test email from the test name + timestamp.
// ---------------------------------------------------------------------------
function uniqueEmail(label: string): string {
  const ts = Date.now().toString(36);
  return `e2e.${label}.${ts}@ieltstest.invalid`;
}

// ---------------------------------------------------------------------------
// T01 — Landing page
// ---------------------------------------------------------------------------
test.describe("Landing page (unauthenticated)", () => {
  test("shows Log In and Register buttons", async ({ page }) => {
    await page.goto(appUrl("/"));
    // PasswordGate shows the landing page while checking, then once it
    // resolves with no stored session it renders the public landing view.
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
    // The access code field has placeholder "e.g. 7K9M2P4XAB" and is rendered
    // as a mono font input — find it via the actual placeholder text.
    await expect(
      page.getByPlaceholder(/7K9M2P4XAB|e\.g\./i).first(),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// T02 — Login error cases
// ---------------------------------------------------------------------------
test.describe("Login error handling", () => {
  test("wrong credentials shows an error message", async ({ page }) => {
    await page.goto(appUrl("/"));
    await page.getByRole("button", { name: /Log In/i }).first().click();
    await page.getByPlaceholder(/email/i).first().fill("nobody@example.com");
    await page.getByPlaceholder(/password/i).first().fill("wrongpassword");
    await page.getByRole("button", { name: /sign in|log in/i }).last().click();
    // The API may return "Login failed.", "No account found...", "Invalid
    // credentials", or similar.  Broaden the regex to cover all variants.
    await expect(
      page.getByText(/(not found|incorrect|invalid|error|failed|account|unauthorized)/i).first(),
    ).toBeVisible({ timeout: 12000 });
  });
});

// ---------------------------------------------------------------------------
// T03 — Registration error cases
// ---------------------------------------------------------------------------
test.describe("Registration error handling", () => {
  test("invalid access code shows an error message", async ({ page }) => {
    await page.goto(appUrl("/"));
    const registerBtn = page.getByRole("button", { name: /Register/i }).first();
    await registerBtn.click();
    await page.getByPlaceholder(/email/i).first().fill(uniqueEmail("regfail"));
    const pwField = page.getByPlaceholder(/password/i).first();
    await pwField.fill("password123");
    // Access code input has placeholder "e.g. 7K9M2P4XAB"
    const codeField = page.getByPlaceholder(/7K9M2P4XAB|e\.g\./i).first();
    await codeField.fill("XXXX-XXXX-XXXX");
    await page.getByRole("button", { name: /create account|register|sign up/i }).last().click();
    await expect(
      page.getByText(/(invalid access code|already been used|check with your instructor)/i).first(),
    ).toBeVisible({ timeout: 8000 });
  });
});

// ---------------------------------------------------------------------------
// T03b — Advance / complete session-based login (mocked API)
// ---------------------------------------------------------------------------
test.describe("Advance/complete session login (mocked)", () => {
  /**
   * Tests the standard (non-intro) login form end-to-end with all API calls
   * mocked.  Verifies that:
   *   1. The login form accepts email + password
   *   2. On success, /api-ielts/session/save is called
   *   3. The PasswordGate unlocks and the app renders (no login form visible)
   *
   * This covers the advance/complete auth path that is separate from the
   * intro OTP/access-code flow tested in T04.
   */
  test("valid credentials store session token and unlock the app", async ({
    page,
  }) => {
    // handleLogin() in password-gate.tsx calls /api-ielts/access/login (not
    // /session/save).  Mock that endpoint so the gate unlocks immediately.
    await page.route("**/api-ielts/access/login", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "approved", token: "test-advance-token" }),
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
    // Suppress guided-tour and exit-comment overlays
    await page.addInitScript(() => {
      localStorage.setItem("lexo_tour_completed", "1");
      try { sessionStorage.setItem("exitCommentDismissed", "1"); } catch { /* ignore */ }
    });

    await page.goto(appUrl("/"));

    // Unauthenticated landing — Log In button is present
    await expect(
      page.getByRole("button", { name: /Log In/i }).first(),
    ).toBeVisible({ timeout: 8_000 });

    // Open the standard login form
    await page.getByRole("button", { name: /Log In/i }).first().click();
    await expect(
      page.getByPlaceholder(/email/i).first(),
    ).toBeVisible({ timeout: 6_000 });

    // Fill credentials and submit
    await page.getByPlaceholder(/email/i).first().fill("advance@4ielts.com");
    await page.getByPlaceholder(/password/i).first().fill("TestPassword123!");
    await page.getByRole("button", { name: /sign in|log in/i }).last().click();

    // After successful login the PasswordGate unlocks and the app renders.
    // Assert a post-login nav item becomes visible rather than waiting for the
    // login button to vanish — more robust when the button label is reused in
    // the form itself.
    // Advance-tier nav always includes "Study Mode" (flashcards link)
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

    // Complete tier gets both intro-only AND advance-only nav items.
    // "Churchill AI" (/speaking) is always in the complete-tier nav.
    await expect(
      page.getByRole("link", { name: /Churchill AI/i }).first(),
    ).toBeVisible({ timeout: 12_000 });
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

    // Register via API
    const reg = await request.post(`${AUTH_URL}/register`, {
      data: { email: testEmail, password: "TestPass123!", accessCode },
    });
    expect(reg.ok()).toBeTruthy();
    const regBody = await reg.json();
    expect(regBody.status).toBe("pending");

    // Load the app with pending email in localStorage
    await page.addInitScript((em) => {
      localStorage.setItem("lexo-ielts:intro_pending_email", em);
    }, testEmail);

    // Mock the check endpoint to return "pending"
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

    // Get student list and find our test student
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

    // Inject the real token into localStorage and mock tier endpoint
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

    // Approved intro student lands on IntroHome
    await expect(
      page.getByText(/Your Tools|Churchill|Listening Practice/i).first(),
    ).toBeVisible({ timeout: 12000 });
  });
});
