"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getTaxStrategySnapshotAction } from "@/app/actions/tax-strategy";
import { SnapshotStatusCard } from "@/components/investcalc/analysis-panels/shared/snapshot-status-card";
import { PanelInsight } from "@/components/investcalc/analysis-panels/shared/panel-insight";
import { formatCurrency } from "@/components/investcalc/analysis-panels/shared/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { TaxStrategyCharts } from "@/components/investcalc/tax-strategy/charts";
import { TaxStrategySummaryCards } from "@/components/investcalc/tax-strategy/summary-cards";
import { TaxStrategyTable } from "@/components/investcalc/tax-strategy/table";
import type { TaxStrategyInput, TaxStrategyYear } from "@/lib/tax-strategy";

export type TaxStrategySource = {
  analysisId: string | null;
  recorded?: boolean;
  input: TaxStrategyInput;
  initialYears: TaxStrategyYear[];
};

export function TaxStrategyPanel({
  source,
}: {
  source: TaxStrategySource;
}) {
  const [years, setYears] = useState<TaxStrategyYear[]>(source.initialYears);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(false);
  const [snapshotSource, setSnapshotSource] = useState<
    "preview" | "recorded" | "local" | "cache" | "generated"
  >(
    source.recorded ? "recorded" : source.analysisId ? "local" : "preview"
  );

  useEffect(() => {
    setYears(source.initialYears);
    setSnapshotSource(source.recorded ? "recorded" : source.analysisId ? "local" : "preview");
  }, [source.analysisId, source.initialYears, source.recorded]);

  useEffect(() => {
    const analysisId = source.analysisId;
    if (!analysisId || source.recorded) return;

    let cancelled = false;
    setIsLoadingSnapshot(true);

    // Try/catch contains action rejections from becoming unhandled
    // browser promise rejections. Snapshot load failure is a no-op for
    // the user - live calc from input still renders.
    void (async () => {
      try {
        const result = await getTaxStrategySnapshotAction({
          analysisId,
          input: source.input,
        });

        if (cancelled) return;

        if (result.ok) {
          setYears(result.snapshot.taxStrategyYears);
          setSnapshotSource(result.source);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("[tax-strategy] snapshot load failed:", err);
        }
      } finally {
        if (!cancelled) setIsLoadingSnapshot(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [source.analysisId, source.input, source.recorded]);

  if (isLoadingSnapshot && years.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <TaxStrategySummaryCards years={years} />
      <PanelInsight>{buildTaxInsight(years)}</PanelInsight>
      <SnapshotStatusCard
        title="Illustrative Tax Impact"
        snapshotSource={snapshotSource}
        isLoading={isLoadingSnapshot}
      />
      <TaxStrategyCharts years={years} />
      <p className="text-xs text-muted-foreground">
        Planning illustration only — not tax advice. The model applies the entered
        marginal rate to projected rental income and deductions. Passive-loss
        limits, eligibility, filing status, state and local taxes, depreciation
        recapture, mixed personal/rental-use allocation, and your actual return
        can materially change the result.
      </p>
      <TaxStrategyTable years={years} />
    </div>
  );
}

function buildTaxInsight(years: TaxStrategyYear[]): ReactNode {
  if (years.length === 0) return null;
  const y1 = years[0];
  const yLast = years[years.length - 1];
  if (!y1 || !yLast) return null;
  const total = years.reduce((sum, y) => sum + y.netTaxBenefitAnnual, 0);
  const frontLoaded = y1.taxSavingsAnnual > yLast.taxSavingsAnnual * 1.05;
  if (frontLoaded) {
    return (
      <>
        The modeled deduction effect is <strong className="text-foreground">front-loaded</strong>: about{" "}
        <strong className="text-foreground">{formatCurrency(y1.taxSavingsAnnual)}</strong> in year 1, easing to{" "}
        {formatCurrency(yLast.taxSavingsAnnual)} by year {yLast.year} as the mortgage-interest deduction shrinks —{" "}
        roughly {formatCurrency(total)} in illustrative net tax impact over the hold.
      </>
    );
  }
  return (
    <>
      Under the entered marginal tax rate, depreciation and mortgage-interest
      deductions produce about{" "}
      <strong className="text-foreground">{formatCurrency(total)}</strong> in
      illustrative net tax impact across the 10-year hold.
    </>
  );
}
