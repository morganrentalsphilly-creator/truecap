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

/**
 * A unit token: "209", "2B", "12-3", "B", "A1". Deliberately not any word,
 * so "Unit St" or "Suite Ave" in a street name is not read as a unit.
 */
const UNIT_TOKEN = "(?:\\d+[A-Za-z]?(?:-[A-Za-z0-9]+)?|[A-Za-z]\\d*)";
const UNIT_DESIGNATOR = new RegExp(
  `(?:^|[\\s,])(#\\s?[A-Za-z0-9][A-Za-z0-9-]*|(?:apt|apartment|unit|ste|suite)\\.?\\s*#?\\s?${UNIT_TOKEN})(?=[\\s,]|$)`,
  "i",
);

/**
 * The unit designator in an address as the visitor wrote it ("#209",
 * "Apt 2B", "Unit 5", "Ste 100"), or null when there is none.
 */
export function addressUnitDesignator(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = UNIT_DESIGNATOR.exec(value);
  return match ? match[1].trim() : null;
}

/** The house number an address starts with ("444", "12B"), or null. */
function leadingHouseNumber(value: string): string | null {
  return /^\s*(\d+[A-Za-z]?)\b/.exec(value)?.[1]?.toLowerCase() ?? null;
}

/**
 * Keep the unit a visitor typed when they pick an address suggestion.
 *
 * Google's suggestions for "444 N Front St #209, Columbus, OH 43215" name
 * the building, and picking one replaced the field's text, so two units in
 * one building became the same deal name. When the typed text carries a unit
 * designator that the picked address lacks, and both start with the same
 * house number (the pick is the building that was typed, not a neighbour or
 * a business on the street), the unit goes back in after the street line:
 * "444 N Front St #209, Columbus, OH 43215, USA". Otherwise the picked
 * address is returned unchanged.
 */
export function withTypedUnit(pickedAddress: string, typedAddress: unknown): string {
  const unit = addressUnitDesignator(typedAddress);
  if (!unit || typeof typedAddress !== "string") return pickedAddress;
  if (addressUnitDesignator(pickedAddress)) return pickedAddress;
  const typedNumber = leadingHouseNumber(typedAddress);
  if (!typedNumber || typedNumber !== leadingHouseNumber(pickedAddress)) {
    return pickedAddress;
  }
  const comma = pickedAddress.indexOf(",");
  if (comma === -1) return `${pickedAddress.trimEnd()} ${unit}`;
  return `${pickedAddress.slice(0, comma).trimEnd()} ${unit}${pickedAddress.slice(comma)}`;
}

/**
 * Should the form ask about HOA dues?
 *
 * Yes while the address carries a unit designator (a condo or co-op is
 * likely), HOA is still $0 or blank, and the visitor has not been to the HOA
 * field. It drives a prompt and a chip, never a required input: a visitor
 * who visits the field and leaves 0 has answered, and the prompt goes away.
 */
export function shouldPromptForHoa(input: {
  address: unknown;
  hoaMonthly: unknown;
  hoaFieldVisited: boolean;
}): boolean {
  if (input.hoaFieldVisited) return false;
  const hoa =
    typeof input.hoaMonthly === "number" ? input.hoaMonthly : Number.NaN;
  if (Number.isFinite(hoa) && hoa > 0) return false;
  return addressUnitDesignator(input.address) !== null;
}
