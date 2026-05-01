import { logger } from "../lib/logger";
import {
  collectReferencedHashes,
  deleteSegmentByHash,
  primeAllTests,
  segmentHash,
} from "./audioCache";
import { loadAllTestRows } from "./testStore";
import type { Segment } from "./testBank";

/**
 * Fire-and-forget background priming of the listening-audio cache for a
 * single test that was just created or updated through the admin API.
 *
 * Sister to `primeOnBoot.ts`: that module handles every test on boot, this
 * one handles the single test the admin just saved so audio is uploaded
 * to Object Storage between deploys without the admin clicking "prime".
 *
 * Behaviour:
 *  - Disabled when `LISTENING_PRIME_AUDIO_ON_BOOT` is set to "false" / "0" /
 *    "off" / "no". Reuses the same flag because the same underlying
 *    requirements apply (Object Storage + OpenAI must be configured); local
 *    dev environments that opt out of boot priming should also opt out of
 *    after-save priming.
 *  - Returns immediately. The caller MUST NOT await this — the admin
 *    response is sent first so the editor stays snappy even when TTS is
 *    slow or fails.
 *  - Idempotent: `primeAllTests` -> `getOrCreateSegment` skips segments
 *    whose hashed key already exists in Object Storage, so unchanged
 *    segments cost nothing on update. Only NEW or EDITED segments incur a
 *    fresh TTS call.
 *  - Race-safe: the shared `inFlight` map inside `audioCache.ts`
 *    deduplicates concurrent first-time requests, so if a student opens
 *    the test before the after-save prime completes, both paths share a
 *    single TTS generation per segment.
 *  - Logs start, summary, and per-segment failure detail at `error` level
 *    so missed audio is loud in server logs.
 */

function isDisabled(): boolean {
  const raw = (process.env.LISTENING_PRIME_AUDIO_ON_BOOT ?? "true").trim().toLowerCase();
  return raw === "false" || raw === "0" || raw === "off" || raw === "no";
}

export interface PrimeAfterSaveTest {
  id: string;
  title: string;
  segments: Segment[];
}

export interface PrimeAfterSaveOptions {
  /** "create" | "update" — included in log lines so we can tell them apart. */
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

  // Defer to the next tick so this runs strictly AFTER `res.json(...)` has
  // flushed the response. Even though the worker below is async, the
  // synchronous prefix (the first logger.info, primeAllTests setup) would
  // otherwise execute on the request hot path before yielding.
  setImmediate(() => void runPrime(test, opts));
}

async function runPrime(
  test: PrimeAfterSaveTest,
  opts: PrimeAfterSaveOptions,
): Promise<void> {
  const startedAt = Date.now();
  try {
    logger.info(
      { testId: test.id, trigger: opts.trigger, segmentCount: test.segments.length },
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
      { err, testId: test.id, trigger: opts.trigger, elapsedMs: Date.now() - startedAt },
      `[listening] after-save audio prime crashed for "${test.title}"`,
    );
  }
}

export interface ReplacedSegmentCleanupResult {
  /** Number of orphan candidate hashes (in oldSegments but not in newSegments). */
  candidates: number;
  /** Cached audio files actually removed from Object Storage. */
  deleted: number;
  /** Cached audio files we tried to remove but storage refused. */
  failed: number;
  /** Per-failure detail; only populated when `failed > 0`. */
  errors: Array<{ hash: string; message: string }>;
  /** Wall-clock time spent (ms). */
  elapsedMs: number;
}

/**
 * Delete cached audio for any segment that was in the test's previous
 * transcript but is no longer in the new one — provided no other test
 * still references that hash. Mirrors the cleanup pattern used by the
 * delete endpoint.
 *
 * Returns counts so the caller can surface them to the admin UI. Safe to
 * run inline before background priming because orphan candidates are by
 * definition NOT in the new transcript, so prime never re-uploads a hash
 * we are about to delete.
 *
 * Never throws: storage failures are recorded in `errors` and the loader
 * failure short-circuits with deleted=0/failed=0.
 */
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

  const oldHashes = new Set(oldSegments.map((s) => segmentHash(s.text, s.voice)));
  const newHashes = new Set(test.segments.map((s) => segmentHash(s.text, s.voice)));
  const candidates = Array.from(oldHashes).filter((h) => !newHashes.has(h));
  if (candidates.length === 0) return empty();

  // Exclude hashes still referenced by any OTHER saved test, otherwise we
  // would happily delete shared audio. The test we just saved is included
  // in `loadAllTestRows()`, but its hashes are already in `newHashes`, so
  // intersecting via the candidates array yields the same answer either
  // way — no special-casing needed.
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
