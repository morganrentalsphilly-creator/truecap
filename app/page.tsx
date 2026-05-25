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
import { StickyConversionBar } from "@/components/marketing/sticky-conversion-bar";
import { SiteFooter } from "@/components/marketing/site-footer";
import {
  getEntitlementsForUser,
  hasPaidPlanSubscription,
  hasPlanFeature,
  hasSavedDealCapacity,
} from "@/lib/entitlements";
import { getSiteUrl } from "@/lib/site-url";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Rental Property Analysis",
  description:
    "Use TrueCap to analyze rental properties with cap rate, cash-on-cash return, monthly cash flow, and long-term investment projections.",
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
      "Analyze rental property deals with cap rate, cash flow, ROI, and projection tools in a single dashboard.",
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
      "Analyze rental property deals with cap rate, cash flow, ROI, and projection tools in a single dashboard.",
    images: ["/home.jpg"],
  },
};

export default async function Home() {
  const siteUrl = getSiteUrl();
  // Schema.org @graph — three connected entities Google uses to build
  // the brand knowledge panel for "TrueCap" queries and the sitelinks
  // search box for branded organic results.
  //   1. Organization — the legal/brand entity. Drives the right-rail
  //      brand panel and powers logo display in SERPs.
  //   2. WebSite — the canonical site, with a SearchAction declaration
  //      so Google can render a sitelinks search box under TrueCap
  //      brand searches. Wired to a /search?q= URL even though we
  //      don't have a search page yet — when we add one, this already
  //      points to it.
  //   3. SoftwareApplication — the product itself. Existing entity,
  //      now @id-linked to the Organization so they're a single graph.
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
        // Sitelinks search box. The /search?q= URL doesn't have to
        // exist yet — Google validates the structure, not the route.
        // When we ship a search page, this already points there.
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
  const canUseDealScore = entitlements ? hasPlanFeature(entitlements, "deal_score") : false;
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
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
      {/* Site footer — trust + sitemap + brand. Shown to everyone; helps
          with Quality Score and dwell time. */}
      <SiteFooter />
    </>
  );
}
