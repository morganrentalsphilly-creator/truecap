/**
 * RentCast property-data enrichment (https://rentcast.io/api).
 *
 * Pulls three things for an address and assembles them into one payload:
 *   1. Property record  (GET /properties)            → facts
 *   2. Value AVM        (GET /avm/value)             → value estimate + SALE comps
 *   3. Long-term rent   (GET /avm/rent/long-term)    → rent estimate + RENTAL comps
 *
 * Dormant without RENTCAST_API_KEY (`not_configured`), mirroring the optional
 * FRED/HUD keys in enrich-property.ts. All fetches are timeout-wrapped and
 * null-safe — one failing lookup never sinks the others. Parsing is
 * defensive: unknown/renamed fields degrade to null rather than throwing.
 *
 * BUDGET. RentCast's free plan is 50 requests per billing period and every
 * request past that is billed. `fetchJson` below is the ONLY code that reaches
 * api.rentcast.io, and it refuses to run without a `RentCastReservation` from
 * lib/property-enrichment/rentcast-budget.ts. Each exported fetcher reserves
 * its exact request count up front (2 or 3 for an enrichment, 1 for a rent
 * estimate) and returns `capped` instead of sending when the pool is empty.
 * Nothing is refunded after a request leaves: timeouts, non-200s and empty
 * 200s all stay counted (over-counting is free, under-counting costs money).
 */

import {
  consumeReservedRequest,
  reserveRentCastRequests,
  type RentCastReservation,
} from "@/lib/property-enrichment/rentcast-budget";

export type EnrichmentComp = {
  address: string;
  /** Sale price (sale comps) or monthly rent (rent comps). */
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFootage: number | null;
  distanceMiles: number | null;
  /** RentCast similarity score 0–1, when present. */
  correlation: number | null;
};

export type PropertyFacts = {
  bedrooms: number | null;
  bathrooms: number | null;
  squareFootage: number | null;
  yearBuilt: number | null;
  lotSize: number | null;
  propertyType: string | null;
  lastSalePrice: number | null;
  lastSaleDate: string | null;
};

export type PropertyEnrichment = {
  facts: PropertyFacts | null;
  valueEstimate: number | null;
  valueRange: { low: number | null; high: number | null } | null;
  saleComps: EnrichmentComp[];
  rentEstimate: number | null;
  rentRange: { low: number | null; high: number | null } | null;
  rentComps: EnrichmentComp[];
  /** Real for-sale list price (the asking price) when the address is actively
   *  listed, from RentCast's MLS-sourced /listings/sale — only fetched when
   *  `includeListing` is requested. Null when not listed or not requested. */
  listPrice?: number | null;
  /** Listing status (e.g. "Active") accompanying listPrice. */
  listingStatus?: string | null;
  /** True when the for-sale listing WAS looked up (includeListing), regardless
   *  of whether one was found — so a confirmed "not listed" result caches and
   *  doesn't force a fresh 3-call fetch on every repeat lookup. */
  listingChecked?: boolean;
  fetchedAt: string;
};

export type RentCastQuery = {
  address: string;
  propertyType?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareFootage?: number | null;
};

const BASE_URL = "https://api.rentcast.io/v1";
const REMOTE_TIMEOUT_MS = 6_000;
const MAX_COMPS = 6;

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** Map RentCast property-type strings to our form's union (best-effort). */
export function mapRentCastPropertyType(raw: unknown): string | null {
  const t = str(raw)?.toLowerCase();
  if (!t) return null;
  if (t.includes("single")) return "single-family";
  if (t.includes("multi") || t.includes("apartment") || t.includes("duplex") || t.includes("triplex") || t.includes("quadplex")) {
    return "multi-family";
  }
  if (t.includes("condo") || t.includes("townhouse") || t.includes("townhome")) return "single-family";
  return null;
}

