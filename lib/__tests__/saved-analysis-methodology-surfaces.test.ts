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
  "app/actions/user-buy-boxes.ts",
] as const;

describe("saved-analysis methodology surface contract", () => {
  it.each(SERVER_SAVED_SURFACES)(
    "%s reads the authoritative top-level version and uses the canonical resolver",
    (path) => {
      const source = read(path);
      expect(source).toContain("methodology_version");
      expect(source).toContain("resolveSavedAnalysisSnapshot");
      expect(source).toMatch(/methodologyVersion:\s*\w+\.methodology_version/);
    },
  );

  it.each(["lib/client-portal.ts", "lib/weekly-summary.ts"])(
    "%s recomputes externally attributed numbers and rejects frozen methodology",
    (path) => {
      const source = read(path);
      expect(source).toContain("methodology_version");
      expect(source).toContain("recomputeSavedDealVerdict");
      expect(source).toContain("shouldFreezeSavedMethodology");
      expect(source).not.toContain("resolveSavedAnalysisSnapshot");
    },
  );

  it("returns top-level methodology and trusted financing provenance to edit and PDF clients", () => {
    const source = read("app/actions/saved-analyses.ts");
    expect(
      source.match(/methodology_version/g)?.length ?? 0,
    ).toBeGreaterThanOrEqual(5);
    expect(
      source.match(/financing_profile_snapshot/g)?.length ?? 0,
    ).toBeGreaterThanOrEqual(3);
    expect(source).toContain("buildTrustedResultSnapshot");
    expect(source).toContain("parseStoredFinancingProfileSnapshot");
    expect(
      source.match(/methodologyVersion:/g)?.length ?? 0,
    ).toBeGreaterThanOrEqual(3);
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

  it("keeps already-generated owner PDFs downloadable after downgrade without allowing regeneration", () => {
    const action = read("app/actions/saved-analyses.ts");
    const page = read("components/investcalc/saved-analyses-page-v2.tsx");
    expect(action).toContain("const canGeneratePdf");
    expect(action).toContain("if (!canGeneratePdf)");
    expect(action).toContain('source: "cache"');
    expect(action).toContain("Creating a new report requires Pro");
    expect(page).toContain('exportResult.code === "ENTITLEMENT_REQUIRED"');
    expect(page).not.toMatch(
      /if \(!canExportPdf\) \{[\s\S]{0,250}router\.push\("\/profile#billing"\);[\s\S]{0,80}return;/,
    );
  });

  it("labels every user-visible legacy saved-deal view as a current-version recomputation", () => {
    for (const path of [
      "app/dashboard/saved-analyses/[id]/page.tsx",
      "app/dashboard/compare/page.tsx",
      "lib/client-portal.ts",
      "components/investcalc/investcalc-page.tsx",
    ]) {
      expect(read(path)).toContain(
        "Legacy analysis · recomputed with current v",
      );
    }

    // The two list/dashboard server surfaces now centralize this wording with
    // the cohort metadata that also prevents cross-version ranking.
    for (const path of [
      "app/dashboard/saved-analyses/page.tsx",
      "app/dashboard/page.tsx",
    ]) {
      expect(read(path)).toContain("resolveDealMethodologyPresentation");
    }
    expect(read("lib/dashboard-deal-mapping.ts")).toContain(
      "Legacy analysis · recomputed with current v",
    );
    expect(read("components/investcalc/saved-analyses-page-v2.tsx")).toContain(
      "item.methodologyLabel",
    );
  });

  it("never routes saved analyses by the mutable snapshot's embedded version", () => {
    const source = read("lib/saved-analysis-methodology.ts");
    expect(source).toContain("input.methodologyVersion");
    expect(source).not.toMatch(/resultSnapshot[^\n]*methodologyVersion/);
  });
});
