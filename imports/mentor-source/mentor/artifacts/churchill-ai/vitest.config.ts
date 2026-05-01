import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // Default to node for the existing pure-helper tests; the React-mounting
    // integration test opts into jsdom via a `// @vitest-environment jsdom`
    // directive at the top of its file so we don't pay the jsdom boot cost
    // for every test in the suite.
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node",
    globals: false,
    pool: "forks",
  },
});
