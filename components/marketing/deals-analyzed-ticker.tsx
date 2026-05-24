/**
 * Real-data trust ticker for the homepage.
 *
 * Pulls the aggregate `saved_analyses` count from Supabase and renders
 * it as a small pill — "237 deals analyzed in the last 7 days" etc.
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
};

export async function DealsAnalyzedTicker({
  window = "7d",
  minimum = 25,
  labelSuffix,
}: Props) {
  const count = await getDealsAnalyzedCount(window);

  // Hide on error or below-threshold. Caller renders no fallback —
  // the homepage already has 4 static trust stat tiles, so a missing
  // dynamic ticker just means one less row; no visible hole.
  if (count == null || count < minimum) return null;

  const formatted = count.toLocaleString("en-US");
  const suffix =
    labelSuffix ??
    (window === "all"
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
        <strong className="font-black tabular-nums">{formatted}</strong>{" "}
        <span className="text-muted-foreground">{suffix}</span>
      </span>
    </div>
  );
}
