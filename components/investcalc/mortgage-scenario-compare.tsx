"use client";

/**
 * Mortgage Scenario Compare.
 *
 * Click-to-open side-by-side comparison of alternative financing
 * structures for the SAME property. Helps the user answer the question
 * every serious investor asks before they offer: "Would 25% down or a
 * 15-year mortgage actually be better here?"
 *
 * Surface design: collapsed by default so it does not crowd the
 * dashboard. The trigger is a single Pro-gated button. When the
 * user is on a free plan, the trigger renders a one-line teaser
 * pointing at /pricing instead of opening.
 *
 * Math: we don't re-run the full analysis engine — we only need to
 * recompute the four numbers that change with financing (loan amount,
 * monthly P&I, cash flow, DSCR, CoC). Everything else (rent, opEx,
 * cap rate, tax math) is invariant in the property's financing.
 *
 * Strictly additive to the codebase — does not touch calc-analysis,
 * the schema, or saved-deal payloads.
 */
import { useState } from "react";
import Link from "next/link";
import { Lock, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnalysisResult } from "@/lib/calc-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";

function calcMonthlyPI(principal: number, annualRatePct: number, years: number): number {
  if (!Number.isFinite(principal) || principal <= 0) return 0;
  if (!Number.isFinite(years) || years <= 0) return 0;
  if (!Number.isFinite(annualRatePct) || annualRatePct < 0) return 0;
  if (annualRatePct === 0) return principal / (years * 12);
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  return (principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
}

type ScenarioInput = {
  key: string;
  label: string;
  /** Down payment percent (0-100). Null → reuse current. */
  downPct: number | null;
  /** Loan term in years. Null → reuse current. */
  termYears: number | null;
  /** Interest rate (annual %). Null → reuse current. Used for DSCR-loan
   *  scenarios where the rate is typically ~1.0–1.5pp higher. */
  rate: number | null;
};

type ScenarioOutput = {
  key: string;
  label: string;
  downPct: number;
  termYears: number;
  rate: number;
  loanAmount: number;
  monthlyPI: number;
  monthlyCashFlow: number;
  dscr: number | null;
  totalCashRequired: number;
  cocAnnualPct: number | null;
  isBaseline: boolean;
};

function fmtUsd(n: number, withDecimals = false): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: withDecimals ? 2 : 0,
  }).format(n);
}

function fmtMonthlyCashFlow(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  return `${sign}${fmtUsd(Math.abs(n))}`;
}

function buildScenarios(values: InvestmentFormValues, result: AnalysisResult): ScenarioOutput[] {
  const purchasePrice = Number(values.purchasePrice ?? 0);
  const baseDownPct = Number(values.downPaymentPct ?? 0);
  const baseRate = Number(values.interestRate ?? 0);
  const baseTerm = Number(values.loanTermYears ?? 30);
  // rent_minus_opEx invariant — independent of financing
  const rentMinusOpEx = result.netCashFlow + result.loanPrincipalAndInterest;
  const closingCosts = result.closingCosts; // doesn't change with down%

  const variants: ScenarioInput[] = [
    { key: "current",   label: "Current",          downPct: baseDownPct, termYears: baseTerm, rate: baseRate },
    // Build the alternatives off the current as the baseline
    { key: "more-down", label: `${Math.min(100, baseDownPct + 5)}% down`,
      downPct: Math.min(100, baseDownPct + 5), termYears: baseTerm,  rate: baseRate },
    { key: "shorter",   label: "15-year term",
      downPct: baseDownPct, termYears: 15, rate: baseRate },
    { key: "dscr-loan", label: "DSCR loan +1.5%",
      downPct: baseDownPct, termYears: baseTerm, rate: Math.min(30, baseRate + 1.5) },
  ];

  return variants.map((s): ScenarioOutput => {
    const downPct = s.downPct ?? baseDownPct;
    const termYears = s.termYears ?? baseTerm;
    const rate = s.rate ?? baseRate;
    const loanAmount = Math.max(0, purchasePrice * (1 - downPct / 100));
    const monthlyPI = calcMonthlyPI(loanAmount, rate, termYears);
    const monthlyCashFlow = rentMinusOpEx - monthlyPI;
    // DSCR = NOI / annual debt service; NOI ~= (rent - opEx_ex_debt) * 12
    const dscr =
      monthlyPI > 0 ? (rentMinusOpEx * 12) / (monthlyPI * 12) : null;
    const downPayment = purchasePrice * (downPct / 100);
    const totalCashRequired = downPayment + closingCosts;
    const cocAnnualPct =
      totalCashRequired > 0 ? (monthlyCashFlow * 12) / totalCashRequired * 100 : null;
    return {
      key: s.key,
      label: s.label,
      downPct,
      termYears,
      rate,
      loanAmount,
      monthlyPI,
      monthlyCashFlow,
      dscr,
      totalCashRequired,
      cocAnnualPct,
      isBaseline: s.key === "current",
    };
  });
}

