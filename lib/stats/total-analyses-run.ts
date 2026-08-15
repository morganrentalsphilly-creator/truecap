import "server-only";

import { unstable_cache } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Total number of analyses RUN across all users, all time — the count behind
 * the homepage "deals analyzed on TrueCap" ticker.
 *
 * This returns the raw stored figure: it counts every time someone clicks Run
 * analysis (incremented once per run via the increment_analysis_runs RPC — see
 * app/actions/track-analysis-run.ts). The public all-time ticker applies its
 * approved historical display floor separately, leaving this data helper and
 * the stored counter unchanged.
 *
 * Reads a single counter row via the service-role client (RLS-bypassing,
 * count-only — no row data or PII leaves this function). On the static homepage
 * this runs at build / hourly revalidation, never per visitor. Returns null on
 * ANY error or if the counter row is absent (e.g. the migration hasn't been
 * applied yet) so the ticker hides gracefully rather than showing a fabricated
 * or stale number.
 */
async function fetchTotalAnalysesRun(): Promise<number | null> {
  try {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("app_counters")
      .select("count")
      .eq("key", "analysis_runs")
      .maybeSingle();
    if (error) {
      console.warn("[stats] total-analyses-run failed:", error.message);
      return null;
    }
    if (!data) return null;
    const count = Number(data.count);
    return Number.isFinite(count) ? count : null;
  } catch (err) {
    console.warn(
      "[stats] total-analyses-run threw:",
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}

/**
 * Cached public entry point. 1-hour TTL — long enough to avoid hitting the DB
 * on every homepage revalidation, short enough that the number stays fresh.
 */
export const getTotalAnalysesRunCount = unstable_cache(
  async () => fetchTotalAnalysesRun(),
  ["total-analyses-run"],
  { revalidate: 3600, tags: ["analyses-run-count"] }
);
