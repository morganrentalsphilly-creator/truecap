import type { ComponentProps } from "react";
import { InvestCalcPage } from "@/components/investcalc/investcalc-page";
import { AnalyzeEntryFromQuery } from "@/components/marketing/analyze-entry-from-query";

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
};

/**
 * The /analyze page body — a short intro and the full analyzer. The homepage
 * no longer mounts the analyzer at all; the hero's address capture hands off
 * here (sessionStorage handoff for JS, `?address=` / `?url=` / `?sample=1` for
 * plain links).
 */
export function AnalyzePageContent({ analyzerProps }: { analyzerProps: AnalyzerProps }) {
  return (
    <>
      <section className="border-b border-border bg-gradient-to-b from-[var(--brand-blue-light)] to-background">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            Free analyzer
          </p>
          <h1 className="mt-1 text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Analyze a rental deal
          </h1>
          <p className="mt-2 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            Enter an address or paste a listing link. Every assumption is
            labeled and editable. Your first full decision is free, with no
            account.
          </p>
        </div>
      </section>
      <AnalyzeEntryFromQuery />
      <InvestCalcPage {...analyzerProps} />
    </>
  );
}
