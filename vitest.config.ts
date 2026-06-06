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
    // Run all test files in a single forked subprocess. The fork
    // dies cleanly when tests finish, even if any module has a
    // long-lived handle (e.g. Supabase auth's session-refresh
    // interval). Vitest 4 promoted `forks` to a top-level option
    // — the old `poolOptions.forks` was removed in v4.
    pool: "forks",
    // Vitest 4 promoted `forks` to a top-level test option. The installed
    // type bindings appear to lag the runtime — assertion silences the
    // overload error without changing behaviour. Verified working at
    // runtime (vitest 4.1.7).
    ...({ forks: { singleFork: true } } as Record<string, unknown>),
  },
});
