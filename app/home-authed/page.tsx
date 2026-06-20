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
import { Header } from "@/components/investcalc/header";
import { InvestCalcPage } from "@/components/investcalc/investcalc-page";
import { MarketingHero } from "@/components/marketing/marketing-hero";
import {
  HomepageFaq,
  HowItWorks,
  PreCalculatorCta,
  SocialProof,
  VsCompetitors,
  WhyNotSpreadsheet,
} from "@/components/marketing/landing-sections";
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

export default async function AuthedHome() {
  // No JSON-LD here — this route is noindex; the schema.org graph
  // lives on the static public homepage (app/page.tsx) only.
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const entitlements = user ? await getEntitlementsForUser(supabase, user.id) : null;
  // Fetch the user's analysis defaults so the form pre-fills with
  // their preferred vacancy/mgmt/financing values instead of the
  // generic engine defaults. Done server-side so there's no flash
  // of generic values before user defaults overlay. Tolerant of
  // missing migration (returns null on the 42P01 path).
  let userAnalysisDefaults: Record<string, number> | null = null;
  if (user) {
    const { data: defaultsRow } = await supabase
      .from("user_analysis_defaults")
      .select("preferences")
      .eq("user_id", user.id)
      .maybeSingle();
    const prefs = (defaultsRow as { preferences?: unknown } | null)?.preferences;
    if (prefs && typeof prefs === "object" && !Array.isArray(prefs)) {
      const sanitized: Record<string, number> = {};
      for (const [k, v] of Object.entries(prefs as Record<string, unknown>)) {
        if (typeof v === "number" && Number.isFinite(v)) sanitized[k] = v;
      }
      if (Object.keys(sanitized).length > 0) userAnalysisDefaults = sanitized;
    }
  }
  const canUpdateSavedDeals = user ? await hasPaidPlanSubscription(supabase, user.id) : false;
  const { count: savedDealCount } = user
    ? await supabase
        .from("saved_analyses")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("deleted_at", null)
    : { count: 0 };
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
  const canUseShareLinks = isPaidPlan;

  return (
    <>
      <Header initialUser={user} initialEntitlements={entitlements} />
      {/* Full landing page experience ONLY for cold visitors. Authenticated
          users skip ALL of it — the calculator is their workspace. Order
          mirrors the buying journey: hero → how it works → why us vs
          spreadsheet → social proof → final-push CTA → the calculator. */}
      {!user && (
        <>
          <MarketingHero />
          <HowItWorks />
          <WhyNotSpreadsheet />
          <VsCompetitors />
          <SocialProof />
          <HomepageFaq />
          <PreCalculatorCta />
        </>
      )}
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
        canUseShareLinks={canUseShareLinks}
        canUpdateSavedDeals={canUpdateSavedDeals}
        saveDealLimitReached={saveDealLimitReached}
        initialSavedDealCount={savedDealCount ?? 0}
        savedDealLimit={entitlements?.max_saved_deals ?? null}
        isAuthenticated={Boolean(user)}
        userAnalysisDefaults={userAnalysisDefaults}
        dealQaEnabled={Boolean(process.env.ANTHROPIC_API_KEY)}
      />
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
    </>
  );
}