/** Parse a /properties record (RentCast returns an array or single object). */
export function parsePropertyRecord(raw: unknown): PropertyFacts | null {
  const rec = Array.isArray(raw) ? raw[0] : raw;
  if (!rec || typeof rec !== "object") return null;
  const o = rec as Record<string, unknown>;
  // Last sale can appear as flat fields or a history object — try both.
  const history = (o.saleHistory ?? o.history) as Record<string, unknown> | undefined;
  let lastSalePrice = num(o.lastSalePrice);
  let lastSaleDate = str(o.lastSaleDate);
  if ((lastSalePrice == null || lastSaleDate == null) && history && typeof history === "object") {
    const entries = Object.values(history).filter((e): e is Record<string, unknown> => !!e && typeof e === "object");
    const latest = entries.sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")))[0];
    if (latest) {
      lastSalePrice = lastSalePrice ?? num(latest.price);
      lastSaleDate = lastSaleDate ?? str(latest.date);
    }
  }
  const facts: PropertyFacts = {
    bedrooms: num(o.bedrooms),
    bathrooms: num(o.bathrooms),
    squareFootage: num(o.squareFootage),
    yearBuilt: num(o.yearBuilt),
    lotSize: num(o.lotSize),
    propertyType: str(o.propertyType),
    lastSalePrice,
    lastSaleDate,
  };
  const hasAny = Object.values(facts).some((v) => v != null);
  return hasAny ? facts : null;
}

/** The AVM responses carry the subject property's facts in `subjectProperty`
 *  (same field shape as a property record), so we parse facts from there
 *  instead of a separate /properties call. */
export function parseSubjectProperty(avmRaw: unknown): PropertyFacts | null {
  if (!avmRaw || typeof avmRaw !== "object") return null;
  return parsePropertyRecord((avmRaw as Record<string, unknown>).subjectProperty);
}

function parseComp(raw: unknown): EnrichmentComp | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const address = str(o.formattedAddress) ?? str(o.addressLine1) ?? str(o.address);
  if (!address) return null;
  return {
    address,
    price: num(o.price),
    bedrooms: num(o.bedrooms),
    bathrooms: num(o.bathrooms),
    squareFootage: num(o.squareFootage),
    distanceMiles: num(o.distance),
    correlation: num(o.correlation),
  };
}

/** Parse an AVM response (/avm/value or /avm/rent/long-term). The headline
 *  number is `price` for value and `rent` for rent. */
export function parseAvm(
  raw: unknown,
  kind: "value" | "rent"
): { estimate: number | null; range: { low: number | null; high: number | null }; comps: EnrichmentComp[] } | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const estimate = kind === "value" ? num(o.price) : num(o.rent);
  const low = kind === "value" ? num(o.priceRangeLow) : num(o.rentRangeLow);
  const high = kind === "value" ? num(o.priceRangeHigh) : num(o.rentRangeHigh);
  const compsRaw = Array.isArray(o.comparables) ? o.comparables : [];
  const comps = compsRaw
    .map(parseComp)
    .filter((c): c is EnrichmentComp => c !== null)
    .slice(0, MAX_COMPS);
  if (estimate == null && comps.length === 0) return null;
  return { estimate, range: { low, high }, comps };
}

export type SaleListing = {
  listPrice: number | null;
  status: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFootage: number | null;
};

/** Parse a /listings/sale response (array of sale listings). Returns ONLY an
 *  ACTIVE listing's price — a sold/inactive listing's old price must never be
 *  surfaced as the live "asking price" (callers fall back to the AVM estimate
 *  when this is null). */
export function parseSaleListing(raw: unknown): SaleListing | null {
  const arr = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? [raw] : [];
  const items = arr.filter((x): x is Record<string, unknown> => !!x && typeof x === "object");
  if (items.length === 0) return null;
  const active = items.find((o) => String(o.status ?? "").toLowerCase() === "active");
  if (!active) return null;
  const listPrice = num(active.price);
  // Provider zeroes, negative sentinels, and whitespace-coerced zeroes mean
  // "unavailable", never a live asking price. Fail closed so callers fall
  // back to an explicitly labeled estimate or ask the user for the price.
  if (listPrice == null || listPrice <= 0) return null;
  return {
    listPrice,
    status: str(active.status),
    bedrooms: num(active.bedrooms),
    bathrooms: num(active.bathrooms),
    squareFootage: num(active.squareFootage),
  };
}

