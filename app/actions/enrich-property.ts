"use server";

/**
 * Property enrichment server action.
 *
 * After a user picks an address from Google Places, the client calls this
 * action with the parsed address components + property type + bedrooms.
 * It returns sensible defaults for the form's "Property Tax %", "Interest
 * Rate", and "Monthly Rent" fields.
 *
 * Sources:
 *   - Property tax: static state-level dataset (Tax Foundation).
 *   - Mortgage rate: FRED API (MORTGAGE30US series, cached 24h).
 *   - Monthly rent: HUD Fair Market Rent API. ZIP-level Small Area FMR
 *     when the matched county/metro is a SAFMR region (most large
 *     metros), falling back to the county/metro figure otherwise —
 *     ZIP-level is dramatically more accurate (county-wide Philadelphia
 *     vs a specific ZIP can differ 30-40%+).
 *
 * All three lookups are independent and null-safe: if any one fails
 * (missing API key, network error, no data for the county/state), the
 * other defaults still come back.
 */

import { z } from "zod";
import { getStatePropertyTaxPct } from "@/lib/property-enrichment/state-property-tax";
import { isSmallAreaEntity, pickZipSafmrRent } from "@/lib/property-enrichment/hud-safmr";

export type EnrichPropertyInput = {
  state?: string;       // e.g., "PA"
  county?: string;      // e.g., "Philadelphia" (no "County" suffix)
  zip?: string;         // e.g., "19140"
  propertyType?: "single-family" | "multi-family" | "owner-occupant";
  bedrooms?: number;    // unit[0].bedrooms — only used for HUD lookup
};

// Runtime validation for the input. All fields optional (matches the
// type), but each one is bounded so a malformed client payload can't
// flow into FRED/HUD/state-tax lookups with surprising shapes. State
// is uppercased + capped at 2 chars; county is trimmed + capped at 80;
// zip must be 5 digits; bedrooms 0-20.
const enrichInputSchema = z.object({
  state: z
    .string()
    .trim()
    .transform((s) => s.toUpperCase())
    .pipe(z.string().regex(/^[A-Z]{2}$/, "state must be a 2-letter code"))
    .optional(),
  county: z.string().trim().max(80).optional(),
  zip: z.string().trim().regex(/^\d{5}$/, "zip must be 5 digits").optional(),
  propertyType: z
    .enum(["single-family", "multi-family", "owner-occupant"])
    .optional(),
  bedrooms: z.number().int().min(0).max(20).optional(),
});

export type EnrichPropertyResult = {
  propertyTaxPct?: number;
  interestRate?: number;
  monthlyRent?: number;
  /** Per-field notes so the UI can show "(suggested)" labels. */
  meta: {
    propertyTax?: { source: "state-static"; state: string };
    mortgageRate?: { source: "fred"; asOf: string };
    rent?: {
      /** hud-safmr = ZIP-level Small Area FMR; hud-fmr = county/metro. */
      source: "hud-fmr" | "hud-safmr";
      county: string;
      year: number;
      /** Present when source is hud-safmr. */
      zip?: string;
    };
  };
};

export async function enrichPropertyAction(
  input: EnrichPropertyInput
): Promise<EnrichPropertyResult> {
  const out: EnrichPropertyResult = { meta: {} };

  // Validate input at runtime. If invalid, return empty defaults rather
  // than throwing — the form will simply not pre-fill. This action is
  // best-effort enrichment, not critical path.
  const parsed = enrichInputSchema.safeParse(input);
  if (!parsed.success) return out;
  const validated = parsed.data;

  const [tax, rate, rent] = await Promise.all([
    lookupPropertyTax(validated.state),
    fetchCurrentMortgageRate(),
    maybeFetchHudRent(validated),
  ]);

  if (tax) {
    out.propertyTaxPct = tax.rate;
    out.meta.propertyTax = { source: "state-static", state: tax.state };
  }
  if (rate) {
    out.interestRate = rate.rate;
    out.meta.mortgageRate = { source: "fred", asOf: rate.asOf };
  }
  if (rent) {
    out.monthlyRent = rent.amount;
    out.meta.rent = {
      source: rent.zip ? "hud-safmr" : "hud-fmr",
      county: rent.county,
      year: rent.year,
      ...(rent.zip ? { zip: rent.zip } : {}),
    };
  }

  return out;
}

// -------- Property tax (static) --------

