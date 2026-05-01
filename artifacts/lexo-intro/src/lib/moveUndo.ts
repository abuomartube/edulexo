// Pure helpers for the admin listening-tests reorder flow.
//
// Why this file exists
// --------------------
// The "Move to Section X / Undo" interaction in `AdminListeningTests.tsx`
// has two halves:
//
//   1. Compute the payload the server needs (`/admin/tests/move`), and the
//      *inverse* payload that the Undo button will send if clicked.
//   2. Optimistically reflect the move in local state so the row jumps
//      instantly.
//
// Extracting that logic into pure functions lets us lock the contract in
// with unit tests — without booting React, a server, or the DOM. The
// component imports these helpers and is otherwise unchanged.

export interface MoveListEntry {
  id: number;
  slug: string;
  sectionId: number;
  sortOrder: number;
}

export interface MovePayload {
  slug: string;
  sourceSectionId: number;
  targetSectionId: number;
  targetSlugs: string[];
  sourceSlugs: string[];
}

export type ComputeMoveResult =
  | { kind: "noop" }
  | { kind: "same-section"; sectionId: number; slugs: string[] }
  | { kind: "cross-section"; forward: MovePayload; undo: MovePayload };

// Slugs of the named section, in user-visible order. Stable tiebreak on `id`
// matches the server's `ORDER BY sort_order, id`.
export function sectionSlugList(
  sectionId: number,
  tests: readonly MoveListEntry[],
): string[] {
  return tests
    .filter((t) => t.sectionId === sectionId)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    .map((t) => t.slug);
}

// Decide what API call (if any) a drop produces. For cross-section drops we
// also build the inverse payload so the "Undo" toast button can ship a
// single move call back to the original section/sortOrder.
//
// `targetSlug === null` means "drop at the end of the target section".
export function computeMove(
  tests: readonly MoveListEntry[],
  sourceSectionId: number,
  movingSlug: string,
  targetSectionId: number,
  targetSlug: string | null,
): ComputeMoveResult {
  if (movingSlug === targetSlug) return { kind: "noop" };

  if (sourceSectionId === targetSectionId) {
    // ---- Same-section reorder ----
    const sectionSlugs = sectionSlugList(targetSectionId, tests);
    const fromIdx = sectionSlugs.indexOf(movingSlug);
    if (fromIdx === -1) return { kind: "noop" };
    sectionSlugs.splice(fromIdx, 1);
    const toIdx =
      targetSlug === null
        ? sectionSlugs.length
        : sectionSlugs.indexOf(targetSlug);
    if (toIdx === -1) return { kind: "noop" };
    if (fromIdx === toIdx) return { kind: "noop" };
    sectionSlugs.splice(toIdx, 0, movingSlug);
    return { kind: "same-section", sectionId: targetSectionId, slugs: sectionSlugs };
  }

  // ---- Cross-section move ----
  // Snapshot original orderings BEFORE we mutate. The undo payload reuses
  // these to put the row back where it started.
  const originalSourceSlugs = sectionSlugList(sourceSectionId, tests);
  const targetCurrent = sectionSlugList(targetSectionId, tests);
  const insertIdx =
    targetSlug === null ? targetCurrent.length : targetCurrent.indexOf(targetSlug);
  if (insertIdx === -1) return { kind: "noop" };
  const sourceSlugs = originalSourceSlugs.filter((s) => s !== movingSlug);
  if (sourceSlugs.length === originalSourceSlugs.length) {
    // Slug wasn't actually in the source section — refuse to compute a move
    // we can't undo.
    return { kind: "noop" };
  }
  const targetSlugs = targetCurrent.slice();
  targetSlugs.splice(insertIdx, 0, movingSlug);

  return {
    kind: "cross-section",
    forward: {
      slug: movingSlug,
      sourceSectionId,
      targetSectionId,
      targetSlugs,
      sourceSlugs,
    },
    undo: {
      slug: movingSlug,
      // After the forward move, the row lives in `targetSectionId` — that's
      // the "source" of the undo write. Restoring it back to
      // `sourceSectionId` uses `originalSourceSlugs` (which still has the
      // slug at its original index) and `targetCurrent` (the pre-insert
      // order in the now-current section).
      sourceSectionId: targetSectionId,
      targetSectionId: sourceSectionId,
      targetSlugs: originalSourceSlugs,
      sourceSlugs: targetCurrent,
    },
  };
}

