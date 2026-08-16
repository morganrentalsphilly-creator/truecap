"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Home, KeyRound } from "lucide-react";
import { recommendationLabel, type DealScoreBreakdown } from "@/lib/deal-score";
import { formatRoiHeadline } from "@/lib/extreme-value-format";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScoreBreakdown } from "@/components/investcalc/score-breakdown";
import { BuyBoxFitBadge } from "@/components/investcalc/buy-box-fit-badge";
import type { BuyBoxFitSummary } from "@/lib/buy-box";

export type DashboardTopDeal = {
  id?: string;
  name: string;
  address: string;
  type: string;
  capRate: number | null;
  coc: number | null;
  cashFlow: number | null;
  price: number | null;
  score: number | null;
  signal: string | null;
  roi: number | null;
  riskLevel: string | null;
  /** Per-factor score breakdown for the "Why this score" popover. */
  breakdown?: DealScoreBreakdown | null;
  /** Raw property type (not the display label) — the popover needs it so
   *  owner-occupant cash flow renders against its 30-pt max, not the
   *  investor 22. */
  propertyType?: "single-family" | "multi-family" | "owner-occupant" | null;
  tags?: string[];
  /** Buy-box fit (PV-6) — null/undefined for users without an active box, so
   *  the badge and the Fit sort stay invisible for them. */
  fit?: BuyBoxFitSummary | null;
  methodologyLabel?: string;
};

const typeIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  "Multi-Family": Building2,
  "Single Family": Home,
  "House Hack": KeyRound,
  "Owner Occupant": KeyRound,
};

const signalStyle: Record<string, string> = {
  "Strong Buy": "bg-success/10 text-success ring-success/20",
  Buy: "bg-primary/10 text-primary ring-primary/20",
  Neutral: "bg-warning/15 text-warning-foreground ring-warning/30",
  Risky: "bg-warning/15 text-warning-foreground ring-warning/30",
  Hold: "bg-warning/15 text-warning-foreground ring-warning/30",
  Avoid: "bg-destructive/10 text-destructive ring-destructive/20",
};

const riskStyle: Record<string, string> = {
  "Low Risk": "bg-success/10 text-success ring-success/20",
  "Medium Risk": "bg-warning/15 text-warning-foreground ring-warning/30",
  "High Risk": "bg-destructive/10 text-destructive ring-destructive/20",
  Moderate: "bg-warning/15 text-warning-foreground ring-warning/30",
  Balanced: "bg-success/10 text-success ring-success/20",
  "Low Return": "bg-warning/15 text-warning-foreground ring-warning/30",
};

const scoreRingStrokeByRisk: Record<string, string> = {
  "Low Risk": "oklch(0.68 0.17 158)",
  "Medium Risk": "oklch(0.78 0.14 85)",
  "High Risk": "oklch(0.62 0.24 25)",
  Moderate: "oklch(0.78 0.14 85)",
  Balanced: "oklch(0.68 0.17 158)",
  "Low Return": "oklch(0.78 0.14 85)",
};

const sortOptions = [
  { id: "score", label: "Score" },
  { id: "roi", label: "ROI" },
  { id: "cashFlow", label: "CF" },
  // Buy-box fit (PV-6) — the option only renders when ≥1 deal actually
  // carries a fit (i.e. the user has an active box); see visibleSortOptions.
  { id: "fit", label: "Fit" },
] as const;

type SortMetric = (typeof sortOptions)[number]["id"];

function getDealId(deal: DashboardTopDeal) {
  return (deal.id ?? `${deal.name}-${deal.address}`).replace(/[^a-zA-Z0-9_-]/g, "-");
}

/**
 * "Jump to this deal" request from a deep-link entry point (the Top performers
 * rows in DashboardHome). Detail carries the anchor id WITHOUT the `deal-`
 * prefix. Only meaningful while the mobile stack is collapsed — see the
 * listener below.
 */
export const REVEAL_DEAL_EVENT = "tc-dashboard-reveal-deal";

function getSortValue(deal: DashboardTopDeal, sortBy: SortMetric) {
  if (sortBy === "roi") return deal.roi;
  if (sortBy === "cashFlow") return deal.cashFlow;
  return deal.score;
}

