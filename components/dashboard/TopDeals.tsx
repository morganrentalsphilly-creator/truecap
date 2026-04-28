"use client";

import { useMemo, useState } from "react";
import { Building2, Home, Warehouse, ArrowUpRight } from "lucide-react";

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
  Commercial: Warehouse,
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

function getDealId(deal: DashboardTopDeal, index: number) {
  return deal.id ?? `${deal.name}-${index}`.replace(/[^a-zA-Z0-9_-]/g, "-");
}

export function TopDeals({ data }: { data: DashboardTopDeal[] }) {
  const [sortBy, setSortBy] = useState<(typeof sortOptions)[number]["id"]>("score");
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      if (sortBy === "roi") return (b.roi ?? -Infinity) - (a.roi ?? -Infinity);
      if (sortBy === "cashFlow") return (b.cashFlow ?? -Infinity) - (a.cashFlow ?? -Infinity);
      return (b.score ?? -Infinity) - (a.score ?? -Infinity);
    });
  }, [data, sortBy]);

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      <div className="flex items-start justify-between p-6 pb-4">
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
          <button className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            View all <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-y border-border bg-muted/40">
              <th className="text-left px-6 py-3">Property</th>
              <th className="text-left px-3 py-3">Score</th>
              <th className="text-right px-3 py-3 hidden md:table-cell">ROI</th>
              <th className="text-right px-3 py-3 hidden md:table-cell">Cap Rate</th>
              <th className="text-right px-3 py-3">Cash Flow</th>
              <th className="text-right px-3 py-3 hidden lg:table-cell">Risk</th>
              <th className="text-right px-6 py-3">Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((d, i) => {
              const Icon = typeIcon[d.type] ?? Building2;
              return (
                <tr id={`deal-${getDealId(d, i)}`} key={getDealId(d, i)} className="border-b border-border last:border-0 hover:bg-muted/30 transition scroll-mt-24">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-muted grid place-items-center">
                        <Icon className="h-4 w-4 text-muted-foreground" />
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
                          <circle cx="18" cy="18" r="15" fill="none" stroke="oklch(0.92 0.012 255)" strokeWidth="3" />
                          {d.score != null ? (
                            <circle cx="18" cy="18" r="15" fill="none" stroke={d.riskLevel ? scoreRingStrokeByRisk[d.riskLevel] ?? "oklch(0.92 0.012 255)" : "oklch(0.92 0.012 255)"} strokeWidth="3"
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
                    {d.cashFlow == null ? "-" : `${d.cashFlow >= 0 ? "+" : ""}$${d.cashFlow.toLocaleString()}/mo`}
                  </td>
                  <td className="px-3 py-4 text-right hidden lg:table-cell">
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
