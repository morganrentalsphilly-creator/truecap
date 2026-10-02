import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  FIRST_TOUCH_COOKIE,
  FIRST_TOUCH_COOKIE_MAX_AGE_SECONDS,
  FIRST_TOUCH_REFERRAL_SOURCES,
  LANDING_SECTIONS,
  AD_CLICK_ID_PARAMS,
  classifyFirstTouchReferralSource,
  hasAdClickId,
  landingSection,
  parseFirstTouchCookie,
  serializeFirstTouchCookie,
  syncFirstTouchCookie,
  type CookieJar,
} from "@/lib/first-touch";

/**
 * First-touch attribution (founder decision 2026-09-27: "Coarse, private. A
 * consent-gated cookie holding a source category and a landing SECTION").
 * The properties that matter: only two enum tokens ever reach the cookie, it
 * is never written before a `granted` decision, it is deleted on any other
 * decision, and a sign-in round trip is never counted as organic search.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/**
 * A `document.cookie` stand-in with the browser's semantics for one host:
 * a write sets or (Max-Age=0) deletes one cookie; a read lists name=value.
 */
function fakeJar(secure = true): CookieJar & { writes: string[]; store: Map<string, string> } {
  const store = new Map<string, string>();
  const writes: string[] = [];
  return {
    store,
    writes,
    secure,
    read: () => [...store.entries()].map(([name, value]) => `${name}=${value}`).join("; "),
    write: (cookie: string) => {
      writes.push(cookie);
      const [pair, ...attributes] = cookie.split(/;\s*/);
      const eq = pair.indexOf("=");
      const name = pair.slice(0, eq);
      if (attributes.some((a) => a.toLowerCase() === "max-age=0")) store.delete(name);
      else store.set(name, pair.slice(eq + 1));
    },
  };
}

const classify = (referrerHost: string, campaignMedium = "", adClick = false) =>
  classifyFirstTouchReferralSource({ referrerHost, currentHost: "usetruecap.com", campaignMedium, adClick });

