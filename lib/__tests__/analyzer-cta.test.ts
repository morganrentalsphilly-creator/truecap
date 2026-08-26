import { describe, expect, it } from "vitest";
import { getAnalyzerCta } from "../analyzer-cta";

describe("role-aware analyzer CTA", () => {
  it("offers the shared sample when no property is available", () => {
    expect(
      getAnalyzerCta({ hasProperty: false, canCalculateMaxOffer: false }),
    ).toBe("Try a sample deal");
  });

  it("frames a guest run as free analysis", () => {
    expect(
      getAnalyzerCta({ hasProperty: true, canCalculateMaxOffer: false }),
    ).toBe("Analyze this property free");
  });

  it("names the Offer Ceiling outcome for Pro", () => {
    expect(
      getAnalyzerCta({ hasProperty: true, canCalculateMaxOffer: true }),
    ).toBe("Calculate my Offer Ceiling");
  });

  it("uses specialist copy only when the headline output is available", () => {
    expect(
      getAnalyzerCta({
        hasProperty: true,
        canCalculateMaxOffer: false,
        strategyRunCta: "Run BRRRR numbers",
        canUseStrategyPrimaryOutput: false,
      }),
    ).toBe("Screen rental baseline free");
    expect(
      getAnalyzerCta({
        hasProperty: true,
        canCalculateMaxOffer: true,
        strategyRunCta: "Run BRRRR numbers",
        canUseStrategyPrimaryOutput: true,
      }),
    ).toBe("Run BRRRR numbers");
  });

  it("keeps free specialist outputs specific", () => {
    expect(
      getAnalyzerCta({
        hasProperty: true,
        canCalculateMaxOffer: false,
        strategyRunCta: "Run STR numbers",
        canUseStrategyPrimaryOutput: true,
      }),
    ).toBe("Run STR numbers");
  });
});
