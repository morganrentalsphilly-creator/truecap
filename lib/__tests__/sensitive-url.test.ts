import { describe, expect, it } from "vitest";
import {
  SENSITIVE_PUBLIC_SHARE_ROUTE_PATTERN,
  redactSensitiveQueryValuesInText,
  sanitizeAnalyticsUrlProperties,
  sanitizeSensitiveQuery,
  sanitizeSensitiveUrl,
  shouldKeepThirdPartyTelemetryDisabled,
  shouldKeepCookielessPageAnalyticsDisabled,
  isCountedNextLocation,
  COUNTED_NEXT_DESTINATIONS,
  hasSensitiveQueryParameter,
  isSensitiveTelemetryLocation,
} from "@/lib/sensitive-url";
import {
  scrubSentryBreadcrumbUrl,
  scrubSentryEventSensitiveData,
  scrubSentryRequestCookies,
  scrubSentryRequestHeaders,
  scrubSentryRequestUrl,
  scrubSentrySpanUrl,
} from "@/lib/sentry-url-scrubber";
import { sanitizeVercelAnalyticsEvent } from "@/components/analytics/vercel-analytics";
import { CHECKOUT_PLAN_SLUGS } from "@/lib/pricing-checkout-resume";

describe("sensitive URL scrubbing", () => {
  it("removes checkout and OAuth capabilities while preserving attribution", () => {
    expect(
      sanitizeSensitiveUrl(
        "https://usetruecap.com/?utm_source=google&pdf_purchase=cs_live_secret&pdf_claim=abc&code=oauth-secret#offer",
      ),
    ).toBe("https://usetruecap.com/?utm_source=google#offer");
  });

  it("keeps the clean post-checkout landing measurable while the id-bearing URLs stay gated", () => {
    // Stripe returns to /api/billing/return, which parks the Session id in an
    // httpOnly cookie and lands on this URL; the Google Ads Purchase conversion
    // is only reachable if this location does NOT trip the telemetry gate.
    expect(isSensitiveTelemetryLocation("/dashboard/new?billing=success")).toBe(false);
    expect(
      isSensitiveTelemetryLocation("/dashboard/new?billing=success&session_id=cs_test_abc123"),
    ).toBe(true);
    expect(
      isSensitiveTelemetryLocation("/api/billing/return?session_id=cs_test_abc123"),
    ).toBe(true);
  });

  it("sanitizes relative and query-only values", () => {
    expect(
      sanitizeSensitiveUrl("/?session_id=cs_test_123&utm_medium=cpc"),
    ).toBe("/?utm_medium=cpc");
    expect(sanitizeSensitiveUrl("?token_hash=secret&safe=1")).toBe("?safe=1");
    expect(
      sanitizeSensitiveUrl(
        "https://api.stripe.com/v1/checkout/sessions/cs_live_pathBearer",
      ),
    ).toBe("https://api.stripe.com/v1/checkout/sessions/cs_[redacted]");
  });

  it("strips the bare `token` parameter used by emailed capability links", () => {
    const formToken = "0123456789abcdef0123456789abcdef0123456789abcdef";
    expect(
      sanitizeSensitiveUrl(`https://usetruecap.com/feedback/testimonial?token=${formToken}&utm_source=email`),
    ).toBe("https://usetruecap.com/feedback/testimonial?utm_source=email");
    expect(sanitizeSensitiveUrl(`/email/unsubscribe?token=${formToken}`)).toBe("/email/unsubscribe");
    expect(hasSensitiveQueryParameter("/feedback/testimonial?token=abc")).toBe(true);
    expect(shouldKeepThirdPartyTelemetryDisabled("/feedback/testimonial?token=abc", false)).toBe(true);
    expect(shouldKeepThirdPartyTelemetryDisabled("/api/testimonials/unpublish?token=abc", false)).toBe(true);
    expect(shouldKeepThirdPartyTelemetryDisabled("/feedback/testimonial", false)).toBe(false);
    expect(
      redactSensitiveQueryValuesInText(`Opened /email/unsubscribe?token=${formToken} from mail`),
    ).toBe("Opened /email/unsubscribe?token=[redacted] from mail");
  });

  it("removes exact analyzer handoff inputs while preserving coarse attribution", () => {
    expect(
      sanitizeSensitiveUrl(
        "/?price=325000&rent=2450&beds=3&rate=6.8&tax=1.4&address=123%20Main%20St&strategy=buy-hold&utm_source=tool",
      ),
    ).toBe("/?strategy=buy-hold&utm_source=tool");
    expect(
      sanitizeSensitiveQuery({
        address: "123 Main St",
        price: 325000,
        rent: 2450,
        utm_medium: "referral",
      }),
    ).toEqual({ utm_medium: "referral" });
  });

  it("redacts encoded analysis and bearer-token route segments", () => {
    expect(
      [
        "https://usetruecap.com/d/private-snapshot",
        "https://usetruecap.com/portal/private-token",
        "https://usetruecap.com/embed/brand/private-token/calculator",
      ].every((url) => SENSITIVE_PUBLIC_SHARE_ROUTE_PATTERN.test(url)),
    ).toBe(true);
    expect(
      SENSITIVE_PUBLIC_SHARE_ROUTE_PATTERN.test(
        "https://usetruecap.com/dashboard/saved-analyses",
      ),
    ).toBe(false);
    expect(
      sanitizeSensitiveUrl(
        "https://usetruecap.com/d/encoded-address-and-financials?utm_source=share",
      ),
    ).toBe("https://usetruecap.com/d/[shared-analysis]?utm_source=share");
    expect(sanitizeSensitiveUrl("/portal/permanent-bearer?view=client")).toBe(
      "/portal/[token]?view=client",
    );
    expect(
      sanitizeSensitiveUrl(
        "/portal/permanent-bearer/d/1e8f40a1-f878-45ce-9297-c8f386d8ad67",
      ),
    ).toBe("/portal/[token]/d/[deal]");
    expect(
      sanitizeSensitiveUrl(
        "/dashboard/saved-analyses/1e8f40a1-f878-45ce-9297-c8f386d8ad67?utm_source=share",
      ),
    ).toBe("/dashboard/saved-analyses/[deal]?utm_source=share");
    expect(sanitizeSensitiveUrl("/embed/brand/private-token/calculator")).toBe(
      "/embed/brand/[token]/calculator",
    );
    expect(
      redactSensitiveQueryValuesInText(
        "GET /d/private-snapshot?utm_medium=referral",
      ),
    ).toBe("GET /d/[shared-analysis]?utm_medium=referral");
  });

  it("keeps third-party telemetry disabled after leaving a sensitive route", () => {
    let disabled = shouldKeepThirdPartyTelemetryDisabled("/pricing", false);
    expect(disabled).toBe(false);
    disabled = shouldKeepThirdPartyTelemetryDisabled(
      "/d/private-snapshot",
      disabled,
    );
    expect(disabled).toBe(true);
    disabled = shouldKeepThirdPartyTelemetryDisabled("/", disabled);
    expect(disabled).toBe(true);
  });

  it("treats every embed, share capability, and sensitive query as a document boundary", () => {
    for (const location of [
      "/embed/rental-cash-flow-calculator",
      "/embed/brand/private-token/calculator",
      "/s/private-token",
      "/d/private-snapshot",
      "/portal/private-token/d/private-deal",
      "/dashboard/saved-analyses?q=123%20Main%20St",
      "/auth/login?next=%2Fdashboard%2Fsaved-analyses%2Fprivate-id",
    ]) {
      expect(
        shouldKeepThirdPartyTelemetryDisabled(location, false),
        location,
      ).toBe(true);
      // The cookieless page-analytics gate exempts two exact `next` values
      // (see the allowlist tests below) and nothing in this list.
      expect(
        shouldKeepCookielessPageAnalyticsDisabled(location, false),
        location,
      ).toBe(true);
    }
    expect(hasSensitiveQueryParameter("/pricing?utm_source=ad")).toBe(false);
    expect(
      shouldKeepThirdPartyTelemetryDisabled("/pricing?utm_source=ad", false),
    ).toBe(false);
  });

  it("scrubs raw query strings and objects", () => {
    expect(sanitizeSensitiveQuery("pdf_claim=id&utm_source=ad")).toBe(
      "utm_source=ad",
    );
    expect(
      sanitizeSensitiveQuery({ pdf_purchase: "cs_live", utm_campaign: "fall" }),
    ).toEqual({ utm_campaign: "fall" });
    expect(
      sanitizeSensitiveQuery([
        ["pdf_claim", "claim-id"],
        ["utm_source", "ad"],
      ]),
    ).toEqual([["utm_source", "ad"]]);
    expect(sanitizeSensitiveQuery("deal_id=private-id&utm_medium=copy")).toBe(
      "utm_medium=copy",
    );
    expect(
      sanitizeSensitiveUrl(
        "/dashboard/saved-analyses?q=123%20Main%20St&state=all",
      ),
    ).toBe("/dashboard/saved-analyses?state=all");
    expect(
      sanitizeSensitiveUrl(
        "/auth/sign-up?next=%2Fdashboard%2Fsaved-analyses%2Fprivate-id&plan=pro",
      ),
    ).toBe("/auth/sign-up?plan=pro");
    // A counted `next` (the allowlist below) is removed from the reported
    // URL exactly like any other.
    expect(
      sanitizeSensitiveUrl("/auth/sign-up?next=%2Fdashboard%2Fnew&plan=pro"),
    ).toBe("/auth/sign-up?plan=pro");
    expect(
      sanitizeSensitiveQuery({
        purchasePrice: "325000",
        monthlyRent: "2500",
        utm_source: "tool",
      }),
    ).toEqual({ utm_source: "tool" });
  });

  it("scrubs SDK-generated URL fields without touching non-URL analytics", () => {
    expect(
      sanitizeAnalyticsUrlProperties({
        $current_url: "https://usetruecap.com/?pdf_claim=id&utm_source=ad",
        $referrer: "https://usetruecap.com/?session_id=cs_secret",
        $pathname: "/portal/private-token",
        landing_page: "/d/private-snapshot",
        property_type: "single-family",
      }),
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
      }),
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
      referer: "https://usetruecap.com/d/[shared-analysis]?utm_source=share",
      Referrer: "https://usetruecap.com/portal/[token]",
      cookie: "[scrubbed]",
      authorization: "[scrubbed]",
      "user-agent": "Example Browser",
    });

    const cookies = {
      ph_project_posthog: "private-path",
      "sb-app-auth-token": "secret",
      truecap_cookie_consent_v1: "granted",
    };
    scrubSentryRequestCookies(cookies);
    expect(cookies).toEqual({
      ph_project_posthog: "[scrubbed]",
      "sb-app-auth-token": "[scrubbed]",
      truecap_cookie_consent_v1: "[scrubbed]",
    });
  });

  it("drops UI breadcrumbs on sensitive public routes", () => {
    const breadcrumb = {
      category: "ui.click",
      message: 'button[title="123 Main Street"]',
    };
    expect(
      scrubSentryBreadcrumbUrl(breadcrumb, "/d/private-snapshot"),
    ).toBeNull();
    expect(
      scrubSentryBreadcrumbUrl(breadcrumb, "/portal/private-token"),
    ).toBeNull();
    expect(
      scrubSentryBreadcrumbUrl(breadcrumb, "/embed/brand/private-token"),
    ).toBeNull();
    expect(scrubSentryBreadcrumbUrl(breadcrumb, "/pricing")).toEqual(
      breadcrumb,
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
        values: [
          { value: "No such checkout.session: cs_live_exceptionBearer" },
        ],
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
      "GET /?pdf_purchase=[redacted]&utm_source=ad",
    );
    expect(event.request?.url).toBe(
      "https://usetruecap.com/d/[shared-analysis]?utm_source=ad",
    );
    expect(event.request?.headers?.referer).toBe(
      "https://usetruecap.com/portal/[token]",
    );
    expect(event.request?.headers?.cookie).toBe("[scrubbed]");
    expect(event.request?.cookies?.ph_project_posthog).toBe("[scrubbed]");
    expect(event.exception?.values?.[0]?.value).toBe(
      "No such checkout.session: cs_[redacted]",
    );
    expect(event.extra).toEqual({
      pathname: "/portal/[token]",
      referrer: "https://usetruecap.com/d/[shared-analysis]",
    });
    expect(event.spans?.[0]?.description).toBe(
      "GET /portal/[token]?pdf_purchase=[redacted]",
    );
    expect(event.spans?.[0]?.data["url.full"]).toBe(
      "https://usetruecap.com/embed/brand/[token]/calculator?utm_source=ad",
    );

    expect(
      scrubSentrySpanUrl({
        trace_id: "a".repeat(32),
        span_id: "b".repeat(16),
        start_timestamp: 1,
        data: { "url.query": "pdf_claim=id&utm_medium=cpc" },
      }).data["url.query"],
    ).toBe("utm_medium=cpc");
  });
});

