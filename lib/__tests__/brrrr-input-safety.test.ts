import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  analyzeBrrrr,
  validateBrrrrInputs,
  type BrrrrInputs,
} from "@/lib/brrrr-analysis";

const ROOT = process.cwd();

const validInputs: BrrrrInputs = {
  purchasePrice: 180_000,
  rehabBudget: 45_000,
  arv: 320_000,
  refiLtvPct: 75,
  refiRatePct: 7,
  refiTermYears: 30,
  closingCostsPctAcq: 3,
  closingCostsRefiPct: 2,
  downPaymentPct: 20,
  holdMonths: 6,
  monthlyCarryingCost: 800,
  postRefiMonthlyOpEx: 960,
  postRefiMonthlyRent: 2_400,
};

function expectFiniteResult(inputs: BrrrrInputs) {
  const result = analyzeBrrrr(inputs);
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === "number") {
      expect(Number.isFinite(value), key).toBe(true);
    }
  }
  return result;
}

describe("BRRRR input safety", () => {
  it("accepts the supported default range", () => {
    expect(validateBrrrrInputs(validInputs)).toEqual([]);
    expectFiniteResult(validInputs);
  });

  it.each([
    ["purchasePrice", 0],
    ["rehabBudget", -1],
    ["arv", Number.POSITIVE_INFINITY],
    ["refiLtvPct", 0],
    ["refiLtvPct", 101],
    ["refiRatePct", -0.01],
    ["refiRatePct", 51],
    ["refiTermYears", 0],
    ["refiTermYears", 30.5],
    ["closingCostsPctAcq", 26],
    ["closingCostsRefiPct", Number.NaN],
    ["downPaymentPct", -1],
    ["holdMonths", 121],
    ["postRefiMonthlyRent", 0],
  ] as Array<[keyof BrrrrInputs, number]>)
  ("rejects %s=%s before display", (field, value) => {
    const issues = validateBrrrrInputs({ ...validInputs, [field]: value });
    expect(issues.some((issue) => issue.field === field)).toBe(true);
  });

  it("defensively bounds malformed engine inputs instead of emitting NaN/Infinity", () => {
    expectFiniteResult({
      purchasePrice: Number.NaN,
      rehabBudget: -50,
      arv: Number.POSITIVE_INFINITY,
      refiLtvPct: -10,
      refiRatePct: Number.NEGATIVE_INFINITY,
      refiTermYears: 0,
      closingCostsPctAcq: 1_000,
      closingCostsRefiPct: Number.NaN,
      downPaymentPct: -25,
      holdMonths: Number.POSITIVE_INFINITY,
      monthlyCarryingCost: -1,
      postRefiMonthlyOpEx: Number.NaN,
      postRefiMonthlyRent: -1,
    });
  });

  it("keeps the infinite-return display flag while every numeric field remains finite", () => {
    const result = expectFiniteResult({
      ...validInputs,
      purchasePrice: 80_000,
      rehabBudget: 20_000,
      arv: 200_000,
      downPaymentPct: 100,
      monthlyCarryingCost: 200,
      postRefiMonthlyOpEx: 600,
      postRefiMonthlyRent: 1_800,
    });
    expect(result.isInfiniteReturn).toBe(true);
    expect(result.postRefiCashOnCashPct).toBe(0);
  });

  it("renders a clear invalid state and marks bad fields", () => {
    const source = readFileSync(
      join(ROOT, "components/tools/brrrr-calculator-widget.tsx"),
      "utf8"
    );
    expect(source).toContain("validateBrrrrInputs(inputs)");
    expect(source).toContain('role="status"');
    expect(source).toContain("Check the highlighted inputs");
    expect(source).toContain("aria-invalid={invalid || undefined}");
  });
});
