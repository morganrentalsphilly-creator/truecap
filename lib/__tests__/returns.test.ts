import { describe, expect, it } from "vitest";

import type { ExitScenarioYear } from "@/lib/exit-scenarios";
import {
  analyzeIrr,
  computeIrr,
  computeReturnSummaryFromCashFlows,
  computeReturnSummaryFromExitYears,
} from "@/lib/returns";

describe("IRR root analysis", () => {
  it("computes the unique money-weighted return", () => {
    const flows = [-100_000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 200_000];
    expect(computeIrr(flows)).toBeCloseTo(7.177, 2);
    expect(analyzeIrr(flows)).toMatchObject({ status: "unique", reason: null });
  });

  it("discovers an extreme return above the former 1000% cap", () => {
    const result = analyzeIrr([-100, 2_000]);
    expect(result.status).toBe("unique");
    expect(result.primaryIrrPct).toBeCloseTo(1_900, 6);
  });

  it("returns and discloses every root for a non-conventional timeline", () => {
    // -100 + 230/(1+r) - 132/(1+r)^2 = 0 has roots 10% and 20%.
    const result = analyzeIrr([-100, 230, -132]);
    expect(result.status).toBe("multiple");
    expect(result.rootsPct).toHaveLength(2);
    expect(result.rootsPct[0]).toBeCloseTo(10, 5);
    expect(result.rootsPct[1]).toBeCloseTo(20, 5);
    expect(result.primaryIrrPct).toBeCloseTo(10, 5);
  });

  it("distinguishes same-sign and mixed-sign no-root timelines", () => {
    expect(analyzeIrr([100, 100, 100])).toMatchObject({
      status: "none",
      reason: "same-sign",
      primaryIrrPct: null,
    });
    expect(analyzeIrr([100, -50, 100])).toMatchObject({
      status: "none",
      reason: "no-real-root",
      primaryIrrPct: null,
    });
    expect(computeIrr([-100])).toBeNull();
  });
});

describe("contribution-aware return summaries", () => {
  it("counts negative operations as contributions and positive operations as distributions", () => {
    const summary = computeReturnSummaryFromCashFlows([-100, 20, -10, 120])!;
    expect(summary.initialCashInvested).toBe(100);
    expect(summary.totalContributions).toBe(110);
    expect(summary.totalDistributions).toBe(140);
    expect(summary.totalProfit).toBe(30);
    expect(summary.roiPct).toBeCloseTo((30 / 110) * 100, 8);
    expect(summary.equityMultiple).toBeCloseTo(140 / 110, 8);
    expect(summary.hasLaterContributions).toBe(true);
    expect(summary.cagrPct).toBeNull();
    expect(summary.cagrStatus).toBe("later-contributions");
  });

  it("counts multiple capital calls in the denominator", () => {
    const summary = computeReturnSummaryFromCashFlows([-100, -40, -10, 200])!;
    expect(summary.cashInvested).toBe(150);
    expect(summary.totalContributions).toBe(150);
    expect(summary.totalDistributions).toBe(200);
    expect(summary.roiPct).toBeCloseTo(33.333333, 5);
    expect(summary.equityMultiple).toBeCloseTo(4 / 3, 8);
  });

  it("treats refinance proceeds and sale proceeds as distributions", () => {
    // t2 cash-out refinance, t4 sale.
    const summary = computeReturnSummaryFromCashFlows([-100, 5, 60, 5, 80])!;
    expect(summary.totalContributions).toBe(100);
    expect(summary.totalDistributions).toBe(150);
    expect(summary.totalProfit).toBe(50);
    expect(summary.equityMultiple).toBe(1.5);
    expect(summary.irrStatus).toBe("unique");
  });

  it("represents a total loss without inventing CAGR or IRR", () => {
    const summary = computeReturnSummaryFromCashFlows([-100, 0])!;
    expect(summary.roiPct).toBe(-100);
    expect(summary.equityMultiple).toBe(0);
    expect(summary.cagrPct).toBeNull();
    expect(summary.cagrStatus).toBe("non-positive-distributions");
    expect(summary.irrPct).toBeNull();
    expect(summary.irrStatus).toBe("none");
  });
});

describe("computeReturnSummaryFromExitYears", () => {
  function makeYears(annualCashFlows = Array(10).fill(1_000)): ExitScenarioYear[] {
    let cumulativeCashFlow = 0;
    return annualCashFlows.map((annualCashFlow, index) => {
      const year = index + 1;
      cumulativeCashFlow += annualCashFlow;
      const netSaleProceeds = 150_000;
      return {
        year,
        propertyValue: 0,
        remainingLoanBalance: 0,
        equity: 0,
        sellingCost: 0,
        netSaleProceeds,
        cumulativeCashFlow,
        cumulativeTaxBenefit: 0,
        totalProfit: netSaleProceeds + cumulativeCashFlow - 100_000,
      };
    });
  }

  it("derives the original single-contribution metrics", () => {
    const summary = computeReturnSummaryFromExitYears(makeYears())!;
    expect(summary.cashInvested).toBe(100_000);
    expect(summary.totalProfit).toBe(60_000);
    expect(summary.roiPct).toBeCloseTo(60, 8);
    expect(summary.equityMultiple).toBeCloseTo(1.6, 8);
    expect(summary.cagrStatus).toBe("available");
    expect(summary.cagrPct).not.toBeNull();
    expect(summary.irrPct).not.toBeNull();
    expect(summary.years).toBe(10);
  });

  it("turns negative operating years into later contributed capital", () => {
    const years = makeYears([-5_000, -2_000, 1_000, 1_000, 1_000, 1_000, 1_000, 1_000, 1_000, 1_000]);
    const summary = computeReturnSummaryFromExitYears(years)!;
    expect(summary.initialCashInvested).toBe(100_000);
    expect(summary.totalContributions).toBe(107_000);
    expect(summary.totalDistributions).toBe(158_000);
    expect(summary.equityMultiple).toBeCloseTo(158 / 107, 8);
    expect(summary.cagrPct).toBeNull();
    expect(summary.cagrStatus).toBe("later-contributions");
  });

  it("keeps exit tax out of both sale distribution and recovered initial capital", () => {
    const years = makeYears().map((year) => ({
      ...year,
      exitTax: 20_000,
      totalProfit:
        year.netSaleProceeds +
        year.cumulativeCashFlow +
        year.cumulativeTaxBenefit -
        100_000 -
        20_000,
    }));
    const summary = computeReturnSummaryFromExitYears(years)!;
    expect(summary.initialCashInvested).toBe(100_000);
    expect(summary.totalDistributions).toBe(140_000);
    expect(summary.totalProfit).toBe(40_000);
    expect(summary.roiPct).toBeCloseTo(40, 8);
  });

  it("returns null percentage metrics when no contribution can be recovered", () => {
    const years = makeYears().map((year) => ({
      ...year,
      totalProfit:
        year.netSaleProceeds + year.cumulativeCashFlow + year.cumulativeTaxBenefit,
    }));
    const summary = computeReturnSummaryFromExitYears(years)!;
    expect(summary.cashInvested).toBe(0);
    expect(summary.roiPct).toBeNull();
    expect(summary.equityMultiple).toBeNull();
    expect(summary.irrPct).toBeNull();
  });
});
