import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The footer's "Cookie choices" control (go-to-market audit, rows P2-111 and
 * P2-124). Before it, a stored cookie choice could never be changed: the
 * banner stored Accept, Reject, the X and Escape alike and never came back.
 *
 * One click must clear the stored choice, push a denied consent update,
 * delete the Google Ads `_gcl_*` cookies and `tc_ft`, and reopen the banner.
 * It must not record a choice of its own.
 */

const analytics = vi.hoisted(() => ({
  setAnalyticsConsent: vi.fn(),
  syncFirstTouchCookieWithConsent: vi.fn(),
}));
vi.mock("@/lib/analytics", () => analytics);

import {
  CookieChoicesButton,
  resetCookieChoice,
} from "@/components/marketing/cookie-choices-button";
import {
  COOKIE_CHOICE_RESET_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
} from "@/components/marketing/cookie-consent-banner";
import { COOKIE_CONSENT_EVENT } from "@/lib/use-cookie-banner";
import { SiteFooter } from "@/components/marketing/site-footer";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

function fakeBrowser(cookies: Record<string, string>, hostname = "www.usetruecap.com") {
  const storage = new Map<string, string>([[COOKIE_CONSENT_STORAGE_KEY, "granted"]]);
  const jar = new Map(Object.entries(cookies));
  const writes: string[] = [];
  const events: string[] = [];
  const gtag = vi.fn();
  const win = {
    localStorage: {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => void storage.set(k, v),
      removeItem: (k: string) => void storage.delete(k),
    },
    location: { hostname },
    gtag,
    dispatchEvent: (event: Event) => {
      events.push(event.type);
      return true;
    },
  };
  const doc = {
    get cookie() {
      return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
    },
    set cookie(value: string) {
      writes.push(value);
      const name = value.slice(0, value.indexOf("="));
      if (/Max-Age=0/.test(value)) jar.delete(name);
    },
  };
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", doc);
  return { storage, jar, writes, events, gtag };
}

describe("resetCookieChoice", () => {
  beforeEach(() => {
    analytics.setAnalyticsConsent.mockClear();
    analytics.syncFirstTouchCookieWithConsent.mockClear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("clears the stored choice and withdraws consent", () => {
    const browser = fakeBrowser({});
    resetCookieChoice();
    expect(browser.storage.has(COOKIE_CONSENT_STORAGE_KEY)).toBe(false);
    expect(browser.gtag).toHaveBeenCalledWith("consent", "update", {
      ad_storage: "denied",
      analytics_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    expect(analytics.setAnalyticsConsent).toHaveBeenCalledWith(false);
  });

  it("deletes tc_ft through its only writer, without recording a refusal", () => {
    fakeBrowser({});
    resetCookieChoice();
    // null deletes the cookie and keeps the tab's session record; "denied"
    // would be a choice the visitor has not made.
    expect(analytics.syncFirstTouchCookieWithConsent).toHaveBeenCalledTimes(1);
    expect(analytics.syncFirstTouchCookieWithConsent).toHaveBeenCalledWith(null);
  });

  it("expires every _gcl_ cookie on the host and the registrable domain, and no other cookie", () => {
    const browser = fakeBrowser({
      _gcl_au: "1.1.123.456",
      _gcl_aw: "GCL.1.abc",
      "sb-abc-auth-token": "session",
      other: "1",
    });
    resetCookieChoice();
    expect([...browser.jar.keys()].sort()).toEqual(["other", "sb-abc-auth-token"]);
    for (const name of ["_gcl_au", "_gcl_aw"]) {
      expect(browser.writes).toContain(`${name}=; Max-Age=0; Path=/; SameSite=Lax`);
      expect(browser.writes).toContain(
        `${name}=; Max-Age=0; Path=/; Domain=www.usetruecap.com; SameSite=Lax`,
      );
      expect(browser.writes).toContain(
        `${name}=; Max-Age=0; Path=/; Domain=usetruecap.com; SameSite=Lax`,
      );
    }
    expect(browser.writes.every((write) => write.startsWith("_gcl_"))).toBe(true);
  });

  it("writes no cookie when there is no Google Ads cookie", () => {
    const browser = fakeBrowser({ "sb-abc-auth-token": "session" });
    resetCookieChoice();
    expect(browser.writes).toEqual([]);
  });

  it("asks the banner to reopen, then lets the consent listeners re-read", () => {
    const browser = fakeBrowser({});
    resetCookieChoice();
    expect(browser.events).toEqual([COOKIE_CHOICE_RESET_EVENT, COOKIE_CONSENT_EVENT]);
    // The stored choice is already gone when the listeners run, so the
    // cookieless consent counter (recordCookieConsentChoice) sends nothing.
    expect(browser.storage.has(COOKIE_CONSENT_STORAGE_KEY)).toBe(false);
  });

  it("never throws when storage, cookies and gtag are all unavailable", () => {
    vi.stubGlobal("window", {
      get localStorage(): Storage {
        throw new Error("blocked");
      },
      location: { hostname: "localhost" },
      dispatchEvent: () => {
        throw new Error("blocked");
      },
    });
    vi.stubGlobal("document", {
      get cookie(): string {
        throw new Error("blocked");
      },
    });
    expect(() => resetCookieChoice()).not.toThrow();
  });
});

describe("the control and the banner", () => {
  it("renders one button, not a link, in the footer's legal row", () => {
    const html = renderToStaticMarkup(<SiteFooter />);
    const buttons = [...html.matchAll(/<button\b[^>]*>([^<]*)<\/button>/g)];
    expect(buttons.map((m) => m[1])).toEqual(["Cookie choices"]);
    expect(buttons[0][0]).toContain('type="button"');
    // DESIGN.md: a control is at least 44px.
    expect(buttons[0][0]).toMatch(/min-h-11[^"]*min-w-11/);
    expect(html.indexOf("Cookie choices")).toBeGreaterThan(html.indexOf('href="/terms"'));
    expect(renderToStaticMarkup(<CookieChoicesButton />)).toContain("Cookie choices");
  });

  it("the banner reopens on the reset event and on nothing else new", () => {
    const banner = read("components/marketing/cookie-consent-banner.tsx");
    expect(banner).toContain(
      'window.addEventListener(COOKIE_CHOICE_RESET_EVENT, reopen)',
    );
    expect(banner).toContain('const reopen = () => setDecision("pending");');
    // The X and Escape still count as Reject: whether they should leave the
    // choice unanswered is an open question for counsel, not decided here.
    expect(banner).toContain('aria-label="Dismiss (counts as reject)"');
  });

  it("/privacy says where to change the choice and what the control does", () => {
    const privacy = read("app/privacy/page.tsx").replace(/\s+/g, " ");
    expect(privacy).toContain(
      "Change your cookie choice: use Cookie choices in the site footer. It clears the stored choice, withdraws consent for Google measurement, deletes the Google Ads and first-touch cookies, and shows the banner again.",
    );
  });
});
