import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Segment } from "./testBank";

// ---------------------------------------------------------------------------
// Mocks. We mock:
//  - `./audioCache` partially: the pure helpers (`segmentHash`,
//    `collectReferencedHashes`) keep their real implementation so cleanup
//    decisions are computed exactly the way production does. The side-effect
//    helpers (`deleteSegmentByHash`, `primeAllTests`) are stubbed so we can
//    assert what cleanup invoked.
//  - `./testStore`: the only function `cleanupReplacedSegments` calls is
//    `loadAllTestRows`, used to learn which hashes are still referenced by
//    OTHER tests.
//  - `../lib/objectStorage` and `@workspace/integrations-openai-ai-server/audio`
//    so importing `audioCache` (which the partial-mock pulls in for its real
//    helpers) doesn't reach Object Storage or OpenAI in tests.
//  - `../lib/logger`: silenced so test output stays clean.
// ---------------------------------------------------------------------------

const deleteSegmentByHash = vi.fn<(hash: string) => Promise<boolean>>();
const primeAllTests = vi.fn();
const loadAllTestRows = vi.fn<() => Promise<Array<{ transcript: Segment[] }>>>();

vi.mock("../lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../lib/objectStorage", () => ({
  objectStorageClient: { bucket: vi.fn() },
  ObjectStorageService: class {},
}));

vi.mock("@workspace/integrations-openai-ai-server/audio", () => ({
  textToSpeech: vi.fn(),
}));

vi.mock("./audioCache", async () => {
  const actual = await vi.importActual<typeof import("./audioCache")>("./audioCache");
  return {
    ...actual,
    deleteSegmentByHash: (...args: [string]) => deleteSegmentByHash(...args),
    primeAllTests: (...args: unknown[]) => primeAllTests(...args),
  };
});

vi.mock("./testStore", () => ({
  loadAllTestRows: () => loadAllTestRows(),
}));

process.env.PUBLIC_OBJECT_SEARCH_PATHS = "/test-bucket/public";

const { cleanupReplacedSegments } = await import("./primeAfterSave");
const { segmentHash } = await import("./audioCache");

const seg = (text: string, voice: "alloy" | "nova" = "alloy"): Segment => ({ voice, text });

beforeEach(() => {
  deleteSegmentByHash.mockReset();
  primeAllTests.mockReset();
  loadAllTestRows.mockReset();
  // Defaults: storage deletes succeed, no other tests exist.
  deleteSegmentByHash.mockResolvedValue(true);
  loadAllTestRows.mockResolvedValue([]);
});

