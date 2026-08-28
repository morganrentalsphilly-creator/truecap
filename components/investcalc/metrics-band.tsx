"use client";

/**
 * Canonical first-year metric band.
 *
 * The decision summary already leads with total cash, NOI, cash flow, cap
 * rate, cash-on-cash, model DSCR, and the target-backed Offer Ceiling. This
 * secondary band therefore keeps one fixed first-year reading order instead
 * of allowing a remembered persona lens or long-term projection to displace
 * the current operating economics.
 */

import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { GlossaryTip } from "@/components/investcalc/glossary-tip";
import type { GLOSSARY } from "@/lib/glossary";
import { DataConfidenceBadge } from "@/components/investcalc/data-confidence-badge";
import type { DataConfidence } from "@/lib/data-confidence";
import type { AnalysisResult } from "@/lib/calc-analysis";
import { isExtremeAnnualizedRoi } from "@/lib/extreme-value-format";
import {
  getCapRateBenchmark,
  formatCapRateBenchmarkSubline,
} from "@/lib/market-benchmarks";
import type { AnalysisDashboardTab } from "./analysis-dashboard";
import { APPRECIATION_PLAY_MIN_ANNUAL_RETURN_PCT } from "@/lib/deal-score";
import { formatDscr } from "@/lib/financial-presentation";

/**
 * Inline market-context labels surfaced under each metric tile.
 *
 * Phase 2: market-aware benchmarks via lib/market-benchmarks. When
 * the address parses to a known metro or state, we surface the
 * local planning estimate, with its period/methodology caveat, rather than
 * presenting a hand-curated reference as an observed market median.
 * strictly more useful than a national band because a 7% cap rate
 * is excellent in California (4-5% typical) and mediocre in
 * Detroit (9-10% typical).
 *
 * Falls back to national bands when the address doesn't parse (free
 * form input, non-US address, no state code detectable).
 */
function capRateBenchmarkLabel(
  capRatePct: number,
  address?: string | null,
): string {
  const benchmark = getCapRateBenchmark(address);
  if (benchmark && benchmark.scope !== "national") {
    return formatCapRateBenchmarkSubline(capRatePct, benchmark);
  }
  // These are TrueCap planning estimates, not an observed single-source index.
  const caveat = "TrueCap estimate · 2025 reference; see methodology";
  if (capRatePct > 8) return `Above 8% (U.S.) · ${caveat}`;
  if (capRatePct > 5) return `Between 5% and 8% (U.S.) · ${caveat}`;
  return `Below 5% (U.S.) · ${caveat}`;
}

/**
 * Cap-rate card COLOR - driven by the SAME benchmark the subline uses, so the
 * color and the "Above/Near/Below the X% median" label can never disagree.
 * Green only when the cap rate beats the local median (or the national
 * top-quartile when the address doesn't parse); neutral when near or below;
 * red only when the cap rate is negative. Replaces the old `>= 5 ? green` rule
 * that lit up green on a 5.4% cap sitting BELOW a 7.5% local median.
 */
function capRateBenchmarkColor(
  capRatePct: number,
  address?: string | null,
): string | undefined {
  if (capRatePct < 0) return "text-[var(--metric-negative)]";
  const benchmark = getCapRateBenchmark(address);
  if (benchmark && benchmark.scope !== "national") {
    // Mirror formatCapRateBenchmarkSubline's +/-0.5pt band exactly.
    return capRatePct - benchmark.median >= 0.5
      ? "text-[var(--metric-positive)]"
      : "text-foreground";
  }
  // National fallback - green only for the top-quartile (>8%) band, matching
  // the national subline ("Above 8% - top quartile").
  return capRatePct > 8 ? "text-[var(--metric-positive)]" : "text-foreground";
}

function cocBenchmarkLabel(cocPct: number): string {
  if (cocPct > 7) return "Above the 7% reference";
  if (cocPct > 5) return "Between 5% and 7%";
  if (cocPct > 3) return "Between 3% and 5%";
  if (cocPct >= 0) return "Between 0% and 3%";
  return "Negative first-year cash return";
}

