import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

// ── Allowlists ────────────────────────────────────────────────────────────────
// Console-error messages that are known-benign in the test environment.
const IGNORED_CONSOLE: RegExp[] = [
  /ChromeDriver/i,
  /chrome-extension/i,
  /favicon\.ico/i,
  /\[dbus\]/i,
  /glib/i,
  /NS_ERROR/i,
  // App-level diagnostic logs that intentionally write to console.error
  /\[Churchill\]/i,
  /\[FreeConv\]/i,
  // React internal noise in dev builds
  /Warning: ReactDOM/i,
  /unstable_scheduleCallback/i,
  /ResizeObserver loop/i,
  // "Failed to load resource" console messages are browser-generated duplicates
  // of HTTP response failures already tracked by the network response listener.
  // Ignoring them here avoids double-counting and false positives from
  // infrastructure 502s (Replit dev banner, logo at root path, etc.).
  // All real API failures are still caught via the network listener.
  /Failed to load resource/i,
];

// Network response URLs that may legitimately return 4xx/5xx in tests.
// Keep this list narrowly scoped: only Vite/HMR internals, browser-injected
// requests, Replit dev-infrastructure, and static asset files that browsers
// request automatically and are unrelated to application logic.
const IGNORED_NETWORK: RegExp[] = [
  /favicon\.ico/,
  /\.hot\//,
  /__vite/,
  /sockjs-node/,
  /ws:\/\//,
  /\/vite\//,
  /hot-update/,
  // Replit development infrastructure scripts (unavailable in test environment)
  /vite-plugin-dev-banner/,
  // Static image/font assets requested at the root path before Vite rewrites
  // the base — these are never API calls and failures are harmless in tests
  /localhost\/[^/]+\.(png|jpg|jpeg|svg|webp|gif|woff2?|ttf|eot)$/i,
];

// ── ErrorGuard ────────────────────────────────────────────────────────────────

export interface ErrorGuard {
  consoleErrors: string[];
  networkErrors: string[];
  assertClean(): void;
}

function createErrorGuard(page: Page): ErrorGuard {
  const guard: ErrorGuard = {
    consoleErrors: [],
    networkErrors: [],
    assertClean() {
      const errs: string[] = [];
      if (guard.consoleErrors.length > 0)
        errs.push(`Console errors:\n  ${guard.consoleErrors.join("\n  ")}`);
      if (guard.networkErrors.length > 0)
        errs.push(`Network errors:\n  ${guard.networkErrors.join("\n  ")}`);
      if (errs.length > 0) throw new Error(errs.join("\n\n"));
    },
  };

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (IGNORED_CONSOLE.some((p) => p.test(text))) return;
    guard.consoleErrors.push(text);
  });

  page.on("response", (response) => {
    const status = response.status();
    const url = response.url();
    if (status < 400) return;
    if (IGNORED_NETWORK.some((p) => p.test(url))) return;
    guard.networkErrors.push(`HTTP ${status} ${url}`);
  });

  return guard;
}

// ── Custom test fixture ───────────────────────────────────────────────────────
// `errorGuard` is auto-attached to every test and asserts clean on teardown.
// Tests that intentionally trigger error-path flows must mock the relevant
// endpoints to return HTTP 2xx with an error body (avoiding false 4xx hits).

type TestFixtures = { errorGuard: ErrorGuard };

export const test = base.extend<TestFixtures>({
  errorGuard: [
    async ({ page }, use) => {
      const guard = createErrorGuard(page);
      await use(guard);
      guard.assertClean();
    },
    { auto: true },
  ],
});

export { expect };
export type { Page };

// ── SSE helpers ───────────────────────────────────────────────────────────────

/** Build a Server-Sent-Events body with a single text delta then DONE. */
export function sseOneDelta(text: string): string {
  return `data: ${JSON.stringify({ delta: text })}\n\ndata: [DONE]\n\n`;
}

/** Build an SSE body that delivers a final `done` payload. */
export function sseDone(payload: Record<string, unknown>): string {
  return `data: ${JSON.stringify({ done: payload })}\n\ndata: [DONE]\n\n`;
}
