"use client";

import { useEffect, useState } from "react";
import { getTaxStrategySnapshotAction } from "@/app/actions/tax-strategy";
import { SnapshotStatusCard } from "@/components/investcalc/analysis-panels/shared/snapshot-status-card";
import { Skeleton } from "@/components/ui/skeleton";
import { TaxStrategyCharts } from "@/components/investcalc/tax-strategy/charts";
import { TaxStrategySummaryCards } from "@/components/investcalc/tax-strategy/summary-cards";
import { TaxStrategyTable } from "@/components/investcalc/tax-strategy/table";
import type { TaxStrategyInput, TaxStrategyYear } from "@/lib/tax-strategy";

export type TaxStrategySource = {
  analysisId: string | null;
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

    // Try/catch contains action rejections from becoming unhandled
    // browser promise rejections. Snapshot load failure is a no-op for
    // the user — live calc from input still renders.
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
      <TaxStrategySummaryCards years={years} />
      <SnapshotStatusCard
        title="Tax Strategy"
        snapshotSource={snapshotSource}
        isLoading={isLoadingSnapshot}
      />
      <TaxStrategyCharts years={years} />
      <p className="text-xs text-muted-foreground">
        This is an estimate for planning purposes only and is not tax advice.
      </p>
      <TaxStrategyTable years={years} />
    </div>
  );
}