function lookupPropertyTax(state?: string): { rate: number; state: string } | null {
  if (!state) return null;
  const rate = getStatePropertyTaxPct(state);
  if (rate === undefined) return null;
  return { rate, state: state.toUpperCase() };
}

// -------- Mortgage rate (FRED) --------

// Cap remote-API time per fetch. Enrichment runs synchronously inside
// the user's address-pick interaction — a 5s ceiling keeps it snappy
// and Vercel's 10s function timeout from ever firing.
const REMOTE_TIMEOUT_MS = 5_000;

/**
 * fetch wrapper that aborts after `timeoutMs`. Resolves null on ANY
 * failure — timeout, DNS / network error, ECONNRESET, TLS failure, etc.
 * Every caller already handles null (see HUD + FRED call sites below),
 * so a null return collapses to the same graceful-degradation path the
 * timeout case already used.
 *
 * Why this NEVER throws (was previously re-throwing non-Abort errors):
 *   Enrichment runs inside fire-and-forget client effects (bedrooms
 *   watcher, multi-unit rent fill, address-selected handler). Throwing
 *   here propagated unhandled promise rejections to the browser's
 *   global handler, which Sentry then captured as "Load failed" /
 *   "Failed to fetch" / "NetworkError" depending on the browser.
 *   Returning null lets the form gracefully degrade to "user types
 *   the value themselves" — same UX as a timeout — with no Sentry noise.
 */
async function fetchWithTimeout(
  input: string | URL,
  init: RequestInit = {},
  timeoutMs = REMOTE_TIMEOUT_MS
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    const name = (err as Error | undefined)?.name;
    const message = (err as Error | undefined)?.message;
    if (name === "AbortError") {
      console.warn(`[enrichProperty] Remote fetch timed out after ${timeoutMs}ms: ${input}`);
    } else {
      // Network/DNS/TLS failure. Log so we can spot persistent outages,
      // but don't rethrow — the caller has a null path.
      console.warn(`[enrichProperty] Remote fetch failed (${name ?? "Error"}): ${message ?? "unknown"} — ${input}`);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// In-memory cache: serverless instances stay warm for a while, so even
// a simple module-level cache cuts FRED traffic by 100x.
type CachedRate = { rate: number; asOf: string; fetchedAt: number };
let mortgageRateCache: CachedRate | null = null;
const RATE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

async function fetchCurrentMortgageRate(): Promise<{ rate: number; asOf: string } | null> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    console.warn("[enrichProperty] FRED_API_KEY not set in environment");
    return null;
  }

  if (mortgageRateCache && Date.now() - mortgageRateCache.fetchedAt < RATE_CACHE_TTL_MS) {
    return { rate: mortgageRateCache.rate, asOf: mortgageRateCache.asOf };
  }

  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("series_id", "MORTGAGE30US");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", "1");

  try {
    const res = await fetchWithTimeout(url.toString(), { cache: "no-store" });
    if (!res) return null; // timed out
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(
        `[enrichProperty] FRED request failed: HTTP ${res.status} ${res.statusText}. Body: ${body.slice(0, 200)}`
      );
      return null;
    }
    const json = (await res.json()) as {
      observations?: Array<{ value: string; date: string }>;
    };
    const latest = json.observations?.[0];
    if (!latest || latest.value === "." || isNaN(Number(latest.value))) {
      console.warn("[enrichProperty] FRED returned no valid observation", json);
      return null;
    }
    const rate = Number(latest.value);
    console.log(`[enrichProperty] FRED rate: ${rate}% as of ${latest.date}`);
    mortgageRateCache = { rate, asOf: latest.date, fetchedAt: Date.now() };
    return { rate, asOf: latest.date };
  } catch (err) {
    console.warn("[enrichProperty] FRED fetch threw:", err);
    return null;
  }
}

// -------- HUD Fair Market Rent --------

/**
 * Bedroom-count → HUD FMR field name. HUD returns rents for Efficiency
 * (0 BR), One-Bedroom through Four-Bedroom. We map the user's input to
 * the closest available, clamping above 4 BR to the 4-BR figure.
 */
const FMR_FIELD_BY_BEDS: Record<number, string> = {
  0: "Efficiency",
  1: "One-Bedroom",
  2: "Two-Bedroom",
  3: "Three-Bedroom",
  4: "Four-Bedroom",
};

