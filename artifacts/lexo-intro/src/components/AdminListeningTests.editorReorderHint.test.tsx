// @vitest-environment jsdom
//
// Regression test that pins the *independence* of the two touch-only
// "drag the grip / use arrow keys" hints in AdminListeningTests:
//
//   1. The Tests-tab hint, persisted under
//      `churchill-admin-tests-reorder-hint-dismissed`.
//   2. The test-editor hint, persisted under
//      `churchill-admin-test-editor-reorder-hint-dismissed`.
//
// They live in two different React subtrees, are gated by two separate
// `useState`s, and currently use two different localStorage keys so an
// admin who dismisses one still gets to see the other the first time
// they meet that surface. A future refactor that consolidates the keys
// (or re-uses the same state) would silently regress: a touch admin who
// once dismissed the Tests-tab tip would never see the editor tip and
// vice versa, with no automated test catching it.
//
// We mount the real component in jsdom under a simulated touch
// (coarse-pointer) device, mock just enough of the listening admin API
// to render the row list and open the editor, and assert the four
// independence properties spelled out in the task:
//
//   - dismissing the Tests-tab hint must NOT pre-dismiss the editor
//     hint when the editor is opened for the first time;
//   - dismissing the editor hint must persist across editor close +
//     reopen (proves the editor key is being written, not the Tests-tab
//     key);
//   - reloading the Tests-tab surface (we unmount + remount, the
//     React-component equivalent of an admin refreshing the page) keeps
//     the Tests-tab dismissal in place;
//   - and crucially, the two localStorage keys are written and read
//     independently — the editor dismissal does NOT clear the Tests-tab
//     dismissal, and vice versa.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminListeningTests from "./AdminListeningTests";

const TESTS_TAB_HINT_KEY = "churchill-admin-tests-reorder-hint-dismissed";
const EDITOR_HINT_KEY = "churchill-admin-test-editor-reorder-hint-dismissed";

