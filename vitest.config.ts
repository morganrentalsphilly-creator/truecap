import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    // Run each test file in its own forked process. Without this,
    // long-lived handles (Supabase auth's session-refresh interval,
    // any global timer set up at import time) keep the parent vitest
    // process alive after `Tests closed successfully` and trip the
    // 10s teardown timeout. Forking guarantees a clean exit per file.
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
