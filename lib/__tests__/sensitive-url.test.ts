import { describe, expect, it } from "vitest";
import {
  SENSITIVE_PUBLIC_SHARE_ROUTE_PATTERN,
  redactSensitiveQueryValuesInText,
  sanitizeAnalyticsUrlProperties,
  sanitizeSensitiveQuery,
  sanitizeSensitiveUrl,
  shouldKeepThirdPartyTelemetryDisabled,
} from "@/lib/sensitive-url";
import {
  scrubSentryBreadcrumbUrl,
  scrubSentryEventSensitiveData,
  scrubSentryRequestCookies,
  scrubSentryRequestHeaders,
  scrubSentryRequestUrl,
  scrubSentrySpanUrl,
} from "@/lib/sentry-url-scrubber";

describe("sensitive URL scrubbing", () => {
  it("removes checkout and OAuth capabilities while preserving attribution", () => {
    expect(
      sanitizeSensitiveUrl(
        "https://usetruecap.com/?utm_source=google&pdf_purchase=cs_live_secret&pdf_claim=abc&code=oauth-secret#offer"
      )
    ).toBe("https://usetruecap.com/?utm_source=google#offer");
  });

  it("sanitizes relative and query-only values", () => {
    expect(sanitizeSensitiveUrl("/?session_id=cs_test_123&utm_medium=cpc")).toBe(
      "/?utm_medium=cpc"
    );
    expect(sanitizeSensitiveUrl("?token_hash=secret&safe=1")).toBe("?safe=1");
    expect(
      sanitizeSensitiveUrl(
        "https://api.stripe.com/v1/checkout/sessions/cs_live_pathBearer"
      )
    ).toBe("https://api.stripe.com/v1/checkout/sessions/cs_[redacted]");
  });

  it("redacts encoded analysis and bearer-token route segments", () => {
    expect(
      [
        "https://usetruecap.com/d/private-snapshot",
        "https://usetruecap.com/portal/private-token",
        "https://usetruecap.com/embed/brand/private-token/calculator",
      ].every((url) => SENSITIVE_PUBLIC_SHARE_ROUTE_PATTERN.test(url))
    ).toBe(true);
    expect(
      SENSITIVE_PUBLIC_SHARE_ROUTE_PATTERN.test(
        "https://usetruecap.com/dashboard/saved-analyses"
      )
    ).toBe(false);
    expect(
      sanitizeSensitiveUrl(
        "https://usetruecap.com/d/encoded-address-and-financials?utm_source=share"
      )
    ).toBe(
      "https://usetruecap.com/d/[shared-analysis]?utm_source=share"
    );
    expect(sanitizeSensitiveUrl("/portal/permanent-bearer?view=client")).toBe(
      "/portal/[token]?view=client"
    );
    expect(sanitizeSensitiveUrl("/embed/brand/private-token/calculator")).toBe(
      "/embed/brand/[token]/calculator"
    );
    expect(
      redactSensitiveQueryValuesInText(
        "GET /d/private-snapshot?utm_medium=referral"
      )
    ).toBe("GET /d/[shared-analysis]?utm_medium=referral");
  });

  it("keeps third-party telemetry disabled after leaving a sensitive route", () => {
    let disabled = shouldKeepThirdPartyTelemetryDisabled("/pricing", false);
    expect(disabled).toBe(false);
    disabled = shouldKeepThirdPartyTelemetryDisabled(
      "/d/private-snapshot",
      disabled
    );
    expect(disabled).toBe(true);
    disabled = shouldKeepThirdPartyTelemetryDisabled("/", disabled);
    expect(disabled).toBe(true);
  });

  it("scrubs raw query strings and objects", () => {
    expect(sanitizeSensitiveQuery("pdf_claim=id&utm_source=ad")).toBe("utm_source=ad");
    expect(
      sanitizeSensitiveQuery({ pdf_purchase: "cs_live", utm_campaign: "fall" })
    ).toEqual({ utm_campaign: "fall" });
    expect(
      sanitizeSensitiveQuery([
        ["pdf_claim", "claim-id"],
        ["utm_source", "ad"],
      ])
    ).toEqual([["utm_source", "ad"]]);
  });

  it("scrubs SDK-generated URL fields without touching non-URL analytics", () => {
    expect(
      sanitizeAnalyticsUrlProperties({
        $current_url: "https://usetruecap.com/?pdf_claim=id&utm_source=ad",
        $referrer: "https://usetruecap.com/?session_id=cs_secret",
        $pathname: "/portal/private-token",
        landing_page: "/d/private-snapshot",
        property_type: "single-family",
      })
    ).toEqual({
      $current_url: "https://usetruecap.com/?utm_source=ad",
      $referrer: "https://usetruecap.com/",
      $pathname: "/portal/[token]",
      landing_page: "/d/[shared-analysis]",
      property_type: "single-family",
    });
  });

  it("scrubs Sentry request URLs, parsed queries, and URL breadcrumbs", () => {
    const request = {
      url: "https://usetruecap.com/?pdf_purchase=cs_live_secret&utm_source=ad",
      query_string: {
        pdf_purchase: "cs_live_secret",
        utm_source: "ad",
      },
    };
    scrubSentryRequestUrl(request);
    expect(request).toEqual({
      url: "https://usetruecap.com/?utm_source=ad",
      query_string: { utm_source: "ad" },
    });

    expect(
      scrubSentryBreadcrumbUrl({
        category: "fetch",
        message: "GET /?pdf_claim=private&utm_source=ad",
        data: {
          url: "https://api.stripe.com/v1/checkout/sessions/cs_live_pathBearer?pdf_claim=private&utm_source=ad",
          method: "GET",
        },
      })
    ).toEqual({
      category: "fetch",
      message: "GET /?pdf_claim=[redacted]&utm_source=ad",
      data: {
        url: "https://api.stripe.com/v1/checkout/sessions/cs_[redacted]?utm_source=ad",
        method: "GET",
      },
    });
  });

  it("scrubs same-origin referrers and all request cookies", () => {
    const headers = {
      referer: "https://usetruecap.com/d/private-snapshot?utm_source=share",
      Referrer: "https://usetruecap.com/portal/private-token",
      cookie: "ph_project_posthog=%7Bprivate%7D; sb-app-auth-token=secret",
      authorization: "Bearer secret",
      "user-agent": "Example Browser",
    };
    scrubSentryRequestHeaders(headers);
    expect(headers).toEqual({
      referer:
        "https://usetruecap.com/d/[shared-analysis]?utm_source=share",
      Referrer: "https://usetruecap.com/portal/[token]",
      cookie: "[scrubbed]",
      authorization: "[scrubbed]",
      "user-agent": "Example Browser",
    });

    const cookies = {
      "ph_project_posthog": "private-path",
      "sb-app-auth-token": "secret",
      "truecap_cookie_consent_v1": "granted",
    };
    scrubSentryRequestCookies(cookies);
    expect(cookies).toEqual({
      "ph_project_posthog": "[scrubbed]",
      "sb-app-auth-token": "[scrubbed]",
      "truecap_cookie_consent_v1": "[scrubbed]",
    });
  });

  it("drops UI breadcrumbs on sensitive public routes", () => {
    const breadcrumb = {
      category: "ui.click",
      message: 'button[title="123 Main Street"]',
    };
    expect(
      scrubSentryBreadcrumbUrl(breadcrumb, "/d/private-snapshot")
    ).toBeNull();
    expect(
      scrubSentryBreadcrumbUrl(breadcrumb, "/portal/private-token")
    ).toBeNull();
    expect(
      scrubSentryBreadcrumbUrl(breadcrumb, "/embed/brand/private-token")
    ).toBeNull();
    expect(scrubSentryBreadcrumbUrl(breadcrumb, "/pricing")).toEqual(
      breadcrumb
    );
  });

  it("scrubs Sentry transactions, spans, and Stripe ids echoed by exceptions", () => {
    const event = scrubSentryEventSensitiveData({
      type: "transaction" as const,
      transaction: "GET /?pdf_purchase=cs_live_transactionBearer&utm_source=ad",
      request: {
        url: "https://usetruecap.com/d/private-snapshot?pdf_claim=public-id&utm_source=ad",
        headers: {
          referer: "https://usetruecap.com/portal/private-token",
          cookie: "ph_project_posthog=private",
        },
        cookies: { ph_project_posthog: "private" },
      },
      exception: {
        values: [{ value: "No such checkout.session: cs_live_exceptionBearer" }],
      },
      extra: {
        pathname: "/portal/private-token",
        referrer: "https://usetruecap.com/d/private-snapshot",
      },
      spans: [
        {
          trace_id: "a".repeat(32),
          span_id: "b".repeat(16),
          start_timestamp: 1,
          description:
            "GET /portal/private-token?pdf_purchase=cs_live_descriptionBearer",
          data: {
            "url.full":
              "https://usetruecap.com/embed/brand/private-token/calculator?pdf_purchase=cs_live_spanBearer&utm_source=ad",
          },
        },
      ],
    });
    expect(event.transaction).toBe(
      "GET /?pdf_purchase=[redacted]&utm_source=ad"
    );
    expect(event.request?.url).toBe(
      "https://usetruecap.com/d/[shared-analysis]?utm_source=ad"
    );
    expect(event.request?.headers?.referer).toBe(
      "https://usetruecap.com/portal/[token]"
    );
    expect(event.request?.headers?.cookie).toBe("[scrubbed]");
    expect(event.request?.cookies?.ph_project_posthog).toBe("[scrubbed]");
    expect(event.exception?.values?.[0]?.value).toBe(
      "No such checkout.session: cs_[redacted]"
    );
    expect(event.extra).toEqual({
      pathname: "/portal/[token]",
      referrer: "https://usetruecap.com/d/[shared-analysis]",
    });
    expect(event.spans?.[0]?.description).toBe(
      "GET /portal/[token]?pdf_purchase=[redacted]"
    );
    expect(event.spans?.[0]?.data["url.full"]).toBe(
      "https://usetruecap.com/embed/brand/[token]/calculator?utm_source=ad"
    );

    expect(
      scrubSentrySpanUrl({
        trace_id: "a".repeat(32),
        span_id: "b".repeat(16),
        start_timestamp: 1,
        data: { "url.query": "pdf_claim=id&utm_medium=cpc" },
      }).data["url.query"]
    ).toBe("utm_medium=cpc");
  });
});
