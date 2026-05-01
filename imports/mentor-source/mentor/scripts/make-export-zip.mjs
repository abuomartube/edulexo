import { createRequire } from "node:module";
import { createWriteStream, mkdirSync, statSync, readdirSync } from "node:fs";
import { resolve, join, relative } from "node:path";

const require = createRequire(import.meta.url);
const archiverPath = resolve("node_modules/.pnpm/archiver@5.3.2/node_modules/archiver");
const archiver = require(archiverPath);

const ROOT = resolve(process.cwd());
const OUT_DIR = resolve(ROOT, "exports");
mkdirSync(OUT_DIR, { recursive: true });
const OUT_FILE = resolve(OUT_DIR, "speak-write-ai.zip");

const EXCLUDE_DIR_NAMES = new Set([
  "node_modules", ".git", ".cache", ".local", ".agents", ".config",
  "exports", "attached_assets", "dist", "build", ".turbo", ".next", ".vite",
]);
const EXCLUDE_FILE_SUFFIXES = [".tsbuildinfo", ".log", ".DS_Store"];
const EXCLUDE_FILE_NAMES = new Set([".replit", "replit.nix"]);

function shouldSkipDir(name) {
  return EXCLUDE_DIR_NAMES.has(name);
}
function shouldSkipFile(name) {
  if (EXCLUDE_FILE_NAMES.has(name)) return true;
  for (const sfx of EXCLUDE_FILE_SUFFIXES) if (name.endsWith(sfx)) return true;
  return false;
}

const out = createWriteStream(OUT_FILE);
const archive = archiver("zip", { zlib: { level: 9 } });
let fileCount = 0;

out.on("close", () => {
  const size = statSync(OUT_FILE).size;
  console.log(`\nWrote ${OUT_FILE}`);
  console.log(`Size:  ${(size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Files: ${fileCount}`);
});
archive.on("warning", (err) => { if (err.code !== "ENOENT") throw err; });
archive.on("error", (err) => { throw err; });
archive.pipe(out);

const ROOT_PREFIX = "speak-write-ai";

function walk(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const ent of entries) {
    const full = join(dir, ent.name);
    if (ent.isSymbolicLink()) continue;
    if (ent.isDirectory()) {
      if (shouldSkipDir(ent.name)) continue;
      walk(full);
    } else if (ent.isFile()) {
      if (shouldSkipFile(ent.name)) continue;
      const rel = relative(ROOT, full);
      archive.file(full, { name: join(ROOT_PREFIX, rel) });
      fileCount++;
    }
  }
}

walk(ROOT);
console.log(`Queued ${fileCount} files, finalizing...`);
await archive.finalize();
