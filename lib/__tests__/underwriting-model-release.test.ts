import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  getUnderwritingV2StartingDefaults,
  investmentFormSchema,
  normalizeInvestmentFormDraft,
  normalizeInvestmentFormSnapshot,
} from "@/lib/investcalc-schema";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";
import {
  isReleasedUnderwritingModel,
  isReleasedUnderwritingSnapshot,
  normalizeReleasedInvestmentFormDraft,
  normalizeReleasedInvestmentFormSnapshot,
  releasedInvestmentFormSchema,
} from "@/lib/underwriting-model-release";

const root = process.cwd();

function source(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function validV2Input() {
  return {
    ...SAMPLE_DEAL_FIXTURE.values,
    ...getUnderwritingV2StartingDefaults("2026-08-24"),
    currentMonthlyRent: SAMPLE_DEAL_FIXTURE.values.monthlyRent,
    hoaMonthly: SAMPLE_DEAL_FIXTURE.values.hoaMonthly ?? 0,
    utilitiesMonthly: SAMPLE_DEAL_FIXTURE.values.utilitiesMonthly ?? 0,
    rehabBudget: SAMPLE_DEAL_FIXTURE.values.rehabBudget ?? 0,
  };
}

describe("underwriting model release boundary", () => {
  it("keeps missing and explicit v1 public while v2 stays internal-only", () => {
    expect(releasedInvestmentFormSchema.safeParse(SAMPLE_DEAL_FIXTURE.values).success).toBe(true);
    expect(
      releasedInvestmentFormSchema.safeParse({
        ...SAMPLE_DEAL_FIXTURE.values,
        underwritingModelVersion: "1.0",
      }).success
    ).toBe(true);

    const v2 = validV2Input();
    expect(investmentFormSchema.safeParse(v2).success).toBe(true);
    expect(isReleasedUnderwritingModel(v2)).toBe(false);
    const publicParse = releasedInvestmentFormSchema.safeParse(v2);
    expect(publicParse.success).toBe(false);
    if (!publicParse.success) {
      expect(publicParse.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["underwritingModelVersion"] }),
        ])
      );
    }
  });

  it("rejects complete and malformed v2 before tolerant persisted normalization", () => {
    const completeV2 = validV2Input();
    const malformedV2 = {
      underwritingModelVersion: "2.0",
      address: "Crafted internal snapshot",
    };

    for (const raw of [completeV2, malformedV2]) {
      expect(isReleasedUnderwritingSnapshot(raw)).toBe(false);
      expect(normalizeReleasedInvestmentFormSnapshot(raw)).toBeNull();
      expect(normalizeReleasedInvestmentFormDraft(raw)).toBeNull();
    }
  });

  it("fails closed for explicit unknown and future model versions", () => {
    const futureVersions = ["3.0", "future-standard", 3] as const;

    for (const underwritingModelVersion of futureVersions) {
      const complete = {
        ...SAMPLE_DEAL_FIXTURE.values,
        underwritingModelVersion,
      };
      const malformed = {
        underwritingModelVersion,
        address: "Unknown-version draft",
      };

      expect(
        isReleasedUnderwritingModel({ underwritingModelVersion }),
        String(underwritingModelVersion)
      ).toBe(false);
      for (const raw of [complete, malformed]) {
        expect(isReleasedUnderwritingSnapshot(raw)).toBe(false);
        expect(normalizeReleasedInvestmentFormSnapshot(raw)).toBeNull();
        expect(normalizeReleasedInvestmentFormDraft(raw)).toBeNull();
      }
    }
  });

  it("keeps the legacy v1 snapshot and draft normalization paths unchanged", () => {
    const missingVersion = SAMPLE_DEAL_FIXTURE.values;
    const explicitV1 = {
      ...SAMPLE_DEAL_FIXTURE.values,
      underwritingModelVersion: "1.0" as const,
    };

    for (const raw of [missingVersion, explicitV1]) {
      expect(isReleasedUnderwritingSnapshot(raw)).toBe(true);
      expect(normalizeReleasedInvestmentFormSnapshot(raw)).toEqual(
        normalizeInvestmentFormSnapshot(raw)
      );
      expect(normalizeReleasedInvestmentFormDraft(raw)).toEqual(
        normalizeInvestmentFormDraft(raw)
      );
    }
  });

  it("uses the release-aware parser at every external calculation boundary", () => {
    const parserBoundaries = [
      "app/actions/saved-analyses.ts",
      "app/actions/public-shares.ts",
      "app/actions/offer-ceiling.ts",
      "app/actions/generate-report-pdf.ts",
      "app/actions/one-time-pdf.ts",
      "app/actions/deal-qa.ts",
      "app/actions/deal-summary.ts",
      "app/actions/share-attribution.ts",
      "app/d/[encoded]/page.tsx",
      "app/s/[token]/page.tsx",
    ];

    for (const file of parserBoundaries) {
      expect(source(file), file).toContain("releasedInvestmentFormSchema");
    }

    expect(source("lib/public-share.ts")).toContain("isReleasedUnderwritingModel");
    expect(source("app/api/cron/send-rate-alerts/route.ts")).toContain(
      "normalizeReleasedInvestmentFormSnapshot"
    );
    expect(source("app/api/cron/send-rent-alerts/route.ts")).toContain(
      "normalizeReleasedInvestmentFormSnapshot"
    );
  });

  it("guards every persisted, reopen, scenario, portal, and analyzer surface", () => {
    const releasedSnapshotBoundaries = [
      "app/actions/agent-clients.ts",
      "app/actions/analysis-templates.ts",
      "app/actions/exit-scenarios.ts",
      "app/actions/generate-report-pdf.ts",
      "app/actions/public-shares.ts",
      "app/actions/saved-analyses.ts",
      "app/actions/scenarios.ts",
      "app/actions/user-buy-boxes.ts",
      "app/dashboard/compare/page.tsx",
      "app/dashboard/page.tsx",
      "app/dashboard/saved-analyses/[id]/page.tsx",
      "app/dashboard/saved-analyses/page.tsx",
      "app/portal/[token]/d/[dealId]/page.tsx",
      "components/investcalc/investcalc-page.tsx",
      "components/investcalc/open-saved-deal-in-analyzer.tsx",
      "components/investcalc/saved-analyses-page-v2.tsx",
      "lib/client-portal.ts",
      "lib/compare-result-snapshot.ts",
      "lib/one-time-pdf-report-binding.ts",
      "lib/owned-equity-series.ts",
      "lib/rate-watch.ts",
      "lib/recompute-saved-deal-verdict.ts",
      "lib/weekly-summary.ts",
    ];

    for (const file of releasedSnapshotBoundaries) {
      const contents = source(file);
      expect(contents, file).toMatch(
        /isReleasedUnderwritingSnapshot|normalizeReleasedInvestmentForm(?:Snapshot|Draft)|releasedInvestmentFormSchema/
      );
      expect(contents, file).not.toMatch(/\bnormalizeInvestmentForm(?:Snapshot|Draft)\s*\(/);
      expect(contents, file).not.toMatch(/\binvestmentFormSchema\.(?:safeParse|parse)\s*\(/);
    }

    const analyzer = source("components/investcalc/investcalc-page.tsx");
    expect(analyzer).toContain("zodResolver(releasedInvestmentFormSchema)");
    expect(analyzer).toContain("isReleasedUnderwritingSnapshot(liveValues)");

    const scenarios = source("app/actions/scenarios.ts");
    expect(scenarios.indexOf("isReleasedUnderwritingSnapshot(deal.form_snapshot)")).toBeGreaterThan(-1);
    expect(scenarios.indexOf("isReleasedUnderwritingSnapshot(deal.form_snapshot)")).toBeLessThan(
      scenarios.indexOf("const resolved = await resolvePropertyId")
    );
    expect(scenarios.indexOf("isReleasedUnderwritingSnapshot(deal.form_snapshot)")).toBeLessThan(
      scenarios.indexOf("const clone: Record<string, unknown>")
    );
  });
});
