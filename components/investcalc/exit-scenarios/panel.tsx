"use client";

import { useEffect, useState } from "react";
import { getExitScenarioSnapshotAction } from "@/app/actions/exit-scenarios";
import { SnapshotStatusCard } from "@/components/investcalc/analysis-panels/shared/snapshot-status-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExitScenarioCharts } from "@/components/investcalc/exit-scenarios/charts";
import { ExitScenarioSummaryCards } from "@/components/investcalc/exit-scenarios/summary-cards";
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

    void (async () => {
      const result = await getExitScenarioSnapshotAction({
        analysisId,
        input: source.input,
      });

      if (cancelled) return;

      if (result.ok) {
        setYears(result.snapshot.exitScenarioYears);
        setSnapshotSource(result.source);
      }

      setIsLoadingSnapshot(false);
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
