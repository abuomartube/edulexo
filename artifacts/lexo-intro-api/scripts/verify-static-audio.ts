/**
 * Build-time guard: verifies that every segment referenced by the listening
 * test bank has its corresponding `<hash>.mp3` already present in
 * `artifacts/api-server/static-audio/listening/`.
 *
 * Why: production (Railway) ships these files baked into the Docker image —
 * there's no object storage sidecar, so a hash referenced by the test bank
 * but missing on disk turns into a silent 404 at playback time. This script
 * makes that drift impossible to ship: the build fails fast with a clear
 * message telling the developer to re-run `prepare-static-audio.ts`.
 *
 * It does NOT call the TTS API or touch the network. It is intentionally
 * cheap so it can run as a `prebuild` step on every `pnpm build`.
 *
 * Mirrors the exact hashing inputs used by both the runtime
 * (`src/listening/audioCache.ts`) and the prep script
 * (`scripts/prepare-static-audio.ts`). If those constants ever change, this
 * file must be updated in lockstep.
 *
 * Exit codes:
 *   0 — every referenced hash is present on disk.
 *   1 — one or more hashes are missing. Stderr lists each missing entry
 *       with a short text preview so the offender is easy to identify.
 */

import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { TESTS, type Voice } from "../src/listening/testBank";

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

interface MissingEntry {
  hash: string;
  voice: Voice;
  testId: string;
  testTitle: string;
  segmentIndex: number;
  textPreview: string;
}

function preview(text: string, max = 80): string {
  const collapsed = text.trim().replace(/\s+/g, " ");
  return collapsed.length <= max ? collapsed : `${collapsed.slice(0, max - 1)}…`;
}

function main(): void {
  const missing: MissingEntry[] = [];
  const checked = new Set<string>();
  let totalRefs = 0;

  for (const test of TESTS) {
    test.segments.forEach((seg, i) => {
      totalRefs++;
      const hash = hashSegment(seg.text, seg.voice);
      if (checked.has(hash)) return;
      checked.add(hash);

      const dest = path.join(STATIC_AUDIO_DIR, `${hash}.${AUDIO_FORMAT}`);
      let ok = false;
      try {
        const st = fs.statSync(dest);
        ok = st.isFile() && st.size > 0;
      } catch {
        ok = false;
      }
      if (!ok) {
        missing.push({
          hash,
          voice: seg.voice,
          testId: test.id,
          testTitle: test.title,
          segmentIndex: i,
          textPreview: preview(seg.text),
        });
      }
    });
  }

  const uniqueRefs = checked.size;

  if (missing.length === 0) {
    process.stdout.write(
      `[verify-static-audio] OK: ${uniqueRefs} unique segment(s) ` +
        `(${totalRefs} reference(s)) all present in ${STATIC_AUDIO_DIR}\n`,
    );
    return;
  }

  process.stderr.write(
    `\n[verify-static-audio] FAIL: ${missing.length} of ${uniqueRefs} unique ` +
      `segment(s) referenced by the listening test bank are missing from\n` +
      `  ${STATIC_AUDIO_DIR}\n\n` +
      `Missing files (these would 404 at runtime in production):\n`,
  );
  for (const m of missing) {
    process.stderr.write(
      `  - ${m.hash}.mp3  [${m.voice}]  ${m.testId} "${m.testTitle}" seg#${m.segmentIndex}\n` +
        `      "${m.textPreview}"\n`,
    );
  }
  process.stderr.write(
    `\nFix: regenerate the bundled audio, then rebuild:\n` +
      `  pnpm --filter @workspace/api-server exec tsx scripts/prepare-static-audio.ts\n` +
      `\nSee artifacts/api-server/static-audio/README.md for the full workflow.\n\n`,
  );
  process.exit(1);
}

main();