// In-memory cache for HUD state responses. The client may call this server
// action multiple times for a single property (once per unit in a duplex,
// etc.), and we don't want to hit HUD's API every time. Keyed by state.
type CachedHudState = {
  counties: HudArea[];
  metroareas: HudArea[];
  year: number;
  fetchedAt: number;
};
type HudArea = {
  county_name?: string;
  name?: string;
  metro_name?: string;
  counties_msa?: string;
  town_name?: string;
  fips_code?: string;
  code?: string;
  /** "1" (or 1) when the entity uses ZIP-level Small Area FMRs. */
  smallarea_status?: string | number;
} & Record<string, unknown>;

const hudCache = new Map<string, CachedHudState>();
const HUD_CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

// Separate cache for per-entity SAFMR (ZIP-level) responses from
// /fmr/data/{entityid}. Keyed by entity id; one metro's response covers
// every ZIP in it, so a handful of entries serve entire metro areas.
type CachedSafmrEntity = {
  rows: unknown; // basicdata array (validated lazily by pickZipSafmrRent)
  year: number;
  fetchedAt: number;
};
const safmrCache = new Map<string, CachedSafmrEntity>();

/**
 * Fetch ZIP-level SAFMR rows for a county/metro entity. Returns null on
 * any failure or when the entity turns out not to be SAFMR-shaped —
 * callers fall back to the county-level figure they already computed.
 */
async function fetchSafmrRows(
  apiKey: string,
  entityId: string
): Promise<CachedSafmrEntity | null> {
  const cached = safmrCache.get(entityId);
  if (cached && Date.now() - cached.fetchedAt < HUD_CACHE_TTL_MS) {
    return cached;
  }

  const url = `https://www.huduser.gov/hudapi/public/fmr/data/${encodeURIComponent(entityId)}`;
  const res = await fetchWithTimeout(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.warn(
      `[enrichProperty] HUD SAFMR request failed: HTTP ${res.status}. URL=${url}. Body=${body.slice(0, 200)}`
    );
    return null;
  }
  const json = (await res.json().catch(() => null)) as {
    data?: { year?: string | number; basicdata?: unknown };
  } | null;
  if (!json?.data || !Array.isArray(json.data.basicdata)) {
    // Non-SAFMR entity (basicdata is a single object) or unexpected
    // shape — nothing to cache, caller uses the county figure.
    return null;
  }
  const value: CachedSafmrEntity = {
    rows: json.data.basicdata,
    year: Number(json.data.year ?? new Date().getFullYear()),
    fetchedAt: Date.now(),
  };
  console.log(
    `[enrichProperty] HUD SAFMR fetched entity ${entityId}: ${(json.data.basicdata as unknown[]).length} ZIP rows`
  );
  safmrCache.set(entityId, value);
  return value;
}

async function fetchHudStateData(
  apiKey: string,
  state: string
): Promise<CachedHudState | null> {
  const key = state.toUpperCase();
  const cached = hudCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < HUD_CACHE_TTL_MS) {
    return cached;
  }

  const url = `https://www.huduser.gov/hudapi/public/fmr/statedata/${encodeURIComponent(key)}`;
  const res = await fetchWithTimeout(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res) return null; // timed out
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.warn(
      `[enrichProperty] HUD request failed: HTTP ${res.status} ${res.statusText}. URL=${url}. Body=${body.slice(0, 200)}`
    );
    return null;
  }
  const json = (await res.json()) as {
    data?: {
      year?: string | number;
      counties?: HudArea[];
      metroareas?: HudArea[];
    };
  };
  const value: CachedHudState = {
    counties: json.data?.counties ?? [],
    metroareas: json.data?.metroareas ?? [],
    year: Number(json.data?.year ?? new Date().getFullYear()),
    fetchedAt: Date.now(),
  };
  console.log(
    `[enrichProperty] HUD fetched ${key}: ${value.counties.length} counties, ${value.metroareas.length} metros, year=${value.year} (cached for ${HUD_CACHE_TTL_MS / 60000}m)`
  );
  hudCache.set(key, value);
  return value;
}

