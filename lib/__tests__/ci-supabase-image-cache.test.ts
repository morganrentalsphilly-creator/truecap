import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// js-yaml ships no type declarations; its one call used here is typed by hand.
const ROOT = join(import.meta.dirname, "../..");
const { load } = createRequire(join(ROOT, "package.json"))("js-yaml") as { load(text: string): unknown };

// browser-regressions is a required check. Its `supabase start` pulls images
// from public.ecr.aws, whose anonymous data limit failed it on three PRs on
// 2026-09-27 with no code at fault. The cache and the retry are what keep a
// registry throttle from reading as a red build.

type Step = { name?: string; uses?: string; if?: string; run?: string; with?: Record<string, string>; "continue-on-error"?: boolean };

const ci = load(readFileSync(join(ROOT, ".github/workflows/ci.yml"), "utf8")) as {
  jobs: Record<string, { steps: Step[] }>;
};
const steps = ci.jobs["browser-regressions"].steps;
const index = (name: string) => steps.findIndex((s) => s.name === name);

describe("browser-regressions Supabase image cache", () => {
  it("restores and loads cached images before starting Supabase", () => {
    const restore = steps[index("Restore Supabase images")];
    expect(restore.uses).toMatch(/^actions\/cache\/restore@/);
    expect(restore.with?.key).toContain("steps.supabase-images-key.outputs.key");
    expect(index("Load cached Supabase images")).toBeGreaterThan(index("Restore Supabase images"));
    expect(index("Start disposable Supabase")).toBeGreaterThan(index("Load cached Supabase images"));
  });

  it("keys the cache on the pinned CLI version and the service config", () => {
    const run = steps[index("Supabase image cache key")].run ?? "";
    expect(run).toContain("packages['node_modules/supabase'].version");
    expect(run).toContain("hashFiles('supabase/config.toml')");
  });

  it("retries a failed start before failing the job", () => {
    const run = steps[index("Start disposable Supabase")].run ?? "";
    expect(run).toMatch(/for attempt in 1 2 3/);
    expect(run).toContain("supabase stop --no-backup");
  });

  it("saves images after a start only on a cache miss, and never fails the job doing it", () => {
    for (const name of ["Export Supabase images for the cache", "Save Supabase images"]) {
      const step = steps[index(name)];
      expect(index(name)).toBeGreaterThan(index("Start disposable Supabase"));
      expect(step.if).toBe("steps.supabase-images.outputs.cache-hit != 'true'");
      expect(step["continue-on-error"]).toBe(true);
    }
  });
});
