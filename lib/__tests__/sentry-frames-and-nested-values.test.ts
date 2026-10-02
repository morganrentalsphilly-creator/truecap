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
  stripAdClickIds,
  stripAdClickIdsFromBareQuery,
  stripAdClickIdsFromParameterValue,
} from "@/lib/analytics/ad-click-ids";
import { hasSensitiveQueryParameter } from "@/lib/sensitive-url";
import {
  scrubSentryBreadcrumbUrl,
  scrubSentryEventSensitiveData,
  scrubSentryRequestHeaders,
  scrubSentryRequestUrl,
  scrubSentrySpanUrl,
} from "@/lib/sentry-url-scrubber";
import {
  stripAdClickIdsFromSentryEvent,
  stripAdClickIdsFromSentrySpan,
} from "@/lib/sentry/ad-click-ids";
import { initSentryClient } from "@/lib/sentry/client-init";

/**
 * Go-to-market audit 2026-10, decision item 3.39. Both Sentry walkers (the
 * credential scrubber and the ad click id strip) skipped stack frames, and
 * neither looked inside a parameter's VALUE, so a token or click id carried
 * by `return_to=%2F...%3Ftoken%3D...` went through.
 */

const GCLID = "TEST_AUDIT_ONLY_DO_NOT_COUNT";
const SECRET = "SECRETCAPABILITY0123456789";
const BEARER = "BEARERSHARETOKEN0123456789";
const enc = encodeURIComponent;

describe("ad click ids nested inside another parameter", () => {
  it("removes a percent-encoded click id and keeps the rest of the value", () => {
    expect(
      stripAdClickIds(
        `/auth/sign-up?return_to=${enc(`/pricing?gclid=${GCLID}&utm_medium=cpc`)}&plan=pro`,
      ),
    ).toBe(`/auth/sign-up?return_to=${enc("/pricing?utm_medium=cpc")}&plan=pro`);
    expect(stripAdClickIds(`/?return_to=${enc(`/?gclid=${GCLID}`)}`)).toBe(
      `/?return_to=${enc("/")}`,
    );
    expect(
      stripAdClickIds(
        `https://usetruecap.com/a?utm_source=google&u=${enc(`https://usetruecap.com/?msclkid=${GCLID}#faq`)}`,
      ),
    ).toBe(
      `https://usetruecap.com/a?utm_source=google&u=${enc("https://usetruecap.com/#faq")}`,
    );
  });

  it("removes a click id nested as plain text", () => {
    expect(
      stripAdClickIds(`/a?return_to=/pricing?gclid=${GCLID}&utm_medium=cpc`),
    ).toBe("/a?return_to=/pricing&utm_medium=cpc");
    expect(stripAdClickIds(`/a?state=wbraid=${GCLID}`)).toBe("/a?state=");
  });

  it("follows a value that was encoded twice, and a value that is a bare query", () => {
    expect(
      stripAdClickIds(`/?u=${enc(enc(`/?gclid=${GCLID}&x=1`))}`),
    ).toBe(`/?u=${enc(enc("/?x=1"))}`);
    expect(
      stripAdClickIds(`/?state=${enc(`gclid=${GCLID}&plan=pro`)}`),
    ).toBe(`/?state=${enc("plan=pro")}`);
    expect(
      stripAdClickIds(
        `/?a=${enc(`/b?c=${enc(`/d?gbraid=${GCLID}&utm_term=dscr`)}`)}`,
      ),
    ).toBe(`/?a=${enc(`/b?c=${enc("/d?utm_term=dscr")}`)}`);
  });

  it("finds it inside a sentence and a bare query string", () => {
    expect(
      stripAdClickIds(`GET /api/x?return_to=${enc(`/?gclid=${GCLID}`)}&_rsc=1 failed`),
    ).toBe(`GET /api/x?return_to=${enc("/")}&_rsc=1 failed`);
    expect(
      stripAdClickIdsFromBareQuery(
        `return_to=${enc(`/?dclid=${GCLID}&utm_medium=cpc`)}&utm_source=google`,
      ),
    ).toBe(`return_to=${enc("/?utm_medium=cpc")}&utm_source=google`);
    expect(
      stripAdClickIdsFromParameterValue(`/pricing?gclid=${GCLID}&utm_medium=cpc`),
    ).toBe("/pricing?utm_medium=cpc");
  });

  it("leaves every value with no click id inside it byte for byte", () => {
    for (const untouched of [
      "/?return_to=%2Fpricing%3Futm_medium%3Dcpc&x=a+b%20c",
      "/?ref=%2Fblog%2Fwhat-is-a-gclid",
      "/?note=mygclid%3D1&other=gclidx%3D2",
      "/?return_to=%2F%3Ffbclid%3DIwAR123",
      "/?q=100%25+gclid",
      "/?u=%2fPricing%3fUTM_medium%3dcpc",
    ]) {
      expect(stripAdClickIds(untouched), untouched).toBe(untouched);
    }
    expect(stripAdClickIdsFromParameterValue("/pricing?utm_medium=cpc")).toBe(
      "/pricing?utm_medium=cpc",
    );
  });

  it("does not throw on a value that cannot be decoded, and leaves it", () => {
    const malformed = `/?r=%E0%A4%A%3Fgclid%3D${GCLID}`;
    expect(stripAdClickIds(malformed)).toBe(malformed);
  });

  it("reaches Vercel Web Analytics through the same helper", () => {
    const sent = sanitizeVercelAnalyticsEvent({
      type: "pageview",
      url: `https://usetruecap.com/for-agents?return_to=${enc(`/pricing?gclid=${GCLID}`)}&utm_medium=cpc`,
    });
    expect(sent.url).toBe(
      `https://usetruecap.com/for-agents?return_to=${enc("/pricing")}&utm_medium=cpc`,
    );
  });
});

