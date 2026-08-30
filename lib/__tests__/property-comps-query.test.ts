import { describe, expect, it } from "vitest";
import {
  bindPropertyCompsPayload,
  propertyCompsQueryFingerprint,
  propertyCompsRequestStillOwnsSubject,
  propertyCompsUnderwritingFingerprint,
  readBoundPropertyCompsPayload,
  savedAnalysisPropertyCompsFingerprint,
} from "@/lib/property-comps-query";
import type { PropertyEnrichment } from "@/lib/property-enrichment/rentcast";

const enrichment: PropertyEnrichment = {
  facts: null,
  valueEstimate: 300_000,
  valueRange: null,
  saleComps: [],
  rentEstimate: 2_500,
  rentRange: null,
  rentComps: [],
  fetchedAt: "2026-08-30T12:00:00.000Z",
};

const base = {
  address: "123 Main St, Philadelphia, PA",
  propertyType: "single-family" as const,
  bedrooms: 3,
  bathrooms: 2,
  squareFootage: 1_500,
};

describe("property comps query identity", () => {
  it.each([
    ["address", { address: "125 Main St, Philadelphia, PA" }],
    ["provider property type", { propertyType: "multi-family" as const }],
    ["bedrooms", { bedrooms: 4 }],
    ["bathrooms", { bathrooms: 2.5 }],
    ["square footage", { squareFootage: 1_700 }],
    ["listing lookup", { includeListing: true }],
  ])("changes when %s changes", (_label, change) => {
    expect(propertyCompsQueryFingerprint({ ...base, ...change })).not.toBe(
      propertyCompsQueryFingerprint(base),
    );
  });

  it("normalizes the saved database profile to the same fingerprint", () => {
    expect(
      savedAnalysisPropertyCompsFingerprint({
        address: "  123 MAIN ST, Philadelphia, PA ",
        property_type: "single-family",
        bedrooms: "3",
        bathrooms: 2,
        sqft: "1500",
      }),
    ).toBe(propertyCompsUnderwritingFingerprint(base));
  });

  it("only reads a saved payload when its durable query binding is exact", () => {
    const fingerprint = propertyCompsUnderwritingFingerprint(base);
    const bound = bindPropertyCompsPayload(enrichment, fingerprint);

    expect(readBoundPropertyCompsPayload(bound, fingerprint)).toEqual(enrichment);
    expect(
      readBoundPropertyCompsPayload(
        bound,
        propertyCompsUnderwritingFingerprint({ ...base, bedrooms: 4 }),
      ),
    ).toBeNull();
    expect(readBoundPropertyCompsPayload(enrichment, fingerprint)).toBeNull();
  });

  it("drops a deferred same-address pull after beds or type changes", () => {
    const requestedFingerprint = propertyCompsUnderwritingFingerprint(base);
    const requestedDealId = "22222222-2222-4222-8222-222222222222";

    for (const currentFingerprint of [
      propertyCompsUnderwritingFingerprint({ ...base, bedrooms: 4 }),
      propertyCompsUnderwritingFingerprint({
        ...base,
        propertyType: "multi-family",
      }),
    ]) {
      expect(
        propertyCompsRequestStillOwnsSubject({
          requestedFingerprint,
          currentFingerprint,
          requestedDealId,
          currentDealId: requestedDealId,
        }),
      ).toBe(false);
    }
  });

  it("keeps listing mode in provider cache identity but out of saved-deal identity", () => {
    expect(
      propertyCompsQueryFingerprint({ ...base, includeListing: true }),
    ).not.toBe(propertyCompsQueryFingerprint(base));
    expect(
      propertyCompsUnderwritingFingerprint({ ...base }),
    ).toBe(propertyCompsUnderwritingFingerprint(base));
  });

  it("invalidates when analyzer property type changes even if the provider alias is the same", () => {
    expect(
      propertyCompsUnderwritingFingerprint({
        ...base,
        propertyType: "owner-occupant",
      }),
    ).not.toBe(propertyCompsUnderwritingFingerprint(base));
  });
});
