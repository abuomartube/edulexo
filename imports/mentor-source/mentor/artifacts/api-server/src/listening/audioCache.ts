import crypto from "node:crypto";
import { Readable } from "node:stream";
import { textToSpeech } from "@workspace/integrations-openai-ai-server/audio";
import { objectStorageClient, ObjectStorageService } from "../lib/objectStorage";
import { staticAudioExists } from "../lib/staticAudio";
import type { Voice } from "./testBank";

const TTS_MODEL = "gpt-audio";
const TTS_SPEED = 0.92;
const AUDIO_FORMAT = "mp3";
const PUBLIC_LISTENING_PREFIX = "listening";
const objectStorageService = new ObjectStorageService();

const inFlight = new Map<string, Promise<SegmentPrimeResult>>();

function hashSegment(text: string, voice: Voice, speed: number): string {
  const h = crypto.createHash("sha256");
  h.update(`${TTS_MODEL}|${voice}|${speed}|${AUDIO_FORMAT}|${text.trim()}`);
  return h.digest("hex").slice(0, 32);
}

/**
 * Public hash helper for callers that need to look up the storage key for
 * a given (text, voice) without going through `getOrCreateSegment`. Mirrors
 * exactly what the upload path uses so cleanup can match what's on disk.
 */
export function segmentHash(text: string, voice: Voice): string {
  return hashSegment(text, voice, TTS_SPEED);
}

/**
 * Build the set of every segment hash referenced by the supplied tests.
 * Used by the orphan cleanup paths to know which stored audio files are
 * still in use and must NOT be deleted.
 */
export function collectReferencedHashes(
  tests: Array<{ segments: Array<{ voice: Voice; text: string }> }>,
): Set<string> {
  const set = new Set<string>();
  for (const t of tests) {
    for (const s of t.segments) {
      set.add(segmentHash(s.text, s.voice));
    }
  }
  return set;
}

function parsePath(path: string): { bucketName: string; objectName: string } {
  const p = path.startsWith("/") ? path : `/${path}`;
  const parts = p.split("/");
  return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
}

function publicSearchPath(): string {
  const raw = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
  const first = raw.split(",").map((s) => s.trim()).find(Boolean);
  if (!first) {
    throw new Error("PUBLIC_OBJECT_SEARCH_PATHS not set");
  }
  return first;
}

function isObjectStorageConfigured(): boolean {
  const raw = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
  return raw.split(",").some((s) => s.trim().length > 0);
}

export interface SegmentPrimeResult {
  url: string;
  uploaded: boolean;
}

/**
 * Returns a public-objects URL path (relative to /api/storage/public-objects)
 * suitable for browser playback, plus whether a fresh TTS upload occurred.
 * Generates and uploads on first request, then reuses on every subsequent
 * call. Idempotent and safe under concurrent first-time requests.
 */
export async function getOrCreateSegment(text: string, voice: Voice): Promise<SegmentPrimeResult> {
  const fileHash = hashSegment(text, voice, TTS_SPEED);
  const relPath = `${PUBLIC_LISTENING_PREFIX}/${fileHash}.${AUDIO_FORMAT}`;

  if (inFlight.has(fileHash)) {
    return inFlight.get(fileHash)!;
  }

  // Local-first: a bundled static file (ships with the Docker image on
  // hosts that don't have Replit object storage) trumps everything else.
  // No storage round-trip, no TTS — just return the URL the route already
  // knows how to serve from disk. CRITICAL: this must come before
  // `publicSearchPath()` is touched, since that throws on Railway where
  // PUBLIC_OBJECT_SEARCH_PATHS is intentionally unset.
  if (staticAudioExists(relPath)) {
    return { url: relPath, uploaded: false };
  }

  // No bundled file → we'll need object storage. Resolve the path now;
  // if storage isn't configured this throws immediately and the caller
  // surfaces it as a `failed` segment in the prime summary, instead of
  // silently 404'ing at playback time.
  const fullPath = `${publicSearchPath()}/${relPath}`;
  const { bucketName, objectName } = parsePath(fullPath);

  const promise = (async () => {
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    const [exists] = await file.exists();
    if (exists) {
      return { url: relPath, uploaded: false };
    }
    const buf = await textToSpeech(text, voice, AUDIO_FORMAT);
    const stream = Readable.from(buf);
    await new Promise<void>((resolve, reject) => {
      const upload = file.createWriteStream({
        metadata: { contentType: "audio/mpeg" },
        resumable: false,
      });
      upload.on("error", reject);
      upload.on("finish", () => resolve());
      stream.pipe(upload);
    });
    return { url: relPath, uploaded: true };
  })();

  inFlight.set(fileHash, promise);
  // Use a no-op .catch so the cleanup chain never produces an unhandledRejection;
  // callers still see the original rejection from `promise`.
  promise.catch(() => {}).finally(() => inFlight.delete(fileHash));
  return promise;
}