describe("the ad click id strip walks stack frames", () => {
  const landing = `https://usetruecap.com/?gclid=${GCLID}&utm_medium=cpc`;
  const chunk = "https://usetruecap.com/_next/static/chunks/main-0a1b2c.js";

  it("strips the page URL an inline-script frame carries, in exceptions and threads", () => {
    const event = stripAdClickIdsFromSentryEvent({
      exception: {
        values: [
          {
            type: "TypeError",
            value: "x is not a function",
            stacktrace: {
              frames: [
                { filename: chunk, abs_path: chunk, function: "render", lineno: 1, colno: 99, in_app: true },
                {
                  filename: landing,
                  abs_path: landing,
                  function: "?",
                  lineno: 3,
                  colno: 9,
                  in_app: true,
                  vars: { href: landing, attempts: 2 },
                },
              ],
            },
          },
        ],
      },
      threads: {
        values: [{ id: 1, stacktrace: { frames: [{ filename: `https://usetruecap.com/pricing?wbraid=${GCLID}` }] } }],
      },
      debug_meta: {
        images: [
          { type: "sourcemap" as const, code_file: chunk, debug_id: "aaaa" },
          { type: "sourcemap" as const, code_file: landing, debug_id: "bbbb" },
        ],
      },
    });

    expect(JSON.stringify(event)).not.toContain(GCLID);
    const frames = event.exception?.values?.[0]?.stacktrace?.frames ?? [];
    expect(frames[0]).toEqual({
      filename: chunk,
      abs_path: chunk,
      function: "render",
      lineno: 1,
      colno: 99,
      in_app: true,
    });
    expect(frames[1]).toEqual({
      filename: "https://usetruecap.com/?utm_medium=cpc",
      abs_path: "https://usetruecap.com/?utm_medium=cpc",
      function: "?",
      lineno: 3,
      colno: 9,
      in_app: true,
      vars: { href: "https://usetruecap.com/?utm_medium=cpc", attempts: 2 },
    });
    expect(event.threads?.values[0]?.stacktrace?.frames).toEqual([
      { filename: "https://usetruecap.com/pricing" },
    ]);
    // The SDK copies code_file from the frame path and Sentry pairs the two
    // to find the source map, so both must come out the same.
    expect(event.debug_meta?.images).toEqual([
      { type: "sourcemap", code_file: frames[0]?.abs_path, debug_id: "aaaa" },
      { type: "sourcemap", code_file: frames[1]?.abs_path, debug_id: "bbbb" },
    ]);
  });

  it("strips a click id nested in a parsed query, a header and a span", () => {
    const nested = `/pricing?gclid=${GCLID}&utm_medium=cpc`;
    const event = stripAdClickIdsFromSentryEvent({
      request: {
        url: `https://usetruecap.com/auth/sign-up?return_to=${enc(nested)}`,
        query_string: { return_to: nested, utm_source: "ad" },
        headers: { Referer: `https://usetruecap.com/a?return_to=${enc(nested)}` },
      },
    });
    expect(event.request).toEqual({
      url: `https://usetruecap.com/auth/sign-up?return_to=${enc("/pricing?utm_medium=cpc")}`,
      query_string: { return_to: "/pricing?utm_medium=cpc", utm_source: "ad" },
      headers: { Referer: `https://usetruecap.com/a?return_to=${enc("/pricing?utm_medium=cpc")}` },
    });
    expect(
      stripAdClickIdsFromSentryEvent({
        request: { query_string: [["return_to", enc(nested)], ["utm_source", "ad"]] },
      }).request?.query_string,
    ).toEqual([["return_to", enc("/pricing?utm_medium=cpc")], ["utm_source", "ad"]]);
    expect(
      stripAdClickIdsFromSentrySpan({
        description: `GET /a?return_to=${enc(nested)}`,
        data: { "url.query": `return_to=${enc(nested)}&x=1` },
      }),
    ).toEqual({
      description: `GET /a?return_to=${enc("/pricing?utm_medium=cpc")}`,
      data: { "url.query": `return_to=${enc("/pricing?utm_medium=cpc")}&x=1` },
    });
  });

  it("leaves an event whose frames carry no click id deeply equal to what it was", () => {
    const make = () => ({
      exception: {
        values: [
          {
            type: "Error",
            value: "plain",
            stacktrace: {
              frames: [
                { filename: chunk, function: "a", lineno: 1, colno: 2, in_app: true },
                { filename: "node:internal/process/task_queues", function: "processTicksAndRejections" },
                { filename: "https://usetruecap.com/pricing?utm_medium=cpc", context_line: 'a ? b : "c"' },
              ],
            },
          },
        ],
      },
      debug_meta: { images: [{ type: "sourcemap" as const, code_file: chunk, debug_id: "aaaa" }] },
    });
    expect(stripAdClickIdsFromSentryEvent(make())).toEqual(make());
  });
});

