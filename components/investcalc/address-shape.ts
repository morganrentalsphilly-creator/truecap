import { parseAddressLocation } from "@/lib/parse-address";

/**
 * Is this text a place rather than a property: a city and a state, with no
 * street and no number ("Columbus, OH", "New York NY", "Austin, Texas")?
 *
 * Market pages hand the analyzer their city as context. Written into the
 * address field it read as a property: the run button went live, typing a
 * street appended to it ("Columbus, OH123 Main St"), and a run on the bare
 * city could spend a visitor's one no-signup decision.
 *
 * Deliberately narrow, so a real address is never refused:
 *   - any digit (a street number, a unit, a ZIP) means it is not a bare city;
 *   - a US state must be recognisable (lib/parse-address.ts);
 *   - "City, ST" has exactly a city before the comma and only the state
 *     after it, so "Main Street, Columbus OH" and
 *     "One Lincoln Plaza, New York, NY" still count as addresses;
 *   - without a comma, at most two words may come before the state.
 */
export function isCityOnlyAddress(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const text = value
    .trim()
    .replace(
      /(?:,\s*)?(?:united states of america|united states|u\.?s\.?a\.?)\s*$/i,
      "",
    )
    .trim()
    .replace(/,$/, "")
    .trim();
  if (!text || /\d/.test(text)) return false;
  if (!parseAddressLocation(text).state) return false;

  const parts = text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length > 2) return false;
  if (parts.length === 2) {
    // The part after the comma must be the state and nothing else.
    return isExactlyAState(parts[1]);
  }
  // No comma: "Columbus OH", "New York NY". The state is the last word (or
  // the last two for a spelled-out state); allow at most two words before it.
  const words = parts[0].split(/\s+/);
  return words.length <= 3;
}

/**
 * "OH", "Ohio", "West Virginia": a state and no other word. "Columbus OH"
 * and "Columbus Ohio" are not, because the state is still found once the
 * first word is dropped.
 */
function isExactlyAState(text: string): boolean {
  const state = parseAddressLocation(text).state;
  if (!state) return false;
  const words = text.trim().split(/\s+/);
  if (words.length === 1) return true;
  return parseAddressLocation(words.slice(1).join(" ")).state !== state;
}

/** Inline error when a bare city is offered as the property. */
export const STREET_ADDRESS_REQUIRED_MESSAGE =
  "Add the street address. A city and state are not enough to analyze a property.";

/** Placeholder for the address field when a market page supplied its city. */
export function streetAddressPlaceholder(area: string): string {
  return `Street address in ${area.trim()}`;
}
