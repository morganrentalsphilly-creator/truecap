"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getExitScenarioSnapshotAction } from "@/app/actions/exit-scenarios";
import { SnapshotStatusCard } from "@/components/investcalc/analysis-panels/shared/snapshot-status-card";
import { PanelInsight } from "@/components/investcalc/analysis-panels/shared/panel-insight";
import { formatCurrency } from "@/components/investcalc/analysis-panels/shared/formatters";
import { formatRoiHeadline } from "@/lib/extreme-value-format";
import { Skeleton } from "@/components/ui/skeleton";
import { ExitScenarioCharts } from "@/components/investcalc/exit-scenarios/charts";
import { ExitScenarioSummaryCards } from "@/components/investcalc/exit-scenarios/summary-cards";
import { ReturnsExplainer } from "@/components/investcalc/exit-scenarios/returns-explainer";
import { ExitScenarioTable } from "@/components/investcalc/exit-scenarios/table";
import {
  DEFAULT_APPRECIATION_RATE,
  DEFAULT_SELLING_COST_PCT,
  type ExitScenarioInput,
  type ExitScenarioYear,
} from "@/lib/exit-scenarios";

export type ExitScenarioSource = {
  analysisId: string | null;
  input: ExitScenarioInput;
  initialYears: ExitScenarioYear[];
};

export function ExitScenariosPanel({
  source,
}: {
  source: ExitScenarioSource;
}) {
  const [years, setYears] = useState<ExitScenarioYear[]>(source.initialYears);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(false);
  const [snapshotSource, setSnapshotSource] = useState<"preview" | "local" | "cache" | "generated">(
    source.analysisId ? "local" : "preview"
  );

  useEffect(() => {
    setYears(source.initialYears);
    setSnapshotSource(source.analysisId ? "local" : "preview");
  }, [source.analysisId, source.initialYears]);

  useEffect(() => {
    const analysisId = source.analysisId;
    if (!analysisId) return;

    let cancelled = false;
    setIsLoadingSnapshot(true);

    // Wrapped in try/catch so a transient Supabase / network failure
    // inside the action doesn't escape as an unhandled promise
    // rejection (which Sentry would otherwise capture as a fake bug).
    // Snapshot load failure is a no-op for the user - they fall back
    // to live calculation from the in-memory input.
    void (async () => {
      try {
        const result = await getExitScenarioSnapshotAction({
          analysisId,
          input: source.input,
        });

        if (cancelled) return;

        if (result.ok) {
          setYears(result.snapshot.exitScenarioYears);
          setSnapshotSource(result.source);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("[exit-scenarios] snapshot load failed:", err);
        }
      } finally {
        if (!cancelled) setIsLoadingSnapshot(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [source.analysisId, source.input]);

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
      <ExitScenarioSummaryCards years={years} />
      <ReturnsExplainer
        years={years}
        appreciationRate={source.input.appreciationRate}
        sellingCostPct={source.input.sellingCostPct}
      />
      <PanelInsight>{buildExitInsight(years)}</PanelInsight>
      <SnapshotStatusCard
        title="Exit Scenarios"
        snapshotSource={snapshotSource}
        isLoading={isLoadingSnapshot}
      />
      <p className="text-xs text-muted-foreground">
        Exit scenarios use the current form assumptions, defaulting to {DEFAULT_APPRECIATION_RATE}% appreciation and {DEFAULT_SELLING_COST_PCT}% selling cost when left blank.
      </p>
      <ExitScenarioCharts years={years} />
      <ExitScenarioTable years={years} />
    </div>
  );
}

function buildExitInsight(years: ExitScenarioYear[]): ReactNode {
  if (years.length === 0) return null;
  const bestYear = years.reduce<ExitScenarioYear | null>(
    (best, y) => (!best || y.totalProfit > best.totalProfit ? y : best),
    null
  );
  const year10 = years.find((y) => y.year === 10) ?? years[years.length - 1] ?? null;
  if (!bestYear || !year10) return null;
  // Same initial-investment / ROI derivation the summary cards use, so the
  // takeaway can never disagree with the Total ROI card above it.
  const initialInvestment =
    year10.netSaleProceeds + year10.cumulativeCashFlow + year10.cumulativeTaxBenefit - year10.totalProfit;
  const roi = initialInvestment > 0 ? (year10.totalProfit / initialInvestment) * 100 : 0;
  if (bestYear.totalProfit <= 0) {
    return (
      <>
        Even at the best modeled exit (year {bestYear.year}), this deal doesn&apos;t turn a profit on sale - the
        appreciation assumption doesn&apos;t cover the carry and selling costs.
      </>
    );
  }
  // Extreme cumulative ROI (finding 5): the parenthetical leads with the
  // framed band; the raw figure stays reachable on the span's title attr.
  const roiHeadline = formatRoiHeadline(roi, { decimals: 0, signed: true, compact: true });
  return (
    <>
      Most of the return shows up at sale: by year {year10.year}, projected profit is about{" "}
      <strong className="text-foreground">{formatCurrency(year10.totalProfit)}</strong>{" "}
      <span title={roiHeadline.title}>
        ({roiHeadline.extreme
          ? `${roiHeadline.text} on cash — verify assumptions`
          : `${roi >= 0 ? "+" : ""}${roi.toFixed(0)}% on cash`})
      </span>{" "}
      - an equity-and-appreciation payoff you realize when you sell or refinance, not monthly income.
    </>
  );
}