describe("bearer-token share routes never reach analytics", () => {
  /**
   * /s/[token] is a BEARER credential: only sha256(token) is stored, so
   * whoever holds the raw string can open the deal. It shipped after the
   * redaction list was written and inherited no entry, so every share view
   * sent the live token to GA, Vercel Analytics and PostHog in page_location.
   */
  it("redacts the /s/ opaque share token", () => {
    const token = "Xk3p".repeat(10) + "abc";
    expect(
      sanitizeSensitiveUrl(`https://usetruecap.com/s/${token}`),
    ).not.toContain(token);
    expect(sanitizeSensitiveUrl(`https://usetruecap.com/s/${token}`)).toContain(
      "/s/[token]",
    );
  });

  it("disables DOM autocapture on /s/ like the other bearer routes", () => {
    expect(SENSITIVE_PUBLIC_SHARE_ROUTE_PATTERN.test("/s/abc123")).toBe(true);
  });

  it("does not over-match sibling routes that merely start with s", () => {
    for (const path of [
      "/search",
      "/states/ohio",
      "/settings",
      "/saved-analyses",
      "/sitemap.xml",
    ]) {
      expect(SENSITIVE_PUBLIC_SHARE_ROUTE_PATTERN.test(path), path).toBe(false);
      expect(
        sanitizeSensitiveUrl(`https://usetruecap.com${path}`),
        path,
      ).toContain(path);
    }
  });

  it("every bearer-shaped public route is registered", () => {
    // If a new /x/[token] route is added, add it here AND to the redaction
    // list — this is the check that would have caught /s.
    for (const [path, expected] of [
      ["/d/eyJ2IjoxfQ", "/d/[shared-analysis]"],
      ["/s/tok_abc", "/s/[token]"],
      ["/portal/tok_abc", "/portal/[token]"],
      ["/embed/brand/tok_abc", "/embed/brand/[token]"],
    ] as const) {
      expect(
        sanitizeSensitiveUrl(`https://usetruecap.com${path}`),
        path,
      ).toContain(expected);
    }
  });
});

