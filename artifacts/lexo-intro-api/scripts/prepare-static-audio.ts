/**
 * Generates the bundled listening audio that ships inside the Docker image.
 *
 * Why: production runs on Railway, which doesn't have Replit's object
 * storage sidecar — so the API server can't fetch / write `<hash>.mp3`
 * files at runtime. Instead we pre-render every segment locally and bake
 * the resulting files into `artifacts/api-server/static-audio/listening/`.
 * The runtime then serves them straight from disk.
 *
 * Strategy per segment:
 *   1. compute the same `<hash>.mp3` filename the runtime expects
 *   2. if the file already exists on disk → skip
 *   3. else if Replit object storage has a copy → download it (free, fast)
 *   4. else generate via OpenAI TTS and write to disk
 *
 * Idempotent. Safe to re-run. Run after editing the test bank.
 *
 *   pnpm --filter @workspace/api-server exec tsx scripts/prepare-static-audio.ts
 */

import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { textToSpeech } from "@workspace/integrations-openai-ai-server/audio";
import { TESTS, type Voice } from "../src/listening/testBank";
import { ObjectStorageService } from "../src/lib/objectStorage";

const TTS_MODEL = "gpt-audio";
const TTS_SPEED = 0.92;
const AUDIO_FORMAT = "mp3" as const;
const PUBLIC_LISTENING_PREFIX = "listening";

function hashSegment(text: string, voice: Voice): string {
  const h = crypto.createHash("sha256");
  h.update(`${TTS_MODEL}|${voice}|${TTS_SPEED}|${AUDIO_FORMAT}|${text.trim()}`);
  return h.digest("hex").slice(0, 32);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATIC_AUDIO_DIR = path.resolve(
  __dirname,
  "..",
  "static-audio",
  PUBLIC_LISTENING_PREFIX,
);

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function fileExists(p: string): Promise<boolean> {
  try {
    const st = await fs.stat(p);
    return st.isFile() && st.size > 0;
  } catch {
    return false;
  }
}

/**
 * Atomic file write: stage to a sibling temp file, then rename into place.
 * Guarantees the destination either doesn't exist or is the complete,
 * intended payload — never a half-written truncated file. Critical for
 * idempotent reruns: a partial file from an interrupted previous run
 * would otherwise satisfy `fileExists()` and be silently kept forever.
 *
 * Also rejects empty payloads up front to surface API/storage problems
 * loudly instead of writing a 0-byte placeholder.
 */
async function atomicWrite(dest: string, data: Buffer): Promise<void> {
  if (!data || data.length === 0) {
    throw new Error(`refusing to write empty payload to ${dest}`);
  }
  // pid + UUID suffix → collision-proof even if multiple copies of this
  // script are accidentally run in parallel against the same dest dir.
  const tmp = `${dest}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tmp, data);
  await fs.rename(tmp, dest);
}

interface Segment {
  voice: Voice;
  text: string;
}

function collectSegments(): Segment[] {
  const out: Segment[] = [];
  const seen = new Set<string>();
  for (const test of TESTS) {
    for (const seg of test.segments) {
      const key = `${seg.voice}|${seg.text.trim()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ voice: seg.voice, text: seg.text });
    }
  }
  return out;
}

async function tryDownloadFromStorage(
  storage: ObjectStorageService,
  hash: string,
): Promise<Buffer | null> {
  if (!storage.isConfigured()) return null;
  const relPath = `${PUBLIC_LISTENING_PREFIX}/${hash}.${AUDIO_FORMAT}`;
  try {
    const file = await storage.searchPublicObject(relPath);
    if (!file) return null;
    const [buf] = await file.download();
    return buf as Buffer;
  } catch (err) {
    process.stderr.write(
      `  storage lookup failed for ${hash}: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    return null;
  }
}

async function main(): Promise<void> {
  // Optional `--limit N` cap: process at most N *new* segments before
  // exiting cleanly. Lets the script be chained from a tool that has a
  // shorter wall-clock budget than a full ~280-segment first run.
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : Number.POSITIVE_INFINITY;

  await ensureDir(STATIC_AUDIO_DIR);
  const segments = collectSegments();
  process.stdout.write(
    `Preparing ${segments.length} unique audio segments → ${STATIC_AUDIO_DIR}` +
      (Number.isFinite(limit) ? ` (limit=${limit})` : "") +
      "\n",
  );

  const storage = new ObjectStorageService();
  if (storage.isConfigured()) {
    process.stdout.write("Object storage detected — will reuse cached files when available.\n");
  } else {
    process.stdout.write("Object storage NOT configured — every missing file will be TTS-generated.\n");
  }

  let skipped = 0;
  let downloaded = 0;
  let generated = 0;
  let failed = 0;
  let processedNew = 0;

  for (let i = 0; i < segments.length; i++) {
    if (processedNew >= limit) {
      process.stdout.write(`\nLimit (${limit}) reached — exiting early.\n`);
      break;
    }
    const seg = segments[i];
    const hash = hashSegment(seg.text, seg.voice);
    const dest = path.join(STATIC_AUDIO_DIR, `${hash}.${AUDIO_FORMAT}`);
    const tag = `[${i + 1}/${segments.length}] ${hash} (${seg.voice})`;

    if (await fileExists(dest)) {
      skipped++;
      // Quiet skip — log only every 25th to keep output readable.
      if (skipped % 25 === 0) process.stdout.write(`${tag} skip (already on disk)\n`);
      continue;
    }
    processedNew++;

    const fromStorage = await tryDownloadFromStorage(storage, hash);
    if (fromStorage) {
      await atomicWrite(dest, fromStorage);
      downloaded++;
      process.stdout.write(`${tag} downloaded (${fromStorage.length} bytes)\n`);
      continue;
    }

    try {
      const buf = await textToSpeech(seg.text, seg.voice, AUDIO_FORMAT);
      await atomicWrite(dest, buf);
      generated++;
      process.stdout.write(`${tag} generated (${buf.length} bytes)\n`);
    } catch (err) {
      failed++;
      process.stderr.write(
        `${tag} FAILED: ${err instanceof Error ? err.message : String(err)}\n`,
      );
    }
  }

  process.stdout.write(
    `\nDone. skipped=${skipped} downloaded=${downloaded} generated=${generated} failed=${failed}\n`,
  );
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  process.stderr.write(
    `Fatal error: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`,
  );
  process.exit(1);
});
