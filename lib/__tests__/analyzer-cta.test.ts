import { describe, expect, it } from "vitest";
import {
  analysisRunPromisesOfferCeiling,
  getAnalyzerCta,
} from "../analyzer-cta";

describe("role-aware analyzer CTA", () => {
  it("offers the shared sample when no property is available", () => {
    expect(
      getAnalyzerCta({ hasProperty: false, canCalculateMaxOffer: false }),
    ).toBe("Try a sample deal");
  });

  it("asks for the required address without pretending entered price and rent are runnable", () => {
    expect(
      getAnalyzerCta({
        hasProperty: false,
        canCalculateMaxOffer: true,
        requiresAddressBeforeRun: true,
      }),
    ).toBe("Add address to run full analysis");
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

describe("Offer Ceiling run gate", () => {
  it("requires criteria only for default, Buy & Hold, and Wholesale Pro runs", () => {
    for (const strategyKey of [null, "buy-hold", "wholesale-mao"]) {
      expect(
        analysisRunPromisesOfferCeiling({
          canCalculateMaxOffer: true,
          strategyKey,
        }),
      ).toBe(true);
    }
    for (const strategyKey of [
      "house-hack",
      "brrrr",
      "fix-flip",
      "short-term",
    ]) {
      expect(
        analysisRunPromisesOfferCeiling({
          canCalculateMaxOffer: true,
          strategyKey,
        }),
      ).toBe(false);
    }
  });

  it("never gates a free run", () => {
    expect(
      analysisRunPromisesOfferCeiling({
        canCalculateMaxOffer: false,
        strategyKey: "buy-hold",
      }),
    ).toBe(false);
  });
});

// 2026-11 ads pass (F1): on the empty public analyzer the button reads
// "Analyze deal & calculate ceiling", and it sat above the sample button's
// caption ("See a full sample report. No address needed."). The caption under
// the analyze label now says what the analysis costs; the sample caption
// stays for a button that carries the sample label.
describe("the empty analyzer's run caption", () => {
  it("is the free-decision line under the analyze label, and the sample line only under a sample label", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const page = readFileSync(
      join(process.cwd(), "components/investcalc/investcalc-page.tsx"),
      "utf8",
    ).replace(/\s+/g, " ");
    expect(page).toContain(
      '!isAuthenticated && primaryActionLabel !== analyzerCta ? anonymousDecisionUsed ? "Create a free account for the exact Offer Ceiling." : "Your first full decision is free. No account." : "See a full sample report. No address needed."',
    );
  });
});
