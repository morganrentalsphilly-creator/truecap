import { describe, expect, it } from "vitest";
import {
  mapRentCastPropertyType,
  parseAvm,
  parsePropertyRecord,
  parseSaleListing,
} from "@/lib/property-enrichment/rentcast";

describe("parseSaleListing", () => {
  it("returns the active listing's list price + facts", () => {
    const r = parseSaleListing([
      { status: "Inactive", price: 250000, listedDate: "2024-01-01" },
      { status: "Active", price: 329000, listedDate: "2026-05-01", bedrooms: 3, bathrooms: 2, squareFootage: 1500 },
    ])!;
    expect(r.listPrice).toBe(329000);
    expect(r.status).toBe("Active");
    expect(r.bedrooms).toBe(3);
    expect(r.squareFootage).toBe(1500);
  });

  it("returns null when no listing is active (never surface a sold price as the ask)", () => {
    expect(
      parseSaleListing([
        { status: "Inactive", price: 200000, listedDate: "2023-01-01" },
        { status: "Sold", price: 275000, listedDate: "2025-09-01" },
      ])
    ).toBeNull();
  });

  it("accepts a single object and returns null without a usable price", () => {
    expect(parseSaleListing({ status: "Active", price: 410000 })!.listPrice).toBe(410000);
    expect(parseSaleListing({ status: "Active" })).toBeNull();
    expect(parseSaleListing({ status: "Active", price: 0 })).toBeNull();
    expect(parseSaleListing({ status: "Active", price: -1 })).toBeNull();
    expect(parseSaleListing({ status: "Active", price: "   " })).toBeNull();
    expect(parseSaleListing([])).toBeNull();
    expect(parseSaleListing(null)).toBeNull();
  });
});

describe("mapRentCastPropertyType", () => {
  it("maps RentCast types to the form union", () => {
    expect(mapRentCastPropertyType("Single Family")).toBe("single-family");
    expect(mapRentCastPropertyType("Multi-Family")).toBe("multi-family");
    expect(mapRentCastPropertyType("Duplex")).toBe("multi-family");
    expect(mapRentCastPropertyType("Condo")).toBe("single-family");
    expect(mapRentCastPropertyType("Townhouse")).toBe("single-family");
    expect(mapRentCastPropertyType("Land")).toBeNull();
    expect(mapRentCastPropertyType(null)).toBeNull();
  });
});

describe("parsePropertyRecord", () => {
  it("parses a flat record (and accepts an array)", () => {
    const rec = {
      bedrooms: 3,
      bathrooms: 2,
      squareFootage: 1500,
      yearBuilt: 1990,
      lotSize: 5000,
      propertyType: "Single Family",
      lastSalePrice: 250000,
      lastSaleDate: "2022-05-01",
    };
    const facts = parsePropertyRecord([rec]);
    expect(facts).toEqual({
      bedrooms: 3,
      bathrooms: 2,
      squareFootage: 1500,
      yearBuilt: 1990,
      lotSize: 5000,
      propertyType: "Single Family",
      lastSalePrice: 250000,
      lastSaleDate: "2022-05-01",
    });
  });

  it("falls back to the latest sale-history entry", () => {
    const rec = {
      bedrooms: 4,
      saleHistory: {
        "2019": { date: "2019-03-01", price: 180000 },
        "2023": { date: "2023-07-15", price: 410000 },
      },
    };
    const facts = parsePropertyRecord(rec)!;
    expect(facts.lastSalePrice).toBe(410000);
    expect(facts.lastSaleDate).toBe("2023-07-15");
  });

  it("returns null when nothing usable is present", () => {
    expect(parsePropertyRecord({})).toBeNull();
    expect(parsePropertyRecord(null)).toBeNull();
    expect(parsePropertyRecord([])).toBeNull();
  });
});

describe("parseAvm", () => {
  it("parses a value AVM with sale comps", () => {
    const r = parseAvm(
      {
        price: 300000,
        priceRangeLow: 280000,
        priceRangeHigh: 320000,
        comparables: [
          { formattedAddress: "1 A St", price: 295000, bedrooms: 3, bathrooms: 2, squareFootage: 1480, distance: 0.3, correlation: 0.95 },
          { addressLine1: "2 B Ave", price: 305000 },
        ],
      },
      "value"
    )!;
    expect(r.estimate).toBe(300000);
    expect(r.range).toEqual({ low: 280000, high: 320000 });
    expect(r.comps).toHaveLength(2);
    expect(r.comps[0]).toMatchObject({ address: "1 A St", price: 295000, distanceMiles: 0.3, correlation: 0.95 });
  });

  it("parses a rent AVM (headline is `rent`)", () => {
    const r = parseAvm({ rent: 1800, rentRangeLow: 1700, rentRangeHigh: 1900, comparables: [] }, "rent")!;
    expect(r.estimate).toBe(1800);
    expect(r.range).toEqual({ low: 1700, high: 1900 });
    expect(r.comps).toEqual([]);
  });

  it("drops comps without an address and caps at 6", () => {
    const comparables = [
      { price: 1 }, // no address → dropped
      ...Array.from({ length: 10 }, (_, i) => ({ formattedAddress: `${i} St`, price: 1000 + i })),
    ];
    const r = parseAvm({ price: 100, comparables }, "value")!;
    expect(r.comps).toHaveLength(6);
    expect(r.comps.every((c) => c.address)).toBe(true);
  });

  it("returns null when there's no estimate and no comps", () => {
    expect(parseAvm({ comparables: [] }, "value")).toBeNull();
    expect(parseAvm(null, "rent")).toBeNull();
  });
});
