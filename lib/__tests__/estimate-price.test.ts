import { describe, it, expect } from "vitest";
import {
  estimatePurchasePrice,
  NATIONAL_PRICE_TO_RENT,
} from "@/lib/estimate-price";

describe("estimatePurchasePrice", () => {
  it("uses the national multiple when no state is given", () => {
    const est = estimatePurchasePrice({ monthlyRent: 2000 });
    expect(est).not.toBeNull();
    // 2000 * 12 * 15 = 360,000 (already a multiple of 5,000)
    expect(est!.price).toBe(2000 * 12 * NATIONAL_PRICE_TO_RENT);
    expect(est!.ratio).toBe(NATIONAL_PRICE_TO_RENT);
    expect(est!.basis).toContain("screening placeholder");
    expect(est!.basis).toContain("replace with asking price");
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

  it("does not let the stale state registry change the released estimate", () => {
    const texas = estimatePurchasePrice({ monthlyRent: 1800, state: "TX" });
    const california = estimatePurchasePrice({
      monthlyRent: 1800,
      state: "California",
    });
    const noState = estimatePurchasePrice({ monthlyRent: 1800 });
    expect(texas).toEqual(noState);
    expect(california).toEqual(noState);
    expect(texas!.basis.toLowerCase()).not.toContain("texas");
  });

  it("falls back to the national multiple for an unknown state", () => {
    const est = estimatePurchasePrice({ monthlyRent: 2000, state: "ZZ" });
    expect(est!.ratio).toBe(NATIONAL_PRICE_TO_RENT);
    expect(est!.price).toBe(2000 * 12 * NATIONAL_PRICE_TO_RENT);
  });
});
