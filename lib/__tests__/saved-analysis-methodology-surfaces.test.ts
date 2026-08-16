import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

const SERVER_SAVED_SURFACES = [
  "app/dashboard/saved-analyses/page.tsx",
  "app/dashboard/saved-analyses/[id]/page.tsx",
  "app/dashboard/page.tsx",
  "app/dashboard/compare/page.tsx",
  "lib/client-portal.ts",
  "app/actions/user-buy-boxes.ts",
  "lib/weekly-summary.ts",
] as const;

describe("saved-analysis methodology surface contract", () => {
  it.each(SERVER_SAVED_SURFACES)(
    "%s reads the authoritative top-level version and uses the canonical resolver",
    (path) => {
      const source = read(path);
      expect(source).toContain("methodology_version");
      expect(source).toContain("resolveSavedAnalysisSnapshot");
      expect(source).toMatch(/methodologyVersion:\s*\w+\.methodology_version/);
    }
  );

  it("returns top-level methodology and trusted financing provenance to edit and PDF clients", () => {
    const source = read("app/actions/saved-analyses.ts");
    expect(source.match(/methodology_version/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
    expect(source.match(/financing_profile_snapshot/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(source).toContain("buildTrustedResultSnapshot");
    expect(source).toContain("parseStoredFinancingProfileSnapshot");
    expect(source.match(/methodologyVersion:/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
  });

  it("routes analyzer restore and saved-PDF generation through the canonical result resolver", () => {
    for (const path of [
      "components/investcalc/investcalc-page.tsx",
      "components/investcalc/saved-analyses-page-v2.tsx",
    ]) {
      const source = read(path);
      expect(source).toContain("resolveSavedAnalysisResult");
      expect(source).toMatch(/methodologyVersion:\s*[\w.]+/);
    }
  });

  it("labels every user-visible legacy saved-deal view as a current-version recomputation", () => {
    for (const path of [
      "app/dashboard/saved-analyses/page.tsx",
      "app/dashboard/saved-analyses/[id]/page.tsx",
      "app/dashboard/page.tsx",
      "app/dashboard/compare/page.tsx",
      "lib/client-portal.ts",
      "components/investcalc/investcalc-page.tsx",
      "components/investcalc/saved-analyses-page-v2.tsx",
    ]) {
      expect(read(path)).toContain("Legacy analysis · recomputed with current v");
    }
  });

  it("never routes saved analyses by the mutable snapshot's embedded version", () => {
    const source = read("lib/saved-analysis-methodology.ts");
    expect(source).toContain("input.methodologyVersion");
    expect(source).not.toMatch(/resultSnapshot[^\n]*methodologyVersion/);
  });
});
