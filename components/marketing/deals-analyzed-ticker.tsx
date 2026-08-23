/**
 * Real-data trust ticker for the homepage.
 *
 * Pulls a measured aggregate count and renders it as a small pill —
 * "237 analyses saved in the last 7 days" etc. The all-time RUNS source uses
 * the raw persisted cumulative value; rolling saved-analysis counts also
 * render their raw value.
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
import { toPublicAnalysisRunCount } from "@/lib/stats/analysis-runs-display";

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
   * "runs" = persisted cumulative analyzer invocations from
   * app_counters.analysis_runs.
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

  // Public proof fails closed. A database/configuration error must never turn
  // into a manufactured usage claim.
  if (rawCount == null) return null;

  const displayCount =
    source === "runs" ? toPublicAnalysisRunCount(rawCount) : rawCount;
  if (displayCount < minimum) return null;
  const formatted = `${displayCount.toLocaleString("en-US")}${plus ? "+" : ""}`;
  const suffix =
    labelSuffix ??
    (source === "runs"
      ? "cumulative analyses represented in TrueCap"
      : window === "all"
      ? "analyses saved on TrueCap"
      : window === "30d"
        ? "analyses saved in the last 30 days"
        : "analyses saved this week");

  return (
    <div
      className="mx-auto mt-6 inline-flex w-fit max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-0.5 rounded-full border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] px-3.5 py-1.5 text-[12px] font-semibold text-foreground shadow-sm sm:text-[13px]"
      aria-label={`${formatted} ${suffix}${source === "runs" ? ". Owner-confirmed cumulative total; subsequent analyzer runs increment automatically." : ""}`}
    >
      <CheckCircle2 className="size-3.5 shrink-0 text-[var(--brand-green)]" />
      <span>
        <strong className="font-extrabold tabular-nums">{formatted}</strong>{" "}
        <span className="text-muted-foreground">{suffix}</span>
        {source === "runs" ? (
          <span className="block text-[9px] font-medium leading-tight text-muted-foreground">
            Owner-confirmed cumulative total; subsequent analyzer runs increment automatically.
          </span>
        ) : null}
      </span>
    </div>
  );
}