export function MortgageScenarioCompare({
  result,
  values,
  isPro,
}: {
  result: AnalysisResult;
  values: InvestmentFormValues | null;
  isPro: boolean;
}) {
  const [open, setOpen] = useState(false);

  // If this is a cash purchase there's no mortgage to compare. Self-hide.
  if (!values || result.loanAmount <= 0 || result.monthlyPayment <= 0) return null;

  // Free-tier teaser — single line that points at /pricing instead of
  // expanding the comparison panel. Honest about being a Pro feature.
  if (!isPro) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="size-4 shrink-0 text-muted-foreground" />
            <span>
              <strong className="text-foreground">Compare financing scenarios</strong> — 25% down,
              15-year term, DSCR loans, side-by-side. Pro feature.
            </span>
          </div>
          <Link
            href="/pricing"
            className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground hover:opacity-90"
          >
            See Pro
          </Link>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="flex justify-center sm:justify-start">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="gap-2"
        >
          <SlidersHorizontal className="size-4" />
          Compare financing scenarios
        </Button>
      </div>
    );
  }

  const scenarios = buildScenarios(values, result);

  return (
    <section
      aria-label="Mortgage scenario comparison"
      className="rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-foreground">
            Compare financing
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Same property, four different ways to finance it
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
          aria-label="Close comparison"
          className="size-8 p-0"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Desktop: 4-column table. Mobile: stacked cards (horizontal
          scroll feels cramped on this much data). */}
      <div className="hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Scenario
                </th>
                {scenarios.map((s) => (
                  <th
                    key={s.key}
                    className={`py-2 px-3 text-[11px] font-bold ${
                      s.isBaseline ? "text-foreground" : "text-foreground/80"
                    }`}
                  >
                    {s.label}
                    {s.isBaseline ? (
                      <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary">
                        Now
                      </span>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <ScenarioRow label="Down payment" cells={scenarios.map((s) => `${s.downPct.toFixed(0)}%`)} />
              <ScenarioRow label="Term" cells={scenarios.map((s) => `${s.termYears} yr`)} />
              <ScenarioRow label="Rate" cells={scenarios.map((s) => `${s.rate.toFixed(2)}%`)} />
              <ScenarioRow label="Loan amount" cells={scenarios.map((s) => fmtUsd(s.loanAmount))} />
              <ScenarioRow
                label="Monthly P&I"
                cells={scenarios.map((s) => fmtUsd(Math.round(s.monthlyPI)))}
                emphasize
              />
              <ScenarioRow
                label="Monthly cash flow"
                cells={scenarios.map((s) =>
                  fmtMonthlyCashFlow(Math.round(s.monthlyCashFlow))
                )}
                tone={(i) =>
                  scenarios[i]!.monthlyCashFlow >= 0 ? "positive" : "negative"
                }
                emphasize
              />
              <ScenarioRow
                label="DSCR"
                cells={scenarios.map((s) => (s.dscr != null ? s.dscr.toFixed(2) : "—"))}
              />
              <ScenarioRow
                label="Cash-on-cash"
                cells={scenarios.map((s) =>
                  s.cocAnnualPct != null ? `${s.cocAnnualPct.toFixed(1)}%` : "—"
                )}
                tone={(i) =>
                  scenarios[i]!.cocAnnualPct != null && scenarios[i]!.cocAnnualPct! >= 0
                    ? "positive"
                    : "negative"
                }
              />
              <ScenarioRow
                label="Cash required"
                cells={scenarios.map((s) => fmtUsd(s.totalCashRequired))}
              />
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile — vertical cards */}
      <div className="space-y-3 sm:hidden">
        {scenarios.map((s) => (
          <div
            key={s.key}
            className={`rounded-xl border p-3 ${
              s.isBaseline
                ? "border-primary/30 bg-primary/5"
                : "border-border bg-background"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-foreground">{s.label}</span>
              {s.isBaseline ? (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
                  Current
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {s.downPct.toFixed(0)}% down · {s.termYears} yr · {s.rate.toFixed(2)}%
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <MobileMetric label="P&I" value={fmtUsd(Math.round(s.monthlyPI))} />
              <MobileMetric
                label="Cash flow"
                value={fmtMonthlyCashFlow(Math.round(s.monthlyCashFlow))}
                tone={s.monthlyCashFlow >= 0 ? "positive" : "negative"}
              />
              <MobileMetric label="DSCR" value={s.dscr != null ? s.dscr.toFixed(2) : "—"} />
              <MobileMetric
                label="CoC"
                value={s.cocAnnualPct != null ? `${s.cocAnnualPct.toFixed(1)}%` : "—"}
                tone={
                  s.cocAnnualPct != null && s.cocAnnualPct >= 0 ? "positive" : "negative"
                }
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Cash needed: <span className="font-bold text-foreground">{fmtUsd(s.totalCashRequired)}</span>
            </p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Cap rate, rent, and operating expenses are independent of financing — only debt service,
        cash flow, DSCR, and total cash needed change. DSCR scenario assumes the same property
        with a typical DSCR-loan rate premium (~1.5pp).
      </p>
    </section>
  );
}

function ScenarioRow({
  label,
  cells,
  emphasize,
  tone,
}: {
  label: string;
  cells: string[];
  emphasize?: boolean;
  tone?: (index: number) => "positive" | "negative" | "neutral";
}) {
  return (
    <tr className="border-b border-border/50 last:border-b-0">
      <td className="py-2 pr-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </td>
      {cells.map((cell, i) => {
        const t = tone?.(i) ?? "neutral";
        const cellClass =
          t === "positive"
            ? "text-[var(--metric-positive,#16a34a)]"
            : t === "negative"
              ? "text-[var(--metric-negative,#dc2626)]"
              : "text-foreground";
        return (
          <td
            key={i}
            className={`py-2 px-3 tabular-nums ${
              emphasize ? "font-bold" : "font-medium"
            } ${cellClass}`}
          >
            {cell}
          </td>
        );
      })}
    </tr>
  );
}

function MobileMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  const toneClass =
    tone === "positive"
      ? "text-[var(--metric-positive,#16a34a)]"
      : tone === "negative"
        ? "text-[var(--metric-negative,#dc2626)]"
        : "text-foreground";
  return (
    <div className="rounded-lg bg-muted/30 px-2 py-1.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className={`mt-0.5 text-sm font-bold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}
