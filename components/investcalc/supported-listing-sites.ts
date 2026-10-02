/**
 * The listing sites named to visitors, in one place.
 *
 * The address parser (lib/listing-url.ts) has a branch for each of these
 * five. The homepage helper used to name two of them, the analyzer's
 * listing-link help three and the unsupported-link error all five, so the
 * same product described itself three ways. Every surface reads this list.
 * `lib/__tests__/analyzer-first-visit-guards.test.ts` checks that a link from
 * each named site parses.
 */
export const SUPPORTED_LISTING_SITES = [
  "Zillow",
  "Redfin",
  "Realtor.com",
  "Homes.com",
  "Trulia",
] as const;

/** "Zillow, Redfin, Realtor.com, Homes.com, or Trulia" */
export const SUPPORTED_LISTING_SITES_TEXT = `${SUPPORTED_LISTING_SITES.slice(0, -1).join(", ")}, or ${SUPPORTED_LISTING_SITES.at(-1)}`;

/**
 * The first listing link in a pasted string, or null.
 *
 * A phone share sheet pastes a sentence followed by the link ("Check out
 * this home https://www.zillow.com/homedetails/…"). The link check used to
 * require the string to START with the link, so the whole sentence became
 * the property address. This finds an http(s) URL anywhere in the text; a
 * bare listing-site host is still recognised only at the start, as before,
 * and gets the scheme the URL parser needs.
 */
export function extractListingLink(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  const url = text.match(/https?:\/\/[^\s<>"']+/i)?.[0];
  // Sentence punctuation after a pasted link is not part of the link.
  if (url) return url.replace(/[)\].,;:!?]+$/, "");
  const bare = text.match(
    /^(?:www\.)?(?:zillow|redfin|realtor|homes|trulia)\.com\b\S*/i,
  )?.[0];
  return bare ? `https://${bare}` : null;
}