/**
 * The one RentCast HTTP call. `reservation` is proof the request was reserved
 * against the budget; consuming it past its count throws BEFORE the fetch.
 */
async function fetchJson(
  path: string,
  apiKey: string,
  reservation: RentCastReservation
): Promise<unknown | null> {
  consumeReservedRequest(reservation);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);
  // `path` contains the URL-encoded subject address. Logs must retain only
  // the endpoint so provider failures cannot leak a prospect's property.
  const endpoint = path.split("?", 1)[0] || "/unknown";
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { accept: "application/json", "X-Api-Key": apiKey },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[rentcast] ${endpoint} → HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`[rentcast] ${endpoint} failed:`, (err as Error)?.message ?? err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function buildQuery(q: RentCastQuery): string {
  const p = new URLSearchParams();
  p.set("address", q.address);
  if (q.propertyType) p.set("propertyType", q.propertyType);
  if (q.bedrooms != null) p.set("bedrooms", String(q.bedrooms));
  if (q.bathrooms != null) p.set("bathrooms", String(q.bathrooms));
  if (q.squareFootage != null) p.set("squareFootage", String(q.squareFootage));
  return p.toString();
}

/**
 * RentCast wants "Street, City, State, Zip"; Google Places appends a country
 * ("…, USA"), which can break the address match — strip it.
 */
function sanitizeAddress(address: string): string {
  return address.replace(/,?\s*(united states|usa|us)\s*$/i, "").trim();
}

/** Why a RentCast fetch returned no data. `capped` means the request budget
 *  is exhausted (or unreadable) and NO request was sent — callers can tell
 *  that apart from `not_found` (requests sent, nothing came back). */
export type RentCastCapped = {
  status: "capped";
  reason: "cap" | "unavailable";
  /** ISO instant at which the pool reopens. */
  resumesAt: string;
};

export type RentCastEnrichmentResult =
  | { status: "ok"; enrichment: PropertyEnrichment }
  | RentCastCapped
  | { status: "not_found" }
  | { status: "not_configured" }
  | { status: "error" };

/** Requests an enrichment sends: /avm/value + /avm/rent/long-term, plus
 *  /listings/sale when the caller wants the real asking price. */
export function enrichmentRequestCount(opts?: { includeListing?: boolean }): number {
  return opts?.includeListing ? 3 : 2;
}

/**
 * Fetch + assemble enrichment for an address. `not_configured` without an API
 * key (feature dormant), `capped` when the request budget refuses (nothing
 * sent), `not_found` when every lookup came back empty. Each lookup is
 * independent and null-safe.
 */
export async function fetchRentCastEnrichment(
  q: RentCastQuery,
  opts?: { includeListing?: boolean }
): Promise<RentCastEnrichmentResult> {
  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) return { status: "not_configured" };
  const address = sanitizeAddress(q.address ?? "");
  if (!address) return { status: "not_found" };

  // Reserve the exact request count BEFORE anything leaves. This is the
  // authoritative reservation — callers hold no budget of their own.
  const reserved = await reserveRentCastRequests(enrichmentRequestCount(opts), {
    lookupType: "property_comps",
  });
  if (!reserved.ok) {
    return { status: "capped", reason: reserved.reason, resumesAt: reserved.resumesAt };
  }

  try {
    return await fetchReservedEnrichment(q, address, apiKey, reserved.reservation, opts);
  } catch (err) {
    console.warn("[rentcast] enrichment failed:", (err as Error)?.message ?? err);
    return { status: "error" };
  }
}

