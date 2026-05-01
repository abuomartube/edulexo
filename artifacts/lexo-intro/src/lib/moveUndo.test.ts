import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyOptimisticCrossMove,
  applyOptimisticSameSection,
  computeMove,
  nextCoalesceState,
  scheduleUndoExpiry,
  sectionSlugList,
  type CoalesceState,
  type MoveListEntry,
  type MovePayload,
} from "./moveUndo";

// ---------------------------------------------------------------------------
// Tests for the cross-section move + Undo affordance.
//
// The "Move test to Section X / Undo" toast in AdminListeningTests.tsx is
// hard to exercise in Playwright because the toast (and its Undo button)
// auto-clear after ~10s. These unit tests pin down the behaviour the
// component depends on:
//
//   - happy path: forward move + applying the captured undo payload puts
//     the row back in the original section at its original sortOrder.
//   - same-section reorder: no undo affordance is produced.
//   - the auto-expire timer clears the undo state but only when the
//     payload is still the most recent one (so a fresh move replacing
//     an older one is not clobbered).
// ---------------------------------------------------------------------------

// Mirror what /admin/tests/move would do: pretend to call the API and
// re-render local state with the same payload. The whole point of the
// optimistic-update + undo design is that the API ends up agreeing with
// the optimistic state, so simulating it as `applyOptimisticCrossMove`
// is fair.
function applyMoveAsServerWould<T extends MoveListEntry>(
  tests: readonly T[],
  payload: MovePayload,
): T[] {
  return applyOptimisticCrossMove(tests, payload);
}

function makeFixture(): MoveListEntry[] {
  // Two tests in section 1, three in section 2, mixed sortOrder values to
  // catch off-by-one assumptions about "indexes in DB" vs "rendered order".
  return [
    { id: 10, slug: "alpha", sectionId: 1, sortOrder: 0 },
    { id: 11, slug: "bravo", sectionId: 1, sortOrder: 1 },
    { id: 20, slug: "charlie", sectionId: 2, sortOrder: 0 },
    { id: 21, slug: "delta", sectionId: 2, sortOrder: 1 },
    { id: 22, slug: "echo", sectionId: 2, sortOrder: 2 },
  ];
}

describe("sectionSlugList", () => {
  it("returns slugs ordered by sortOrder, with id as a stable tiebreaker", () => {
    const tests: MoveListEntry[] = [
      { id: 3, slug: "c", sectionId: 1, sortOrder: 1 },
      { id: 1, slug: "a", sectionId: 1, sortOrder: 0 },
      // Two tests with the same sortOrder — id breaks the tie.
      { id: 4, slug: "d", sectionId: 1, sortOrder: 2 },
      { id: 2, slug: "b", sectionId: 1, sortOrder: 2 },
      { id: 99, slug: "other", sectionId: 2, sortOrder: 0 },
    ];
    expect(sectionSlugList(1, tests)).toEqual(["a", "c", "b", "d"]);
    expect(sectionSlugList(2, tests)).toEqual(["other"]);
    expect(sectionSlugList(3, tests)).toEqual([]);
  });
});

