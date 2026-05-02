import type { Page } from "@playwright/test";

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
];

const IGNORED_NETWORK: RegExp[] = [
  /favicon\.ico/,
  /\.hot\//,
  /__vite/,
  /sockjs-node/,
  /ws:\/\//,
  /\/vite\//,
  /hot-update/,
];

export interface ErrorGuard {
  consoleErrors: string[];
  networkErrors: string[];
  assertClean(): void;
}

/**
 * Attaches listeners for console errors and 4xx/5xx HTTP responses.
 * Call guard.assertClean() at the end of a happy-path flow to ensure
 * no unexpected errors were emitted.
 */
export function attachErrorGuard(page: Page): ErrorGuard {
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

/** Build a Server-Sent-Events body with a single text delta then DONE. */
export function sseOneDelta(text: string): string {
  return `data: ${JSON.stringify({ delta: text })}\n\ndata: [DONE]\n\n`;
}

/** Build an SSE body that delivers a final `done` payload. */
export function sseDone(payload: Record<string, unknown>): string {
  return `data: ${JSON.stringify({ done: payload })}\n\ndata: [DONE]\n\n`;
}
