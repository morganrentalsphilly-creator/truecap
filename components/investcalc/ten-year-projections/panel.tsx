"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getTenYearProjectionSnapshotAction } from "@/app/actions/ten-year-projections";
import { Skeleton } from "@/components/ui/skeleton";
import { SnapshotStatusCard } from "@/components/investcalc/analysis-panels/shared/snapshot-status-card";
import { PanelInsight } from "@/components/investcalc/analysis-panels/shared/panel-insight";
import { formatCurrency } from "@/components/investcalc/analysis-panels/shared/formatters";
import { TenYearProjectionCharts } from "@/components/investcalc/ten-year-projections/charts";
import { TenYearProjectionSummaryCards } from "@/components/investcalc/ten-year-projections/summary-cards";
import { TenYearProjectionTable } from "@/components/investcalc/ten-year-projections/table";
import type { ProjectionYear, TenYearProjectionInput } from "@/lib/ten-year-projections";
import { isFeatureReleased } from "@/lib/entitlements-catalog";

export type ProjectionSource = {
  analysisId: string | null;
  recorded?: boolean;
  input: TenYearProjectionInput;
  initialYears: ProjectionYear[];
};

export function TenYearProjectionsPanel({
  source,
}: {
  source: ProjectionSource;
}) {
  const showTaxMetrics = isFeatureReleased("tax_strategy");
  const [projectionYears, setProjectionYears] = useState<ProjectionYear[]>(
    normalizeProjectionYears(source.initialYears)
  );
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(false);
  const [snapshotSource, setSnapshotSource] = useState<
    "preview" | "recorded" | "local" | "cache" | "generated"
  >(
    source.recorded ? "recorded" : source.analysisId ? "local" : "preview"
  );

  useEffect(() => {
    setProjectionYears(normalizeProjectionYears(source.initialYears));
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
        const result = await getTenYearProjectionSnapshotAction({
          analysisId,
          input: source.input,
        });

        if (cancelled) return;

        if (result.ok) {
          setProjectionYears(normalizeProjectionYears(result.snapshot.projectionYears));
          setSnapshotSource(result.source);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("[ten-year-projections] snapshot load failed:", err);
        }
      } finally {
        if (!cancelled) setIsLoadingSnapshot(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [source.analysisId, source.input, source.recorded]);

  if (isLoadingSnapshot && projectionYears.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <TenYearProjectionSummaryCards
        projectionYears={projectionYears}
        showTaxMetrics={showTaxMetrics}
      />
      <PanelInsight>{buildProjectionInsight(projectionYears)}</PanelInsight>
      <SnapshotStatusCard
        title="10-Year Projections"
        snapshotSource={snapshotSource}
        isLoading={isLoadingSnapshot}
      />
      <TenYearProjectionCharts projectionYears={projectionYears} />
      <TenYearProjectionTable
        projectionYears={projectionYears}
        showTaxMetrics={showTaxMetrics}
      />
    </div>
  );
}

function buildProjectionInsight(years: ProjectionYear[]): ReactNode {
  if (years.length === 0) return null;
  const year1 = years[0];
  const final = years[years.length - 1];
  if (!year1 || !final) return null;
  const firstPositive = years.find((y) => y.netCashFlowAnnual >= 0);
  const balloonYear = years.find((y) => (y.balloonPaymentAnnual ?? 0) > 0);
  if (balloonYear) {
    return (
      <>
        A contractual balloon of{" "}
        <strong className="text-foreground">
          {formatCurrency(balloonYear.balloonPaymentAnnual ?? 0)}
        </strong>{" "}
        is due in year {balloonYear.year}. It is shown separately from annual
        debt service and included in that year&apos;s net and cumulative cash flow.
      </>
    );
  }
  if (year1.netCashFlowAnnual >= 0) {
    return (
      <>
        Cash-flow positive from year 1, growing to about{" "}
        <strong className="text-foreground">{formatCurrency(final.netCashFlowAnnual)}/yr</strong> by year{" "}
        {final.year} as rent outpaces the fixed mortgage.
      </>
    );
  }
  if (firstPositive) {
    return (
      <>
        Cash flow turns <strong className="text-foreground">positive in year {firstPositive.year}</strong> as
        rising rent outgrows the fixed mortgage payment, reaching about{" "}
        <strong className="text-foreground">{formatCurrency(final.netCashFlowAnnual)}/yr</strong> by year {final.year}.
      </>
    );
  }
  return (
    <>
      Cash flow stays negative through year {final.year}, so the return here leans on appreciation and loan
      paydown rather than monthly income - confirm you can carry the shortfall.
    </>
  );
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readNumber(row: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = toFiniteNumber(row[key]);
    if (value !== null) return value;
  }
  return null;
}

function normalizeProjectionYears(years: ProjectionYear[]): ProjectionYear[] {
  let cumulativeCashFlowAnnual = 0;

  return years.map((year, index) => {
    const row = year as unknown as Record<string, unknown>;
    const netCashFlowAnnual = readNumber(row, ["netCashFlowAnnual", "net_cash_flow_annual", "net", "netCashFlow"]) ?? 0;
    cumulativeCashFlowAnnual += netCashFlowAnnual;

    return {
      year: readNumber(row, ["year", "y"]) ?? index + 1,
      rentalIncomeAnnual: readNumber(row, ["rentalIncomeAnnual", "rental_income_annual", "rental"]) ?? 0,
      operatingExpensesAnnual: readNumber(row, ["operatingExpensesAnnual", "operating_expenses_annual", "opex"]) ?? 0,
      debtServiceAnnual: readNumber(row, ["debtServiceAnnual", "debt_service_annual", "debt"]) ?? 0,
      ...(readNumber(row, ["renovationIncomeLossAnnual", "renovation_income_loss_annual"]) != null
        ? {
            renovationIncomeLossAnnual:
              readNumber(row, ["renovationIncomeLossAnnual", "renovation_income_loss_annual"]) ?? 0,
          }
        : {}),
      ...(readNumber(row, ["balloonPaymentAnnual", "balloon_payment_annual", "balloon"]) != null
        ? {
            balloonPaymentAnnual:
              readNumber(row, ["balloonPaymentAnnual", "balloon_payment_annual", "balloon"]) ?? 0,
          }
        : {}),
      ...(readNumber(row, ["financingOutflowAnnual", "financing_outflow_annual"]) != null
        ? {
            financingOutflowAnnual:
              readNumber(row, ["financingOutflowAnnual", "financing_outflow_annual"]) ?? 0,
          }
        : {}),
      netCashFlowAnnual,
      taxSavingsAnnual: readNumber(row, ["taxSavingsAnnual", "tax_savings_annual", "tax"]) ?? 0,
      afterTaxCashFlowAnnual: readNumber(row, ["afterTaxCashFlowAnnual", "after_tax_cash_flow_annual", "after"]) ?? 0,
      cumulativeCashFlowAnnual:
        readNumber(row, [
          "cumulativeCashFlowAnnual",
          "cumulative_cash_flow_annual",
          "cumulativeCashFlow",
          "cumulativeCF",
          "cum",
        ]) ?? cumulativeCashFlowAnnual,
    };
  });
}
