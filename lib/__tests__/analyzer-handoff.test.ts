import { describe, it, expect } from "vitest";
import { readAnalyzerHandoff, buildAnalyzerHandoffUrl } from "@/lib/analyzer-handoff";

describe("readAnalyzerHandoff", () => {
  it("returns null when no supported params are present", () => {
    expect(readAnalyzerHandoff("")).toBeNull();
    expect(readAnalyzerHandoff("?utm_source=tools&foo=bar")).toBeNull();
  });

  it("parses a full handoff", () => {
    expect(readAnalyzerHandoff("?price=300000&rent=2400&beds=3&address=123%20Main%20St")).toEqual({
      purchasePrice: 300000,
      monthlyRent: 2400,
      bedrooms: 3,
      address: "123 Main St",
    });
  });

  it("accepts a partial handoff (price + rent only)", () => {
    expect(readAnalyzerHandoff("?price=250000&rent=2000")).toEqual({
      purchasePrice: 250000,
      monthlyRent: 2000,
    });
  });

  it("drops out-of-range values instead of prefilling them", () => {
    // price below the $10k floor, beds above 20, address too short
    expect(readAnalyzerHandoff("?price=5000&beds=99&address=abc")).toBeNull();
    expect(readAnalyzerHandoff("?price=5000&rent=1500")).toEqual({ monthlyRent: 1500 });
  });

  it("ignores non-numeric junk", () => {
    expect(readAnalyzerHandoff("?price=abc&rent=xyz")).toBeNull();
  });

  it("seeds a valid property type (persona deep link)", () => {
    expect(readAnalyzerHandoff("?type=owner-occupant")).toEqual({ propertyType: "owner-occupant" });
    expect(readAnalyzerHandoff("?type=multi-family&price=400000")).toEqual({
      propertyType: "multi-family",
      purchasePrice: 400000,
    });
    // The explicit alias also works.
    expect(readAnalyzerHandoff("?propertyType=single-family")).toEqual({ propertyType: "single-family" });
  });

  it("silently ignores an invalid property type", () => {
    expect(readAnalyzerHandoff("?type=mansion")).toBeNull();
    expect(readAnalyzerHandoff("?type=commercial&rent=1500")).toEqual({ monthlyRent: 1500 });
  });
});

describe("buildAnalyzerHandoffUrl", () => {
  it("round-trips through readAnalyzerHandoff", () => {
    const url = buildAnalyzerHandoffUrl({ purchasePrice: 320000, monthlyRent: 2500, bedrooms: 3 });
    const search = url.slice(url.indexOf("?"));
    expect(readAnalyzerHandoff(search)).toEqual({
      purchasePrice: 320000,
      monthlyRent: 2500,
      bedrooms: 3,
    });
  });

  it("rounds money + always sets a utm_source", () => {
    const url = buildAnalyzerHandoffUrl({ purchasePrice: 299999.6, monthlyRent: 2000.4 });
    expect(url).toContain("price=300000");
    expect(url).toContain("rent=2000");
    expect(url).toContain("utm_source=tool-handoff");
  });

  it("omits empty / invalid fields", () => {
    const url = buildAnalyzerHandoffUrl({ purchasePrice: 0, monthlyRent: 1800 });
    expect(url).not.toContain("price=");
    expect(url).toContain("rent=1800");
  });

  it("carries a non-default property type but omits single-family", () => {
    expect(buildAnalyzerHandoffUrl({ propertyType: "owner-occupant" })).toContain("type=owner-occupant");
    // single-family is the analyzer default → keep links clean.
    expect(buildAnalyzerHandoffUrl({ purchasePrice: 200000, propertyType: "single-family" })).not.toContain(
      "type="
    );
  });
});
