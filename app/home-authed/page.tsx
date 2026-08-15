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
  FiveDealGuarantee,
  HomepageFaq,
  HowTrueCapWorks,
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
import {
  getEntitlementsForUser,
  hasPaidPlanSubscription,
  hasPlanFeature,
  hasSavedDealCapacity,
} from "@/lib/entitlements";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { planSlugFromPriceId, type PaidPlanSlug } from "@/lib/stripe/plan-prices";
import { VERIFIED_CASE_STUDIES } from "@/lib/verified-case-studies";

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
  const [entitlements, defaultsQuery, canUpdateSavedDeals, savedCountQuery] = user
    ? await Promise.all([
        getEntitlementsForUser(supabase, user.id),
        supabase
          .from("user_analysis_defaults")
          .select("preferences")
          .eq("user_id", user.id)
          .maybeSingle(),
        hasPaidPlanSubscription(supabase, user.id),
        supabase
          .from("saved_analyses")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("deleted_at", null),
      ])
    : [null, null, false, null];
  let userAnalysisDefaults: Record<string, number> | null = null;
  const prefs = (defaultsQuery?.data as { preferences?: unknown } | null)?.preferences;
  if (prefs && typeof prefs === "object" && !Array.isArray(prefs)) {
    const sanitized: Record<string, number> = {};
    for (const [k, v] of Object.entries(prefs as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isFinite(v)) sanitized[k] = v;
    }
    if (Object.keys(sanitized).length > 0) userAnalysisDefaults = sanitized;
  }
  const savedDealCount = savedCountQuery?.count ?? 0;
  const canSaveDeals = entitlements ? hasPlanFeature(entitlements, "save_deal") : false;
  const saveDealLimitReached = entitlements ? !hasSavedDealCapacity(entitlements, savedDealCount ?? 0) : false;
  const canCompareDeals = entitlements ? hasPlanFeature(entitlements, "compare_deals") : false;
  const canExportPdf = entitlements ? hasPlanFeature(entitlements, "pdf_export") : false;
  const canUseProjections = entitlements ? hasPlanFeature(entitlements, "projections") : false;
  const canUseTaxStrategy = entitlements ? hasPlanFeature(entitlements, "tax_strategy") : false;
  const canUseExitScenarios = entitlements ? hasPlanFeature(entitlements, "exit_scenarios") : false;
  // Deal Score is FREE for everyone (free + Pro): the headline 0-100 verdict
  // converts better given away than locked behind Pro. Depth (projections /
  // tax / exit / save / PDF / compare) stays gated by the checks above/below.
  const canUseDealScore = true;
  // Pro-gated features that weren't previously gated. Derived from
  // hasPaidPlanSubscription (any paid plan = unlocked) so we don't need
  // a DB migration to add new feature keys per plan. If you later split
  // these by plan tier, replace with hasPlanFeature checks.
  const isPaidPlan = canUpdateSavedDeals; // already derived from hasPaidPlanSubscription
  const canUseMaxOffer = isPaidPlan;
  const canUseSensitivity = isPaidPlan;
  const canUseStrategies = isPaidPlan;
  const canUseBuyBox = entitlements ? hasPlanFeature(entitlements, "buy_box") : false;
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
        dealQaEnabled={Boolean(process.env.ANTHROPIC_API_KEY)}
      />
      {/* Anon fallback only — the SAME seven-block story as app/page.tsx:
          how it works → trust → who it's for → pricing → closing ask → FAQ
          (the live analyzer above is the product proof). Lockstep is enforced
          by lib/__tests__/homepage-lockstep.test.ts. */}
      {!user && (
        <>
          <HowTrueCapWorks />
          <OfferEngineSection />
          <DataSourcesSection />
          <SocialProof />
          <CaseStudiesSection studies={VERIFIED_CASE_STUDIES} />
          <Personas />
          <PdfProUpsell />
          <FiveDealGuarantee />
          <FinalCta />
          <HomepageFaq />
        </>
      )}
      {/* Sticky scroll-activated CTA bar for cold visitors only. Renders
          nothing for auth'd users. */}
      {!user && <StickyConversionBar />}
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
      {/* Site footer — trust + sitemap + brand. Shown to everyone; helps
          with Quality Score and dwell time. */}
      <SiteFooter />
    </div>
  );
}
