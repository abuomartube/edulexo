// @vitest-environment jsdom
//
// Integration test for the rapid-nudge → single-Undo coalescing policy in
// AdminListeningTests.tsx.
//
// `nextCoalesceState` (the pure policy helper) is already covered by unit
// tests in `src/lib/moveUndo.test.ts`. What that doesn't catch is the
// *integrated* path: a real admin holding ArrowDown several times in a
// row on a focused grip handle, and the React component glue that has to
// stay coordinated across each press:
//
//   - the busySections gate (each press waits for the previous /reorder
//     POST to complete before firing the next),
//   - the optimistic local re-render (so press #N+1 sees the post-press-N
//     order, not the original),
//   - the coalesceRef ref + COALESCE_WINDOW_MS window (so the run keeps
//     reusing the very first snapshot as the Undo target),
//   - the "Reordered ..." toast staying mounted across the burst (a stale
//     auto-clear timer from press #1 must not kill the toast for press #4),
//   - and the single /admin/tests/reorder POST on Undo whose body matches
//     the *pre-burst* slug order (not the most recent step's pre-image).
//
// All five of those pieces could silently break in a refactor without any
// existing unit test failing — that's the exact gap this test plugs.
//
// We mount the real component, mock fetch, and assert against the recorded
// POST bodies (server-truth) plus the on-screen toast. This is the closest
// faithful equivalent to the Playwright e2e the task description describes,
// without having to stand up a real browser + API in CI.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminListeningTests from "./AdminListeningTests";

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

interface ReorderCall {
  sectionId: number;
  slugs: string[];
}