describe("credentials nested inside another parameter", () => {
  it("redacts a token percent-encoded inside a value the name list does not cover", () => {
    const request = {
      url: `https://usetruecap.com/a?return_to=${enc(`/email/unsubscribe?token=${SECRET}&utm_source=email`)}&plan=pro`,
    };
    scrubSentryRequestUrl(request);
    expect(request.url).toBe(
      `https://usetruecap.com/a?return_to=${enc("/email/unsubscribe?token=[redacted]&utm_source=email")}&plan=pro`,
    );
    // The gate that decides whether measurement scripts load is unchanged:
    // it still reads top-level parameter names only.
    expect(hasSensitiveQueryParameter(`/a?return_to=${enc(`/x?token=${SECRET}`)}`)).toBe(false);
  });

  it("redacts a bearer path and a checkout id nested in a value", () => {
    const request = {
      url: `https://usetruecap.com/a?return_to=${enc(`/s/${BEARER}`)}&back=${enc(`/portal/${BEARER}/d/1e8f40a1-f878-45ce-9297-c8f386d8ad67`)}&ref=${enc("https://api.stripe.com/v1/checkout/sessions/cs_live_nestedBearer")}`,
    };
    scrubSentryRequestUrl(request);
    expect(request.url).not.toContain(BEARER);
    expect(request.url).not.toContain("cs_live_nestedBearer");
    expect(request.url).toBe(
      `https://usetruecap.com/a?return_to=${enc("/s/[token]")}&back=${enc("/portal/[token]/d/[deal]")}&ref=${enc("https://api.stripe.com/v1/checkout/sessions/cs_[redacted]")}`,
    );
  });

  it("redacts a token nested as plain text in a URL field", () => {
    const request = {
      url: `https://usetruecap.com/a?return_to=/email/unsubscribe?token=${SECRET}`,
    };
    scrubSentryRequestUrl(request);
    expect(request.url).toBe(
      "https://usetruecap.com/a?return_to=/email/unsubscribe?token=[redacted]",
    );
  });

  it("follows a value encoded twice, a value that is a bare query, and two levels of nesting", () => {
    const twice = { url: `/a?u=${enc(enc(`/portal/${BEARER}`))}` };
    scrubSentryRequestUrl(twice);
    expect(twice.url).toBe(`/a?u=${enc(enc("/portal/[token]"))}`);

    const bare = { url: `/a?state=${enc(`token=${SECRET}&plan=pro`)}` };
    scrubSentryRequestUrl(bare);
    expect(bare.url).toBe(`/a?state=${enc("token=[redacted]&plan=pro")}`);

    const deep = {
      url: `/a?x=${enc(`/b?y=${enc(`/feedback/testimonial?token=${SECRET}`)}`)}`,
    };
    scrubSentryRequestUrl(deep);
    expect(deep.url).toBe(
      `/a?x=${enc(`/b?y=${enc("/feedback/testimonial?token=[redacted]")}`)}`,
    );
  });

  it("applies to parsed queries, headers, breadcrumbs, spans and free text", () => {
    const nested = `/email/unsubscribe?token=${SECRET}`;
    const request = {
      url: "https://usetruecap.com/a",
      query_string: { return_to: nested, utm_source: "ad" } as
        | string
        | Record<string, string>
        | Array<[string, string]>,
      headers: {
        referer: `https://usetruecap.com/a?return_to=${enc(nested)}`,
        "x-note": `saw /a?return_to=${enc(`/s/${BEARER}`)}`,
      },
    };
    scrubSentryRequestUrl(request);
    expect(request.query_string).toEqual({
      return_to: "/email/unsubscribe?token=[redacted]",
      utm_source: "ad",
    });
    expect(request.headers).toEqual({
      referer: `https://usetruecap.com/a?return_to=${enc("/email/unsubscribe?token=[redacted]")}`,
      "x-note": `saw /a?return_to=${enc("/s/[token]")}`,
    });

    const raw = { query_string: `return_to=${enc(`/s/${BEARER}`)}&utm_medium=cpc` };
    scrubSentryRequestUrl(raw);
    expect(raw.query_string).toBe(`return_to=${enc("/s/[token]")}&utm_medium=cpc`);

    const pairs = {
      query_string: [["return_to", enc(nested)], ["utm_source", "ad"]] as Array<[string, string]>,
    };
    scrubSentryRequestUrl(pairs);
    expect(pairs.query_string).toEqual([
      ["return_to", enc("/email/unsubscribe?token=[redacted]")],
      ["utm_source", "ad"],
    ]);

    expect(
      scrubSentryBreadcrumbUrl({
        category: "navigation",
        message: `to /a?return_to=${enc(nested)}`,
        data: { to: `/a?return_to=${enc(`/d/${BEARER}`)}`, from: "/pricing" },
      }),
    ).toEqual({
      category: "navigation",
      message: `to /a?return_to=${enc("/email/unsubscribe?token=[redacted]")}`,
      data: { to: `/a?return_to=${enc("/d/[shared-analysis]")}`, from: "/pricing" },
    });

    const span = scrubSentrySpanUrl({
      description: `GET /a?return_to=${enc(nested)}`,
      data: {
        "url.full": `https://usetruecap.com/a?return_to=${enc(nested)}`,
        "url.query": `return_to=${enc(nested)}&utm_medium=cpc`,
        "http.response.status_code": 200,
      },
    });
    expect(JSON.stringify(span)).not.toContain(SECRET);
    expect(span.data["url.query"]).toBe(
      `return_to=${enc("/email/unsubscribe?token=[redacted]")}&utm_medium=cpc`,
    );
    expect(span.data["http.response.status_code"]).toBe(200);

    const event = scrubSentryEventSensitiveData({
      message: `redirecting to /a?return_to=${enc(`/d/${BEARER}?code=${SECRET}`)}`,
      exception: { values: [{ type: "Error", value: `bad /a?u=${enc(nested)}` }] },
      extra: { href: `https://usetruecap.com/a?return_to=${enc(nested)}`, note: `at /a?u=${enc(nested)}` },
    });
    expect(JSON.stringify(event)).not.toContain(SECRET);
    expect(JSON.stringify(event)).not.toContain(BEARER);
    expect(event.message).toBe(
      `redirecting to /a?return_to=${enc("/d/[shared-analysis]?code=[redacted]")}`,
    );
  });

  it("leaves every value with nothing sensitive inside it byte for byte", () => {
    for (const untouched of [
      "https://usetruecap.com/pricing?utm_source=google&utm_campaign=a%20b+c&ref=%2Fblog%2Fcap-rate",
      "https://usetruecap.com/a?return_to=%2Fpricing%3Futm_medium%3Dcpc&x=100%25",
      "/a?cursor=YWJj&sig=abc123==",
      "/a?broken=%E0%A4%A&plan=pro",
    ]) {
      const request = { url: untouched };
      scrubSentryRequestUrl(request);
      expect(request.url, untouched).toBe(untouched);
    }
    const headers = { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) what?" };
    scrubSentryRequestHeaders(headers);
    expect(headers).toEqual({ "user-agent": "Mozilla/5.0 (X11; Linux x86_64) what?" });
  });
});

