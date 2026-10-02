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
      ["Property tax", "Legacy state estimate — verify locally"],
      ["Expenses", "Smart defaults"],
    ]);
    expect(e.every((x) => !x.manual)).toBe(true);
  });

  it("says 'You entered it' for a field the user overrode — never HUD", () => {
    const e = buildAssumptionEntries(
      {
        ...fullEnrichment,
        monthlyRent: { source: "hud-fmr", overridden: true },
      },
      false,
    );
    expect(e[0]).toMatchObject({
      label: "Rent",
      source: "You entered it",
      manual: true,
    });
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
      false,
    );
    expect(e[0]!.source).toBe("HUD rent benchmark (ZIP)");
  });

  // Audit row P0-02: an address with no county match gets the statewide HUD
  // fallback. The strip used to call it "HUD rent benchmark (county)".
  it("labels the statewide HUD fallback as statewide, never as a county or FMR figure", () => {
    const e = buildAssumptionEntries(
      {
        monthlyRent: {
          source: "hud-fmr",
          detail: "VA avg",
          fetchedAt: "2026",
          stateAverage: true,
        },
      },
      false,
    );
    expect(e[0]).toMatchObject({
      label: "Rent",
      source: "HUD rent benchmark (statewide average)",
      short: "HUD statewide",
      freshness: "HUD 2026",
      manual: false,
    });
    expect(e[0]!.source).not.toMatch(/county|ZIP/);
    expect(e[0]!.short).not.toMatch(/FMR/);
  });

  // Re-anchored on purpose (review of P0-02): a provenance stored before the
  // flag existed still carries the fallback's "<ST> avg" area name, so it is
  // labeled statewide; one for a matched county keeps the county label.
  it("reads a stored provenance written before the flag existed from its detail", () => {
    const statewide = buildAssumptionEntries(
      { monthlyRent: { source: "hud-fmr", detail: "VA avg", fetchedAt: "2026" } },
      false,
    );
    expect(statewide[0]).toMatchObject({
      source: "HUD rent benchmark (statewide average)",
      short: "HUD statewide",
    });
    const county = buildAssumptionEntries(
      { monthlyRent: { source: "hud-fmr", detail: "Roanoke County", fetchedAt: "2026" } },
      false,
    );
    expect(county[0]).toMatchObject({
      source: "HUD rent benchmark (county)",
      short: "HUD FMR",
    });
  });

  it("an overridden statewide fill is the user's entry, not a HUD figure", () => {
    const e = buildAssumptionEntries(
      { monthlyRent: { source: "hud-fmr", stateAverage: true, overridden: true } },
      false,
    );
    expect(e[0]).toMatchObject({ source: "You entered it", manual: true });
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
      false,
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
      false,
    );
    expect(e[0]).toMatchObject({ freshness: "HUD 2026" });
    expect(e[1]).toMatchObject({ freshness: "As of 2026-06-25" });
  });

  it("flips Expenses to the user once any expense field is dirty", () => {
    const e = buildAssumptionEntries(fullEnrichment, true);
    expect(e[3]).toMatchObject({
      label: "Expenses",
      source: "You entered it",
      manual: true,
    });
  });
});
