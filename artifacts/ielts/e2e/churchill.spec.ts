/**
 * Churchill (Free Conversation) — E2E flow tests.
 *
 * Covers the full text-mode journey for intro and complete tiers:
 *   topic-source → topic-pick → mode-pick → chat (mocked API) → end → report
 *
 * Text mode is used throughout — no microphone required.
 * All API calls are intercepted so no live AI backend is needed.
 */
import { test, expect } from "@playwright/test";
import { loginAsIntro, loginAsAdvanceOrComplete, appUrl } from "./helpers/auth";
import { attachErrorGuard, sseOneDelta } from "./helpers/fixtures";

// ── Shared mock data ─────────────────────────────────────────────────────────

const MOCK_FEEDBACK = {
  feedback: {
    overallBand: 6.0,
    summary: "Good conversational effort on the topic of Travel.",
    scores: {
      fluencyCoherence: { band: 6, comment: "Speaks with some hesitation." },
      lexicalResource: { band: 6, comment: "Adequate vocabulary range." },
      grammaticalRange: { band: 6, comment: "Some grammatical errors present." },
      pronunciation: { band: 6, comment: "Mostly clear pronunciation." },
    },
    grammarMistakes: [
      { original: "I goes", correction: "I go", explanation: "Subject–verb agreement." },
    ],
    vocabularyUpgrades: [],
    sentenceUpgrades: [],
    tips: ["Practise using longer turns.", "Try to elaborate on your ideas."],
    wordCount: 14,
    userTurns: 1,
  },
};

async function setupChurchillMocks(page: ReturnType<typeof test.info> extends never ? never : Parameters<Parameters<typeof test>[1]>[0]["page"]) {
  await page.route("**/api-ielts/conversation/sessions", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ sessions: [] }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.route("**/api-ielts/conversation/chat", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: { "Cache-Control": "no-cache", "X-Accel-Buffering": "no" },
      body: sseOneDelta(
        "Hello! Let's talk about Travel. What do you enjoy most about exploring new places?",
      ),
    }),
  );

  await page.route("**/api-ielts/conversation/feedback", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_FEEDBACK),
    }),
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe("Churchill — intro tier full flow (text mode)", () => {
  test("topic-source → topic-pick → mode-pick → chat → send message → end → session report", async ({
    page,
  }) => {
    const guard = attachErrorGuard(page);
    await loginAsIntro(page, "churchill@test.invalid", "intro");
    await setupChurchillMocks(page);
    await page.goto(appUrl("/free-conversation"));

    // ── topic-source screen ─────────────────────────────────────────────────
    await expect(
      page.getByText(/What would you like to talk about/i),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Choose a topic")).toBeVisible();
    await expect(page.getByText("Your own topic")).toBeVisible();

    // ── topic-pick screen ───────────────────────────────────────────────────
    await page.getByText("Choose a topic").click();
    await expect(page.getByText("Travel")).toBeVisible({ timeout: 5_000 });
    // 30 topic buttons are rendered
    await expect(page.getByText("Technology & AI")).toBeVisible();
    await page.getByText("Travel").click();

    // ── mode-pick screen ────────────────────────────────────────────────────
    await expect(
      page.getByText("How do you want to chat?"),
    ).toBeVisible({ timeout: 5_000 });
    // Selected topic is shown in the badge
    await expect(page.getByText("Topic: Travel")).toBeVisible();
    // Both Voice and Text mode cards are present (use role to avoid strict-mode
    // violations — the mode card renders the label twice inside the button)
    await expect(
      page.getByRole("button", { name: /Voice.*Hands-free/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Text.*chat/i }),
    ).toBeVisible();
    // Start text chat — no microphone required
    await page.getByRole("button", { name: /Text.*chat|Start text chat/i }).click();

    // ── chat screen ─────────────────────────────────────────────────────────
    // Churchill's opening message (from SSE mock) should arrive
    await expect(
      page.getByText(/Hello|Let's talk|Travel|exploring/i).first(),
    ).toBeVisible({ timeout: 12_000 });
    // Text reply area is visible and enabled
    const textarea = page.getByPlaceholder("Type your reply...");
    await expect(textarea).toBeVisible();
    // Send a user message
    await textarea.fill("I love exploring new cultures and tasting local food!");
    await page.getByRole("button", { name: /Send/i }).click();
    // Churchill's reply appears (same mocked stream)
    await expect(
      page.getByText(/Hello|Let's talk|Travel/i).first(),
    ).toBeVisible({ timeout: 10_000 });

    // ── end conversation → report screen ────────────────────────────────────
    await page.getByText("End & Get Feedback").click();
    await expect(page.getByText("Session Report")).toBeVisible({
      timeout: 12_000,
    });
    // The feedback band score from the mock should appear
    await expect(
      page.getByText(/6\.0|overall band|band score/i).first(),
    ).toBeVisible({ timeout: 8_000 });
    // Grammar correction from mock
    await expect(
      page.getByText(/Grammar Corrections|Subject.verb/i).first(),
    ).toBeVisible({ timeout: 5_000 });

    guard.assertClean();
  });

  test("custom topic path: topic-input → mode-pick shows the typed topic", async ({
    page,
  }) => {
    await loginAsIntro(page, "churchillcustom@test.invalid", "intro");
    await setupChurchillMocks(page);
    await page.goto(appUrl("/free-conversation"));

    await expect(page.getByText("Your own topic")).toBeVisible({ timeout: 8_000 });
    await page.getByText("Your own topic").click();

    // topic-input screen
    const topicInput = page.getByPlaceholder(
      /living in Riyadh|favourite TV show|anything you want/i,
    );
    await expect(topicInput).toBeVisible({ timeout: 5_000 });
    await topicInput.fill("Machine learning in healthcare");
    await page.getByText("Continue").click();

    // mode-pick screen — custom topic badge
    await expect(
      page.getByText(/Machine learning in healthcare/i),
    ).toBeVisible({ timeout: 6_000 });
    await expect(page.getByText("How do you want to chat?")).toBeVisible();
  });

  test("complete tier can access Churchill and reaches topic-source", async ({
    page,
  }) => {
    await loginAsAdvanceOrComplete(page, "complete@church.invalid", "complete");
    await setupChurchillMocks(page);
    await page.goto(appUrl("/free-conversation"));

    await expect(
      page.getByText(/What would you like to talk about/i),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText("Not Included in Your Plan"),
    ).not.toBeVisible();
  });

  test("advance tier is blocked from Churchill and sees upgrade CTA", async ({
    page,
  }) => {
    await loginAsAdvanceOrComplete(page, "advance@church.invalid", "advance");
    await page.goto(appUrl("/free-conversation"));

    await expect(
      page.getByText("Not Included in Your Plan"),
    ).toBeVisible({ timeout: 8_000 });
    await expect(
      page.getByRole("link", { name: /Upgrade Your Plan/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Upgrade Your Plan/i }),
    ).toHaveAttribute("href", /wa\.me/);
  });
});
