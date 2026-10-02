/**
 * Remove ad click ids from URLs before they leave the browser for a
 * measurement vendor that has no use for them.
 *
 * A paid click lands on a URL such as `/?gclid=Cj0K...`. Vercel Web Analytics
 * and Sentry both run before and without cookie consent, and both received
 * that landing URL as it was: after Reject, the click id still reached two
 * processors (go-to-market audit 2026-10, row P2-108). Neither uses it. The
 * Google tag, which does, loads only after consent and reads the address bar
 * itself, so nothing here touches `window.location`.
 *
 * This is a separate step from lib/sensitive-url.ts on purpose. The names
 * must NOT be added to SENSITIVE_QUERY_PARAMETER_NAMES: that list also
 * decides whether the Google, Vercel and PostHog scripts load at all, so a
 * landing with a gclid would switch measurement off.
 *
 * `utm_*` and every other parameter are kept, byte for byte: the query is
 * filtered as text, never re-serialised.
 */

import { AD_CLICK_ID_PARAMS } from "@/lib/first-touch";

const AD_CLICK_ID_SET = new Set<string>(AD_CLICK_ID_PARAMS);

/** Cheap pre-check so the common string (no click id) is returned untouched. */
const AD_CLICK_ID_HINT = new RegExp(
  `(?:${AD_CLICK_ID_PARAMS.join("|")})=`,
  "i",
);

/** A query string inside any text: "?" up to whitespace, "#" or a quote. */
const QUERY_IN_TEXT = /\?[^\s#"'<>]*/g;

/** Ad platforms write the name in lower case; match any case to be safe. */
export function isAdClickIdParameter(key: string): boolean {
  return AD_CLICK_ID_SET.has(key.trim().toLowerCase());
}

function filterPairs(pairs: string): { kept: string; changed: boolean } {
  const all = pairs.split("&");
  const kept = all.filter(
    (pair) => !isAdClickIdParameter(pair.split("=", 1)[0] ?? ""),
  );
  return { kept: kept.join("&"), changed: kept.length !== all.length };
}

/**
 * Strip gclid, gbraid, wbraid, dclid and msclkid from every query string in
 * `text`. Works on a bare URL, a path, a "?query" and a sentence that embeds
 * a URL ("GET /?gclid=x&_rsc=1"). A string with no click id is returned as it
 * was.
 */
export function stripAdClickIds(text: string): string {
  if (!AD_CLICK_ID_HINT.test(text)) return text;
  return text.replace(QUERY_IN_TEXT, (query) => {
    const { kept, changed } = filterPairs(query.slice(1));
    if (!changed) return query;
    return kept ? `?${kept}` : "";
  });
}

/** The same filter for a query string that has no leading "?". */
export function stripAdClickIdsFromBareQuery(query: string): string {
  if (!AD_CLICK_ID_HINT.test(query)) return query;
  if (query.startsWith("?")) return stripAdClickIds(query);
  const { kept, changed } = filterPairs(query);
  return changed ? kept : query;
}
