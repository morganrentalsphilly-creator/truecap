"use client";

/**
 * "Your deals" — ONE sortable table that replaces six dashboard modules
 * (Portfolio Overview, Pipeline, Top Performers, the Deal Comparison bar
 * chart, Portfolio Signals, and Risk vs Return).
 *
 * The point of the screen: this is the first surface in the dashboard's
 * history to show an Offer Ceiling per deal, and the gap between it and the
 * asking price. A portfolio dashboard for an acquisition decision system
 * had no column for the number that answers it.
 *
 * PRESENTATION ONLY. maxOffer arrives already solved from
 * app/dashboard/page.tsx (lib/deal-offer-line — the same path My Deals
 * uses); nothing here computes a price.
 */

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardDeal } from "@/lib/dashboard-deal-mapping";
import { sortDealsWithinMethodologyCohorts } from "@/lib/dashboard-deal-mapping";
import { Verdict } from "@/components/investcalc/verdict";
import { OfferCriteriaNote } from "@/components/investcalc/offer-criteria-note";

// No timestamp exists on DashboardDeal, so there is no "recently updated"
// sort to offer. Default to the gap — the column the table exists for.
type SortKey = "gap" | "maxOffer" | "score" | "address";

const money = (n: number | null | undefined) =>
  n == null ? "—" : `$${Math.round(n).toLocaleString("en-US")}`;

/** Gap = asking − Offer Ceiling. Positive means asking is ABOVE what works. */
function gapOf(deal: DashboardDeal): number | null {
  const asking = deal.purchasePrice ?? null;
  if (asking == null || deal.maxOffer == null) return null;
  return asking - deal.maxOffer;
}

/**
 * Sortable header cell.
 *
 * MODULE SCOPE, not inline: declaring this inside YourDealsTable made it a
 * new component type on every render, so React threw away the header row and
 * focus landed on <body> after each keyboard-driven sort.
 *
 * aria-sort lives on the <th> — ARIA ignores it on a nested <button>, so the
 * sort state was announced to nobody.
 */
