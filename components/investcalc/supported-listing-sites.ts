/**
 * The listing sites named to visitors, in one place.
 *
 * The homepage helper used to name two sites, the analyzer's listing-link
 * help three and the unsupported-link error five, so the same product
 * described itself three ways. Every surface reads this list.
 *
 * A site is named here only when the link shape it serves today reaches its
 * own branch of the address parser (lib/listing-url.ts) and comes back as an
 * address. Trulia joined the list once its link shape was read on Trulia's
 * own search page in a normal browser on 2026-10-02
 * (trulia.com/home/<street>-<city>-<state>-<zip>-<id>; trulia.com answers 403
 * to an automated page load): the parser's Trulia branch reads that shape and
 * drops the listing id, and lib/__tests__/listing-url.test.ts holds it to the
 * two links seen there.
 * `lib/__tests__/analyzer-first-visit-guards.test.ts` checks that a link
 * from each named site parses, and that Trulia is never named unless the
 * parser reads that link shape without the listing id.
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
