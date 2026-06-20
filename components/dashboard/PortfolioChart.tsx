import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";

const metrics = [
  { id: "score", label: "Score" },
  { id: "cashFlow", label: "Monthly Cash Flow" },
  { id: "roi", label: "10-Yr ROI" },
] as const;

type DealComparisonPoint = {
  name: string;
  score: number | null;
  cashFlow: number | null;
  roi: number | null;
};

// recharts sets SVG presentation attributes (no CSS var() resolution), so
// chart colors are concrete literals chosen by the OS theme.
const CHART_COLORS = {
  light: {
    grid: "oklch(0.92 0.012 255)",
    axis: "oklch(0.52 0.03 256)",
    bar: "oklch(0.55 0.22 265)",
    cursor: "oklch(0.55 0.22 265 / 0.06)",
    tooltipBg: "oklch(1 0 0)",
    tooltipBorder: "oklch(0.92 0.012 255)",
  },
  dark: {
    grid: "oklch(0.34 0.02 262)",
    axis: "oklch(0.72 0.02 256)",
    bar: "oklch(0.65 0.22 265)",
    cursor: "oklch(0.65 0.22 265 / 0.14)",
    tooltipBg: "oklch(0.215 0.025 262)",
    tooltipBorder: "oklch(0.30 0.02 262)",
  },
};

// No hardcoded fallback series: a financial product must never render an
// invented chart. DashboardHome only mounts this with real deal data, and
// the empty default keeps that contract enforced if any future caller
// forgets to pass data (renders empty axes, never fabricated numbers).
export function PortfolioChart({ data = [] }: { data?: DealComparisonPoint[] }) {
  const [metric, setMetric] = useState<(typeof metrics)[number]["id"]>("score");
  // Dashboard is always light — chart colors are fixed to the light palette.
  const colors = CHART_COLORS.light;
  const activeMetric = metrics.find((item) => item.id === metric) ?? metrics[0];
  const metricLabel = activeMetric.label;

  // sr-only description so the bar chart conveys its data to screen readers
  // (the same numbers are also in the Deal Decision List table below).
  const chartSummary = data.length
    ? `${metricLabel} by deal: ` +
      data
        .map((d) => {
          const v = d[metric];
          if (v == null) return `${d.name}: no data`;
          return `${d.name}: ${
            metric === "cashFlow"
              ? `$${Math.round(v).toLocaleString()}`
              : metric === "roi"
                ? `${v}%`
                : v
          }`;
        })
        .join("; ")
    : "No deals to compare yet.";

  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-semibold">Deal Comparison</h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3" /> Decision View
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Compare saved deals by score, monthly cash flow, or 10-yr ROI</p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted" role="tablist" aria-label="Comparison metric">
          {metrics.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={metric === item.id}
              onClick={() => setMetric(item.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                metric === item.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[280px] -ml-2" role="img" aria-label={chartSummary}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4}>
            <CartesianGrid strokeDasharray="3 6" stroke={colors.grid} vertical={false} />
            <XAxis dataKey="name" stroke={colors.axis} fontSize={12} tickLine={false} axisLine={false} />
            <YAxis
              stroke={colors.axis}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => (metric === "cashFlow" ? `$${v}` : `${v}${metric === "roi" ? "%" : ""}`)}
            />
            <Tooltip
              cursor={{ fill: colors.cursor }}
              contentStyle={{
                background: colors.tooltipBg,
                border: `1px solid ${colors.tooltipBorder}`,
                borderRadius: 12,
                boxShadow: "var(--shadow-lg)",
                fontSize: 12,
                color: "var(--foreground)",
              }}
              formatter={(v: number) => (metric === "cashFlow" ? `$${Math.round(v).toLocaleString()}` : `${v}${metric === "roi" ? "%" : ""}`)}
              labelFormatter={(label) => `${label} · ${metricLabel}`}
            />
            <Bar dataKey={metric} name={metricLabel} fill={colors.bar} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-5 mt-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors.bar }} />
          <span className="text-muted-foreground">Selected metric: {metricLabel}</span>
        </div>
      </div>
    </div>
  );
}
