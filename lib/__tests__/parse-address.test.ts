import { describe, it, expect } from "vitest";
import { parseAddressLocation } from "@/lib/parse-address";

describe("parseAddressLocation", () => {
  it("pulls state + zip from a standard typed address", () => {
    const r = parseAddressLocation("123 Main St, Austin, TX 78701");
    expect(r.state).toBe("TX");
    expect(r.zip).toBe("78701");
  });

  it("handles a Google-formatted address with trailing country", () => {
    const r = parseAddressLocation("16601 N 25th Ave, Phoenix, AZ 85382, USA");
    expect(r.state).toBe("AZ");
    expect(r.zip).toBe("85382");
  });

  it("is case-insensitive for the state-before-zip signal", () => {
    const r = parseAddressLocation("742 evergreen terrace, springfield, or 97477");
    expect(r.state).toBe("OR");
    expect(r.zip).toBe("97477");
  });

  it("recovers a ZIP+4 as the 5-digit base", () => {
    expect(parseAddressLocation("1 Loop, Cupertino CA 95014-2083").zip).toBe("95014");
  });

  it("prefers West Virginia over Virginia (longest name wins)", () => {
    expect(parseAddressLocation("100 Coal St, Charleston, West Virginia").state).toBe("WV");
  });

  it("matches a full state name when there's no abbreviation", () => {
    expect(parseAddressLocation("500 Beach Blvd, Miami, Florida").state).toBe("FL");
  });

  it("does NOT treat lowercase common words as state codes", () => {
    // "in" (Indiana), "or" (Oregon), "me" (Maine) must not false-positive.
    const r = parseAddressLocation("a house in a town for me or you");
    expect(r.state).toBeUndefined();
  });

  it("returns empty for junk / no location", () => {
    expect(parseAddressLocation("")).toEqual({});
    expect(parseAddressLocation("just some words")).toEqual({});
  });
});
