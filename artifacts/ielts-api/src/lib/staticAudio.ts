import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

function locateApiServerRoot(start: string): string {
  let dir = start;
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
