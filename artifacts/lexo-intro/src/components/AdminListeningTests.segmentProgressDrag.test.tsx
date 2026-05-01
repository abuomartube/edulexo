// @vitest-environment jsdom
//
// Regression test for the per-segment progress bar in the listening test
// editor: dragging the bar (mousedown + mousemove + mouseup, or the touch
// equivalent) must scrub the playhead in real time, not just on click.
//
// Click-to-seek was already shipped via an `onClick` handler on the bar.
// That handler has been replaced by pointer-event handlers so the bar
// behaves like a normal media scrubber. This test pins the new behaviour
// in three slices that the old click-only implementation could not pass:
//
//   1. A pointerdown still seeks (covers the "single tap" case so we
//      don't regress the previously-shipped click-to-seek UX).
//   2. A pointermove WHILE the pointer is captured continues to seek —
//      this is the crux of "drag to scrub" and is the part that used to
//      do nothing.
//   3. A pointermove WITHOUT a prior pointerdown (i.e. just hovering
//      across the bar) does NOT move the playhead, so passive cursor
//      movement over the editor never accidentally rewinds audio.
//
// We mount the real component in jsdom, mock just enough of the listening
// admin API to render a row and open its editor, and stub the <audio>
// element so `playSegment` can transition into the `"playing"` state
// (which is what makes the per-segment progress bar render at all).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

