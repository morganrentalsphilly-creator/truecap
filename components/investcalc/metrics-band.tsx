"use client";

/**
 * Metrics band — the lens-curated primary MetricCard row with the
 * IRR / equity-multiple / total-return summary FOLDED IN as band members,
 * plus the investor-lens control in the band header.
 *
 * EXTRACTED (Phase 2 of the calculator redesign) from
 * analysis-dashboard.tsx with minimal adaptation:
 *   - MetricCard + the per-metric benchmark label/color helpers moved
 *     here verbatim (the tile value/sub/color logic is unchanged).
 *   - The standalone "10-year returns" mini-strip IIFE was deleted from
 *     the dashboard; its three readouts render here as band members.
 *   - DealStrategyToggle (and its mobile "Change lens" disclosure from
 *     the density pass) moved here from the Deal Score card, so the lens
 *     sits beside the numbers it re-curates.
 *   - NEW: tapping a metric jumps to the analysis section that explains
 *     it, wired through the dashboard's existing setActiveTab machinery
 *     (tab ids unchanged).
 *
 * Purely presentational: all state (lens strategy, what-if, active tab)
 * stays in analysis-dashboard.tsx.
 */

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { GlossaryTip } from "@/components/investcalc/glossary-tip";
import type { GLOSSARY } from "@/lib/glossary";
import { DataConfidenceBadge } from "@/components/investcalc/data-confidence-badge";
import type { DataConfidence } from "@/lib/data-confidence";
import type { AnalysisResult } from "@/lib/calc-analysis";
import type { ReturnSummary } from "@/lib/returns";
import { formatRoiHeadline, isExtremeAnnualizedRoi } from "@/lib/extreme-value-format";
import type { DealStrategy } from "@/lib/deal-score";
import {
  getCapRateBenchmark,
  formatCapRateBenchmarkSubline,
} from "@/lib/market-benchmarks";
import type { AnalysisDashboardTab } from "./analysis-dashboard";
import { APPRECIATION_PLAY_MIN_ANNUAL_RETURN_PCT } from "@/lib/deal-score";

/**
 * Inline market-context labels surfaced under each metric tile.
 *
 * Phase 2: market-aware benchmarks via lib/market-benchmarks. When
 * the address parses to a known metro or state, we surface the
 * local median - "Above the 7.5% Philadelphia median" - which is
 * strictly more useful than a national band because a 7% cap rate
 * is excellent in California (4-5% typical) and mediocre in
 * Detroit (9-10% typical).
 *
 * Falls back to national bands when the address doesn't parse (free
 * form input, non-US address, no state code detectable).
 */
function capRateBenchmarkLabel(capRatePct: number, address?: string | null): string {
  const benchmark = getCapRateBenchmark(address);
  if (benchmark && benchmark.scope !== "national") {
    return formatCapRateBenchmarkSubline(capRatePct, benchmark);
  }
  // National fallback bands - keep the same thresholds the scoring
  // engine uses so the metric subline and the score subline agree.
  if (capRatePct > 8) return "Above 8% - top quartile (U.S.)";
  if (capRatePct > 5) return "5–8% - fair for market (U.S.)";
  return "Below 5% - returns rely on price growth (U.S.)";
}

/**
 * Cap-rate card COLOR - driven by the SAME benchmark the subline uses, so the
 * color and the "Above/Near/Below the X% median" label can never disagree.
 * Green only when the cap rate beats the local median (or the national
 * top-quartile when the address doesn't parse); neutral when near or below;
 * red only when the cap rate is negative. Replaces the old `>= 5 ? green` rule
 * that lit up green on a 5.4% cap sitting BELOW a 7.5% local median.
 */
function capRateBenchmarkColor(capRatePct: number, address?: string | null): string | undefined {
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
  // Bands mirror the Deal Score's displayed CoC tiers (>7 strong, 5–7 healthy,
  // 3–5 modest, <3 weak) so the tile sub-label never contradicts the score's
  // "Why this score" breakdown for the same deal.
  if (cocPct > 7) return "Above 7% - strong";
  if (cocPct > 5) return "5–7% - healthy";
  if (cocPct > 3) return "3–5% - modest";
  if (cocPct >= 0) return "Below 3% - weak";
  return "Negative - losing money";
}

