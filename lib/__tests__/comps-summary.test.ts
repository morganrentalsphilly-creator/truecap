/**
 * Tests for the comps row summary — the collapsed line that fronts the comps
 * card. The load-bearing property is CONSISTENCY: the collapsed row must never
 * contradict the card it fronts (no "sits inside the comp range" above a card
 * warning the rent is 14% high), and it must never give a false all-clear when
 * no comp range actually bounded the check.
 */
import { describe, expect, it } from "vitest";
import {
  buildCompWarnings,
  buildCompsRowSummary,
  COMP_RENT_ABOVE_PCT,
  COMP_RENT_BELOW_PCT,
} from "@/lib/comps-summary";
import type { PropertyEnrichment } from "@/lib/property-enrichment/rentcast";

function enrichment(partial: Partial<PropertyEnrichment>): PropertyEnrichment {
  return {
    rentRange: null,
    valueRange: null,
    ...partial,
  } as PropertyEnrichment;
}

describe("buildCompsRowSummary", () => {
  it("no comp set yet → the un-run prompt", () => {
    expect(buildCompsRowSummary(null, 2000, 300_000)).toMatch(/not run yet/i);
  });

  it("rent above the comp range → warns that cash flow may be optimistic", () => {
    // Range tops out at 2000; asking 2400 = 20% above.
    const s = buildCompsRowSummary(
      enrichment({ rentRange: { low: 1800, high: 2000 } }),
      2400,
      null
    );
    expect(s).toMatch(/20% above comps/);
    expect(s).toMatch(/optimistic/i);
  });

  it("price above the comp value range → names the price, not the rent", () => {
    const s = buildCompsRowSummary(
      enrichment({ valueRange: { low: 250_000, high: 300_000 } }),
      null,
      330_000
    );
    expect(s).toMatch(/Price 10% above recent sales/);
  });

  it("both rent AND price inflated → names both (most misleading combination)", () => {
    const s = buildCompsRowSummary(
      enrichment({
        rentRange: { low: 1800, high: 2000 },
        valueRange: { low: 250_000, high: 300_000 },
      }),
      2400,
      330_000
    );
    expect(s).toMatch(/Rent 20% and price 10% above comps/);
    expect(s).toMatch(/overstated/i);
  });

  it("rent well below the range → the under-renting upside note", () => {
    const s = buildCompsRowSummary(
      enrichment({ rentRange: { low: 2000, high: 2200 } }),
      1700, // 15% below the low bound
      null
    );
    expect(s).toMatch(/15% below comps/);
    expect(s).toMatch(/under-renting/i);
  });

  it("inside both ranges → an explicit all-clear", () => {
    const s = buildCompsRowSummary(
      enrichment({
        rentRange: { low: 1800, high: 2200 },
        valueRange: { low: 250_000, high: 320_000 },
      }),
      2000,
      300_000
    );
    expect(s).toBe("Rent and price both sit inside the comp range");
  });

  it("NEVER claims an all-clear when no range bounded the check", () => {
    // A comp set with no usable ranges verifies nothing — saying "inside the
    // range" here would be a false all-clear on unverified numbers.
    const s = buildCompsRowSummary(enrichment({}), 2000, 300_000);
    expect(s).not.toMatch(/inside/i);
    expect(s).toMatch(/see how your rent & price compare/);
  });

  it("a sub-threshold deviation neither warns NOR claims an all-clear", () => {
    // 2% above the high bound — under COMP_RENT_ABOVE_PCT, so no warning. But
    // the rent is still technically outside the range, so "sits inside" would
    // be false: the honest answer is the neutral line.
    const data = enrichment({ rentRange: { low: 1800, high: 2000 } });
    expect(buildCompWarnings(data, 2040, null)).toHaveLength(0);
    const s = buildCompsRowSummary(data, 2040, null);
    expect(s).not.toMatch(/above comps/);
    expect(s).not.toMatch(/inside/i);
  });
});

describe("row summary agrees with the card it fronts", () => {
  // The invariant that justifies sharing one module: whenever the expanded
  // card raises a "warn", the collapsed row must NOT read as an all-clear.
  const cases: { rent: number | null; price: number | null; data: PropertyEnrichment }[] = [
    {
      rent: 2400,
      price: null,
      data: enrichment({ rentRange: { low: 1800, high: 2000 } }),
    },
    {
      rent: null,
      price: 330_000,
      data: enrichment({ valueRange: { low: 250_000, high: 300_000 } }),
    },
    {
      rent: 2400,
      price: 330_000,
      data: enrichment({
        rentRange: { low: 1800, high: 2000 },
        valueRange: { low: 250_000, high: 300_000 },
      }),
    },
  ];

  it.each(cases)("warned card ⇒ non-all-clear row (%#)", ({ data, rent, price }) => {
    const warnings = buildCompWarnings(data, rent, price);
    const summary = buildCompsRowSummary(data, rent, price);
    expect(warnings.some((w) => w.tone === "warn")).toBe(true);
    expect(summary).not.toMatch(/sit inside|sits inside/i);
    expect(summary).toMatch(/above/i);
  });

  it("clean card ⇒ the row reads clean too", () => {
    const data = enrichment({
      rentRange: { low: 1800, high: 2200 },
      valueRange: { low: 250_000, high: 320_000 },
    });
    expect(buildCompWarnings(data, 2000, 300_000)).toHaveLength(0);
    expect(buildCompsRowSummary(data, 2000, 300_000)).toMatch(/inside the comp range/);
  });

  it("thresholds are the asymmetric ones the card documents", () => {
    // Over-stating inflates the verdict, so it trips earlier than under-stating.
    expect(COMP_RENT_ABOVE_PCT).toBeLessThan(COMP_RENT_BELOW_PCT);
  });
});
