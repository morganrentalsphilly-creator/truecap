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

  it("returns new subscription Checkouts directly to the in-shell analyzer", () => {
    expect(billingAction).toContain(
      "success_url: `${siteUrl}/dashboard/new?billing=success&session_id={CHECKOUT_SESSION_ID}`",
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
    expect(redirectFlow).toContain(
      "/^cs_[a-zA-Z0-9_]{8,240}$/.test(sessionId)",
    );
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
    expect(reflectedKeys).toEqual(["savedDeal", "billing", "session_id", "address"]);
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