describe("classifyFirstTouchReferralSource", () => {
  it("never counts a Google or Supabase sign-in round trip as organic search", () => {
    // The OAuth return lands on `next` with the account chooser as referrer.
    for (const host of ["accounts.google.com", "accounts.google.co.uk", "myaccount.google.com", "accounts.youtube.com", "abcdefgh.supabase.co"]) {
      expect(classify(host), host).toBeNull();
    }
    // Even when the return URL happens to carry a campaign parameter.
    expect(classify("accounts.google.com", "cpc")).toBeNull();
  });

  it("classifies webmail (including the Gmail app) as email, not search", () => {
    for (const host of ["mail.google.com", "com.google.android.gm", "mail.yahoo.com", "outlook.live.com", "outlook.office.com", "outlook.office365.com"]) {
      expect(classify(host), host).toBe("email");
    }
  });

  it("keeps the existing taxonomy for real search, AI, social and campaign traffic", () => {
    expect(classify("www.google.com")).toBe("organic_search");
    expect(classify("www.google.co.uk")).toBe("organic_search");
    expect(classify("com.google.android.googlequicksearchbox")).toBe("organic_search");
    expect(classify("www.bing.com")).toBe("organic_search");
    expect(classify("search.yahoo.com")).toBe("organic_search");
    expect(classify("duckduckgo.com")).toBe("organic_search");
    expect(classify("chatgpt.com")).toBe("organic_ai");
    expect(classify("www.perplexity.ai")).toBe("organic_ai");
    expect(classify("www.reddit.com")).toBe("organic_social");
    expect(classify("biggerpockets.com")).toBe("external_referral");
    expect(classify("")).toBe("direct");
    expect(classify("usetruecap.com")).toBe("direct");
    expect(classify("www.google.com", "cpc")).toBe("paid_search");
    expect(classify("", "paid_social")).toBe("paid_social");
    expect(classify("", "newsletter")).toBe("email");
    expect(classify("chatgpt.com", "organic")).toBe("organic_ai");
    expect(classify("", "organic")).toBe("organic_search");
    expect(classify("", "some-private-campaign-name")).toBe("campaign");
  });

  it("counts an auto-tagged ad click as paid search, never organic", () => {
    // TrueCap's Google Ads Final URLs carry no UTM parameters, so the click id
    // is the only thing that tells a paid google.com / bing.com visit apart.
    expect(classify("www.google.com", "", true)).toBe("paid_search");
    expect(classify("www.bing.com", "", true)).toBe("paid_search");
    expect(classify("", "", true)).toBe("paid_search");
    // An auto-tagged click is paid whatever a manual utm_medium claims.
    expect(classify("www.google.com", "organic", true)).toBe("paid_search");
    // A sign-in round trip is still not a landing.
    expect(classify("accounts.google.com", "", true)).toBeNull();
    // Without the flag nothing changes.
    expect(classify("www.google.com", "", false)).toBe("organic_search");
  });

  it("detects the ad platforms' click-id parameters by presence only", () => {
    const query = (search: string) => new URLSearchParams(search);
    expect(AD_CLICK_ID_PARAMS).toEqual(["gclid", "gbraid", "wbraid", "dclid", "msclkid"]);
    for (const search of ["gclid=Cj0KCQjw", "gbraid=0AAAAA", "wbraid=CjkKCQ", "dclid=CL7s", "msclkid=abc123", "utm_source=google&gclid="]) {
      expect(hasAdClickId(query(search)), search).toBe(true);
    }
    // fbclid is appended to organic Facebook links too, so it proves nothing.
    for (const search of ["", "utm_source=google&utm_medium=organic", "fbclid=IwAR", "GCLID=x", "ref=gclid"]) {
      expect(hasAdClickId(query(search)), search).toBe(false);
    }
    expect(hasAdClickId(null)).toBe(false);
    expect(hasAdClickId(undefined)).toBe(false);
  });

  it("is the one classifier (the provider has none of its own)", () => {
    const provider = read("components/analytics/posthog-provider.tsx");
    expect(provider).not.toMatch(/function classifyFirstTouchReferralSource/);
    expect(provider).not.toContain("SEARCH_REFERRER_RE");
    expect(provider).not.toContain("classifyFirstTouchReferralSource");
    const analytics = read("lib/analytics.ts");
    expect(analytics).not.toMatch(/function classifyFirstTouchReferralSource/);
    expect(analytics).toContain("classifyFirstTouchReferralSource,");
    expect(analytics).toContain('from "@/lib/first-touch"');
  });
});

describe("landingSection", () => {
  it.each([
    ["/", "home"],
    ["", "home"],
    ["/?utm_source=x", "home"],
    ["/blog", "blog"],
    ["/blog/", "blog"],
    ["/blog/what-is-a-good-cap-rate", "blog"],
    ["/tools/cap-rate-calculator", "tools"],
    ["/markets/philadelphia/brrrr", "markets"],
    ["/states/pennsylvania", "states"],
    ["/glossary/noi", "glossary"],
    ["/vs/dealcheck", "vs"],
    ["/pricing", "pricing"],
    ["/analyze", "analyze"],
    ["/for-agents", "for_agents"],
    ["/for-agents?gclid=TEST_AUDIT_ONLY_DO_NOT_COUNT", "for_agents"],
    ["/For-Agents/", "for_agents"],
    ["/for-investors", "for_investors"],
    ["/for-investors#pricing", "for_investors"],
    // Only the real, hyphenated paths map: the underscore names are section
    // tokens, not routes, and the other persona pages stay in "other".
    ["/for_agents", "other"],
    ["/for_investors", "other"],
    ["/for-house-hackers", "other"],
    ["/for-buy-and-hold", "other"],
    ["/for-agents-and-brokers", "other"],
    ["/Blog/Upper-Case", "blog"],
    ["/home", "other"],
    ["/other", "other"],
    ["/home-authed", "other"],
    ["/auth/sign-up", "other"],
    ["/s/opaque-share-token", "other"],
    ["/dashboard/saved-analyses/123", "other"],
    ["/blogger", "other"],
  ])("%s → %s", (path, section) => {
    expect(landingSection(path)).toBe(section);
  });
});

