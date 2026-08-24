/**
 * /home-authed — the DYNAMIC homepage variant for signed-in users.
 *
 * Why this exists: the public homepage (app/page.tsx) is statically
 * generated so paid traffic gets edge-cached HTML (big LCP/TTFB win,
 * no Vercel function on the hot path). Reading auth cookies forces a
 * route dynamic, so the auth-aware version lives here instead, and
 * proxy.ts REWRITES / → /home-authed whenever a Supabase auth cookie
 * is present. The URL bar still shows "/" — users never see this path.
 *
 * If an anonymous visitor somehow lands here directly (typed URL,
 * stale cookie), the !user branch below renders the same marketing +
 * calculator experience as the static page — just uncached. Safe.
 *
 * Keep the component logic in lockstep with app/page.tsx's anon props.
 * noindex: this is a duplicate of / and must never appear in search.
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/investcalc/header";
import { InvestCalcPage } from "@/components/investcalc/investcalc-page";
import { BillingSuccessBanner } from "@/components/marketing/billing-success-banner";
import { MarketingHero } from "@/components/marketing/marketing-hero";
import {
  DataSourcesSection,
  FinalCta,
  NeverOverpayGuarantee,
  HomepageFaq,
  HowTrueCapWorks,
  ProblemBlock,
  OfferEngineSection,
  PdfProUpsell,
  Personas,
  SocialProof,
} from "@/components/marketing/landing-sections";
import { CaseStudiesSection } from "@/components/marketing/case-study";
import { OnboardingTour } from "@/components/marketing/onboarding-tour";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { TrackLandingView } from "@/components/analytics/track-landing-view";
import { StickyConversionBar } from "@/components/marketing/sticky-conversion-bar";
import { SiteFooter } from "@/components/marketing/site-footer";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAnalyzerCapabilities } from "@/lib/analyzer-capabilities";
import { getStripe } from "@/lib/stripe/client";
import { planSlugFromPriceId, type PaidPlanSlug } from "@/lib/stripe/plan-prices";
import { VERIFIED_CASE_STUDIES } from "@/lib/verified-case-studies";
import { isAdvocacyInternalUser } from "@/lib/advocacy-rollout";

export const metadata: Metadata = {
  // Same title/description as the static homepage (this IS the homepage
  // for signed-in users), but noindex + canonical "/" so search engines
  // never treat /home-authed as a separate page.
  title: "Rental Property Calculator — Cap Rate, Cash Flow & DSCR",
  description:
    "Use TrueCap to analyze rental properties with cap rate, cash-on-cash return, monthly cash flow, and long-term investment projections.",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default async function AuthedHome({
  searchParams,
}: {
  searchParams?: Promise<{ billing?: string; session_id?: string }>;
}) {
  // No JSON-LD here — this route is noindex; the schema.org graph
  // lives on the static public homepage (app/page.tsx) only.
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Post-checkout landing (?billing=success&session_id=cs_…) ────────
  // Stripe's success_url points at "/" (app/actions/billing.ts); the
  // proxy rewrites signed-in "/" here WITH the query string preserved.
  // Resolve the plan's list price from the checkout session so the
  // Google Ads conversion carries a real value for value-based bidding.
  // Deliberately read from the CHECKOUT SESSION (available instantly)
  // and not the subscriptions table — the webhook that writes that row
  // lands ~1-2s after this redirect, so a DB read would race to nothing.
  // Any failure degrades to value 0; the conversion itself is fired
  // client-side from the URL params and NEVER depends on this lookup.
  const resolvedSearchParams = (await searchParams) ?? {};
  let billingConversionValue: number | undefined;
  let billingPurchasedPlan: PaidPlanSlug | null = null;
  if (
    resolvedSearchParams.billing === "success" &&
    user &&
    process.env.STRIPE_SECRET_KEY
  ) {
    const sessionId = resolvedSearchParams.session_id;
    // Cheap shape guard so junk params never spend a Stripe API call.
    if (typeof sessionId === "string" && /^cs_[a-zA-Z0-9_]{8,240}$/.test(sessionId)) {
      try {
        const stripe = getStripe();
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ["line_items"],
        });
        // Only trust a session this user actually started.
        if (session.client_reference_id === user.id) {
          const purchasedPrice = session.line_items?.data?.[0]?.price;
          if (purchasedPrice?.unit_amount != null) billingConversionValue = purchasedPrice.unit_amount / 100;
          // Which tier did they buy? The success banner used to hardcode
          // "Pro is live" — an Agent Pro buyer's first post-payment words
          // named the cheaper tier and pointed at none of the agent tools.
          billingPurchasedPlan = planSlugFromPriceId(purchasedPrice?.id);
        }
      } catch (error) {
        console.warn(
          "[billing] could not resolve checkout session for conversion value:",
          error instanceof Error ? error.message : error
        );
      }
    }
  }
  // The four reads below (entitlements, analysis defaults, paid-plan
  // check, saved-deal count) are independent and only need user.id, so
  // run them concurrently instead of paying four serial DB round-trips
  // on the most-loaded authed page — same Promise.all batching as
  // app/dashboard/page.tsx.
  //
  // Analysis defaults: fetched so the form pre-fills with the user's
  // preferred vacancy/mgmt/financing values instead of the generic
  // engine defaults. Done server-side so there's no flash of generic
  // values before user defaults overlay. Tolerant of missing migration
  // (returns null on the 42P01 path).
  // Capability flags resolve through the SHARED helper so this route and the
  // in-shell analyzer (/dashboard/new) can never drift apart. Same queries,
  // same derivations as before the extraction.
  const {
    entitlements,
    savedDealCount,
    userAnalysisDefaults,
    canSaveDeals,
    canUpdateSavedDeals,
    saveDealLimitReached,
    canCompareDeals,
    canExportPdf,
    canUseProjections,
    canUseTaxStrategy,
    canUseExitScenarios,
    canUseDealScore,
    canUseMaxOffer,
    canUseSensitivity,
    canUseStrategies,
    canUseBuyBox,
  } = await getAnalyzerCapabilities(supabase, user);

  // (canUseShareLinks was removed: share links are deliberately FREE for
  // everyone — the /d/[encoded] growth loop — and the prop was dead all the
  // way down to ShareLinkButton.)

  return (
    // relative + overflow-x-clip: mirror of app/page.tsx — `relative` contains
    // any escaped absolutely-positioned descendant, `clip` removes horizontal
    // bleed while keeping sticky/fixed working.
    <div className="relative overflow-x-clip">
      <Header initialUser={user} initialEntitlements={entitlements} />
      {/* Post-checkout landing (?billing=success) — fires the Google Ads
          purchase conversion (value resolved above) and shows the
          one-time "Pro unlocked" acknowledgment right above the
          calculator, where the auto-saved draft + welcome-back banner
          pull the new subscriber toward completing the save. Renders
          nothing without the billing param. */}
      <Suspense fallback={null}>
        <BillingSuccessBanner conversionValue={billingConversionValue} purchasedPlanSlug={billingPurchasedPlan ?? undefined} />
      </Suspense>
      {/* Full landing experience ONLY for cold visitors (anon fallback —
          the canonical anon homepage is the static app/page.tsx, and this
          mirrors its TOOL-FIRST flow). Authenticated users skip ALL of it
          — the calculator is their workspace. For anon, only the hero
          renders above the calculator; the persuasion content follows it
          (block below) so a cold visitor reaches the working tool first. */}
      {!user && <MarketingHero />}
      <InvestCalcPage
        canSaveDeals={canSaveDeals}
        canCompareDeals={canCompareDeals}
        canExportPdf={canExportPdf}
        canUseProjections={canUseProjections}
        canUseTaxStrategy={canUseTaxStrategy}
        canUseExitScenarios={canUseExitScenarios}
        canUseDealScore={canUseDealScore}
        canUseMaxOffer={canUseMaxOffer}
        canUseSensitivity={canUseSensitivity}
        canUseStrategies={canUseStrategies}
        canUpdateSavedDeals={canUpdateSavedDeals}
        saveDealLimitReached={saveDealLimitReached}
        initialSavedDealCount={savedDealCount ?? 0}
        savedDealLimit={entitlements?.max_saved_deals ?? null}
        isAuthenticated={Boolean(user)}
        userAnalysisDefaults={userAnalysisDefaults}
        advocacyContractEligible={isAdvocacyInternalUser(user?.email)}
      />
      {/* Anon fallback only — the SAME seven-block story as app/page.tsx:
          how it works → trust → who it's for → pricing → closing ask → FAQ
          (the live analyzer above is the product proof). Lockstep is enforced
          by lib/__tests__/homepage-lockstep.test.ts. */}
      {!user && (
        <div className="truecap-marketing-tail contents">
          <ProblemBlock />
          <HowTrueCapWorks />
          <SocialProof />
          <CaseStudiesSection studies={VERIFIED_CASE_STUDIES} />
          <DataSourcesSection />
          <OfferEngineSection />
          <PdfProUpsell />
          <NeverOverpayGuarantee />
          <Personas />
          <HomepageFaq />
          <FinalCta />
          <StickyConversionBar />
        </div>
      )}
      {/* Sticky scroll-activated CTA bar for cold visitors only. Renders
          nothing for auth'd users. */}
      {/* Onboarding tour — only fires for signed-in users with zero
          saved deals (the clear first-time-signup signal). 3-step
          floating card that walks them through Try Sample → Save →
          See Pro. Dismissible, persisted to localStorage. */}
      {user && (
        <OnboardingTour
          isAuthenticated={true}
          savedDealCount={savedDealCount ?? 0}
          canUseBuyBox={canUseBuyBox}
        />
      )}
      {/* Engagement signal pump for Google Ads — fires dataLayer scroll
          depth events so the bidding algorithm has something to
          optimize against beyond rare conversions. */}
      <ScrollDepthTracker />
      {/* Fires PostHog `landing_view` once on mount — top of the
          conversion funnel. Pairs with `analyzer_started`,
          `analysis_completed`, `pro_checkout_started`, `pro_subscribed`
          to build a 5-step funnel chart in the PostHog dashboard. */}
      <TrackLandingView />
      {/* Site footer — trust + sitemap + brand, for ANON visitors only.
          It carries a hardcoded Account column (Sign in / Create account /
          Forgot password) with no auth awareness, so rendering it to a
          signed-in user invited them to sign in from inside the product.
          Gated like MarketingHero / the landing sections / StickyConversionBar
          above. */}
      {!user ? <SiteFooter /> : null}
    </div>
  );
}
