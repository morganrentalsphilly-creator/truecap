import { describe, it, expect } from "vitest";
import { marketStrategyFit, strategyFitFromTier } from "@/lib/market-strategy-fit";

describe("marketStrategyFit", () => {
  it("high cap-rate metros read as cash-flow markets", () => {
    // Detroit ~10, Cleveland ~9, Memphis ~9, Pittsburgh ~8, Indianapolis ~7.5
    for (const m of [10, 9, 8, 7.5]) {
      expect(marketStrategyFit(m).tone).toBe("cashflow");
    }
  });

  it("compressed cap-rate metros read as appreciation markets", () => {
    // San Jose ~4, SF ~4.2, NYC/LA ~4.5, CA ~4.8, DC ~5, Dallas/Phoenix ~5.5
    for (const m of [4, 4.2, 4.5, 4.8, 5.0, 5.5]) {
      expect(marketStrategyFit(m).tone).toBe("appreciation");
    }
  });

  it("mid-range markets read as balanced", () => {
    // FL/Atlanta ~5.8, Charlotte ~6, Houston ~6.2, national/TX/GA/NC ~6.5, PA state ~7
    for (const m of [5.6, 5.8, 6.0, 6.5, 7.0, 7.4]) {
      expect(marketStrategyFit(m).tone).toBe("balanced");
    }
  });

  it("always returns a non-empty label + blurb, even for bad input", () => {
    for (const m of [10, 5, 6.5, NaN]) {
      const fit = marketStrategyFit(m);
      expect(fit.label.length).toBeGreaterThan(0);
      expect(fit.blurb.length).toBeGreaterThan(0);
    }
    expect(marketStrategyFit(NaN).tone).toBe("balanced");
  });
});

describe("strategyFitFromTier", () => {
  it("maps curated StateData tiers to the same badge shape", () => {
    expect(strategyFitFromTier("Cash flow").tone).toBe("cashflow");
    expect(strategyFitFromTier("Appreciation").tone).toBe("appreciation");
    expect(strategyFitFromTier("Balanced").tone).toBe("balanced");
  });

  it("is tolerant of casing and unknown values", () => {
    expect(strategyFitFromTier("CASH FLOW").tone).toBe("cashflow");
    expect(strategyFitFromTier("whatever").tone).toBe("balanced");
    expect(strategyFitFromTier("").tone).toBe("balanced");
  });
});