/**
 * Go-to-market audit 2026-10, row P2-112: a paid click to /for-agents was
 * stored as paid_search.other. The two persona pages ads point at get their
 * own sections, under names the cookie value pattern accepts.
 */
describe("the agent and investor landing pages", () => {
  it("pins the section list", () => {
    expect([...LANDING_SECTIONS]).toEqual([
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
    ]);
  });

  it.each([
    ["/for-agents?gclid=TEST_AUDIT_ONLY_DO_NOT_COUNT", "paid_search", "paid_search.for_agents"],
    ["/for-investors?utm_medium=cpc", "paid_search", "paid_search.for_investors"],
    ["/for-investors", "external_referral", "external_referral.for_investors"],
  ] as const)("%s as %s is stored as %s and read back", (path, source, cookie) => {
    const section = landingSection(path);
    const value = serializeFirstTouchCookie({ source, section });
    expect(value).toBe(cookie);
    expect(parseFirstTouchCookie(value)).toEqual({ source, section });
  });

  it("never stores the hyphenated path segment", () => {
    for (const raw of ["for-agents", "for-investors"]) {
      expect(LANDING_SECTIONS as readonly string[]).not.toContain(raw);
      expect(serializeFirstTouchCookie({ source: "paid_search", section: raw })).toBeNull();
      expect(parseFirstTouchCookie(`paid_search.${raw}`)).toBeNull();
    }
  });

  it("keeps every token inside the cookie pattern's limits", () => {
    // COOKIE_VALUE_RE: source up to 24 lower-case letters or underscores,
    // section up to 16; a longer or hyphenated token would never parse.
    for (const section of LANDING_SECTIONS) expect(section).toMatch(/^[a-z_]{1,16}$/);
    for (const source of FIRST_TOUCH_REFERRAL_SOURCES) expect(source).toMatch(/^[a-z_]{1,24}$/);
    const longest = Math.max(
      ...FIRST_TOUCH_REFERRAL_SOURCES.flatMap((source) =>
        LANDING_SECTIONS.map((section) => `${source}.${section}`.length),
      ),
    );
    expect(longest).toBe("external_referral.for_investors".length);
    expect(longest).toBeLessThanOrEqual(40);
  });
});

describe("tc_ft serializer and parser", () => {
  it("round-trips every source × section pair", () => {
    for (const source of FIRST_TOUCH_REFERRAL_SOURCES) {
      for (const section of LANDING_SECTIONS) {
        const value = serializeFirstTouchCookie({ source, section });
        expect(value).toBe(`${source}.${section}`);
        expect(parseFirstTouchCookie(value)).toEqual({ source, section });
      }
    }
  });

  it("serializes nothing that is not two enum tokens", () => {
    expect(serializeFirstTouchCookie({ source: "google_oauth", section: "blog" })).toBeNull();
    expect(serializeFirstTouchCookie({ source: "organic_search", section: "/blog/x" })).toBeNull();
    expect(serializeFirstTouchCookie({ source: "https://www.google.com/search?q=x", section: "home" })).toBeNull();
    expect(serializeFirstTouchCookie({ source: undefined, section: "home" })).toBeNull();
    expect(serializeFirstTouchCookie({ source: "direct", section: null })).toBeNull();
  });

  it.each([
    ["unknown source", "google_oauth.blog"],
    ["unknown section", "organic_search.careers"],
    ["raw path as section", "organic_search./blog/x"],
    ["uppercase", "Organic_Search.blog"],
    ["no dot", "organic_search"],
    ["two dots", "organic_search.blog.extra"],
    ["empty halves", "."],
    ["empty section", "organic_search."],
    ["whitespace", " organic_search.blog"],
    ["attribute injection", "organic_search.blog; Domain=evil.example"],
    ["percent-encoded", "organic_search%2Eblog"],
    ["over-long", `organic_search.${"a".repeat(64)}`],
    ["email", "someone@example.com"],
    ["empty", ""],
  ])("rejects %s", (_label, raw) => {
    expect(parseFirstTouchCookie(raw)).toBeNull();
  });

  it.each([[undefined], [null], [42], [{ source: "direct", section: "home" }], [["direct.home"]]])(
    "rejects non-string %j",
    (raw) => {
      expect(parseFirstTouchCookie(raw)).toBeNull();
    },
  );
});

