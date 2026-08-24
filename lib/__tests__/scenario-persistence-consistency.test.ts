import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "app/actions/scenarios.ts"),
  "utf8"
);

describe("strategy scenario persistence", () => {
  it("rejects a changed preset against an incompatible frozen methodology", () => {
    expect(source).toContain("adjusted !== baseValues &&");
    expect(source).toContain("shouldFreezeSavedMethodology(deal.methodology_version)");
    expect(source).toContain("different underwriting version");
  });

  it("stamps current computation metadata and synchronizes changed assumptions", () => {
    expect(source).toContain("clone.schema_version = INVESTCALC_SCHEMA_VERSION");
    expect(source).toContain("clone.methodology_version = result.methodologyVersion");
    expect(source).toContain("buildCompareSnapshotPayload(");
    expect(source).toContain("buildDealScoreInputFromAnalysis(adjusted, result)");
    for (const assignment of [
      "clone.down_payment_pct = adjusted.downPaymentPct",
      "clone.maintenance_pct = adjusted.maintenancePct",
      "clone.vacancy_pct = adjusted.vacancyPct",
      "clone.management_pct = adjusted.mgmtPct",
      "clone.property_tax_pct = Math.round(result.propertyTaxPctEffective * 100) / 100",
    ]) {
      expect(source).toContain(assignment);
    }
  });

  it("does not clone stale financing or confidence provenance", () => {
    expect(source).toContain("clone.financing_profile_id = null");
    expect(source).toContain("clone.financing_profile_version = null");
    expect(source).toContain("clone.financing_profile_snapshot = null");
    expect(source).toContain("clone.data_confidence = null");
  });

  it("carries the captured Offer Ceiling target source with the target", () => {
    expect(source).toContain("normalizeOfferCeilingTargetSource(");
    expect(source).toContain("deal.result_snapshot?.maxOfferTargetSource");
    expect(source).toContain(
      "recomputedResultSnapshot.maxOfferTargetSource = sourceMaoTargetSource"
    );
    expect(source).toContain("await hasPaidPlanSubscription(supabase, user.id)");
    expect(source).toContain(
      "recomputedResultSnapshot.offerCeilingExact = capturedAccess.exact"
    );
  });
});
