import * as Sentry from "@sentry/nextjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/csp-report/route";

vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn() }));

describe("CSP report-only collector", () => {
  beforeEach(() => vi.clearAllMocks());

  it("records only redacted route and origin metadata", async () => {
    const response = await POST(
      new Request("https://usetruecap.com/api/csp-report", {
        method: "POST",
        headers: { "content-type": "application/csp-report" },
        body: JSON.stringify({
          "csp-report": {
            "effective-directive": "script-src-elem",
            "blocked-uri": "https://unexpected.example/private/customer.js?email=user@example.com",
            "document-uri": "https://usetruecap.com/s/secret-share-token?email=user@example.com",
            "source-file": "https://cdn.example.com/assets/private.js?deal=abc",
          },
        }),
      })
    );

    expect(response.status).toBe(204);
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "CSP report-only violation",
      expect.objectContaining({
        tags: { feature: "csp-report", directive: "script-src-elem" },
        extra: {
          blockedOrigin: "https://unexpected.example",
          documentRoute: "/s/:redacted",
          sourceOrigin: "https://cdn.example.com",
        },
      })
    );
    expect(JSON.stringify(vi.mocked(Sentry.captureMessage).mock.calls)).not.toContain(
      "secret-share-token"
    );
    expect(JSON.stringify(vi.mocked(Sentry.captureMessage).mock.calls)).not.toContain(
      "user@example.com"
    );
  });

  /**
   * Go-to-market audit 2026-10, rows P1-63, P2-90 and P2-109. The report-only
   * policy does not list the Google Ads hosts, so every consented page view
   * posted these reports and each became a Sentry event. The bodies below are
   * the five the audit captured, from four origins
   * (ws07/ws07b/out/recheck-thirdparty.*.json and
   * ws09/ws09a/supplementary-probes.json B_cspReports), with the query strings
   * shortened.
   */
  it.each([
    ["script-src-elem", "https://googleads.g.doubleclick.net/pagead/viewthroughconversion/8236119484/?random=1&cv=11"],
    ["connect-src", "https://www.google.com/rmkt/collect/8236119484/?random=1"],
    ["connect-src", "https://www.google.com/ccm/collect?en=page_view"],
    ["connect-src", "https://ad.doubleclick.net/ccm/s/collect?en=page_view"],
    ["connect-src", "https://www.googleadservices.com/pagead/set_partitioned_cookie?random=1"],
  ])("does not spend Sentry quota on the Ads tag's own %s report (%s)", async (directive, blockedUri) => {
    const response = await POST(
      new Request("https://usetruecap.com/api/csp-report", {
        method: "POST",
        headers: { "content-type": "application/csp-report" },
        body: JSON.stringify({
          "csp-report": {
            "document-uri": "https://usetruecap.com/for-agents",
            "effective-directive": directive,
            "violated-directive": directive,
            disposition: "report",
            "blocked-uri": blockedUri,
          },
        }),
      })
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it("still reports an origin that only resembles an Ads host", async () => {
    for (const blockedUri of [
      "https://googleads.g.doubleclick.net.evil.example/pagead/x.js",
      "https://evil.example/?next=https://www.google.com/ccm/collect",
      "http://www.google.com/ccm/collect",
      "https://doubleclick.net/x.js",
    ]) {
      vi.clearAllMocks();
      const response = await POST(
        new Request("https://usetruecap.com/api/csp-report", {
          method: "POST",
          body: JSON.stringify({
            "csp-report": { "effective-directive": "script-src-elem", "blocked-uri": blockedUri },
          }),
        })
      );
      expect(response.status).toBe(204);
      expect(Sentry.captureMessage, blockedUri).toHaveBeenCalledTimes(1);
      expect(vi.mocked(Sentry.captureMessage).mock.calls[0][1]).toMatchObject({
        extra: { blockedOrigin: new URL(blockedUri).origin },
      });
    }
  });

  it("drops an Ads origin only under the directive the audit captured it in", async () => {
    // The drop is keyed on origin plus directive. A script from
    // www.google.com, or a beacon to the script host, is not one of the
    // captured reports and would be news.
    for (const [directive, blockedUri] of [
      ["script-src-elem", "https://www.google.com/recaptcha/api.js"],
      ["frame-src", "https://www.googleadservices.com/pagead/frame"],
      ["img-src", "https://ad.doubleclick.net/pixel.gif"],
      ["connect-src", "https://googleads.g.doubleclick.net/pagead/collect"],
    ]) {
      vi.clearAllMocks();
      const response = await POST(
        new Request("https://usetruecap.com/api/csp-report", {
          method: "POST",
          body: JSON.stringify({
            "csp-report": { "effective-directive": directive, "blocked-uri": blockedUri },
          }),
        })
      );
      expect(response.status).toBe(204);
      expect(Sentry.captureMessage, `${directive} ${blockedUri}`).toHaveBeenCalledTimes(1);
      expect(vi.mocked(Sentry.captureMessage).mock.calls[0][1]).toMatchObject({
        tags: { directive },
        extra: { blockedOrigin: new URL(blockedUri).origin },
      });
    }
  });

  it("recognises the Ads report when the browser sends only violated-directive", async () => {
    // The legacy report shape: no effective-directive, and the violated one
    // quoted with its source list.
    const response = await POST(
      new Request("https://usetruecap.com/api/csp-report", {
        method: "POST",
        body: JSON.stringify({
          "csp-report": {
            "violated-directive": "connect-src 'self' https://*.supabase.co",
            "blocked-uri": "https://www.google.com/ccm/collect?en=page_view",
          },
        }),
      })
    );
    expect(response.status).toBe(204);
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it("keeps the forwarding window for real reports when Ads reports flood in", async () => {
    // 60 Ads reports first: more than the 50-per-window limit. They must not
    // use the window up, or the report that matters is dropped unseen.
    for (let index = 0; index < 60; index += 1) {
      await POST(
        new Request("https://usetruecap.com/api/csp-report", {
          method: "POST",
          body: JSON.stringify({
            "csp-report": {
              "effective-directive": "connect-src",
              "blocked-uri": "https://www.google.com/ccm/collect?en=page_view",
            },
          }),
        })
      );
    }
    expect(Sentry.captureMessage).not.toHaveBeenCalled();

    await POST(
      new Request("https://usetruecap.com/api/csp-report", {
        method: "POST",
        body: JSON.stringify({
          "csp-report": {
            "effective-directive": "script-src-elem",
            "blocked-uri": "https://unexpected.example/injected.js",
          },
        }),
      })
    );
    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
  });

  it("answers a flood without reading the body, as it did before the Ads drop", async () => {
    // A fresh copy of the route, so this flood does not use up the counters
    // the other cases share.
    vi.resetModules();
    const fresh = await import("@/app/api/csp-report/route");
    const freshSentry = await import("@sentry/nextjs");
    const report = (blockedUri: string) =>
      new Request("https://usetruecap.com/api/csp-report", {
        method: "POST",
        body: JSON.stringify({
          "csp-report": { "effective-directive": "script-src-elem", "blocked-uri": blockedUri },
        }),
      });

    // 600 requests are read. The first 50 real ones are forwarded.
    let lastRead = report("https://unexpected.example/injected.js");
    for (let index = 0; index < 600; index += 1) {
      lastRead = report("https://unexpected.example/injected.js");
      await fresh.POST(lastRead);
    }
    expect(lastRead.bodyUsed).toBe(true);
    expect(freshSentry.captureMessage).toHaveBeenCalledTimes(50);

    // The 601st is answered before its body is touched.
    const overCeiling = report("https://another.example/injected.js");
    const response = await fresh.POST(overCeiling);
    expect(response.status).toBe(204);
    expect(overCeiling.bodyUsed).toBe(false);
    expect(freshSentry.captureMessage).toHaveBeenCalledTimes(50);
  });

  it("rejects an explicitly oversized report without parsing it", async () => {
    const response = await POST(
      new Request("https://usetruecap.com/api/csp-report", {
        method: "POST",
        headers: { "content-length": "20001" },
        body: "{}",
      })
    );

    expect(response.status).toBe(413);
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it("rejects an oversized streamed report even without content-length", async () => {
    const response = await POST(
      new Request("https://usetruecap.com/api/csp-report", {
        method: "POST",
        body: JSON.stringify({ value: "x".repeat(20_001) }),
      })
    );

    expect(response.status).toBe(413);
    expect(Sentry.captureMessage).not.toHaveBeenCalled();
  });

  it("absorbs malformed advisory reports", async () => {
    const response = await POST(
      new Request("https://usetruecap.com/api/csp-report", {
        method: "POST",
        body: "not-json",
      })
    );
    expect(response.status).toBe(204);
  });
});
