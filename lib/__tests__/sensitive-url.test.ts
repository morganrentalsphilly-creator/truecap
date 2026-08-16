import { describe, expect, it } from "vitest";
import {
  sanitizeAnalyticsUrlProperties,
  sanitizeSensitiveQuery,
  sanitizeSensitiveUrl,
} from "@/lib/sensitive-url";
import {
  scrubSentryBreadcrumbUrl,
  scrubSentryEventSensitiveData,
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
        property_type: "single-family",
      })
    ).toEqual({
      $current_url: "https://usetruecap.com/?utm_source=ad",
      $referrer: "https://usetruecap.com/",
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

  it("scrubs Sentry transactions, spans, and Stripe ids echoed by exceptions", () => {
    const event = scrubSentryEventSensitiveData({
      type: "transaction" as const,
      transaction: "GET /?pdf_purchase=cs_live_transactionBearer&utm_source=ad",
      request: {
        url: "https://usetruecap.com/?pdf_claim=public-id&utm_source=ad",
      },
      exception: {
        values: [{ value: "No such checkout.session: cs_live_exceptionBearer" }],
      },
      spans: [
        {
          trace_id: "a".repeat(32),
          span_id: "b".repeat(16),
          start_timestamp: 1,
          description: "GET /?pdf_purchase=cs_live_descriptionBearer",
          data: {
            "url.full":
              "https://usetruecap.com/?pdf_purchase=cs_live_spanBearer&utm_source=ad",
          },
        },
      ],
    });
    expect(event.transaction).toBe(
      "GET /?pdf_purchase=[redacted]&utm_source=ad"
    );
    expect(event.request?.url).toBe("https://usetruecap.com/?utm_source=ad");
    expect(event.exception?.values?.[0]?.value).toBe(
      "No such checkout.session: cs_[redacted]"
    );
    expect(event.spans?.[0]?.description).toBe(
      "GET /?pdf_purchase=[redacted]"
    );
    expect(event.spans?.[0]?.data["url.full"]).toBe(
      "https://usetruecap.com/?utm_source=ad"
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
