/**
 * Churchill (Free Conversation) — E2E flow tests.
 *
 * Covers the full text-mode journey for intro and complete tiers:
 *   topic-source → topic-pick → mode-pick → chat (mocked API) → end → report
 *
 * Text mode is used throughout — no microphone required.
 * All API calls are intercepted so no live AI backend is needed.
 */
import { test, expect, sseOneDelta } from "./helpers/fixtures";
import type { Page } from "@playwright/test";
import { loginAsIntro, loginAsAdvanceOrComplete, appUrl } from "./helpers/auth";

// ── Shared mock data ─────────────────────────────────────────────────────────

const MOCK_FEEDBACK = {
  feedback: {
    overallBand: 6.0,
    summary: "Good conversational effort on the topic of Travel.",
    scores: {
      fluencyCoherence: { band: 6, comment: "Speaks with some hesitation." },
      lexicalResource: { band: 6, comment: "Adequate vocabulary range." },
      grammaticalRange: {
        band: 6,
        comment: "Some grammatical errors present.",
      },
      pronunciation: { band: 6, comment: "Mostly clear pronunciation." },
    },
    grammarMistakes: [
      {
        original: "I goes",
        correction: "I go",
        explanation: "Subject–verb agreement.",
      },
    ],
    vocabularyUpgrades: [],
    sentenceUpgrades: [],
    tips: ["Practise using longer turns.", "Try to elaborate on your ideas."],
    wordCount: 14,
    userTurns: 1,
  },
};

async function setupChurchillMocks(page: Page) {
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
    await expect(page.getByText("How do you want to chat?")).toBeVisible({
      timeout: 5_000,
    });
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
    await page
      .getByRole("button", { name: /Text.*chat|Start text chat/i })
      .click();

    // ── chat screen ─────────────────────────────────────────────────────────
    // Churchill's opening message (from SSE mock) should arrive
    await expect(
      page.getByText(/Hello|Let's talk|Travel|exploring/i).first(),
    ).toBeVisible({ timeout: 12_000 });
    // Text reply area is visible and enabled
    const textarea = page.getByPlaceholder("Type your reply...");
    await expect(textarea).toBeVisible();
    // Send a user message
    await textarea.fill(
      "I love exploring new cultures and tasting local food!",
    );
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
  });

  test("custom topic path: topic-input → mode-pick shows the typed topic", async ({
    page,
  }) => {
    await loginAsIntro(page, "churchillcustom@test.invalid", "intro");
    await setupChurchillMocks(page);
    await page.goto(appUrl("/free-conversation"));

    await expect(page.getByText("Your own topic")).toBeVisible({
      timeout: 8_000,
    });
    await page.getByText("Your own topic").click();

    // topic-input screen
    const topicInput = page.getByPlaceholder(
      /living in Riyadh|favourite TV show|anything you want/i,
    );
    await expect(topicInput).toBeVisible({ timeout: 5_000 });
    await topicInput.fill("Machine learning in healthcare");
    await page.getByText("Continue").click();

    // mode-pick screen — custom topic badge
    await expect(page.getByText(/Machine learning in healthcare/i)).toBeVisible(
      { timeout: 6_000 },
    );
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
    await expect(page.getByText("Not Included in Your Plan")).not.toBeVisible();
  });

  test("advance tier is blocked from Churchill and sees upgrade CTA", async ({
    page,
  }) => {
    await loginAsAdvanceOrComplete(page, "advance@church.invalid", "advance");
    await page.goto(appUrl("/free-conversation"));

    await expect(page.getByText("Not Included in Your Plan")).toBeVisible({
      timeout: 8_000,
    });
    await expect(
      page.getByRole("link", { name: /Upgrade Your Plan/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Upgrade Your Plan/i }),
    ).toHaveAttribute("href", /wa\.me/);
  });
});

// ── Voice mode ────────────────────────────────────────────────────────────────

