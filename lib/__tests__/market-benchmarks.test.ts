import { describe, expect, it } from "vitest";
import {
  parseLocationFromAddress,
  getCapRateBenchmark,
  formatCapRateBenchmarkSubline,
} from "../market-benchmarks";

describe("parseLocationFromAddress", () => {
  it("parses Google Places format with zip + USA suffix", () => {
    const result = parseLocationFromAddress("1205 N 5th St, Philadelphia, PA 19122, USA");
    expect(result.city).toBe("Philadelphia");
    expect(result.state).toBe("PA");
  });

  it("parses without USA suffix", () => {
    const result = parseLocationFromAddress("456 Elm St, Detroit, MI 48226");
    expect(result.city).toBe("Detroit");
    expect(result.state).toBe("MI");
  });

  it("parses without zip", () => {
    const result = parseLocationFromAddress("789 Oak Ave, Boise, ID");
    expect(result.city).toBe("Boise");
    expect(result.state).toBe("ID");
  });

  it("returns null state on free-form input with no state code", () => {
    const result = parseLocationFromAddress("123 Main Street");
    expect(result.city).toBeNull();
    expect(result.state).toBeNull();
  });

  it("returns null state on non-US format", () => {
    const result = parseLocationFromAddress("221B Baker Street, London, UK");
    expect(result.state).toBeNull();
  });

  it("ignores invalid 2-letter codes that are not state codes", () => {
    // "ZZ" is not a state; should not be picked up
    const result = parseLocationFromAddress("123 Test St, Faketown, ZZ 99999");
    expect(result.state).toBeNull();
  });

  it("does not pick up capitalized words inside the street", () => {
    const result = parseLocationFromAddress("100 NY Avenue, Springfield, IL 62701");
    expect(result.state).toBe("IL");
    expect(result.city).toBe("Springfield");
  });

  it("handles null/undefined input", () => {
    expect(parseLocationFromAddress(null).state).toBeNull();
    expect(parseLocationFromAddress(undefined).state).toBeNull();
    expect(parseLocationFromAddress("").state).toBeNull();
  });
});

describe("getCapRateBenchmark", () => {
  it("returns metro override for known city + state pair", () => {
    const benchmark = getCapRateBenchmark("1205 N 5th St, Philadelphia, PA 19122, USA");
    expect(benchmark?.scope).toBe("metro");
    expect(benchmark?.scopeName).toBe("Philadelphia");
    expect(benchmark?.median).toBe(7.5);
  });

  it("resolves Portland correctly by state (OR vs ME)", () => {
    const oregon = getCapRateBenchmark("123 Pearl St, Portland, OR 97201");
    expect(oregon?.scopeName).toBe("Portland");
    expect(oregon?.median).toBe(5.0);
    const maine = getCapRateBenchmark("456 Commercial St, Portland, ME 04101");
    expect(maine?.scopeName).toBe("Portland (Maine)");
    expect(maine?.median).toBe(6.5);
  });

  it("falls back to state median when city is unknown", () => {
    const benchmark = getCapRateBenchmark("123 Some Street, Lancaster, PA 17601");
    expect(benchmark?.scope).toBe("state");
    expect(benchmark?.scopeName).toBe("Pennsylvania");
    expect(benchmark?.median).toBe(7.0);
  });

  it("falls back to national when address has no state", () => {
    const benchmark = getCapRateBenchmark("just a street name");
    expect(benchmark?.scope).toBe("national");
    expect(benchmark?.scopeName).toBe("U.S.");
  });

  it("is case-insensitive on city matching", () => {
    const benchmark = getCapRateBenchmark("123 Main, NEW YORK, NY 10001");
    expect(benchmark?.scopeName).toBe("New York City");
  });
});

describe("formatCapRateBenchmarkSubline", () => {
  const phl = { median: 7.5, scopeName: "Philadelphia", scope: "metro" as const };

  it("shows 'Above' when user is meaningfully above the median", () => {
    expect(formatCapRateBenchmarkSubline(9.0, phl)).toContain("Above");
    expect(formatCapRateBenchmarkSubline(9.0, phl)).toContain("7.5%");
    expect(formatCapRateBenchmarkSubline(9.0, phl)).toContain("Philadelphia");
  });

  it("shows 'Below' when user is meaningfully under the median", () => {
    expect(formatCapRateBenchmarkSubline(5.5, phl)).toContain("Below");
  });

  it("shows 'Near' when within ±0.5pt", () => {
    expect(formatCapRateBenchmarkSubline(7.4, phl)).toContain("Near");
    expect(formatCapRateBenchmarkSubline(7.8, phl)).toContain("Near");
  });

  it("uses 'U.S.' label for national scope rather than the scopeName", () => {
    const national = { median: 6.5, scopeName: "U.S.", scope: "national" as const };
    const subline = formatCapRateBenchmarkSubline(8.0, national);
    expect(subline).toContain("U.S.");
  });
});
