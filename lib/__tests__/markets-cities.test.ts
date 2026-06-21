import { describe, it, expect } from "vitest";
import {
  MARKET_CITIES,
  BESPOKE_MARKET_SLUGS,
  getMarketCity,
  getMarketCityParams,
} from "@/lib/markets/cities";

describe("markets/cities dataset", () => {
  it("has unique slugs", () => {
    const slugs = MARKET_CITIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("never collides with bespoke static market pages", () => {
    for (const c of MARKET_CITIES) {
      expect(BESPOKE_MARKET_SLUGS.has(c.slug)).toBe(false);
    }
  });

  it("uses kebab-case slugs and 2-letter uppercase state codes", () => {
    for (const c of MARKET_CITIES) {
      expect(c.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(c.stateCode).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("has substantive content on every entry (not thin)", () => {
    for (const c of MARKET_CITIES) {
      expect(c.name.length).toBeGreaterThan(1);
      expect(c.stateName.length).toBeGreaterThan(1);
      expect(c.blurb.length).toBeGreaterThan(40);
      expect(c.investorAngle.length).toBeGreaterThan(60);
      expect(c.typicalRent).toMatch(/\$/);
      expect(c.typicalPrice).toMatch(/\$/);
      expect(c.neighborhoods.length).toBeGreaterThanOrEqual(2);
      expect(c.relatedPosts.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("getMarketCity resolves known slugs and rejects unknown/bespoke ones", () => {
    expect(getMarketCity("columbus")?.name).toBe("Columbus");
    expect(getMarketCity("philadelphia")).toBeUndefined(); // bespoke, not in dataset
    expect(getMarketCity("not-a-real-city")).toBeUndefined();
  });

  it("getMarketCityParams returns one param per (non-bespoke) city", () => {
    const params = getMarketCityParams();
    expect(params.length).toBe(MARKET_CITIES.length);
    for (const p of params) {
      expect(BESPOKE_MARKET_SLUGS.has(p.city)).toBe(false);
    }
  });
});
