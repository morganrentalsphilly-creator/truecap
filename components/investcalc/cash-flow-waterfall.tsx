/**
 * Cash Flow Waterfall.
 *
 * Renders a horizontal stacked-bar visualization of where every dollar
 * of monthly rent goes - from gross rent through vacancy, operating
 * expenses, debt service, down to net cash flow (or shortfall).
 *
 * Why this exists: numbers in tiles don't *feel* like math. A
 * waterfall does. Even seasoned investors find it useful for spotting
 * which line item is eating their margin. The visualization also
 * works as a credibility signal - competitors don't show this.
 *
 * Pure presentation. Computed from AnalysisResult fields that already
 * exist; no new business logic. Self-hides when monthlyRentalIncome
 * is ≤ 0 so we never render a 0-width chart.
 *
 * Mobile: bar collapses to a vertical legend layout because a 12-row
 * horizontal stack at 320px is unreadable. The legend always shows
 * the dollar + percent for each segment, which is the actual signal
 * - the bar visualization is the cherry on top.
 */
import type { AnalysisResult } from "@/lib/calc-analysis";

type Segment = {
  key: string;
  label: string;
  value: number; // monthly dollars
  /** CSS color (uses brand-system vars). */
  color: string;
};

function fmtUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(num: number, denom: number): string {
  if (denom <= 0) return "—";
  const pct = (num / denom) * 100;
  return `${pct.toFixed(0)}%`;
}

