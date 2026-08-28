/**
 * Public homepage — STATIC (ISR, revalidated hourly).
 *
 * This page deliberately reads NO cookies and NO per-user data, so
 * Next prerenders it and Vercel serves cached HTML from the edge —
 * every paid-ad click gets ~instant TTFB instead of waiting on a
 * serverless function + Supabase round-trips. That auth-aware version
 * of the homepage lives at app/home-authed/page.tsx; proxy.ts rewrites
 * "/" → "/home-authed" when a Supabase auth cookie is present, so
 * signed-in users still get their personalized calculator at the same
 * URL and never see the marketing sections.
 *
 * RULES for this file:
 *  - Never import lib/supabase/server.ts or anything that calls
 *    cookies()/headers() — that silently flips the route back to
 *    dynamic and undoes the entire optimization.
 *  - All entitlement props below are the anonymous-visitor values.
 *    If you add a prop to InvestCalcPage, set it here to exactly what
 *    app/home-authed/page.tsx computes for user == null.
 *  - Acquisition pages deliberately do not publish the legacy cumulative
 *    analysis counter because it includes an owner-confirmed seed and repeat
 *    runs rather than a unique-customer or unique-property population.
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
  HomepageFaq,
  PdfProUpsell,
  SocialProof,
} from "@/components/marketing/landing-sections";
import { CaseStudiesSection } from "@/components/marketing/case-study";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { TrackLandingView } from "@/components/analytics/track-landing-view";
import { StickyConversionBar } from "@/components/marketing/sticky-conversion-bar";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";
import { VERIFIED_CASE_STUDIES } from "@/lib/verified-case-studies";

// ISR: prerendered at build, regenerated in the background at most
// hourly. Keeps content edits fresh without giving up edge caching.
export const revalidate = 3600;

export const metadata: Metadata = {
  // Underwriting-led title; keyword-led /tools pages remain the SEO
  // acquisition layer.
  // /tools/* pages keep their keyword-led "Free ... Calculator" titles as
  // the SEO traffic source. `absolute` opts out of the layout's
  // "%s | TrueCap" template.
  title: {
    absolute: "TrueCap — Rental Property Underwriting in Minutes",
  },
  description:
    "Paste an address or supported listing, review editable assumptions, and see first-year cash flow, returns, cash required, and the price that fits your targets.",
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
    title: "TrueCap — Rental Property Underwriting in Minutes",
    description:
      "A preliminary rental screen with editable assumptions and a modeled price threshold under explicit user targets.",
    url: "/",
    type: "website",
    // Re-declare images because page-level openGraph fully replaces the
    // layout's (Next metadata isn't a deep merge). Without this, every
    // social share of the homepage would render without a preview card.
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap — real estate investment analyzer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TrueCap — Rental Property Underwriting in Minutes",
    description:
      "A preliminary rental screen with editable assumptions and a modeled price threshold under explicit user targets.",
    images: ["/home.jpg"],
  },
};

export default function Home() {
  const siteUrl = getSiteUrl();
  // Schema.org — SoftwareApplication only. Organization and WebSite
  // (with the sitelinks SearchAction) are emitted ONCE, site-wide, by
  // app/layout.tsx; duplicating them here shipped two identical
  // Organization/WebSite nodes on the homepage and muddied the
  // knowledge-graph signal. The @id reference below resolves to the
  // layout's Organization node — don't re-declare the entity here.
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}/#software`,
        name: "TrueCap",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        url: siteUrl,
        description:
          "Rental property screening software for modeled cash flow, returns, cash required, editable assumptions, comparison, and target-based price thresholds.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        publisher: { "@id": `${siteUrl}/#organization` },
      },
    ],
  };

  return (
    // relative + overflow-x-clip: clips any horizontal bleed from a descendant
    // so the mobile page can't scroll sideways. `relative` makes this the
    // containing block for any descendant `position: absolute` that lacks a
    // closer positioned ancestor (e.g. an `sr-only` label inside a wide
    // element) so it's re-parented here and then clipped — the exact escape
    // route documented in globals.css. `clip` (not `hidden`) does NOT establish
    // a scroll container, so the sticky header / step rail and the fixed bottom
    // bars keep working — unlike overflow on html/body, which is known to break
    // position:sticky and scrollTo on iOS Safari.
    <div className="relative overflow-x-clip">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {/* This static page only serves cold visitors — signed-in users are
          rewritten to /home-authed by the proxy. In the RARE case a signed-in
          user reaches this cached page (proxy cookie miss), they see the
          anonymous header + free-tier calculator until they navigate: the
          entitlements below are baked anon at build and do NOT self-correct
          client-side. (A cookie-gated getUser→reload self-heal is possible but
          deliberately omitted — not worth a reload-loop risk on the highest-
          traffic page for a rare edge.) */}
      <Header initialUser={null} initialEntitlements={null} />
      {/* Legacy post-checkout compatibility mount. New subscription Checkout
          Sessions return to /dashboard/new; keeping this fail-closed client
          reader preserves conversion recovery for older return URLs without
          making the public homepage dynamic. */}
      <Suspense fallback={null}>
        <BillingSuccessBanner />
      </Suspense>
      {/* Landing flow — this page only serves cold visitors (signed-in
          users are rewritten to /home-authed). TOOL-FIRST order (CRO,
          Jun 2026): the product promise is speed, so the working
          calculator sits directly under the hero — a visitor can run a
          real deal without scrolling past marketing first. The persuasion
          + objection content then catches everyone who scrolled instead of
          converting:
            hero (address input) → the calculator → spreadsheet-pain →
            how it works → data sources/accuracy → social proof →
            value-ladder/PDF/Pro → personas → FAQ.
          Keep this order in lockstep with the anon branch of
          app/home-authed/page.tsx. The full DealCheck/BiggerPockets
          comparison table stays on the dedicated /why-truecap page
          (linked in the footer) so it keeps its SEO + persuasion value
          without crowding this page. */}
      <MarketingHero />
      {/* Anonymous-visitor entitlement props — keep in lockstep with
          the user == null branch in app/home-authed/page.tsx.
          NOTE: canUseDealScore is intentionally TRUE for everyone — the
          headline 0-100 Screening Index is given away free (it converts better
          unlocked than as a blurred teaser). The one exact no-signup decision
          may export its personal report; repeat projections, tax/exit, saving,
          comparison, and reusable workflows stay gated. */}
      <InvestCalcPage
        canSaveDeals={false}
        canCompareDeals={false}
        canExportPdf={false}
        canUseProjections={false}
        canUseTaxStrategy={false}
        canUseExitScenarios={false}
        canUseDealScore={true}
        canUseMaxOffer={true}
        canUseSensitivity={true}
        canUseStrategies={false}
        canUpdateSavedDeals={false}
        saveDealLimitReached={false}
        initialSavedDealCount={0}
        savedDealLimit={null}
        isAuthenticated={false}
        userAnalysisDefaults={null}
        advocacyContractEligible={false}
        // Presence-only env check — safe on a static page (baked at
        // build; the key VALUE never reaches the client).
      />
      {/* Seven-block acquisition story:
          1 outcome (hero), 2 interactive product proof (live analyzer),
          3 trustworthy numbers, 4 Free vs Pro, 5 verified proof when records
          exist, 6 objections/FAQ, 7 final CTA.
          MUST stay in lockstep with app/home-authed/page.tsx. */}
      <div className="truecap-marketing-tail contents">
        <DataSourcesSection />
        <PdfProUpsell />
        <div data-homepage-block="real-proof" className="contents">
          <SocialProof />
          <CaseStudiesSection studies={VERIFIED_CASE_STUDIES} />
        </div>
        <HomepageFaq />
        <FinalCta />
        {/* Sticky scroll-activated CTA bar — cold visitors only, and this
            page only serves cold visitors. */}
        <StickyConversionBar />
      </div>
      {/* Engagement signal pump for Google Ads — fires dataLayer scroll
          depth events so the bidding algorithm has something to
          optimize against beyond rare conversions. */}
      <ScrollDepthTracker />
      {/* Fires PostHog `landing_view` once on mount — top of the
          conversion funnel. */}
      <TrackLandingView />
      {/* Site footer — trust + sitemap + brand. */}
      <SiteFooter />
    </div>
  );
}