// Backs the listening admin endpoints we touch:
//   - GET  /admin/audio-stats           → fired on mount; ignored.
//   - GET  /admin/tests                 → list rows + sections.
//   - GET  /admin/tests/<slug>          → openEditor payload.
//   - POST /admin/preview-segment       → returns a fake audio URL so
//                                         playSegment can call audio.play().
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

    if (url.includes("/admin/preview-segment")) {
      return new Response(JSON.stringify({ url: "fake-segment.mp3" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

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
            transcript: [{ voice: "alloy", text: "Sample line one" }],
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

// Track mock audio currentTime writes across the suite so each test can
// assert on the seek values produced by the bar's pointer handlers.
let lastAudioCurrentTime = 0;
const currentTimeWrites: number[] = [];

const originalMediaPause = (window as any).HTMLMediaElement?.prototype?.pause;
const originalMediaPlay = (window as any).HTMLMediaElement?.prototype?.play;
const originalCurrentTimeDescriptor = Object.getOwnPropertyDescriptor(
  (window as any).HTMLMediaElement.prototype,
  "currentTime",
);
const originalDurationDescriptor = Object.getOwnPropertyDescriptor(
  (window as any).HTMLMediaElement.prototype,
  "duration",
);

function installAudioStubs() {
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
  if (typeof (Element.prototype as any).setPointerCapture !== "function") {
    (Element.prototype as any).setPointerCapture = () => {};
  }
  if (typeof (Element.prototype as any).releasePointerCapture !== "function") {
    (Element.prototype as any).releasePointerCapture = () => {};
  }
  if (typeof (Element.prototype as any).scrollIntoView !== "function") {
    (Element.prototype as any).scrollIntoView = () => {};
  }

  // Make play() resolve so playSegment transitions to "playing" (which is
  // what gates the per-segment progress bar's `showProgress`).
  (window as any).HTMLMediaElement.prototype.pause = function pause() {};
  (window as any).HTMLMediaElement.prototype.play = function play() {
    return Promise.resolve();
  };

  // Pretend the audio is 100s long with the playhead at 25s, so the
  // progress bar's bounds are well-defined and seeks land at predictable
  // positions. We also record every `currentTime` write so the test can
  // assert that pointer events actually move the playhead.
  Object.defineProperty((window as any).HTMLMediaElement.prototype, "duration", {
    configurable: true,
    get() {
      return 100;
    },
  });
  Object.defineProperty((window as any).HTMLMediaElement.prototype, "currentTime", {
    configurable: true,
    get() {
      return lastAudioCurrentTime;
    },
    set(value: number) {
      lastAudioCurrentTime = value;
      currentTimeWrites.push(value);
    },
  });
}

function uninstallAudioStubs() {
  if (typeof (window as any).HTMLMediaElement !== "undefined") {
    if (originalMediaPause) {
      (window as any).HTMLMediaElement.prototype.pause = originalMediaPause;
    }
    if (originalMediaPlay) {
      (window as any).HTMLMediaElement.prototype.play = originalMediaPlay;
    }
    if (originalCurrentTimeDescriptor) {
      Object.defineProperty(
        (window as any).HTMLMediaElement.prototype,
        "currentTime",
        originalCurrentTimeDescriptor,
      );
    }
    if (originalDurationDescriptor) {
      Object.defineProperty(
        (window as any).HTMLMediaElement.prototype,
        "duration",
        originalDurationDescriptor,
      );
    }
  }
}

// jsdom doesn't lay out elements, so getBoundingClientRect() returns a
// zero-sized rect by default — and the bar's handlers bail on a zero-
// width rect. Pin a 200px-wide rect at x=0 so a clientX of N maps
// linearly to N/200 of the segment's duration (= N/2 seconds with our
// 100s mock duration).
function pinBarRect(bar: HTMLElement) {
  bar.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 200,
      bottom: 8,
      width: 200,
      height: 8,
      toJSON() {
        return this;
      },
    }) as DOMRect;
}

beforeEach(() => {
  installAudioStubs();
  lastAudioCurrentTime = 0;
  currentTimeWrites.length = 0;
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  uninstallAudioStubs();
  window.localStorage.clear();
});

// Open the editor for the first test row, click Play on segment 0, then
// wait until the per-segment progress bar appears (i.e. preview state is
// "playing"). Returns the bar element, with its bounding rect pinned.
async function mountEditorAndStartPlayback(): Promise<HTMLElement> {
  const initial = [row(1, "alpha", "Alpha", 0)];
  buildFetchMock(initial);
  render(<AdminListeningTests onLogout={async () => {}} />);

  await waitFor(() => {
    expect(screen.getByTestId("test-row-alpha")).toBeTruthy();
  });

  fireEvent.click(screen.getAllByText("Edit")[0]);
  await waitFor(() => {
    expect(screen.getByText("Back to list")).toBeTruthy();
  });

  // Click the per-segment Play button (the only "Preview segment" button
  // in the editor for our single-segment fixture).
  const playButton = screen.getByLabelText("Preview segment");
  await act(async () => {
    fireEvent.click(playButton);
  });

  // The bar only renders once preview is "playing".
  const bar = await waitFor(() => {
    const el = screen.getByTestId("segment-progress-0").querySelector("[role='slider']");
    expect(el).toBeTruthy();
    return el as HTMLElement;
  });
  pinBarRect(bar);
  return bar;
}

describe("AdminListeningTests — segment progress bar drag scrubbing", () => {
  it("a pointerdown on the bar still seeks (single-click case keeps working)", async () => {
    const bar = await mountEditorAndStartPlayback();

    // Click 50% across the 200px bar → playhead should jump to 50s
    // (= 0.5 × 100s mock duration).
    fireEvent.pointerDown(bar, { pointerId: 1, clientX: 100 });

    expect(currentTimeWrites.length).toBeGreaterThanOrEqual(1);
    expect(currentTimeWrites[currentTimeWrites.length - 1]).toBeCloseTo(50, 5);
  });

  it("dragging across the bar moves the playhead in real time", async () => {
    const bar = await mountEditorAndStartPlayback();

    // We need hasPointerCapture to return true after setPointerCapture
    // for the move handler to seek. The default jsdom stub returns
    // false; flip it to true once the pointer is captured.
    let captured = false;
    (bar as any).setPointerCapture = (_id: number) => {
      captured = true;
    };
    (bar as any).hasPointerCapture = (_id: number) => captured;
    (bar as any).releasePointerCapture = (_id: number) => {
      captured = false;
    };

    fireEvent.pointerDown(bar, { pointerId: 1, clientX: 20 });
    // Initial seek from the down: 20/200 × 100 = 10s.
    expect(currentTimeWrites[currentTimeWrites.length - 1]).toBeCloseTo(10, 5);

    // Drag right to 60px → 30s.
    fireEvent.pointerMove(bar, { pointerId: 1, clientX: 60 });
    expect(currentTimeWrites[currentTimeWrites.length - 1]).toBeCloseTo(30, 5);

    // Continue dragging to 140px → 70s, proving the bar tracks the
    // pointer continuously, not just on the initial press.
    fireEvent.pointerMove(bar, { pointerId: 1, clientX: 140 });
    expect(currentTimeWrites[currentTimeWrites.length - 1]).toBeCloseTo(70, 5);

    // Three distinct seeks landed at three distinct positions —
    // i.e. drag actually moved the playhead each time.
    expect(currentTimeWrites.length).toBeGreaterThanOrEqual(3);

    // Releasing should clean up the captured pointer; further moves
    // must NOT keep dragging the playhead around.
    fireEvent.pointerUp(bar, { pointerId: 1, clientX: 140 });
    const writesAfterUp = currentTimeWrites.length;
    fireEvent.pointerMove(bar, { pointerId: 1, clientX: 10 });
    expect(currentTimeWrites.length).toBe(writesAfterUp);
  });

  it("pointercancel releases capture so a later move doesn't keep scrubbing", async () => {
    const bar = await mountEditorAndStartPlayback();

    let captured = false;
    (bar as any).setPointerCapture = (_id: number) => {
      captured = true;
    };
    (bar as any).hasPointerCapture = (_id: number) => captured;
    (bar as any).releasePointerCapture = (_id: number) => {
      captured = false;
    };

    fireEvent.pointerDown(bar, { pointerId: 1, clientX: 40 });
    fireEvent.pointerMove(bar, { pointerId: 1, clientX: 100 });

    // Browser cancels the gesture (e.g. a system swipe takes over).
    fireEvent.pointerCancel(bar, { pointerId: 1, clientX: 100 });
    expect(captured).toBe(false);

    // A subsequent stray move from any other source must NOT keep
    // scrubbing the playhead around behind the admin's back.
    const before = currentTimeWrites.length;
    fireEvent.pointerMove(bar, { pointerId: 1, clientX: 180 });
    expect(currentTimeWrites.length).toBe(before);
  });

  it("pointermove without a prior pointerdown does NOT seek (passive hover is inert)", async () => {
    const bar = await mountEditorAndStartPlayback();

    // Even though hasPointerCapture is stubbed to false by default, be
    // explicit so a future stub change can't silently turn this into a
    // false-positive.
    (bar as any).hasPointerCapture = () => false;

    const before = currentTimeWrites.length;
    fireEvent.pointerMove(bar, { pointerId: 1, clientX: 80 });
    fireEvent.pointerMove(bar, { pointerId: 1, clientX: 160 });
    expect(currentTimeWrites.length).toBe(before);
  });
});