describe("cleanupReplacedSegments", () => {
  it("is a no-op when the transcript is unchanged (nothing to compare, nothing to delete)", async () => {
    const segments = [seg("hello"), seg("world")];

    const result = await cleanupReplacedSegments(
      { id: "t1", title: "T", segments },
      segments,
    );

    expect(result.candidates).toBe(0);
    expect(result.deleted).toBe(0);
    expect(result.failed).toBe(0);
    expect(deleteSegmentByHash).not.toHaveBeenCalled();
    // Skip the DB round-trip when there are no candidates — the function
    // short-circuits before checking other tests for shared references.
    expect(loadAllTestRows).not.toHaveBeenCalled();
  });

  it("deletes only segments removed from the new transcript (orphans)", async () => {
    const removed = seg("removed line");
    const kept = seg("kept line");
    const added = seg("brand new line");
    const removedHash = segmentHash(removed.text, removed.voice);
    const keptHash = segmentHash(kept.text, kept.voice);
    const addedHash = segmentHash(added.text, added.voice);

    const result = await cleanupReplacedSegments(
      { id: "t1", title: "T", segments: [kept, added] },
      [kept, removed],
    );

    expect(result.candidates).toBe(1);
    expect(result.deleted).toBe(1);
    expect(deleteSegmentByHash).toHaveBeenCalledTimes(1);
    expect(deleteSegmentByHash).toHaveBeenCalledWith(removedHash);
    // Belt-and-braces: NEVER delete the kept hash (still in new transcript)
    // or the added hash (only in new transcript).
    expect(deleteSegmentByHash).not.toHaveBeenCalledWith(keptHash);
    expect(deleteSegmentByHash).not.toHaveBeenCalledWith(addedHash);
  });

  it("never deletes a hash that another saved test still references", async () => {
    const shared = seg("shared sentence");
    const removed = seg("only-in-old");
    const sharedHash = segmentHash(shared.text, shared.voice);
    const removedHash = segmentHash(removed.text, removed.voice);

    // Another saved test still uses BOTH `shared` and `removed`. Even
    // though `removed` is gone from THIS test's new transcript, the
    // cleanup must skip it because storage is shared across tests.
    loadAllTestRows.mockResolvedValue([
      { transcript: [shared, removed] },
    ]);

    const result = await cleanupReplacedSegments(
      { id: "t1", title: "T", segments: [shared] },
      [shared, removed],
    );

    expect(result.candidates).toBe(1);
    expect(result.deleted).toBe(0);
    expect(deleteSegmentByHash).not.toHaveBeenCalled();
    // Sanity: `shared` was never even a candidate (it's still in the new
    // transcript), and `removed` was a candidate but spared by the
    // cross-test reference check.
    void sharedHash;
    void removedHash;
  });

  it("never deletes a hash that's still in the new transcript (set semantics for old vs new)", async () => {
    // Same line appears twice in old; once in new. Set-deduped, both sides
    // share the hash, so it is NOT a candidate.
    const sameText = seg("same exact line");
    const result = await cleanupReplacedSegments(
      { id: "t1", title: "T", segments: [sameText] },
      [sameText, sameText],
    );
    expect(result.candidates).toBe(0);
    expect(deleteSegmentByHash).not.toHaveBeenCalled();
  });

  it("treats different voices for the same text as DIFFERENT cached segments", async () => {
    const oldVoice = seg("hello", "alloy");
    const newVoice = seg("hello", "nova");
    const oldHash = segmentHash(oldVoice.text, oldVoice.voice);

    const result = await cleanupReplacedSegments(
      { id: "t1", title: "T", segments: [newVoice] },
      [oldVoice],
    );

    expect(result.candidates).toBe(1);
    expect(result.deleted).toBe(1);
    expect(deleteSegmentByHash).toHaveBeenCalledWith(oldHash);
  });

  it("reports failed counts and per-hash errors when storage refuses a delete", async () => {
    const a = seg("a");
    const b = seg("b");
    deleteSegmentByHash.mockResolvedValue(false);

    const result = await cleanupReplacedSegments(
      { id: "t1", title: "T", segments: [] },
      [a, b],
    );

    expect(result.candidates).toBe(2);
    expect(result.deleted).toBe(0);
    expect(result.failed).toBe(2);
    expect(result.errors).toHaveLength(2);
    for (const e of result.errors) {
      expect(e.message).toMatch(/storage delete failed/);
    }
  });

  it("aborts deletes (deleted=0) if loading other tests fails — never delete a possibly-shared hash on partial info", async () => {
    loadAllTestRows.mockRejectedValue(new Error("db down"));

    const result = await cleanupReplacedSegments(
      { id: "t1", title: "T", segments: [] },
      [seg("removed-but-uncertain")],
    );

    expect(result.candidates).toBe(1);
    expect(result.deleted).toBe(0);
    expect(result.failed).toBe(0);
    expect(deleteSegmentByHash).not.toHaveBeenCalled();
  });

  it("queries the latest saved tests before deleting (so it sees the just-saved row in DB and never deletes its still-in-use hashes)", async () => {
    // The saved test now contains `kept`. The previous transcript had
    // `kept` AND `removed`. `loadAllTestRows` returns the JUST-SAVED row
    // (which already contains the new transcript). The cross-test
    // reference check must consult that fresh DB state — we assert it was
    // called exactly once and the orphan was deleted accordingly.
    const kept = seg("kept");
    const removed = seg("removed");
    const removedHash = segmentHash(removed.text, removed.voice);

    loadAllTestRows.mockResolvedValue([{ transcript: [kept] }]);

    const result = await cleanupReplacedSegments(
      { id: "t1", title: "T", segments: [kept] },
      [kept, removed],
    );

    expect(loadAllTestRows).toHaveBeenCalledTimes(1);
    expect(result.deleted).toBe(1);
    expect(deleteSegmentByHash).toHaveBeenCalledWith(removedHash);
  });

  it("does NOT trigger background priming as a side effect — cleanup and prime are separate steps", async () => {
    await cleanupReplacedSegments(
      { id: "t1", title: "T", segments: [] },
      [seg("x"), seg("y")],
    );
    // Cleanup must never call primeAllTests; the route runs prime AFTER
    // cleanup resolves so the orphan files are gone before TTS uploads
    // start. (Tests for the route's ordering live alongside the route.)
    expect(primeAllTests).not.toHaveBeenCalled();
  });

  it("awaits all deletes before returning (so the route can safely fire background prime after this resolves)", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    let resolvedCount = 0;
    deleteSegmentByHash.mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight -= 1;
      resolvedCount += 1;
      return true;
    });

    const removedSegments = Array.from({ length: 5 }, (_, i) => seg(`old-${i}`));

    const result = await cleanupReplacedSegments(
      { id: "t1", title: "T", segments: [] },
      removedSegments,
    );

    // By the time the promise resolves, every delete must have completed.
    expect(resolvedCount).toBe(5);
    expect(result.deleted).toBe(5);
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
    // Sanity: the worker pool actually parallelised the deletes (capped at
    // 8 in the implementation, so up to 5 here).
    expect(maxInFlight).toBeGreaterThan(1);
  });
});
