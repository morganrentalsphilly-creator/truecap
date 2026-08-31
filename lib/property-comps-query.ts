import type { PropertyEnrichment } from "@/lib/property-enrichment/rentcast";

export type PropertyCompsPropertyType =
  | "single-family"
  | "multi-family"
  | "owner-occupant";

export type PropertyCompsQuerySubject = {
  address: string | null | undefined;
  propertyType?: PropertyCompsPropertyType | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareFootage?: number | null;
  includeListing?: boolean;
};

export type SavedAnalysisPropertyCompsSubject = {
  address?: unknown;
  property_type?: unknown;
  bedrooms?: unknown;
  bathrooms?: unknown;
  sqft?: unknown;
};

const DEAL_COMPS_QUERY_BINDING_FIELD = "_truecapPropertyCompsQueryV1";

export function normalizePropertyCompsAddress(address: unknown): string {
  return typeof address === "string"
    ? address.trim().toLowerCase().replace(/\s+/g, " ")
    : "";
}

function normalizedNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** The provider receives this effective type rather than the analyzer enum. */
export function propertyCompsProviderType(
  value: unknown,
): "Multi-Family" | "Single Family" | null {
  if (value === "multi-family") return "Multi-Family";
  if (value === "single-family" || value === "owner-occupant") {
    return "Single Family";
  }
  return null;
}

/**
 * Stable, versioned identity for every input that shapes the RentCast request.
 * It is intentionally also the global cache key: an address-only cache can
 * return a single-family/3-bed comp set for a later multi-family/6-bed query.
 */
export function propertyCompsQueryFingerprint(
  subject: PropertyCompsQuerySubject,
): string {
  return JSON.stringify([
    "provider-v1",
    normalizePropertyCompsAddress(subject.address),
    subject.propertyType ?? null,
    propertyCompsProviderType(subject.propertyType),
    normalizedNumber(subject.bedrooms),
    normalizedNumber(subject.bathrooms),
    normalizedNumber(subject.squareFootage),
    subject.includeListing === true,
  ]);
}

/** Durable saved-deal identity. Listing enrichment makes one additional
 * provider call but does not change which underwriting subject the comps
 * belong to, so it is deliberately excluded here. */
export function propertyCompsUnderwritingFingerprint(
  subject: Omit<PropertyCompsQuerySubject, "includeListing">,
): string {
  return JSON.stringify([
    "underwriting-v1",
    normalizePropertyCompsAddress(subject.address),
    subject.propertyType ?? null,
    propertyCompsProviderType(subject.propertyType),
    normalizedNumber(subject.bedrooms),
    normalizedNumber(subject.bathrooms),
    normalizedNumber(subject.squareFootage),
  ]);
}

export function savedAnalysisPropertyCompsFingerprint(
  row: SavedAnalysisPropertyCompsSubject,
): string {
  const propertyType =
    row.property_type === "single-family" ||
    row.property_type === "multi-family" ||
    row.property_type === "owner-occupant"
      ? row.property_type
      : null;
  return propertyCompsUnderwritingFingerprint({
    address: typeof row.address === "string" ? row.address : null,
    propertyType,
    bedrooms: normalizedNumber(row.bedrooms),
    bathrooms: normalizedNumber(row.bathrooms),
    squareFootage: normalizedNumber(row.sqft),
  });
}

/** Store the query identity beside the provider payload without changing the
 * existing deal_comps schema or the public PropertyEnrichment shape. */
export function bindPropertyCompsPayload(
  enrichment: PropertyEnrichment,
  queryFingerprint: string,
): PropertyEnrichment {
  return {
    ...enrichment,
    [DEAL_COMPS_QUERY_BINDING_FIELD]: queryFingerprint,
  } as PropertyEnrichment;
}

/** Fail closed for legacy/unbound rows. Without the original query inputs,
 * there is no safe way to prove that a saved set still matches underwriting. */
export function readBoundPropertyCompsPayload(
  payload: unknown,
  expectedFingerprint: string,
): PropertyEnrichment | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const stored = payload as Record<string, unknown>;
  if (stored[DEAL_COMPS_QUERY_BINDING_FIELD] !== expectedFingerprint) {
    return null;
  }
  const enrichment = { ...stored };
  delete enrichment[DEAL_COMPS_QUERY_BINDING_FIELD];
  return enrichment as PropertyEnrichment;
}

export function propertyCompsRequestStillOwnsSubject(input: {
  requestedFingerprint: string;
  currentFingerprint: string;
  requestedDealId: string | null;
  currentDealId: string | null;
}): boolean {
  return (
    input.requestedFingerprint === input.currentFingerprint &&
    input.requestedDealId === input.currentDealId
  );
}
