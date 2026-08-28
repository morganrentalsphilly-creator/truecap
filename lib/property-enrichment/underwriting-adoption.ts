import type { PropertyEnrichment } from "@/lib/property-enrichment/rentcast";

export type UnderwritingEnrichmentAdoption = {
  purchasePrice: number | null;
  purchasePriceSource: "active-listing" | null;
  monthlyRent: number | null;
  monthlyRentSource: "rentcast-estimate" | null;
};

/**
 * Select the enrichment values that may enter the underwriting form.
 *
 * An AVM is comparison evidence, not an asking/contract price, so it never
 * becomes purchasePrice. A provider-reported price may only be adopted when
 * its accompanying status explicitly says the listing is active. RentCast
 * rent remains usable as an explicitly labeled market estimate.
 */
export function selectUnderwritingEnrichment(
  enrichment: PropertyEnrichment
): UnderwritingEnrichmentAdoption {
  const listPrice = Number(enrichment.listPrice);
  const listingIsActive =
    typeof enrichment.listingStatus === "string" &&
    enrichment.listingStatus.trim().toLowerCase() === "active";
  const rentEstimate = Number(enrichment.rentEstimate);
  const mayAdoptListPrice =
    listingIsActive && Number.isFinite(listPrice) && listPrice > 0;
  return {
    purchasePrice: mayAdoptListPrice ? Math.round(listPrice) : null,
    purchasePriceSource: mayAdoptListPrice ? "active-listing" : null,
    monthlyRent:
      Number.isFinite(rentEstimate) && rentEstimate > 0
        ? Math.round(rentEstimate)
        : null,
    monthlyRentSource:
      Number.isFinite(rentEstimate) && rentEstimate > 0
        ? "rentcast-estimate"
        : null,
  };
}
