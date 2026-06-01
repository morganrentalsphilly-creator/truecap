"use client";

import { useEffect, useState } from "react";
import { getTenYearProjectionSnapshotAction } from "@/app/actions/ten-year-projections";
import { Skeleton } from "@/components/ui/skeleton";
import { SnapshotStatusCard } from "@/components/investcalc/analysis-panels/shared/snapshot-status-card";
import { TenYearProjectionCharts } from "@/components/investcalc/ten-year-projections/charts";
import { TenYearProjectionSummaryCards } from "@/components/investcalc/ten-year-projections/summary-cards";
import { TenYearProjectionTable } from "@/components/investcalc/ten-year-projections/table";
import type { ProjectionYear, TenYearProjectionInput } from "@/lib/ten-year-projections";

export type ProjectionSource = {
  analysisId: string | null;
  input: TenYearProjectionInput;
  initialYears: ProjectionYear[];
};

export function TenYearProjectionsPanel({
  source,
}: {
  source: ProjectionSource;
}) {
  const [projectionYears, setProjectionYears] = useState<ProjectionYear[]>(
    normalizeProjectionYears(source.initialYears)
  );
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(false);
  const [snapshotSource, setSnapshotSource] = useState<"preview" | "local" | "cache" | "generated">(
    source.analysisId ? "local" : "preview"
  );

  useEffect(() => {
    setProjectionYears(normalizeProjectionYears(source.initialYears));
    setSnapshotSource(source.analysisId ? "local" : "preview");
  }, [source.analysisId, source.initialYears]);

  useEffect(() => {
    const analysisId = source.analysisId;
    if (!analysisId) return;

    let cancelled = false;
    setIsLoadingSnapshot(true);

    // Try/catch contains action rejections from becoming unhandled
    // browser promise rejections. Snapshot load failure is a no-op for
    // the user — live calc from input still renders.
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
  }, [source.analysisId, source.input]);

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
      <TenYearProjectionSummaryCards projectionYears={projectionYears} />
      <SnapshotStatusCard
        title="10-Year Projections"
        snapshotSource={snapshotSource}
        isLoading={isLoadingSnapshot}
      />
      <TenYearProjectionCharts projectionYears={projectionYears} />
      <TenYearProjectionTable projectionYears={projectionYears} />
    </div>
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
