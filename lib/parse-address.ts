/**
 * Best-effort US location parse from a free-text address string.
 *
 * The homepage hero promises "type an address → get a verdict", but the
 * instant-verdict path (enrichment + price estimate + auto-run) only fires
 * when Google Places returns structured components — which it does ONLY when
 * the visitor deliberately picks a suggestion. Fast typers, dropdown
 * dismissers, and ad-blocked Places users submit a bare string and used to
 * land on a dead, empty form (a near-guaranteed bounce on a paid click).
 *
 * This recovers the two things the downstream flow actually needs — the state
 * (drives property tax + the price-to-rent estimate) and the ZIP (sharpens HUD
 * rent) — straight from the typed string, no API call, so it can't be
 * ad-blocked and needs no extra key. It's intentionally conservative: it
 * returns a state only on a strong signal, so a verdict built on it is
 * grounded, and the result is always editable.
 *
 * Pure + dependency-light so it's unit-tested and safe to import anywhere.
 */

export interface ParsedAddressLocation {
  /** Two-letter state code, uppercased, when recoverable. */
  state?: string;
  /** 5-digit ZIP, when present in the string. */
  zip?: string;
}

// All 50 states + DC. (lib/states.ts is a CURATED investor-market subset used
// for price estimation — not usable for location parsing, which must recognize
// every state, e.g. WV, and not mistake "West Virginia" for "Virginia".)
const STATE_NAME_TO_ABBR: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", "district of columbia": "DC",
  florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL",
  indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA",
  maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI",
  minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT",
  nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC",
  "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR",
  pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT",
  vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV",
  wisconsin: "WI", wyoming: "WY",
};

const STATE_ABBRS = new Set(Object.values(STATE_NAME_TO_ABBR));
// Names longest-first so "West Virginia" is tested before "Virginia".
const STATE_NAMES: Array<{ name: string; abbr: string }> = Object.entries(STATE_NAME_TO_ABBR)
  .map(([name, abbr]) => ({ name, abbr }))
  .sort((a, b) => b.name.length - a.name.length);

export function parseAddressLocation(raw: string): ParsedAddressLocation {
  if (!raw || typeof raw !== "string") return {};
  const text = raw.trim();
  if (!text) return {};

  // ZIP: the last 5-digit run (US addresses end "... ST 78701[, USA]").
  const zipMatches = text.match(/\b\d{5}(?:-\d{4})?\b/g);
  const zip = zipMatches ? zipMatches[zipMatches.length - 1].slice(0, 5) : undefined;

  const out: ParsedAddressLocation = {};
  if (zip) out.zip = zip;

  // Strongest signal: a 2-letter state token immediately before the ZIP
  // (case-insensitive — handles "austin, tx 78701"). Tokenize on whitespace
  // and commas so "TX," and "TX" both match.
  const tokens = text.split(/[\s,]+/).filter(Boolean);
  if (zip) {
    const zipIdx = tokens.findIndex((t) => t.replace(/-\d{4}$/, "") === zip);
    const before = zipIdx > 0 ? tokens[zipIdx - 1].toUpperCase() : undefined;
    if (before && STATE_ABBRS.has(before)) {
      out.state = before;
      return out;
    }
  }

  // Next: any UPPERCASE 2-letter token that's a real state code (last wins —
  // the state sits near the end of an address). Require uppercase so common
  // lowercase words ("in", "or", "me", "hi") can't masquerade as states.
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    const t = tokens[i].replace(/[.,]/g, "");
    if (/^[A-Z]{2}$/.test(t) && STATE_ABBRS.has(t)) {
      out.state = t;
      return out;
    }
  }

  // Fallback: a full state name appearing as a whole word (longest-first so
  // "West Virginia" wins over "Virginia").
  const lower = ` ${text.toLowerCase()} `;
  for (const { name, abbr } of STATE_NAMES) {
    if (lower.includes(` ${name} `) || lower.includes(` ${name},`)) {
      out.state = abbr;
      return out;
    }
  }

  return out;
}
