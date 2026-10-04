import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@vercel/analytics", () => ({ track: vi.fn() }));

import { track as vercelTrack } from "@vercel/analytics";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONSENT_STORAGE_KEY,
  SITE_EVENTS,
  recordCookieConsentChoice,
  track,
} from "@/lib/analytics/site-events";

type TestWindow = {
  dataLayer?: unknown[];
  __tcEvents?: Array<{ event: string; props: Record<string, unknown> }>;
  localStorage: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void };
};

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  const win: TestWindow = {
    localStorage: {
      getItem: (k) => storage.get(k) ?? null,
      setItem: (k, v) => void storage.set(k, v),
      removeItem: (k) => void storage.delete(k),
    },
  };
  (globalThis as unknown as { window: TestWindow }).window = win;
  vi.mocked(vercelTrack).mockClear();
});

afterEach(() => {
  delete (globalThis as unknown as { window?: TestWindow }).window;
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("typed track()", () => {
  it("names the thirteen funnel events and the two measurement events", () => {
    // 13 funnel events, plus cookie_consent_choice and primary_cta_clicked
    // (go-to-market audit 2026-10, rows P1-52 and P2-115), plus the six
    // funnel-leak events (docs/funnel-leaks-plan.md).
    expect(SITE_EVENTS).toHaveLength(21);
    expect(new Set(SITE_EVENTS).size).toBe(SITE_EVENTS.length);
    expect(SITE_EVENTS).toContain("checkout_completed");
    expect(SITE_EVENTS.slice(13, 15)).toEqual(["cookie_consent_choice", "primary_cta_clicked"]);
    expect(SITE_EVENTS.slice(15)).toEqual([
      "memo_requested",
      "memo_sent",
      "sequence_email_sent",
      "upgrade_nudge_shown",
      "upgrade_nudge_clicked",
      "trial_offer_redeemed",
    ]);
  });

  it("buffers the event for tests and reaches Vercel, but keeps GTM dark without consent", async () => {
    track("analysis_started", { source: "hero", input_type: "address" });
    await flush();
    const win = (globalThis as unknown as { window: TestWindow }).window;
    expect(win.__tcEvents).toEqual([
      expect.objectContaining({ event: "analysis_started", props: { source: "hero", input_type: "address" } }),
    ]);
    expect(win.dataLayer).toBeUndefined();
    expect(vercelTrack).toHaveBeenCalledWith("analysis_started", { source: "hero", input_type: "address" });
  });

  it("pushes to dataLayer only after the visitor granted consent, and never forwards nulls", async () => {
    storage.set(CONSENT_STORAGE_KEY, "granted");
    track("analysis_completed", { verdict: "Solid", has_ceiling: true });
    await flush();
    const win = (globalThis as unknown as { window: TestWindow }).window;
    expect(win.dataLayer).toEqual([{ event: "analysis_completed", verdict: "Solid", has_ceiling: true }]);

    storage.set(CONSENT_STORAGE_KEY, "denied");
    track("deal_saved", { property_type: undefined });
    await flush();
    expect(win.dataLayer).toHaveLength(1);
    expect(win.__tcEvents?.at(-1)).toEqual(expect.objectContaining({ event: "deal_saved", props: {} }));
  });

  it("is a no-op during server rendering", () => {
    delete (globalThis as unknown as { window?: TestWindow }).window;
    expect(() => track("sample_viewed", { source: "hero" })).not.toThrow();
  });
});

/**
 * Go-to-market audit 2026-10, row P1-52: the banner choice was recorded
 * nowhere, so the share of visitors the consent-gated Google tags can see was
 * unknown.
 */
describe("cookie banner choice", () => {
  const win = () => (globalThis as unknown as { window: TestWindow }).window;

  it("counts Accept through Vercel and, because consent is now granted, dataLayer", async () => {
    storage.set(CONSENT_STORAGE_KEY, "granted");
    expect(recordCookieConsentChoice()).toBe("granted");
    await flush();
    expect(vercelTrack).toHaveBeenCalledTimes(1);
    expect(vercelTrack).toHaveBeenCalledWith("cookie_consent_choice", { choice: "granted" });
    expect(win().dataLayer).toEqual([{ event: "cookie_consent_choice", choice: "granted" }]);
  });

  it("counts Reject through cookieless Vercel only: nothing reaches dataLayer", async () => {
    storage.set(CONSENT_STORAGE_KEY, "denied");
    expect(recordCookieConsentChoice()).toBe("denied");
    await flush();
    expect(vercelTrack).toHaveBeenCalledTimes(1);
    expect(vercelTrack).toHaveBeenCalledWith("cookie_consent_choice", { choice: "denied" });
    expect(win().dataLayer).toBeUndefined();
    expect(win().__tcEvents).toEqual([
      expect.objectContaining({ event: "cookie_consent_choice", props: { choice: "denied" } }),
    ]);
  });

  it("sends nothing while no decision is stored", async () => {
    expect(recordCookieConsentChoice()).toBeNull();
    storage.set(CONSENT_STORAGE_KEY, "maybe");
    expect(recordCookieConsentChoice()).toBeNull();
    await flush();
    expect(vercelTrack).not.toHaveBeenCalled();
    expect(win().__tcEvents).toBeUndefined();
    expect(win().dataLayer).toBeUndefined();
  });

  it("is wired to the banner's decision event, and only where Vercel Analytics runs", () => {
    const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
    const vercel = read("components/analytics/vercel-analytics.tsx");
    const listener = vercel.slice(vercel.indexOf("const onChoice"), vercel.indexOf("if (!pathname || disabledForDocument) return null;"));
    expect(listener).toContain("recordCookieConsentChoice();");
    expect(listener).toContain("window.addEventListener(COOKIE_CONSENT_EVENT, onChoice)");
    expect(listener).toContain("window.removeEventListener(COOKIE_CONSENT_EVENT, onChoice)");
    expect(vercel).toMatch(/useEffect\(\(\) => \{\s+if \(disabledForDocument\) return;\s+const onChoice/);

    // The event name the component listens for is the one the banner
    // dispatches, and the banner dispatches it only from its two handlers,
    // after it has stored the decision.
    const hook = read("lib/use-cookie-banner.ts");
    expect(hook).toContain("export const COOKIE_CONSENT_EVENT = CONSENT_EVENT;");
    expect(hook).toContain("window.dispatchEvent(new Event(CONSENT_EVENT))");
    const banner = read("components/marketing/cookie-consent-banner.tsx");
    expect(banner.match(/notifyCookieConsentChanged\(\);/g)).toHaveLength(2);
    for (const handler of ["handleAccept", "handleReject"]) {
      const start = banner.indexOf(`const ${handler} = () => {`);
      const body = banner.slice(start, banner.indexOf("  };", start));
      expect(body.indexOf("writeStoredConsent("), handler).toBeGreaterThan(0);
      expect(body.indexOf("notifyCookieConsentChanged();"), handler).toBeGreaterThan(
        body.indexOf("writeStoredConsent("),
      );
    }
  });
});

/**
 * Row P2-115: every click event was PostHog-only and PostHog has no key in
 * production, so the funnel had no click step at all.
 */
describe("primary CTA clicks", () => {
  it("reaches Vercel with the control's name and nothing else", async () => {
    track("primary_cta_clicked", { source: "content_inline_cta" });
    await flush();
    expect(vercelTrack).toHaveBeenCalledWith("primary_cta_clicked", { source: "content_inline_cta" });
  });

  it("fires beside homepage_primary_cta at every call site", () => {
    const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
    for (const [path, expected] of [
      ["components/marketing/hero-address-form.tsx", 2],
      ["components/marketing/sticky-conversion-bar.tsx", 1],
      ["components/marketing/analyze-cta-link.tsx", 1],
      ["components/marketing/scroll-to-form-button.tsx", 1],
    ] as const) {
      const source = read(path);
      expect(source.match(/trackEvent\("homepage_primary_cta"/g) ?? [], path).toHaveLength(expected);
      expect(source.match(/track\("primary_cta_clicked"/g) ?? [], path).toHaveLength(expected);
    }
  });

  it("counts one hero sample click once: only /analyze?sample=1 sends sample_viewed", () => {
    // Row P2-110: the hero link sent sample_viewed on click and the analyzer
    // entry sent it again on mount, so hero traffic was counted twice.
    const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
    expect(read("components/marketing/hero-address-form.tsx")).not.toContain('track("sample_viewed"');
    const entry = read("components/marketing/analyze-entry-from-query.tsx");
    expect(entry.match(/track\("sample_viewed", \{ source: "link" \}\)/g)).toHaveLength(1);
  });

  it("fires beside the PostHog event on the content pages' analyzer button", () => {
    const link = readFileSync(join(process.cwd(), "components/analytics/tracked-content-cta-link.tsx"), "utf8");
    expect(link).toContain('trackEvent("content_cta_clicked", {');
    expect(link).toContain('track("primary_cta_clicked", { source: `content_${referralSource}` });');
    expect(link).toContain('referralSource: "inline_cta" | "sticky_cta";');
  });
});