export function TopDeals({ data }: { data: DashboardTopDeal[] }) {
  const [sortBy, setSortBy] = useState<SortMetric>("score");
  // Mobile-only "top 3 → show all" disclosure (density audit DH-5).
  const [showAllMobile, setShowAllMobile] = useState(false);
  // Score-ring track + no-risk arc color (SVG strokes can't use var()). The
  // dashboard is always light, so this is the fixed light-mode track.
  const ringTrack = "oklch(0.92 0.012 255)";
  // Fit sort exists only for users with an active buy box — everyone else
  // keeps the exact Score/ROI/CF control (invisible until useful).
  const hasBuyBoxFit = data.some((deal) => deal.fit != null && deal.fit.activeCount > 0);
  const visibleSortOptions = hasBuyBoxFit
    ? sortOptions
    : sortOptions.filter((option) => option.id !== "fit");
  const sortedData = useMemo(() => {
    return data
      .map((deal, index) => ({ deal, index }))
      .sort((a, b) => {
        // Fit sort (PV-6): passing deals first, then generic score, then the
        // stable server order — equal-fit deals never reshuffle.
        if (sortBy === "fit") {
          const aPass = a.deal.fit?.anyPass ? 1 : 0;
          const bPass = b.deal.fit?.anyPass ? 1 : 0;
          if (aPass !== bPass) return bPass - aPass;
          const aScore = a.deal.score ?? Number.NEGATIVE_INFINITY;
          const bScore = b.deal.score ?? Number.NEGATIVE_INFINITY;
          if (aScore !== bScore) return bScore - aScore;
          return a.index - b.index;
        }
        const aValue = getSortValue(a.deal, sortBy) ?? Number.NEGATIVE_INFINITY;
        const bValue = getSortValue(b.deal, sortBy) ?? Number.NEGATIVE_INFINITY;
        if (aValue !== bValue) return bValue - aValue;
        return a.index - b.index;
      })
      .map(({ deal }) => deal);
  }, [data, sortBy]);

  // Deep links from "Top performers" can name a deal ranked 4th-6th by score,
  // which the collapsed top-3 stack hasn't rendered. Between sm and md that
  // stack is the ONLY place deal anchors exist (the table below is md:block),
  // so the jump used to die silently. Expand on request so the anchor mounts;
  // DashboardHome retries the scroll on the next frames.
  useEffect(() => {
    const onReveal = (event: Event) => {
      const anchorId = (event as CustomEvent<{ anchorId?: string }>).detail?.anchorId;
      if (!anchorId) return;
      // Only expand for a deal we actually hold — an unrelated anchor must not
      // pop the list open for nothing.
      if (!sortedData.some((deal) => getDealId(deal) === anchorId)) return;
      setShowAllMobile(true);
    };
    window.addEventListener(REVEAL_DEAL_EVENT, onReveal);
    return () => window.removeEventListener(REVEAL_DEAL_EVENT, onReveal);
  }, [sortedData]);

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      <div className="flex flex-col gap-4 p-4 pb-3 sm:flex-row sm:items-start sm:justify-between sm:p-6 sm:pb-4">
        <div>
          <h3 className="font-display text-lg font-semibold">Deal Decision List</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Sort saved deals by the metric that matters for the next purchase.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Sort deals by" className="flex items-center gap-1 p-1 rounded-lg bg-muted">
            {visibleSortOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={sortBy === option.id}
                onClick={() => setSortBy(option.id)}
                className={`px-3 py-2 text-xs font-semibold rounded-md transition sm:py-1 ${
                  sortBy === option.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4 pt-0 md:hidden">
        {/* Top 3 by default on phones — six ~300px cards was ~1,800px of
            re-scannable stack (mobile density audit DH-5). A deep link to a
            collapsed deal is NOT a no-op: DashboardHome's scrollToDeal finds
            no LAID-OUT anchor and dispatches REVEAL_DEAL_EVENT, which the
            effect above turns into showAllMobile. NOTE: `id="deal-…"` is
            deliberately duplicated between this stack and the desktop table
            below — both copies stay mounted at every width, so consumers must
            resolve the one with a layout box (lib/deal-anchor.ts), never
            document.getElementById. */}
        {(showAllMobile ? sortedData : sortedData.slice(0, 3)).map((d) => {
          const Icon = typeIcon[d.type] ?? Building2;
          const dealId = getDealId(d);
          return (
            <article id={`deal-${dealId}`} key={dealId} tabIndex={-1} className="scroll-mt-24 rounded-2xl border border-border bg-background p-4 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-bold leading-tight text-foreground">
                    {d.id ? (
                      <Link href={`/dashboard/saved-analyses/${d.id}`} className="hover:text-primary hover:underline">
                        {d.name}
                      </Link>
                    ) : (
                      d.name
                    )}
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground">{d.address}</p>
                  {d.methodologyLabel ? (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {d.methodologyLabel}
                    </p>
                  ) : null}
                </div>
                <div className="relative h-11 w-11 shrink-0">
                  <svg aria-hidden className="h-11 w-11 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke={ringTrack} strokeWidth="3" />
                    {d.score != null ? (
                      <circle
                        cx="18"
                        cy="18"
                        r="15"
                        fill="none"
                        stroke={d.riskLevel ? scoreRingStrokeByRisk[d.riskLevel] ?? ringTrack : ringTrack}
                        strokeWidth="3"
                        strokeDasharray={`${(d.score / 100) * 94.2} 94.2`}
                        strokeLinecap="round"
                      />
                    ) : null}
                  </svg>
                  <div aria-hidden className="absolute inset-0 grid place-items-center text-xs font-bold">{d.score ?? "-"}</div>
                  {/* Risk is encoded in the ring COLOR only — give SR/colorblind
                      users the score + risk as text. */}
                  <span className="sr-only">
                    {d.score != null ? `Deal score ${d.score} out of 100` : "Not scored"}
                    {d.riskLevel ? `, ${d.riskLevel} risk` : ""}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cash Flow</p>
                  <p className={`mt-1 text-sm font-extrabold tabular-nums ${d.cashFlow == null ? "" : d.cashFlow >= 0 ? "text-success" : "text-destructive"}`}>
                    {d.cashFlow == null ? "-" : `${d.cashFlow >= 0 ? "+" : ""}$${Math.round(d.cashFlow).toLocaleString()}/mo`}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">10-Yr ROI</p>
                  {/* Extreme cumulative ROI (finding 5): framed band in the
                      cell, raw figure on the title attr — never a bare 673%. */}
                  <p
                    className="mt-1 text-sm font-extrabold tabular-nums text-foreground"
                    title={formatRoiHeadline(d.roi, { decimals: 1, compact: true }).title}
                  >
                    {formatRoiHeadline(d.roi, { decimals: 1, compact: true }).text}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cap Rate</p>
                  <p className="mt-1 text-sm font-extrabold tabular-nums text-foreground">{d.capRate == null ? "-" : `${d.capRate}%`}</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Risk</p>
                  <p className="mt-1 text-sm font-extrabold text-foreground">{d.riskLevel ?? "-"}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {d.signal ? (
                  <span className={`text-[11px] font-semibold px-2 py-1 rounded-md ring-1 ${signalStyle[d.signal] ?? "bg-muted text-muted-foreground ring-border"}`}>{recommendationLabel(d.signal)}</span>
                ) : null}
                {/* Buy-box fit (PV-6) — the shared My Deals pill; renders
                    nothing for users without an active box. */}
                <BuyBoxFitBadge fit={d.fit ?? undefined} />
                {d.breakdown && d.score != null ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="text-[11px] font-semibold text-primary underline-offset-2 hover:underline">Why?</button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-3">
                      <ScoreBreakdown breakdown={d.breakdown} score={d.score} propertyType={d.propertyType} />
                    </PopoverContent>
                  </Popover>
                ) : null}
                {d.tags?.map((tag) => (
                  <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          );
        })}
        {sortedData.length > 3 ? (
          <button
            type="button"
            onClick={() => setShowAllMobile((v) => !v)}
            className="flex min-h-11 w-full items-center justify-center rounded-xl border border-dashed border-border text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            {showAllMobile ? "Show fewer" : `Show ${sortedData.length - 3} more deals`}
          </button>
        ) : null}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-y border-border bg-muted/40">
              <th scope="col" className="text-left px-6 py-3">Property</th>
              <th scope="col" className="text-left px-3 py-3">Score</th>
              <th scope="col" className="text-right px-3 py-3 hidden md:table-cell">10-Yr ROI</th>
              <th scope="col" className="text-right px-3 py-3 hidden md:table-cell">Cap Rate</th>
              <th scope="col" className="text-right px-3 py-3">Cash Flow</th>
              <th scope="col" className="text-right px-3 py-3 hidden xl:table-cell">Risk</th>
              <th scope="col" className="text-right px-6 py-3">Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((d) => {
              const Icon = typeIcon[d.type] ?? Building2;
              const dealId = getDealId(d);
              return (
                <tr id={`deal-${dealId}`} key={dealId} tabIndex={-1} className="border-b border-border last:border-0 hover:bg-muted/30 transition scroll-mt-24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold">
                          {d.id ? (
                            <Link href={`/dashboard/saved-analyses/${d.id}`} className="hover:text-primary hover:underline">
                              {d.name}
                            </Link>
                          ) : (
                            d.name
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{d.address}</div>
                        {d.methodologyLabel ? (
                          <div className="text-[10px] text-muted-foreground">
                            {d.methodologyLabel}
                          </div>
                        ) : null}
                        {d.tags?.length ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {d.tags.map((tag) => (
                              <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-2">
                      <div className="relative h-9 w-9">
                        <svg aria-hidden className="h-9 w-9 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15" fill="none" stroke={ringTrack} strokeWidth="3" />
                          {d.score != null ? (
                            <circle cx="18" cy="18" r="15" fill="none" stroke={d.riskLevel ? scoreRingStrokeByRisk[d.riskLevel] ?? ringTrack : ringTrack} strokeWidth="3"
                              strokeDasharray={`${(d.score / 100) * 94.2} 94.2`} strokeLinecap="round" />
                          ) : null}
                        </svg>
                        <div aria-hidden className="absolute inset-0 grid place-items-center text-[11px] font-bold">{d.score ?? "-"}</div>
                        <span className="sr-only">
                          {d.score != null ? `Deal score ${d.score} out of 100` : "Not scored"}
                          {d.riskLevel ? `, ${d.riskLevel} risk` : ""}
                        </span>
                      </div>
                    </div>
                  </td>
                  {/* Extreme cumulative ROI (finding 5): framed band + raw on title. */}
                  <td
                    className="px-3 py-4 text-right tabular-nums hidden md:table-cell"
                    title={formatRoiHeadline(d.roi, { decimals: 1, compact: true }).title}
                  >
                    {formatRoiHeadline(d.roi, { decimals: 1, compact: true }).text}
                  </td>
                  <td className="px-3 py-4 text-right tabular-nums hidden md:table-cell">{d.capRate == null ? "-" : `${d.capRate}%`}</td>
                  <td className={`px-3 py-4 text-right tabular-nums font-semibold ${d.cashFlow == null ? "" : d.cashFlow >= 0 ? "text-success" : "text-destructive"}`}>
                    {d.cashFlow == null ? "-" : `${d.cashFlow >= 0 ? "+" : ""}$${Math.round(d.cashFlow).toLocaleString()}/mo`}
                  </td>
                  <td className="px-3 py-4 text-right hidden xl:table-cell">
                    {d.riskLevel ? (
                      <span className={`text-[11px] font-semibold px-2 py-1 rounded-md ring-1 ${riskStyle[d.riskLevel] ?? "bg-muted text-muted-foreground ring-border"}`}>{d.riskLevel}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
                      {/* Buy-box fit (PV-6) — the shared My Deals pill;
                          renders nothing for users without an active box. */}
                      <BuyBoxFitBadge fit={d.fit ?? undefined} />
                      {d.signal ? (
                        <span className="inline-flex items-center justify-end gap-1.5">
                          <span className={`text-[11px] font-semibold px-2 py-1 rounded-md ring-1 ${signalStyle[d.signal] ?? "bg-muted text-muted-foreground ring-border"}`}>{recommendationLabel(d.signal)}</span>
                          {d.breakdown && d.score != null ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button type="button" className="text-[11px] font-semibold text-primary underline-offset-2 hover:underline">Why?</button>
                              </PopoverTrigger>
                              <PopoverContent align="end" className="w-auto p-3">
                                <ScoreBreakdown breakdown={d.breakdown} score={d.score} propertyType={d.propertyType} />
                              </PopoverContent>
                            </Popover>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
