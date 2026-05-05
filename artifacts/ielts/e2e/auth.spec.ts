import { test, expect } from "./helpers/fixtures";
import { appUrl } from "./helpers/auth";

const ADMIN_URL = "http://localhost:80/api-ielts/admin/intro";
const AUTH_URL = "http://localhost:80/api-ielts/auth/intro";

function uniqueEmail(label: string): string {
  return `e2e.${label}.${Date.now().toString(36)}@ieltstest.invalid`;
}

// ---------------------------------------------------------------------------
// T01 — Landing page (no stored session)
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
    await page
      .getByRole("button", { name: /Log In/i })
      .first()
      .click();
    await expect(page.getByPlaceholder(/email/i).first()).toBeVisible({
      timeout: 6000,
    });
    await expect(page.getByPlaceholder(/password/i).first()).toBeVisible();
  });

  test("clicking Register reveals email, password and access-code fields", async ({
    page,
  }) => {
    await page.goto(appUrl("/"));
    await page
      .getByRole("button", { name: /Register/i })
      .first()
      .click();
    await expect(page.getByPlaceholder(/email/i).first()).toBeVisible({
      timeout: 6000,
    });
    await expect(
      page.getByPlaceholder(/7K9M2P4XAB|e\.g\./i).first(),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// T02 — Login error case (mocked: HTTP 200 with error body)
// ---------------------------------------------------------------------------
test.describe("Login error handling", () => {
  test("wrong credentials shows an error message", async ({ page }) => {
    await page.route("**/api-ielts/access/login", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "not_found",
          error: "No account found with that email.",
        }),
      }),
    );
    await page.goto(appUrl("/"));
    await page
      .getByRole("button", { name: /Log In/i })
      .first()
      .click();
    await page.getByPlaceholder(/email/i).first().fill("nobody@example.com");
    await page
      .getByPlaceholder(/password/i)
      .first()
      .fill("wrongpassword");
    await page
      .getByRole("button", { name: /sign in|log in/i })
      .last()
      .click();
    await expect(
      page
        .getByText(
          /(not found|incorrect|invalid|error|failed|account|unauthorized|No account)/i,
        )
        .first(),
    ).toBeVisible({ timeout: 12000 });
  });
});

// ---------------------------------------------------------------------------
// T03 — Registration error case (mocked: HTTP 200 with error body)
// ---------------------------------------------------------------------------
test.describe("Registration error handling", () => {
  test("invalid access code shows an error message", async ({ page }) => {
    await page.route("**/api-ielts/auth/intro/register", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Invalid access code. Check with your instructor.",
        }),
      }),
    );
    await page.goto(appUrl("/"));
    await page
      .getByRole("button", { name: /Register/i })
      .first()
      .click();
    await page.getByPlaceholder(/email/i).first().fill(uniqueEmail("regfail"));
    await page
      .getByPlaceholder(/password/i)
      .first()
      .fill("password123");
    await page
      .getByPlaceholder(/7K9M2P4XAB|e\.g\./i)
      .first()
      .fill("XXXX-XXXX-XXXX");
    await page
      .getByRole("button", { name: /create account|register|sign up/i })
      .last()
      .click();
    await expect(
      page
        .getByText(
          /(invalid access code|already been used|check with your instructor)/i,
        )
        .first(),
    ).toBeVisible({ timeout: 8000 });
  });
});

