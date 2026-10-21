"use client";

/**
 * "Your deals" — the list the dashboard home opens on: one row per active
 * saved deal with its screening result, Deal score, Offer Ceiling, price and
 * the gap between the last two as a signed figure (benchmarks P9: density by
 * sign, rows on soft lines, no boxes). It replaced six dashboard modules
 * (Portfolio Overview, Pipeline, Top Performers, the Deal Comparison bar
 * chart, Portfolio Signals, and Risk vs Return) in Aug 2026, and since the
 * 2026-10 audit (Q1) it leads the page instead of sitting under tiles.
 *
 * PRESENTATION ONLY. maxOffer and offerGap arrive already solved from
 * app/dashboard/page.tsx (lib/deal-offer-line, the same path My Deals uses,
 * and offerCeilingGap); nothing here computes a price or a gap.
 */

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardDeal } from "@/lib/dashboard-deal-mapping";
import { sortDealsWithinMethodologyCohorts } from "@/lib/dashboard-deal-mapping";
import { Verdict } from "@/components/investcalc/verdict";
import { OfferCriteriaNote } from "@/components/investcalc/offer-criteria-note";

// No timestamp exists on DashboardDeal, so there is no "recently updated"
// sort to offer. Default to the gap — the column the list exists for.
type SortKey = "gap" | "maxOffer" | "score" | "address";

const money = (n: number | null | undefined) =>
  n == null ? "—" : `$${Math.round(n).toLocaleString("en-US")}`;

/**
 * The gap as a signed figure: "+$12,400" when the price is above the
 * ceiling, "−$8,000" (a true minus sign) when it is below, "$0" at it.
 * Green or red by the Sign rule (DESIGN.md "Color"): a price at or under the
 * ceiling passes the deal's targets, one above it misses them. The sign
 * carries the direction without colour; screen readers hear it in words.
 */
function GapFigure({
  gap,
  className,
}: {
  gap: number | null | undefined;
  className?: string;
}) {
  if (gap == null) {
    return (
      <span className={cn("font-figure text-muted-foreground", className)}>
        <span aria-hidden>—</span>
        <span className="sr-only">No Offer Ceiling, so no gap</span>
      </span>
    );
  }
  // Sign and colour follow the figure as shown, so a gap of $0.40 never
  // reads "+$0" in red.
  const shown = Math.round(gap);
  const amount = money(Math.abs(shown));
  return (
    <span
      className={cn(
        "whitespace-nowrap font-figure font-semibold",
        shown > 0 ? "text-negative" : "text-positive",
        className,
      )}
    >
      <span aria-hidden>
        {shown > 0 ? "+" : shown < 0 ? "−" : ""}
        {amount}
      </span>
      <span className="sr-only">
        {shown > 0
          ? `${amount} above the Offer Ceiling`
          : shown < 0
            ? `${amount} below the Offer Ceiling`
            : "Equal to the Offer Ceiling"}
      </span>
    </span>
  );
}

