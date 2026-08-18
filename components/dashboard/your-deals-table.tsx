"use client";

/**
 * "Your deals" — ONE sortable table that replaces six dashboard modules
 * (Portfolio Overview, Pipeline, Top Performers, the Deal Comparison bar
 * chart, Portfolio Signals, and Risk vs Return).
 *
 * The point of the screen: this is the first surface in the dashboard's
 * history to show a MAX OFFER per deal, and the gap between it and the
 * asking price. A portfolio dashboard for a product sold on "never overpay"
 * had no column for the number that answers it.
 *
 * PRESENTATION ONLY. maxOffer arrives already solved from
 * app/dashboard/page.tsx (lib/deal-offer-line — the same path My Deals
 * uses); nothing here computes a price.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardDeal } from "@/lib/dashboard-deal-mapping";
import { Verdict } from "@/components/investcalc/verdict";

// No timestamp exists on DashboardDeal, so there is no "recently updated"
// sort to offer. Default to the gap — the column the table exists for.
type SortKey = "gap" | "maxOffer" | "score" | "address";

const money = (n: number | null | undefined) =>
  n == null ? "—" : `$${Math.round(n).toLocaleString("en-US")}`;

/** Gap = asking − max offer. Positive means asking is ABOVE what works. */
function gapOf(deal: DashboardDeal): number | null {
  const asking = deal.purchasePrice ?? null;
  if (asking == null || deal.maxOffer == null) return null;
  return asking - deal.maxOffer;
}

export function YourDealsTable({ deals }: { deals: DashboardDeal[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("gap");
  const [desc, setDesc] = useState(true);

  const sorted = useMemo(() => {
    const rows = [...deals];
    rows.sort((a, b) => {
      const dir = desc ? -1 : 1;
      switch (sortKey) {
        case "address":
          return dir * (a.address ?? "").localeCompare(b.address ?? "");
        case "score":
          return dir * ((a.score ?? -1) - (b.score ?? -1));
        case "maxOffer":
          return dir * ((a.maxOffer ?? -1) - (b.maxOffer ?? -1));
        case "gap":
          return dir * ((gapOf(a) ?? Number.NEGATIVE_INFINITY) - (gapOf(b) ?? Number.NEGATIVE_INFINITY));
        default:
          return dir * ((gapOf(a) ?? Number.NEGATIVE_INFINITY) - (gapOf(b) ?? Number.NEGATIVE_INFINITY));
      }
    });
    return rows;
  }, [deals, sortKey, desc]);

  if (deals.length === 0) return null;

  const toggle = (key: SortKey) => {
    if (key === sortKey) setDesc((d) => !d);
    else {
      setSortKey(key);
      setDesc(true);
    }
  };

  const Th = ({ label, k, className }: { label: string; k: SortKey; className?: string }) => (
    <th scope="col" className={cn("px-3 py-2 text-left", className)}>
      <button
        type="button"
        onClick={() => toggle(k)}
        aria-sort={sortKey === k ? (desc ? "descending" : "ascending") : "none"}
        className="inline-flex min-h-8 items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {label}
        <ArrowUpDown aria-hidden className={cn("size-3", sortKey === k && "text-primary")} />
      </button>
    </th>
  );

  return (
    <section aria-labelledby="your-deals-heading" className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-baseline justify-between gap-3 px-4 py-3 sm:px-5">
        <h2 id="your-deals-heading" className="text-base font-extrabold text-foreground">
          Your deals
        </h2>
        <Link href="/dashboard/saved-analyses" className="text-xs font-semibold text-primary hover:underline">
          View all
        </Link>
      </div>
      {/* Wide table scrolls inside its own container so the page never does. */}
      <div className="overflow-x-auto border-t border-border" tabIndex={0}>
        <table className="w-full min-w-[720px] text-sm">
          <caption className="sr-only">
            Your saved deals with max offer, asking price, and the gap between them
          </caption>
          <thead className="bg-muted/30">
            <tr>
              <Th label="Property" k="address" />
              <Th label="Max offer" k="maxOffer" className="text-right" />
              <th scope="col" className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Asking
              </th>
              <Th label="Gap" k="gap" className="text-right" />
              <th scope="col" className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Verdict
              </th>
              <Th label="Score" k="score" className="text-right" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((deal, i) => {
              const gap = gapOf(deal);
              return (
                <tr key={deal.id} className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                  <td className="max-w-[240px] px-3 py-2.5">
                    <Link
                      href={`/dashboard/saved-analyses/${deal.id}`}
                      className="block truncate font-semibold text-foreground hover:text-primary"
                      title={deal.address ?? undefined}
                    >
                      {deal.address ?? "Untitled deal"}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono font-bold tabular-nums text-foreground">
                    {money(deal.maxOffer)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                    {money(deal.purchasePrice)}
                  </td>
                  <td
                    className={cn(
                      "whitespace-nowrap px-3 py-2.5 text-right font-mono font-semibold tabular-nums",
                      gap == null
                        ? "text-muted-foreground"
                        : gap > 0
                          ? "text-[var(--metric-negative)]"
                          : "text-[var(--metric-positive)]"
                    )}
                  >
                    {gap == null ? "—" : gap > 0 ? `+${money(gap)}` : money(Math.abs(gap))}
                    {gap != null ? (
                      <span className="sr-only">
                        {gap > 0 ? " above your max offer" : " below your max offer"}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5">
                    {deal.recommendation ? (
                      <Verdict recommendation={deal.recommendation} variant="compact" />
                    ) : (
                      <span className="text-xs text-muted-foreground">Not scored</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums text-foreground">
                    {deal.score ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground sm:px-5">
        Gap is the asking price minus your max offer. A positive gap means the
        asking price is above what your targets support.
      </p>
    </section>
  );
}