async function fetchReservedEnrichment(
  q: RentCastQuery,
  address: string,
  apiKey: string,
  reservation: RentCastReservation,
  opts?: { includeListing?: boolean }
): Promise<RentCastEnrichmentResult> {
  // Two AVM calls (each carries the subject `facts`, so we skip a /properties
  // call). When the caller needs the REAL asking price (e.g. a pasted listing
  // link), add a third call to /listings/sale — the MLS-sourced for-sale
  // listing — so we can fill the actual list price instead of the AVM estimate.
  const qs = buildQuery({ ...q, address });
  const [valueRaw, rentRaw, listingRaw] = await Promise.all([
    fetchJson(`/avm/value?${qs}`, apiKey, reservation),
    fetchJson(`/avm/rent/long-term?${qs}`, apiKey, reservation),
    opts?.includeListing
      ? fetchJson(`/listings/sale?${qs}`, apiKey, reservation)
      : Promise.resolve(null),
  ]);

  const value = parseAvm(valueRaw, "value");
  const rent = parseAvm(rentRaw, "rent");
  const listing = listingRaw ? parseSaleListing(listingRaw) : null;
  let facts = parseSubjectProperty(valueRaw) ?? parseSubjectProperty(rentRaw);
  // Backfill missing facts from the listing (it carries beds/baths/sqft too).
  if (listing) {
    const base: PropertyFacts =
      facts ?? {
        bedrooms: null,
        bathrooms: null,
        squareFootage: null,
        yearBuilt: null,
        lotSize: null,
        propertyType: null,
        lastSalePrice: null,
        lastSaleDate: null,
      };
    facts = {
      ...base,
      bedrooms: base.bedrooms ?? listing.bedrooms,
      bathrooms: base.bathrooms ?? listing.bathrooms,
      squareFootage: base.squareFootage ?? listing.squareFootage,
    };
  }

  if (!facts && !value && !rent && !listing) return { status: "not_found" };

  return {
    status: "ok",
    enrichment: {
      facts,
      valueEstimate: value?.estimate ?? null,
      valueRange: value?.range ?? null,
      saleComps: value?.comps ?? [],
      rentEstimate: rent?.estimate ?? null,
      rentRange: rent?.range ?? null,
      rentComps: rent?.comps ?? [],
      listPrice: listing?.listPrice ?? null,
      listingStatus: listing?.status ?? null,
      listingChecked: opts?.includeListing === true,
      fetchedAt: new Date().toISOString(),
    },
  };
}

export type RentCastRentEstimateResult =
  | { status: "ok"; rent: number }
  | RentCastCapped
  | { status: "not_found" }
  | { status: "not_configured" }
  | { status: "error" };

/**
 * Rent-only lookup — fetches JUST /avm/rent/long-term (one request, vs two for
 * the full enrichment). Used by the rent-alert cron, which only needs the
 * current market rent and is cost-sensitive (one request per saved deal it
 * re-prices). Reserves that one request first; `capped` means nothing was
 * sent. `not_found` when the address is blank/unmatched or RentCast has no
 * positive rent figure — the request was still sent and stays counted.
 */
export async function fetchRentCastRentEstimate(q: RentCastQuery): Promise<RentCastRentEstimateResult> {
  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) return { status: "not_configured" };
  const address = sanitizeAddress(q.address ?? "");
  if (!address) return { status: "not_found" };
  const reserved = await reserveRentCastRequests(1, { lookupType: "rent_alert" });
  if (!reserved.ok) {
    return { status: "capped", reason: reserved.reason, resumesAt: reserved.resumesAt };
  }
  try {
    const raw = await fetchJson(
      `/avm/rent/long-term?${buildQuery({ ...q, address })}`,
      apiKey,
      reserved.reservation
    );
    const rent = parseAvm(raw, "rent")?.estimate ?? null;
    if (rent == null || rent <= 0) return { status: "not_found" };
    return { status: "ok", rent };
  } catch (err) {
    console.warn("[rentcast] rent estimate failed:", (err as Error)?.message ?? err);
    return { status: "error" };
  }
}