describe("the credential scrubber walks stack frames", () => {
  const chunk = "https://usetruecap.com/_next/static/chunks/app/d/%5Bencoded%5D/page-0a1b2c.js";

  it("scrubs the page URL an inline-script frame carries: bearer path, token query and nested value", () => {
    const share = `https://usetruecap.com/s/${BEARER}`;
    const unsubscribe = `https://usetruecap.com/email/unsubscribe?token=${SECRET}&utm_source=email`;
    const event = scrubSentryEventSensitiveData({
      exception: {
        values: [
          {
            type: "TypeError",
            value: "x is not a function",
            stacktrace: {
              frames: [
                { filename: share, abs_path: share, function: "?", lineno: 1, colno: 220, in_app: true },
                { filename: unsubscribe, abs_path: unsubscribe, function: "onload" },
                { filename: `https://usetruecap.com/d/${BEARER}?utm_source=share` },
                { filename: `https://usetruecap.com/a?return_to=${enc(`/portal/${BEARER}`)}` },
                {
                  filename: "/var/task/.next/server/chunks/ssr/_1a2b._.js",
                  function: "loadDeal",
                  vars: { url: `https://usetruecap.com/portal/${BEARER}`, note: `GET /x?token=${SECRET}`, attempts: 2 },
                },
              ],
            },
          },
        ],
      },
      threads: {
        values: [{ id: 1, stacktrace: { frames: [{ filename: `https://usetruecap.com/embed/brand/${BEARER}/calculator` }] } }],
      },
      debug_meta: { images: [{ type: "sourcemap" as const, code_file: share, debug_id: "cccc" }] },
    });

    expect(JSON.stringify(event)).not.toContain(BEARER);
    expect(JSON.stringify(event)).not.toContain(SECRET);
    expect(event.exception?.values?.[0]?.stacktrace?.frames).toEqual([
      {
        filename: "https://usetruecap.com/s/[token]",
        abs_path: "https://usetruecap.com/s/[token]",
        function: "?",
        lineno: 1,
        colno: 220,
        in_app: true,
      },
      {
        filename: "https://usetruecap.com/email/unsubscribe?token=[redacted]&utm_source=email",
        abs_path: "https://usetruecap.com/email/unsubscribe?token=[redacted]&utm_source=email",
        function: "onload",
      },
      { filename: "https://usetruecap.com/d/[shared-analysis]?utm_source=share" },
      { filename: `https://usetruecap.com/a?return_to=${enc("/portal/[token]")}` },
      {
        filename: "/var/task/.next/server/chunks/ssr/_1a2b._.js",
        function: "loadDeal",
        vars: { url: "https://usetruecap.com/portal/[token]", note: "GET /x?token=[redacted]", attempts: 2 },
      },
    ]);
    expect(event.threads?.values[0]?.stacktrace?.frames).toEqual([
      { filename: "https://usetruecap.com/embed/brand/[token]/calculator" },
    ]);
    expect(event.debug_meta?.images).toEqual([
      { type: "sourcemap", code_file: "https://usetruecap.com/s/[token]", debug_id: "cccc" },
    ]);
  });

  it("keeps build output, package and runtime paths, and program text, exactly as they were", () => {
    // Route folders are named like the bearer routes (app/d/[encoded],
    // app/dashboard/saved-analyses/[id]) and a package can be called "d".
    // Rewriting these would break the source-map match and remove nothing.
    const make = () => ({
      exception: {
        values: [
          {
            type: "Error",
            value: "plain",
            stacktrace: {
              frames: [
                { filename: chunk, abs_path: chunk, function: "render", lineno: 1, colno: 2, in_app: true },
                { filename: "/var/task/.next/server/app/d/[encoded]/page.js", module: "page" },
                { filename: "/var/task/.next/server/app/dashboard/saved-analyses/[id]/page.js" },
                { filename: "/var/task/.next/server/app/s/[token]/page.js" },
                { filename: "/var/task/node_modules/d/index.js", module: "d:index" },
                { filename: "node:internal/process/task_queues", function: "processTicksAndRejections" },
                { filename: "<anonymous>", function: "eval" },
                {
                  filename: "app:///_next/server/app/portal/[token]/page.js",
                  function: "Page",
                  context_line: 'const href = "/s/" + token; return e?q=1:t;',
                  pre_context: ['fetch("/d/" + encoded)'],
                  post_context: ["}"],
                },
              ],
            },
          },
        ],
      },
      debug_meta: { images: [{ type: "sourcemap" as const, code_file: chunk, debug_id: "aaaa" }] },
    });
    const event = scrubSentryEventSensitiveData(make());
    expect(event).toEqual(make());
    expect(event.debug_meta?.images?.[0]?.code_file).toBe(
      event.exception?.values?.[0]?.stacktrace?.frames?.[0]?.abs_path,
    );
  });

  it("still scrubs a token-bearing query on a build output path", () => {
    const event = scrubSentryEventSensitiveData({
      exception: {
        values: [
          { type: "Error", value: "x", stacktrace: { frames: [{ filename: `${chunk}?token=${SECRET}&dpl=dpl_1` }] } },
        ],
      },
    });
    expect(event.exception?.values?.[0]?.stacktrace?.frames).toEqual([
      { filename: `${chunk}?token=[redacted]&dpl=dpl_1` },
    ]);
  });
});