function SortableTh({
  label,
  sortKey,
  activeKey,
  desc,
  onToggle,
  className,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  desc: boolean;
  onToggle: (k: SortKey) => void;
  className?: string;
}) {
  const active = activeKey === sortKey;
  return (
    <th
      scope="col"
      aria-sort={active ? (desc ? "descending" : "ascending") : "none"}
      className={cn("px-3 py-2 text-left", className)}
    >
      <button
        type="button"
        onClick={() => onToggle(sortKey)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {label}
        <span className="sr-only">
          {active ? `, sorted ${desc ? "descending" : "ascending"}` : ", not sorted"}
        </span>
        <ArrowUpDown aria-hidden className={cn("size-3", active && "text-primary")} />
      </button>
    </th>
  );
}

export function YourDealsTable({ deals }: { deals: DashboardDeal[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("gap");
  const [desc, setDesc] = useState(true);

  const sorted = useMemo(() => {
    const rows = [...deals];
    if (sortKey !== "address") {
      const valueFor = (deal: DashboardDeal) => {
        if (sortKey === "score") return deal.score;
        if (sortKey === "maxOffer") return deal.maxOffer ?? null;
        return gapOf(deal);
      };
      return sortDealsWithinMethodologyCohorts(
        rows,
        valueFor,
        desc ? "desc" : "asc"
      );
    }
    rows.sort((a, b) => {
      const dir = desc ? -1 : 1;
      switch (sortKey) {
        case "address":
          return dir * (a.address ?? "").localeCompare(b.address ?? "");
        default:
          return 0;
      }
    });
    return rows;
  }, [deals, sortKey, desc]);

  const methodologySensitiveSort = sortKey !== "address";
  const hasMixedMethodologies = useMemo(
    () =>
      new Set(
        deals.map(
          (deal) => deal.methodologyComparisonKey ?? "current:unknown"
        )
      ).size > 1,
    [deals]
  );

  if (deals.length === 0) return null;

  const toggle = (key: SortKey) => {
    if (key === sortKey) setDesc((d) => !d);
    else {
      setSortKey(key);
      setDesc(true);
    }
  };

  const mobileDirectionLabel =
    sortKey === "address"
      ? desc
        ? "Z to A"
        : "A to Z"
      : desc
        ? "High to low"
        : "Low to high";

  return (
    <section aria-labelledby="your-deals-heading" className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-baseline justify-between gap-3 px-4 py-3 sm:px-5">
        <h2 id="your-deals-heading" className="text-base font-extrabold text-foreground">
          Your deals
        </h2>
        <Link
          href="/dashboard/saved-analyses"
          className="inline-flex min-h-11 items-center rounded-md px-1 text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          View all
        </Link>
      </div>

      {methodologySensitiveSort && hasMixedMethodologies ? (
        <p className="border-t border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground sm:px-5">
          Current and recorded model versions are grouped, then sorted only
          within their own version.
        </p>
      ) : null}

      {/* Phones and tablets get real deal cards rather than a clipped six-column
          table. The same `sorted` array powers both layouts, so changing the
          compact sort controls preserves the exact desktop ordering contract. */}
      <div data-deal-layout="cards" className="border-t border-border lg:hidden">
        <div className="flex flex-wrap items-end gap-2 border-b border-border bg-muted/20 px-4 py-3 sm:px-5">
          <label className="min-w-0 flex-1 text-xs font-bold text-muted-foreground">
            Sort deals
            <select
              value={sortKey}
              onChange={(event) => {
                setSortKey(event.target.value as SortKey);
                setDesc(true);
              }}
              className="mt-1 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="gap">Gap to ceiling</option>
              <option value="maxOffer">Offer Ceiling</option>
              <option value="score">Screening Index</option>
              <option value="address">Property</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => setDesc((current) => !current)}
            aria-label={`Sort ${mobileDirectionLabel}. Activate to reverse the order.`}
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border border-input bg-background px-3 text-xs font-bold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowUpDown aria-hidden className="size-4" />
            <span>{mobileDirectionLabel}</span>
          </button>
        </div>

        <div className="space-y-3 p-3 sm:p-4">
          {sorted.map((deal, dealIndex) => {
            const gap = gapOf(deal);
            const dealHeadingId = `dashboard-deal-${deal.id}`;
            const startsMethodologyCohort =
              methodologySensitiveSort &&
              (dealIndex === 0 ||
                sorted[dealIndex - 1]?.methodologyComparisonKey !==
                  deal.methodologyComparisonKey);
            return (
              <Fragment key={deal.id}>
              {startsMethodologyCohort ? (
                <div className="rounded-xl border border-border bg-muted/40 px-3 py-2">
                  <p className="text-xs font-bold text-foreground">
                    {deal.methodologyGroupLabel ?? "Current underwriting"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Sorted only within this model version.
                  </p>
                </div>
              ) : null}
              <article
                aria-labelledby={dealHeadingId}
                className="rounded-xl border border-border bg-background p-4 shadow-sm"
              >
                <Link
                  id={dealHeadingId}
                  href={`/dashboard/saved-analyses/${deal.id}`}
                  className="flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-md font-bold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  title={deal.address ?? undefined}
                >
                  <span className="min-w-0 break-words">{deal.address ?? "Untitled deal"}</span>
                  <ArrowUpRight aria-hidden className="size-4 shrink-0" />
                </Link>
                {deal.methodologyLabel ? (
                  <span
                    className="mt-1 inline-flex rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
                    title={
                      deal.methodologyIsCurrent === false
                        ? `${deal.methodologyLabel}. Re-underwrite before comparing with the current model.`
                        : deal.methodologyLabel
                    }
                  >
                    {deal.methodologyLabel}
                  </span>
                ) : null}

                <dl className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted/30 p-3">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Offer Ceiling
                    </dt>
                    <dd className="mt-1 font-mono text-lg font-extrabold tabular-nums text-foreground">
                      {money(deal.maxOffer)}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Price
                    </dt>
                    <dd className="mt-1 font-mono text-lg font-bold tabular-nums text-foreground">
                      {money(deal.purchasePrice)}
                    </dd>
                  </div>
                  {deal.maxOffer != null && deal.maxOfferBasisLabel ? (
                    <div className="col-span-2">
                      <details className="text-xs text-muted-foreground">
                        <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-primary underline-offset-2 hover:underline">
                          View exact Offer Ceiling criteria
                        </summary>
                        <p className="mt-1 break-words leading-relaxed">
                          Criteria: {deal.maxOfferBasisLabel}
                        </p>
                      </details>
                    </div>
                  ) : null}
                  <div className="rounded-lg border border-border p-3">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Gap
                    </dt>
                    <dd
                      className={cn(
                        "mt-1 font-mono text-sm font-bold tabular-nums",
                        gap == null
                          ? "text-muted-foreground"
                          : gap > 0
                            ? "text-[var(--metric-negative)]"
                            : "text-[var(--metric-positive)]"
                      )}
                    >
                      {gap == null
                        ? "—"
                        : gap > 0
                          ? `${money(Math.abs(gap))} over`
                          : gap < 0
                            ? `${money(Math.abs(gap))} under`
                            : "At ceiling"}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Screening Index
                    </dt>
                    <dd className="mt-1 font-mono text-sm font-bold tabular-nums text-foreground">
                      {deal.score ?? "—"}
                    </dd>
                  </div>
                </dl>

                <div className="mt-3 flex min-h-11 items-center border-t border-border pt-3">
                  {deal.recommendation ? (
                    <Verdict recommendation={deal.recommendation} variant="compact" />
                  ) : (
                    <span className="text-xs text-muted-foreground">Not screened</span>
                  )}
                </div>
              </article>
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* Desktop keeps the dense sortable comparison table. At narrower
          breakpoints the card renderer above is the only visible layout. */}
      <div data-deal-layout="table" className="hidden overflow-x-auto border-t border-border lg:block" tabIndex={0}>
        <table className="w-full min-w-[720px] text-sm">
          <caption className="sr-only">
            Your saved deals with Offer Ceiling, asking price, the gap between them, and a secondary Screening Index that is not investment advice
          </caption>
          <thead className="bg-muted/30">
            <tr>
              <SortableTh label="Property" sortKey="address" activeKey={sortKey} desc={desc} onToggle={toggle} />
              <SortableTh label="Offer Ceiling" sortKey="maxOffer" activeKey={sortKey} desc={desc} onToggle={toggle} className="text-right" />
              <th scope="col" className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Price
              </th>
              <SortableTh label="Gap" sortKey="gap" activeKey={sortKey} desc={desc} onToggle={toggle} className="text-right" />
              <th scope="col" className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Screening result
              </th>
              <SortableTh label="Screening Index" sortKey="score" activeKey={sortKey} desc={desc} onToggle={toggle} className="text-right" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((deal, i) => {
              const gap = gapOf(deal);
              const startsMethodologyCohort =
                methodologySensitiveSort &&
                (i === 0 ||
                  sorted[i - 1]?.methodologyComparisonKey !==
                    deal.methodologyComparisonKey);
              return (
                <Fragment key={deal.id}>
                {startsMethodologyCohort ? (
                  <tr className="border-y border-border bg-muted/40">
                    <td colSpan={6} className="px-3 py-2 text-left">
                      <span className="text-xs font-bold text-foreground">
                        {deal.methodologyGroupLabel ?? "Current underwriting"}
                      </span>
                      <span className="ml-2 text-[11px] text-muted-foreground">
                        Sorted only within this model version
                      </span>
                    </td>
                  </tr>
                ) : null}
                <tr className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                  <td className="max-w-[240px] px-3 py-2.5">
                    <Link
                      href={`/dashboard/saved-analyses/${deal.id}`}
                      className="flex min-h-11 items-center truncate rounded-md font-semibold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      title={deal.address ?? undefined}
                    >
                      {deal.address ?? "Untitled deal"}
                    </Link>
                    {deal.methodologyLabel ? (
                      <span
                        className="mt-0.5 inline-flex rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
                        title={
                          deal.methodologyIsCurrent === false
                            ? `${deal.methodologyLabel}. Re-underwrite before comparing with the current model.`
                            : deal.methodologyLabel
                        }
                      >
                        {deal.methodologyLabel}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-right text-foreground">
                    <div className="flex items-center justify-end gap-1 whitespace-nowrap font-mono font-bold tabular-nums">
                      {money(deal.maxOffer)}
                      {deal.maxOffer != null && deal.maxOfferBasisLabel ? (
                        <OfferCriteriaNote
                          basisLabel={deal.maxOfferBasisLabel}
                        />
                      ) : null}
                    </div>
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
                    {/* Direction was carried by colour plus a bare "+".
                        The word makes it legible without hue. */}
                    {gap == null ? (
                      "—"
                    ) : (
                      <>
                        {money(Math.abs(gap))}
                        <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide">
                          {gap > 0 ? "over" : gap < 0 ? "under" : "at"}
                        </span>
                        <span className="sr-only">
                          {gap > 0
                            ? " above the Offer Ceiling"
                            : gap < 0
                              ? " below the Offer Ceiling"
                              : " equal to the Offer Ceiling"}
                        </span>
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {deal.recommendation ? (
                      <Verdict recommendation={deal.recommendation} variant="compact" />
                    ) : (
                      <span className="text-xs text-muted-foreground">Not screened</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums text-foreground">
                    {deal.score ?? "—"}
                  </td>
                </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Exact per-deal criteria render beneath each ceiling; the footer can
          therefore explain the gap without pretending a mixed table shares
          one target basis. */}
      <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground sm:px-5">
        Gap is the asking price minus the Offer Ceiling. A positive gap means the
        asking price is above the highest modeled price that still meets the criteria
        shown for that deal under its assumptions. The Screening Index is a secondary heuristic.
        Neither output is a recommended offer, appraisal, or investment advice.
      </p>
    </section>
  );
}
