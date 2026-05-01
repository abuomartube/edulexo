import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock the Object Storage layer BEFORE importing audioCache so the module's
// top-level `new ObjectStorageService()` and any subsequent `.bucket(...)`
// calls hit our fakes instead of @google-cloud/storage. Cleanup helpers
// only ever touch `bucket(name).file(path).delete(...)` and
// `bucket(name).getFiles({ prefix })`, so that's all we stub.
// ---------------------------------------------------------------------------

const mockBucket = {
  file: vi.fn(),
  getFiles: vi.fn(),
};

vi.mock("../lib/objectStorage", () => ({
  objectStorageClient: {
    bucket: vi.fn(() => mockBucket),
  },
  ObjectStorageService: class {},
}));

// `audioCache` imports `textToSpeech` at top level. The cleanup paths under
// test never call it, but the import must resolve, so stub it out to avoid
// pulling the real OpenAI integration into the test process.
vi.mock("@workspace/integrations-openai-ai-server/audio", () => ({
  textToSpeech: vi.fn(),
}));

// `publicSearchPath()` reads from PUBLIC_OBJECT_SEARCH_PATHS. Set a
// deterministic value so the resulting bucket/object names are predictable
// in assertions.
process.env.PUBLIC_OBJECT_SEARCH_PATHS = "/test-bucket/public";

const {
  cleanupOrphanedSegments,
  collectReferencedHashes,
  countCachedSegments,
  deleteSegmentByHash,
  primeAllTests,
  segmentHash,
} = await import("./audioCache");

beforeEach(() => {
  mockBucket.file.mockReset();
  mockBucket.getFiles.mockReset();
});

describe("segmentHash + collectReferencedHashes", () => {
  it("hashes are stable for the same (text, voice) pair", () => {
    expect(segmentHash("hello world", "alloy")).toBe(segmentHash("hello world", "alloy"));
  });

  it("differs when voice differs", () => {
    expect(segmentHash("hello", "alloy")).not.toBe(segmentHash("hello", "nova"));
  });

  it("differs when text differs", () => {
    expect(segmentHash("a", "alloy")).not.toBe(segmentHash("b", "alloy"));
  });

  it("collectReferencedHashes deduplicates across tests", () => {
    const set = collectReferencedHashes([
      { segments: [{ voice: "alloy", text: "shared" }] },
      {
        segments: [
          { voice: "alloy", text: "shared" },
          { voice: "nova", text: "unique" },
        ],
      },
    ]);
    expect(set.size).toBe(2);
    expect(set.has(segmentHash("shared", "alloy"))).toBe(true);
    expect(set.has(segmentHash("unique", "nova"))).toBe(true);
  });
});

describe("Railway-mode behavior (PUBLIC_OBJECT_SEARCH_PATHS unset)", () => {
  // Cleanup/count helpers must be safe no-ops on hosts where the env var
  // is unset. `deleteSegmentByHash` must report success so the
  // `cleanupReplacedSegments` admin flow doesn't blow up. These are the
  // exact code paths a Railway boot exercises.
  const ORIGINAL = process.env.PUBLIC_OBJECT_SEARCH_PATHS;

  beforeEach(() => {
    delete process.env.PUBLIC_OBJECT_SEARCH_PATHS;
  });

  afterEach(() => {
    if (ORIGINAL === undefined) {
      delete process.env.PUBLIC_OBJECT_SEARCH_PATHS;
    } else {
      process.env.PUBLIC_OBJECT_SEARCH_PATHS = ORIGINAL;
    }
  });

  it("deleteSegmentByHash returns true without touching storage", async () => {
    const fileDelete = vi.fn().mockResolvedValue(undefined);
    mockBucket.file.mockReturnValue({ delete: fileDelete });

    const ok = await deleteSegmentByHash("anyhash");

    expect(ok).toBe(true);
    expect(mockBucket.file).not.toHaveBeenCalled();
    expect(fileDelete).not.toHaveBeenCalled();
  });

  it("cleanupOrphanedSegments returns a zeroed summary with no storage calls", async () => {
    const summary = await cleanupOrphanedSegments(new Set(["a", "b"]));

    expect(summary).toEqual({
      scanned: 0,
      referenced: 2,
      deleted: 0,
      failed: 0,
      bytesFreed: 0,
      errors: [],
    });
    expect(mockBucket.getFiles).not.toHaveBeenCalled();
  });

  it("countCachedSegments returns zeroed counts with no storage calls", async () => {
    const counts = await countCachedSegments(new Set(["a"]));

    expect(counts).toEqual({ scanned: 0, referenced: 1, orphaned: 0, bytes: 0 });
    expect(mockBucket.getFiles).not.toHaveBeenCalled();
  });
});

