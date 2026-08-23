import "server-only";

import { unstable_cache } from "next/cache";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Total number of analyses RUN across all users, all time — the count behind
 * the homepage "analysis runs recorded on TrueCap" ticker.
 *
 * This returns the raw stored cumulative figure: the owner-confirmed 51,900
 * total is persisted once by migration 20260823160000, then every subsequent
 * Run analysis increments the same row via increment_analysis_runs().
 *
 * Reads a single counter row via the service-role client (RLS-bypassing,
 * count-only — no row data or PII leaves this function). On the static homepage
 * this runs at build / hourly revalidation, never per visitor. The public
 * Returns null on ANY error or
 * if the counter row is absent (e.g. the migration hasn't been applied yet) so
 * the ticker hides gracefully rather than showing a fabricated or stale number.
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
  // v2 intentionally invalidates the pre-20260823160000 cache entry. Vercel's
  // durable Next.js cache can survive a deployment, so retaining the original
  // key allowed /reviews to publish the old 2,035 value after the database had
  // been raised to the approved 51,900 cumulative total.
  ["total-analyses-run-v2"],
  { revalidate: 3600, tags: ["analyses-run-count"] }
);
