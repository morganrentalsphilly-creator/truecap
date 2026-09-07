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
import { Testimonials } from "@/components/marketing/testimonials";
import { redirect } from "next/navigation";
import { Header } from "@/components/investcalc/header";
import { AnalyzePageContent } from "@/components/marketing/analyze-page-content";
import { MarketingHero } from "@/components/marketing/marketing-hero";
import {
  DataSourcesSection,
  FinalCta,
  HomepageFaq,
  PdfProUpsell,
  SocialProof,
} from "@/components/marketing/landing-sections";
import { CaseStudiesSection } from "@/components/marketing/case-study";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { TrackLandingView } from "@/components/analytics/track-landing-view";
import { StickyConversionBar } from "@/components/marketing/sticky-conversion-bar";
import { SiteFooter } from "@/components/marketing/site-footer";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAnalyzerCapabilities } from "@/lib/analyzer-capabilities";
import { isReleasedHandoffStrategy } from "@/lib/analyzer-handoff";
import { cookies } from "next/headers";
import { CHECKOUT_RETURN_COOKIE, isCheckoutSessionId } from "@/lib/stripe/checkout-return-cookie";
import { VERIFIED_CASE_STUDIES } from "@/lib/verified-case-studies";

export const metadata: Metadata = {
  // Same homepage identity; the signed-in route remains excluded from indexing.
  robots: { index: false, follow: true },
  // `absolute` prevents the root layout from adding a second brand suffix.
  title: {
    absolute: "Rental Property Calculator & Max Offer | TrueCap",
  },
  description:
    "Analyze a rental property from an address, edit every assumption, and see cash flow, cap rate, DSCR, cash-on-cash return, and a target-based Offer Ceiling.",
  keywords: [
    "rental property analysis",
    "investment property calculator",
    "cap rate",
    "cash on cash return",
    "real estate cash flow",
    "rental property ROI",
    "real estate deal analysis",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    // Keep og:title aligned with the <title> — Google falls back to
    // og:title when rewriting SERP titles, so a mismatched og:title
    // resurfaces stale phrasing on brand queries.
    title: "Rental Property Calculator & Max Offer | TrueCap",
    description:
      "Analyze a rental property from an address, edit every assumption, and see cash flow, cap rate, DSCR, cash-on-cash return, and a target-based Offer Ceiling.",
    url: "/",
    type: "website",
    // Re-declare images because page-level openGraph fully replaces the
    // layout's (Next metadata isn't a deep merge). Without this, every
    // social share of the homepage would render without a preview card.
    images: [
      {
        url: "/og/home",
        width: 1200,
        height: 630,
        alt: "TrueCap rental property calculator and Offer Ceiling workflow",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rental Property Calculator & Max Offer | TrueCap",
    description:
      "Analyze a rental property from an address, edit every assumption, and see cash flow, cap rate, DSCR, cash-on-cash return, and a target-based Offer Ceiling.",
    images: ["/og/home"],
  },
};

export default async function AuthedHome({
  searchParams,
}: {
  searchParams?: Promise<{ billing?: string; session_id?: string; savedDeal?: string;
    tc_from?: string;
    address?: string;
    strategy?: string;
    sample?: string;
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

    // Legacy checkout URLs go through the cookie handoff before any page
    // renders. A clean return forwards only its status, never the Session id.
    if (resolvedSearchParams.billing === "success") {
      const sessionId = resolvedSearchParams.session_id;
      if (isCheckoutSessionId(sessionId)) {
        redirect(`/api/billing/return?session_id=${encodeURIComponent(sessionId)}`);
      }
      const returnSession = (await cookies()).get(CHECKOUT_RETURN_COOKIE)?.value;
      if (isCheckoutSessionId(returnSession)) analyzerParams.set("billing", "success");
    }

    // /analyze?address=… for a signed-in visitor: carry the address into the
    // in-app analyzer (the root-layout bootstrap runs on /dashboard/new too —
    // ANALYZER_HANDOFF_BOOTSTRAP_PATHS — and moves it into the private
    // sessionStorage handoff before any vendor script runs). Bounded and
    // shape-checked; a listing URL is not forwarded.
    const address = resolvedSearchParams.address;
    if (
      resolvedSearchParams.tc_from === "analyze" &&
      typeof address === "string" &&
      address.trim().length > 0 &&
      address.length <= 200 &&
      !/^https?:\/\//i.test(address.trim())
    ) {
      analyzerParams.set("address", address.trim());
    }

    // /analyze?strategy=… (persona pages, blog posts): the play seed is read
    // once, at analyzer mount, so it must survive the redirect or a signed-in
    // visitor gets a blank default analyzer instead of the promised House
    // Hack / Buy & Hold form. Released keys only — same gate as the link.
    if (isReleasedHandoffStrategy(resolvedSearchParams.strategy)) {
      analyzerParams.set("strategy", resolvedSearchParams.strategy);
    }

    // /analyze?sample=1 ("See the sample deal", the /vs pages' "Run it
    // yourself"): /dashboard/new mounts the same AnalyzeEntryFromQuery
    // island as /analyze, which turns the flag into the sample run.
    if (
      resolvedSearchParams.tc_from === "analyze" &&
      resolvedSearchParams.sample === "1"
    ) {
      analyzerParams.set("sample", "1");
    }

    const query = analyzerParams.toString();
    redirect(`/dashboard/new${query ? `?${query}` : ""}`);
  }

  const mirroringAnalyze = resolvedSearchParams.tc_from === "analyze";
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

  if (mirroringAnalyze) {
    // Stale-cookie visitor on /analyze: the same page app/analyze/page.tsx
    // renders, just uncached. Capabilities come from the shared resolver so
    // the flags cannot drift from the static route's ANON_ANALYZER_PROPS.
    return (
      <div className="relative overflow-x-clip">
        <Header initialUser={user} initialEntitlements={entitlements} />
        {/* The analyzer itself provides progressive, contextual guidance.
            Do not place a first-run tour over its controls: the former
            floating five-step card obscured and intercepted the primary
            Calculate action for exactly the zero-deal users who needed the
            clearest first run. */}
        <AnalyzePageContent
          analyzerProps={{
            canSaveDeals,
            canCompareDeals,
            canExportPdf,
            canUseProjections,
            canUseTaxStrategy,
            canUseExitScenarios,
            canUseDealScore,
            canUseMaxOffer,
            canUseSensitivity,
            canUseStrategies,
            canUpdateSavedDeals,
            saveDealLimitReached,
            initialSavedDealCount: savedDealCount ?? 0,
            savedDealLimit: entitlements?.max_saved_deals ?? null,
            isAuthenticated: Boolean(user),
            userAnalysisDefaults,
            advocacyContractEligible: false,
          }}
        />
        <SiteFooter disclaimer={false} />
      </div>
    );
  }

  return (
    // relative + overflow-x-clip: mirror of app/page.tsx — `relative` contains
    // any escaped absolutely-positioned descendant, `clip` removes horizontal
    // bleed while keeping sticky/fixed working.
    <div className="relative overflow-x-clip">
      <Header initialUser={user} initialEntitlements={entitlements} />
      {/* Cold-visitor homepage (stale-cookie fallback). The analyzer lives at
          /analyze; the hero hands off there. MUST stay in lockstep with
          app/page.tsx — lib/__tests__/homepage-lockstep.test.ts enforces the
          section list and that neither page imports the analyzer. */}
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
      {!user && <MarketingHero />}
      {!user && (
        <div className="truecap-marketing-tail contents">
          <DataSourcesSection />
          <PdfProUpsell />
          <div data-homepage-block="real-proof" className="contents">
            <SocialProof />
            <Testimonials limit={3} />
            <CaseStudiesSection studies={VERIFIED_CASE_STUDIES} />
          </div>
          <HomepageFaq />
          <FinalCta />
          <StickyConversionBar />
        </div>
      )}
      </main>
      {/* Engagement signal pump for Google Ads — fires dataLayer scroll
          depth events so the bidding algorithm has something to
          optimize against beyond rare conversions. */}
      <ScrollDepthTracker />
      {/* Fires PostHog `landing_view` once on mount — top of the
          conversion funnel. */}
      <TrackLandingView />
      {/* Site footer for ANON visitors only (it carries a hardcoded
          Account column with sign-in links). */}
      {!user ? <SiteFooter /> : null}
    </div>
  );
}
