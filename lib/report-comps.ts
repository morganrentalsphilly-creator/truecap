import type { PropertyEnrichment } from "@/lib/property-enrichment/rentcast";

type ReportComp = {
  address: string;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFootage: number | null;
  distanceMiles: number | null;
};

/** Structurally matches ReportData["comps"] in lib/pdf-generator.ts. */
export type ReportComps = {
  valueEstimate: number | null;
  valueRange: { low: number | null; high: number | null } | null;
  rentEstimate: number | null;
  rentRange: { low: number | null; high: number | null } | null;
  saleComps: ReportComp[];
  rentComps: ReportComp[];
};

/**
 * Map a stored RentCast enrichment into the PDF report's comps shape. Drops
 * the fields the report doesn't render (facts, fetchedAt, correlation). Returns
 * null when there is nothing worth showing, so the report's comps page
 * self-hides rather than printing an empty section.
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
  const pick = (c: ReportComp): ReportComp => ({
    address: c.address,
    price: c.price,
    bedrooms: c.bedrooms,
    bathrooms: c.bathrooms,
    squareFootage: c.squareFootage,
    distanceMiles: c.distanceMiles,
  });
  return {
    valueEstimate: e.valueEstimate,
    valueRange: e.valueRange,
    rentEstimate: e.rentEstimate,
    rentRange: e.rentRange,
    saleComps: sale.map(pick),
    rentComps: rent.map(pick),
  };
}
