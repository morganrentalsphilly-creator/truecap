import { describe, expect, it } from "vitest";

import { selectUnderwritingEnrichment } from "@/lib/property-enrichment/underwriting-adoption";
import type { PropertyEnrichment } from "@/lib/property-enrichment/rentcast";

function enrichment(
  overrides: Partial<PropertyEnrichment> = {}
): PropertyEnrichment {
  return {
    facts: null,
    valueEstimate: 412_345,
    valueRange: null,
    saleComps: [],
    rentEstimate: 2_456.6,
    rentRange: null,
    rentComps: [],
    listPrice: null,
    fetchedAt: "2026-08-24T12:00:00.000Z",
    ...overrides,
  };
}

describe("underwriting enrichment adoption", () => {
  it("never promotes an AVM to the asking price", () => {
    expect(selectUnderwritingEnrichment(enrichment())).toEqual({
      purchasePrice: null,
      purchasePriceSource: null,
      monthlyRent: 2_457,
      monthlyRentSource: "rentcast-estimate",
    });
  });

  it("uses an active-listing price while keeping the AVM separate", () => {
    expect(
      selectUnderwritingEnrichment(
        enrichment({ listPrice: 399_900, valueEstimate: 425_000 })
      )
    ).toMatchObject({
      purchasePrice: 399_900,
      purchasePriceSource: "active-listing",
    });
  });
});
