import type { PropertyEnrichment } from "@/lib/property-enrichment/rentcast";

export type ReportComp = {
  address: string;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFootage: number | null;
  distanceMiles: number | null;
  /** Price (or rent) per square foot — the normalizer every comp discussion
   *  runs on. Derived HERE rather than in the PDF layer, which must never
   *  compute a financial figure. Kept UNROUNDED: a sale comp displays whole
   *  dollars ($107) but a rent comp needs cents ($1.45), and rounding at the
   *  source would collapse every rent comp to "$1". Null when either input is
   *  missing or zero. */
  pricePerSqft: number | null;
};

/** Structurally matches ReportData["comps"] in lib/pdf-generator.ts. */
export type ReportComps = {
  valueEstimate: number | null;
  valueRange: { low: number | null; high: number | null } | null;
  rentEstimate: number | null;
  rentRange: { low: number | null; high: number | null } | null;
  saleComps: ReportComp[];
  rentComps: ReportComp[];
  /** When RentCast returned this data. A lender reading comparable sales
   *  needs to know whether they are a week or a year old. */
  fetchedAt: string | null;
};

/**
 * Map a stored RentCast enrichment into the PDF report's comps shape. Drops
 * the fields the report doesn't render (facts, correlation), and derives
 * $/sqft per comp. Returns null when there is nothing worth showing, so the
 * report's comps page self-hides rather than printing an empty section.
 */
export function enrichmentToReportComps(
  e: PropertyEnrichment | null | undefined
): ReportComps | null {
  if (!e) return null;
  const sale = e.saleComps ?? [];
  const rent = e.rentComps ?? [];
  if (sale.length === 0 && rent.length === 0 && e.valueEstimate == null && e.rentEstimate == null) {
    return null;
  }
  const pick = (c: Omit<ReportComp, "pricePerSqft">): ReportComp => ({
    address: c.address,
    price: c.price,
    bedrooms: c.bedrooms,
    bathrooms: c.bathrooms,
    squareFootage: c.squareFootage,
    distanceMiles: c.distanceMiles,
    pricePerSqft:
      c.price != null && c.squareFootage != null && c.squareFootage > 0
        ? c.price / c.squareFootage
        : null,
  });
  return {
    valueEstimate: e.valueEstimate,
    valueRange: e.valueRange,
    rentEstimate: e.rentEstimate,
    rentRange: e.rentRange,
    saleComps: sale.map(pick),
    rentComps: rent.map(pick),
    fetchedAt: e.fetchedAt ?? null,
  };
}
