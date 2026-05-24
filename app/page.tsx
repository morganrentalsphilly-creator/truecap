import type { Metadata } from "next";
import { Header } from "@/components/investcalc/header";
import { InvestCalcPage } from "@/components/investcalc/investcalc-page";
import {
  getEntitlementsForUser,
  hasPaidPlanSubscription,
  hasPlanFeature,
  hasSavedDealCapacity,
} from "@/lib/entitlements";
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
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "TrueCap",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    description:
      "A real estate investment calculator for rental property analysis, cash flow forecasting, and ROI evaluation.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const entitlements = user ? await getEntitlementsForUser(supabase, user.id) : null;
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Header initialUser={user} initialEntitlements={entitlements} />
      <InvestCalcPage
        canSaveDeals={canSaveDeals}
        canCompareDeals={canCompareDeals}
        canExportPdf={canExportPdf}
        canUseProjections={canUseProjections}
        canUseTaxStrategy={canUseTaxStrategy}
        canUseExitScenarios={canUseExitScenarios}
        canUseDealScore={canUseDealScore}
        canUpdateSavedDeals={canUpdateSavedDeals}
        saveDealLimitReached={saveDealLimitReached}
        initialSavedDealCount={savedDealCount ?? 0}
        savedDealLimit={entitlements?.max_saved_deals ?? null}
        isAuthenticated={Boolean(user)}
      />
    </>
  );
}
