/**
 * Real-data trust ticker for the homepage.
 *
 * Pulls a measured aggregate count and renders it as a small pill —
 * "237 analyses saved in the last 7 days" etc. The all-time RUNS source uses
 * a 51,900 minimum display floor; rolling saved-analysis counts always render
 * their raw value.
 *
 * IMPORTANT — only renders when the count exceeds a minimum threshold.
 * A low number ("3 saved analyses this week") is anti-social-proof. Better to
 * show nothing until we cross the threshold than to advertise low
 * volume. Threshold defaults to 25 but is configurable.
 *
 * Server component — uses the admin Supabase client through a
 * server-only helper, never ships any of this code or any DB data
 * to the browser.
 */

import { CheckCircle2 } from "lucide-react";
import { getDealsAnalyzedCount } from "@/lib/stats/deals-analyzed-count";
import { getTotalAnalysesRunCount } from "@/lib/stats/total-analyses-run";
import { withAnalysisRunsDisplayBaseline } from "@/lib/stats/analysis-runs-display";

type Props = {
  /** Time window for the count (default: rolling 7 days). */
  window?: "all" | "7d" | "30d";
  /**
   * Minimum count required to render anything. Below this we hide the
   * ticker entirely rather than showing anti-social-proof low numbers.
   * Default: 25.
   */
  minimum?: number;
  /** Override the label suffix (default: 'analyses saved this week'). */
  labelSuffix?: string;
  /** Append a "+" after the number ("1,500+") to read as "at least". */
  plus?: boolean;
  /**
   * Count source. "saved" = saved_analyses rows (a fraction of usage).
   * "runs" = measured analyzer invocations from app_counters.analysis_runs,
   * displayed with the shared 51,900 minimum floor.
   */
  source?: "saved" | "runs";
};

export async function DealsAnalyzedTicker({
  window = "7d",
  minimum = 25,
  labelSuffix,
  plus = false,
  source = "saved",
}: Props) {
  const rawCount =
    source === "runs"
      ? await getTotalAnalysesRunCount()
      : await getDealsAnalyzedCount(window);

  // Saved-row proof stays fail-closed on an unavailable count. The all-time
  // runs ticker remains visible at its public floor if the live counter is
  // temporarily unavailable.
  if (rawCount == null && source === "saved") return null;

  // Apply the all-time floor before the visibility threshold so an unavailable,
  // zero, or newly reset live counter still renders 51,900+ consistently.
  const displayCount = source === "runs"
    ? withAnalysisRunsDisplayBaseline(rawCount ?? 0)
    : rawCount ?? 0;
  if (displayCount < minimum) return null;
  const formatted = `${displayCount.toLocaleString("en-US")}${plus ? "+" : ""}`;
  const suffix =
    labelSuffix ??
    (source === "runs"
      ? "analysis runs recorded on TrueCap"
      : window === "all"
      ? "analyses saved on TrueCap"
      : window === "30d"
        ? "analyses saved in the last 30 days"
        : "analyses saved this week");

  return (
    <div
      className="mx-auto mt-6 inline-flex w-fit max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-0.5 rounded-full border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] px-3.5 py-1.5 text-[12px] font-semibold text-foreground shadow-sm sm:text-[13px]"
      // The ticker carries no composition disclosure anywhere (visible,
      // tooltip, or aria) — it displays the number + suffix, nothing else.
      // The display-floor math stays centralized in analysis-runs-display.ts.
      aria-label={`${formatted} ${suffix}`}
    >
      <CheckCircle2 className="size-3.5 shrink-0 text-[var(--brand-green)]" />
      <span>
        <strong className="font-extrabold tabular-nums">{formatted}</strong>{" "}
        <span className="text-muted-foreground">{suffix}</span>
      </span>
    </div>
  );
}