describe("sign-up and login URLs with an allowlisted next stay counted (P1-49)", () => {
  const enc = encodeURIComponent;
  const pricingReturn = (slug: string) => `/pricing?checkout=${slug}#plans`;

  it("allowlists /dashboard/new and one pricing return per checkout plan slug, nothing else", () => {
    expect([...COUNTED_NEXT_DESTINATIONS].sort()).toEqual(
      ["/dashboard/new", ...CHECKOUT_PLAN_SLUGS.map(pricingReturn)].sort(),
    );
  });

  it("keeps cookieless page analytics on for the two allowlisted shapes", () => {
    const counted = [
      // As the in-product prompts write it (router.push, unencoded).
      "/auth/sign-up?next=/dashboard/new",
      // As useSearchParams().toString() hands it to the mount.
      "/auth/sign-up?next=%2Fdashboard%2Fnew",
      "/auth/login?next=%2Fdashboard%2Fnew",
      // /pricing and /for-agents plan buttons: plan and billing ride along.
      "/auth/sign-up?plan=agent-pro&billing=annual&next=%2Fdashboard%2Fnew",
      "/auth/sign-up?next=%2Fdashboard%2Fnew&utm_source=google&utm_medium=cpc",
      ...CHECKOUT_PLAN_SLUGS.flatMap((slug) => [
        `/auth/sign-up?next=${enc(pricingReturn(slug))}`,
        `/auth/login?next=${enc(pricingReturn(slug))}`,
      ]),
    ];
    for (const location of counted) {
      expect(isCountedNextLocation(location), location).toBe(true);
      expect(
        shouldKeepCookielessPageAnalyticsDisabled(location, false),
        location,
      ).toBe(false);
      // Google tags and PostHog use the strict gate: still off.
      expect(
        shouldKeepThirdPartyTelemetryDisabled(location, false),
        location,
      ).toBe(true);
      expect(isSensitiveTelemetryLocation(location), location).toBe(true);
    }
  });

  it("never reports next: the Vercel beforeSend hook removes it from counted URLs", () => {
    for (const next of COUNTED_NEXT_DESTINATIONS) {
      const url = `https://usetruecap.com/auth/sign-up?plan=pro&next=${enc(next)}&utm_medium=cpc`;
      for (const type of ["pageview", "event"] as const) {
        const sent = sanitizeVercelAnalyticsEvent({ type, url });
        expect(sent.url).toBe(
          "https://usetruecap.com/auth/sign-up?plan=pro&utm_medium=cpc",
        );
        expect(sent.url).not.toMatch(/next|dashboard|pricing|checkout/);
      }
    }
  });

  it("switches telemetry off for every other next value", () => {
    const refused = [
      // Open redirects and other origins.
      "/auth/sign-up?next=https%3A%2F%2Fevil.example%2Fdashboard%2Fnew",
      "/auth/sign-up?next=%2F%2Fevil.example%2Fdashboard%2Fnew",
      "/auth/sign-up?next=%2F%5Cevil.example",
      "//evil.example/auth/sign-up?next=%2Fdashboard%2Fnew",
      "https://evil.example/auth/sign-up?next=%2Fdashboard%2Fnew",
      // A deal URL, a share token, a search.
      "/auth/login?next=%2Fdashboard%2Fsaved-analyses%2F1e8f40a1-f878-45ce-9297-c8f386d8ad67",
      "/auth/login?next=%2Fdashboard%2Fsaved-analyses%2Fprivate-id",
      "/auth/sign-up?next=%2Fs%2Fprivate-token",
      "/auth/sign-up?next=%2Fd%2Fprivate-snapshot",
      "/auth/login?next=%2Ffeedback%2Ftestimonial%3Ftoken%3Dabc",
      "/auth/sign-up?next=%2Fdashboard%2Fsaved-analyses",
      "/auth/sign-up?next=%2F",
      "/auth/sign-up?next=",
      // Prefix, suffix, case and traversal variants of the allowed values.
      "/auth/sign-up?next=%2Fdashboard%2Fnew%2F",
      "/auth/sign-up?next=%2Fdashboard%2Fnew%3Faddress%3D123%2520Main%2520St",
      "/auth/sign-up?next=%2Fdashboard%2Fnew%23x",
      "/auth/sign-up?next=%2Fdashboard%2Fnewer",
      "/auth/sign-up?next=%2FDashboard%2Fnew",
      "/auth/sign-up?next=%2Fdashboard%2Fnew%2F..%2Fsaved-analyses%2Fprivate-id",
      "/auth/sign-up?next=%20%2Fdashboard%2Fnew",
      "/auth/sign-up?next=%252Fdashboard%252Fnew",
      // Pricing return: unknown or unsold slug, extra parameter, no hash.
      "/auth/sign-up?next=%2Fpricing%3Fcheckout%3Dpro%23plans",
      "/auth/sign-up?next=%2Fpricing%3Fcheckout%3Denterprise_monthly%23plans",
      "/auth/sign-up?next=%2Fpricing%3Fcheckout%3Dpro_monthly",
      "/auth/sign-up?next=%2Fpricing%3Fcheckout%3Dpro_monthly%26coupon%3DFALL%23plans",
      "/auth/sign-up?next=%2Fpricing%3Fcheckout%3Dpro_monthly%26email%3Da%2540b.co%23plans",
      "/auth/sign-up?next=%2Fpricing%3Fcheckout%3Dpro_monthly%23plans-x",
      "/auth/sign-up?next=%2Fpricing",
      // Unencoded inner query: the browser splits it, so next is not exact.
      "/auth/sign-up?next=/pricing?checkout=pro_monthly#plans",
      // Two next values, or next in another case.
      "/auth/sign-up?next=%2Fdashboard%2Fnew&next=%2Fs%2Fprivate-token",
      "/auth/sign-up?next=%2Fs%2Fprivate-token&next=%2Fdashboard%2Fnew",
      "/auth/sign-up?NEXT=%2Fdashboard%2Fnew",
      "/auth/sign-up?next=%2Fdashboard%2Fnew&Next=%2Fs%2Fprivate-token",
      // An allowed next beside another sensitive parameter.
      "/auth/sign-up?next=%2Fdashboard%2Fnew&email=a%40b.co",
      "/auth/sign-up?next=%2Fdashboard%2Fnew&code=oauth-secret",
      "/auth/sign-up?next=%2Fdashboard%2Fnew&token_hash=secret",
      "/auth/sign-up?next=%2Fdashboard%2Fnew&address=123%20Main%20St",
      // An allowed next on any page that is not sign-up or login.
      "/auth/callback?next=%2Fdashboard%2Fnew",
      "/auth/sign-up/extra?next=%2Fdashboard%2Fnew",
      "/auth/sign-up/?next=%2Fdashboard%2Fnew",
      "/pricing?next=%2Fdashboard%2Fnew",
      "/s/private-token?next=%2Fdashboard%2Fnew",
      "/?next=%2Fdashboard%2Fnew",
    ];
    for (const location of refused) {
      expect(isCountedNextLocation(location), location).toBe(false);
      expect(
        shouldKeepCookielessPageAnalyticsDisabled(location, false),
        location,
      ).toBe(true);
      expect(
        shouldKeepThirdPartyTelemetryDisabled(location, false),
        location,
      ).toBe(true);
    }
  });

  it("stays off for the rest of a document that already saw a sensitive location", () => {
    expect(
      shouldKeepCookielessPageAnalyticsDisabled(
        "/auth/sign-up?next=%2Fdashboard%2Fnew",
        true,
      ),
    ).toBe(true);
    expect(shouldKeepCookielessPageAnalyticsDisabled("/pricing", true)).toBe(true);
    expect(shouldKeepCookielessPageAnalyticsDisabled("/pricing", false)).toBe(false);
    expect(
      shouldKeepCookielessPageAnalyticsDisabled("/d/private-snapshot", false),
    ).toBe(true);
  });
});
