import { describe, expect, it } from "vitest";

import { analyzeFixFlip } from "@/lib/fix-flip-analysis";

describe("fix-and-flip hold-period presentation", () => {
  it("returns N/A-compatible null annualization for a zero-month hold", () => {
    const result = analyzeFixFlip({
      purchasePrice: 200_000,
      rehabBudget: 40_000,
      arv: 320_000,
      closingCostsPctAcq: 3,
      sellingCostsPct: 6,
      holdMonths: 0,
      monthlyCarryingCost: 1_500,
      downPaymentPct: 25,
    });

    expect(result.roiOnCashPct).not.toBe(0);
    expect(result.annualizedRoiPct).toBeNull();
  });
});
