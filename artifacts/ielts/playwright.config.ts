import { defineConfig, devices } from "@playwright/test";

const NIX_GLIBC40 =
  "/nix/store/g8zyryr9cr6540xsyg4avqkwgxpnwj2a-glibc-2.40-66/lib";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:80",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
    launchOptions: {
      env: {
        ...process.env,
        // Nix libs use DT_RUNPATH, so LD_LIBRARY_PATH is searched BEFORE their
        // embedded glibc-2.33 path.  Putting glibc-2.40 first here means every
        // transitive librt/libpthread/libc lookup resolves to the same glibc
        // version that the chromium interpreter was patched to use, eliminating
        // the GLIBC_PRIVATE mismatch crash.
        LD_LIBRARY_PATH: NIX_GLIBC40,
        // Clear Replit's rtld audit library from the browser process env.
        // That .so is compiled for the host glibc and causes a SIGSEGV when
        // the browser binary uses a different glibc via patchelf.
        LD_PRELOAD: "",
      },
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
