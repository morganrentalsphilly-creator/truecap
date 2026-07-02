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
 *  - DealsAnalyzedTicker (inside MarketingHero) uses the admin client
 *    at render time; under ISR that runs at build/revalidate — the
 *    count refreshes hourly, which is fine for a trust badge.
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/investcalc/header";
import { InvestCalcPage } from "@/components/investcalc/investcalc-page";
import { BillingSuccessBanner } from "@/components/marketing/billing-success-banner";
import { MarketingHero } from "@/components/marketing/marketing-hero";
import {
  DataSourcesSection,
  FeaturedIn,
  HomepageFaq,
  HowItWorks,
  PdfProUpsell,
  Personas,
  SocialProof,
  WhyNotSpreadsheet,
} from "@/components/marketing/landing-sections";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { TrackLandingView } from "@/components/analytics/track-landing-view";
import { StickyConversionBar } from "@/components/marketing/sticky-conversion-bar";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

// ISR: prerendered at build, regenerated in the background at most
// hourly. Keeps the DealsAnalyzedTicker count and any content edits
// fresh without giving up edge caching.
export const revalidate = 3600;

export const metadata: Metadata = {
  // Keyword-rich, benefit-led title. The layout template appends
  // " | TrueCap" — don't add the brand here or it doubles up.
  // Previous title ("Rental Property Analysis") had no calculator
  // keyword and no differentiator for the SERP.
  title: "Rental Property Calculator — Cap Rate, Cash Flow & DSCR",
  description:
    "Analyze any rental in 60 seconds — cap rate, cash flow, DSCR auto-filled from the address. Set your buy box and every deal gets a personal pass/fail.",
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
    title: "TrueCap Rental Property Analysis",
    description:
      "Type an address, get the verdict — cap rate, cash flow, DSCR in 60 seconds. Set your buy box and every deal gets a personal pass/fail.",
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
    title: "TrueCap Rental Property Analysis",
    description:
      "Type an address, get the verdict — cap rate, cash flow, DSCR in 60 seconds. Set your buy box and every deal gets a personal pass/fail.",
    images: ["/home.jpg"],
  },
};

export default function Home() {
  const siteUrl = getSiteUrl();
  // Schema.org @graph — three connected entities Google uses to build
  // the brand knowledge panel for "TrueCap" queries and the sitelinks
  // search box for branded organic results.
  //   1. Organization — the legal/brand entity. Drives the right-rail
  //      brand panel and powers logo display in SERPs.
  //   2. WebSite — the canonical site, with a SearchAction declaration
  //      so Google can render a sitelinks search box under TrueCap
  //      brand searches.
  //   3. SoftwareApplication — the product itself, @id-linked to the
  //      Organization so they're a single graph.
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "TrueCap",
        url: siteUrl,
        logo: `${siteUrl}/icon-light-32x32.png`,
        sameAs: [
          // Add real social profiles here as TrueCap gets accounts.
          // Leaving the array present (even if empty) tells Google
          // "we don't have public social yet" rather than "we forgot
          // this field" — explicit absence > silent absence.
        ],
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: "hello@usetruecap.com",
          availableLanguage: "English",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "TrueCap",
        publisher: { "@id": `${siteUrl}/#organization` },
        // Sitelinks search box — points at the (noindex) /search page.
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteUrl}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}/#software`,
        name: "TrueCap",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        url: siteUrl,
        description:
          "A real estate investment calculator for rental property analysis, cash flow forecasting, and ROI evaluation.",
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
      {/* Post-checkout landing (?billing=success) — Google Ads purchase
          conversion + one-time "Pro unlocked" banner. Pure client
          component reading useSearchParams (NOT cookies/headers), so the
          page stays static; the Suspense boundary satisfies the CSR
          bailout requirement. Real post-checkout users normally hit
          /home-authed via the auth-cookie rewrite — this mount covers
          the proxy cookie-miss edge so the paid-ads conversion can
          never be lost. */}
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
          headline 0-100 Deal Score is given away free (it converts better
          unlocked than as a blurred teaser). Only the DEPTH (projections /
          tax / exit / save / PDF / compare) stays Pro. */}
      <InvestCalcPage
        canSaveDeals={false}
        canCompareDeals={false}
        canExportPdf={false}
        canUseProjections={false}
        canUseTaxStrategy={false}
        canUseExitScenarios={false}
        canUseDealScore={true}
        canUseMaxOffer={false}
        canUseSensitivity={false}
        canUseStrategies={false}
        canUseShareLinks={false}
        canUpdateSavedDeals={false}
        saveDealLimitReached={false}
        initialSavedDealCount={0}
        savedDealLimit={null}
        isAuthenticated={false}
        userAnalysisDefaults={null}
        // Presence-only env check — safe on a static page (baked at
        // build; the key VALUE never reaches the client).
        dealQaEnabled={Boolean(process.env.ANTHROPIC_API_KEY)}
      />
      {/* Third-party press credibility — the first trust beat after the
          visitor has felt the value in the calculator above. */}
      <FeaturedIn />
      {/* Persuasion + objection-handling — surfaced AFTER the calculator
          (the visitor has now felt the value): name the spreadsheet pain,
          show how it works, then prove the data sources and social proof. */}
      <WhyNotSpreadsheet />
      <HowItWorks />
      <DataSourcesSection />
      <SocialProof />
      {/* Post-value monetization — the $5 lender PDF / Pro value ladder,
          then persona self-ID, then the objection-handling FAQ. */}
      <PdfProUpsell />
      <Personas />
      <HomepageFaq />
      {/* Sticky scroll-activated CTA bar — cold visitors only, and this
          page only serves cold visitors. */}
      <StickyConversionBar />
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