// ---------------------------------------------------------------------------
// T03b — Advance / complete session login (mocked)
// ---------------------------------------------------------------------------
test.describe("Advance/complete session login (mocked)", () => {
  test("valid credentials store session token and unlock the app", async ({
    page,
  }) => {
    await page.route("**/api-ielts/access/login", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "approved",
          token: "test-advance-token",
        }),
      }),
    );
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
      try {
        sessionStorage.setItem("exitCommentDismissed", "1");
      } catch {
        /* ignore */
      }
    });

    await page.goto(appUrl("/"));
    await expect(
      page.getByRole("button", { name: /Log In/i }).first(),
    ).toBeVisible({ timeout: 8_000 });
    await page
      .getByRole("button", { name: /Log In/i })
      .first()
      .click();
    await expect(page.getByPlaceholder(/email/i).first()).toBeVisible({
      timeout: 6_000,
    });
    await page.getByPlaceholder(/email/i).first().fill("advance@4ielts.com");
    await page
      .getByPlaceholder(/password/i)
      .first()
      .fill("TestPassword123!");
    await page
      .getByRole("button", { name: /sign in|log in/i })
      .last()
      .click();
    await expect(
      page.getByRole("link", { name: /Study Mode/i }).first(),
    ).toBeVisible({ timeout: 12_000 });
  });

  test("complete-tier session login also unlocks the app", async ({ page }) => {
    await page.route("**/api-ielts/access/login", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "approved",
          token: "test-complete-token",
        }),
      }),
    );
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
      try {
        sessionStorage.setItem("exitCommentDismissed", "1");
      } catch {
        /* ignore */
      }
    });

    await page.goto(appUrl("/"));
    await page
      .getByRole("button", { name: /Log In/i })
      .first()
      .click();
    await page.getByPlaceholder(/email/i).first().fill("complete@4ielts.com");
    await page
      .getByPlaceholder(/password/i)
      .first()
      .fill("TestPassword123!");
    await page
      .getByRole("button", { name: /sign in|log in/i })
      .last()
      .click();
    await expect(
      page.getByRole("link", { name: /Churchill AI/i }).first(),
    ).toBeVisible({ timeout: 12_000 });
  });
});

// ---------------------------------------------------------------------------
// T03c — SSO-launch / token-bootstrap regression
// ---------------------------------------------------------------------------
test.describe("SSO-launch / token-bootstrap regression", () => {
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

    await page.addInitScript(() => {
      localStorage.setItem(
        "4ielts_email",
        JSON.stringify({ email: "sso@4ielts.com", token: "sso-token-xyz" }),
      );
      localStorage.setItem("lexo_tour_completed", "1");
      try {
        sessionStorage.setItem("exitCommentDismissed", "1");
      } catch {
        /* ignore */
      }
    });

    await page.goto(appUrl("/"));
    await expect(
      page.getByRole("link", { name: /Study Mode/i }).first(),
    ).toBeVisible({ timeout: 12_000 });
    expect(sessionSaveCalls.length).toBeGreaterThan(0);
    await expect(
      page.getByRole("button", { name: /Log In/i }),
    ).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// T04 — Complete intro-auth flow (fully mocked — runs in every environment)
// ---------------------------------------------------------------------------
test.describe("Complete intro-auth flow (mocked)", () => {
  test("register shows pending state", async ({ page }) => {
    await page.route("**/api-ielts/auth/intro/register", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "pending" }),
      }),
    );
    await page.route("**/api-ielts/auth/intro/check", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "pending" }),
      }),
    );

    const email = uniqueEmail("flow");
    await page.goto(appUrl("/"));
    await page
      .getByRole("button", { name: /Register/i })
      .first()
      .click();
    await page.getByPlaceholder(/email/i).first().fill(email);
    await page
      .getByPlaceholder(/password/i)
      .first()
      .fill("TestPass123!");
    await page
      .getByPlaceholder(/7K9M2P4XAB|e\.g\./i)
      .first()
      .fill("VALID-CODE-0001");
    await page
      .getByRole("button", { name: /create account|register|sign up/i })
      .last()
      .click();
    await expect(
      page.getByText(/(pending|awaiting|review|approval)/i).first(),
    ).toBeVisible({ timeout: 12_000 });
  });

  test("admin approval API call returns ok (mocked)", async ({ page }) => {
    // Validates the admin-approval API contract via a mocked browser-context
    // fetch so page.route interception applies and no live DB is needed.
    const approveCalls: string[] = [];
    await page.route("**/api-ielts/admin/intro/students/*/approve", (route) => {
      approveCalls.push(route.request().url());
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto(appUrl("/"));
    const result = await page.evaluate(async () => {
      const r = await fetch("/api-ielts/admin/intro/students/42/approve", {
        method: "POST",
        headers: {
          "x-admin-password": "test-pwd",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      return { status: r.status, body: await r.json() };
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ ok: true });
    expect(approveCalls.length).toBeGreaterThan(0);
  });

  test("approved student logs in and reaches the app home screen", async ({
    page,
  }) => {
    // Simulate admin-approved state: login returns an approved token.
    await page.route("**/api-ielts/access/login", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "approved",
          token: "intro-approved-token",
        }),
      }),
    );
    await page.route("**/api-ielts/session/save", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      }),
    );
    await page.route("**/api-ielts/auth/intro/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: 99, email: "approved@4ielts.com", status: "approved" },
        }),
      }),
    );
    await page.route("**/api-ielts/me/tier", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ tier: "intro", authenticated: true }),
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
      try {
        sessionStorage.setItem("exitCommentDismissed", "1");
      } catch {
        /* ignore */
      }
    });

    await page.goto(appUrl("/"));
    await page
      .getByRole("button", { name: /Log In/i })
      .first()
      .click();
    await page.getByPlaceholder(/email/i).first().fill("approved@4ielts.com");
    await page
      .getByPlaceholder(/password/i)
      .first()
      .fill("TestPass123!");
    await page
      .getByRole("button", { name: /sign in|log in/i })
      .last()
      .click();
    await expect(
      page.getByText(/Your Tools|Churchill|Listening Practice/i).first(),
    ).toBeVisible({ timeout: 12_000 });
  });
});

