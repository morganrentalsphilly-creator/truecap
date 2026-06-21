import { describe, it, expect } from "vitest";
import {
  CALCULATOR_REGISTRY,
  EMBEDDABLE_CALCULATORS,
  CALCULATOR_COUNT,
  EMBEDDABLE_COUNT,
  getCalculator,
  calculatorsByCategory,
} from "@/lib/calculator-registry";

/**
 * Locks the calculator registry contract so counts (the original 14-vs-13 bug)
 * and the embeddable set can't silently drift. Note the embeddable slug list
 * below MUST stay in lockstep with lib/embed-registry.ts's EMBED_REGISTRY keys
 * (we assert the explicit set rather than importing that module, which pulls in
 * next/dynamic widget loaders).
 */
const EXPECTED_EMBEDDABLE = [
  "1-percent-rule-calculator",
  "brrrr-calculator",
  "break-even-calculator",
  "cap-rate-calculator",
  "cash-on-cash-calculator",
  "closing-cost-calculator",
  "dscr-calculator",
  "gross-rent-multiplier-calculator",
  "mortgage-payment-calculator",
  "noi-calculator",
  "rental-property-tax-calculator",
  "roi-calculator",
  "vacancy-rate-calculator",
].sort();

describe("calculator registry", () => {
  it("has 14 calculator pages, 13 embeddable", () => {
    expect(CALCULATOR_COUNT).toBe(14);
    expect(EMBEDDABLE_COUNT).toBe(13);
  });

  it("embeddable set is exactly the expected 13", () => {
    expect(EMBEDDABLE_CALCULATORS.map((c) => c.slug).sort()).toEqual(EXPECTED_EMBEDDABLE);
  });

  it("rehab-cost-estimator is the only non-embeddable", () => {
    expect(CALCULATOR_REGISTRY.filter((c) => !c.embeddable).map((c) => c.slug)).toEqual([
      "rehab-cost-estimator",
    ]);
  });

  it("slugs are unique", () => {
    const slugs = CALCULATOR_REGISTRY.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("getCalculator resolves + categories cover every entry", () => {
    expect(getCalculator("cap-rate-calculator")?.category).toBe("returns");
    expect(getCalculator("nope")).toBeNull();
    const grouped = calculatorsByCategory();
    expect(grouped.reduce((n, g) => n + g.items.length, 0)).toBe(CALCULATOR_COUNT);
  });
});
