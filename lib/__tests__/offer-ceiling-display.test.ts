import { describe, expect, it } from "vitest";
import { isOfferCeilingUnbounded, OFFER_CEILING_NO_LIMIT_MULTIPLE } from "@/lib/offer-ceiling-display";

describe("isOfferCeilingUnbounded (audit A7)", () => {
  it("is the founder's 2x asking", () => {
    expect(OFFER_CEILING_NO_LIMIT_MULTIPLE).toBe(2);
  });

  it("calls the audit's cash purchase unbounded: $1,296,500 on $250,000 asking", () => {
    expect(isOfferCeilingUnbounded(1_296_500, 250_000)).toBe(true);
  });

  it("keeps a ceiling above asking that is still a price", () => {
    expect(isOfferCeilingUnbounded(320_000, 250_000)).toBe(false);
    expect(isOfferCeilingUnbounded(500_000, 250_000)).toBe(false);
  });

  it("keeps the sample's ceiling below asking", () => {
    expect(isOfferCeilingUnbounded(236_000, 265_000)).toBe(false);
  });

  it("needs an asking price to compare with", () => {
    expect(isOfferCeilingUnbounded(1_000_000, 0)).toBe(false);
    expect(isOfferCeilingUnbounded(1_000_000, null)).toBe(false);
    expect(isOfferCeilingUnbounded(null, 250_000)).toBe(false);
  });
});
