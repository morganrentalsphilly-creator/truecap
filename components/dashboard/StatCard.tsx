import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from "recharts";

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

const toneMap = {
  primary: { color: "oklch(0.55 0.22 265)", grad: "var(--gradient-premium)" },
  success: { color: "oklch(0.68 0.17 158)", grad: "var(--gradient-success)" },
  gold: { color: "oklch(0.78 0.14 85)", grad: "var(--gradient-gold)" },
  violet: { color: "oklch(0.62 0.22 320)", grad: "linear-gradient(135deg, oklch(0.62 0.22 320), oklch(0.55 0.22 265))" },
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
      className={`group relative overflow-hidden rounded-2xl bg-card border border-border p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)] ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition" style={{ background: "var(--gradient-card-glow)" }} />
      <div className="relative flex items-start justify-between mb-4">
        <div>
          <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{label}</div>
          {badge ? (
            <span className="mt-1 inline-flex rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
              {badge}
            </span>
          ) : null}
        </div>
        <div className="h-9 w-9 rounded-xl grid place-items-center" style={{ background: t.grad, boxShadow: `0 8px 20px -8px ${t.color}` }}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
      <div className="relative font-display text-3xl font-bold tracking-tight">{value}</div>
      <div className="relative flex items-center gap-2 mt-2">
        <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded ${positive ? "text-success bg-success/10" : "text-destructive bg-destructive/10"}`}>
          {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {change == null || Number.isNaN(change) ? "-" : `${Math.abs(change)}${changeSuffix}`}
        </span>
        <span className="text-xs text-muted-foreground">{changeLabel}</span>
      </div>
      {/* Sparkline — only renders when at least 2 real data points exist.
          Previously fell back to hardcoded "fake" series, which is a
          credibility killer on a financial product (charts that mean
          nothing). Empty array → no chart, cleaner card. */}
      {spark.length >= 2 ? (
        <div className="relative h-12 -mx-1 -mb-1 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark}>
              <defs>
                <linearGradient id={`sp-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={t.color} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={t.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={t.color} strokeWidth={2} fill={`url(#sp-${label})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  );
}
