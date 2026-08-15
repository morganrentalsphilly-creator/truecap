/**
 * Real-data trust ticker for the homepage.
 *
 * Pulls a measured aggregate count and renders it as a small pill —
 * "237 deals analyzed in the last 7 days" etc. It never adds a marketing
 * baseline or substitutes an estimate for unavailable data.
 *
 * IMPORTANT — only renders when the count exceeds a minimum threshold.
 * A low number ("3 deals this week") is anti-social-proof. Better to
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

type Props = {
  /** Time window for the count (default: rolling 7 days). */
  window?: "all" | "7d" | "30d";
  /**
   * Minimum count required to render anything. Below this we hide the
   * ticker entirely rather than showing anti-social-proof low numbers.
   * Default: 25.
   */
  minimum?: number;
  /** Override the label suffix (default: 'deals analyzed this week'). */
  labelSuffix?: string;
  /** Append a "+" after the number ("1,500+") to read as "at least". */
  plus?: boolean;
  /**
   * Count source. "saved" = saved_analyses rows (a fraction of usage).
   * "runs" = total analyses RUN (PostHog analyzer_started) — the honest, much
   * larger figure; needs POSTHOG_API_KEY + POSTHOG_PROJECT_ID configured.
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

  // Hide on error or below-threshold. Caller renders no fallback —
  // the homepage already has 4 static trust stat tiles, so a missing
  // dynamic ticker just means one less row; no visible hole. Threshold
  // checks the REAL count so an errored/empty counter still hides.
  if (rawCount == null || rawCount < minimum) return null;

  const formatted = `${rawCount.toLocaleString("en-US")}${plus ? "+" : ""}`;
  const suffix =
    labelSuffix ??
    (source === "runs" || window === "all"
      ? "deals analyzed on TrueCap"
      : window === "30d"
        ? "deals analyzed in the last 30 days"
        : "deals analyzed this week");

  return (
    <div
      className="mx-auto mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] px-3.5 py-1.5 text-[12px] font-semibold text-foreground shadow-sm sm:text-[13px]"
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