// Optimistically reflect a cross-section move in a local list of tests so
// the row jumps between sections instantly. Used for both the forward drop
// and the Undo path.
export function applyOptimisticCrossMove<T extends MoveListEntry>(
  tests: readonly T[],
  payload: MovePayload,
): T[] {
  const sourceIdx = new Map(payload.sourceSlugs.map((s, i) => [s, i]));
  const targetIdx = new Map(payload.targetSlugs.map((s, i) => [s, i]));
  return tests.map((t) => {
    if (t.slug === payload.slug) {
      return {
        ...t,
        sectionId: payload.targetSectionId,
        sortOrder: targetIdx.get(payload.slug) ?? 0,
      };
    }
    if (t.sectionId === payload.sourceSectionId && sourceIdx.has(t.slug)) {
      return { ...t, sortOrder: sourceIdx.get(t.slug)! };
    }
    if (t.sectionId === payload.targetSectionId && targetIdx.has(t.slug)) {
      return { ...t, sortOrder: targetIdx.get(t.slug)! };
    }
    return t;
  });
}

// Optimistically reflect a same-section reorder.
export function applyOptimisticSameSection<T extends MoveListEntry>(
  tests: readonly T[],
  sectionId: number,
  slugs: string[],
): T[] {
  const orderIdx = new Map(slugs.map((s, i) => [s, i]));
  return tests.map((t) =>
    t.sectionId === sectionId && orderIdx.has(t.slug)
      ? { ...t, sortOrder: orderIdx.get(t.slug)! }
      : t,
  );
}

// State carried between successive same-section nudges so a run of rapid
// keyboard / row-menu reorders of the *same* row collapses into a single
// Undo. The component owns one of these in a ref; we hand it to
// `nextCoalesceState` on every nudge to decide whether the new nudge
// continues the existing run (reuse the original snapshot) or starts a
// fresh one (snapshot the section's current order).
export interface CoalesceState {
  sectionId: number;
  slug: string;
  // Slug ordering captured at the *start* of the run — the order Undo will
  // restore. Held verbatim through the whole run so the last click reverts
  // every nudge in one API call.
  undoSlugs: string[];
  // Wall-clock deadline (ms since epoch) after which a further nudge is
  // treated as a fresh run rather than a continuation. Refreshed on every
  // continuation so the window slides forward with each press.
  expiresAt: number;
}

// Decide whether a nudge continues the active coalesce run or starts a new
// one, and produce the next ref state to store. Pure so the policy can be
// unit-tested without React or timers.
//
// A run continues only when:
//   - there *is* an active run (`prev !== null`)
//   - the same row in the same section is being nudged again
//   - the previous nudge was within the coalesce window (`now < expiresAt`)
//
// On continuation we reuse the original `undoSlugs` snapshot so a sequence
// of N nudges still reverts to the pre-first-nudge order in one click. On
// a fresh start we snapshot the caller-provided current order.
export function nextCoalesceState(
  prev: CoalesceState | null,
  sectionId: number,
  slug: string,
  currentSlugsBeforeMove: string[],
  now: number,
  windowMs: number,
): { undoSlugs: string[]; next: CoalesceState } {
  const continues =
    prev !== null &&
    prev.sectionId === sectionId &&
    prev.slug === slug &&
    now < prev.expiresAt;
  const undoSlugs = continues ? prev!.undoSlugs : currentSlugsBeforeMove;
  return {
    undoSlugs,
    next: { sectionId, slug, undoSlugs, expiresAt: now + windowMs },
  };
}

// Schedule the auto-clear of an undo payload that's still current. Used so
// the "Moved to ..." toast (and its Undo link) only show for ~10s — long
// enough that an admin who just closed the row's dropdown menu still has
// time to find and click Undo. The identity check (`cur === pinned`)
// ensures a *newer* move doesn't get clobbered by a stale timer from an
// earlier move.
export function scheduleUndoExpiry<T>(
  delayMs: number,
  pinned: T,
  setter: (updater: (cur: T | null) => T | null) => void,
): () => void {
  const timer = setTimeout(() => {
    setter((cur) => (cur === pinned ? null : cur));
  }, delayMs);
  return () => clearTimeout(timer);
}