describe("deleteSegmentByHash", () => {
  it("returns true on a successful storage delete and passes ignoreNotFound", async () => {
    const fileDelete = vi.fn().mockResolvedValue(undefined);
    mockBucket.file.mockReturnValue({ delete: fileDelete });

    const ok = await deleteSegmentByHash("deadbeef");

    expect(ok).toBe(true);
    expect(fileDelete).toHaveBeenCalledTimes(1);
    expect(fileDelete).toHaveBeenCalledWith({ ignoreNotFound: true });
  });

  it("targets the listening prefix path under the configured bucket", async () => {
    const fileDelete = vi.fn().mockResolvedValue(undefined);
    mockBucket.file.mockReturnValue({ delete: fileDelete });

    await deleteSegmentByHash("abc123");

    // PUBLIC_OBJECT_SEARCH_PATHS = "/test-bucket/public", so the full path
    // is `/test-bucket/public/listening/abc123.mp3`. The bucket name is
    // `test-bucket` and the object name is `public/listening/abc123.mp3`.
    expect(mockBucket.file).toHaveBeenCalledWith("public/listening/abc123.mp3");
  });

  it("returns false when the storage delete throws", async () => {
    mockBucket.file.mockReturnValue({
      delete: vi.fn().mockRejectedValue(new Error("storage offline")),
    });

    expect(await deleteSegmentByHash("abc123")).toBe(false);
  });
});

describe("cleanupOrphanedSegments", () => {
  function fakeFile(name: string) {
    return { name, delete: vi.fn().mockResolvedValue(undefined) };
  }

  it("ignores files that don't match the <hash>.mp3 naming convention", async () => {
    const txt = fakeFile("public/listening/notes.txt");
    const md = fakeFile("public/listening/README.md");
    const noPrefix = fakeFile("public/listening/sub/folder/keep.mp3"); // basename is keep.mp3 -> matches!
    // Use a name that genuinely won't match: contains a non-hex char in the basename.
    const badHash = fakeFile("public/listening/zzz_not_hex.mp3");
    mockBucket.getFiles.mockResolvedValue([[txt, md, badHash]]);

    const summary = await cleanupOrphanedSegments(new Set());

    expect(summary.scanned).toBe(0);
    expect(summary.deleted).toBe(0);
    expect(summary.failed).toBe(0);
    expect(txt.delete).not.toHaveBeenCalled();
    expect(md.delete).not.toHaveBeenCalled();
    expect(badHash.delete).not.toHaveBeenCalled();
    void noPrefix;
  });

  it("never deletes a hash that's still referenced (the core safety invariant)", async () => {
    const referencedHash = "aaaa1111";
    const orphanHash = "bbbb2222";
    const referencedFile = fakeFile(`public/listening/${referencedHash}.mp3`);
    const orphanFile = fakeFile(`public/listening/${orphanHash}.mp3`);
    mockBucket.getFiles.mockResolvedValue([[referencedFile, orphanFile]]);

    const summary = await cleanupOrphanedSegments(new Set([referencedHash]));

    expect(summary.scanned).toBe(2);
    expect(summary.referenced).toBe(1);
    expect(summary.deleted).toBe(1);
    expect(summary.failed).toBe(0);
    expect(referencedFile.delete).not.toHaveBeenCalled();
    expect(orphanFile.delete).toHaveBeenCalledWith({ ignoreNotFound: true });
  });

  it("counts per-file failures and continues with the rest", async () => {
    const goodFile = fakeFile("public/listening/aaa.mp3");
    const badFile = {
      name: "public/listening/bbb.mp3",
      delete: vi.fn().mockRejectedValue(new Error("boom")),
    };
    mockBucket.getFiles.mockResolvedValue([[goodFile, badFile]]);

    const summary = await cleanupOrphanedSegments(new Set());

    expect(summary.scanned).toBe(2);
    expect(summary.deleted).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.errors).toEqual([{ hash: "bbb", message: "boom" }]);
  });

  it("returns zeroed counts when the bucket has no listening files at all", async () => {
    mockBucket.getFiles.mockResolvedValue([[]]);
    const summary = await cleanupOrphanedSegments(new Set(["aaaa"]));
    expect(summary).toEqual({
      scanned: 0,
      referenced: 1,
      deleted: 0,
      failed: 0,
      bytesFreed: 0,
      errors: [],
    });
  });

  it("sums file.metadata.size across successful deletes into bytesFreed", async () => {
    function fakeFileWithSize(name: string, size: number | string) {
      return {
        name,
        metadata: { size },
        delete: vi.fn().mockResolvedValue(undefined),
      };
    }
    const referencedHash = "cafef00d";
    const orphan1 = fakeFileWithSize(`public/listening/${"1".repeat(8)}.mp3`, "12345");
    const orphan2 = fakeFileWithSize(`public/listening/${"2".repeat(8)}.mp3`, 6789);
    // Referenced file's bytes must NOT be added — we only count what we
    // actually delete.
    const referencedFile = fakeFileWithSize(
      `public/listening/${referencedHash}.mp3`,
      "999999",
    );
    mockBucket.getFiles.mockResolvedValue([[orphan1, orphan2, referencedFile]]);

    const summary = await cleanupOrphanedSegments(new Set([referencedHash]));

    expect(summary.deleted).toBe(2);
    expect(summary.failed).toBe(0);
    expect(summary.bytesFreed).toBe(12345 + 6789);
    expect(referencedFile.delete).not.toHaveBeenCalled();
  });

  it("does not add bytes for orphans whose delete fails", async () => {
    const goodFile = {
      name: "public/listening/aaaa.mp3",
      metadata: { size: "1000" },
      delete: vi.fn().mockResolvedValue(undefined),
    };
    const badFile = {
      name: "public/listening/bbbb.mp3",
      metadata: { size: "5000" },
      delete: vi.fn().mockRejectedValue(new Error("boom")),
    };
    mockBucket.getFiles.mockResolvedValue([[goodFile, badFile]]);

    const summary = await cleanupOrphanedSegments(new Set());

    expect(summary.deleted).toBe(1);
    expect(summary.failed).toBe(1);
    // Only the successfully-deleted file's bytes count toward the freed
    // total — the failed one is still on disk.
    expect(summary.bytesFreed).toBe(1000);
  });

  it("treats orphans with missing or unparseable sizes as zero bytes freed", async () => {
    const noMeta = {
      name: "public/listening/aaaa.mp3",
      delete: vi.fn().mockResolvedValue(undefined),
    };
    const garbageSize = {
      name: "public/listening/bbbb.mp3",
      metadata: { size: "not-a-number" },
      delete: vi.fn().mockResolvedValue(undefined),
    };
    const goodSize = {
      name: "public/listening/cccc.mp3",
      metadata: { size: "2048" },
      delete: vi.fn().mockResolvedValue(undefined),
    };
    mockBucket.getFiles.mockResolvedValue([[noMeta, garbageSize, goodSize]]);

    const summary = await cleanupOrphanedSegments(new Set());

    expect(summary.deleted).toBe(3);
    expect(summary.bytesFreed).toBe(2048);
  });
});

