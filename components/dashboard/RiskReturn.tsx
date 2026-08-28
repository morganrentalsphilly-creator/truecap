"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  ReferenceLine,
} from "recharts";
import { NO_DEBT_SERVICE_DSCR_LABEL } from "@/lib/financial-presentation";

/**
 * One point per saved deal, with BOTH candidate return metrics carried so
 * the user can toggle the X axis without a server round-trip. The Y axis is
 * always model DSCR — one comparable debt-coverage measure, not a complete
 * measure of investment risk. Cash purchases have no
 * debt service (DSCR is N/A, not 0/"underwater"), so `dscr` is null for them
 * and they're surfaced in the footnote instead of being plotted on a DSCR
 * axis they don't belong on.
 *
 * This replaces the previous chart, which mixed units on BOTH axes — ROI%
 * OR annual cash flow $ on X, and DSCR OR riskScore OR a mapped risk level
 * on Y — so two points were rarely measured on the same scale.
 */
export type RiskReturnDeal = {
  dealId?: string;
  name: string;
  type?: string;
  coc: number | null;
  roi: number | null;
  dscr: number | null;
  isCashPurchase?: boolean;
  size: number;
  score?: number;
  cashFlow?: number;
  cashNeeded?: number;
};

type ReturnMetricId = "coc" | "roi";

const RETURN_METRICS: { id: ReturnMetricId; label: string; axis: string }[] = [
  { id: "coc", label: "CoC %", axis: "Cash-on-cash %" },
  { id: "roi", label: "10-yr ROI %", axis: "10-yr ROI %" },
];

/** Display reference per metric — draws the vertical comparison divider.
 *  These are fixed chart references, not user-adopted targets or advice.
 *  100% cumulative 10-yr ROI is approximately a 7% compound annual return. */
const RETURN_THRESHOLD: Record<ReturnMetricId, number> = { coc: 8, roi: 100 };
/** Lender DSCR bar — the horizontal quadrant divider (matches the verdict copy). */
const DSCR_LENDER_BAR = 1.25;

// Concrete colors per OS theme — recharts sets SVG presentation attributes,
// which don't resolve CSS var(), so we pick literals based on the theme.
const CHART_COLORS = {
  light: { grid: "oklch(0.92 0.012 255)", axis: "oklch(0.52 0.03 256)", point: "oklch(0.54 0.18 240)" },
  dark: { grid: "oklch(0.34 0.02 262)", axis: "oklch(0.72 0.02 256)", point: "oklch(0.62 0.18 240)" },
};

type PlottedPoint = {
  name: string;
  type?: string;
  ret: number;
  dscr: number;
  size: number;
  score?: number;
  cashFlow?: number;
  cashNeeded?: number;
};

function ChartTooltip({
  active,
  payload,
  metricLabel,
}: {
  active?: boolean;
  payload?: Array<{ payload?: PlottedPoint }>;
  metricLabel: string;
}) {
  if (!active || !payload?.length || !payload[0]?.payload) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <div>
        <span className="font-semibold text-muted-foreground">Property:</span>{" "}
        <span className="font-semibold text-foreground">{p.name || "-"}</span>
      </div>
      {p.type ? (
        <div className="mt-1">
          <span className="font-semibold text-muted-foreground">Type:</span>{" "}
          <span className="text-foreground">{p.type}</span>
        </div>
      ) : null}
      <div className="mt-1">
        <span className="font-semibold text-muted-foreground">{metricLabel}:</span>{" "}
        <span className="text-foreground">{p.ret.toLocaleString("en-US", { maximumFractionDigits: 1 })}%</span>
      </div>
      <div className="mt-1">
        <span className="font-semibold text-muted-foreground">DSCR:</span>{" "}
        <span className="text-foreground">{p.dscr.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
      </div>
      {p.cashFlow != null ? (
        <div className="mt-1">
          <span className="font-semibold text-muted-foreground">Cash flow:</span>{" "}
          <span className="text-foreground">
            {p.cashFlow < 0 ? "-" : "+"}${Math.abs(Math.round(p.cashFlow)).toLocaleString("en-US")}/mo
          </span>
        </div>
      ) : null}
      {p.cashNeeded != null ? (
        <div className="mt-1">
          <span className="font-semibold text-muted-foreground">Cash to close:</span>{" "}
          <span className="text-foreground">${Math.round(p.cashNeeded).toLocaleString("en-US")}</span>
        </div>
      ) : null}
      {p.score != null ? (
        <div className="mt-1">
          <span className="font-semibold text-muted-foreground">Screening Index:</span>{" "}
          <span className="text-foreground">{Math.round(p.score)}/100</span>
        </div>
      ) : null}
    </div>
  );
}