describe("the browser Sentry hooks cover frames and nested values", () => {
  type Hooks = {
    beforeSend: (event: Record<string, unknown>) => Record<string, unknown> | null;
    beforeSendTransaction: (event: Record<string, unknown>) => Record<string, unknown> | null;
  };
  let hooks: Hooks;

  beforeAll(() => {
    initSentryClient();
    hooks = initMock.mock.calls[0][0] as Hooks;
  });

  const page = `https://usetruecap.com/s/${BEARER}?gclid=${GCLID}&utm_medium=cpc`;
  const nested = `https://usetruecap.com/a?return_to=${enc(`/email/unsubscribe?token=${SECRET}&gclid=${GCLID}`)}`;

  it("on an error event thrown by an inline script on a share page", () => {
    const sent = hooks.beforeSend({
      exception: {
        values: [
          {
            type: "TypeError",
            value: "x is not a function",
            stacktrace: { frames: [{ filename: page, abs_path: page, function: "?", lineno: 1 }] },
          },
        ],
      },
      request: { url: nested, headers: { Referer: nested } },
    });
    const text = JSON.stringify(sent);
    expect(text).not.toContain(BEARER);
    expect(text).not.toContain(SECRET);
    expect(text).not.toContain(GCLID);
    expect(sent?.exception).toEqual({
      values: [
        {
          type: "TypeError",
          value: "x is not a function",
          stacktrace: {
            frames: [
              {
                filename: "https://usetruecap.com/s/[token]?utm_medium=cpc",
                abs_path: "https://usetruecap.com/s/[token]?utm_medium=cpc",
                function: "?",
                lineno: 1,
              },
            ],
          },
        },
      ],
    });
    expect(sent?.request).toEqual({
      url: `https://usetruecap.com/a?return_to=${enc("/email/unsubscribe?token=[redacted]")}`,
      headers: { Referer: `https://usetruecap.com/a?return_to=${enc("/email/unsubscribe?token=[redacted]")}` },
    });
  });

  it("on a transaction", () => {
    const sent = hooks.beforeSendTransaction({
      type: "transaction",
      transaction: "/a",
      request: { url: nested },
      spans: [{ description: `GET ${nested}`, data: { url: nested } }],
    });
    const text = JSON.stringify(sent);
    expect(text).not.toContain(SECRET);
    expect(text).not.toContain(GCLID);
  });
});