export async function getOrCreateSegmentUrl(text: string, voice: Voice): Promise<string> {
  const { url } = await getOrCreateSegment(text, voice);
  return url;
}

export async function buildAudioManifest(
  segments: Array<{ voice: Voice; text: string }>,
): Promise<Array<{ voice: Voice; text: string; url: string }>> {
  // Fan out cache lookups in parallel, but cap concurrency to avoid hammering TTS on first-time generation.
  const results: Array<{ voice: Voice; text: string; url: string }> = new Array(segments.length);
  const concurrency = 4;
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= segments.length) return;
      const seg = segments[i];
      const relPath = await getOrCreateSegmentUrl(seg.text, seg.voice);
      results[i] = { voice: seg.voice, text: seg.text, url: relPath };
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, segments.length) }, worker));
  return results;
}

export interface PrimeTestResult {
  testId: string;
  title: string;
  segmentCount: number;
  uploaded: number;
  skipped: number;
  failed: number;
  errors: Array<{ index: number; message: string }>;
}

export interface PrimeSummary {
  testsPrimed: number;
  testsTotal: number;
  segmentsUploaded: number;
  segmentsSkipped: number;
  segmentsFailed: number;
  perTest: PrimeTestResult[];
  cancelled: boolean;
}

export type PrimeProgressEvent =
  | {
      kind: "test_start";
      testIndex: number;
      testsTotal: number;
      testId: string;
      title: string;
      segmentCount: number;
    }
  | {
      kind: "segment_done";
      testIndex: number;
      testsTotal: number;
      testId: string;
      segmentIndex: number;
      segmentCount: number;
      status: "uploaded" | "skipped" | "failed";
      error?: string;
    }
  | {
      kind: "test_done";
      testIndex: number;
      testsTotal: number;
      result: PrimeTestResult;
    };

export interface PrimeOptions {
  concurrency?: number;
  onProgress?: (event: PrimeProgressEvent) => void | Promise<void>;
  signal?: AbortSignal;
}

/**
 * Primes the audio cache for every supplied test. Segments whose hashed key
 * already exists in Object Storage are skipped; missing ones are generated
 * via TTS and uploaded. Idempotent and safe to re-run.
 *
 * If `onProgress` is supplied, it is invoked after every meaningful step
 * (test starting, each segment finishing, test finishing). Callback errors
 * are swallowed so progress reporting can never break priming.
 */
