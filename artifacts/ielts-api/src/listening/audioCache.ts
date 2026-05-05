import crypto from "node:crypto";
import { Readable } from "node:stream";
import OpenAI from "openai";
import {
  objectStorageClient,
  ObjectStorageService,
} from "../lib/objectStorage";
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

export function segmentHash(text: string, voice: Voice): string {
  return hashSegment(text, voice, TTS_SPEED);
}

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
  const first = raw
    .split(",")
    .map((s) => s.trim())
    .find(Boolean);
  if (!first) {
    throw new Error("PUBLIC_OBJECT_SEARCH_PATHS not set");
  }
  return first;
}

function isObjectStorageConfigured(): boolean {
  const raw = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
  return raw.split(",").some((s) => s.trim().length > 0);
}

async function textToSpeech(text: string, voice: Voice): Promise<Buffer> {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  const openai = new OpenAI({ apiKey });
  const response = await openai.audio.speech.create({
    model: "tts-1",
    voice: voice as "alloy" | "nova",
    input: text,
    response_format: "mp3",
  });
  return Buffer.from(await response.arrayBuffer());
}

export interface SegmentPrimeResult {
  url: string;
  uploaded: boolean;
}

export async function getOrCreateSegment(
  text: string,
  voice: Voice,
): Promise<SegmentPrimeResult> {
  const fileHash = hashSegment(text, voice, TTS_SPEED);
  const relPath = `${PUBLIC_LISTENING_PREFIX}/${fileHash}.${AUDIO_FORMAT}`;

  if (inFlight.has(fileHash)) {
    return inFlight.get(fileHash)!;
  }

  if (staticAudioExists(relPath)) {
    return { url: relPath, uploaded: false };
  }

  const fullPath = `${publicSearchPath()}/${relPath}`;
  const { bucketName, objectName } = parsePath(fullPath);

  const promise = (async () => {
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    const [exists] = await file.exists();
    if (exists) {
      return { url: relPath, uploaded: false };
    }
    const buf = await textToSpeech(text, voice);
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
  promise.catch(() => {}).finally(() => inFlight.delete(fileHash));
  return promise;
}

export async function getOrCreateSegmentUrl(
  text: string,
  voice: Voice,
): Promise<string> {
  const { url } = await getOrCreateSegment(text, voice);
  return url;
}

export async function buildAudioManifest(
  segments: Array<{ voice: Voice; text: string }>,
): Promise<Array<{ voice: Voice; text: string; url: string }>> {
  const results: Array<{ voice: Voice; text: string; url: string }> = new Array(
    segments.length,
  );
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
  await Promise.all(
    Array.from({ length: Math.min(concurrency, segments.length) }, worker),
  );
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

export async function primeAllTests(
  tests: Array<{
    id: string;
    title: string;
    segments: Array<{ voice: Voice; text: string }>;
  }>,
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
      Array.from(
        { length: Math.min(concurrency, test.segments.length) },
        worker,
      ),
    );
    segmentsUploaded += result.uploaded;
    segmentsSkipped += result.skipped;
    segmentsFailed += result.failed;
    const interrupted =
      signal?.aborted &&
      result.uploaded + result.skipped + result.failed < test.segments.length;
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

export async function deleteSegmentByHash(fileHash: string): Promise<boolean> {
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
  bytesFreed: number;
  errors: Array<{ hash: string; message: string }>;
}

export async function cleanupOrphanedSegments(
  referencedHashes: Set<string>,
): Promise<CleanupSummary> {
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
  const orphans: Array<{
    file: (typeof files)[number];
    hash: string;
    size: number;
  }> = [];
  for (const f of files) {
    const base = f.name.slice(f.name.lastIndexOf("/") + 1);
    const m = base.match(hashRe);
    if (!m) continue;
    summary.scanned += 1;
    const hash = m[1];
    if (referencedHashes.has(hash)) continue;
    const raw = f.metadata?.size;
    const n =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? Number(raw)
          : NaN;
    const size = Number.isFinite(n) && n >= 0 ? n : 0;
    orphans.push({ file: f, hash, size });
  }

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

export async function countCachedSegments(
  referencedHashes: Set<string>,
): Promise<CachedSegmentCounts> {
  if (!isObjectStorageConfigured()) {
    return {
      scanned: 0,
      referenced: referencedHashes.size,
      orphaned: 0,
      bytes: 0,
    };
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
    const raw = f.metadata?.size;
    const n =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? Number(raw)
          : NaN;
    if (Number.isFinite(n) && n >= 0) bytes += n;
  }
  return { scanned, referenced: referencedHashes.size, orphaned, bytes };
}

export { objectStorageService };