describe("primeAllTests cancellation via AbortSignal", () => {
  // Make every getOrCreateSegment treat the file as already cached so we
  // never hit the TTS/upload path. (`exists()` -> [true] => "skipped".)
  // This keeps the tests deterministic and lets us focus on the cancel
  // semantics rather than upload behaviour.
  beforeEach(() => {
    mockBucket.file.mockImplementation(() => ({
      exists: vi.fn().mockResolvedValue([true]),
    }));
  });

  function fakeTest(id: string, segmentTexts: string[]) {
    return {
      id,
      title: id.toUpperCase(),
      segments: segmentTexts.map((text) => ({ voice: "alloy" as const, text })),
    };
  }

  it("returns cancelled=true and processes nothing when the signal is already aborted", async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    const tests = [fakeTest("t1", ["a"]), fakeTest("t2", ["b"])];

    const summary = await primeAllTests(tests, { signal: ctrl.signal });

    expect(summary.cancelled).toBe(true);
    expect(summary.testsPrimed).toBe(0);
    expect(summary.testsTotal).toBe(2);
    expect(summary.segmentsUploaded).toBe(0);
    expect(summary.segmentsSkipped).toBe(0);
    expect(summary.segmentsFailed).toBe(0);
    expect(summary.perTest).toEqual([]);
  });

  it("stops between tests once the signal aborts mid-progress (later tests never start)", async () => {
    const ctrl = new AbortController();
    const tests = [
      fakeTest("t1", ["a-1"]),
      fakeTest("t2", ["b-1"]),
      fakeTest("t3", ["c-1"]),
    ];
    const startedTestIds: string[] = [];

    const summary = await primeAllTests(tests, {
      signal: ctrl.signal,
      onProgress: (ev) => {
        if (ev.kind === "test_start") startedTestIds.push(ev.testId);
        if (ev.kind === "test_done" && ev.result.testId === "t1") {
          // Abort right after the first test finishes; the next iteration
          // of the test loop must observe the abort and break.
          ctrl.abort();
        }
      },
    });

    expect(summary.cancelled).toBe(true);
    expect(startedTestIds).toEqual(["t1"]);
    expect(summary.testsTotal).toBe(3);
    // t1 fully completed before the abort, so it counts as primed.
    expect(summary.testsPrimed).toBe(1);
    expect(summary.perTest).toHaveLength(1);
    expect(summary.perTest[0].testId).toBe("t1");
  });

  it("stops between segments inside a test once the signal aborts (no further segments processed)", async () => {
    const ctrl = new AbortController();
    const tests = [fakeTest("t1", ["s1", "s2", "s3", "s4"])];
    const segmentsSeen: number[] = [];

    const summary = await primeAllTests(tests, {
      signal: ctrl.signal,
      // concurrency 1 so segment ordering and the abort point are
      // deterministic — the test would otherwise race against the worker
      // pool draining in-flight segments.
      concurrency: 1,
      onProgress: (ev) => {
        if (ev.kind === "segment_done") {
          segmentsSeen.push(ev.segmentIndex);
          if (ev.segmentIndex === 0) ctrl.abort();
        }
      },
    });

    expect(summary.cancelled).toBe(true);
    expect(segmentsSeen).toEqual([0]);
    // The interrupted test must NOT be counted as "primed" even though no
    // segment failed — it just didn't finish.
    expect(summary.testsPrimed).toBe(0);
    expect(summary.perTest).toHaveLength(1);
    const r = summary.perTest[0];
    expect(r.uploaded + r.skipped + r.failed).toBe(1);
    expect(r.failed).toBe(0);
  });

  it("does not invoke onProgress for tests skipped after cancellation", async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    const onProgress = vi.fn();

    await primeAllTests(
      [fakeTest("t1", ["a"]), fakeTest("t2", ["b"])],
      { signal: ctrl.signal, onProgress },
    );

    expect(onProgress).not.toHaveBeenCalled();
  });

  it("returns cancelled=false when the signal is provided but never aborted", async () => {
    const ctrl = new AbortController();
    const tests = [fakeTest("t1", ["a"]), fakeTest("t2", ["b"])];

    const summary = await primeAllTests(tests, { signal: ctrl.signal });

    expect(summary.cancelled).toBe(false);
    expect(summary.testsPrimed).toBe(2);
    expect(summary.testsTotal).toBe(2);
  });
});

