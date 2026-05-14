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
 *   - Monthly rent: HUD Fair Market Rent API, single-family only.
 *
 * All three lookups are independent and null-safe: if any one fails
 * (missing API key, network error, no data for the county/state), the
 * other defaults still come back.
 */

import { getStatePropertyTaxPct } from "@/lib/property-enrichment/state-property-tax";

export type EnrichPropertyInput = {
  state?: string;       // e.g., "PA"
  county?: string;      // e.g., "Philadelphia" (no "County" suffix)
  zip?: string;         // e.g., "19140"
  propertyType?: "single-family" | "multi-family" | "owner-occupant";
  bedrooms?: number;    // unit[0].bedrooms — only used for HUD lookup
};

export type EnrichPropertyResult = {
  propertyTaxPct?: number;
  interestRate?: number;
  monthlyRent?: number;
  /** Per-field notes so the UI can show "(suggested)" labels. */
  meta: {
    propertyTax?: { source: "state-static"; state: string };
    mortgageRate?: { source: "fred"; asOf: string };
    rent?: { source: "hud-fmr"; county: string; year: number };
  };
};

export async function enrichPropertyAction(
  input: EnrichPropertyInput
): Promise<EnrichPropertyResult> {
  const out: EnrichPropertyResult = { meta: {} };

  const [tax, rate, rent] = await Promise.all([
    lookupPropertyTax(input.state),
    fetchCurrentMortgageRate(),
    maybeFetchHudRent(input),
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
    out.meta.rent = { source: "hud-fmr", county: rent.county, year: rent.year };
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
    const res = await fetch(url.toString(), { cache: "no-store" });
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

type HudCounty = {
  county_name?: string;
  FIPS_code?: string;
  Efficiency?: number;
  "One-Bedroom"?: number;
  "Two-Bedroom"?: number;
  "Three-Bedroom"?: number;
  "Four-Bedroom"?: number;
};

type HudStateDataResponse = {
  data?: {
    year?: number;
    counties?: HudCounty[];
  };
};

async function maybeFetchHudRent(
  input: EnrichPropertyInput
): Promise<{ amount: number; county: string; year: number } | null> {
  // Skip for multi-family and owner-occupant: HUD FMR is a single-unit
  // per-bedroom estimate that doesn't reflect duplex/triplex economics.
  if (input.propertyType !== "single-family") {
    console.log(`[enrichProperty] HUD skipped: propertyType=${input.propertyType}`);
    return null;
  }

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

  // HUD User API state endpoint. Per the official docs the path is
  //   /fmr/statedata/{state_code}
  // Year is optional; omitting it returns the latest published FY data.
  const url = `https://www.huduser.gov/hudapi/public/fmr/statedata/${encodeURIComponent(
    input.state.toUpperCase()
  )}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(
        `[enrichProperty] HUD request failed: HTTP ${res.status} ${res.statusText}. URL=${url}. Body=${body.slice(0, 200)}`
      );
      return null;
    }

    type HudArea = {
      county_name?: string;
      name?: string; // metroareas use "name"
      fips_code?: string;
      code?: string;
    } & Record<string, unknown>;

    const json = (await res.json()) as {
      data?: {
        year?: string | number;
        counties?: HudArea[];
        metroareas?: HudArea[];
      };
    };

    const counties: HudArea[] = json.data?.counties ?? [];
    const metroareas: HudArea[] = json.data?.metroareas ?? [];
    const respYear = Number(json.data?.year ?? new Date().getFullYear());

    console.log(
      `[enrichProperty] HUD OK for ${input.state}: ${counties.length} counties, ${metroareas.length} metros, year=${respYear}`
    );

    // Try to match by county name first (most precise)
    let match: HudArea | undefined;
    if (input.county) {
      const target = normalizeCounty(input.county);
      match = counties.find(
        (c) => c.county_name && normalizeCounty(c.county_name) === target
      );
      // Metros use "name" instead of "county_name"; partial-match by county
      // ("Montgomery County" within "Washington-Arlington-... HUD Metro FMR Area"
      // wouldn't match, but "Philadelphia" within "Philadelphia-Camden-..." would).
      if (!match) {
        match = metroareas.find((m) => {
          const label = (m.name ?? "") + " " + (m.county_name ?? "");
          return label && normalizeCounty(label).includes(target);
        });
      }
    }

    const haystack = [...counties, ...metroareas];

    // No specific area match — fall back to a state average for that bedroom.
    if (!match && haystack.length > 0) {
      const values = haystack
        .map((c) => Number(c[fmrField] ?? 0))
        .filter((v) => v > 0);
      if (values.length === 0) return null;
      const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
      return { amount: avg, county: `${input.state} avg`, year: respYear };
    }

    if (match) {
      const v = Number(match[fmrField] ?? 0);
      if (v > 0) {
        const label = match.county_name ?? match.name ?? input.county ?? "";
        return { amount: v, county: label, year: respYear };
      }
    }
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
