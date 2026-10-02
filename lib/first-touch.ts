/**
 * First-touch acquisition attribution: one coarse source category and one
 * coarse landing SECTION, never a raw referrer, URL, path, query or UTM value.
 *
 * Founder decision (2026-09-27): "Coarse, private. A consent-gated cookie
 * holding a source category and a landing SECTION, saved to app_metadata at
 * sign-up. Counts go only to /admin/seo, never the public digest."
 *
 * The pieces, in order:
 *   1. The browser classifies the first page load of a tab
 *      (`classifyFirstTouchReferralSource` + `landingSection`, run by
 *      lib/analytics.ts `recordFirstTouchLanding`) and keeps the result in
 *      sessionStorage, unless the visitor has already rejected analytics
 *      storage. The raw referrer host, `utm_medium` and the presence of an ad
 *      click id are read only for that synchronous classification and are
 *      discarded.
 *   2. Only once cookie consent is `granted`, `syncFirstTouchCookie` copies the
 *      two enum values into the first-party `tc_ft` cookie
 *      (`<source>.<section>`, 90 days, first touch wins). A `denied` or absent
 *      decision deletes it, so the cookie's presence is itself the consent
 *      signal the server can see (consent lives in localStorage).
 *   3. At sign-up the server validates the cookie against these enums
 *      (lib/first-touch-server.ts) and writes
 *      `app_metadata.tc_first_touch = { source, section, v: 1 }`.
 *   4. seo/scripts/signups.ts counts organic sign-ups by section into the
 *      private seo_conversions_daily table, read only by /admin/seo.
 *
 * Pure module: no DOM access except through the injected `CookieJar`, no
 * dependencies (it ships in the global client bundle via the PostHog
 * provider, so zod validation lives in the server module instead).
 */

// ── Source taxonomy ─────────────────────────────────────────────────

export const FIRST_TOUCH_REFERRAL_SOURCES = [
  "direct",
  "organic_search",
  "organic_ai",
  "organic_social",
  "paid_search",
  "paid_social",
  "email",
  "external_referral",
  "campaign",
] as const;

export type FirstTouchReferralSource =
  (typeof FIRST_TOUCH_REFERRAL_SOURCES)[number];

/** The sources /admin/seo counts as organic sign-ups. */
export const ORGANIC_FIRST_TOUCH_SOURCES = [
  "organic_search",
  "organic_ai",
] as const satisfies readonly FirstTouchReferralSource[];

const SOURCE_SET = new Set<string>(FIRST_TOUCH_REFERRAL_SOURCES);

export function isFirstTouchReferralSource(
  value: unknown,
): value is FirstTouchReferralSource {
  return typeof value === "string" && SOURCE_SET.has(value);
}

const SEARCH_REFERRER_RE =
  /(^|\.)(google|bing|yahoo|duckduckgo|ecosia|brave)\./;
const AI_REFERRER_RE = /(^|\.)(perplexity|chatgpt|openai|copilot|claude)\./;
const SOCIAL_REFERRER_RE =
  /(^|\.)(facebook|instagram|linkedin|reddit|tiktok|x|twitter)\./;
/**
 * Sign-in round trips, not acquisition. The Google OAuth return lands on
 * `next` with `accounts.google.com` as its referrer (the redirect chain keeps
 * the initiating page's referrer), which the search pattern above used to
 * count as organic search on every Google sign-in.
 */
const AUTH_REFERRER_RE =
  /(^|\.)(accounts\.google|myaccount\.google|accounts\.youtube)\.|(^|\.)supabase\.co$/;
/**
 * Webmail, including the Gmail Android app (`android-app://com.google.android.gm`).
 * `mail.google.com` and `mail.yahoo.com` used to match the search pattern.
 */
const WEBMAIL_REFERRER_RE =
  /(^|\.)(mail\.google|mail\.yahoo|outlook\.live|outlook\.office|outlook\.office365|mail\.proton)\.|^com\.google\.android\.gm$/;

/**
 * Auto-tagging parameters an ad platform appends to every paid click: Google
 * Ads (`gclid`, and `gbraid`/`wbraid` on iOS), Google Marketing Platform
 * (`dclid`) and Microsoft Ads (`msclkid`). TrueCap's ad Final URLs carry no
 * query string; the campaign's Final URL suffix adds `utm_medium=cpc`
 * (google-ads/README.md). Without this check, a paid click from google.com or
 * bing.com that arrives without that suffix classified as organic search.
 * Only the parameter's PRESENCE is read; its value is never read, stored or
 * sent.
 */