export async function primeAllTests(
  tests: Array<{ id: string; title: string; segments: Array<{ voice: Voice; text: string }> }>,
  opts: PrimeOptions = {},
): Promise<PrimeSummary> {
  const concurrency = Math.max(1, opts.concurrency ?? 4);
  const onProgress = opts.onProgress;
  const signal = opts.signal;
  const emit = async (ev: PrimeProgressEvent) => {
    if (!onProgress) return;
    try {
      await onProgress(ev);
    } catch {
      // never let a progress consumer crash priming
    }
  };

  const perTest: PrimeTestResult[] = [];
  let segmentsUploaded = 0;
  let segmentsSkipped = 0;
  let segmentsFailed = 0;
  let testsPrimed = 0;
  let cancelled = false;

  for (let testIndex = 0; testIndex < tests.length; testIndex++) {
    if (signal?.aborted) {
      cancelled = true;
      break;
    }
    const test = tests[testIndex];
    const result: PrimeTestResult = {
      testId: test.id,
      title: test.title,
      segmentCount: test.segments.length,
      uploaded: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };
    await emit({
      kind: "test_start",
      testIndex,
      testsTotal: tests.length,
      testId: test.id,
      title: test.title,
      segmentCount: test.segments.length,
    });
    let cursor = 0;
    async function worker() {
      while (true) {
        // Honour cancellation between segments. Any TTS/upload already in
        // flight finishes (priming is idempotent — half-uploaded segments
        // would never have been written to storage on the failure path).
        if (signal?.aborted) return;
        const i = cursor++;
        if (i >= test.segments.length) return;
        const seg = test.segments[i];
        let status: "uploaded" | "skipped" | "failed";
        let errorMessage: string | undefined;
        try {
          const r = await getOrCreateSegment(seg.text, seg.voice);
          if (r.uploaded) {
            result.uploaded += 1;
            status = "uploaded";
          } else {
            result.skipped += 1;
            status = "skipped";
          }
        } catch (err) {
          result.failed += 1;
          errorMessage = err instanceof Error ? err.message : String(err);
          result.errors.push({ index: i, message: errorMessage });
          status = "failed";
        }
        await emit({
          kind: "segment_done",
          testIndex,
          testsTotal: tests.length,
          testId: test.id,
          segmentIndex: i,
          segmentCount: test.segments.length,
          status,
          error: errorMessage,
        });
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(concurrency, test.segments.length) }, worker),
    );
    segmentsUploaded += result.uploaded;
    segmentsSkipped += result.skipped;
    segmentsFailed += result.failed;
    // A test that was interrupted mid-stream by a cancel shouldn't count as
    // "primed" even if zero segments failed — it just didn't finish.
    const interrupted = signal?.aborted && (result.uploaded + result.skipped + result.failed) < test.segments.length;
    if (result.failed === 0 && !interrupted) testsPrimed += 1;
    perTest.push(result);
    await emit({
      kind: "test_done",
      testIndex,
      testsTotal: tests.length,
      result,
    });
    if (signal?.aborted) {
      cancelled = true;
      break;
    }
  }

  return {
    testsPrimed,
    testsTotal: tests.length,
    segmentsUploaded,
    segmentsSkipped,
    segmentsFailed,
    perTest,
    cancelled,
  };
}

// ---------------------------------------------------------------------------
// Cleanup helpers — delete cached audio segments that are no longer
// referenced by any listening test in the database.
// ---------------------------------------------------------------------------

/**
 * Delete the cached audio object for a single segment hash. Returns true if
 * the storage call completed (including the object-not-found case, which is
 * treated as a no-op success because the goal — "no orphan with this hash"
 * — is already satisfied). Returns false on any underlying storage error so
 * the caller can count + report failures.
 */
export async function deleteSegmentByHash(fileHash: string): Promise<boolean> {
  // No object storage configured (Railway): there is nothing to delete and
  // the bundled static files are immutable build artefacts. Treat as a
  // successful no-op so admin update flows (cleanupReplacedSegments) don't
  // explode trying to garbage-collect cache entries that don't exist here.
  if (!isObjectStorageConfigured()) {
    return true;
  }
  const relPath = `${PUBLIC_LISTENING_PREFIX}/${fileHash}.${AUDIO_FORMAT}`;
  const fullPath = `${publicSearchPath()}/${relPath}`;
  const { bucketName, objectName } = parsePath(fullPath);
  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectName);
  try {
    await file.delete({ ignoreNotFound: true });
    return true;
  } catch {
    return false;
  }
}

export interface CleanupSummary {
  scanned: number;
  referenced: number;
  deleted: number;
  failed: number;
  // Total bytes reclaimed by successful deletes. Sum of `file.metadata.size`
  // captured *before* each delete (size is unreadable afterwards). Files
  // that fail to delete don't contribute. Reported alongside `deleted` so
  // admins know the impact of "Clean orphans" without diffing the
  // at-a-glance stats line by hand.
  bytesFreed: number;
  errors: Array<{ hash: string; message: string }>;
}

/**
 * List every audio object currently stored under the listening prefix and
 * delete those whose hash is not present in `referencedHashes`. Used by the
 * admin "Clean orphans" action to sweep up audio left behind by historical
 * deletions, edits, or aborted runs.
 *
 * `scanned` counts only files that match the `<hash>.mp3` naming convention
 * (so unrelated files in the bucket are ignored, never deleted).
 */
