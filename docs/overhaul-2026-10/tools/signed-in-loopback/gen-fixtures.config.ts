// Runs gen-fixtures.vitest.ts, and only that, with the repo's Vitest config
// (the `@/` alias and the server-only stub). From the repo root:
//
//   npx vitest run -c docs/overhaul-2026-10/tools/signed-in-loopback/gen-fixtures.config.ts
import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vitest/config";
import base from "../../../../vitest.config";

export default mergeConfig(
  base,
  defineConfig({
    root: fileURLToPath(new URL("../../../../", import.meta.url)),
    test: {
      include: ["docs/overhaul-2026-10/tools/signed-in-loopback/gen-fixtures.vitest.ts"],
    },
  }),
);