export const AD_CLICK_ID_PARAMS = [
  "gclid",
  "gbraid",
  "wbraid",
  "dclid",
  "msclkid",
] as const;

/** True when the landing URL's query carries any ad click-id parameter. */
export function hasAdClickId(
  query: { has(name: string): boolean } | null | undefined,
): boolean {
  if (!query) return false;
  return AD_CLICK_ID_PARAMS.some((name) => query.has(name));
}

/**
 * Map one page load's referrer host, `utm_medium` and ad-click flag onto the
 * fixed taxonomy. Returns null when the load is a sign-in round trip (Google
 * account chooser, the Supabase auth hop): that is not an acquisition touch,
 * so nothing should be recorded or counted for it.
 */
export function classifyFirstTouchReferralSource(input: {
  referrerHost: string;
  currentHost: string;
  campaignMedium: string;
  /** `hasAdClickId(query)`: the click came from a paid ad (auto-tagged). */
  adClick: boolean;
}): FirstTouchReferralSource | null {
  const { referrerHost, currentHost, campaignMedium, adClick } = input;
  if (referrerHost && AUTH_REFERRER_RE.test(referrerHost)) return null;
  // An auto-tagged click is paid whatever the referrer (google.com, bing.com)
  // or a manual utm_medium says. The taxonomy has no display bucket; for this
  // site's search ads (and to keep them out of the organic counts) paid_search
  // is the right one.
  if (adClick) return "paid_search";
  if (["cpc", "ppc", "paid_search", "paidsearch"].includes(campaignMedium)) {
    return "paid_search";
  }
  if (["paid_social", "paidsocial", "social_paid"].includes(campaignMedium)) {
    return "paid_social";
  }
  if (["email", "newsletter"].includes(campaignMedium)) return "email";
  if (campaignMedium === "organic") {
    return AI_REFERRER_RE.test(referrerHost) ? "organic_ai" : "organic_search";
  }
  if (campaignMedium === "social") return "organic_social";
  if (campaignMedium === "referral") return "external_referral";
  // Never forward an unrecognized campaign value. Its presence is useful,
  // but the taxonomy remains a fixed anonymous bucket.
  if (campaignMedium) return "campaign";

  if (!referrerHost || referrerHost === currentHost) return "direct";
  if (WEBMAIL_REFERRER_RE.test(referrerHost)) return "email";
  if (AI_REFERRER_RE.test(referrerHost)) return "organic_ai";
  if (SEARCH_REFERRER_RE.test(referrerHost)) return "organic_search";
  if (SOCIAL_REFERRER_RE.test(referrerHost)) return "organic_social";
  return "external_referral";
}

// ── Landing sections ────────────────────────────────────────────────

/**
 * The landing route's first segment, bucketed. Deliberately finer than the
 * PostHog `route_category` dimension (posthog-provider.tsx `routeCategory`),
 * which folds blog/glossary/vs/markets/states into one "content" bucket and
 * is an established dashboard dimension, so it is left as it is.
 */
export const LANDING_SECTIONS = [
  "home",
  "blog",
  "tools",
  "markets",
  "states",
  "glossary",
  "vs",
  "pricing",
  "analyze",
  "for_agents",
  "for_investors",
  "other",
] as const;

export type LandingSection = (typeof LANDING_SECTIONS)[number];

const SECTION_SET = new Set<string>(LANDING_SECTIONS);

/**
 * The agent and investor landing pages. Their path segments carry a
 * hyphen, which the cookie value pattern below does not allow (lower-case
 * letters and underscores only), so each maps to an underscore name. Stored
 * as it is, `paid_search.for-agents` would fail to parse and the record would
 * be dropped at sign-up.
 */
function personaSection(segment: string): LandingSection | null {
  if (segment === "for-agents") return "for_agents";
  if (segment === "for-investors") return "for_investors";
  return null;
}

/** Sections that name a first path segment ("/home" is not the homepage). */
const SEGMENT_SECTIONS = new Set<string>(
  LANDING_SECTIONS.filter(
    (section) =>
      section !== "home" &&
      section !== "other" &&
      section !== "for_agents" &&
      section !== "for_investors",
  ),
);

export function isLandingSection(value: unknown): value is LandingSection {
  return typeof value === "string" && SECTION_SET.has(value);
}

