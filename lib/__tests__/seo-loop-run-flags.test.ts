import { afterAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { computeFlags, criticSchema, demotedTypes } from "../../seo/scripts/run-flags.ts";
import type { VerifyFile } from "../../seo/scripts/lib/types.ts";

/**
 * seo/scripts/run-flags.ts: the facts one run acts on. Here, the two it hands
 * to the fences that used to exist only in the model's instructions: the
 * brakes' demoted change types (verify-static makes them tier 2) and the
 * critic's output schema (publish-plan matches its file keys exactly).
 */

const ROOT = path.resolve(__dirname, "../..");
const SCRIPT = path.join(ROOT, "seo", "scripts", "run-flags.ts");
const tmpDirs: string[] = [];
afterAll(() => {
  for (const dir of tmpDirs) rmSync(dir, { recursive: true, force: true });
});

const base = { runId: "1", date: "2026-09-28", mode: "review", calibration: 0, candidates: null, indexStatus: null, crawl: null, ledger: [] };

describe("demoted change types", () => {
  it("copies brakes.demotedChangeTypes into the flags as cleaned slugs", () => {
    const flags = computeFlags({ ...base, brakes: { demotedChangeTypes: [{ changeType: "Title Meta", lossRate: 0.5, scored: 12 }, { changeType: "citations", lossRate: 0.45, scored: 10 }] } });
    expect(flags.demotedChangeTypes).toEqual(["citations", "title-meta"]);
  });

  it("reads no brakes file as nothing demoted, but refuses a brakes file without the list", () => {
    expect(computeFlags({ ...base, brakes: null }).demotedChangeTypes).toEqual([]);
    expect(demotedTypes({ demotedChangeTypes: [] })).toEqual([]);
    expect(() => demotedTypes({})).toThrow(/no demotedChangeTypes list/);
    expect(() => demotedTypes({ demotedChangeTypes: [{ lossRate: 1 } as never] })).toThrow(/without a changeType/);
  });

  it("the CLI writes them from the newest brakes file, and fails on a broken one", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "seo-run-flags-"));
    tmpDirs.push(dir);
    const data = path.join(dir, "data");
    mkdirSync(data, { recursive: true });
    const env = { ...process.env, SEO_STATE_DIR: dir, SEO_DATA_DIR: data, SEO_TODAY: "2026-09-28" };
    const run = () => spawnSync(process.execPath, ["--disable-warning=ExperimentalWarning", SCRIPT, "--run-id", "9", "--calibration", "2"], { env, encoding: "utf8" });
    writeFileSync(path.join(data, "brakes-2026-09-28.json"), JSON.stringify({ demotedChangeTypes: [{ changeType: "title-meta", lossRate: 0.6, scored: 10 }] }));
    const ok = run();
    expect(ok.status, ok.stderr).toBe(0);
    expect(JSON.parse(readFileSync(path.join(data, "run-flags.json"), "utf8")).demotedChangeTypes).toEqual(["title-meta"]);
    writeFileSync(path.join(data, "brakes-2026-09-28.json"), JSON.stringify({ generatedAt: "x" }));
    const broken = run();
    expect(broken.status).toBe(1);
    expect(broken.stderr).toContain("no demotedChangeTypes list");
  });
});

describe("critic schema", () => {
  const f = (p: string, tier: 0 | 1 | 2): VerifyFile => ({ path: p, status: "M", tier, url: null, addedLines: 1, removedLines: 1 });

  it("restricts `file` to the tier-1 and tier-2 paths and needs a verdict for each", () => {
    const schema = JSON.parse(criticSchema({ files: [f("app/blog/a/page.tsx", 1), f("app/blog/b/page.tsx", 0), f("app/research/c/page.tsx", 2)] }));
    const items = schema.properties.verdicts.items;
    expect(items.properties.file).toEqual({ type: "string", enum: ["app/blog/a/page.tsx", "app/research/c/page.tsx"] });
    expect(items.properties.verdict.enum).toEqual(["APPROVE", "REJECT"]);
    expect(items.required).toEqual(["file", "verdict", "reasons"]);
    expect(schema.properties.verdicts.minItems).toBe(2);
  });

  it("stays safe inside a single-quoted shell argument, and refuses an odd path or an empty list", () => {
    const text = criticSchema({ files: [f("content/seo/market-facts.json", 1)] });
    expect(text).not.toContain("'");
    expect(() => criticSchema({ files: [f("app/blog/it's/page.tsx", 1)] })).toThrow(/unsafe path/);
    expect(() => criticSchema({ files: [f("app/blog/a/page.tsx", 0)] })).toThrow(/no tier-1 or tier-2 file/);
  });
});
