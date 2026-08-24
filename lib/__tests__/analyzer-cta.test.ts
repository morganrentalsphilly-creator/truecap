import { describe, expect, it } from "vitest";
import { getAnalyzerCta } from "../analyzer-cta";

describe("role-aware analyzer CTA", () => {
  it("offers the shared sample when no property is available", () => {
    expect(getAnalyzerCta({ hasProperty: false, canCalculateMaxOffer: false })).toBe(
      "Try a sample deal"
    );
  });

  it("frames a guest run as free analysis", () => {
    expect(getAnalyzerCta({ hasProperty: true, canCalculateMaxOffer: false })).toBe(
      "Analyze this property free"
    );
  });

  it("names the Offer Ceiling outcome for Pro", () => {
    expect(getAnalyzerCta({ hasProperty: true, canCalculateMaxOffer: true })).toBe(
      "Calculate my Offer Ceiling"
    );
  });
});
