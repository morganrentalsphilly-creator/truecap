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
 * Blueprint (2026-10): the outflow segments are graphite steps (the
 * foreground at decreasing opacity, in waterfall order), and only the net
 * carries a colour, green by the Sign rule. The legend is a ruled list, not
 * a two-column grid of swatches.
 *
 * Mobile: the legend always shows the dollar + percent for each segment,
 * which is the actual signal - the bar visualization is the cherry on top.
 */
import type { AnalysisResult } from "@/lib/calc-analysis";

type Segment = {
  key: string;
  label: string;
  value: number; // monthly dollars
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

/**
 * The graphite step for the n-th outflow segment: the foreground ink at
 * 92% for the first, stepping down 7 points per segment and never below
 * 29% (ten segments), so adjacent segments stay distinguishable on the
 * white card and the whole bar reads as one drawing.
 */
function graphiteStep(index: number): number {
  return Math.max(0.29, 0.92 - index * 0.07);
}

export function CashFlowWaterfall({ result }: { result: AnalysisResult }) {
  const gross = result.monthlyRentalIncome;
  if (!Number.isFinite(gross) || gross <= 0) return null;

  // Build segments in waterfall order. Vacancy first (it's a
  // pre-collection loss, not an out-of-pocket cost), then OpEx in
  // priority order, then debt service. NCF is the residual.
  const segments: Segment[] = [
    { key: "vacancy", label: "Vacancy", value: Math.max(0, result.vacancy) },
    { key: "tax", label: "Property tax", value: Math.max(0, result.propertyTax) },
    { key: "insurance", label: "Insurance", value: Math.max(0, result.insurance) },
    { key: "mgmt", label: "Management", value: Math.max(0, result.management) },
    { key: "maintenance", label: "Maintenance", value: Math.max(0, result.maintenance) },
    { key: "capex", label: "CapEx reserve", value: Math.max(0, result.capex) },
    { key: "hoa", label: "HOA", value: Math.max(0, result.hoa) },
    { key: "utilities", label: "Utilities", value: Math.max(0, result.utilities) },
    { key: "debt", label: "Mortgage (P&I)", value: Math.max(0, result.loanPrincipalAndInterest) },
    { key: "pmi", label: "PMI", value: Math.max(0, result.pmiMonthly) },
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
  };
  const allSegments = ncfPositive ? [...segments, ncfSegment] : [...segments]; // shortfall handled separately below

  // For the stacked bar to span gross when shortfall exists, scale
  // by the larger of gross or totalOutflow so the bar still adds up
  // visually.
  const scaleBase = ncfPositive ? gross : totalOutflow;

  return (
    <section
      aria-label="Cash flow waterfall"
      className="rounded-lg border border-border bg-card p-4 sm:p-5"
    >
      {/* Header - title left, the two headline numbers (Gross rent IN,
          Net cash flow OUT) prominently displayed on the right so the
          punchline conclusion is the FIRST thing the eye lands on, not
          buried at the bottom of the legend. */}
      <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Where the rent goes
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Monthly: every dollar in, every dollar out. Percentages are
            each cost&apos;s share of gross rent.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="text-left sm:text-right">
            <p className="text-xs font-medium text-muted-foreground">
              Gross rent
            </p>
            <p className="font-figure text-lg font-semibold text-foreground sm:text-xl">
              {fmtUsd(gross)}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p
              className={`text-xs font-medium ${
                ncfPositive ? "text-positive" : "text-negative"
              }`}
            >
              {ncfPositive ? "Net cash flow" : "Monthly shortfall"}
            </p>
            <p
              className={`font-figure text-xl font-semibold sm:text-2xl ${
                ncfPositive ? "text-positive" : "text-negative"
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
        className="mt-4 flex h-8 w-full overflow-hidden rounded-sm ring-1 ring-border"
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
        {allSegments.map((seg, index) => {
          const widthPct = (seg.value / scaleBase) * 100;
          if (widthPct < 0.5) return null; // tiny segments would render invisibly anyway
          const isNet = seg.key === "ncf";
          return (
            <div
              key={seg.key}
              title={`${seg.label}: ${fmtUsd(seg.value)}`}
              style={{
                width: `${widthPct}%`,
                backgroundColor: isNet
                  ? "var(--metric-positive)"
                  : "var(--foreground)",
                opacity: isNet ? 1 : graphiteStep(index),
              }}
              className="h-full"
            />
          );
        })}
      </div>

      {/* Legend - the per-segment readout, as rows on soft lines. NCF is
          not duplicated here because it's already the headline in the
          header (top-right). */}
      <ul className="mt-4 divide-y divide-rule-soft border-t border-border">
        {segments.map((seg, index) => (
          <li key={seg.key} className="flex items-center justify-between gap-3 py-1.5 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-foreground">
              <span
                aria-hidden
                className="inline-block size-2.5 shrink-0 rounded-sm"
                style={{
                  backgroundColor: "var(--foreground)",
                  opacity: graphiteStep(index),
                }}
              />
              <span className="truncate">{seg.label}</span>
            </span>
            <span className="shrink-0 font-figure text-muted-foreground">
              <span className="font-semibold text-foreground">{fmtUsd(seg.value)}</span>
              <span className="ml-1.5 text-2xs">({fmtPct(seg.value, gross)})</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