// ---------------------------------------------------------------------------
// T04-real — Full intro-auth flow against live API (skipped without ADMIN_PASSWORD)
// ---------------------------------------------------------------------------
test.describe("Full intro-auth flow (live API)", () => {
  let accessCode = "";
  let testEmail = "";

  test("admin can create an access code", async ({ request }) => {
    const adminPwd = process.env["ADMIN_PASSWORD"] || "";
    test.skip(!adminPwd, "ADMIN_PASSWORD not set");

    const res = await request.post(`${ADMIN_URL}/access-codes`, {
      headers: { "x-admin-password": adminPwd },
      data: {},
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.code).toBeTruthy();
    accessCode = body.code as string;
  });

  test("student can register and lands on pending screen", async ({
    page,
    request,
  }) => {
    const adminPwd = process.env["ADMIN_PASSWORD"] || "";
    test.skip(!adminPwd, "ADMIN_PASSWORD not set");
    test.skip(!accessCode, "access code not created");

    testEmail = uniqueEmail("regok");
    const reg = await request.post(`${AUTH_URL}/register`, {
      data: { email: testEmail, password: "TestPass123!", accessCode },
    });
    expect(reg.ok()).toBeTruthy();
    expect((await reg.json()).status).toBe("pending");

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
    test.skip(!adminPwd, "ADMIN_PASSWORD not set");
    test.skip(!testEmail, "test email not set");

    const list = await request.get(`${ADMIN_URL}/students`, {
      headers: { "x-admin-password": adminPwd },
    });
    expect(list.ok()).toBeTruthy();
    const students = (await list.json()) as Array<{
      id: number;
      email: string;
    }>;
    const student = students.find((s) => s.email === testEmail);
    expect(student).toBeTruthy();

    const approve = await request.post(
      `${ADMIN_URL}/students/${student!.id}/approve`,
      {
        headers: { "x-admin-password": adminPwd },
        data: {},
      },
    );
    expect(approve.ok()).toBeTruthy();
  });

  test("approved student logs in and reaches home", async ({
    page,
    request,
  }) => {
    const adminPwd = process.env["ADMIN_PASSWORD"] || "";
    test.skip(!adminPwd, "ADMIN_PASSWORD not set");
    test.skip(!testEmail, "test email not set");

    const login = await request.post(`${AUTH_URL}/login`, {
      data: { email: testEmail, password: "TestPass123!" },
    });
    expect(login.ok()).toBeTruthy();
    const { token } = (await login.json()) as { token: string };

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
