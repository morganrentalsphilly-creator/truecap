import { describe, expect, it } from "vitest";
import { buildAssumptionEntries } from "@/components/investcalc/assumptions-source-strip";
import type { EnrichmentProvenanceInput } from "@/lib/data-confidence";

const fullEnrichment: EnrichmentProvenanceInput = {
  monthlyRent: { source: "hud-fmr", detail: "Philadelphia County" },
  interestRate: { source: "fred", fetchedAt: "2026-06-25" },
  propertyTaxPct: { source: "state-static", detail: "PA" },
};

describe("buildAssumptionEntries (truthful assumptions strip)", () => {
  it("names the live sources when enrichment filled the fields untouched", () => {
    const e = buildAssumptionEntries(fullEnrichment, false);
    expect(e.map((x) => [x.label, x.source])).toEqual([
      ["Rent", "HUD rent benchmark (county)"],
      ["Mortgage rate", "FRED owner-occupied benchmark"],
      ["Property tax", "State tax benchmark"],
      ["Expenses", "Smart defaults"],
    ]);
    expect(e.every((x) => !x.manual)).toBe(true);
  });

  it("says 'You entered it' for a field the user overrode — never HUD", () => {
    const e = buildAssumptionEntries(
      { ...fullEnrichment, monthlyRent: { source: "hud-fmr", overridden: true } },
      false
    );
    expect(e[0]).toMatchObject({ label: "Rent", source: "You entered it", manual: true });
    // The untouched fields keep their live sources.
    expect(e[1]!.source).toBe("FRED owner-occupied benchmark");
  });

  it("treats no-enrichment as the user's own entries", () => {
    const e = buildAssumptionEntries(null, false);
    expect(e[0]!.source).toBe("You entered it");
    expect(e[1]!.source).toBe("You entered it");
    expect(e[2]!.source).toBe("You entered it");
    expect(e[3]!.source).toBe("Smart defaults"); // untouched expenses stay defaults
  });

  it("labels ZIP-level HUD rent distinctly", () => {
    const e = buildAssumptionEntries(
      { monthlyRent: { source: "hud-safmr", detail: "19103" } },
      false
    );
    expect(e[0]!.source).toBe("HUD rent benchmark (ZIP)");
  });

  it("never relabels a RentCast estimate as HUD in the compact summary", () => {
    const e = buildAssumptionEntries(
      {
        monthlyRent: {
          source: "rentcast-estimate",
          detail: "Property estimate",
          fetchedAt: "2026-08-25",
        },
      },
      false
    );
    expect(e[0]).toMatchObject({
      source: "RentCast market-rent estimate",
      short: "RentCast",
      freshness: "As of 2026-08-25",
      manual: false,
    });
  });

  it("carries source freshness when the feed provides it", () => {
    const e = buildAssumptionEntries(
      {
        monthlyRent: { source: "hud-fmr", fetchedAt: "2026" },
        interestRate: { source: "fred", fetchedAt: "2026-06-25" },
      },
      false
    );
    expect(e[0]).toMatchObject({ freshness: "HUD 2026" });
    expect(e[1]).toMatchObject({ freshness: "As of 2026-06-25" });
  });

  it("flips Expenses to the user once any expense field is dirty", () => {
    const e = buildAssumptionEntries(fullEnrichment, true);
    expect(e[3]).toMatchObject({ label: "Expenses", source: "You entered it", manual: true });
  });
});
