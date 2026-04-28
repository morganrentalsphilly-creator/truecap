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
import { portfolioGrowth } from "@/lib/dashboard-data";
import { TrendingUp } from "lucide-react";

const metrics = [
  { id: "score", label: "Score" },
  { id: "cashFlow", label: "Monthly Cash Flow" },
  { id: "roi", label: "ROI" },
] as const;

type DealComparisonPoint = {
  name: string;
  score: number | null;
  cashFlow: number | null;
  roi: number | null;
};

const fallbackData = portfolioGrowth.map((point) => ({
  name: point.month,
  score: point.value,
  cashFlow: point.benchmark,
  roi: point.value,
}));

export function PortfolioChart({ data = fallbackData }: { data?: DealComparisonPoint[] }) {
  const [metric, setMetric] = useState<(typeof metrics)[number]["id"]>("score");
  const activeMetric = metrics.find((item) => item.id === metric) ?? metrics[0];
  const metricLabel = activeMetric.label;

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
          <p className="text-sm text-muted-foreground mt-0.5">Compare saved deals by score, monthly cash flow, or ROI</p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
          {metrics.map((item) => (
            <button
              key={item.id}
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

      <div className="h-[280px] -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4}>
            <CartesianGrid strokeDasharray="3 6" stroke="oklch(0.92 0.012 255)" vertical={false} />
            <XAxis dataKey="name" stroke="oklch(0.52 0.03 256)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis
              stroke="oklch(0.52 0.03 256)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => metric === "cashFlow" ? `$${v}` : `${v}${metric === "roi" ? "%" : ""}`}
            />
            <Tooltip
              cursor={{ fill: "oklch(0.55 0.22 265 / 0.06)" }}
              contentStyle={{
                background: "oklch(1 0 0)",
                border: "1px solid oklch(0.92 0.012 255)",
                borderRadius: 12,
                boxShadow: "var(--shadow-lg)",
                fontSize: 12,
              }}
              formatter={(v: number) => metric === "cashFlow" ? `$${v.toLocaleString()}` : `${v}${metric === "roi" ? "%" : ""}`}
              labelFormatter={(label) => `${label} · ${metricLabel}`}
            />
            <Bar dataKey={metric} name={metricLabel} fill="oklch(0.55 0.22 265)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-5 mt-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "oklch(0.55 0.22 265)" }} />
          <span className="text-muted-foreground">Selected metric: {metricLabel}</span>
        </div>
      </div>
    </div>
  );
}
