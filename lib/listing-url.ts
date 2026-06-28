/**
 * Best-effort address extraction from a real-estate listing URL (Zillow,
 * Redfin, Realtor.com, Homes.com, Trulia).
 *
 * We deliberately DO NOT fetch the listing page — those sites aggressively
 * block bot fetches and the HTML is brittle. Instead we parse the address out
 * of the URL slug, which every major portal encodes predictably. The result is
 * a messy-but-geocodable address string (plus the state when recoverable) that
 * we hand to the analyzer's existing address enrichment (Google Places +
 * HUD/FRED/state tax). Always surfaced as "parsed from the link — confirm it",
 * never trusted blindly.
 *
 * Pure + dependency-free so it's unit-tested and safe to import anywhere.
 */

const US_STATES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL",
  "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT",
  "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
]);

export interface ParsedListing {
  /** Geocodable address string, e.g. "16601 N 25th Ave Phoenix AZ 85382". */
  address: string;
  /** Two-letter state, uppercased, when recoverable from the slug. */
  state?: string;
  /** Which portal the URL was recognized as. */
  source: "zillow" | "redfin" | "realtor" | "homes" | "trulia" | "generic";
}

/** Turn a dash/underscore slug into spaced words. */
function deslug(s: string): string {
  return decodeURIComponent(s).replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Find a 2-letter US state token in a spaced address string (the one that
 *  sits just before a 5-digit ZIP, else the last state-looking token). */
function findState(address: string): string | undefined {
  const tokens = address.split(/\s+/);
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i].toUpperCase();
    if (US_STATES.has(t)) {
      const next = tokens[i + 1];
      if (next && /^\d{5}$/.test(next)) return t; // ST immediately before ZIP — strongest signal
    }
  }
  // Fallback: any state token at all.
  for (const tok of tokens) {
    if (US_STATES.has(tok.toUpperCase())) return tok.toUpperCase();
  }
  return undefined;
}

function finalize(slug: string, source: ParsedListing["source"]): ParsedListing | null {
  const address = deslug(slug);
  // Require something that plausibly contains a street number + a state, so we
  // don't hand the geocoder a city-only or junk slug.
  if (!/\d/.test(address)) return null;
  const state = findState(address);
  return { address, state, source };
}

/**
 * Parse a listing URL into a geocodable address. Returns null when the URL
 * isn't a recognized listing or no usable address can be recovered.
 */
export function parseListingUrl(raw: string): ParsedListing | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol)) return null;

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const segs = url.pathname.split("/").filter(Boolean).map((s) => s.trim());

  // Zillow / Trulia: /homedetails/<address-slug>/<id>_zpid/
  if (host.includes("zillow.") || host.includes("trulia.")) {
    const i = segs.indexOf("homedetails");
    const slug = i >= 0 ? segs[i + 1] : undefined;
    if (slug) {
      const out = finalize(slug, host.includes("trulia.") ? "trulia" : "zillow");
      if (out) return out;
    }
  }

  // Realtor.com: /realestateandhomes-detail/<street>_<City>_<ST>_<ZIP>_<id>
  if (host.includes("realtor.")) {
    const i = segs.findIndex((s) => s.startsWith("realestateandhomes-detail"));
    const slug = i >= 0 ? (segs[i].includes("_") ? segs[i] : segs[i + 1]) : undefined;
    if (slug) {
      // Underscore-separated: street(dashes), City, ST, ZIP, id…
      const parts = slug.split("_").filter(Boolean);
      const out = finalize(parts.join(" ").replace(/-/g, " "), "realtor");
      if (out) return out;
    }
  }

  // Redfin: /<ST>/<City>/<address-slug>/home/<id>
  if (host.includes("redfin.")) {
    const hi = segs.indexOf("home");
    if (hi >= 2) {
      const st = segs[0];
      const city = segs[1];
      const addrSlug = segs[hi - 1];
      const address = `${deslug(addrSlug)} ${deslug(city)} ${st}`.replace(/\s+/g, " ").trim();
      if (/\d/.test(address)) {
        return {
          address,
          state: US_STATES.has(st.toUpperCase()) ? st.toUpperCase() : findState(address),
          source: "redfin",
        };
      }
    }
  }

  // Homes.com: /property/<address-slug>-<id>/
  if (host.includes("homes.com")) {
    const i = segs.indexOf("property");
    const slug = i >= 0 ? segs[i + 1] : undefined;
    if (slug) {
      const out = finalize(slug, "homes");
      if (out) return out;
    }
  }

  // Generic fallback: the longest path segment that looks like an address slug
  // (contains a digit and a state-or-zip token). Catches unrecognized portals.
  const candidate = [...segs]
    .filter((s) => /\d/.test(s) && /[-_]/.test(s))
    .sort((a, b) => b.length - a.length)[0];
  if (candidate) {
    const address = deslug(candidate);
    if (findState(address) || /\b\d{5}\b/.test(address)) {
      return { address, state: findState(address), source: "generic" };
    }
  }

  return null;
}
