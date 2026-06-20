import { investmentFormSchema } from "@/lib/investcalc-schema";
import { buildRateAlertForDeal, type RateAlertDeal } from "@/lib/rate-alerts";

/**
 * Dashboard "rate watch" — the on-demand twin of the weekly rate-alert email
 * (app/api/cron/send-rate-alerts). Re-underwrites the signed-in user's saved
 * deals at TODAY's 30-year rate and surfaces the ones whose signal changed
 * since they were saved, so a saved deal behaves like a living watchlist
 * rather than a frozen snapshot.
 *
 * Pure (no IO) — the current rate is fetched by the caller (the dashboard
 * server component, mirroring how the cron route owns its FRED fetch). Reuses
 * the SAME `buildRateAlertForDeal` the email cron uses, so the dashboard strip
 * and the email can never tell the user two different stories.
 */

export type RateWatchDealRow = {
  id: string;
  title?: string | null;
  address?: string | null;
  form_snapshot: unknown;
};

export type RateWatchSummary = {
  currentRatePct: number;
  /** Deals whose tier / DSCR band / cash-flow sign flips at today's rate. */
  changedDeals: RateAlertDeal[];
};

/**
 * Re-underwrite the given saved deals at `currentRatePct` and return the ones
 * whose signal changed. Returns null when there's nothing to show (no rate, no
 * deals, or no deal changed state), so callers can render the strip
 * unconditionally and it stays invisible until useful.
 */
export function buildRateWatch(
  rows: RateWatchDealRow[],
  currentRatePct: number | null
): RateWatchSummary | null {
  if (currentRatePct == null || !Number.isFinite(currentRatePct)) return null;
  const changedDeals: RateAlertDeal[] = [];
  for (const row of rows) {
    const parsed = investmentFormSchema.safeParse(row.form_snapshot);
    if (!parsed.success) continue; // pre-snapshot or partial save — skip quietly
    const alert = buildRateAlertForDeal({
      id: row.id,
      title: row.title ?? null,
      address: row.address ?? null,
      values: parsed.data,
      currentRatePct,
    });
    if (alert) changedDeals.push(alert);
  }
  if (changedDeals.length === 0) return null;
  // Improved deals (rates fell, metrics up) first — that's the opportunity the
  // user most wants to act on.
  changedDeals.sort((a, b) => Number(b.improved) - Number(a.improved));
  return { currentRatePct, changedDeals };
}
