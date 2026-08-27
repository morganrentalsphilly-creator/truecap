import { describe, it, expect } from "vitest";
import {
  computeAnalyzerSteps,
  isAnalyzerStepId,
  ANALYZER_STEP_IDS,
  type AnalyzerStepId,
  type StepStatus,
} from "@/lib/analyzer-steps";

// Financing defaults that the form ships with (down/rate/term) — present means
// the financing step reads "complete" out of the box.
const FIN = { downPaymentPct: 20, interestRate: 6.75, loanTermYears: 30 };

function statusOf(steps: ReturnType<typeof computeAnalyzerSteps>, id: AnalyzerStepId): StepStatus {
  return steps.find((s) => s.id === id)!.status;
}

describe("computeAnalyzerSteps", () => {
  it("always returns the 5 steps in order", () => {
    const steps = computeAnalyzerSteps({}, { hasResults: false });
    expect(steps.map((s) => s.id)).toEqual(ANALYZER_STEP_IDS);
  });

  it("empty form: property/income/expenses empty and decision pending", () => {
    const steps = computeAnalyzerSteps({ propertyType: "single-family" }, { hasResults: false });
    expect(statusOf(steps, "property")).toBe("empty");
    expect(statusOf(steps, "income")).toBe("empty");
    expect(statusOf(steps, "expenses")).toBe("empty");
    expect(statusOf(steps, "decision")).toBe("pending");
  });

  it("financing is complete only when all values are within schema ranges", () => {
    expect(statusOf(computeAnalyzerSteps(FIN, { hasResults: false }), "financing")).toBe("complete");
    expect(
      statusOf(
        computeAnalyzerSteps({ downPaymentPct: 20, loanTermYears: 30 }, { hasResults: false }),
        "financing"
      )
    ).toBe("partial");
    expect(
      statusOf(
        computeAnalyzerSteps(
          { downPaymentPct: 101, interestRate: 6.75, loanTermYears: 30 },
          { hasResults: false }
        ),
        "financing"
      )
    ).toBe("partial");
    expect(
      statusOf(
        computeAnalyzerSteps(
          { downPaymentPct: 20, interestRate: -1, loanTermYears: 30.5 },
          { hasResults: false }
        ),
        "financing"
      )
    ).toBe("partial");
  });

  it("property: partial with only an address, complete with address + price", () => {
    expect(
      statusOf(computeAnalyzerSteps({ address: "123 Main St" }, { hasResults: false }), "property")
    ).toBe("partial");
    expect(
      statusOf(
        computeAnalyzerSteps({ address: "123 Main St", purchasePrice: 250000 }, { hasResults: false }),
        "property"
      )
    ).toBe("complete");
  });

  it("rejects a too-cheap purchase price for 'complete'", () => {
    expect(
      statusOf(
        computeAnalyzerSteps({ address: "123 Main St", purchasePrice: 5000 }, { hasResults: false }),
        "property"
      )
    ).toBe("partial");
  });

  it("SFR income: bedrooms are optional; valid positive rent is complete", () => {
    const base = { propertyType: "single-family" as const };
    expect(statusOf(computeAnalyzerSteps({ ...base, bedrooms: 3 }, { hasResults: false }), "income")).toBe("partial");
    expect(statusOf(computeAnalyzerSteps({ ...base, bedrooms: 3, monthlyRent: 0 }, { hasResults: false }), "income")).toBe("partial");
    expect(statusOf(computeAnalyzerSteps({ ...base, monthlyRent: 1850 }, { hasResults: false }), "income")).toBe("complete");
    expect(statusOf(computeAnalyzerSteps({ ...base, bedrooms: 3, monthlyRent: 1850 }, { hasResults: false }), "income")).toBe("complete");
    expect(statusOf(computeAnalyzerSteps({ ...base, bedrooms: 21, monthlyRent: 1850 }, { hasResults: false }), "income")).toBe("partial");
  });

  it("expenses require all four valid reviewed percentages and accept explicit zero", () => {
    const reviewed = {
      maintenancePct: 10,
      vacancyPct: 5,
      mgmtPct: 8,
      capexPct: 0,
    };
    expect(
      statusOf(computeAnalyzerSteps(reviewed, { hasResults: false }), "expenses")
    ).toBe("complete");
    expect(
      statusOf(
        computeAnalyzerSteps(
          { ...reviewed, vacancyPct: undefined },
          { hasResults: false }
        ),
        "expenses"
      )
    ).toBe("partial");
    expect(
      statusOf(
        computeAnalyzerSteps(
          { ...reviewed, mgmtPct: 51 },
          { hasResults: false }
        ),
        "expenses"
      )
    ).toBe("partial");
  });

  it("MF income: complete when every rental unit has RENT (facts optional, Batch B)", () => {
    // Rent is the only field the math reads, so a unit is "complete" for the
    // income step on rent alone — beds/baths/sqft are optional refinements.
    const rentOnly = { monthlyRent: 1400 };
    const rentOnly2 = { monthlyRent: 1250 };
    const noRent = { bedrooms: 2 }; // missing the one field that matters
    expect(
      statusOf(
        computeAnalyzerSteps({ propertyType: "multi-family", units: [rentOnly, rentOnly2] }, { hasResults: false }),
        "income"
      )
    ).toBe("complete");
    // A unit still missing its rent keeps the step partial.
    expect(
      statusOf(
        computeAnalyzerSteps({ propertyType: "multi-family", units: [rentOnly, noRent] }, { hasResults: false }),
        "income"
      )
    ).toBe("partial");
  });

  it("owner-occupant: the owner's own unit doesn't need rent to reach complete", () => {
    const ownerUnit = { bedrooms: 2, bathrooms: 1, sqft: 800, monthlyRent: 0, isOwnerOccupied: true };
    const rentalUnit = { bedrooms: 2, bathrooms: 1, sqft: 800, monthlyRent: 1400, isOwnerOccupied: false };
    expect(
      statusOf(
        computeAnalyzerSteps({ propertyType: "owner-occupant", units: [ownerUnit, rentalUnit] }, { hasResults: false }),
        "income"
      )
    ).toBe("complete");
  });

  it("decision flips to complete once results exist", () => {
    expect(statusOf(computeAnalyzerSteps({}, { hasResults: true }), "decision")).toBe("complete");
  });

  it("decision remains in progress when base results exist without target criteria", () => {
    expect(
      statusOf(
        computeAnalyzerSteps(
          {},
          { hasResults: true, hasDecisionCriteria: false }
        ),
        "decision"
      )
    ).toBe("partial");
    expect(
      statusOf(
        computeAnalyzerSteps(
          {},
          { hasResults: true, hasDecisionCriteria: true }
        ),
        "decision"
      )
    ).toBe("complete");
  });

  it("isAnalyzerStepId guards correctly", () => {
    expect(isAnalyzerStepId("financing")).toBe(true);
    expect(isAnalyzerStepId("nope")).toBe(false);
  });
});
