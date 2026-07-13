import { describe, expect, it } from "vitest";
import {
  describeInvestmentFormSnapshotIssue,
  investmentFormSchema,
  normalizeInvestmentFormDraft,
  normalizeInvestmentFormSnapshot,
} from "@/lib/investcalc-schema";
import { calculateAnalysis } from "@/lib/calc-analysis";

/**
 * Jul 2026 customer-data-fidelity fixes for PRE-Apr-28-2026 (schema v7/v8)
 * saved snapshots — rows written before commit cacc11c introduced
 * insuranceInputMode and the rent > 0 rule:
 *
 *  1. A legacy snapshot with a typed $/mo insurance bill (insuranceMonthly,
 *     no insuranceInputMode) must reopen with THAT bill — not silently
 *     repriced at the 0.5%-of-price estimate.
 *  2. A legacy snapshot carrying a 0-rent vacant unit must still open
 *     (invalid units dropped, mirroring saveDealAction's save-time filter)
 *     instead of freezing the deal behind a normalize → null dead end.
 *
 * Both are legacy-only tolerances: current-era saves always serialize
 * insuranceInputMode and never persist 0-rent rental units, and the live
 * form schema is NOT weakened (locked below).
 */

/** The base fields every real v7-era form snapshot persisted (the form
 *  always serialized the full values object, so these were never absent —
 *  sanitizeSnapshotFields intentionally overrides defaults with explicit
 *  undefined, which is why fixtures must carry them like real rows do). */
const legacyBase = {
  downPaymentPct: 20,
  interestRate: 6.75,
  loanTermYears: 30,
  maintenancePct: 10,
  vacancyPct: 5,
  mgmtPct: 8,
  capexPct: 5,
  buildingValuePct: 85,
  depreciationYears: 27.5,
  expenseGrowthPct: 2.5,
  rentGrowthPct: 2.5,
};

/** Single-family v7-era snapshot (no insuranceInputMode field). */
const legacySf = {
  ...legacyBase,
  propertyType: "single-family" as const,
  address: "1700 W Erie Ave, Philadelphia, PA 19140",
  purchasePrice: 180000,
  monthlyRent: 1500,
};

describe("legacy insurance $/mo snapshots (pre-insuranceInputMode)", () => {
  it("infers 'monthly' when insuranceMonthly is positive and insurancePct absent", () => {
    const normalized = normalizeInvestmentFormSnapshot({
      ...legacySf,
      insuranceMonthly: 95,
    });
    expect(normalized).not.toBeNull();
    expect(normalized?.insuranceInputMode).toBe("monthly");
    expect(normalized?.insuranceMonthly).toBe(95);
    // The reopened deal must charge the CUSTOMER'S bill, not the 0.5%
    // estimate (0.5% of $180k / 12 = $75/mo — the silent repricing bug).
    const result = calculateAnalysis(normalized!);
    expect(result.insurance).toBe(95);
  });

  it("round-trips the legacy percent shape unchanged", () => {
    const normalized = normalizeInvestmentFormSnapshot({
      ...legacySf,
      insurancePct: 0.6,
    });
    expect(normalized).not.toBeNull();
    expect(normalized?.insuranceInputMode).toBe("percent");
    expect(normalized?.insurancePct).toBe(0.6);
    // 0.6% of $180k / 12 = $90/mo.
    expect(calculateAnalysis(normalized!).insurance).toBe(90);
  });

  it("defaults to 'percent' when the legacy row typed neither field", () => {
    const normalized = normalizeInvestmentFormSnapshot(legacySf);
    expect(normalized?.insuranceInputMode).toBe("percent");
  });

  it("never overrides an explicit mode from a current-era snapshot", () => {
    // Post-v9 snapshots always serialize the mode; a stale insuranceMonthly
    // alongside an explicit "percent" must not flip the mode.
    const normalized = normalizeInvestmentFormSnapshot({
      ...legacySf,
      insuranceInputMode: "percent",
      insuranceMonthly: 95,
    });
    expect(normalized?.insuranceInputMode).toBe("percent");
  });
});

