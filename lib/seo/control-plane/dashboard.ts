import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSeoAutopilotConfig } from "./config";

type Row = Record<string, unknown>;

export type SeoDashboardData = {
  configured: boolean;
  error: string | null;
  config: ReturnType<typeof getSeoAutopilotConfig>;
  growth: { clicks: number; impressions: number; ctr: number | null; averagePosition: number | null; nonbrandClicks: number; analyzerStarts: number; signups: number; paidConversions: number };
  opportunities: Row[];
  sources: Row[];
  jobs: Row[];
  health: { stalePages: number; failedSources: number; changedSources: number; openOpportunities: number };
};

const number = (value: unknown): number => (typeof value === "number" ? value : Number(value) || 0);

export async function loadSeoDashboard(): Promise<SeoDashboardData> {
  const fallback: SeoDashboardData = {
    configured: false,
    error: null,
    config: getSeoAutopilotConfig(),
    growth: { clicks: 0, impressions: 0, ctr: null, averagePosition: null, nonbrandClicks: 0, analyzerStarts: 0, signups: 0, paidConversions: 0 },
    opportunities: [],
    sources: [],
    jobs: [],
    health: { stalePages: 0, failedSources: 0, changedSources: 0, openOpportunities: 0 },
  };

  try {
    const db = createAdminSupabaseClient();
    const latest = await db.from("seo_page_metrics").select("snapshot_date").eq("window_days", 28).order("snapshot_date", { ascending: false }).limit(1);
    if (latest.error) throw latest.error;
    const snapshotDate = latest.data?.[0]?.snapshot_date as string | undefined;
    const [metricResult, opportunityResult, sourceResult, jobResult, staleResult] = await Promise.all([
      snapshotDate
        ? db.from("seo_page_metrics").select("clicks,impressions,position,nonbrand_clicks,analyzer_starts,signups,paid_conversions").eq("snapshot_date", snapshotDate).eq("window_days", 28)
        : Promise.resolve({ data: [], error: null }),
      db.from("seo_opportunities").select("opportunity_type,page,query,score,risk_class,recommended_action,status,last_seen_at").in("status", ["OPEN", "PLANNED", "RUNNING"]).order("score", { ascending: false }).limit(20),
      db.from("seo_sources").select("source_id,source_organization,source_category,source_status,fetched_at,authoritative_url,affected_content,change_summary,last_error").in("source_status", ["CHANGED", "FAILED", "STALE"]).order("updated_at", { ascending: false }).limit(20),
      db.from("seo_job_runs").select("job_name,cadence,mode,status,started_at,finished_at,found,changed,error").order("started_at", { ascending: false }).limit(12),
      db.from("seo_pages").select("path", { count: "exact", head: true }).eq("status", "STALE_REVIEW_REQUIRED"),
    ]);
    for (const result of [metricResult, opportunityResult, sourceResult, jobResult, staleResult]) {
      if (result.error) throw result.error;
    }
    const growthTotals = (metricResult.data ?? []).reduce<{
      clicks: number;
      impressions: number;
      weightedPosition: number;
      nonbrandClicks: number;
      analyzerStarts: number;
      signups: number;
      paidConversions: number;
    }>(
      (sum, row) => ({
        clicks: sum.clicks + number(row.clicks),
        impressions: sum.impressions + number(row.impressions),
        weightedPosition: sum.weightedPosition + number(row.position) * number(row.impressions),
        nonbrandClicks: sum.nonbrandClicks + number(row.nonbrand_clicks),
        analyzerStarts: sum.analyzerStarts + number(row.analyzer_starts),
        signups: sum.signups + number(row.signups),
        paidConversions: sum.paidConversions + number(row.paid_conversions),
      }),
      { clicks: 0, impressions: 0, weightedPosition: 0, nonbrandClicks: 0, analyzerStarts: 0, signups: 0, paidConversions: 0 },
    );
    const growth = {
      clicks: growthTotals.clicks,
      impressions: growthTotals.impressions,
      ctr: growthTotals.impressions ? growthTotals.clicks / growthTotals.impressions : null,
      averagePosition: growthTotals.impressions ? growthTotals.weightedPosition / growthTotals.impressions : null,
      nonbrandClicks: growthTotals.nonbrandClicks,
      analyzerStarts: growthTotals.analyzerStarts,
      signups: growthTotals.signups,
      paidConversions: growthTotals.paidConversions,
    };
    const sources = (sourceResult.data ?? []) as Row[];
    const opportunities = (opportunityResult.data ?? []) as Row[];
    return {
      ...fallback,
      configured: true,
      growth,
      opportunities,
      sources,
      jobs: (jobResult.data ?? []) as Row[],
      health: {
        stalePages: staleResult.count ?? 0,
        failedSources: sources.filter((row) => row.source_status === "FAILED").length,
        changedSources: sources.filter((row) => row.source_status === "CHANGED").length,
        openOpportunities: opportunities.length,
      },
    };
  } catch (error) {
    return {
      ...fallback,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