describe("countCachedSegments (read-only sibling of cleanup)", () => {
  function fakeFile(name: string, size?: number | string) {
    return size === undefined ? { name } : { name, metadata: { size } };
  }

  it("counts referenced vs orphaned by inspecting bucket listing only — never deletes", async () => {
    const referencedHash = "cafef00d";
    const orphanHash1 = "11111111";
    const orphanHash2 = "22222222";
    mockBucket.getFiles.mockResolvedValue([[
      fakeFile(`public/listening/${referencedHash}.mp3`),
      fakeFile(`public/listening/${orphanHash1}.mp3`),
      fakeFile(`public/listening/${orphanHash2}.mp3`),
      fakeFile("public/listening/notes.txt"),
    ]]);

    const counts = await countCachedSegments(new Set([referencedHash]));

    expect(counts).toEqual({ scanned: 3, referenced: 1, orphaned: 2, bytes: 0 });
  });

  it("sums file.metadata.size across every scanned object (referenced + orphaned)", async () => {
    const referencedHash = "cafef00d";
    const orphanHash = "11111111";
    mockBucket.getFiles.mockResolvedValue([[
      // GCS-compatible storage returns size as a string; mix in a numeric
      // size to confirm both shapes are accepted.
      fakeFile(`public/listening/${referencedHash}.mp3`, "12345"),
      fakeFile(`public/listening/${orphanHash}.mp3`, 6789),
      // Non-matching files must not contribute to the byte total.
      fakeFile("public/listening/notes.txt", "999999"),
    ]]);

    const counts = await countCachedSegments(new Set([referencedHash]));

    expect(counts).toEqual({
      scanned: 2,
      referenced: 1,
      orphaned: 1,
      bytes: 12345 + 6789,
    });
  });

  it("treats missing or unparseable sizes as zero bytes for that file", async () => {
    mockBucket.getFiles.mockResolvedValue([[
      fakeFile("public/listening/aaaa.mp3"), // no metadata at all
      fakeFile("public/listening/bbbb.mp3", "not-a-number"),
      fakeFile("public/listening/cccc.mp3", "1024"),
    ]]);

    const counts = await countCachedSegments(new Set());

    expect(counts.scanned).toBe(3);
    expect(counts.bytes).toBe(1024);
  });
});
