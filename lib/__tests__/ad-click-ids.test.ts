import { beforeAll, describe, expect, it, vi } from "vitest";

const initMock = vi.hoisted(() => vi.fn());

vi.mock("@sentry/nextjs", () => ({
  init: initMock,
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  captureRouterTransitionStart: vi.fn(),
}));
vi.mock("@vercel/analytics/next", () => ({ Analytics: () => null }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

import { sanitizeVercelAnalyticsEvent } from "@/components/analytics/vercel-analytics";
import {
  isAdClickIdParameter,
  stripAdClickIds,
  stripAdClickIdsFromBareQuery,
} from "@/lib/analytics/ad-click-ids";
import { AD_CLICK_ID_PARAMS, hasAdClickId } from "@/lib/first-touch";
import {
  hasSensitiveQueryParameter,
  shouldKeepThirdPartyTelemetryDisabled,
} from "@/lib/sensitive-url";
import { initSentryClient } from "@/lib/sentry/client-init";
import {
  stripAdClickIdsFromSentryEvent,
  stripAdClickIdsFromSentrySpan,
} from "@/lib/sentry/ad-click-ids";

const GCLID = "TEST_AUDIT_ONLY_DO_NOT_COUNT";

/**
 * Go-to-market audit 2026-10, row P2-108: after Reject, 6 of 12 Vercel bodies
 * and 12 of 17 Sentry envelopes still carried the landing URL's gclid.
 */
describe("stripAdClickIds", () => {
  it("removes each ad click id and keeps utm_* and everything else byte for byte", () => {
    const cases: Array<[string, string]> = [
      [`https://usetruecap.com/?gclid=${GCLID}`, "https://usetruecap.com/"],
      [`https://usetruecap.com/?gclid=${GCLID}#pricing`, "https://usetruecap.com/#pricing"],
      [`/for-agents?gclid=${GCLID}&utm_source=google&utm_medium=cpc`, "/for-agents?utm_source=google&utm_medium=cpc"],
      [`/for-agents?utm_source=google&gclid=${GCLID}`, "/for-agents?utm_source=google"],
      [`/?utm_source=a%20b&gclid=${GCLID}&utm_campaign=x+y&ref=%2Fhome`, "/?utm_source=a%20b&utm_campaign=x+y&ref=%2Fhome"],
      [`/?gclid=1&gbraid=2&wbraid=3&dclid=4&msclkid=5`, "/"],
      [`/?gclid=1&gbraid=2&utm_term=dscr&wbraid=3`, "/?utm_term=dscr"],
      [`/?GCLID=${GCLID}&Gbraid=x`, "/"],
      [`?gclid=${GCLID}&utm_source=google`, "?utm_source=google"],
      [`/?gclid=`, "/"],
    ];
    for (const [input, expected] of cases) {
      expect(stripAdClickIds(input), input).toBe(expected);
    }
    for (const name of AD_CLICK_ID_PARAMS) {
      expect(stripAdClickIds(`/pricing?${name}=abc123&utm_medium=cpc`), name).toBe("/pricing?utm_medium=cpc");
      expect(isAdClickIdParameter(name)).toBe(true);
    }
  });

  it("returns a string with no click id exactly as it was", () => {
    for (const untouched of [
      "",
      "/",
      "https://usetruecap.com/pricing",
      "/analyze?sample=1",
      "/?utm_source=google&utm_medium=cpc&utm_campaign=agents#faq",
      "/?fbclid=IwAR123",
      "/?ref=gclid",
      "/?mygclid=1&gclidx=2",
      "/blog/what-is-a-gclid",
      "gclid is a Google Ads parameter",
    ]) {
      expect(stripAdClickIds(untouched), untouched).toBe(untouched);
    }
    expect(isAdClickIdParameter("utm_source")).toBe(false);
    expect(isAdClickIdParameter("fbclid")).toBe(false);
  });

  it("finds the query inside a sentence, as breadcrumbs and span descriptions carry it", () => {
    expect(stripAdClickIds(`GET /?gclid=${GCLID}&_rsc=1abcd`)).toBe("GET /?_rsc=1abcd");
    expect(
      stripAdClickIds(`Navigated from "https://usetruecap.com/?gclid=${GCLID}" to "/pricing?gclid=${GCLID}&utm_medium=cpc"`),
    ).toBe('Navigated from "https://usetruecap.com/" to "/pricing?utm_medium=cpc"');
  });

  it("filters a bare query string too", () => {
    expect(stripAdClickIdsFromBareQuery(`gclid=${GCLID}&utm_medium=cpc`)).toBe("utm_medium=cpc");
    expect(stripAdClickIdsFromBareQuery(`?gclid=${GCLID}&utm_medium=cpc`)).toBe("?utm_medium=cpc");
    expect(stripAdClickIdsFromBareQuery(`gclid=${GCLID}`)).toBe("");
    expect(stripAdClickIdsFromBareQuery("utm_medium=cpc")).toBe("utm_medium=cpc");
  });
});

describe("a gclid landing keeps measurement on", () => {
  it("is not a sensitive parameter: the scripts still load and the first touch is still paid", () => {
    // The row's warning. Adding the names to SENSITIVE_QUERY_PARAMETER_NAMES
    // would switch Google, Vercel and PostHog off on every paid landing.
    for (const name of AD_CLICK_ID_PARAMS) {
      const landing = `/for-agents?${name}=abc123`;
      expect(hasSensitiveQueryParameter(landing), name).toBe(false);
      expect(shouldKeepThirdPartyTelemetryDisabled(landing, false), name).toBe(false);
      expect(hasAdClickId(new URLSearchParams(`${name}=abc123`)), name).toBe(true);
    }
  });
});

describe("Vercel Web Analytics beforeSend", () => {
  it("sends the landing URL without the click id, with utm_* intact", () => {
    const pageview = sanitizeVercelAnalyticsEvent({
      type: "pageview",
      url: `https://usetruecap.com/for-agents?gclid=${GCLID}&utm_source=google&utm_medium=cpc`,
    });
    expect(pageview).toEqual({
      type: "pageview",
      url: "https://usetruecap.com/for-agents?utm_source=google&utm_medium=cpc",
    });

    const event = sanitizeVercelAnalyticsEvent({
      type: "event",
      url: `https://usetruecap.com/?gclid=${GCLID}`,
    });
    expect(event.url).toBe("https://usetruecap.com/");
  });

  it("still removes credentials and deal inputs first", () => {
    const sanitized = sanitizeVercelAnalyticsEvent({
      type: "pageview",
      url: `https://usetruecap.com/?pdf_claim=secret&price=325000&gclid=${GCLID}&utm_source=ad`,
    });
    expect(sanitized.url).toBe("https://usetruecap.com/?utm_source=ad");
  });
});

describe("browser Sentry payloads", () => {
  it("strips the click id from every URL-bearing field of an event", () => {
    const event = stripAdClickIdsFromSentryEvent({
      message: `fetch failed for /?gclid=${GCLID}&_rsc=1`,
      transaction: "/",
      request: {
        url: `https://usetruecap.com/?gclid=${GCLID}&utm_medium=cpc`,
        query_string: `gclid=${GCLID}&utm_medium=cpc`,
        headers: {
          Referer: `https://usetruecap.com/?gclid=${GCLID}`,
          "User-Agent": "Mozilla/5.0",
        },
      },
      breadcrumbs: [
        {
          category: "navigation",
          data: { from: `/?gclid=${GCLID}`, to: "/pricing" },
        },
        {
          category: "fetch",
          message: `GET /?gclid=${GCLID}&_rsc=abc`,
          data: { url: `/?gclid=${GCLID}&_rsc=abc`, status_code: 200 },
        },
      ],
      exception: { values: [{ type: "Error", value: `Failed at https://usetruecap.com/?wbraid=xyz` }] },
      extra: { href: `https://usetruecap.com/?gbraid=xyz&utm_term=dscr`, nested: { list: [`/?msclkid=1`] } },
      contexts: { trace: { trace_id: "a", span_id: "b", data: { url: `/?dclid=9&utm_source=g` } } },
      tags: { landing: `/?gclid=${GCLID}` },
      spans: [
        {
          span_id: "c",
          trace_id: "a",
          start_timestamp: 1,
          description: `GET /?gclid=${GCLID}&_rsc=abc`,
          data: {
            url: `https://usetruecap.com/?gclid=${GCLID}&_rsc=abc`,
            "http.query": `?gclid=${GCLID}&_rsc=abc`,
            "url.query": `gclid=${GCLID}&_rsc=abc`,
            "http.response.status_code": 200,
          },
        },
      ],
    });

    expect(JSON.stringify(event)).not.toContain(GCLID);
    expect(JSON.stringify(event)).not.toMatch(/gclid|gbraid|wbraid|dclid|msclkid/);
    expect(event.request).toEqual({
      url: "https://usetruecap.com/?utm_medium=cpc",
      query_string: "utm_medium=cpc",
      headers: { Referer: "https://usetruecap.com/", "User-Agent": "Mozilla/5.0" },
    });
    expect(event.message).toBe("fetch failed for /?_rsc=1");
    expect(event.breadcrumbs).toEqual([
      { category: "navigation", data: { from: "/", to: "/pricing" } },
      { category: "fetch", message: "GET /?_rsc=abc", data: { url: "/?_rsc=abc", status_code: 200 } },
    ]);
    expect(event.extra).toEqual({ href: "https://usetruecap.com/?utm_term=dscr", nested: { list: ["/"] } });
    expect(event.contexts?.trace?.data).toEqual({ url: "/?utm_source=g" });
    expect(event.spans?.[0]).toMatchObject({
      description: "GET /?_rsc=abc",
      data: {
        url: "https://usetruecap.com/?_rsc=abc",
        "http.query": "?_rsc=abc",
        "url.query": "_rsc=abc",
        "http.response.status_code": 200,
      },
    });
  });

  it("drops the click id from a parsed query in either shape", () => {
    expect(
      stripAdClickIdsFromSentryEvent({ request: { query_string: { gclid: GCLID, utm_source: "ad" } } }).request
        ?.query_string,
    ).toEqual({ utm_source: "ad" });
    expect(
      stripAdClickIdsFromSentryEvent({
        request: { query_string: [["gclid", GCLID], ["utm_source", "ad"]] },
      }).request?.query_string,
    ).toEqual([["utm_source", "ad"]]);
  });

  it("leaves an event with no click id deeply equal to what it was", () => {
    const make = () => ({
      message: "plain",
      request: { url: "https://usetruecap.com/pricing?utm_source=ad", headers: { Referer: "https://usetruecap.com/" } },
      breadcrumbs: [{ category: "ui.click", message: "button", data: { count: 2, ok: true, none: null } }],
      extra: { a: [1, "two", { three: 3 }] },
    });
    expect(stripAdClickIdsFromSentryEvent(make())).toEqual(make());
  });

  it("survives a cyclic extra without looping", () => {
    const cyclic: Record<string, unknown> = { href: `/?gclid=${GCLID}` };
    cyclic.self = cyclic;
    const event = stripAdClickIdsFromSentryEvent({ extra: { cyclic } });
    expect(event.extra?.cyclic).toEqual({ href: "/", self: "[circular]" });
    expect(JSON.stringify(event)).not.toContain(GCLID);
  });

  it("strips an object that is referenced from two places, in both", () => {
    const shared = { href: `/?gclid=${GCLID}&utm_medium=cpc` };
    const event = stripAdClickIdsFromSentryEvent({ extra: { first: shared, second: { again: shared } } });
    expect(event.extra).toEqual({
      first: { href: "/?utm_medium=cpc" },
      second: { again: { href: "/?utm_medium=cpc" } },
    });
  });

  it("strips a standalone span", () => {
    expect(
      stripAdClickIdsFromSentrySpan({
        description: `GET https://usetruecap.com/?gclid=${GCLID}`,
        data: { "http.url": `https://usetruecap.com/?gclid=${GCLID}&utm_medium=cpc`, n: 1 },
      }),
    ).toEqual({
      description: "GET https://usetruecap.com/",
      data: { "http.url": "https://usetruecap.com/?utm_medium=cpc", n: 1 },
    });
  });
});

describe("the browser Sentry hooks run the strip after the credential scrub", () => {
  type Hooks = {
    beforeSend: (event: Record<string, unknown>) => Record<string, unknown> | null;
    beforeSendTransaction: (event: Record<string, unknown>) => Record<string, unknown> | null;
    beforeSendSpan: (span: { data: Record<string, unknown>; description?: string }) => {
      data: Record<string, unknown>;
      description?: string;
    };
  };
  let hooks: Hooks;

  beforeAll(() => {
    initSentryClient();
    hooks = initMock.mock.calls[0][0] as Hooks;
  });

  const landing = `https://usetruecap.com/?pdf_claim=secret&gclid=${GCLID}&utm_medium=cpc`;

  it("on an error event", () => {
    const sent = hooks.beforeSend({
      exception: { values: [{ type: "TypeError", value: "x is not a function" }] },
      request: { url: landing, headers: { Referer: landing } },
    });
    expect(sent?.request).toEqual({
      url: "https://usetruecap.com/?utm_medium=cpc",
      headers: { Referer: "https://usetruecap.com/?utm_medium=cpc" },
    });
  });

  it("on a page-load transaction and its spans", () => {
    const sent = hooks.beforeSendTransaction({
      type: "transaction",
      transaction: "/",
      request: { url: landing },
      spans: [{ description: `GET /?gclid=${GCLID}&_rsc=1`, data: { url: landing } }],
    });
    expect(JSON.stringify(sent)).not.toContain(GCLID);
    expect(JSON.stringify(sent)).not.toContain("secret");
    expect(sent?.request).toEqual({ url: "https://usetruecap.com/?utm_medium=cpc" });
  });

  it("on a standalone span", () => {
    const sent = hooks.beforeSendSpan({ description: `GET ${landing}`, data: { "http.url": landing } });
    expect(JSON.stringify(sent)).not.toContain(GCLID);
    expect(sent.data["http.url"]).toBe("https://usetruecap.com/?utm_medium=cpc");
  });
});
