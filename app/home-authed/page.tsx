/**
 * /home-authed — the DYNAMIC cookie-check variant of the public homepage.
 *
 * Why this exists: the public homepage (app/page.tsx) is statically
 * generated so paid traffic gets edge-cached HTML (big LCP/TTFB win,
 * no Vercel function on the hot path). Reading auth cookies forces a
 * route dynamic, so this verifier lives here, and proxy.ts REWRITES
 * / → /home-authed whenever a Supabase auth cookie is present. A verified
 * signed-in user is then redirected to the in-shell /dashboard/new analyzer.
 *
 * If an anonymous visitor somehow lands here directly (typed URL,
 * stale cookie), the !user branch below renders the same marketing +
 * calculator experience as the static page — just uncached. Safe.
 *
 * Keep the component logic in lockstep with app/page.tsx's anon props.
 * noindex: this is a duplicate of / and must never appear in search.
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Header } from "@/components/investcalc/header";
import { InvestCalcPage } from "@/components/investcalc/investcalc-page";
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
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { TrackLandingView } from "@/components/analytics/track-landing-view";
import { StickyConversionBar } from "@/components/marketing/sticky-conversion-bar";
import { SiteFooter } from "@/components/marketing/site-footer";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAnalyzerCapabilities } from "@/lib/analyzer-capabilities";
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
  searchParams?: Promise<{ billing?: string; session_id?: string; savedDeal?: string;
  }>;
}) {
  // No JSON-LD here — this route is noindex; the schema.org graph
  // lives on the static public homepage (app/page.tsx) only.
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const resolvedSearchParams = (await searchParams) ?? {};

  if (user) {
    // Preserve only analyzer-owned, shape-validated parameters. Marketing,
    // attribution, and arbitrary query keys must not be reflected into the
    // authenticated product URL.
    const analyzerParams = new URLSearchParams();
    const savedDeal = resolvedSearchParams.savedDeal;
    if (
      typeof savedDeal === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        savedDeal,
      )
    ) {
      analyzerParams.set("savedDeal", savedDeal);
    }

    const sessionId = resolvedSearchParams.session_id;
    if (
      resolvedSearchParams.billing === "success" &&
      typeof sessionId === "string" && /^cs_[a-zA-Z0-9_]{8,240}$/.test(sessionId)) {
      analyzerParams.set("billing", "success");
      analyzerParams.set("session_id", sessionId);
    }

    const query = analyzerParams.toString();
    redirect(`/dashboard/new${query ? `?${query}` : ""}`);
  }
  // Only the stale-cookie anonymous fallback reaches this point. Resolve its
  // free capabilities through the shared helper so this uncached fallback
  // stays in lockstep with the static public analyzer.
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
        isAuthenticated={false}
        userAnalysisDefaults={userAnalysisDefaults}
        advocacyContractEligible={false}
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
      {/* The analyzer itself now provides progressive, contextual guidance.
          Do not place a first-run tour over its controls: the former floating
          five-step card obscured and intercepted the primary Calculate action
          for exactly the zero-deal users who needed the clearest first run. */}
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