describe("syncFirstTouchCookie consent gating", () => {
  const firstTouch = { source: "organic_search", section: "blog" } as const;

  it("writes nothing before the visitor decides, or after a rejection", () => {
    for (const consent of [null, "denied"] as const) {
      const jar = fakeJar();
      expect(syncFirstTouchCookie({ consent, firstTouch, jar })).toBe("absent");
      expect(jar.writes).toEqual([]);
      expect(jar.store.has(FIRST_TOUCH_COOKIE)).toBe(false);
    }
  });

  it("writes the two tokens after a grant: 90 days, Path=/, SameSite=Lax, Secure on https", () => {
    const jar = fakeJar(true);
    expect(syncFirstTouchCookie({ consent: "granted", firstTouch, jar })).toBe("written");
    expect(jar.writes).toEqual([
      `tc_ft=organic_search.blog; Max-Age=${90 * 24 * 60 * 60}; Path=/; SameSite=Lax; Secure`,
    ]);
    expect(FIRST_TOUCH_COOKIE_MAX_AGE_SECONDS).toBe(7_776_000);
    expect(jar.store.get("tc_ft")).toBe("organic_search.blog");

    const http = fakeJar(false);
    syncFirstTouchCookie({ consent: "granted", firstTouch, jar: http });
    expect(http.writes[0]).not.toContain("Secure");
  });

  it("keeps the first touch: a later landing never overwrites a valid cookie", () => {
    const jar = fakeJar();
    syncFirstTouchCookie({ consent: "granted", firstTouch, jar });
    expect(syncFirstTouchCookie({ consent: "granted", firstTouch: { source: "paid_search", section: "pricing" }, jar })).toBe("kept");
    expect(jar.writes).toHaveLength(1);
    expect(jar.store.get("tc_ft")).toBe("organic_search.blog");
  });

  it("replaces a tampered value, and writes nothing without a first touch", () => {
    const jar = fakeJar();
    jar.store.set("tc_ft", "google_oauth.blog");
    expect(syncFirstTouchCookie({ consent: "granted", firstTouch, jar })).toBe("written");
    expect(jar.store.get("tc_ft")).toBe("organic_search.blog");

    const empty = fakeJar();
    expect(syncFirstTouchCookie({ consent: "granted", firstTouch: null, jar: empty })).toBe("no_first_touch");
    expect(empty.writes).toEqual([]);
  });

  it("deletes the cookie when consent is revoked or no longer stored", () => {
    for (const consent of ["denied", null] as const) {
      const jar = fakeJar();
      syncFirstTouchCookie({ consent: "granted", firstTouch, jar });
      expect(syncFirstTouchCookie({ consent, firstTouch, jar })).toBe("deleted");
      expect(jar.writes.at(-1)).toBe("tc_ft=; Max-Age=0; Path=/; SameSite=Lax; Secure");
      expect(jar.store.has("tc_ft")).toBe(false);
    }
  });

  it("leaves other cookies alone", () => {
    const jar = fakeJar();
    jar.store.set("sb-project-auth-token", "session");
    syncFirstTouchCookie({ consent: "granted", firstTouch, jar });
    syncFirstTouchCookie({ consent: "denied", firstTouch, jar });
    expect(jar.store.get("sb-project-auth-token")).toBe("session");
    expect(jar.writes.every((cookie) => cookie.startsWith("tc_ft="))).toBe(true);
  });
});

