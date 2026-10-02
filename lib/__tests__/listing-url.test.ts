import { describe, it, expect } from "vitest";
import { parseListingUrl } from "@/lib/listing-url";

describe("parseListingUrl", () => {
  it("parses a Zillow homedetails URL", () => {
    const r = parseListingUrl(
      "https://www.zillow.com/homedetails/16601-N-25th-Ave-Phoenix-AZ-85382/7894451_zpid/"
    );
    expect(r).not.toBeNull();
    expect(r!.source).toBe("zillow");
    expect(r!.state).toBe("AZ");
    expect(r!.zip).toBe("85382");
    expect(r!.address).toBe("16601 N 25th Ave Phoenix AZ 85382");
  });

  it("parses a Redfin URL (state + city are separate path segments)", () => {
    const r = parseListingUrl(
      "https://www.redfin.com/CA/San-Francisco/123-Main-St-94110/home/178901234"
    );
    expect(r).not.toBeNull();
    expect(r!.source).toBe("redfin");
    expect(r!.state).toBe("CA");
    expect(r!.zip).toBe("94110");
    expect(r!.address).toContain("123 Main St");
    expect(r!.address).toContain("San Francisco");
    expect(r!.address).toContain("CA");
  });

  it("parses a Realtor.com detail URL", () => {
    const r = parseListingUrl(
      "https://www.realtor.com/realestateandhomes-detail/123-Main-St_Austin_TX_78701_M12345-67890"
    );
    expect(r).not.toBeNull();
    expect(r!.source).toBe("realtor");
    expect(r!.state).toBe("TX");
    expect(r!.zip).toBe("78701");
    expect(r!.address).toContain("123 Main St");
    expect(r!.address).toContain("78701");
    // The listing id after the ZIP ("M12345-67890") is not part of the address.
    expect(r!.address).toBe("123 Main St Austin TX 78701");
  });

  it("returns null for a Realtor.com link that carries only a listing id", () => {
    expect(
      parseListingUrl("https://www.realtor.com/realestateandhomes-detail/M1234567890"),
    ).toBeNull();
  });

  it("parses Trulia /home/ and /p/ links without the listing id", () => {
    const home = parseListingUrl(
      "https://www.trulia.com/home/1536-richmond-ave-columbus-oh-43203-33825793",
    );
    expect(home).toEqual({
      address: "1536 richmond ave columbus oh 43203",
      state: "OH",
      zip: "43203",
      source: "trulia",
    });
    // A unit number repeated in the slug stays; only the trailing id goes.
    expect(
      parseListingUrl(
        "https://www.trulia.com/home/1324-hildreth-ave-1324-columbus-oh-43203-448460054",
      )?.address,
    ).toBe("1324 hildreth ave 1324 columbus oh 43203");
    const p = parseListingUrl(
      "https://www.trulia.com/p/ny/bronx/895-tiffany-st-bronx-ny-10459--2008893028",
    );
    expect(p?.source).toBe("trulia");
    expect(p?.address).toBe("895 tiffany st bronx ny 10459");
    expect(p?.zip).toBe("10459");
    // The older /homedetails/ shape still parses through the shared branch.
    expect(
      parseListingUrl("https://www.trulia.com/homedetails/100-Test-St-Springfield-IL-62701/12345")?.address,
    ).toBe("100 Test St Springfield IL 62701");
  });

  it("parses a Homes.com property URL", () => {
    const r = parseListingUrl("https://www.homes.com/property/450-W-2nd-St-Reno-NV-89503/id-987/");
    expect(r).not.toBeNull();
    expect(r!.state).toBe("NV");
    expect(r!.zip).toBe("89503");
    expect(r!.address).toContain("450 W 2nd St");
  });

  it("returns null for a non-listing URL", () => {
    expect(parseListingUrl("https://www.google.com/search?q=houses")).toBeNull();
  });

  it("returns null for junk / non-URL input", () => {
    expect(parseListingUrl("not a url")).toBeNull();
    expect(parseListingUrl("")).toBeNull();
    expect(parseListingUrl("ftp://x.com/a")).toBeNull();
  });

  it("returns null when the slug has no street number (city-only)", () => {
    // A Zillow city page, not a home — no digits in the slug.
    expect(
      parseListingUrl("https://www.zillow.com/homedetails/Phoenix-AZ/")
    ).toBeNull();
  });
});