export function RiskReturn({
  deals = [],
  showLongTermRoi = true,
}: {
  deals?: RiskReturnDeal[];
  showLongTermRoi?: boolean;
}) {
  const [metric, setMetric] = useState<ReturnMetricId>("coc");
  const effectiveMetric: ReturnMetricId = showLongTermRoi ? metric : "coc";
  const availableMetrics = showLongTermRoi
    ? RETURN_METRICS
    : RETURN_METRICS.filter((candidate) => candidate.id === "coc");
  const active =
    RETURN_METRICS.find((candidate) => candidate.id === effectiveMetric) ??
    RETURN_METRICS[0];
  // Dashboard is always light — chart colors are fixed to the light palette.
  const { grid: GRID, axis: AXIS, point: POINT } = CHART_COLORS.light;

  const { points, excludedCount, cashCount, total } = useMemo(() => {
    const totalDeals = deals.length;
    const cash = deals.filter((d) => d.isCashPurchase).length;
    const plotted: PlottedPoint[] = deals
      .map((d): PlottedPoint | null => {
        const ret = effectiveMetric === "coc" ? d.coc : d.roi;
        // A point only plots when it has BOTH the active return metric AND a
        // DSCR — otherwise its position on one axis would be fabricated.
        if (ret == null || d.dscr == null) return null;
        return { name: d.name, type: d.type, ret, dscr: d.dscr, size: d.size, score: d.score, cashFlow: d.cashFlow, cashNeeded: d.cashNeeded };
      })
      .filter((p): p is PlottedPoint => p !== null);
    return { points: plotted, excludedCount: totalDeals - plotted.length, cashCount: cash, total: totalDeals };
  }, [deals, effectiveMetric]);

  // sr-only summary so the scatter isn't an opaque image to screen readers.
  const summary =
    points.length > 0
      ? `Modeled return versus model DSCR: ${points.length} deals plotted by ${active.axis} against model DSCR. ` +
        points
          .slice(0, 8)
          .map((p) => `${p.name}, ${p.ret.toFixed(1)} percent at DSCR ${p.dscr.toFixed(2)}`)
          .join("; ") +
        (points.length > 8 ? `, and ${points.length - 8} more.` : ".")
      : "No deals have both the selected return metric and a DSCR to plot.";

  return (
    <div className="rounded-2xl bg-card border border-border p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display text-lg font-semibold">Return vs model DSCR</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Each point uses saved assumptions. Right means a higher selected modeled return; up means a higher model DSCR. Neither direction establishes safety or recommends a deal. Dashed lines are fixed comparison references, not your adopted targets.
          </p>
        </div>
        {availableMetrics.length > 1 ? (
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted" role="group" aria-label="Return metric">
            {availableMetrics.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={effectiveMetric === m.id}
                onClick={() => setMetric(m.id)}
                className={`min-h-11 px-3 py-2 text-xs font-semibold rounded-md transition ${
                  effectiveMetric === m.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {points.length > 0 ? (
        <>
          {/* Live region so toggling the return metric re-announces the chart
              summary (the role=img aria-label alone doesn't re-announce). */}
          <span className="sr-only" aria-live="polite">{summary}</span>
          <div className="relative h-[260px] sm:-ml-2" role="img" aria-label={summary}>
            {/* Factual quadrant orientation only — no safety or investment verdict.
                pointer-events-none so they never block the chart tooltip. */}
            <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
              <span className="absolute right-3 top-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                Above both references
              </span>
              <span className="absolute bottom-9 left-10 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                Below both references
              </span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 14, left: 0 }}>
                <CartesianGrid strokeDasharray="3 6" stroke={GRID} />
                <XAxis
                  type="number"
                  dataKey="ret"
                  name={active.axis}
                  stroke={AXIS}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                  label={{ value: `${active.axis} →`, position: "insideBottom", offset: -6, fontSize: 11, fill: AXIS }}
                />
                <YAxis
                  type="number"
                  dataKey="dscr"
                  name="DSCR"
                  stroke={AXIS}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: "Model DSCR ↑", angle: -90, position: "insideLeft", fontSize: 11, fill: AXIS }}
                />
                <ZAxis type="number" dataKey="size" range={[80, 400]} />
                {/* Break-even model DSCR (faint), a common lender reference
                    (labeled, horizontal divider), and the fixed return display
                    reference (vertical divider). Neither is a user target. */}
                <ReferenceLine y={1} stroke={GRID} strokeDasharray="3 3" />
                <ReferenceLine
                  y={DSCR_LENDER_BAR}
                  stroke={AXIS}
                  strokeDasharray="5 4"
                  label={{ value: `DSCR ${DSCR_LENDER_BAR}`, position: "insideTopLeft", fontSize: 10, fill: AXIS }}
                />
                <ReferenceLine
                  x={RETURN_THRESHOLD[effectiveMetric]}
                  stroke={AXIS}
                  strokeDasharray="5 4"
                  label={{ value: effectiveMetric === "coc" ? "8% CoC" : "100% ROI", position: "top", fontSize: 10, fill: AXIS }}
                />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} content={<ChartTooltip metricLabel={active.axis} />} />
                <Scatter data={points} fill={POINT} fillOpacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          {excludedCount > 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Showing {points.length} of {total} deals that have both {active.label} and a DSCR.
              {cashCount > 0
                ? ` Cash-purchase DSCR: ${NO_DEBT_SERVICE_DSCR_LABEL} (${cashCount} ${cashCount === 1 ? "deal" : "deals"}).`
                : ""}
            </p>
          ) : null}
        </>
      ) : (
        <div className="flex h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
          <p className="text-sm font-medium text-foreground">Not enough data to plot</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            Deals need both a {active.label} value and a DSCR to appear here.
            {cashCount > 0
              ? ` Cash-purchase DSCR: ${NO_DEBT_SERVICE_DSCR_LABEL} (${cashCount} ${cashCount === 1 ? "deal" : "deals"}).`
              : " Run a 10-yr projection on a deal to populate its ROI."}
          </p>
        </div>
      )}
    </div>
  );
}