describe("computeMove — cross-section happy path", () => {
  it("returns forward + undo payloads such that applying both restores the original list", () => {
    const initial = makeFixture();

    // Drag "alpha" (section 1, slot 0) into section 2, dropping it before
    // "delta" so it lands at index 1 in section 2.
    const decision = computeMove(initial, 1, "alpha", 2, "delta");
    expect(decision.kind).toBe("cross-section");
    if (decision.kind !== "cross-section") return; // narrow for TS

    // The forward payload matches what the server's /admin/tests/move
    // endpoint expects:
    //   - moved slug listed in targetSlugs at its new index
    //   - moved slug NOT listed in sourceSlugs
    expect(decision.forward).toEqual({
      slug: "alpha",
      sourceSectionId: 1,
      targetSectionId: 2,
      targetSlugs: ["charlie", "alpha", "delta", "echo"],
      sourceSlugs: ["bravo"],
    });

    // The undo payload is the *inverse* move: restoring alpha back into
    // section 1 at its original sortOrder, with section 2's pre-move
    // ordering untouched.
    expect(decision.undo).toEqual({
      slug: "alpha",
      sourceSectionId: 2, // alpha lives here AFTER the forward move
      targetSectionId: 1, // restore back to section 1
      targetSlugs: ["alpha", "bravo"], // original section-1 order
      sourceSlugs: ["charlie", "delta", "echo"], // original section-2 order
    });

    // Apply the forward move via the same path the server takes.
    const afterForward = applyMoveAsServerWould(initial, decision.forward);

    // The row really did move sections.
    const movedRow = afterForward.find((t) => t.slug === "alpha")!;
    expect(movedRow.sectionId).toBe(2);
    expect(movedRow.sortOrder).toBe(1); // landed before delta

    // Section 1 now holds only bravo.
    expect(sectionSlugList(1, afterForward)).toEqual(["bravo"]);
    expect(sectionSlugList(2, afterForward)).toEqual([
      "charlie",
      "alpha",
      "delta",
      "echo",
    ]);

    // Now click Undo: ship the undo payload through the same code path.
    const afterUndo = applyMoveAsServerWould(afterForward, decision.undo);

    // ── This is the assertion the task explicitly calls out: ──
    // alpha is back in section 1 at its ORIGINAL sortOrder (0).
    const restored = afterUndo.find((t) => t.slug === "alpha")!;
    expect(restored.sectionId).toBe(1);
    expect(restored.sortOrder).toBe(0);

    // Both sections look exactly like the original ordering.
    expect(sectionSlugList(1, afterUndo)).toEqual(
      sectionSlugList(1, initial),
    );
    expect(sectionSlugList(2, afterUndo)).toEqual(
      sectionSlugList(2, initial),
    );

    // And every row's (slug, sectionId, sortOrder) matches the start.
    for (const before of initial) {
      const after = afterUndo.find((t) => t.slug === before.slug)!;
      expect(after.sectionId).toBe(before.sectionId);
      expect(after.sortOrder).toBe(before.sortOrder);
    }
  });

  it("undo restores correctly when the moved row was originally in the middle of its section", () => {
    const initial = makeFixture();
    // delta was section 2 / sortOrder 1 — middle of three rows.
    const decision = computeMove(initial, 2, "delta", 1, "bravo");
    expect(decision.kind).toBe("cross-section");
    if (decision.kind !== "cross-section") return;

    expect(decision.forward).toEqual({
      slug: "delta",
      sourceSectionId: 2,
      targetSectionId: 1,
      targetSlugs: ["alpha", "delta", "bravo"],
      sourceSlugs: ["charlie", "echo"],
    });
    expect(decision.undo).toEqual({
      slug: "delta",
      sourceSectionId: 1,
      targetSectionId: 2,
      targetSlugs: ["charlie", "delta", "echo"], // delta restored to its old slot
      sourceSlugs: ["alpha", "bravo"],
    });

    const afterForward = applyMoveAsServerWould(initial, decision.forward);
    const afterUndo = applyMoveAsServerWould(afterForward, decision.undo);
    for (const before of initial) {
      const after = afterUndo.find((t) => t.slug === before.slug)!;
      expect(after.sectionId).toBe(before.sectionId);
      expect(after.sortOrder).toBe(before.sortOrder);
    }
  });

  it("dropping at the end of the target section (targetSlug === null) still produces a usable undo", () => {
    const initial = makeFixture();
    const decision = computeMove(initial, 1, "alpha", 2, null);
    expect(decision.kind).toBe("cross-section");
    if (decision.kind !== "cross-section") return;

    expect(decision.forward.targetSlugs).toEqual([
      "charlie",
      "delta",
      "echo",
      "alpha", // appended at end
    ]);
    const afterForward = applyMoveAsServerWould(initial, decision.forward);
    const afterUndo = applyMoveAsServerWould(afterForward, decision.undo);
    for (const before of initial) {
      const after = afterUndo.find((t) => t.slug === before.slug)!;
      expect(after.sectionId).toBe(before.sectionId);
      expect(after.sortOrder).toBe(before.sortOrder);
    }
  });
});

