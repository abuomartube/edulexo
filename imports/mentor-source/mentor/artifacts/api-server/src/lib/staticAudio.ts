// Bundled static audio lookup.
//
// On Railway (and any host without Replit object storage available) we ship
// every cached `<hash>.mp3` directly inside the Docker image so listening
// playback works with zero external storage dependencies. This module
// resolves the on-disk location of those files in a way that works whether
// the server is running as the bundled `dist/index.mjs` (production) or via
// `tsx` against `src/` (rare dev path).
//
// Layout:  <repo>/artifacts/api-server/static-audio/<relPath>
// Example: <repo>/artifacts/api-server/static-audio/listening/abc...123.mp3

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

function locateApiServerRoot(start: string): string {
  let dir = start;
  // Walk upward until we find a directory whose parent basename is
  // "artifacts" — that's `artifacts/api-server`. Falls back to the start
  // directory if we hit the filesystem root without a match.
  while (true) {
    if (path.basename(path.dirname(dir)) === "artifacts") return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return start;
    dir = parent;
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiServerRoot = locateApiServerRoot(__dirname);

export const STATIC_AUDIO_ROOT = path.join(apiServerRoot, "static-audio");

/**
 * Returns the absolute path to the bundled static audio file for `relPath`
 * (e.g. `"listening/abc.mp3"`) if it exists, otherwise null.
 *
 * Refuses any relPath that escapes STATIC_AUDIO_ROOT after normalisation —
 * defensive against `..` traversal in the request path even though the
 * caller already constrains the prefix.
 */
export function findStaticAudio(relPath: string): string | null {
  const candidate = path.resolve(STATIC_AUDIO_ROOT, relPath);
  const root = STATIC_AUDIO_ROOT.endsWith(path.sep)
    ? STATIC_AUDIO_ROOT
    : STATIC_AUDIO_ROOT + path.sep;
  if (candidate !== STATIC_AUDIO_ROOT && !candidate.startsWith(root)) {
    return null;
  }
  try {
    if (fs.statSync(candidate).isFile()) return candidate;
  } catch {
    // ENOENT or similar — treat as "not bundled".
  }
  return null;
}

export function staticAudioExists(relPath: string): boolean {
  return findStaticAudio(relPath) !== null;
}
