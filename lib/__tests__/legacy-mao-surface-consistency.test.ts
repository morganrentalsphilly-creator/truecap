import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("legacy Max Offer surface consistency", () => {
  it("does not invent a numerical MAO for a share with no captured target", () => {
    const legacyRoute = read("app/d/[encoded]/page.tsx");
    const viewer = read("components/investcalc/read-only-analysis-view.tsx");

    expect(legacyRoute).toContain("<SharedDealShell");
    expect(legacyRoute).not.toContain("maoTarget=");
    expect(viewer).not.toContain("calculateMaxAllowableOffer");
    expect(viewer).toContain('offerCeilingAccess?.access === "exact"');
    expect(viewer).toContain(': "Unavailable"');
    expect(viewer).toMatch(
      /No Offer Ceiling was calculated because this share did not\s+capture/,
    );
    // Other entitled analysis remains available; only the unsupported number
    // is suppressed.
    expect(viewer).toContain("<SensitivityGrid values={values} />");
    expect(viewer).toContain("<StrategiesPanel values={values} result={proResult}");
  });

  it("routes every saved-deal MAO surface through the shared resolver with client scope", () => {
    const workspace = read("app/dashboard/saved-analyses/[id]/page.tsx");
    const dashboard = read("app/dashboard/page.tsx");
    const compare = read("app/dashboard/compare/page.tsx");
    const myDeals = read("app/dashboard/saved-analyses/page.tsx");

    for (const source of [workspace, dashboard, compare, myDeals]) {
      expect(source).toContain("computeDealOfferLine(");
      expect(source).toContain("recordedDealOfferLine(");
      expect(source).toContain("dealClientId:");
      // Accept both explicit object properties and the equivalent shorthand
      // used by My Deals.
      expect(source).toMatch(/persistedMaoTarget(?:\s*:|\s*,)/);
    }
    expect(dashboard).toContain("DASHBOARD_DEALS_SELECT_WITH_CLIENT");
    expect(dashboard).toContain(
      "if (methodologyResolution.usesRecordedSnapshot) {",
    );
    expect(compare).toContain("runCompareQueryWithClient");
    expect(compare).toContain(
      "if (canShowMao && resolution.usesRecordedSnapshot) {",
    );
    expect(compare).toContain("box.isActive && buyBoxHasCriteria(box)");
    expect(workspace).toContain(
      "if (isPremium && methodologyResolution.usesRecordedSnapshot) {",
    );
  });
});
