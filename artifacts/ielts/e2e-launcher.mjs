#!/usr/bin/env node
/**
 * e2e-launcher.mjs
 *
 * Sets LD_LIBRARY_PATH so the Playwright Chromium binary can find its
 * Nix-store dependencies (glib, dbus, atk, X11, …) at load time, then
 * spawns `node <playwright-cli>` directly — bypassing the shell wrapper in
 * node_modules/.bin/playwright so that /bin/sh never inherits the modified
 * LD_LIBRARY_PATH (which would crash it due to a Nix-glibc version mismatch).
 */
import { execSync, spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// ── 1. Build the Nix library search path ─────────────────────────────────────

// Nix glibc MUST be first so that Nix-compiled packages (at-spi2-atk, dbus, …)
// find the right libpthread / librt without a GLIBC_PRIVATE mismatch.
// The chromium binary itself only needs up to GLIBC_2.25 (checked via objdump),
// so glibc 2.33 satisfies it fine.
const NIX_GLIBC =
  "/nix/store/9bh3986bpragfjmr32gay8p95k91q4gy-glibc-2.33-47/lib";

// glib is typically installed in one of these two content-addressed paths.
const GLIB_EXTRA = [
  "/nix/store/3jz43ya7j65mh53nj262rilsk1j2jb68-glib-2.68.3/lib",
  "/nix/store/z2pn444bdd6h77k3mx7yw7wnzarw8kb1-glib-2.68.3/lib",
];

// Dynamic: lib dirs of every user-installed nix-env package (picks up new installs).
let nixPkgLibs = [];
try {
  nixPkgLibs = execSync("nix-env -q --out-path 2>/dev/null", {
    encoding: "utf8",
    timeout: 15_000,
  })
    .split("\n")
    .map((line) => {
      const parts = line.trim().split(/\s+/);
      const storePath = parts[1]?.replace(/^out=/, "");
      return storePath?.startsWith("/nix/store")
        ? `${storePath}/lib`
        : null;
    })
    .filter(Boolean);
} catch {
  // nix-env unavailable — continue with hardcoded paths only
}

const segments = [
  NIX_GLIBC,
  ...GLIB_EXTRA,
  ...nixPkgLibs,
  process.env["LD_LIBRARY_PATH"] || "",
].filter(Boolean);

process.env["LD_LIBRARY_PATH"] = [...new Set(segments)].join(":");

// ── 2. Resolve playwright CLI entry point (avoids the /bin/sh wrapper) ───────

// node_modules/.bin/playwright is a shell script that ultimately runs:
//   node <basedir>/../@playwright/test/cli.js
// We resolve that path directly so we can exec node without any shell.
const playwrightCli = resolve(
  __dirname,
  "node_modules/.pnpm/@playwright+test@1.59.1/node_modules/@playwright/test/cli.js"
);

// ── 3. Forward all argv to playwright ────────────────────────────────────────

const args = process.argv.slice(2); // e.g. ["test", "--project=chromium"]

const child = spawn(process.execPath, [playwrightCli, ...args], {
  stdio: "inherit",
  env: process.env,
});

child.on("close", (code) => process.exit(code ?? 0));
