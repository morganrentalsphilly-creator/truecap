import { describe, it, expect } from "vitest";
import { estimatePurchasePrice, NATIONAL_PRICE_TO_RENT } from "@/lib/estimate-price";

describe("estimatePurchasePrice", () => {
  it("uses the national multiple when no state is given", () => {
    const est = estimatePurchasePrice({ monthlyRent: 2000 });
    expect(est).not.toBeNull();
    // 2000 * 12 * 15 = 360,000 (already a multiple of 5,000)
    expect(est!.price).toBe(2000 * 12 * NATIONAL_PRICE_TO_RENT);
    expect(est!.ratio).toBe(NATIONAL_PRICE_TO_RENT);
    expect(est!.basis.toLowerCase()).toContain("national");
  });

  it("returns null for non-positive or non-finite rent", () => {
    expect(estimatePurchasePrice({ monthlyRent: 0 })).toBeNull();
    expect(estimatePurchasePrice({ monthlyRent: -500 })).toBeNull();
    expect(estimatePurchasePrice({ monthlyRent: Number.NaN })).toBeNull();
  });

  it("always rounds the price to the nearest $5,000", () => {
    const est = estimatePurchasePrice({ monthlyRent: 808 });
    expect(est).not.toBeNull();
    expect(est!.price % 5000).toBe(0);
    expect(est!.price).toBeGreaterThan(0);
  });

  it("uses a market-aware ratio for a known state (within a sane band)", () => {
    const est = estimatePurchasePrice({ monthlyRent: 1800, state: "TX" });
    expect(est).not.toBeNull();
    expect(est!.price % 5000).toBe(0);
    expect(est!.ratio).toBeGreaterThanOrEqual(6);
    expect(est!.ratio).toBeLessThanOrEqual(35);
    expect(est!.basis.toLowerCase()).toContain("texas");
  });

  it("matches state case-insensitively by abbr, name, or slug", () => {
    const byAbbr = estimatePurchasePrice({ monthlyRent: 1800, state: "TX" });
    const byName = estimatePurchasePrice({ monthlyRent: 1800, state: "Texas" });
    const bySlug = estimatePurchasePrice({ monthlyRent: 1800, state: "texas" });
    expect(byAbbr!.price).toBe(byName!.price);
    expect(byName!.price).toBe(bySlug!.price);
  });

  it("falls back to the national multiple for an unknown state", () => {
    const est = estimatePurchasePrice({ monthlyRent: 2000, state: "ZZ" });
    expect(est!.ratio).toBe(NATIONAL_PRICE_TO_RENT);
    expect(est!.price).toBe(2000 * 12 * NATIONAL_PRICE_TO_RENT);
  });
});
