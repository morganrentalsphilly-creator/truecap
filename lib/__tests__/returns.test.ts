import { describe, it, expect } from "vitest";
import { computeIrr, computeReturnSummaryFromExitYears } from "@/lib/returns";
import type { ExitScenarioYear } from "@/lib/exit-scenarios";

describe("computeIrr", () => {
  it("≈7.18% for a 2× return over 10 years with no interim flows", () => {
    const flows = [-100_000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 200_000];
    const irr = computeIrr(flows);
    expect(irr).not.toBeNull();
    expect(irr as number).toBeCloseTo(7.177, 1);
  });

  it("returns null when there is no sign change", () => {
    expect(computeIrr([100, 100, 100])).toBeNull();
    expect(computeIrr([-100])).toBeNull();
  });
});

describe("computeReturnSummaryFromExitYears", () => {
  function makeYears(): ExitScenarioYear[] {
    // cash invested 100k; $1k/yr cumulative cash flow; 150k net sale at exit.
    return Array.from({ length: 10 }, (_, i) => {
      const year = i + 1;
      const cumulativeCashFlow = 1_000 * year;
      const cumulativeTaxBenefit = 0;
      const netSaleProceeds = 150_000;
      const totalProfit = netSaleProceeds + cumulativeCashFlow + cumulativeTaxBenefit - 100_000;
      return {
        year,
        propertyValue: 0,
        remainingLoanBalance: 0,
        equity: 0,
        sellingCost: 0,
        netSaleProceeds,
        cumulativeCashFlow,
        cumulativeTaxBenefit,
        totalProfit,
      };
    });
  }

  it("derives cash invested, ROI, equity multiple, and an IRR", () => {
    const s = computeReturnSummaryFromExitYears(makeYears());
    expect(s).not.toBeNull();
    const sum = s!;
    expect(Math.round(sum.cashInvested)).toBe(100_000);
    expect(Math.round(sum.totalProfit)).toBe(60_000); // 150k + 10k - 100k
    expect(sum.roiPct as number).toBeCloseTo(60, 0);
    expect(sum.equityMultiple as number).toBeCloseTo(1.6, 1);
    expect(sum.irrPct).not.toBeNull();
    expect(sum.years).toBe(10);
  });

  it("guards a zero cash-invested (cash purchase) case", () => {
    const years = makeYears().map((y) => ({
      ...y,
      // make cashInvested 0: totalProfit = netSale + cumCF + cumTax
      totalProfit: y.netSaleProceeds + y.cumulativeCashFlow + y.cumulativeTaxBenefit,
    }));
    const s = computeReturnSummaryFromExitYears(years);
    expect(s).not.toBeNull();
    expect(s!.roiPct).toBeNull();
    expect(s!.irrPct).toBeNull();
  });

  it("adds exit tax back when recovering the cash-invested ROI basis", () => {
    const years = makeYears().map((year) => ({
      ...year,
      exitTax: 20_000,
      // $150k sale + cumulative CF - $100k cash in - $20k exit tax.
      totalProfit:
        year.netSaleProceeds +
        year.cumulativeCashFlow +
        year.cumulativeTaxBenefit -
        100_000 -
        20_000,
    }));
    const summary = computeReturnSummaryFromExitYears(years);
    expect(summary).not.toBeNull();
    expect(summary?.cashInvested).toBe(100_000);
    expect(summary?.totalProfit).toBe(40_000);
    expect(summary?.roiPct).toBeCloseTo(40, 6);
  });
});
