import type { LucideIcon } from "lucide-react";
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
  primary: { color: "var(--primary)" },
  success: { color: "var(--positive)" },
  gold: { color: "var(--highlight-text)" },
  violet: { color: "var(--primary)" },
};

export function StatCard({ label, value, change, changeLabel, icon, spark, tone = "primary", onClick, badge, changeSuffix = "%" }: Props) {
  const t = toneMap[tone];
  const positive = (change ?? 0) >= 0;
  // The icon stays in the interface for its callers; a stat reads by its
  // label and figure, not by a decorative tile (DESIGN.md "Avoid list").
  void icon;
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === "Enter" || event.key === " ") onClick();
      }}
      className={`group relative overflow-hidden rounded-lg border border-border bg-card p-5 shadow-sm transition-colors ${onClick ? "cursor-pointer hover:border-primary/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" : ""}`}
    >
      <div className="relative mb-3 flex items-start justify-between gap-3">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        {badge ? (
          <span className="shrink-0 rounded-sm border border-border px-1.5 py-0.5 font-figure text-xs text-muted-foreground">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="relative font-display font-figure text-3xl text-foreground">{value}</div>
      {/* Trend renders ONLY when there's an actual numeric change to show:
          a signed figure in the direction's colour, no arrow glyph. */}
      <div className="relative mt-2 flex items-center gap-2">
        {change != null && !Number.isNaN(change) ? (
          <span className={`font-figure text-xs font-semibold ${positive ? "text-positive" : "text-negative"}`}>
            {`${positive ? "+" : "\u2212"}${Math.abs(change)}${changeSuffix}`}
          </span>
        ) : null}
        <span className="text-xs text-muted-foreground">{changeLabel}</span>
      </div>
      {/* Sparkline — only renders when at least 2 real data points exist.
          Previously fell back to hardcoded "fake" series, which is a
          credibility killer on a financial product (charts that mean
          nothing). Empty array → no chart, cleaner card. */}
      {spark.length >= 2 ? (
        <div className="relative -mx-1 -mb-1 mt-3 h-12">
          <StatCardSparkline spark={spark} color={t.color} gradientId={`sp-${label}`} />
        </div>
      ) : null}
    </div>
  );
}
