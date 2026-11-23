import type { ComponentProps } from "react";
import { InvestCalcPage } from "@/components/investcalc/investcalc-page";
import { isFunnelFlagOn } from "@/lib/funnel-flags";
import { AnalyzeEntryFromQuery } from "@/components/marketing/analyze-entry-from-query";
import { fetchMortgageRateBenchmark } from "@/lib/property-enrichment/mortgage-rate";

export type AnalyzerProps = ComponentProps<typeof InvestCalcPage>;

/**
 * Anonymous-visitor capability flags for the public analyzer. ONE definition:
 * app/analyze/page.tsx (static) and app/home-authed/page.tsx (its cookie-
 * aware twin) both mount the analyzer through this object, so the two can
 * never drift. canUseDealScore is TRUE on purpose — the headline score is
 * free for everyone; repeat projections, tax/exit, saving, comparison and
 * reusable workflows stay gated.
 */
export const ANON_ANALYZER_PROPS: AnalyzerProps = {
  canSaveDeals: false,
  canCompareDeals: false,
  canExportPdf: false,
  canUseProjections: false,
  canUseTaxStrategy: false,
  canUseExitScenarios: false,
  canUseDealScore: true,
  canUseMaxOffer: true,
  canUseSensitivity: true,
  canUseStrategies: false,
  canUpdateSavedDeals: false,
  saveDealLimitReached: false,
  initialSavedDealCount: 0,
  savedDealLimit: null,
  isAuthenticated: false,
  userAnalysisDefaults: null,
  advocacyContractEligible: false,
  // Read where the server renders the static /analyze shell; the client
  // analyzer only ever sees the boolean.
  memoCaptureEnabled: isFunnelFlagOn("FUNNEL_MEMO_CAPTURE"),
};

/**
 * The /analyze page body — the full analyzer. The homepage no longer mounts
 * the analyzer at all; the hero's address capture hands off here
 * (sessionStorage handoff for JS, `?address=` / `?url=` / `?sample=1` for
 * plain links).
 *
 * There is deliberately no page-level intro above the form: the analyzer's
 * own heading is the page's H1 and its signpost line carries the "first
 * decision is free" promise for anonymous visitors (2026-09 audit — the
 * first phone screen used to show two intros before the address field).
 */
export async function AnalyzePageContent({ analyzerProps }: { analyzerProps: AnalyzerProps }) {
  // The form's starting mortgage rate (audit A2): the current FRED benchmark,
  // read on the server and cached, so the rate is right from the first render
  // instead of arriving when an address is picked. It reads no cookie or
  // header, so the static /analyze shell stays static (its hourly ISR
  // refreshes the figure); null means the form opens on the labeled product
  // fallback.
  const initialMortgageRate = await fetchMortgageRateBenchmark({
    cache: "page",
    timeoutMs: 2_500,
  });
  return (
    <>
      <AnalyzeEntryFromQuery />
      <InvestCalcPage {...analyzerProps} initialMortgageRate={initialMortgageRate} />
    </>
  );
}
