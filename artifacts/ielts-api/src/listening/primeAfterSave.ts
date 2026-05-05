import { logger } from "../lib/logger";
import {
  collectReferencedHashes,
  deleteSegmentByHash,
  primeAllTests,
  segmentHash,
} from "./audioCache";
import { loadAllTestRows } from "./testStore";
import type { Segment } from "./testBank";

function isDisabled(): boolean {
  const raw = (process.env.LISTENING_PRIME_AUDIO_ON_BOOT ?? "true")
    .trim()
    .toLowerCase();
  return raw === "false" || raw === "0" || raw === "off" || raw === "no";
}

export interface PrimeAfterSaveTest {
  id: string;
  title: string;
  segments: Segment[];
}

export interface PrimeAfterSaveOptions {
  trigger: "create" | "update";
}

export function primeListeningTestAudioInBackground(
  test: PrimeAfterSaveTest,
  opts: PrimeAfterSaveOptions,
): void {
  if (isDisabled()) {
    logger.info(
      { testId: test.id, trigger: opts.trigger },
      "[listening] after-save audio prime skipped (LISTENING_PRIME_AUDIO_ON_BOOT is disabled)",
    );
    return;
  }
  if (test.segments.length === 0) {
    logger.info(
      { testId: test.id, trigger: opts.trigger },
      "[listening] after-save audio prime: no segments to prime",
    );
    return;
  }

  setImmediate(() => void runPrime(test, opts));
}

async function runPrime(
  test: PrimeAfterSaveTest,
  opts: PrimeAfterSaveOptions,
): Promise<void> {
  const startedAt = Date.now();
  try {
    logger.info(
      {
        testId: test.id,
        trigger: opts.trigger,
        segmentCount: test.segments.length,
      },
      `[listening] after-save audio prime starting for "${test.title}"`,
    );
    const summary = await primeAllTests([test]);
    const elapsedMs = Date.now() - startedAt;
    const result = summary.perTest[0];
    const message =
      `${result.uploaded} uploaded, ${result.skipped} skipped` +
      (result.failed ? `, ${result.failed} failed` : "") +
      ` in ${elapsedMs}ms`;

    if (result.failed > 0) {
      logger.error(
        {
          testId: test.id,
          trigger: opts.trigger,
          elapsedMs,
          uploaded: result.uploaded,
          skipped: result.skipped,
          failed: result.failed,
          errors: result.errors,
        },
        `[listening] after-save audio prime FAILED for "${test.title}": ${message}`,
      );
    } else {
      logger.info(
        {
          testId: test.id,
          trigger: opts.trigger,
          elapsedMs,
          uploaded: result.uploaded,
          skipped: result.skipped,
        },
        `[listening] after-save audio prime complete for "${test.title}": ${message}`,
      );
    }
  } catch (err) {
    logger.error(
      {
        err,
        testId: test.id,
        trigger: opts.trigger,
        elapsedMs: Date.now() - startedAt,
      },
      `[listening] after-save audio prime crashed for "${test.title}"`,
    );
  }
}

export interface ReplacedSegmentCleanupResult {
  candidates: number;
  deleted: number;
  failed: number;
  errors: Array<{ hash: string; message: string }>;
  elapsedMs: number;
}

export async function cleanupReplacedSegments(
  test: PrimeAfterSaveTest,
  oldSegments: Segment[],
): Promise<ReplacedSegmentCleanupResult> {
  const startedAt = Date.now();
  const empty = (): ReplacedSegmentCleanupResult => ({
    candidates: 0,
    deleted: 0,
    failed: 0,
    errors: [],
    elapsedMs: Date.now() - startedAt,
  });

  const oldHashes = new Set(
    oldSegments.map((s) => segmentHash(s.text, s.voice)),
  );
  const newHashes = new Set(
    test.segments.map((s) => segmentHash(s.text, s.voice)),
  );
  const candidates = Array.from(oldHashes).filter((h) => !newHashes.has(h));
  if (candidates.length === 0) return empty();

  let stillReferenced: Set<string>;
  try {
    const allTests = await loadAllTestRows();
    stillReferenced = collectReferencedHashes(
      allTests.map((r) => ({ segments: r.transcript })),
    );
  } catch (err) {
    logger.error(
      { err, testId: test.id },
      `[listening] after-save orphan cleanup: could not load tests to check references for "${test.title}"`,
    );
    return { ...empty(), candidates: candidates.length };
  }

  const toDelete = candidates.filter((h) => !stillReferenced.has(h));
  if (toDelete.length === 0) {
    logger.info(
      { testId: test.id, candidates: candidates.length },
      `[listening] after-save orphan cleanup: nothing to delete for "${test.title}" (all replaced hashes are still referenced elsewhere)`,
    );
    return { ...empty(), candidates: candidates.length };
  }

  let deleted = 0;
  let failed = 0;
  const errors: Array<{ hash: string; message: string }> = [];
  const concurrency = Math.min(8, toDelete.length);
  let cursor = 0;
  const worker = async () => {
    while (true) {
      const i = cursor++;
      if (i >= toDelete.length) return;
      const hash = toDelete[i];
      const ok = await deleteSegmentByHash(hash);
      if (ok) deleted += 1;
      else {
        failed += 1;
        errors.push({ hash, message: "storage delete failed" });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  const elapsedMs = Date.now() - startedAt;

  if (failed > 0) {
    logger.error(
      { testId: test.id, deleted, failed, errors, elapsedMs },
      `[listening] after-save orphan cleanup for "${test.title}" had failures: ${deleted} removed, ${failed} failed`,
    );
  } else {
    logger.info(
      { testId: test.id, deleted, elapsedMs },
      `[listening] after-save orphan cleanup for "${test.title}": ${deleted} removed`,
    );
  }

  return { candidates: candidates.length, deleted, failed, errors, elapsedMs };
}
