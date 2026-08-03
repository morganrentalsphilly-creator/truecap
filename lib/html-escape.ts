/**
 * HTML escaping for values that get interpolated into email bodies.
 *
 * Outbound email HTML is built with template literals in several server
 * actions (post-analysis-email-capture, capture-deal-lead, the alert
 * templates). Any caller-supplied string that lands in one of those
 * literals MUST go through `escapeHtml` first — otherwise an
 * unauthenticated caller can inject markup (links, hidden divs) into mail
 * that ships from usetruecap.com with aligned SPF/DKIM, i.e. a phishing
 * primitive with our domain's reputation behind it.
 *
 * Pure module, no imports — safe to use from any runtime (node, edge,
 * client) and cheap to unit-test.
 */

/**
 * Escape the five characters that can break out of HTML text or an
 * attribute value. `&` MUST be replaced first or the entities produced by
 * the later replacements get double-escaped.
 */
export function escapeHtml(value: string | null | undefined): string {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Longest address we will echo back into an email body. */
export const MAX_EMAIL_ADDRESS_TEXT = 120;

/**
 * Characters a real street address can contain. Deliberately narrow: letters
 * (incl. accented), digits, whitespace, and the punctuation that shows up in
 * postal addresses. Everything else — angle brackets, quotes, backticks,
 * braces, backslashes, semicolons, colons — is dropped.
 */
const ADDRESS_ALLOWED = /[^\p{L}\p{N} .,'’#/&()\-]/gu;

/**
 * Reduce a caller-supplied property address to plain address text.
 *
 * This is belt-and-braces on top of `escapeHtml`: an address is data, not
 * markup, so we strip it to a safe character set FIRST (so it can never
 * carry a tag even if a future template forgets to escape), then the
 * caller still escapes what's left. Returns `""` when nothing usable
 * survives — callers should treat that as "no address supplied" rather
 * than rendering an empty `<strong></strong>`.
 */
export function sanitizeAddressText(value: string | null | undefined): string {
  if (value == null) return "";
  const cleaned = String(value)
    .replace(ADDRESS_ALLOWED, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_EMAIL_ADDRESS_TEXT)
    .trim();
  // A single stray character isn't a usable address — treat it as absent.
  return cleaned.length >= 2 ? cleaned : "";
}
