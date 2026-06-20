"use client";

import { useMemo, useState } from "react";
import { Building2, Home, KeyRound } from "lucide-react";
import { usePrefersDark } from "@/hooks/use-prefers-dark";

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
  tags?: string[];
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
] as const;

type SortMetric = (typeof sortOptions)[number]["id"];

function getDealId(deal: DashboardTopDeal) {
  return (deal.id ?? `${deal.name}-${deal.address}`).replace(/[^a-zA-Z0-9_-]/g, "-");
}

function getSortValue(deal: DashboardTopDeal, sortBy: SortMetric) {
  if (sortBy === "roi") return deal.roi;
  if (sortBy === "cashFlow") return deal.cashFlow;
  return deal.score;
}

export function TopDeals({ data }: { data: DashboardTopDeal[] }) {
  const [sortBy, setSortBy] = useState<SortMetric>("score");
  const prefersDark = usePrefersDark();
  // Score-ring track + no-risk arc color, themed (SVG strokes can't use var()).
  const ringTrack = prefersDark ? "oklch(0.34 0.02 262)" : "oklch(0.92 0.012 255)";
  const sortedData = useMemo(() => {
    return data
      .map((deal, index) => ({ deal, index }))
      .sort((a, b) => {
        const aValue = getSortValue(a.deal, sortBy) ?? Number.NEGATIVE_INFINITY;
        const bValue = getSortValue(b.deal, sortBy) ?? Number.NEGATIVE_INFINITY;
        if (aValue !== bValue) return bValue - aValue;
        return a.index - b.index;
      })
      .map(({ deal }) => deal);
  }, [data, sortBy]);

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      <div className="flex flex-col gap-4 p-4 pb-3 sm:flex-row sm:items-start sm:justify-between sm:p-6 sm:pb-4">
        <div>
          <h3 className="font-display text-lg font-semibold">Deal Decision List</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Sort saved deals by the metric that matters for the next purchase.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
            {sortOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setSortBy(option.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
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
        {sortedData.map((d) => {
          const Icon = typeIcon[d.type] ?? Building2;
          const dealId = getDealId(d);
          return (
            <article id={`deal-${dealId}`} key={dealId} className="scroll-mt-24 rounded-2xl border border-border bg-background p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-bold leading-tight text-foreground">{d.name}</h4>
                  <p className="mt-1 text-xs text-muted-foreground">{d.address}</p>
                </div>
                <div className="relative h-11 w-11 shrink-0">
                  <svg className="h-11 w-11 -rotate-90" viewBox="0 0 36 36">
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
                  <div className="absolute inset-0 grid place-items-center text-xs font-bold">{d.score ?? "-"}</div>
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
                  <p className="mt-1 text-sm font-extrabold tabular-nums text-foreground">{d.roi == null ? "-" : `${d.roi.toFixed(1)}%`}</p>
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
                  <span className={`text-[11px] font-semibold px-2 py-1 rounded-md ring-1 ${signalStyle[d.signal] ?? "bg-muted text-muted-foreground ring-border"}`}>{d.signal}</span>
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
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-y border-border bg-muted/40">
              <th className="text-left px-6 py-3">Property</th>
              <th className="text-left px-3 py-3">Score</th>
              <th className="text-right px-3 py-3 hidden md:table-cell">10-Yr ROI</th>
              <th className="text-right px-3 py-3 hidden md:table-cell">Cap Rate</th>
              <th className="text-right px-3 py-3">Cash Flow</th>
              <th className="text-right px-3 py-3 hidden xl:table-cell">Risk</th>
              <th className="text-right px-6 py-3">Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((d) => {
              const Icon = typeIcon[d.type] ?? Building2;
              const dealId = getDealId(d);
              return (
                <tr id={`deal-${dealId}`} key={dealId} className="border-b border-border last:border-0 hover:bg-muted/30 transition scroll-mt-24">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold">{d.name}</div>
                        <div className="text-xs text-muted-foreground">{d.address}</div>
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
                        <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15" fill="none" stroke={ringTrack} strokeWidth="3" />
                          {d.score != null ? (
                            <circle cx="18" cy="18" r="15" fill="none" stroke={d.riskLevel ? scoreRingStrokeByRisk[d.riskLevel] ?? ringTrack : ringTrack} strokeWidth="3"
                              strokeDasharray={`${(d.score / 100) * 94.2} 94.2`} strokeLinecap="round" />
                          ) : null}
                        </svg>
                        <div className="absolute inset-0 grid place-items-center text-[11px] font-bold">{d.score ?? "-"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-right tabular-nums hidden md:table-cell">{d.roi == null ? "-" : `${d.roi.toFixed(1)}%`}</td>
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
                    {d.signal ? (
                      <span className={`text-[11px] font-semibold px-2 py-1 rounded-md ring-1 ${signalStyle[d.signal] ?? "bg-muted text-muted-foreground ring-border"}`}>{d.signal}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
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
