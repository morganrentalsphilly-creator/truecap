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
 * filtered as text, never re-serialised. The one exception is a parameter
 * whose VALUE carries a click id of its own, either as plain text
 * (`next=/pricing?gclid=...`) or percent-encoded, up to MAX_NESTING levels
 * deep (`next=%2F%3Fgclid%3D...`). That value is decoded, filtered and
 * written back with `encodeURIComponent`, so its escaping can differ from
 * the original (a `+` comes back as `%2B`). A value that does not decode
 * (a malformed `%` sequence) is left as it was.
 */

import { AD_CLICK_ID_PARAMS } from "@/lib/first-touch";

const AD_CLICK_ID_SET = new Set<string>(AD_CLICK_ID_PARAMS);
const AD_CLICK_ID_NAMES = AD_CLICK_ID_PARAMS.join("|");

/**
 * Cheap pre-check so the common string (no click id) is returned untouched.
 * The "=" may itself be percent-encoded, once or more (`%3D`, `%253D`), when
 * the click id sits inside another parameter's value.
 */
const AD_CLICK_ID_HINT = new RegExp(
  `(?:${AD_CLICK_ID_NAMES})(?:=|%(?:25)*3D)`,
  "i",
);

/** A decoded value that is itself a bare query: "gclid=x&utm_medium=cpc". */
const BARE_QUERY_WITH_CLICK_ID = new RegExp(
  `(?:^|&)(?:${AD_CLICK_ID_NAMES})=`,
  "i",
);

/** A query string inside any text: "?" up to whitespace, "#" or a quote. */
const QUERY_IN_TEXT = /\?[^\s#"'<>]*/g;

/** How many levels of "a URL inside a parameter value" are followed. */
const MAX_NESTING = 4;

/** Ad platforms write the name in lower case; match any case to be safe. */
export function isAdClickIdParameter(key: string): boolean {
  return AD_CLICK_ID_SET.has(key.trim().toLowerCase());
}

function decodeOrNull(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function filterPairs(
  pairs: string,
  depth: number,
): { kept: string; changed: boolean } {
  let changed = false;
  const kept: string[] = [];
  for (const pair of pairs.split("&")) {
    const eq = pair.indexOf("=");
    const name = eq < 0 ? pair : pair.slice(0, eq);
    if (isAdClickIdParameter(name)) {
      changed = true;
      continue;
    }
    if (eq < 0) {
      kept.push(pair);
      continue;
    }
    const value = pair.slice(eq + 1);
    const stripped = stripValue(value, depth);
    if (stripped === value) {
      kept.push(pair);
    } else {
      changed = true;
      kept.push(`${name}=${stripped}`);
    }
  }
  return { kept: kept.join("&"), changed };
}

/** Every "?query" in `text`, at one decoding level. */
function stripQueriesInText(text: string, depth: number): string {
  return text.replace(QUERY_IN_TEXT, (query) => {
    const { kept, changed } = filterPairs(query.slice(1), depth);
    if (!changed) return query;
    return kept ? `?${kept}` : "";
  });
}

/**
 * One parameter's value at one decoding level: the part before any "?" may
 * be a bare query ("gclid=x&utm_medium=cpc"), the rest is searched for
 * "?query" strings.
 */
function stripValueLevel(value: string, depth: number): string {
  const at = value.indexOf("?");
  const head = at < 0 ? value : value.slice(0, at);
  const tail = at < 0 ? "" : value.slice(at);
  const cleanHead = BARE_QUERY_WITH_CLICK_ID.test(head)
    ? filterPairs(head, depth).kept
    : head;
  return cleanHead + stripQueriesInText(tail, depth);
}

/**
 * A parameter value that may carry a click id of its own: as plain text,
 * then percent-decoded one level at a time. Returned as it was unless a
 * click id was found inside it.
 */
function stripValue(value: string, depth: number): string {
  if (depth >= MAX_NESTING || !AD_CLICK_ID_HINT.test(value)) return value;
  const plain = stripValueLevel(value, depth + 1);
  if (!plain.includes("%")) return plain;
  const decoded = decodeOrNull(plain);
  if (decoded === null || decoded === plain) return plain;
  const stripped = stripValue(decoded, depth + 1);
  return stripped === decoded ? plain : encodeURIComponent(stripped);
}

/**
 * Strip gclid, gbraid, wbraid, dclid and msclkid from every query string in
 * `text`, including one nested inside another parameter's value. Works on a
 * bare URL, a path, a "?query" and a sentence that embeds a URL
 * ("GET /?gclid=x&_rsc=1"). A string with no click id is returned as it was.
 */
export function stripAdClickIds(text: string): string {
  if (!AD_CLICK_ID_HINT.test(text)) return text;
  return stripQueriesInText(text, 0);
}

/** The same filter for a query string that has no leading "?". */
export function stripAdClickIdsFromBareQuery(query: string): string {
  if (!AD_CLICK_ID_HINT.test(query)) return query;
  if (query.startsWith("?")) return stripAdClickIds(query);
  const { kept, changed } = filterPairs(query, 0);
  return changed ? kept : query;
}

/**
 * The same filter for one already-parsed parameter value (the values of a
 * `query_string` object or pair list): `{ next: "/pricing?gclid=x" }`.
 */
export function stripAdClickIdsFromParameterValue(value: string): string {
  return stripValue(value, 0);
}