interface ServerTest {
  id: number;
  slug: string;
  sectionId: number;
  title: string;
  description: string;
  questionCount: number;
  segmentCount: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

function row(id: number, slug: string, title: string, sortOrder: number): ServerTest {
  return {
    id,
    slug,
    sectionId: 1,
    title,
    description: "",
    questionCount: 0,
    segmentCount: 0,
    sortOrder,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

// Build a fetch mock that backs the listening admin endpoints we touch:
//   - GET  /admin/tests          → list rows + sections (drives the Tests tab).
//   - GET  /admin/audio-stats    → fired on mount; we don't care about it.
//   - GET  /admin/tests/<slug>   → drives openEditor (returns a full row).
function buildFetchMock(initialTests: ServerTest[]) {
  const store: ServerTest[] = initialTests.map((t) => ({ ...t }));
  const fetchMock = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;

    if (url.includes("/admin/audio-stats")) {
      return new Response(
        JSON.stringify({ scanned: 0, referenced: 0, orphaned: 0, bytes: 0 }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    // openEditor: GET /admin/tests/<slug> — must be checked BEFORE the
    // bare /admin/tests list match below, since both contain that prefix.
    const detailMatch = url.match(/\/admin\/tests\/([^/?#]+)$/);
    if (detailMatch) {
      const slug = decodeURIComponent(detailMatch[1]);
      const found = store.find((t) => t.slug === slug);
      if (!found) {
        return new Response(JSON.stringify({ error: "not found" }), {
          status: 404,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          test: {
            ...found,
            transcript: [{ voice: "alloy", text: "Sample line" }],
            questions: [],
            answerKey: {},
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.includes("/admin/tests")) {
      return new Response(
        JSON.stringify({
          tests: store,
          sections: [
            { id: 1, title: "Section 1", description: "" },
            { id: 2, title: "Section 2", description: "" },
            { id: 3, title: "Section 3", description: "" },
            { id: 4, title: "Section 4", description: "" },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    throw new Error(`Unhandled fetch in test: ${url}`);
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return { fetchMock };
}

// jsdom doesn't ship ResizeObserver / pointer-capture / scrollIntoView,
// and Radix primitives reach for them on mount. The Editor also mounts an
// <audio> element whose .pause() jsdom hasn't implemented (it just logs a
// noisy warning per call). matchMedia is the key behavioural stub: we make
// `(pointer: coarse)` match so the touch-device hint gating in
// AdminListeningTests evaluates `true` and both hints render.
const originalMatchMedia = window.matchMedia;
const originalMediaPause = (window as any).HTMLMediaElement?.prototype?.pause;
const originalMediaPlay = (window as any).HTMLMediaElement?.prototype?.play;

function installTouchDeviceStubs() {
  if (!(globalThis as any).ResizeObserver) {
    (globalThis as any).ResizeObserver = class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
  }
  if (typeof (Element.prototype as any).hasPointerCapture !== "function") {
    (Element.prototype as any).hasPointerCapture = () => false;
  }
  if (typeof (Element.prototype as any).releasePointerCapture !== "function") {
    (Element.prototype as any).releasePointerCapture = () => {};
  }
  if (typeof (Element.prototype as any).scrollIntoView !== "function") {
    (Element.prototype as any).scrollIntoView = () => {};
  }
  // Silence jsdom's "Not implemented: HTMLMediaElement.pause()" noise that
  // fires whenever the editor's hidden <audio> element is touched. Functional
  // audio behaviour is irrelevant to these hint-dismissal assertions.
  if (typeof (window as any).HTMLMediaElement !== "undefined") {
    (window as any).HTMLMediaElement.prototype.pause = function pause() {};
    (window as any).HTMLMediaElement.prototype.play = function play() {
      return Promise.resolve();
    };
  }
  // Force the touch code path: every matchMedia query returns a MediaQueryList
  // whose `matches` is true for `(pointer: coarse)` and false otherwise.
  (window as any).matchMedia = (query: string) => ({
    matches: query.includes("pointer: coarse"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

beforeEach(() => {
  installTouchDeviceStubs();
  // Each test starts with a clean slate so prior dismissals don't leak.
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
  // Restore globals we monkey-patched so a future test in the same worker
  // (or a follow-up suite) starts from a clean baseline rather than
  // inheriting the touch-device + media-element stubs.
  if (originalMatchMedia) {
    (window as any).matchMedia = originalMatchMedia;
  } else {
    delete (window as any).matchMedia;
  }
  if (typeof (window as any).HTMLMediaElement !== "undefined") {
    if (originalMediaPause) {
      (window as any).HTMLMediaElement.prototype.pause = originalMediaPause;
    }
    if (originalMediaPlay) {
      (window as any).HTMLMediaElement.prototype.play = originalMediaPlay;
    }
  }
});

describe("AdminListeningTests — touch reorder hints dismiss independently", () => {
  it("dismissing the Tests-tab hint does not pre-dismiss the editor hint, and vice versa; both dismissals persist independently across reloads", async () => {
    const initial = [row(1, "alpha", "Alpha", 0), row(2, "bravo", "Bravo", 1)];
    buildFetchMock(initial);

    // ── Mount #1: Tests-tab visible, hint should be shown ────────────
    const view = render(<AdminListeningTests onLogout={async () => {}} />);

    // Wait for the row list to render, which also confirms the touch
    // hint effect has run (it's in the same component lifecycle).
    await waitFor(() => {
      expect(screen.getByTestId("test-row-alpha")).toBeTruthy();
    });

    // The Tests-tab tip must be visible because we're a fresh touch
    // device with no prior dismissal recorded.
    expect(screen.getByTestId("reorder-touch-hint")).toBeTruthy();
    // The editor tip is NOT mounted yet — the editor surface only
    // exists once `openEditor` is called.
    expect(screen.queryByTestId("editor-reorder-touch-hint")).toBeNull();

    // Dismiss the Tests-tab tip. After this the tip element disappears
    // AND the Tests-tab key is recorded in localStorage; the editor key
    // must still be untouched.
    fireEvent.click(screen.getByTestId("reorder-touch-hint-dismiss"));
    await waitFor(() => {
      expect(screen.queryByTestId("reorder-touch-hint")).toBeNull();
    });
    expect(window.localStorage.getItem(TESTS_TAB_HINT_KEY)).toBe("1");
    expect(window.localStorage.getItem(EDITOR_HINT_KEY)).toBeNull();

    // ── Open the editor for the first time ──────────────────────────
    fireEvent.click(screen.getAllByText("Edit")[0]);

    // Editor mounts; the editor hint is independent from the just-
    // dismissed Tests-tab hint, so it must be visible on this first
    // visit even though we're on the same device + page load.
    await waitFor(() => {
      expect(screen.getByTestId("editor-reorder-touch-hint")).toBeTruthy();
    });

    // Dismiss the editor hint. Now BOTH dismissals are recorded, but
    // under separate keys (the whole point of this test).
    fireEvent.click(screen.getByTestId("editor-reorder-touch-hint-dismiss"));
    await waitFor(() => {
      expect(screen.queryByTestId("editor-reorder-touch-hint")).toBeNull();
    });
    expect(window.localStorage.getItem(EDITOR_HINT_KEY)).toBe("1");
    expect(window.localStorage.getItem(TESTS_TAB_HINT_KEY)).toBe("1");

    // ── Reopen the editor in the SAME mount ─────────────────────────
    // Go back to the list, click Edit again, and confirm the editor
    // hint stays dismissed. This proves the dismissal is persisted
    // (and not just a one-shot in-memory toggle that resets on re-mount
    // of the editor subtree).
    fireEvent.click(screen.getByText("Back to list"));
    await waitFor(() => {
      expect(screen.getByTestId("test-row-alpha")).toBeTruthy();
    });
    fireEvent.click(screen.getAllByText("Edit")[0]);
    // Wait until the editor surface is rendered again (the Back to list
    // button is unique to the editor view).
    await waitFor(() => {
      expect(screen.getByText("Back to list")).toBeTruthy();
    });
    expect(screen.queryByTestId("editor-reorder-touch-hint")).toBeNull();

    // ── Reload the Tests tab (full unmount + remount) ───────────────
    // This is the closest equivalent in jsdom to the admin refreshing
    // the page. Both dismissals must survive — and critically, neither
    // tip should reappear.
    view.unmount();
    // Re-arm fetch (the unmounted instance closed over the previous
    // mock; the next mount issues fresh GETs and we want them to land
    // against an equivalent backend).
    buildFetchMock(initial);
    render(<AdminListeningTests onLogout={async () => {}} />);

    await waitFor(() => {
      expect(screen.getByTestId("test-row-alpha")).toBeTruthy();
    });

    // Tests-tab tip stays dismissed across reload.
    expect(screen.queryByTestId("reorder-touch-hint")).toBeNull();

    // Open the editor on the fresh mount; editor tip stays dismissed
    // too — proving the editor key is being honoured by the gating
    // effect on a cold start, not just by a stale React state.
    fireEvent.click(screen.getAllByText("Edit")[0]);
    await waitFor(() => {
      expect(screen.getByText("Back to list")).toBeTruthy();
    });
    expect(screen.queryByTestId("editor-reorder-touch-hint")).toBeNull();
  });

  it("if ONLY the editor hint was dismissed previously, the Tests-tab hint still shows on next load (keys are read independently)", async () => {
    // Pre-seed the editor dismissal but leave the Tests-tab key clear.
    // A regression that consolidated the two keys into one would silence
    // BOTH hints here; the correct behaviour is that the Tests-tab tip
    // still appears because its own key was never written.
    window.localStorage.setItem(EDITOR_HINT_KEY, "1");

    const initial = [row(1, "alpha", "Alpha", 0)];
    buildFetchMock(initial);

    render(<AdminListeningTests onLogout={async () => {}} />);

    await waitFor(() => {
      expect(screen.getByTestId("test-row-alpha")).toBeTruthy();
    });

    // The Tests-tab tip must still be visible — its key was untouched.
    expect(screen.getByTestId("reorder-touch-hint")).toBeTruthy();

    // And opening the editor must NOT show the editor tip (its key was
    // pre-set), confirming the editor effect honours its own key only.
    fireEvent.click(screen.getAllByText("Edit")[0]);
    await waitFor(() => {
      expect(screen.getByText("Back to list")).toBeTruthy();
    });
    expect(screen.queryByTestId("editor-reorder-touch-hint")).toBeNull();
  });
});
