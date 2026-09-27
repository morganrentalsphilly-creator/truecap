/**
 * Every SEO-loop script must load and pass its --self-test under REAL Node
 * (native TypeScript type stripping), not just under vitest's transformer.
 * Vitest compiles with esbuild and elides unused imports, so it hides the
 * failures that only plain `node seo/scripts/<name>.ts` hits: an enum, a
 * parameter property, a value import that should be `import type`, an
 * extensionless relative import. The workflows run the scripts with node.
 */

import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SCRIPTS_DIR = path.resolve(__dirname, "../../seo/scripts");
const scripts = readdirSync(SCRIPTS_DIR).filter((name) => name.endsWith(".ts")).sort();

describe("seo/scripts load and self-test under plain node", () => {
  it("finds the toolkit", () => {
    expect(scripts.length).toBeGreaterThanOrEqual(19);
  });

  it.each(scripts)("%s --self-test", (name) => {
    const out = execFileSync(process.execPath, ["--disable-warning=ExperimentalWarning", path.join(SCRIPTS_DIR, name), "--self-test"], {
      encoding: "utf8",
      env: { ...process.env, SEO_DATA_DIR: path.join(SCRIPTS_DIR, "..", "..", "node_modules", ".seo-self-test-data") },
      timeout: 60_000,
    });
    expect(out).toContain(`self-test ok ${name}`);
  });
});
