/**
 * RentCast property-data enrichment (https://rentcast.io/api).
 *
 * Pulls three things for an address and assembles them into one payload:
 *   1. Property record  (GET /properties)            → facts
 *   2. Value AVM        (GET /avm/value)             → value estimate + SALE comps
 *   3. Long-term rent   (GET /avm/rent/long-term)    → rent estimate + RENTAL comps
 *
 * Dormant without RENTCAST_API_KEY (returns null), mirroring the optional
 * FRED/HUD keys in enrich-property.ts. All fetches are timeout-wrapped and
 * null-safe — one failing lookup never sinks the others. Parsing is
 * defensive: unknown/renamed fields degrade to null rather than throwing.
 */

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

/** Parse a /listings/sale response (array of active/recent sale listings).
 *  Prefer an "Active" listing; else the most recently listed. Returns null
 *  unless a usable list price is found. */
export function parseSaleListing(raw: unknown): SaleListing | null {
  const arr = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? [raw] : [];
  const items = arr.filter((x): x is Record<string, unknown> => !!x && typeof x === "object");
  if (items.length === 0) return null;
  const active = items.find((o) => String(o.status ?? "").toLowerCase() === "active");
  const pick =
    active ??
    [...items].sort((a, b) => String(b.listedDate ?? "").localeCompare(String(a.listedDate ?? "")))[0];
  if (!pick) return null;
  const listPrice = num(pick.price);
  if (listPrice == null) return null;
  return {
    listPrice,
    status: str(pick.status),
    bedrooms: num(pick.bedrooms),
    bathrooms: num(pick.bathrooms),
    squareFootage: num(pick.squareFootage),
  };
}

async function fetchJson(path: string, apiKey: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { accept: "application/json", "X-Api-Key": apiKey },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[rentcast] ${path} → HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`[rentcast] ${path} failed:`, (err as Error)?.message ?? err);
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
 * Fetch + assemble enrichment for an address. Returns null when no API key
 * is configured (feature dormant) or every lookup failed. Each of the three
 * lookups is independent and null-safe.
 */
/**
 * RentCast wants "Street, City, State, Zip"; Google Places appends a country
 * ("…, USA"), which can break the address match — strip it.
 */
function sanitizeAddress(address: string): string {
  return address.replace(/,?\s*(united states|usa|us)\s*$/i, "").trim();
}

export async function fetchRentCastEnrichment(
  q: RentCastQuery,
  opts?: { includeListing?: boolean }
): Promise<PropertyEnrichment | null> {
  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) return null;
  const address = sanitizeAddress(q.address ?? "");
  if (!address) return null;

  // Two AVM calls (each carries the subject `facts`, so we skip a /properties
  // call). When the caller needs the REAL asking price (e.g. a pasted listing
  // link), add a third call to /listings/sale — the MLS-sourced for-sale
  // listing — so we can fill the actual list price instead of the AVM estimate.
  const qs = buildQuery({ ...q, address });
  const [valueRaw, rentRaw, listingRaw] = await Promise.all([
    fetchJson(`/avm/value?${qs}`, apiKey),
    fetchJson(`/avm/rent/long-term?${qs}`, apiKey),
    opts?.includeListing ? fetchJson(`/listings/sale?${qs}`, apiKey) : Promise.resolve(null),
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

  if (!facts && !value && !rent && !listing) return null;

  return {
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
  };
}

/**
 * Rent-only lookup — fetches JUST /avm/rent/long-term (one call, vs two for the
 * full enrichment). Used by the rent-alert cron, which only needs the current
 * market rent and is cost-sensitive (one call per saved deal it re-prices).
 * Returns null when dormant (no key), the address is blank/unmatched, or
 * RentCast has no rent figure.
 */
export async function fetchRentCastRentEstimate(q: RentCastQuery): Promise<number | null> {
  const apiKey = process.env.RENTCAST_API_KEY;
  if (!apiKey) return null;
  const address = sanitizeAddress(q.address ?? "");
  if (!address) return null;
  const raw = await fetchJson(`/avm/rent/long-term?${buildQuery({ ...q, address })}`, apiKey);
  return parseAvm(raw, "rent")?.estimate ?? null;
}