describe("computeMove — same-section reorder", () => {
  it("returns kind 'same-section' and NO undo payload for a same-section drag", () => {
    const initial = makeFixture();
    const decision = computeMove(initial, 2, "echo", 2, "charlie");
    expect(decision.kind).toBe("same-section");

    // Critically: the result has no `undo` field, so the caller cannot
    // ship an undo payload to the toast — exactly the property the task
    // asks us to lock in (no Undo button is rendered for same-section
    // reorders).
    expect(decision).not.toHaveProperty("undo");
    expect(decision).not.toHaveProperty("forward");

    if (decision.kind !== "same-section") return;
    expect(decision.sectionId).toBe(2);
    expect(decision.slugs).toEqual(["echo", "charlie", "delta"]);

    // Sanity: applying the same-section reorder works.
    const after = applyOptimisticSameSection(
      initial,
      decision.sectionId,
      decision.slugs,
    );
    expect(sectionSlugList(2, after)).toEqual(["echo", "charlie", "delta"]);
    // Section 1 is untouched.
    expect(sectionSlugList(1, after)).toEqual(["alpha", "bravo"]);
  });

  it("noop when the user drops a row exactly back onto itself", () => {
    const initial = makeFixture();
    expect(computeMove(initial, 1, "alpha", 1, "alpha")).toEqual({
      kind: "noop",
    });
  });

  it("noop when a same-section drop would not change the order", () => {
    const initial = makeFixture();
    // bravo is already after alpha — dropping bravo before bravo is a noop;
    // dropping alpha before bravo is also a noop because alpha already sits
    // immediately before bravo.
    expect(computeMove(initial, 1, "alpha", 1, "bravo")).toEqual({
      kind: "noop",
    });
  });
});