describe("the browser wiring (lib/analytics.ts + banner + provider)", () => {
  let session: Map<string, string>;
  let jar: ReturnType<typeof fakeJar>;
  /** The banner's stored decision (localStorage truecap_cookie_consent_v1). */
  let storedConsent: string | null;

  beforeEach(() => {
    session = new Map();
    jar = fakeJar(true);
    storedConsent = null;
    vi.stubGlobal("window", {
      location: { protocol: "https:", hostname: "usetruecap.com" },
      localStorage: {
        getItem: (key: string) => (key === "truecap_cookie_consent_v1" ? storedConsent : null),
        setItem: () => undefined,
        removeItem: () => undefined,
      },
      sessionStorage: {
        getItem: (key: string) => session.get(key) ?? null,
        setItem: (key: string, value: string) => session.set(key, value),
        removeItem: (key: string) => session.delete(key),
      },
    });
    vi.stubGlobal("document", {
      get cookie() {
        return jar.read();
      },
      set cookie(value: string) {
        jar.write(value);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function analytics() {
    vi.resetModules();
    return import("@/lib/analytics");
  }

  it("sets tc_ft from the tab's first touch only once consent is granted, and deletes it on rejection", async () => {
    const a = await analytics();
    a.setFirstTouchAttribution({ referral_source: "organic_ai", landing_section: "tools" });
    expect(JSON.parse(session.get("truecap_first_touch_attribution_v1") ?? "{}")).toEqual({
      referral_source: "organic_ai",
      landing_section: "tools",
    });

    expect(a.syncFirstTouchCookieWithConsent(null)).toBe("absent");
    expect(jar.store.has("tc_ft")).toBe(false);

    expect(a.syncFirstTouchCookieWithConsent("granted")).toBe("written");
    expect(jar.store.get("tc_ft")).toBe("organic_ai.tools");

    expect(a.syncFirstTouchCookieWithConsent("denied")).toBe("deleted");
    expect(jar.store.has("tc_ft")).toBe(false);
  });

  it("writes no cookie for a session record without a landing section or with tampered values", async () => {
    const a = await analytics();
    session.set("truecap_first_touch_attribution_v1", JSON.stringify({ referral_source: "organic_search" }));
    expect(a.syncFirstTouchCookieWithConsent("granted")).toBe("no_first_touch");
    session.set(
      "truecap_first_touch_attribution_v1",
      JSON.stringify({ referral_source: "organic_search", landing_section: "/blog/private-slug" }),
    );
    expect(a.syncFirstTouchCookieWithConsent("granted")).toBe("no_first_touch");
    expect(jar.writes).toEqual([]);
  });

  it("stores only the two enum values, whatever else a caller passes", async () => {
    const a = await analytics();
    a.setFirstTouchAttribution({
      referral_source: "organic_search",
      landing_section: "blog",
      ...({ landing_page: "/blog/private", referrer_host: "private.example" } as object),
    });
    expect(JSON.parse(session.get("truecap_first_touch_attribution_v1") ?? "{}")).toEqual({
      referral_source: "organic_search",
      landing_section: "blog",
    });
  });

  const SESSION_KEY = "truecap_first_touch_attribution_v1";
  const landing = (overrides: Partial<{ referrer: string; pathname: string; search: string }> = {}) => ({
    referrer: overrides.referrer ?? "https://www.google.com/",
    currentHost: "usetruecap.com",
    query: new URLSearchParams(overrides.search ?? ""),
    pathname: overrides.pathname ?? "/blog/what-is-a-good-cap-rate",
  });

  it("a visitor who consented earlier gets tc_ft on a single landing (record before sync)", async () => {
    // Everyone who accepted before tc_ft existed, or whose 90 days ran out:
    // consent is already `granted` and there is no cookie. The provider runs
    // this once per document, so the landing itself must write the cookie.
    storedConsent = "granted";
    const a = await analytics();
    expect(a.recordFirstTouchLanding(landing())).toBe("organic_search");
    expect(jar.store.get("tc_ft")).toBe("organic_search.blog");
    expect(jar.writes).toHaveLength(1);
  });

  it("before a decision: records the tab's first touch, writes no cookie; accepting later writes it", async () => {
    const a = await analytics();
    expect(a.recordFirstTouchLanding(landing({ referrer: "https://chatgpt.com/c/x", pathname: "/tools/dscr-calculator" }))).toBe("organic_ai");
    expect(JSON.parse(session.get(SESSION_KEY) ?? "{}")).toEqual({ referral_source: "organic_ai", landing_section: "tools" });
    expect(jar.writes).toEqual([]);
    // The banner's Accept on a later page.
    expect(a.syncFirstTouchCookieWithConsent("granted")).toBe("written");
    expect(jar.store.get("tc_ft")).toBe("organic_ai.tools");
  });

  it("after an explicit Reject: stores nothing at all, not even for the tab", async () => {
    storedConsent = "denied";
    const a = await analytics();
    expect(a.recordFirstTouchLanding(landing())).toBe("organic_search");
    expect(session.has(SESSION_KEY)).toBe(false);
    expect(jar.writes).toEqual([]);
  });

  it("the banner's Reject clears the record kept before the decision", async () => {
    const a = await analytics();
    a.recordFirstTouchLanding(landing());
    expect(session.has(SESSION_KEY)).toBe(true);
    expect(a.syncFirstTouchCookieWithConsent("denied")).toBe("absent");
    expect(session.has(SESSION_KEY)).toBe(false);
  });

  it("an auto-tagged ad click is recorded as paid search, and the click id value goes nowhere", async () => {
    storedConsent = "granted";
    const a = await analytics();
    const source = a.recordFirstTouchLanding(
      landing({ pathname: "/tools/cap-rate-calculator", search: "gclid=Cj0KCQjw-private-click-id" }),
    );
    expect(source).toBe("paid_search");
    expect(jar.store.get("tc_ft")).toBe("paid_search.tools");
    expect(session.get(SESSION_KEY)).toBe(JSON.stringify({ referral_source: "paid_search", landing_section: "tools" }));
    expect(JSON.stringify([...session.values(), ...jar.writes])).not.toContain("Cj0K");
  });

  it("a sign-in round trip records nothing and never overwrites the real first touch", async () => {
    storedConsent = "granted";
    const a = await analytics();
    a.recordFirstTouchLanding(landing({ referrer: "https://www.bing.com/", pathname: "/glossary/noi" }));
    expect(a.recordFirstTouchLanding(landing({ referrer: "https://accounts.google.com/", pathname: "/pricing" }))).toBeNull();
    expect(JSON.parse(session.get(SESSION_KEY) ?? "{}")).toEqual({ referral_source: "organic_search", landing_section: "glossary" });
    expect(jar.store.get("tc_ft")).toBe("organic_search.glossary");
  });

  it("the banner applies each decision; the provider leaves the landing order to recordFirstTouchLanding", () => {
    const banner = read("components/marketing/cookie-consent-banner.tsx");
    const accept = banner.slice(banner.indexOf("const handleAccept"), banner.indexOf("const handleReject"));
    const reject = banner.slice(banner.indexOf("const handleReject"), banner.indexOf("// Suppress entirely"));
    expect(accept).toContain('syncFirstTouchCookieWithConsent("granted")');
    expect(reject).toContain('syncFirstTouchCookieWithConsent("denied")');
    expect(reject).not.toContain('"granted"');

    const provider = read("components/analytics/posthog-provider.tsx");
    expect(provider).toContain("recordFirstTouchLanding({");
    expect(provider).toContain("query: searchParams,");
    // The order (record, then sync) is recordFirstTouchLanding's, tested above.
    expect(provider).not.toContain("setFirstTouchAttribution(");
    expect(provider).not.toContain("syncFirstTouchCookieWithConsent(");
    // A sign-in round trip fires no organic_landing.
    expect(provider).toContain("if (referralSource === null) return;");
  });
});
