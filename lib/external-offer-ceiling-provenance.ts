import {
  normalizeOfferCeilingTargetSource,
  type OfferCeilingTargetSource,
} from "@/lib/offer-ceiling-contract";

/**
 * A browser or owner-writable saved JSON object can choose targets, but it
 * cannot prove those targets came from a server-owned Buy Box. External
 * artifacts therefore use the honest generic provenance label unless a future
 * boundary independently resolves and binds a matching Buy Box record.
 */
export function normalizeExternalOfferCeilingTargetSource(
  value: unknown,
): OfferCeilingTargetSource | null {
  const normalized = normalizeOfferCeilingTargetSource(value);
  return normalized === "buy-box" ? "selected-targets" : normalized;
}