export async function cleanupOrphanedSegments(
  referencedHashes: Set<string>,
): Promise<CleanupSummary> {
  // No object storage configured (e.g. Railway, where audio ships bundled
  // in the image): there's nothing to clean up. Return a zero summary so
  // admin endpoints don't 500.
  if (!isObjectStorageConfigured()) {
    return {
      scanned: 0,
      referenced: referencedHashes.size,
      deleted: 0,
      failed: 0,
      bytesFreed: 0,
      errors: [],
    };
  }
  const fullPrefix = `${publicSearchPath()}/${PUBLIC_LISTENING_PREFIX}/`;
  const { bucketName, objectName: prefix } = parsePath(fullPrefix);
  const bucket = objectStorageClient.bucket(bucketName);
  const [files] = await bucket.getFiles({ prefix });

  const summary: CleanupSummary = {
    scanned: 0,
    referenced: referencedHashes.size,
    deleted: 0,
    failed: 0,
    bytesFreed: 0,
    errors: [],
  };

  const hashRe = /^([0-9a-f]+)\.mp3$/i;
  // Capture each orphan's size from the listing now — once `file.delete()`
  // succeeds the metadata is gone and we'd have no way to total the bytes
  // we just freed. Same defensive parsing as `countCachedSegments`: GCS
  // returns size as a string, some clients hand back a number, anything
  // unparseable contributes 0 rather than poisoning the total.
  const orphans: Array<{ file: typeof files[number]; hash: string; size: number }> = [];
  for (const f of files) {
    const base = f.name.slice(f.name.lastIndexOf("/") + 1);
    const m = base.match(hashRe);
    if (!m) continue;
    summary.scanned += 1;
    const hash = m[1];
    if (referencedHashes.has(hash)) continue;
    const raw = f.metadata?.size;
    const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
    const size = Number.isFinite(n) && n >= 0 ? n : 0;
    orphans.push({ file: f, hash, size });
  }

  // Bounded-concurrency delete pass. Storage round-trips dominate the
  // wall-clock cost; a small worker pool turns "deletes 200 orphans" from
  // a serial wait into ~25-50 ms total without hammering the bucket.
  const concurrency = Math.min(8, orphans.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= orphans.length) return;
      const { file, hash, size } = orphans[i];
      try {
        await file.delete({ ignoreNotFound: true });
        summary.deleted += 1;
        summary.bytesFreed += size;
      } catch (err) {
        summary.failed += 1;
        summary.errors.push({
          hash,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  return summary;
}

export interface CachedSegmentCounts {
  scanned: number;
  referenced: number;
  orphaned: number;
  bytes: number;
}

/**
 * Read-only counterpart to `cleanupOrphanedSegments`: lists every audio
 * object stored under the listening prefix that matches the `<hash>.mp3`
 * naming convention and reports how many are still referenced versus
 * orphaned, plus the total bytes occupied by the matching objects. Performs
 * no deletes — safe to call from "stats" endpoints that just want to
 * surface cache totals to admins.
 *
 * `bytes` is the sum of `file.metadata.size` for every scanned object
 * (referenced + orphaned). GCS-compatible storage already returns the size
 * in the listing, so this costs no extra round-trips beyond the existing
 * `getFiles` call.
 */
export async function countCachedSegments(
  referencedHashes: Set<string>,
): Promise<CachedSegmentCounts> {
  // No object storage configured: nothing to count. Bundled static audio is
  // served directly from disk and not tracked here.
  if (!isObjectStorageConfigured()) {
    return { scanned: 0, referenced: referencedHashes.size, orphaned: 0, bytes: 0 };
  }
  const fullPrefix = `${publicSearchPath()}/${PUBLIC_LISTENING_PREFIX}/`;
  const { bucketName, objectName: prefix } = parsePath(fullPrefix);
  const bucket = objectStorageClient.bucket(bucketName);
  const [files] = await bucket.getFiles({ prefix });

  const hashRe = /^([0-9a-f]+)\.mp3$/i;
  let scanned = 0;
  let orphaned = 0;
  let bytes = 0;
  for (const f of files) {
    const base = f.name.slice(f.name.lastIndexOf("/") + 1);
    const m = base.match(hashRe);
    if (!m) continue;
    scanned += 1;
    if (!referencedHashes.has(m[1])) orphaned += 1;
    // `metadata.size` comes back as a string from GCS-compatible storage,
    // but can also be a number on some clients. Coerce defensively and
    // skip anything we can't parse so a single malformed entry doesn't
    // poison the whole total.
    const raw = f.metadata?.size;
    const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
    if (Number.isFinite(n) && n >= 0) bytes += n;
  }
  return { scanned, referenced: referencedHashes.size, orphaned, bytes };
}

export { objectStorageService };