/** The model-version tag beside an address: metadata, so a 4px Geist Mono tag. */
function MethodologyTag({ deal }: { deal: DashboardDeal }) {
  if (!deal.methodologyLabel) return null;
  return (
    <span
      className="inline-flex rounded-sm border border-border px-1.5 py-0.5 font-mono text-2xs text-muted-foreground"
      title={
        deal.methodologyIsCurrent === false
          ? `${deal.methodologyLabel}. Re-underwrite before comparing with the current model.`
          : deal.methodologyLabel
      }
    >
      {deal.methodologyLabel}
    </span>
  );
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
      className={cn("px-3 py-1 text-left", className)}
    >
      <button
        type="button"
        onClick={() => onToggle(sortKey)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md text-xs font-medium whitespace-nowrap text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
  // The gap opens ascending: the most room under the ceiling first, so the
  // deals that work at their price lead and the misses follow.
  const [desc, setDesc] = useState(false);

  const sorted = useMemo(() => {
    const rows = [...deals];
    if (sortKey !== "address") {
      const valueFor = (deal: DashboardDeal) => {
        if (sortKey === "score") return deal.score;
        if (sortKey === "maxOffer") return deal.maxOffer ?? null;
        return deal.offerGap ?? null;
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
      setDesc(key === "gap" ? false : true);
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

  // A cohort header separates model versions; a book on one version has
  // nothing to separate, so it gets none (the same reasoning that dropped
  // the per-row "Recorded" badge, lib/dashboard-deal-mapping.ts).
  const startsCohortAt = (index: number) =>
    methodologySensitiveSort &&
    hasMixedMethodologies &&
    (index === 0 ||
      sorted[index - 1]?.methodologyComparisonKey !==
        sorted[index]?.methodologyComparisonKey);

  return (
    <section aria-labelledby="your-deals-heading">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="your-deals-heading" className="text-xl font-semibold text-foreground">
          Your deals
        </h2>
        <Link
          href="/dashboard/saved-analyses"
          className="inline-flex min-h-11 items-center rounded-md px-1 text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          View all
        </Link>
      </div>

      {methodologySensitiveSort && hasMixedMethodologies ? (
        <p className="mb-2 text-xs text-muted-foreground">
          Current and recorded model versions are grouped, then sorted only
          within their own version.
        </p>
      ) : null}

      {/* Below 1280px: one row per deal, the address and the signed gap on
          the first line, the screening result and the figures under it. At
          1024px beside the rail the content is ~775px wide, too narrow for
          six columns without clipping the gap, so the table waits for xl.
          The same `sorted` array powers both layouts, so the compact sort
          controls keep the desktop table's exact ordering contract. */}
      <div data-deal-layout="list" className="xl:hidden">
        <div className="flex items-end gap-2 pb-3">
          <label className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">
            Sort deals
            <select
              value={sortKey}
              onChange={(event) => {
                const next = event.target.value as SortKey;
                setSortKey(next);
                setDesc(next === "gap" ? false : true);
              }}
              className="mt-1 min-h-11 w-full rounded-lg border border-input bg-field px-3 text-base font-semibold text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
            >
              <option value="gap">Gap to ceiling</option>
              <option value="maxOffer">Offer Ceiling</option>
              <option value="score">Deal score</option>
              <option value="address">Property</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => setDesc((current) => !current)}
            aria-label={`Sort ${mobileDirectionLabel}. Activate to reverse the order.`}
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border border-input bg-field px-3 text-xs font-semibold text-foreground transition-[background-color] duration-150 hover:bg-band focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <ArrowUpDown aria-hidden className="size-4" />
            <span>{mobileDirectionLabel}</span>
          </button>
        </div>

        <ul className="border-t border-foreground">
          {sorted.map((deal, dealIndex) => (
            <Fragment key={deal.id}>
              {startsCohortAt(dealIndex) ? (
                <li className="border-b border-rule-soft bg-band px-3 py-2">
                  <p className="text-xs font-semibold text-foreground">
                    {deal.methodologyGroupLabel ?? "Current underwriting"}
                  </p>
                  <p className="text-2xs text-muted-foreground">
                    Sorted only within this model version.
                  </p>
                </li>
              ) : null}
              <li className="border-b border-rule-soft pb-2.5">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    id={`dashboard-deal-${deal.id}`}
                    href={`/dashboard/saved-analyses/${deal.id}`}
                    className="flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-md font-semibold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    title={deal.address ?? undefined}
                  >
                    <span className="min-w-0 break-words">{deal.address ?? "Untitled deal"}</span>
                  </Link>
                  <span className="flex min-h-11 shrink-0 flex-col items-end justify-center">
                    <GapFigure gap={deal.offerGap} />
                    <span aria-hidden className="text-2xs text-muted-foreground">
                      Gap
                    </span>
                  </span>
                </div>
                {deal.methodologyLabel ? (
                  <div className="mb-1.5">
                    <MethodologyTag deal={deal} />
                  </div>
                ) : null}
                {/* mt-1: the ⓘ's 44px hit area reaches 10px above its line;
                    the gap keeps it off the address link's text. */}
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  {deal.recommendation ? (
                    <Verdict recommendation={deal.recommendation} variant="compact" />
                  ) : (
                    <span>Not screened</span>
                  )}
                  {/* Plain label-and-figure runs, so the chip, the ceiling,
                      the price and the score wrap as one line of text. */}
                  <span className="inline-flex items-center gap-1.5">
                    Offer Ceiling
                    <span className="inline-flex items-center gap-1 font-figure text-sm font-semibold text-foreground">
                      {money(deal.maxOffer)}
                      {deal.maxOffer != null && deal.maxOfferBasisLabel ? (
                        <OfferCriteriaNote basisLabel={deal.maxOfferBasisLabel} />
                      ) : null}
                    </span>
                  </span>
                  <span className="inline-flex items-baseline gap-1.5">
                    Price
                    <span className="font-figure text-sm text-foreground">
                      {money(deal.purchasePrice)}
                    </span>
                  </span>
                  <span className="inline-flex items-baseline gap-1.5">
                    Deal score
                    <span className="font-figure text-sm text-foreground">
                      {deal.score ?? "—"}
                    </span>
                  </span>
                </div>
              </li>
            </Fragment>
          ))}
        </ul>
      </div>

      {/* From 1280px the dense sortable table, on the same lines. Fixed
          layout: the five figure columns keep their widths and the address
          takes the rest, truncating, so no width clips the gap. */}
      <div data-deal-layout="table" className="hidden overflow-x-auto border-t border-foreground xl:block" tabIndex={0}>
        <table className="w-full table-fixed text-sm">
          <caption className="sr-only">
            Your saved deals with the screening result, Deal score, Offer
            Ceiling, price, and the gap between the price and the Offer Ceiling
          </caption>
          <colgroup>
            <col />
            <col className="w-40" />
            <col className="w-26" />
            <col className="w-34" />
            <col className="w-26" />
            <col className="w-28" />
          </colgroup>
          <thead>
            <tr className="border-b border-border">
              <SortableTh label="Property" sortKey="address" activeKey={sortKey} desc={desc} onToggle={toggle} />
              <th scope="col" className="whitespace-nowrap px-3 py-1 text-left text-xs font-medium text-muted-foreground">
                Screening result
              </th>
              <SortableTh label="Deal score" sortKey="score" activeKey={sortKey} desc={desc} onToggle={toggle} className="text-right" />
              <SortableTh label="Offer Ceiling" sortKey="maxOffer" activeKey={sortKey} desc={desc} onToggle={toggle} className="text-right" />
              <th scope="col" className="whitespace-nowrap px-3 py-1 text-right text-xs font-medium text-muted-foreground">
                Price
              </th>
              <SortableTh label="Gap" sortKey="gap" activeKey={sortKey} desc={desc} onToggle={toggle} className="text-right" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((deal, i) => (
              <Fragment key={deal.id}>
                {startsCohortAt(i) ? (
                  <tr className="border-b border-rule-soft bg-band">
                    <td colSpan={6} className="px-3 py-2 text-left">
                      <span className="text-xs font-semibold text-foreground">
                        {deal.methodologyGroupLabel ?? "Current underwriting"}
                      </span>
                      <span className="ml-2 text-2xs text-muted-foreground">
                        Sorted only within this model version
                      </span>
                    </td>
                  </tr>
                ) : null}
                <tr className="border-b border-rule-soft transition-[background-color] duration-150 hover:bg-band">
                  <td className="px-3 py-1">
                    <Link
                      href={`/dashboard/saved-analyses/${deal.id}`}
                      className="flex min-h-11 min-w-0 items-center rounded-md font-semibold text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      title={deal.address ?? undefined}
                    >
                      <span className="truncate">{deal.address ?? "Untitled deal"}</span>
                    </Link>
                    {deal.methodologyLabel ? (
                      <div className="pb-2">
                        <MethodologyTag deal={deal} />
                      </div>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1">
                    {deal.recommendation ? (
                      <Verdict recommendation={deal.recommendation} variant="compact" />
                    ) : (
                      <span className="text-xs text-muted-foreground">Not screened</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-1 text-right font-figure text-muted-foreground">
                    {deal.score ?? "—"}
                  </td>
                  <td className="px-3 py-1 text-right text-foreground">
                    <div className="flex items-center justify-end gap-1 whitespace-nowrap font-figure font-semibold">
                      {/* ⓘ BEFORE the number: digits stay flush on the
                        column's right edge, so rows without a ceiling ("—")
                        and rows with one share a single right edge. */}
                      {deal.maxOffer != null && deal.maxOfferBasisLabel ? (
                        <OfferCriteriaNote
                          basisLabel={deal.maxOfferBasisLabel}
                        />
                      ) : null}
                      {money(deal.maxOffer)}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-1 text-right font-figure text-muted-foreground">
                    {money(deal.purchasePrice)}
                  </td>
                  <td className="px-3 py-1 text-right">
                    <GapFigure gap={deal.offerGap} />
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {/* Exact per-deal criteria open from the ⓘ beside each ceiling; the
          note can therefore explain the gap without pretending a mixed list
          shares one target basis. "Price", not "asking": this screen cannot
          tell an asking price from an automated estimate. */}
      <p className="mt-2 max-w-prose text-2xs leading-relaxed text-muted-foreground">
        Gap is the price minus the Offer Ceiling, the highest price that still
        meets the targets shown for that deal: plus means the price is above
        the ceiling, minus that it is under. Deal score is a heuristic summary
        of the modeled numbers, 0–100.
      </p>
    </section>
  );
}
