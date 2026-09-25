import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";
import dynamic from "next/dynamic";

// Recharts lives in a lazily-loaded chunk (see stat-card-sparkline.tsx)
// so cards without sparklines — currently ALL dashboard call sites —
// never download the charting library.
const StatCardSparkline = dynamic(
  () => import("@/components/dashboard/stat-card-sparkline"),
  { ssr: false, loading: () => null }
);

interface Props {
  label: string;
  value: string;
  change: number | null | undefined;
  changeLabel: string;
  icon: LucideIcon;
  spark: { v: number }[];
  tone?: "primary" | "success" | "gold" | "violet";
  onClick?: () => void;
  badge?: string;
  changeSuffix?: string;
}

// `color` feeds the sparkline stroke; `tile` is the flat tinted icon tile
// (the analyzer's own tile vocabulary — no gradient, no coloured drop shadow).
const toneMap = {
  primary: { color: "oklch(0.54 0.18 240)", tile: "bg-primary/10 text-primary" },
  success: { color: "oklch(0.68 0.17 158)", tile: "bg-success/10 text-success" },
  gold: { color: "oklch(0.78 0.14 85)", tile: "bg-warning/15 text-warning-foreground" },
  violet: { color: "oklch(0.66 0.13 210)", tile: "bg-primary/10 text-primary" },
};

export function StatCard({ label, value, change, changeLabel, icon: Icon, spark, tone = "primary", onClick, badge, changeSuffix = "%" }: Props) {
  const t = toneMap[tone];
  const positive = (change ?? 0) >= 0;
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === "Enter" || event.key === " ") onClick();
      }}
      className={`group relative overflow-hidden rounded-2xl bg-card border border-border p-5 transition-colors ${onClick ? "cursor-pointer hover:border-primary/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" : ""}`}
    >
      <div className="relative flex items-start justify-between mb-4">
        <div>
          <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{label}</div>
          {badge ? (
            <span className="mt-1 inline-flex rounded-full bg-success/10 px-2 py-0.5 text-3xs font-bold text-success">
              {badge}
            </span>
          ) : null}
        </div>
        <div className={`h-9 w-9 rounded-xl grid place-items-center ${t.tile}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="relative font-mono text-3xl font-bold tabular-nums tracking-tight">{value}</div>
      {/* Trend pill renders ONLY when there's an actual numeric change to
          show. Previously we'd render "↗ -" for null changes, which read
          as a (broken) trend indicator. The green ↑ arrow visually
          implies "% change vs prior period" — only render it when the
          caller has a real number that justifies that semantic. */}
      <div className="relative flex items-center gap-2 mt-2">
        {change != null && !Number.isNaN(change) ? (
          <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded ${positive ? "text-success bg-success/10" : "text-destructive bg-destructive/10"}`}>
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {`${Math.abs(change)}${changeSuffix}`}
          </span>
        ) : null}
        <span className="text-xs text-muted-foreground">{changeLabel}</span>
      </div>
      {/* Sparkline — only renders when at least 2 real data points exist.
          Previously fell back to hardcoded "fake" series, which is a
          credibility killer on a financial product (charts that mean
          nothing). Empty array → no chart, cleaner card. */}
      {spark.length >= 2 ? (
        <div className="relative h-12 -mx-1 -mb-1 mt-3">
          <StatCardSparkline spark={spark} color={t.color} gradientId={`sp-${label}`} />
        </div>
      ) : null}
    </div>
  );
}
