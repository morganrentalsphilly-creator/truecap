"use client";

/**
 * Owned-equity growth chart (WOW-3) — the screenshot-worthy artifact: a
 * stacked area of WHERE the owner's equity came from, month by month since
 * their earliest close:
 *
 *   down payment (what they put in) + principal paid (what the tenant paid
 *   down) + appreciation (what the market added)
 *
 * Portfolio-summed — a later purchase joins the curve as a visible step-up.
 * Pure presentation: the series is computed server-side by
 * lib/owned-equity-series (same amortization/appreciation math as every
 * other equity readout). Loaded via dynamic import (ssr:false + skeleton)
 * from DashboardHome, mirroring PortfolioChart, so recharts stays lazy.
 *
 * The exit-scenarios panel already has a forward PROJECTION line chart —
 * this is the differentiated piece: the realized since-close decomposition.
 */

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import type { OwnedEquitySeriesPoint } from "@/lib/owned-equity-series";

// recharts sets SVG presentation attributes (no CSS var() resolution), so
// chart colors are concrete literals — same convention as PortfolioChart.
// Dashboard is always light. Down payment is the static base (neutral);
// the two GROWTH bands carry the brand tones.
const COLORS = {
  grid: "oklch(0.92 0.012 255)",
  axis: "oklch(0.52 0.03 256)",
  downPayment: "oklch(0.70 0.02 256)",
  principalPaid: "oklch(0.54 0.18 240)",
  appreciationGain: "oklch(0.60 0.15 155)",
  tooltipBg: "oklch(1 0 0)",
  tooltipBorder: "oklch(0.92 0.012 255)",
};

const SERIES = [
  { key: "downPayment", label: "Down payment", color: COLORS.downPayment },
  { key: "principalPaid", label: "Principal paid", color: COLORS.principalPaid },
  { key: "appreciationGain", label: "Appreciation", color: COLORS.appreciationGain },
] as const;

function fmtCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtCompactCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/** "2025-07-01" → "Jul '25". Month markers are UTC-pinned to the 1st. */
function fmtMonth(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const year = d.toLocaleDateString("en-US", { year: "2-digit", timeZone: "UTC" });
  return `${month} '${year}`;
}

// No fallback series: a financial product must never render an invented
// chart (same contract as PortfolioChart). Callers only mount this with
// real computed points.
export function OwnedEquityChart({ data = [] }: { data?: OwnedEquitySeriesPoint[] }) {
  const first = data[0];
  const last = data[data.length - 1];
  const chartSummary =
    first && last
      ? `Owned equity grew from ${fmtCurrency(first.equity)} at close to ${fmtCurrency(last.equity)} today — ${fmtCurrency(last.downPayment)} down payment, ${fmtCurrency(last.principalPaid)} principal paid, ${fmtCurrency(last.appreciationGain)} appreciation.`
      : "No owned-equity history yet.";

  return (
    <div className="rounded-2xl bg-card border border-border p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-semibold">Equity since close</h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
              <TrendingUp className="h-3 w-3" /> Owned
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Where your equity came from, month by month — estimated from each deal&apos;s own assumptions
          </p>
        </div>
        {last ? (
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Equity today
            </div>
            <div className="text-lg font-extrabold tabular-nums text-foreground">
              {fmtCurrency(last.equity)}
            </div>
          </div>
        ) : null}
      </div>

      <div className="h-[280px] sm:-ml-2" role="img" aria-label={chartSummary}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 6" stroke={COLORS.grid} vertical={false} />
            <XAxis
              dataKey="month"
              stroke={COLORS.axis}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={fmtMonth}
              minTickGap={24}
            />
            <YAxis
              stroke={COLORS.axis}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => fmtCompactCurrency(v)}
              width={64}
            />
            <Tooltip
              contentStyle={{
                background: COLORS.tooltipBg,
                border: `1px solid ${COLORS.tooltipBorder}`,
                borderRadius: 12,
                boxShadow: "var(--shadow-lg)",
                fontSize: 12,
                color: "var(--foreground)",
              }}
              formatter={(v: number, name: string) => [fmtCurrency(v), name]}
              labelFormatter={(label: string, payload) => {
                const point = payload?.[0]?.payload as OwnedEquitySeriesPoint | undefined;
                return point
                  ? `${fmtMonth(label)} · total equity ${fmtCurrency(point.equity)}`
                  : fmtMonth(label);
              }}
            />
            {SERIES.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stackId="equity"
                stroke={s.color}
                fill={s.color}
                fillOpacity={0.55}
                strokeWidth={1.5}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
        {SERIES.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