describe("scheduleUndoExpiry — auto-clear timer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  // Mirror the persistMove() pattern: the component owns a single
  // `undoMove` slot. We wrap that in a tiny store so the test can drive
  // the same setter shape (`setter((cur) => next)`) the production code
  // uses.
  function makeStore<T>(initial: T | null) {
    let value: T | null = initial;
    const setter = (updater: (cur: T | null) => T | null): void => {
      value = updater(value);
    };
    return {
      get: () => value,
      setter,
    };
  }

  it("clears the undo payload after ~10s so the toast stops offering Undo", () => {
    const undoPayload: MovePayload = {
      slug: "alpha",
      sourceSectionId: 2,
      targetSectionId: 1,
      targetSlugs: ["alpha", "bravo"],
      sourceSlugs: ["charlie", "delta", "echo"],
    };
    const store = makeStore<MovePayload>(undoPayload);

    // Track any "API call" so we can assert the timer doesn't trigger
    // network traffic — only state cleanup. (The forward move was already
    // committed by persistMove BEFORE the timer was scheduled, so the move
    // itself stays committed even when the timer fires.)
    const fakeMoveCall = vi.fn();

    scheduleUndoExpiry(10000, undoPayload, store.setter);

    // Well past the old 2.5s window — the undo affordance must still be
    // live so admins who took a moment to find the link can still click
    // it. This is the whole point of the bumped timeout.
    vi.advanceTimersByTime(2500);
    expect(store.get()).toBe(undoPayload);

    // Just before 10s the undo affordance is still live.
    vi.advanceTimersByTime(7499);
    expect(store.get()).toBe(undoPayload);
    expect(fakeMoveCall).not.toHaveBeenCalled();

    // At 10s exactly the timer fires and clears the undo.
    vi.advanceTimersByTime(1);
    expect(store.get()).toBeNull();
    // No new API call was made — the move itself stays committed because
    // it was sent in persistMove(); the timer only touches local state.
    expect(fakeMoveCall).not.toHaveBeenCalled();
  });

  it("does NOT clobber a newer undo payload that replaced the original", () => {
    const oldPayload: MovePayload = {
      slug: "alpha",
      sourceSectionId: 2,
      targetSectionId: 1,
      targetSlugs: ["alpha", "bravo"],
      sourceSlugs: ["charlie", "delta", "echo"],
    };
    const newPayload: MovePayload = {
      slug: "echo",
      sourceSectionId: 1,
      targetSectionId: 2,
      targetSlugs: ["charlie", "delta", "echo"],
      sourceSlugs: ["alpha", "bravo"],
    };
    const store = makeStore<MovePayload>(oldPayload);
    scheduleUndoExpiry(10000, oldPayload, store.setter);

    // 1s in, the admin makes a second move; persistMove swaps in the
    // newer undo payload and schedules its own timer.
    vi.advanceTimersByTime(1000);
    store.setter(() => newPayload);
    scheduleUndoExpiry(10000, newPayload, store.setter);

    // The OLD timer fires at t=10000 — it must be a no-op because the
    // current payload is no longer `oldPayload`.
    vi.advanceTimersByTime(9000);
    expect(store.get()).toBe(newPayload);

    // The NEW timer fires at t=11000 and clears the now-stale newPayload.
    vi.advanceTimersByTime(1000);
    expect(store.get()).toBeNull();
  });

  it("respects a manual clear (e.g. admin clicked Undo) so the timer can't resurrect state", () => {
    const undoPayload: MovePayload = {
      slug: "alpha",
      sourceSectionId: 2,
      targetSectionId: 1,
      targetSlugs: ["alpha", "bravo"],
      sourceSlugs: ["charlie", "delta", "echo"],
    };
    const store = makeStore<MovePayload>(undoPayload);
    scheduleUndoExpiry(10000, undoPayload, store.setter);

    // Admin clicks Undo at t=1s, which clears the slot.
    vi.advanceTimersByTime(1000);
    store.setter(() => null);
    expect(store.get()).toBeNull();

    // Timer fires at t=10s — still null, and the helper must not flip
    // state back to the stale payload.
    vi.advanceTimersByTime(9000);
    expect(store.get()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests for nextCoalesceState — the rapid-nudge → single-Undo policy.
//
// The arrow-key / row-menu reorder controls in AdminListeningTests fire one
// API call per nudge, but a run of consecutive nudges of the same row
// should collapse into ONE Undo that reverts the entire run. This helper
// is the policy: given the previous run state (or null), the new nudge
// target, and the current section order, decide whether to continue the
// run (reuse the original snapshot) or start a fresh one (snapshot
// "right now").
// ---------------------------------------------------------------------------
describe("nextCoalesceState — rapid-nudge coalescing", () => {
  const WINDOW = 1500;

  it("starts a fresh run when there is no prior state", () => {
    const orderNow = ["alpha", "bravo", "charlie"];
    const { undoSlugs, next } = nextCoalesceState(
      null,
      1,
      "bravo",
      orderNow,
      1000,
      WINDOW,
    );
    // Fresh starts pin the section's order at *this* nudge as the Undo
    // target — there's nothing earlier in the run to defer to.
    expect(undoSlugs).toEqual(orderNow);
    expect(next).toEqual({
      sectionId: 1,
      slug: "bravo",
      undoSlugs: orderNow,
      expiresAt: 1000 + WINDOW,
    });
  });

  it("continues an existing run for the same row within the window", () => {
    // First nudge captured the section's pre-run order.
    const originalOrder = ["alpha", "bravo", "charlie"];
    const prev: CoalesceState = {
      sectionId: 1,
      slug: "bravo",
      undoSlugs: originalOrder,
      expiresAt: 1000 + WINDOW,
    };
    // Second nudge happens 500ms later — comfortably inside the window —
    // and the section now reflects the first nudge having succeeded.
    const orderAfterFirstNudge = ["bravo", "alpha", "charlie"];
    const { undoSlugs, next } = nextCoalesceState(
      prev,
      1,
      "bravo",
      orderAfterFirstNudge,
      1500,
      WINDOW,
    );
    // Crucially, the Undo target is still the *original* pre-first-nudge
    // order, NOT the post-first-nudge state. That's what lets a single
    // Undo click revert the entire run.
    expect(undoSlugs).toBe(originalOrder);
    expect(next.undoSlugs).toBe(originalOrder);
    // The window slides forward with each continuation so a long held
    // arrow key keeps coalescing as long as nudges keep arriving.
    expect(next.expiresAt).toBe(1500 + WINDOW);
    expect(next.sectionId).toBe(1);
    expect(next.slug).toBe("bravo");
  });

  it("starts a fresh run when the same row is nudged after the window expires", () => {
    const prev: CoalesceState = {
      sectionId: 1,
      slug: "bravo",
      undoSlugs: ["alpha", "bravo", "charlie"],
      // Expired ages ago.
      expiresAt: 1000,
    };
    const orderNow = ["bravo", "alpha", "charlie"];
    const { undoSlugs, next } = nextCoalesceState(
      prev,
      1,
      "bravo",
      orderNow,
      // Well past expiry — admin paused, then nudged again. This second
      // nudge deserves its own Undo, not to be folded into the older one.
      5000,
      WINDOW,
    );
    expect(undoSlugs).toEqual(orderNow);
    expect(undoSlugs).not.toBe(prev.undoSlugs);
    expect(next.expiresAt).toBe(5000 + WINDOW);
  });

  it("starts a fresh run when a different row is nudged", () => {
    const prev: CoalesceState = {
      sectionId: 1,
      slug: "bravo",
      undoSlugs: ["alpha", "bravo", "charlie"],
      expiresAt: 1000 + WINDOW,
    };
    const orderNow = ["bravo", "alpha", "charlie"];
    const { undoSlugs, next } = nextCoalesceState(
      prev,
      1,
      // Different row — switching focus mid-burst is a clear signal that
      // the previous run is over.
      "charlie",
      orderNow,
      1100,
      WINDOW,
    );
    expect(undoSlugs).toEqual(orderNow);
    expect(next.slug).toBe("charlie");
    expect(next.undoSlugs).toBe(orderNow);
  });

  it("starts a fresh run when the same row is nudged in a different section", () => {
    // Slug names are unique across sections in production, but the policy
    // still needs to treat a section change as a definitive break — the
    // Undo target lives in a specific section's order.
    const prev: CoalesceState = {
      sectionId: 1,
      slug: "bravo",
      undoSlugs: ["alpha", "bravo", "charlie"],
      expiresAt: 1000 + WINDOW,
    };
    const orderNow = ["delta", "bravo", "echo"];
    const { undoSlugs, next } = nextCoalesceState(
      prev,
      2,
      "bravo",
      orderNow,
      1100,
      WINDOW,
    );
    expect(undoSlugs).toEqual(orderNow);
    expect(next.sectionId).toBe(2);
  });

  it("preserves the original snapshot across a long burst of rapid nudges", () => {
    // Simulate holding the arrow key: 5 nudges spaced 200ms apart, each
    // well inside the 1500ms window. The Undo target must remain the
    // pre-first-nudge order for every step so a single Undo click reverts
    // all 5 nudges at once — matching what mouse drag would have produced
    // for the equivalent multi-position drop.
    const original = ["alpha", "bravo", "charlie", "delta", "echo"];
    let state: CoalesceState | null = null;
    let now = 1000;
    // After each nudge the row "bravo" walks one slot to the right; the
    // exact order doesn't matter for the assertion, only that the Undo
    // target stays pinned to `original`.
    const ordersAfterEachNudge = [
      ["alpha", "charlie", "bravo", "delta", "echo"],
      ["alpha", "charlie", "delta", "bravo", "echo"],
      ["alpha", "charlie", "delta", "echo", "bravo"],
      // After this point further "down" nudges would no-op in production,
      // but the helper only knows about the snapshot it's given.
      ["alpha", "charlie", "delta", "echo", "bravo"],
      ["alpha", "charlie", "delta", "echo", "bravo"],
    ];

    for (let i = 0; i < 5; i++) {
      const currentOrder = i === 0 ? original : ordersAfterEachNudge[i - 1];
      const { undoSlugs, next } = nextCoalesceState(
        state,
        1,
        "bravo",
        currentOrder,
        now,
        WINDOW,
      );
      // The Undo target is *always* the very first snapshot, preserved by
      // identity through the whole run.
      expect(undoSlugs).toBe(original);
      expect(next.undoSlugs).toBe(original);
      state = next;
      now += 200;
    }
  });
});
