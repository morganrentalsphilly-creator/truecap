import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

function section(source: string, startMarker: string, endMarker: string) {
  const start = source.indexOf(startMarker);
  expect(start, `missing source marker: ${startMarker}`).toBeGreaterThanOrEqual(
    0,
  );
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(
    end,
    `missing source marker after ${startMarker}: ${endMarker}`,
  ).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("authenticated analyzer consolidation", () => {
  const billingAction = read("app/actions/billing.ts");
  const dashboardAnalyzer = read("app/dashboard/new/page.tsx");
  const cookieCheckHome = read("app/home-authed/page.tsx");

  it("returns subscription Checkouts through an HttpOnly handoff to the in-shell analyzer", () => {
    expect(billingAction).toContain(
      "success_url: `${siteUrl}/api/billing/return?session_id={CHECKOUT_SESSION_ID}`",
    );
    expect(billingAction).not.toContain(
      "success_url: `${siteUrl}/?billing=success&session_id={CHECKOUT_SESSION_ID}`",
    );
  });

  it("resolves the same user-bound Session value on /dashboard/new and mounts the existing banner", () => {
    expect(dashboardAnalyzer).toContain("billing?: string");
    expect(dashboardAnalyzer).toContain("session_id?: string");
    expect(dashboardAnalyzer).toContain(
      'resolvedSearchParams.billing === "success"',
    );
    expect(dashboardAnalyzer).toContain(
      "/^cs_[a-zA-Z0-9_]{8,240}$/.test(sessionId)",
    );
    expect(dashboardAnalyzer).toContain(
      "stripe.checkout.sessions.retrieve(sessionId",
    );
    expect(dashboardAnalyzer).toContain('expand: ["line_items"]');
    expect(dashboardAnalyzer).toContain(
      "session.client_reference_id === user.id",
    );
    expect(dashboardAnalyzer).toContain("purchasedPrice.unit_amount / 100");
    expect(dashboardAnalyzer).toContain(
      "planSlugFromPriceId(purchasedPrice?.id)",
    );
    expect(dashboardAnalyzer).toContain("<BillingSuccessBanner");
    expect(dashboardAnalyzer).toContain(
      "conversionValue={billingConversionValue}",
    );
    expect(dashboardAnalyzer).toContain(
      "purchasedPlanSlug={billingPurchasedPlan ?? undefined}",
    );
  });

  it("redirects a verified signed-in root request while reflecting only validated analyzer parameters", () => {
    const redirectFlow = section(
      cookieCheckHome,
      "const resolvedSearchParams =",
      "// Only the stale-cookie anonymous fallback",
    );

    expect(redirectFlow).toContain("if (user)");
    expect(redirectFlow).toContain(
      "const analyzerParams = new URLSearchParams()",
    );
    expect(redirectFlow).toContain(
      "/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(",
    );
    expect(redirectFlow).toContain("isCheckoutSessionId(sessionId)");
    expect(redirectFlow).toContain("cookies()).get(CHECKOUT_RETURN_COOKIE)");
    expect(redirectFlow).toContain("redirect(`/api/billing/return?session_id=");
    expect(redirectFlow).not.toContain('analyzerParams.set("session_id"');
    expect(redirectFlow).toContain(
      'resolvedSearchParams.billing === "success"',
    );
    expect(redirectFlow).toContain(
      'redirect(`/dashboard/new${query ? `?${query}` : ""}`)',
    );

    const reflectedKeys = [
      ...redirectFlow.matchAll(/analyzerParams\.set\("([^"]+)"/g),
    ].map((match) => match[1]);
    // `address` is forwarded only from /analyze?address= (bounded, non-URL),
    // so a signed-in visitor keeps the property they typed on the homepage.
    // `strategy` (released keys only) keeps the persona-page play seed and
    // `sample` (only "1", only from /analyze) keeps "See the sample deal"
    // working for signed-in visitors — both are read at analyzer mount on
    // /dashboard/new, so dropping them here made the promise silently false.
    expect(reflectedKeys).toEqual([
      "savedDeal",
      "billing",
      "address",
      "strategy",
      "sample",
    ]);
    expect(redirectFlow).toContain(
      "isReleasedHandoffStrategy(resolvedSearchParams.strategy)",
    );
    expect(redirectFlow).toContain('resolvedSearchParams.sample === "1"');
    expect(redirectFlow).toContain('analyzerParams.set("sample", "1")');
    // /dashboard/new must turn the forwarded flag into the sample run with
    // the same island /analyze uses (it is the only reader of ?sample=1).
    expect(dashboardAnalyzer).toContain(
      'from "@/components/marketing/analyze-entry-from-query"',
    );
    expect(dashboardAnalyzer.indexOf("<AnalyzeEntryFromQuery />")).toBeGreaterThan(0);
    expect(dashboardAnalyzer.indexOf("<AnalyzeEntryFromQuery />")).toBeLessThan(
      dashboardAnalyzer.indexOf("<InvestCalcPage"),
    );
    expect(redirectFlow).not.toContain("Object.entries");
    expect(redirectFlow).not.toContain("getStripe");
    expect(cookieCheckHome).not.toContain("BillingSuccessBanner");
  });

  it("keeps the stale-cookie anonymous fallback intact", () => {
    expect(cookieCheckHome).toContain("{!user && <MarketingHero />}");
    expect(cookieCheckHome).toContain("isAuthenticated: Boolean(user)");
    expect(cookieCheckHome).toContain("{!user && (");
    expect(cookieCheckHome).toContain("{!user ? <SiteFooter /> : null}");
    expect(cookieCheckHome.indexOf("redirect(`/dashboard/new")).toBeLessThan(
      cookieCheckHome.indexOf("await getAnalyzerCapabilities(supabase, user)"),
    );
  });
});