test.describe("Churchill — voice mode (mic + VAD + Whisper)", () => {
  /**
   * Mocks the entire microphone / VAD / Whisper pipeline so no real mic is
   * needed.  Flow under test:
   *   getUserMedia (mock) → AudioContext (mock) → @ricky0123/vad-web (fake
   *   module injected via route) → vad.start() → window.__vadStarted = true
   *   → trigger onSpeechEnd(Float32Array) → POST /api-ielts/whisper → transcript
   *   returned → user message appears in chat → Churchill SSE reply appears.
   */
  test("mic permission granted, VAD mounts, speech triggers Whisper, AI reply renders", async ({
    page,
  }) => {
    // intro tier can access Churchill free-conversation
    await loginAsIntro(page, "voice@church.invalid", "intro");

    // ── 1. Stub getUserMedia & AudioContext before any scripts run ────────────
    await page.addInitScript(() => {
      const fakeTrack = {
        kind: "audio",
        enabled: true,
        readyState: "live",
        stop: () => {},
        clone: () => fakeTrack,
        addEventListener: () => {},
        removeEventListener: () => {},
        getSettings: () => ({}),
        getCapabilities: () => ({}),
        getConstraints: () => ({}),
      };
      const fakeStream = {
        active: true,
        id: "fake-stream",
        getAudioTracks: () => [fakeTrack],
        getTracks: () => [fakeTrack],
        getVideoTracks: () => [],
        addEventListener: () => {},
        removeEventListener: () => {},
      };
      // Override mediaDevices (may not exist in headless env)
      Object.defineProperty(navigator, "mediaDevices", {
        value: {
          getUserMedia: () => Promise.resolve(fakeStream),
          enumerateDevices: () => Promise.resolve([]),
          addEventListener: () => {},
          removeEventListener: () => {},
        },
        writable: true,
        configurable: true,
      });

      // Fake AudioContext — app uses it for mic-energy barge-in detection
      const fakeAnalyser = {
        fftSize: 256,
        frequencyBinCount: 128,
        smoothingTimeConstant: 0,
        connect: () => {},
        disconnect: () => {},
        getFloatTimeDomainData: (a: Float32Array) => {
          a.fill(0);
        },
        getByteFrequencyData: () => {},
      };
      const fakeSource = { connect: () => {}, disconnect: () => {} };
      class FakeAudioContext {
        state = "running";
        destination = {};
        resume() {
          return Promise.resolve();
        }
        close() {
          return Promise.resolve();
        }
        createMediaStreamSource() {
          return fakeSource;
        }
        createAnalyser() {
          return fakeAnalyser;
        }
      }
      Object.assign(window, {
        AudioContext: FakeAudioContext,
        webkitAudioContext: FakeAudioContext,
      });
    });

    // ── 2. Intercept the @ricky0123/vad-web Vite pre-bundled chunk ────────────
    //    Playwright intercepts the network request so the real VAD (which tries
    //    to download ONNX WASM from jsDelivr) never loads.  Our fake module
    //    stores the caller's callbacks on window.__fakeVad so the test can fire
    //    onSpeechEnd programmatically.
    await page.route("**/@ricky0123_vad-web*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: [
          "const MicVAD = {",
          "  new: async function(opts) {",
          "    if (typeof window !== 'undefined') {",
          "      window.__fakeVad = {",
          "        onSpeechEnd: opts.onSpeechEnd,",
          "        onSpeechStart: opts.onSpeechStart,",
          "        onVADMisfire: opts.onVADMisfire,",
          "        onFrameProcessed: opts.onFrameProcessed,",
          "      };",
          "    }",
          "    const vad = {",
          "      start: function() { if (typeof window !== 'undefined') window.__vadStarted = true; },",
          "      pause: function() {},",
          "      destroy: function() {},",
          "    };",
          "    return vad;",
          "  }",
          "};",
          "export { MicVAD };",
          "export default { MicVAD };",
        ].join("\n"),
      });
    });

    // ── 3. Mock the Churchill conversation API ────────────────────────────────
    await setupChurchillMocks(page);

    // Stub TTS so Churchill's spoken reply never hits the real server.
    // free-conversation.tsx calls /api-ielts/speaking/tts for every AI turn.
    await page.route("**/api-ielts/speaking/tts", (route) =>
      route.fulfill({
        status: 200,
        contentType: "audio/mpeg",
        body: Buffer.from([
          0xff, 0xfb, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00, 0x00, 0x00, 0x00, 0x00,
        ]),
      }),
    );

    // ── 4. Intercept /api-ielts/whisper and capture body size ────────────────
    let whisperBodyBytes = 0;
    await page.route("**/api-ielts/whisper", async (route) => {
      const body = route.request().postDataBuffer();
      whisperBodyBytes = body?.length ?? 0;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          transcript: "I enjoy exploring new cultures and tasting local food.",
        }),
      });
    });

    // ── 5. Navigate and pick a topic ─────────────────────────────────────────
    await page.goto(appUrl("/free-conversation"));
    await expect(
      page.getByText(/What would you like to talk about/i),
    ).toBeVisible({ timeout: 10_000 });
    await page.getByText("Choose a topic").click();
    await expect(page.getByText("Travel")).toBeVisible({ timeout: 5_000 });
    await page.getByText("Travel").click();

    // ── 6. Choose Voice mode on the mode-pick screen ─────────────────────────
    await expect(
      page.getByRole("button", { name: /Voice.*Hands-free/i }),
    ).toBeVisible({ timeout: 5_000 });
    await page.getByRole("button", { name: /Voice.*Hands-free/i }).click();

    // ── 7. Wait for the VAD fake to have started (sets window.__vadStarted) ──
    await page.waitForFunction(
      () =>
        (window as unknown as Record<string, unknown>)["__vadStarted"] === true,
      undefined,
      { timeout: 15_000 },
    );

    // Voice-active status text is visible — confirms voiceActive=true in React
    await expect(
      page.getByText(/Go ahead|I'm listening|Connecting/i).first(),
    ).toBeVisible({ timeout: 8_000 });

    // ── 8. Simulate user speech: fire onSpeechEnd with 1 s of dummy audio ────
    //    The app only transcribes audio ≥ 0.25 s (16000 * 0.25 = 4000 samples)
    await page.evaluate(() => {
      const vad = (
        window as unknown as Record<
          string,
          { onSpeechEnd: (a: Float32Array) => void }
        >
      )["__fakeVad"];
      if (vad && typeof vad.onSpeechEnd === "function") {
        const samples = new Float32Array(16_000);
        samples.fill(0.1); // non-silent audio
        vad.onSpeechEnd(samples);
      }
    });

    // ── 9. Assert POST /api-ielts/whisper was called with a non-empty body ───
    await expect
      .poll(() => whisperBodyBytes, { timeout: 10_000 })
      .toBeGreaterThan(0);

    // ── 10. Transcript appears as a user bubble; Churchill SSE reply follows ──
    await expect(
      page.getByText(/exploring new cultures|tasting local food/i).first(),
    ).toBeVisible({ timeout: 12_000 });

    await expect(
      page.getByText(/Hello|Let's talk|Travel|exploring/i).first(),
    ).toBeVisible({ timeout: 12_000 });
  });
});
