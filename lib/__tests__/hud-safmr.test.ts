import { describe, expect, it } from "vitest";
import { isSmallAreaEntity, pickZipSafmrRent } from "@/lib/property-enrichment/hud-safmr";

// Shape lifted verbatim from HUD's documented SAFMR example for
// METRO47900M47900 (Washington-Arlington-Alexandria): an array of ZIP
// rows plus one synthetic "MSA level" row. Numbers are HUD's actual
// 2024 doc-example values.
const SAFMR_ROWS = [
  {
    zip_code: "MSA level",
    Efficiency: 1772,
    "One-Bedroom": 1803,
    "Two-Bedroom": 2045,
    "Three-Bedroom": 2544,
    "Four-Bedroom": 3015,
  },
  {
    zip_code: "20001",
    Efficiency: 2460,
    "One-Bedroom": 2500,
    "Two-Bedroom": 2840,
    "Three-Bedroom": 3530,
    "Four-Bedroom": 4190,
  },
  {
    zip_code: "20002",
    Efficiency: 1750,
    "One-Bedroom": 1780,
    "Two-Bedroom": 2020,
    "Three-Bedroom": 2510,
    "Four-Bedroom": 2980,
  },
];

describe("pickZipSafmrRent", () => {
  it("returns the rent for a listed ZIP + bedroom field", () => {
    expect(pickZipSafmrRent(SAFMR_ROWS, "20001", "Three-Bedroom")).toBe(3530);
    expect(pickZipSafmrRent(SAFMR_ROWS, "20002", "Efficiency")).toBe(1750);
  });

  it("returns null for a ZIP that isn't listed (caller falls back to county figure)", () => {
    expect(pickZipSafmrRent(SAFMR_ROWS, "99999", "Two-Bedroom")).toBeNull();
  });

  it("never matches the synthetic 'MSA level' row", () => {
    // "MSA level" isn't a 5-digit ZIP, so no input can select it.
    expect(pickZipSafmrRent(SAFMR_ROWS, "MSA level", "Two-Bedroom")).toBeNull();
  });

  it("returns null for non-array basicdata (non-SAFMR entity shape)", () => {
    const nonSafmr = { Efficiency: "758.0", "Two-Bedroom": "948.0", year: "2017" };
    expect(pickZipSafmrRent(nonSafmr, "19140", "Two-Bedroom")).toBeNull();
    expect(pickZipSafmrRent(null, "19140", "Two-Bedroom")).toBeNull();
    expect(pickZipSafmrRent(undefined, "19140", "Two-Bedroom")).toBeNull();
  });

  it("returns null when the bedroom field is missing, zero, or non-numeric", () => {
    const rows = [
      { zip_code: "19140", "Two-Bedroom": 0 },
      { zip_code: "19141", "Two-Bedroom": "n/a" },
      { zip_code: "19142" },
    ];
    expect(pickZipSafmrRent(rows, "19140", "Two-Bedroom")).toBeNull();
    expect(pickZipSafmrRent(rows, "19141", "Two-Bedroom")).toBeNull();
    expect(pickZipSafmrRent(rows, "19142", "Two-Bedroom")).toBeNull();
  });

  it("handles string rent values (HUD mixes strings and numbers across endpoints)", () => {
    const rows = [{ zip_code: "19140", "Two-Bedroom": "1360.0" }];
    expect(pickZipSafmrRent(rows, "19140", "Two-Bedroom")).toBe(1360);
  });

  it("trims whitespace around zip codes on both sides", () => {
    const rows = [{ zip_code: " 19140 ", "Two-Bedroom": 1360 }];
    expect(pickZipSafmrRent(rows, "19140", "Two-Bedroom")).toBe(1360);
    expect(pickZipSafmrRent(SAFMR_ROWS, " 20001 ", "Two-Bedroom")).toBe(2840);
  });

  it("rejects malformed zip inputs", () => {
    expect(pickZipSafmrRent(SAFMR_ROWS, "2000", "Two-Bedroom")).toBeNull();
    expect(pickZipSafmrRent(SAFMR_ROWS, "abcde", "Two-Bedroom")).toBeNull();
    expect(pickZipSafmrRent(SAFMR_ROWS, "", "Two-Bedroom")).toBeNull();
  });
});

describe("isSmallAreaEntity", () => {
  it("accepts HUD's string and numeric flag variants", () => {
    expect(isSmallAreaEntity({ smallarea_status: "1" })).toBe(true);
    expect(isSmallAreaEntity({ smallarea_status: 1 })).toBe(true);
  });

  it("rejects zero, missing, and other values", () => {
    expect(isSmallAreaEntity({ smallarea_status: "0" })).toBe(false);
    expect(isSmallAreaEntity({ smallarea_status: 0 })).toBe(false);
    expect(isSmallAreaEntity({})).toBe(false);
    expect(isSmallAreaEntity({ smallarea_status: undefined })).toBe(false);
  });
});
