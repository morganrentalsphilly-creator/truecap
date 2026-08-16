import { describe, expect, it } from "vitest";
import {
  financingProfileAgeBand,
  financingProfileAnalysisPatch,
  financingProfileInputSchema,
  financingProfileMatchesAnalysis,
  financingProfileUnmodeledTerms,
  normalizeFinancingProfileSnapshot,
  rowToFinancingProfile,
  snapshotFinancingProfile,
  type FinancingProfile,
  type FinancingProfileInput,
} from "@/lib/financing-profiles";

const input: FinancingProfileInput = {
  name: "DSCR 75% LTV",
  loanType: "dscr",
  interestRatePct: 7.35,
  downPaymentPct: null,
  ltvPct: 75,
  amortizationYears: 30,
  loanTermYears: 5,
  pointsPct: 1,
  lenderFees: 1_250,
  closingCostsPct: 3,
  interestOnlyMonths: 12,
  pmiAnnualRatePct: 0,
  pmiNoCancel: false,
  lenderName: "Example lender",
  notes: "Five-year balloon",
  lastVerifiedAt: "2026-07-28T12:00:00.000Z",
  isActive: true,
  isDefault: true,
};

const profile: FinancingProfile = {
  ...input,
  id: "8c0f15a1-cccb-4e32-aabd-d70df7eacbb4",
  termsVersion: 3,
  createdAt: "2026-07-01T12:00:00.000Z",
  updatedAt: "2026-07-28T12:00:00.000Z",
};

describe("financing profiles", () => {
  it("validates the migration-aligned bounds and interest-only term", () => {
    expect(financingProfileInputSchema.safeParse(input).success).toBe(true);
    expect(
      financingProfileInputSchema.safeParse({ ...input, interestRatePct: 31 }).success
    ).toBe(false);
    expect(
      financingProfileInputSchema.safeParse({
        ...input,
        loanTermYears: 1,
        interestOnlyMonths: 13,
      }).success
    ).toBe(false);
    expect(
      financingProfileInputSchema.safeParse({
        ...input,
        downPaymentPct: 20,
        ltvPct: 75,
      }).success
    ).toBe(false);
    expect(
      financingProfileInputSchema.safeParse({
        ...input,
        lastVerifiedAt: "2099-01-01T12:00:00.000Z",
      }).success
    ).toBe(false);
  });

  it("maps nullable Postgres numerics without inventing verified terms", () => {
    const mapped = rowToFinancingProfile({
      id: profile.id,
      name: profile.name,
      loan_type: "dscr",
      interest_rate_pct: "7.35",
      down_payment_pct: null,
      ltv_pct: "75",
      amortization_years: "30",
      loan_term_years: "5",
      points_pct: "1",
      lender_fees: "1250",
      closing_costs_pct: "3",
      interest_only_months: 12,
      pmi_annual_rate_pct: "0",
      pmi_no_cancel: false,
      lender_name: "Example lender",
      notes: null,
      last_verified_at: null,
      is_active: true,
      is_default: true,
      terms_version: 3,
      created_at: profile.createdAt,
      updated_at: profile.updatedAt,
    });

    expect(mapped.interestRatePct).toBe(7.35);
    expect(mapped.downPaymentPct).toBeNull();
    expect(mapped.lastVerifiedAt).toBeNull();
    expect(mapped.termsVersion).toBe(3);
  });

  it("applies only fields modeled by the current rental engine", () => {
    expect(financingProfileAnalysisPatch(profile)).toEqual({
      interestRate: 7.35,
      downPaymentPct: 25,
      loanTermYears: 30,
      closingCostsPct: 3,
      pmiAnnualRatePct: 0,
      pmiNoCancel: false,
    });
    expect(financingProfileUnmodeledTerms(profile)).toEqual([
      "points",
      "lender fees",
      "interest-only period",
      "balloon maturity",
    ]);
  });

  it("requires every modeled term to match before preserving profile provenance", () => {
    const matching = {
      interestRate: 7.35,
      downPaymentPct: 25,
      loanTermYears: 30,
      closingCostsPct: 3,
      pmiAnnualRatePct: 0,
      pmiNoCancel: false,
    };
    expect(financingProfileMatchesAnalysis(profile, matching)).toBe(true);
    expect(financingProfileMatchesAnalysis(profile, { ...matching, interestRate: 7.5 })).toBe(false);
  });

  it("creates and strictly normalizes a frozen, versioned application snapshot", () => {
    const snapshot = snapshotFinancingProfile(profile, "2026-08-15T12:00:00.000Z");
    expect(snapshot.profileId).toBe(profile.id);
    expect(snapshot.termsVersion).toBe(3);
    expect(normalizeFinancingProfileSnapshot(snapshot)).toEqual(snapshot);
    expect(normalizeFinancingProfileSnapshot({ ...snapshot, unexpected: true })).toBeNull();
  });

  it("uses coarse, PII-free verification-age bands for analytics", () => {
    const now = new Date("2026-08-15T12:00:00.000Z");
    expect(financingProfileAgeBand(null, now)).toBe("unverified");
    expect(financingProfileAgeBand("2026-07-28T12:00:00.000Z", now)).toBe("0_30_days");
    expect(financingProfileAgeBand("2026-05-01T12:00:00.000Z", now)).toBe("91_180_days");
    expect(financingProfileAgeBand("2025-01-01T12:00:00.000Z", now)).toBe("over_180_days");
  });
});
