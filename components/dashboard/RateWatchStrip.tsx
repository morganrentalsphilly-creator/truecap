import Link from "next/link";
import { Bell, TrendingDown, TrendingUp } from "lucide-react";
import type { RateWatchSummary } from "@/lib/rate-watch";

/**
 * Dashboard "rate watch" strip — surfaces saved deals whose signal changed at
 * today's 30-yr rate (see lib/rate-watch). Invisible until useful: renders
 * nothing when the rate is unavailable or no deal changed state, so it never
 * shows an empty "nothing happened" card. Type-only import of the (server-only)
 * rate-watch module is erased at build, so this stays safe in the client tree.
 */
export function RateWatchStrip({ rateWatch }: { rateWatch: RateWatchSummary | null }) {
  if (!rateWatch || rateWatch.changedDeals.length === 0) return null;
  const { currentRatePct, changedDeals } = rateWatch;
  const count = changedDeals.length;
  const shown = changedDeals.slice(0, 5);
  const extra = count - shown.length;

  return (
    <section aria-label="Rate watch" className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bell className="size-4" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Rate watch</p>
            <p className="text-sm font-semibold text-foreground">
              30-yr rate is {currentRatePct.toFixed(2)}% —{" "}
              {count === 1 ? "1 saved deal" : `${count} saved deals`} changed at today&apos;s rate
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/saved-analyses"
          prefetch={false}
          className="shrink-0 text-xs font-semibold text-primary hover:underline"
        >
          Review
        </Link>
      </div>

      <ul className="mt-3 space-y-2">
        {shown.map((deal) => (
          <li key={deal.id} className="flex items-start gap-2.5 rounded-xl bg-muted/40 px-3 py-2">
            <span className={`mt-0.5 shrink-0 ${deal.improved ? "text-success" : "text-destructive"}`}>
              {deal.improved ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{deal.label}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{deal.changes[0]}</p>
            </div>
          </li>
        ))}
      </ul>

      {extra > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          +{extra} more {extra === 1 ? "deal" : "deals"} changed — see all in{" "}
          <Link href="/dashboard/saved-analyses" prefetch={false} className="font-semibold text-primary hover:underline">
            My Deals
          </Link>
          .
        </p>
      ) : null}
    </section>
  );
}