async function maybeFetchHudRent(
  input: EnrichPropertyInput
): Promise<{ amount: number; county: string; year: number; zip?: string } | null> {
  const apiKey = process.env.HUD_API_KEY;
  if (!apiKey) {
    console.warn("[enrichProperty] HUD_API_KEY not set in environment");
    return null;
  }
  if (!input.state) {
    console.warn("[enrichProperty] HUD skipped: no state parsed from address");
    return null;
  }
  if (input.bedrooms === undefined || input.bedrooms === null) {
    console.log("[enrichProperty] HUD skipped: bedrooms not yet entered");
    return null;
  }

  // Clamp 5+ BR to the 4-BR figure.
  const bedsKey = Math.min(Math.max(Math.round(input.bedrooms), 0), 4);
  const fmrField = FMR_FIELD_BY_BEDS[bedsKey];

  try {
    const cached = await fetchHudStateData(apiKey, input.state);
    if (!cached) return null;
    const counties = cached.counties;
    const metroareas = cached.metroareas;
    const respYear = cached.year;

    // 1. Try a specific county / metro match first (most accurate).
    let match: HudArea | undefined;
    if (input.county) {
      const target = normalizeCounty(input.county);
      match = counties.find(
        (c) => c.county_name && normalizeCounty(c.county_name) === target
      );
      // Metros use "name" or "metro_name"; partial-match by county name so
      // "Delaware" hits "Philadelphia-Camden-Wilmington, PA-NJ-DE-MD HUD
      // Metro FMR Area" via "DE" — but we want a more deliberate match,
      // so we look across name, metro_name, county_name, and counties_msa.
      if (!match) {
        match = metroareas.find((m) => {
          const haystackText = [
            m.name,
            m.metro_name,
            m.county_name,
            m.counties_msa,
          ]
            .filter(Boolean)
            .join(" ");
          return (
            haystackText && normalizeCounty(haystackText).includes(target)
          );
        });
      }
      // As a last attempt, also try the counties array with a partial
      // match (HUD sometimes lists counties under a town record like
      // "Aston township" with county_name "Delaware County").
      if (!match) {
        match = counties.find((c) => {
          const label = (c.county_name ?? "") + " " + (c.town_name ?? "");
          return label && normalizeCounty(label).includes(target);
        });
      }
    }

    // 2. If we matched and the matched record has a real value, use it —
    //    but first try to refine to ZIP-level Small Area FMR. County or
    //    metro-wide rent can be 30-40%+ off for a specific ZIP; when the
    //    matched entity is a SAFMR region and we know the property's
    //    ZIP, one extra (cached) HUD call gets the precise number.
    if (match) {
      const v = Number(match[fmrField] ?? 0);
      const label = match.county_name ?? match.name ?? input.county ?? "";

      if (input.zip && isSmallAreaEntity(match)) {
        // Counties carry `fips_code`, metros carry `code` — either works
        // as the /fmr/data/{entityid} id.
        const entityId = match.fips_code ?? match.code;
        if (entityId) {
          const safmr = await fetchSafmrRows(apiKey, entityId);
          const zipRent = safmr
            ? pickZipSafmrRent(safmr.rows, input.zip, fmrField)
            : null;
          if (zipRent !== null) {
            console.log(
              `[enrichProperty] HUD SAFMR matched ZIP ${input.zip} in "${label}" — ${fmrField}=$${zipRent} (county-wide was $${v})`
            );
            return {
              amount: zipRent,
              county: label,
              year: safmr?.year ?? respYear,
              zip: input.zip,
            };
          }
          // ZIP not listed / fetch failed — fall through to the
          // county/metro figure below, same behavior as before.
        }
      }

      if (v > 0) {
        console.log(
          `[enrichProperty] HUD matched "${label}" — ${fmrField}=$${v}`
        );
        return { amount: v, county: label, year: respYear };
      }
      console.log(
        `[enrichProperty] HUD matched "${label}" but ${fmrField}=${v} (falling through to state-avg)`
      );
    }

    // 3. Always fall back to a state-average across counties + metros.
    const haystack = [...counties, ...metroareas];
    if (haystack.length > 0) {
      const values = haystack
        .map((c) => Number(c[fmrField] ?? 0))
        .filter((v) => v > 0);
      if (values.length > 0) {
        const avg = Math.round(
          values.reduce((a, b) => a + b, 0) / values.length
        );
        console.log(
          `[enrichProperty] HUD: no precise match for "${input.county}", returning state-avg ${fmrField}=$${avg} across ${values.length} areas`
        );
        return { amount: avg, county: `${input.state} avg`, year: respYear };
      }
    }

    console.log(
      `[enrichProperty] HUD: no usable data — haystack=${haystack.length}, county="${input.county}", state="${input.state}", field=${fmrField}`
    );
    return null;
  } catch (err) {
    console.warn("[enrichProperty] HUD fetch threw:", err);
    return null;
  }
}

function normalizeCounty(name: string): string {
  return name
    .toLowerCase()
    .replace(/\bcounty\b/g, "")
    .replace(/[^a-z0-9 ]+/g, "")
    .trim();
}