// Build a fetch mock that simulates the listening admin endpoints just
// enough to back the React component:
//   - GET  /admin/tests          → returns current `tests` + sections.
//   - GET  /admin/audio-stats    → returns zeroed stats (the component
//                                  fetches this on mount; we don't care).
//   - POST /admin/tests/reorder  → records the call, applies the new
//                                  ordering to the in-memory store, and
//                                  returns 200. This is the "server" the
//                                  test asserts row-truth against on Undo.
function buildFetchMock(initialTests: ServerTest[]) {
  let store: ServerTest[] = initialTests.map((t) => ({ ...t }));
  const reorderCalls: ReorderCall[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
    const method = (init?.method || "GET").toUpperCase();

    if (method === "GET" && url.includes("/admin/audio-stats")) {
      return new Response(
        JSON.stringify({ scanned: 0, referenced: 0, orphaned: 0, bytes: 0 }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (method === "POST" && url.includes("/admin/tests/reorder")) {
      const body = JSON.parse(init!.body as string) as { sectionId: number; slugs: string[] };
      reorderCalls.push({ sectionId: body.sectionId, slugs: body.slugs.slice() });
      const orderIdx = new Map<string, number>(body.slugs.map((s, i) => [s, i]));
      store = store.map((t) =>
        t.sectionId === body.sectionId && orderIdx.has(t.slug)
          ? { ...t, sortOrder: orderIdx.get(t.slug)! }
          : t,
      );
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (method === "GET" && url.includes("/admin/tests")) {
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

    // Anything else — fail loudly so we don't silently accept new traffic
    // from a future code change without realising the test no longer
    // covers what it claims to cover.
    throw new Error(`Unhandled fetch in test: ${method} ${url}`);
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;

  return {
    fetchMock,
    reorderCalls,
    serverSection1Slugs: () =>
      store
        .filter((t) => t.sectionId === 1)
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
        .map((t) => t.slug),
  };
}

// Radix dropdown / popover primitives reach for ResizeObserver and
// PointerEvent on mount; jsdom doesn't ship either. Stub the minimum
// surface so the component renders without throwing on unrelated APIs.
function installBrowserStubs() {
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
  // matchMedia is checked for the touch-device hint in AdminListeningTests.
  // Returning a no-op listener keeps the component on the desktop code path.
  if (typeof window.matchMedia !== "function") {
    (window as any).matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }
}

// Drive an arrow-key nudge through the same handler an admin's keyboard
// would: focus the grip, fire keydown (preventDefault'd inside React), and
// then wait until the resulting POST has been recorded AND the section's
// busy spinner has cleared so the next press isn't dropped by the
// busySections gate. This mirrors the real interactive cadence — the gate
// is exactly the behaviour we're trying to lock down.
async function nudgeDownAndAwait(
  slug: string,
  reorderCalls: ReorderCall[],
  expectedTotalAfter: number,
): Promise<void> {
  const grip = screen.getByTestId(`test-row-grip-${slug}`) as HTMLButtonElement;
  fireEvent.keyDown(grip, { key: "ArrowDown", code: "ArrowDown" });
  await waitFor(() => {
    expect(reorderCalls.length).toBe(expectedTotalAfter);
  });
  await waitFor(() => {
    const g = screen.getByTestId(`test-row-grip-${slug}`) as HTMLButtonElement;
    expect(g.disabled).toBe(false);
  });
}

beforeEach(() => {
  installBrowserStubs();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("AdminListeningTests — rapid arrow-key nudges + single Undo", () => {
  it("4 rapid ArrowDown nudges of the same row collapse into one Undo that reverts to the pre-burst order", async () => {
    // Five tests, all in section 1, in alphabetical order. Holding
    // ArrowDown on `alpha`'s grip will walk it to the bottom across four
    // nudges, and a single Undo click must put it back at the top.
    const initial = [
      row(1, "alpha", "Alpha", 0),
      row(2, "bravo", "Bravo", 1),
      row(3, "charlie", "Charlie", 2),
      row(4, "delta", "Delta", 3),
      row(5, "echo", "Echo", 4),
    ];
    const { reorderCalls, serverSection1Slugs } = buildFetchMock(initial);

    render(<AdminListeningTests onLogout={async () => {}} />);

    // Wait until the initial GET /admin/tests has resolved and the rows
    // have rendered — every subsequent assertion depends on the grip
    // buttons being in the DOM.
    await waitFor(() => {
      expect(screen.getByTestId("test-row-alpha")).toBeTruthy();
      expect(screen.getByTestId("test-row-grip-alpha")).toBeTruthy();
    });

    const originalOrder = ["alpha", "bravo", "charlie", "delta", "echo"];
    expect(serverSection1Slugs()).toEqual(originalOrder);

    // Fire four nudges in rapid succession. Each press waits for the
    // previous POST to land (real admins are gated by busySections too)
    // but the wall-clock gap is well under COALESCE_WINDOW_MS = 1500ms,
    // so the coalesce ref keeps the original snapshot pinned across the
    // whole burst.
    for (let i = 0; i < 4; i++) {
      await nudgeDownAndAwait("alpha", reorderCalls, i + 1);
    }

    // Server-truth: alpha walked to the bottom, the rest shifted up.
    expect(serverSection1Slugs()).toEqual([
      "bravo",
      "charlie",
      "delta",
      "echo",
      "alpha",
    ]);

    // The "Reordered ..." toast must still be mounted (a stale 10s
    // auto-clear timer from press #1 must NOT have killed it) and the
    // Undo affordance must still be live.
    expect(screen.getByText(/^Reordered /)).toBeTruthy();
    const undoButton = screen.getByRole("button", { name: /^Undo/ });
    expect(undoButton).toBeTruthy();

    // ── The headline assertion ─────────────────────────────────────────
    // One click on Undo, one /reorder POST, and the server's row order
    // matches the pre-burst order — proving the entire 4-step run was
    // reverted in a single round-trip rather than four.
    const callCountBeforeUndo = reorderCalls.length;
    expect(callCountBeforeUndo).toBe(4);

    fireEvent.click(undoButton);

    await waitFor(() => {
      expect(reorderCalls.length).toBe(callCountBeforeUndo + 1);
    });

    const undoCall = reorderCalls[reorderCalls.length - 1];
    expect(undoCall.sectionId).toBe(1);
    expect(undoCall.slugs).toEqual(originalOrder);
    expect(serverSection1Slugs()).toEqual(originalOrder);
  });

  it("pausing >COALESCE_WINDOW_MS between nudges produces SEPARATE Undo affordances so each click reverts only the most recent step", async () => {
    // Same fixture, but this time the admin nudges once, waits longer
    // than the coalesce window, then nudges again. The second nudge
    // must start a fresh run, so its Undo button reverts only step #2,
    // not both steps.
    const initial = [
      row(1, "alpha", "Alpha", 0),
      row(2, "bravo", "Bravo", 1),
      row(3, "charlie", "Charlie", 2),
      row(4, "delta", "Delta", 3),
      row(5, "echo", "Echo", 4),
    ];
    const { reorderCalls, serverSection1Slugs } = buildFetchMock(initial);

    render(<AdminListeningTests onLogout={async () => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId("test-row-grip-alpha")).toBeTruthy();
    });

    // Nudge #1 — alpha moves from index 0 to index 1.
    await nudgeDownAndAwait("alpha", reorderCalls, 1);
    const orderAfterFirst = ["bravo", "alpha", "charlie", "delta", "echo"];
    expect(serverSection1Slugs()).toEqual(orderAfterFirst);

    // Pause longer than COALESCE_WINDOW_MS (1500ms) so the next nudge
    // is treated as a *fresh* run rather than a continuation. Real wall
    // clock — the component reads Date.now() directly, so faking timers
    // would not cover the same code path.
    await new Promise((resolve) => setTimeout(resolve, 1700));

    // Nudge #2 — alpha moves from index 1 to index 2.
    await nudgeDownAndAwait("alpha", reorderCalls, 2);
    const orderAfterSecond = ["bravo", "charlie", "alpha", "delta", "echo"];
    expect(serverSection1Slugs()).toEqual(orderAfterSecond);

    // Click the now-current Undo button. Because the coalesce window
    // expired between the two nudges, the active Undo target was
    // re-snapshotted at nudge #2 — so this Undo must restore
    // `orderAfterFirst`, NOT the original pre-burst order.
    const undoButton = screen.getByRole("button", { name: /^Undo/ });
    fireEvent.click(undoButton);

    await waitFor(() => {
      expect(reorderCalls.length).toBe(3);
    });

    const undoCall = reorderCalls[reorderCalls.length - 1];
    expect(undoCall.sectionId).toBe(1);
    expect(undoCall.slugs).toEqual(orderAfterFirst);
    expect(serverSection1Slugs()).toEqual(orderAfterFirst);
    // And critically NOT the pre-burst order — that's what would happen
    // if the coalesce window were ignored / infinite.
    expect(undoCall.slugs).not.toEqual([
      "alpha",
      "bravo",
      "charlie",
      "delta",
      "echo",
    ]);
  });
});