describe("legacy 0-rent units (pre-'rent must be > 0' rule)", () => {
  const legacyMf = {
    ...legacyBase,
    propertyType: "multi-family" as const,
    address: "2200 N Broad St, Philadelphia, PA 19132",
    purchasePrice: 320000,
  };

  it("opens a legacy multi-family snapshot by dropping the 0-rent vacant unit", () => {
    const normalized = normalizeInvestmentFormSnapshot({
      ...legacyMf,
      units: [{ monthlyRent: 1400 }, { monthlyRent: 0 }],
    });
    expect(normalized).not.toBeNull();
    // The vacant unit is dropped exactly as saveDealAction's save-time
    // filter would have stored the deal today.
    expect(normalized?.units).toHaveLength(1);
    expect(normalized?.units?.[0]?.monthlyRent).toBe(1400);
    expect(calculateAnalysis(normalized!).monthlyRentalIncome).toBe(1400);
  });

  it("keeps an owner-occupant's legitimate 0-rent owner unit intact", () => {
    const normalized = normalizeInvestmentFormSnapshot({
      ...legacyBase,
      propertyType: "owner-occupant" as const,
      address: "615 E Passyunk Ave, Philadelphia, PA 19147",
      purchasePrice: 275000,
      units: [
        { monthlyRent: 0, isOwnerOccupied: true },
        { monthlyRent: 1300, isOwnerOccupied: false },
      ],
    });
    expect(normalized).not.toBeNull();
    // First parse succeeds — no unit is dropped.
    expect(normalized?.units).toHaveLength(2);
  });

  it("still returns null when NO valid rental unit remains (all rents 0)", () => {
    const normalized = normalizeInvestmentFormSnapshot({
      ...legacyMf,
      units: [{ monthlyRent: 0 }, { monthlyRent: 0 }],
    });
    expect(normalized).toBeNull();
  });

  it("still returns null for a legacy single-family 0-rent snapshot (strict path)", () => {
    expect(normalizeInvestmentFormSnapshot({ ...legacySf, monthlyRent: 0 })).toBeNull();
  });

  it("the lenient draft normalizer opens that single-family row for the reopen fallback", () => {
    const lenient = normalizeInvestmentFormDraft({ ...legacySf, monthlyRent: 0 });
    expect(lenient).not.toBeNull();
    expect(lenient?.monthlyRent).toBe(0);
    expect(lenient?.address).toBe(legacySf.address);
  });

  it("an interrupted MF DRAFT keeps its mid-typing rent-less unit (no unit-drop retry on the draft path)", () => {
    // The saved-row retry must never leak into drafts: a user mid-typing a
    // second unit (beds entered, rent not yet) who leaves and returns must
    // find that unit and its typed facts intact, not silently dropped.
    const draft = normalizeInvestmentFormDraft({
      ...legacyMf,
      units: [
        { monthlyRent: 1400, bedrooms: 2 },
        { bedrooms: 3, bathrooms: 1 }, // rent not typed yet
      ],
    });
    expect(draft).not.toBeNull();
    expect(draft?.units).toHaveLength(2);
    expect(draft?.units?.[1]?.bedrooms).toBe(3);
  });

  it("does NOT weaken the live schema for new saves (unit rent 0 still rejected)", () => {
    const res = investmentFormSchema.safeParse({
      ...legacyMf,
      downPaymentPct: 20,
      interestRate: 6.75,
      loanTermYears: 30,
      buildingValuePct: 85,
      depreciationYears: 27.5,
      expenseGrowthPct: 2.5,
      rentGrowthPct: 2.5,
      insuranceInputMode: "percent",
      units: [{ monthlyRent: 1400 }, { monthlyRent: 0 }],
    });
    expect(res.success).toBe(false);
  });
});

describe("describeInvestmentFormSnapshotIssue — failure toasts name the field", () => {
  it("names the single-family rent field", () => {
    expect(describeInvestmentFormSnapshotIssue({ ...legacySf, monthlyRent: 0 })).toBe(
      "Monthly rent — Rent must be greater than 0"
    );
  });

  it("names the offending unit for multi-family", () => {
    const issue = describeInvestmentFormSnapshotIssue({
      ...legacyBase,
      propertyType: "multi-family",
      address: "2200 N Broad St, Philadelphia, PA 19132",
      purchasePrice: 320000,
      units: [{ monthlyRent: 0 }, { monthlyRent: 0 }],
    });
    expect(issue).toBe("Unit 1 monthly rent — Rent must be greater than 0");
  });

  it("returns null when the snapshot actually parses", () => {
    expect(describeInvestmentFormSnapshotIssue(legacySf)).toBeNull();
  });

  it("returns null for non-object payloads (nothing to name)", () => {
    expect(describeInvestmentFormSnapshotIssue("garbage")).toBeNull();
    expect(describeInvestmentFormSnapshotIssue(null)).toBeNull();
  });
});
