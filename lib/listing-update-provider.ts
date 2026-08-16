/**
 * External listing-update boundary for Saved Deal Watch.
 *
 * This file intentionally contains contracts only: no provider SDK, HTTP
 * client, credentials, scraping, or scheduled work. A future server-only
 * adapter can implement `ListingUpdateProvider` for an authorized property
 * data source while the watch evaluator remains provider-agnostic and pure.
 *
 * Provider responses are untrusted input. Adapters should map their payloads
 * through `normalizeListingUpdateObservation` before handing them to storage
 * or underwriting code. A missing price is represented as null; it must never
 * be coerced to $0 or treated as a price drop.
 */

export const LISTING_UPDATE_CONTRACT_VERSION = "1.0" as const;

export type ListingAvailability =
  | "active"
  | "pending"
  | "under_contract"
  | "sold"
  | "off_market"
  | "unknown";

/** The minimum identity an authorized provider adapter needs per saved deal. */
export interface WatchedListingReference {
  dealId: string;
  /** Stable provider identifier, preferred over matching an address repeatedly. */
  providerListingId?: string | null;
  /** Canonical listing URL supplied by the user/provider, never scraped here. */
  listingUrl?: string | null;
  /** Fallback lookup input when the provider supports address search. */
  address?: string | null;
}

/** Provider-neutral observation persisted by the future integration layer. */
export interface ListingUpdateObservation {
  contractVersion: typeof LISTING_UPDATE_CONTRACT_VERSION;
  dealId: string;
  providerId: string;
  providerListingId: string | null;
  observedAt: string;
  /** Current asking/list price in whole or fractional USD; null = unavailable. */
  askingPrice: number | null;
  availability: ListingAvailability;
  sourceUrl: string | null;
}

export interface ListingUpdateRequest {
  listings: readonly WatchedListingReference[];
  /** Opaque provider cursor. The orchestrator owns and persists it. */
  cursor?: string | null;
  /** Optional ISO watermark for providers that support incremental updates. */
  changedSince?: string | null;
  signal?: AbortSignal;
}

export interface ListingUpdateBatch {
  observations: readonly ListingUpdateObservation[];
  nextCursor: string | null;
  /** ISO timestamp for operational diagnostics, not an underwriting input. */
  fetchedAt: string;
}

/**
 * Implementations belong in a server-only integration module. They must use
 * an official/licensed API and return observations; they must not mutate saved
 * deals, send notifications, or decide whether a change is meaningful.
 */
export interface ListingUpdateProvider {
  readonly id: string;
  fetchUpdates(request: ListingUpdateRequest): Promise<ListingUpdateBatch>;
}

const AVAILABILITIES = new Set<ListingAvailability>([
  "active",
  "pending",
  "under_contract",
  "sold",
  "off_market",
  "unknown",
]);

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isIsoTimestamp(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

/**
 * Runtime guard for provider payloads. It rejects impossible or ambiguous
 * values instead of guessing. In particular, zero/negative/non-finite prices
 * become null so they cannot manufacture a threshold crossing.
 */
export function normalizeListingUpdateObservation(
  input: unknown
): ListingUpdateObservation | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const row = input as Record<string, unknown>;

  const dealId = stringOrNull(row.dealId);
  const providerId = stringOrNull(row.providerId);
  const observedAt = stringOrNull(row.observedAt);
  if (!dealId || !providerId || !observedAt || !isIsoTimestamp(observedAt)) return null;

  const rawAvailability = stringOrNull(row.availability);
  const availability =
    rawAvailability && AVAILABILITIES.has(rawAvailability as ListingAvailability)
      ? (rawAvailability as ListingAvailability)
      : "unknown";

  const rawPrice = row.askingPrice;
  const askingPrice =
    typeof rawPrice === "number" && Number.isFinite(rawPrice) && rawPrice > 0
      ? rawPrice
      : null;

  return {
    contractVersion: LISTING_UPDATE_CONTRACT_VERSION,
    dealId,
    providerId,
    providerListingId: stringOrNull(row.providerListingId),
    observedAt: new Date(observedAt).toISOString(),
    askingPrice,
    availability,
    sourceUrl: stringOrNull(row.sourceUrl),
  };
}
