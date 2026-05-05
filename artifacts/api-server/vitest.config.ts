import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    globals: false,
    pool: "forks",
    // Race-safety tests touch real Postgres rows. Keep them serial so
    // parallel inserts don't trip each other's unique constraints.
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