export function CashFlowWaterfall({ result }: { result: AnalysisResult }) {
  const gross = result.monthlyRentalIncome;
  if (!Number.isFinite(gross) || gross <= 0) return null;

  // Build segments in waterfall order. Vacancy first (it's a
  // pre-collection loss, not an out-of-pocket cost), then OpEx in
  // priority order, then debt service. NCF is the residual.
  const segments: Segment[] = [
    { key: "vacancy",     label: "Vacancy",        value: Math.max(0, result.vacancy),     color: "rgb(148, 163, 184)" }, // slate-400
    { key: "tax",         label: "Property tax",   value: Math.max(0, result.propertyTax), color: "rgb(245, 158, 11)" }, // amber-500
    { key: "insurance",   label: "Insurance",      value: Math.max(0, result.insurance),   color: "rgb(59, 130, 246)" }, // blue-500 - moved off the warm tones so Insurance doesn't blend into the adjacent amber Property-tax segment in the bar + legend
    { key: "mgmt",        label: "Management",     value: Math.max(0, result.management),  color: "rgb(249, 115, 22)" }, // orange-500 (moved off purple to stay on-brand)
    { key: "maintenance", label: "Maintenance",    value: Math.max(0, result.maintenance), color: "rgb(13, 148, 136)" }, // teal-600 - spread away from the purple/pink neighbours so adjacent segments stay distinguishable
    { key: "capex",       label: "CapEx reserve",  value: Math.max(0, result.capex),       color: "rgb(236, 72, 153)" }, // pink-500
    { key: "hoa",         label: "HOA",            value: Math.max(0, result.hoa),         color: "rgb(132, 204, 22)" }, // lime-500 (moved off indigo to stay on-brand)
    { key: "utilities",   label: "Utilities",      value: Math.max(0, result.utilities),   color: "rgb(56, 189, 248)" }, // sky-400
    { key: "debt",        label: "Mortgage (P&I)", value: Math.max(0, result.loanPrincipalAndInterest), color: "rgb(220, 38, 38)" }, // red-600
    { key: "pmi",         label: "PMI",            value: Math.max(0, result.pmiMonthly),  color: "rgb(157, 23, 77)" }, // pink-800 — financing-adjacent, distinct from debt + capex
  ].filter((s) => s.value > 0);

  const totalOutflow = segments.reduce((sum, s) => sum + s.value, 0);
  const ncf = gross - totalOutflow;

  // Each segment's percent of GROSS - so percentages always add to
  // 100% (segments + NCF). Makes the chart legible at a glance.
  const ncfPositive = ncf >= 0;
  const ncfSegment: Segment = {
    key: "ncf",
    label: ncfPositive ? "Net cash flow" : "Shortfall",
    value: Math.abs(ncf),
    color: ncfPositive ? "rgb(22, 163, 74)" : "rgb(220, 38, 38)", // emerald-600 / red-600
  };
  const allSegments = ncfPositive ? [...segments, ncfSegment] : [...segments]; // shortfall handled separately below

  // For the stacked bar to span gross when shortfall exists, scale
  // by the larger of gross or totalOutflow so the bar still adds up
  // visually.
  const scaleBase = ncfPositive ? gross : totalOutflow;

  return (
    <section
      aria-label="Cash flow waterfall"
      className="rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      {/* Header - title left, the two headline numbers (Gross rent IN,
          Net cash flow OUT) prominently displayed on the right so the
          punchline conclusion is the FIRST thing the eye lands on, not
          buried at the bottom of the legend. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-foreground">
            Where the rent goes
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Monthly - every dollar in, every dollar out
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="text-left sm:text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Gross rent
            </p>
            <p className="text-lg font-extrabold tabular-nums text-foreground sm:text-xl">
              {fmtUsd(gross)}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p
              className={`text-[10px] font-bold uppercase tracking-widest ${
                ncfPositive ? "text-[var(--metric-positive,#16a34a)]" : "text-[var(--metric-negative,#dc2626)]"
              }`}
            >
              {ncfPositive ? "Net cash flow" : "Monthly shortfall"}
            </p>
            <p
              className={`text-xl font-extrabold tabular-nums sm:text-2xl ${
                ncfPositive ? "text-[var(--metric-positive,#16a34a)]" : "text-[var(--metric-negative,#dc2626)]"
              }`}
            >
              {ncfPositive ? "+" : "-"}
              {fmtUsd(Math.abs(ncf))}
            </p>
          </div>
        </div>
      </div>

      {/* Stacked bar (desktop + tablet). On the smallest viewports the
          bar still renders - 9 thin segments are still informative as
          a visual anchor - but the legend below is the real readout. */}
      <div
        className="mt-4 flex h-8 w-full overflow-hidden rounded-lg ring-1 ring-border"
        role="img"
        aria-label={[
          ncfPositive
            ? `Gross rent ${fmtUsd(gross)}.`
            : `Gross rent ${fmtUsd(gross)}, total outflow ${fmtUsd(totalOutflow)}.`,
          `Where it goes: ${allSegments.map((s) => `${s.label} ${fmtUsd(s.value)}`).join(", ")}.`,
          ncfPositive
            ? `Net cash flow +${fmtUsd(Math.abs(ncf))} per month.`
            : `Monthly shortfall ${fmtUsd(Math.abs(ncf))} per month.`,
        ].join(" ")}
      >
        {allSegments.map((seg) => {
          const widthPct = (seg.value / scaleBase) * 100;
          if (widthPct < 0.5) return null; // tiny segments would render invisibly anyway
          return (
            <div
              key={seg.key}
              title={`${seg.label}: ${fmtUsd(seg.value)}`}
              style={{ width: `${widthPct}%`, backgroundColor: seg.color }}
              className="h-full transition-[width]"
            />
          );
        })}
      </div>

      {/* Legend - the per-segment readout. NCF is no longer duplicated
          here because it's already the headline in the card header
          (top-right). Keeping the legend focused on the outflow lines
          makes the waterfall less noisy. */}
      <ul className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {segments.map((seg) => (
          <li key={seg.key} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-foreground/80">
              <span
                aria-hidden
                className="inline-block size-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: seg.color }}
              />
              <span className="truncate">{seg.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              <span className="font-semibold text-foreground">{fmtUsd(seg.value)}</span>
              <span className="ml-1.5 text-[11px]">({fmtPct(seg.value, gross)})</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