export function landingSection(pathname: string): LandingSection {
  const path = pathname.split(/[?#]/, 1)[0] ?? "";
  if (path === "/" || path === "") return "home";
  const first = (path.split("/")[1] ?? "").toLowerCase();
  if (SEGMENT_SECTIONS.has(first)) return first as LandingSection;
  return personaSection(first) ?? "other";
}

// ── The tc_ft cookie ────────────────────────────────────────────────

export type FirstTouch = {
  source: FirstTouchReferralSource;
  section: LandingSection;
};

export const FIRST_TOUCH_COOKIE = "tc_ft";
export const FIRST_TOUCH_COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;
/** Longest legal value is "external_referral.for_investors" (31 chars). */
const MAX_COOKIE_VALUE_LENGTH = 40;
const COOKIE_VALUE_RE = /^([a-z_]{1,24})\.([a-z_]{1,16})$/;

/**
 * `<source>.<section>`, or null unless BOTH halves are taxonomy values. The
 * only way a value reaches the cookie, so nothing but two enum tokens can.
 */
export function serializeFirstTouchCookie(input: {
  source: unknown;
  section: unknown;
}): string | null {
  if (!isFirstTouchReferralSource(input.source)) return null;
  if (!isLandingSection(input.section)) return null;
  return `${input.source}.${input.section}`;
}

/**
 * Split a cookie value into its two tokens after shape checks only (length,
 * charset, exactly one dot). Enum membership is checked by the caller:
 * `parseFirstTouchCookie` below in the browser, a zod schema on the server.
 */
export function splitFirstTouchCookie(
  raw: unknown,
): { source: string; section: string } | null {
  if (typeof raw !== "string" || raw.length > MAX_COOKIE_VALUE_LENGTH) {
    return null;
  }
  const match = COOKIE_VALUE_RE.exec(raw);
  if (!match) return null;
  return { source: match[1], section: match[2] };
}

export function parseFirstTouchCookie(raw: unknown): FirstTouch | null {
  const parts = splitFirstTouchCookie(raw);
  if (!parts) return null;
  if (!isFirstTouchReferralSource(parts.source)) return null;
  if (!isLandingSection(parts.section)) return null;
  return { source: parts.source, section: parts.section };
}

/** The value of one cookie in a `document.cookie`-style header, or null. */
export function readCookieValue(header: string, name: string): string | null {
  for (const entry of header.split(/;\s*/)) {
    const eq = entry.indexOf("=");
    if (eq <= 0) continue;
    if (entry.slice(0, eq).trim() === name) return entry.slice(eq + 1);
  }
  return null;
}

function cookieAttributes(secure: boolean): string {
  return `Path=/; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function firstTouchSetCookie(value: string, secure: boolean): string {
  return `${FIRST_TOUCH_COOKIE}=${value}; Max-Age=${FIRST_TOUCH_COOKIE_MAX_AGE_SECONDS}; ${cookieAttributes(secure)}`;
}

export function firstTouchDeleteCookie(secure: boolean): string {
  return `${FIRST_TOUCH_COOKIE}=; Max-Age=0; ${cookieAttributes(secure)}`;
}

/** `document.cookie`, abstracted so the consent rules are unit-testable. */
export type CookieJar = {
  read(): string;
  write(cookie: string): void;
  /** true on https, where the cookie carries `Secure`. */
  secure: boolean;
};

export type FirstTouchCookieSync =
  | "written"
  | "kept"
  | "deleted"
  | "absent"
  | "no_first_touch";

/**
 * The only writer of `tc_ft`. It is set only when the stored consent decision
 * is `granted`, only if absent (first touch wins; a malformed value is
 * replaced), and deleted whenever the decision is anything else.
 */
export function syncFirstTouchCookie(input: {
  consent: "granted" | "denied" | null;
  firstTouch: FirstTouch | null;
  jar: CookieJar;
}): FirstTouchCookieSync {
  const { consent, firstTouch, jar } = input;
  const current = readCookieValue(jar.read(), FIRST_TOUCH_COOKIE);
  if (consent !== "granted") {
    if (current === null) return "absent";
    jar.write(firstTouchDeleteCookie(jar.secure));
    return "deleted";
  }
  if (current !== null && parseFirstTouchCookie(current)) return "kept";
  const value = firstTouch ? serializeFirstTouchCookie(firstTouch) : null;
  if (!value) {
    if (current !== null) jar.write(firstTouchDeleteCookie(jar.secure));
    return "no_first_touch";
  }
  jar.write(firstTouchSetCookie(value, jar.secure));
  return "written";
}

export function browserCookieJar(): CookieJar | null {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return null;
  }
  return {
    read: () => document.cookie,
    write: (cookie) => {
      document.cookie = cookie;
    },
    secure: window.location.protocol === "https:",
  };
}
