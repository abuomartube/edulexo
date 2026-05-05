import { test as base, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

// Console errors that are benign in the test environment.
const IGNORED_CONSOLE: RegExp[] = [
  /ChromeDriver/i,
  /chrome-extension/i,
  /favicon\.ico/i,
  /\[dbus\]/i,
  /glib/i,
  /NS_ERROR/i,
  /\[Churchill\]/i,
  /\[FreeConv\]/i,
  /Warning: ReactDOM/i,
  /unstable_scheduleCallback/i,
  /ResizeObserver loop/i,
  // Browser duplicates HTTP failures already tracked by the network listener.
  /Failed to load resource/i,
];

// Network URLs that may legitimately return 4xx/5xx in tests.
const IGNORED_NETWORK: RegExp[] = [
  /favicon\.ico/,
  /\.hot\//,
  /__vite/,
  /sockjs-node/,
  /ws:\/\//,
  /\/vite\//,
  /hot-update/,
  // Replit dev-infrastructure script (not served in test environment)
  /vite-plugin-dev-banner/,
  // Static assets at the root path before Vite base rewrite
  /localhost\/[^/]+\.(png|jpg|jpeg|svg|webp|gif|woff2?|ttf|eot)$/i,
];

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

// Auto-attached to every test; asserts no unexpected errors on teardown.
// Tests that exercise error paths must mock endpoints to return HTTP 2xx
// with an error body so the guard does not catch spurious 4xx responses.
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

/** Build a Server-Sent-Events body with a single text delta then DONE. */
export function sseOneDelta(text: string): string {
  return `data: ${JSON.stringify({ delta: text })}\n\ndata: [DONE]\n\n`;
}

/** Build an SSE body that delivers a final `done` payload. */
export function sseDone(payload: Record<string, unknown>): string {
  return `data: ${JSON.stringify({ done: payload })}\n\ndata: [DONE]\n\n`;
}