function cashFlowBenchmarkLabel(monthlyCashFlow: number): string {
  // Bands aligned with the Deal Score's own cash-flow tiers so the sub-label
  // never contradicts the score (the old flat "$1,000/mo target" deflated
  // perfectly good $300-500/mo deals).
  if (monthlyCashFlow >= 500) return "Strong (≥$500/mo)";
  if (monthlyCashFlow >= 200) return "Solid ($200–500/mo)";
  if (monthlyCashFlow > 0) return "Modest ($1–$200/mo)";
  if (monthlyCashFlow > -100) return "~Break-even";
  return "Losing money monthly";
}

/**
 * Sub-label for the Monthly Cash Flow card. When year-1 cash flow is
 * negative but the depreciation + interest shield flips it positive
 * after-tax, lead with the after-tax figure right on the card - the big
 * red pre-tax number alone misreads as "this deal loses money" when, for
 * a tax-paying owner, it doesn't. Otherwise fall back to the plain
 * benchmark band.
 *
 * Exported: the answer hero card reuses this exact label as the
 * benchmark sublabel under the Deal Score, so the two can never disagree.
 */
export function cashFlowSubLabel(r: AnalysisResult): string {
  if (r.netCashFlow < 0 && r.afterTaxCF >= 0) {
    return `≈ +$${Math.round(r.afterTaxCF).toLocaleString()}/mo after tax`;
  }
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
        onSelect && "transition-colors hover:border-primary/40 focus-within:border-primary/40"
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
        <span className={cn("font-mono text-xl font-bold tabular-nums tracking-tight sm:text-2xl", color ?? "text-foreground")}>
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

const METRIC_ORDER = ["cashFlow", "coc", "capRate", "dscr", "return", "afterTax", "annualCf", "taxSavings"];
const PRIMARY_METRICS: Record<DealStrategy, string[]> = {
  "cash-flow": ["cashFlow", "coc", "dscr"],
  balanced: ["cashFlow", "capRate", "dscr"],
  appreciation: ["return", "capRate", "afterTax"],
};

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

export function getSecondaryMetricKeys(strategy: DealStrategy): string[] {
  const primary = PRIMARY_METRICS[strategy];
  return METRIC_ORDER.filter((k) => !primary.includes(k));
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
  isLoading,
  address,
  propertyType,
  annualizedReturnPct,
  onMetricSelect,
}: {
  displayResult: AnalysisResult | null;
  result: AnalysisResult | null;
  isLoading: boolean;
  address?: string | null;
  propertyType: "single-family" | "multi-family" | "owner-occupant";
  annualizedReturnPct: number | null;
  onMetricSelect?: (tab: AnalysisDashboardTab) => void;
}): Record<string, ReactNode> {
  const jump = (key: string) =>
    onMetricSelect ? () => onMetricSelect(METRIC_JUMP_TARGETS[key] ?? "cash-flow") : undefined;
  return {
    cashFlow: (
      <MetricCard
        key="cashFlow"
        label="Monthly Cash Flow"
        glossaryTerm="cashFlow"
        value={displayResult ? (displayResult.netCashFlow >= 0 ? `+${fmt(displayResult.netCashFlow)}` : `-${fmt(displayResult.netCashFlow)}`) : "—"}
        sub={displayResult ? cashFlowSubLabel(displayResult) : undefined}
        color={displayResult ? (displayResult.netCashFlow >= 0 ? "text-[var(--metric-positive)]" : "text-[var(--metric-negative)]") : undefined}
        isLoading={isLoading}
        onSelect={jump("cashFlow")}
      />
    ),
    coc: (
      <MetricCard
        key="coc"
        label="CoC Return"
        glossaryTerm="coc"
        value={displayResult ? `${displayResult.cocReturn >= 0 ? "+" : ""}${displayResult.cocReturn.toFixed(1)}%` : "—"}
        sub={displayResult ? cocBenchmarkLabel(displayResult.cocReturn) : undefined}
        color={displayResult ? (displayResult.cocReturn >= 0 ? "text-[var(--metric-positive)]" : "text-[var(--metric-negative)]") : undefined}
        isLoading={isLoading}
        onSelect={jump("coc")}
      />
    ),
    capRate: (
      <MetricCard
        key="capRate"
        label="Cap Rate"
        glossaryTerm="capRate"
        // No "+" prefix: cap rate is a ratio, not a signed delta — "+7.2%"
        // reads like a change vs baseline to a first-timer. Cash flow and
        // CoC keep their signs (they're genuinely signed returns); a
        // negative cap rate still shows its "-" via toFixed.
        value={displayResult ? `${displayResult.capRate.toFixed(1)}%` : "—"}
        sub={displayResult ? capRateBenchmarkLabel(displayResult.capRate, address) : undefined}
        color={displayResult ? capRateBenchmarkColor(displayResult.capRate, address) : undefined}
        isLoading={isLoading}
        onSelect={jump("capRate")}
      />
    ),
    dscr: (
      <MetricCard
        key="dscr"
        label="DSCR"
        glossaryTerm="dscr"
        value={displayResult ? (displayResult.monthlyPayment <= 0 ? "—" : displayResult.dscr.toFixed(2)) : "—"}
        sub={
          displayResult
            ? displayResult.monthlyPayment <= 0
              ? "Cash purchase"
              : displayResult.dscr >= 1.25
                ? "Bankable (≥1.25)"
                : displayResult.dscr >= 1.0
                  ? "Tight (≥1.0)"
                  : propertyType === "owner-occupant"
                    ? "Below 1.0 — normal for a house-hack"
                    : "Underwater"
            : undefined
        }
        color={
          displayResult
            ? displayResult.monthlyPayment <= 0
              ? undefined
              : displayResult.dscr >= 1.25
                ? "text-[var(--metric-positive)]"
                : // A sub-1 DSCR is expected for an owner-occupied house-hack
                  // (rent intentionally doesn't cover full PITI), so don't
                  // paint it alarm-red there - keep it neutral.
                  propertyType === "owner-occupant" && displayResult.dscr < 1.0
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
        label="10-Yr Return"
        glossaryTerm="tenYearReturn"
        value={annualizedReturnPct != null ? `~${Math.round(annualizedReturnPct)}%/yr` : "—"}
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
        label="After-Tax CF"
        glossaryTerm="afterTaxCF"
        value={result ? `${result.afterTaxCF >= 0 ? "+" : "-"}${fmt(result.afterTaxCF)}` : "—"}
        sub="/mo"
        color={result ? (result.afterTaxCF >= 0 ? "text-[var(--metric-positive)]" : "text-[var(--metric-negative)]") : undefined}
        isLoading={isLoading}
        onSelect={jump("afterTax")}
      />
    ),
    annualCf: (
      <MetricCard
        key="annualCf"
        label="Annual CF"
        glossaryTerm="cashFlow"
        value={result ? `${result.annualCashFlow >= 0 ? "+" : "-"}${fmt(result.annualCashFlow)}` : "—"}
        sub="/yr"
        color={result ? (result.annualCashFlow >= 0 ? "text-[var(--metric-positive)]" : "text-[var(--metric-negative)]") : undefined}
        isLoading={isLoading}
        onSelect={jump("annualCf")}
      />
    ),
    taxSavings: (
      <MetricCard
        key="taxSavings"
        label="Tax Savings"
        glossaryTerm="taxSavings"
        // Signed net tax effect since the after-tax formula fix — a healthy
        // deal can OWE tax, so the sign must survive fmt()'s Math.abs and
        // the color can't claim "primary-good" for a negative.
        value={result ? `${result.taxSavingsMonthly < 0 ? "-" : ""}${fmt(result.taxSavingsMonthly)}` : "—"}
        sub="/mo"
        color={result && result.taxSavingsMonthly < 0 ? "text-[var(--metric-negative)]" : "text-primary"}
        isLoading={isLoading}
        onSelect={jump("taxSavings")}
      />
    ),
  };
}

const DEAL_STRATEGIES: { value: DealStrategy; label: string; hint: string }[] = [
  { value: "cash-flow", label: "Cash flow", hint: "Prioritizes monthly income, cash-on-cash, and debt coverage." },
  { value: "balanced", label: "Balanced", hint: "Weights all return sources evenly (default)." },
  { value: "appreciation", label: "Appreciation", hint: "Prioritizes long-term total return and yield." },
];

/** Compact segmented control that reorders which metrics lead with the
 *  investor's focus. The Deal Score itself is lens-free (canonical Balanced) on
 *  every surface, so picking a lens never changes the score, verdict, or risk —
 *  only which 3 metric tiles surface first. */
function DealStrategyToggle({
  strategy,
  onChange,
}: {
  strategy: DealStrategy;
  onChange: (next: DealStrategy) => void;
}) {
  // A11Y (ARIA radiogroup keyboard pattern): the three lens buttons were each
  // a tab stop with no arrow-key handling, so keyboard users had to Tab
  // through all of them and Space/Enter to pick. A proper radiogroup is ONE
  // tab stop (roving tabindex: only the checked radio is tabbable) with
  // Arrow/Home/End moving focus AND selecting. Refs let us move focus to the
  // newly selected radio.
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(
    0,
    DEAL_STRATEGIES.findIndex((s) => s.value === strategy)
  );
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next = selectedIndex;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = (selectedIndex + 1) % DEAL_STRATEGIES.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = (selectedIndex - 1 + DEAL_STRATEGIES.length) % DEAL_STRATEGIES.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = DEAL_STRATEGIES.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    onChange(DEAL_STRATEGIES[next]!.value);
    btnRefs.current[next]?.focus();
  };
  return (
    <div className="mb-3">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Show me first
      </p>
      <div
        role="radiogroup"
        aria-label="Show me first - reorders which metrics lead"
        className="grid grid-cols-3 gap-0.5 rounded-lg bg-muted/60 p-0.5"
        onKeyDown={handleKeyDown}
      >
        {DEAL_STRATEGIES.map((s, i) => {
          const active = strategy === s.value;
          return (
            <button
              key={s.value}
              ref={(el) => {
                btnRefs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              // Roving tabindex: only the selected radio is in the tab order.
              tabIndex={i === selectedIndex ? 0 : -1}
              title={s.hint}
              onClick={() => onChange(s.value)}
              className={cn(
                "rounded-md px-1 py-1 text-[10px] font-semibold leading-tight transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-[10px] leading-tight text-muted-foreground">
        Reorders the metrics you see first.
      </p>
    </div>
  );
}

/** 10-Year Returns — IRR, equity multiple, and total return, computed by
 *  the same exit engine that already feeds the Deal Score. Previously a
 *  standalone mini-strip below the metric row; now folded into the band
 *  as regular members (the strip's values/formatting are unchanged). */
function buildReturnMemberTiles(
  s: ReturnSummary | null,
  onMetricSelect?: (tab: AnalysisDashboardTab) => void
): Array<{ key: string; node: ReactNode }> {
  if (!s || (s.irrPct == null && s.equityMultiple == null && s.roiPct == null)) return [];
  const jump = onMetricSelect ? () => onMetricSelect("exit-scenarios") : undefined;
  return [
    {
      key: "irr",
      node: (
        <MetricCard
          label={`${s.years}-yr IRR`}
          glossaryTerm="irr"
          value={s.irrPct == null ? "—" : `${s.irrPct.toFixed(1)}%`}
          sub="Annualized return over the hold"
          isLoading={false}
          onSelect={jump}
        />
      ),
    },
    {
      key: "equityMultiple",
      node: (
        <MetricCard
          label="Equity multiple"
          glossaryTerm="equityMultiple"
          value={s.equityMultiple == null ? "—" : `${s.equityMultiple.toFixed(2)}×`}
          sub="Cash returned ÷ cash invested"
          isLoading={false}
          onSelect={jump}
        />
      ),
    },
    {
      key: "totalReturn",
      node: (() => {
        // Extreme cumulative ROI (finding 5): framed band in the tile, raw
        // figure demoted to the sub line. Sane values byte-identical.
        const roiHeadline = formatRoiHeadline(s.roiPct, { decimals: 0, signed: true, compact: true });
        return (
          <MetricCard
            label="Total return"
            value={
              s.roiPct == null
                ? "—"
                : roiHeadline.extreme
                  ? roiHeadline.text
                  : `${s.roiPct >= 0 ? "+" : ""}${Math.round(s.roiPct)}%`
            }
            sub={
              roiHeadline.extreme
                ? `${roiHeadline.raw} cumulative — verify assumptions`
                : `Cumulative over ${s.years} years`
            }
            isLoading={false}
            onSelect={jump}
          />
        );
      })(),
    },
  ];
}

export function MetricsBand({
  tiles,
  strategy,
  onStrategyChange,
  dataConfidence,
  dealPropertyType,
  returnSummary,
  onMetricSelect,
}: {
  /** Tile record built by buildMetricTiles in the dashboard (single build,
   *  shared with the "Show all metrics" secondary fold). */
  tiles: Record<string, ReactNode>;
  strategy: DealStrategy;
  onStrategyChange: (next: DealStrategy) => void;
  dataConfidence: DataConfidence | null;
  /** The analyzed deal's property type, so the confidence hint can suppress
   *  advice that cannot work for multi-unit deals (no HUD rent auto-fill). */
  dealPropertyType?: string | null;
  /** Exit-engine return summary; null hides the folded-in return members. */
  returnSummary: ReturnSummary | null;
  onMetricSelect?: (tab: AnalysisDashboardTab) => void;
}) {
  const primaryMetricKeys = PRIMARY_METRICS[strategy];
  const returnTiles = buildReturnMemberTiles(returnSummary, onMetricSelect);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Overview
        </span>
        <span className="h-px flex-1 bg-border" />
        {dataConfidence ? <DataConfidenceBadge confidence={dataConfidence} propertyType={dealPropertyType} /> : null}
      </div>

      {/* Investor lens — moved from the Deal Score card into the band header
          so the lens sits beside the numbers it re-curates. Presentation is
          unchanged from the density pass: always visible on md+, collapsed
          behind the "Change lens" disclosure below md so a first-timer isn't
          asked to pick a lens before seeing the answer. The default
          (Balanced) lens still applies either way, and the summary names the
          active lens so nothing is hidden. */}
      <div className="hidden px-1 md:block">
        <DealStrategyToggle strategy={strategy} onChange={onStrategyChange} />
      </div>
      <details className="group/lens px-1 md:hidden">
        <summary className="flex min-h-8 cursor-pointer list-none items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground">
          <ChevronRight
            aria-hidden
            className="size-3 shrink-0 transition-transform group-open/lens:rotate-90"
          />
          Change what leads
          <span className="font-normal">
            · {DEAL_STRATEGIES.find((s) => s.value === strategy)?.label ?? "Balanced"}
          </span>
        </summary>
        <div className="mt-1.5">
          <DealStrategyToggle strategy={strategy} onChange={onStrategyChange} />
        </div>
      </details>

      {/* Lens-curated primary metrics + the folded-in return members.
          2-col below sm with the lens's #1 metric spanning the row: at
          375px three-up tiles were ~107px wide and "MONTHLY CASH FLOW"
          wrapped to three lines next to a cramped figure. The last return
          member also spans the row below sm so the grid never ends on a
          ragged half-row. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        {primaryMetricKeys.map((k, i) => (
          <div key={k} className={cn("min-w-0 [&>*]:h-full", i === 0 && "col-span-2 sm:col-span-1")}>
            {tiles[k]}
          </div>
        ))}
        {returnTiles.map((t, i) => (
          <div
            key={t.key}
            className={cn(
              "min-w-0 [&>*]:h-full",
              i === returnTiles.length - 1 && "col-span-2 sm:col-span-1"
            )}
          >
            {t.node}
          </div>
        ))}
      </div>
    </div>
  );
}