function cashFlowBenchmarkLabel(monthlyCashFlow: number): string {
  if (monthlyCashFlow > 0) return "Positive before tax and after reserve";
  if (monthlyCashFlow > -100) return "Near break-even before tax";
  return "Negative before tax";
}

/** Pre-tax cash-flow context shared by the metric band and answer hero. */
export function cashFlowSubLabel(
  r: Pick<AnalysisResult, "netCashFlow">,
): string {
  return cashFlowBenchmarkLabel(r.netCashFlow);
}

function fmt(n: number) {
  return `$${Math.abs(n).toLocaleString()}`;
}

function MetricCard({
  label,
  value,
  sub,
  color,
  isLoading,
  glossaryTerm,
  onSelect,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  isLoading: boolean;
  glossaryTerm?: keyof typeof GLOSSARY;
  /** When set, the whole card is tappable and jumps to the analysis
   *  section that explains this metric (GlossaryTip taps inside stop
   *  propagation, so the "?" tooltip still works independently). */
  onSelect?: () => void;
}) {
  const labelEl = (
    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">
      {label}
    </span>
  );
  // Jump affordance is a stretched SIBLING button, not role="button" on the
  // tile itself (A11Y-NESTED-BUTTONS-METRIC-TILE): GlossaryTip's trigger is
  // a focusable role="button" span, and nesting it inside a button-role tile
  // violated the ARIA button pattern (screen readers announced two stacked
  // buttons per tile). The absolutely-positioned button covers the tile for
  // pointer + keyboard users; the GlossaryTip wrapper sits above it (z-10)
  // so the "?" tooltip keeps working independently.
  return (
    <div
      className={cn(
        "relative flex flex-col gap-1 rounded-2xl border border-border bg-card p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5",
        onSelect &&
          "transition-colors hover:border-primary/40 focus-within:border-primary/40",
      )}
    >
      {onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          aria-label={`${label} — jump to the section that explains this number`}
          title="Jump to the section that explains this number"
          className="absolute inset-0 cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      ) : null}
      {glossaryTerm ? (
        <span className="relative z-10 self-start">
          <GlossaryTip term={glossaryTerm} className="!no-underline">
            {labelEl}
          </GlossaryTip>
        </span>
      ) : (
        labelEl
      )}
      {isLoading ? (
        <Skeleton className="h-7 sm:h-8 w-20 sm:w-24 mt-1" />
      ) : (
        <span
          className={cn(
            "font-mono text-xl font-bold tabular-nums tracking-tight sm:text-2xl",
            color ?? "text-foreground",
          )}
        >
          {value}
        </span>
      )}
      {sub && !isLoading && (
        <span className="text-[10px] leading-tight text-muted-foreground sm:text-[11px]">
          {sub}
        </span>
      )}
    </div>
  );
}

const METRIC_ORDER = [
  "cashFlow",
  "coc",
  "capRate",
  "dscr",
  "return",
  "afterTax",
  "annualCf",
  "taxSavings",
];
const CORE_METRIC_KEYS = ["cashFlow", "capRate", "dscr"] as const;
const TAX_METRIC_KEYS = new Set(["afterTax", "taxSavings"]);

/** Which analysis section explains each metric — used by the tap-to-jump
 *  wiring. Ids ARE the existing AnalysisDashboardTab ids (unchanged). */
const METRIC_JUMP_TARGETS: Record<string, AnalysisDashboardTab> = {
  cashFlow: "cash-flow",
  coc: "cash-flow",
  capRate: "cash-flow",
  dscr: "cash-flow",
  annualCf: "cash-flow",
  return: "projections",
  afterTax: "tax-strategy",
  taxSavings: "tax-strategy",
};

export function getSecondaryMetricKeys({
  includeTaxMetrics = false,
}: {
  includeTaxMetrics?: boolean;
} = {}): string[] {
  return METRIC_ORDER.filter(
    (key) =>
      !CORE_METRIC_KEYS.includes(key as (typeof CORE_METRIC_KEYS)[number]) &&
      (includeTaxMetrics || !TAX_METRIC_KEYS.has(key)),
  );
}

/**
 * Lens-curated metric tiles. Each investor lens leads with the 3 metrics that
 * investor actually optimizes for; the rest collapse behind "Show all
 * metrics" in the dashboard. Same data underneath - just what surfaces first.
 * Tiles preserve the exact per-metric value/sub/color logic from the
 * pre-extraction dashboard; this only changes WHERE they're built.
 *
 * The cash-flow / CoC / cap-rate / DSCR / 10-yr-return tiles read
 * from `displayResult` (= whatIfState.result when sliders are
 * non-zero, else base result) so they react live to the
 * stress-test sliders; the after-tax / annual-CF / tax-savings
 * tiles read base `result` so Pro panels don't thrash on drags.
 */
export function buildMetricTiles({
  displayResult,
  result,
  isScenarioActive = false,
  isLoading,
  address,
  propertyType,
  annualizedReturnPct,
  onMetricSelect,
}: {
  displayResult: AnalysisResult | null;
  result: AnalysisResult | null;
  /** Labels every tile by its source while a temporary what-if is active. */
  isScenarioActive?: boolean;
  isLoading: boolean;
  address?: string | null;
  propertyType: "single-family" | "multi-family" | "owner-occupant";
  annualizedReturnPct: number | null;
  onMetricSelect?: (tab: AnalysisDashboardTab) => void;
}): Record<string, ReactNode> {
  const jump = (key: string) =>
    onMetricSelect
      ? () => onMetricSelect(METRIC_JUMP_TARGETS[key] ?? "cash-flow")
      : undefined;
  const sourcedLabel = (label: string, source: "scenario" | "base") =>
    isScenarioActive
      ? `${source === "scenario" ? "Scenario" : "Base"} ${label}`
      : label;
  return {
    cashFlow: (
      <MetricCard
        key="cashFlow"
        label={sourcedLabel(
          (displayResult?.balloonPayment ?? 0) > 0
            ? "Recurring Monthly Cash Flow (excl. balloon)"
            : "Monthly Cash Flow",
          "scenario",
        )}
        glossaryTerm="cashFlow"
        value={
          displayResult
            ? displayResult.netCashFlow >= 0
              ? `+${fmt(displayResult.netCashFlow)}`
              : `-${fmt(displayResult.netCashFlow)}`
            : "—"
        }
        sub={displayResult ? cashFlowSubLabel(displayResult) : undefined}
        // Matches the caption's bands (lib/strategy-lens-outcome cashFlowMetric):
        // a -$40/mo deal is "≈break-even", not alarm-red.
        color={
          displayResult
            ? displayResult.netCashFlow > 0
              ? "text-[var(--metric-positive)]"
              : displayResult.netCashFlow > -100
                ? undefined
                : "text-[var(--metric-negative)]"
            : undefined
        }
        isLoading={isLoading}
        onSelect={jump("cashFlow")}
      />
    ),
    coc: (
      <MetricCard
        key="coc"
        label={sourcedLabel("CoC Return", "scenario")}
        glossaryTerm="coc"
        value={
          displayResult
            ? displayResult.totalCashRequired > 0
              ? `${displayResult.cocReturn >= 0 ? "+" : ""}${displayResult.cocReturn.toFixed(1)}%`
              : "N/A"
            : "—"
        }
        sub={
          displayResult
            ? displayResult.totalCashRequired > 0
              ? cocBenchmarkLabel(displayResult.cocReturn)
              : "No modeled cash invested"
            : undefined
        }
        // Threshold-driven: green only above the shared 5% reference. A bare
        // non-negative return stays neutral.
        color={
          displayResult && displayResult.totalCashRequired > 0
            ? displayResult.cocReturn > 5
              ? "text-[var(--metric-positive)]"
              : displayResult.cocReturn >= 0
                ? undefined
                : "text-[var(--metric-negative)]"
            : undefined
        }
        isLoading={isLoading}
        onSelect={jump("coc")}
      />
    ),
    capRate: (
      <MetricCard
        key="capRate"
        label={sourcedLabel("Cap Rate", "scenario")}
        glossaryTerm="capRate"
        // No "+" prefix: cap rate is a ratio, not a signed delta — "+7.2%"
        // reads like a change vs baseline to a first-timer. Cash flow and
        // CoC keep their signs (they're genuinely signed returns); a
        // negative cap rate still shows its "-" via toFixed.
        value={displayResult ? `${displayResult.capRate.toFixed(1)}%` : "—"}
        sub={
          displayResult
            ? capRateBenchmarkLabel(displayResult.capRate, address)
            : undefined
        }
        color={
          displayResult
            ? capRateBenchmarkColor(displayResult.capRate, address)
            : undefined
        }
        isLoading={isLoading}
        onSelect={jump("capRate")}
      />
    ),
    dscr: (
      <MetricCard
        key="dscr"
        label={sourcedLabel("Model DSCR", "scenario")}
        glossaryTerm="dscr"
        value={
          displayResult
            ? formatDscr(displayResult.dscr, displayResult.monthlyPayment > 0)
            : "—"
        }
        sub={
          displayResult
            ? displayResult.monthlyPayment <= 0
              ? undefined
              : displayResult.dscr >= 1.25
                ? "At or above the 1.25 reference"
                : displayResult.dscr >= 1.0
                  ? "Between 1.00 and 1.25"
                  : propertyType === "owner-occupant"
                    ? "Below 1.00; full debt service exceeds modeled NOI"
                    : "Below 1.00"
            : undefined
        }
        color={
          displayResult
            ? displayResult.monthlyPayment <= 0
              ? undefined
              : displayResult.dscr >= 1.25
                ? "text-[var(--metric-positive)]"
                : // Keep the 1.00-1.25 reference band neutral. Only modeled
                  // NOI below full debt service receives the negative tone.
                  displayResult.dscr >= 1.0
                  ? undefined
                  : // A sub-1 DSCR is expected for an owner-occupied house-hack
                    // (rent intentionally doesn't cover full PITI), so don't
                    // paint it alarm-red there - keep it neutral.
                    propertyType === "owner-occupant"
                    ? undefined
                    : "text-[var(--metric-negative)]"
            : undefined
        }
        isLoading={isLoading}
        onSelect={jump("dscr")}
      />
    ),
    return: (
      <MetricCard
        key="return"
        label={sourcedLabel("10-Yr Return", "base")}
        glossaryTerm="tenYearReturn"
        value={
          annualizedReturnPct != null
            ? `~${Math.round(annualizedReturnPct)}%/yr`
            : "—"
        }
        // Extreme annualized return (finding 5): the per-year figure stays
        // (it's legible), but the sub leads with the caution and the green
        // celebration color drops — same band as the cumulative framing
        // (>15%/yr ≈ >300% cumulative).
        sub={
          isExtremeAnnualizedRoi(annualizedReturnPct)
            ? "Unusually high — verify assumptions"
            : "Total return incl. appreciation"
        }
        // THRESHOLD-DRIVEN, not sign-driven. This used to go green on any
        // value >= 0, so ~1%/yr rendered as a win while the lens card beside
        // it called the same number "limited". The bar is the one already
        // published in lib/strategy-lens-outcome (>11 strong / 8-11 solid /
        // 5-8 modest / <5 limited) and in deal-score's
        // APPRECIATION_PLAY_MIN_ANNUAL_RETURN_PCT: green only at "solid" or
        // better. Everything below is neutral — never green by default.
        color={
          annualizedReturnPct != null &&
          annualizedReturnPct >= APPRECIATION_PLAY_MIN_ANNUAL_RETURN_PCT &&
          !isExtremeAnnualizedRoi(annualizedReturnPct)
            ? "text-[var(--metric-positive)]"
            : undefined
        }
        isLoading={isLoading}
        onSelect={jump("return")}
      />
    ),
    afterTax: (
      <MetricCard
        key="afterTax"
        label={sourcedLabel("After-Tax CF", "base")}
        glossaryTerm="afterTaxCF"
        value={
          result
            ? `${result.afterTaxCF >= 0 ? "+" : "-"}${fmt(result.afterTaxCF)}`
            : "—"
        }
        sub="/mo"
        // No threshold caption on this tile, so no verdict colour — only the
        // genuinely-bad case is marked.
        color={
          result && result.afterTaxCF < 0
            ? "text-[var(--metric-negative)]"
            : undefined
        }
        isLoading={isLoading}
        onSelect={jump("afterTax")}
      />
    ),
    annualCf: (
      <MetricCard
        key="annualCf"
        label={sourcedLabel("Annual CF", "base")}
        glossaryTerm="cashFlow"
        value={
          result
            ? `${result.annualCashFlow >= 0 ? "+" : "-"}${fmt(result.annualCashFlow)}`
            : "—"
        }
        sub="/yr"
        // Same as after-tax: annualising a monthly figure adds no threshold.
        color={
          result && result.annualCashFlow < 0
            ? "text-[var(--metric-negative)]"
            : undefined
        }
        isLoading={isLoading}
        onSelect={jump("annualCf")}
      />
    ),
    taxSavings: (
      <MetricCard
        key="taxSavings"
        label={sourcedLabel("Illustrative Tax Effect", "base")}
        glossaryTerm="taxSavings"
        // Signed net tax effect since the after-tax formula fix — a positive
        // operating result can still owe tax, so the sign must survive fmt()'s Math.abs and
        // the color can't claim "primary-good" for a negative.
        value={
          result
            ? `${result.taxSavingsMonthly < 0 ? "-" : ""}${fmt(result.taxSavingsMonthly)}`
            : "—"
        }
        sub={
          result
            ? result.taxSavingsMonthly > 0
              ? "/mo estimated benefit"
              : result.taxSavingsMonthly < 0
                ? "/mo estimated liability"
                : "/mo no modeled effect"
            : undefined
        }
        // Was an unconditional brand tint — $0 of tax impact rendered as a
        // highlighted "good" value. Neutral unless genuinely negative.
        color={
          result && result.taxSavingsMonthly < 0
            ? "text-[var(--metric-negative)]"
            : undefined
        }
        isLoading={isLoading}
        onSelect={jump("taxSavings")}
      />
    ),
  };
}

export function MetricsBand({
  tiles,
  dataConfidence,
  dealPropertyType,
}: {
  /** Tile record built by buildMetricTiles in the dashboard (single build,
   *  shared with the "Show all metrics" secondary fold). */
  tiles: Record<string, ReactNode>;
  dataConfidence: DataConfidence | null;
  /** The analyzed deal's property type, so the confidence hint can suppress
   *  advice that cannot work for multi-unit deals (no HUD rent auto-fill). */
  dealPropertyType?: string | null;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Overview
        </span>
        <span className="h-px flex-1 bg-border" />
        {dataConfidence ? (
          <DataConfidenceBadge
            confidence={dataConfidence}
            propertyType={dealPropertyType}
          />
        ) : null}
      </div>

      {/* Fixed first-year metrics. The leading cash-flow tile spans both
          columns on narrow phones so its label and value remain readable. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        {CORE_METRIC_KEYS.map((k, i) => (
          <div
            key={k}
            className={cn(
              "min-w-0 [&>*]:h-full",
              i === 0 && "col-span-2 sm:col-span-1",
            )}
          >
            {tiles[k]}
          </div>
        ))}
      </div>
    </div>
  );
}
