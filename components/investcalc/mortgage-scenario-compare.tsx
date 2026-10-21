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
 * Every column is a complete form snapshot rerun through calc-analysis. The
 * presentation reads canonical AnalysisResult fields directly; it owns no
 * payment, cash-flow, cash-required, CoC, or DSCR reconstruction.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnalysisResult } from "@/lib/calc-analysis";
import { formatDscr } from "@/lib/financial-presentation";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";
import { buildMortgageScenarioComparisons } from "@/lib/mortgage-scenario-compare";
import { ScrollX } from "@/components/ui/scroll-x";

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
  // Opening swaps the trigger for the panel and closing swaps it back, so
  // the control that was pressed unmounts both times and focus fell to
  // <body>. Move it to the surface that replaced it: the panel on open, the
  // trigger on close. The ref flag keeps the first render from taking focus.
  const panelRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const moveFocusRef = useRef(false);
  useEffect(() => {
    if (!moveFocusRef.current) return;
    moveFocusRef.current = false;
    if (open) panelRef.current?.focus({ preventScroll: true });
    else triggerRef.current?.focus();
  }, [open]);
  const changeOpen = (next: boolean) => {
    moveFocusRef.current = true;
    setOpen(next);
  };

  // If this is a cash purchase there's no mortgage to compare. Self-hide.
  if (!values || result.loanAmount <= 0 || result.monthlyPayment <= 0) return null;

  // Free-tier teaser - single line that points at /pricing instead of
  // expanding the comparison panel. Honest about being a Pro feature.
  if (!isPro) {
    return (
      // A ruled row, not a dashed box (2026-10 polish).
      <div className="border-t border-border pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span>
              <strong className="font-semibold text-foreground">See how financing changes this deal.</strong>{" "}
              Compare 25% down, a 15-year term, and DSCR loans without rebuilding the model.
            </span>
          </div>
          {/* min-h-11: a link is not covered by the global 44px button
              floor, and at h-8 this was the one 32px control on the result. */}
          <Link
            href="/pricing"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-input bg-transparent px-4 text-sm font-semibold text-foreground transition-colors duration-150 hover:bg-band focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            Compare loan structures
          </Link>
        </div>
      </div>
    );
  }

  // Collapsed state styled to MATCH LoanAmortizationView exactly —
  // same rule, chevron, type hierarchy. The two "advanced views" should
  // feel like siblings, not jagged siblings with different right-side
  // metadata fighting for attention.
  if (!open) {
    return (
      <div className="border-t border-border pt-3">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => changeOpen(true)}
          aria-label="Open the compare financing scenarios panel"
          className="group flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-md text-left transition-colors duration-150 hover:bg-band focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <ChevronRight
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground"
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              Compare financing scenarios
              <span className="inline-flex shrink-0 rounded-sm border border-border px-1.5 py-0.5 font-mono text-2xs font-normal leading-tight text-muted-foreground">
                Pro
              </span>
            </span>
            <span className="mt-0.5 block font-figure text-2xs leading-snug text-muted-foreground">
              +5pp down, 15-yr term, DSCR loan, side by side
            </span>
          </span>
        </button>
      </div>
    );
  }

  const scenarios = buildMortgageScenarioComparisons(values);

  return (
    <section
      ref={panelRef}
      // -1: a programmatic focus target, not a tab stop, so it takes no ring.
      tabIndex={-1}
      aria-label="Mortgage scenario comparison"
      className="border-t border-border pt-3 outline-none"
    >
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Compare financing
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Same property, four different ways to finance it
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => changeOpen(false)}
          aria-label="Close comparison"
          className="size-10 p-0"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Desktop: 4-column table. Mobile: stacked cards (horizontal
          scroll feels cramped on this much data). */}
      <div className="hidden sm:block">
        <ScrollX label="Comparison table" className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th scope="col" className="py-2 pr-3 text-xs font-medium text-muted-foreground">
                  Scenario
                </th>
                {scenarios.map((s) => (
                  <th
                    key={s.key}
                    scope="col"
                    className={`py-2 px-3 text-xs font-semibold ${
                      s.isBaseline ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                    {s.isBaseline ? (
                      <span className="ml-1 rounded-sm border border-border px-1.5 py-0.5 font-mono text-2xs font-normal text-muted-foreground">
                        Now
                      </span>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <ScenarioRow label="Down payment" cells={scenarios.map((s) => `${s.downPaymentPct.toFixed(0)}%`)} />
              <ScenarioRow label="Term" cells={scenarios.map((s) => `${s.loanTermYears} yr`)} />
              <ScenarioRow label="Rate" cells={scenarios.map((s) => `${s.interestRatePct.toFixed(2)}%`)} />
              <ScenarioRow label="Loan amount" cells={scenarios.map((s) => fmtUsd(s.result.loanAmount))} />
              <ScenarioRow
                label="Monthly P&I"
                cells={scenarios.map((s) => fmtUsd(Math.round(s.result.loanPrincipalAndInterest)))}
                emphasize
              />
              <ScenarioRow
                label="Monthly cash flow"
                cells={scenarios.map((s) =>
                  fmtMonthlyCashFlow(Math.round(s.result.netCashFlow))
                )}
                tone={(i) =>
                  scenarios[i]!.result.netCashFlow >= 0 ? "positive" : "negative"
                }
                emphasize
              />
              <ScenarioRow
                label="DSCR"
                cells={scenarios.map((s) =>
                  formatDscr(
                    s.result.dscr,
                    s.result.loanPrincipalAndInterest > 0,
                  )
                )}
                tone={(i) => {
                  const scenarioResult = scenarios[i]!.result;
                  if (scenarioResult.loanPrincipalAndInterest <= 0) return "neutral";
                  return scenarioResult.dscr >= 1.25
                    ? "positive"
                    : scenarioResult.dscr < 1
                      ? "negative"
                      : "neutral";
                }}
              />
              <ScenarioRow
                label="Cash-on-cash"
                cells={scenarios.map((s) =>
                  s.result.totalCashRequired > 0 ? `${s.result.cocReturn.toFixed(1)}%` : "—"
                )}
                tone={(i) =>
                  scenarios[i]!.result.totalCashRequired > 0 && scenarios[i]!.result.cocReturn >= 0
                    ? "positive"
                    : "negative"
                }
              />
              <ScenarioRow
                label="Cash to close"
                cells={scenarios.map((s) => fmtUsd(s.result.totalCashRequired))}
              />
            </tbody>
          </table>
        </ScrollX>
      </div>

      {/* Mobile - one ruled row per scenario */}
      <div className="divide-y divide-border sm:hidden">
        {scenarios.map((s) => (
          <div key={s.key} className="py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">{s.label}</span>
              {s.isBaseline ? (
                <span className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-2xs text-muted-foreground">
                  Current
                </span>
              ) : null}
            </div>
            <p className="mt-1 font-figure text-xs text-muted-foreground">
              {s.downPaymentPct.toFixed(0)}% down · {s.loanTermYears} yr · {s.interestRatePct.toFixed(2)}%
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <MobileMetric label="P&I" value={fmtUsd(Math.round(s.result.loanPrincipalAndInterest))} />
              <MobileMetric
                label="Cash flow"
                value={fmtMonthlyCashFlow(Math.round(s.result.netCashFlow))}
                tone={s.result.netCashFlow >= 0 ? "positive" : "negative"}
              />
              <MobileMetric
                label="DSCR"
                value={formatDscr(
                  s.result.dscr,
                  s.result.loanPrincipalAndInterest > 0,
                )}
                tone={
                  s.result.loanPrincipalAndInterest <= 0
                    ? undefined
                    : s.result.dscr >= 1.25
                      ? "positive"
                      : s.result.dscr < 1
                        ? "negative"
                        : undefined
                }
              />
              <MobileMetric
                label="CoC"
                value={s.result.totalCashRequired > 0 ? `${s.result.cocReturn.toFixed(1)}%` : "—"}
                tone={
                  s.result.totalCashRequired > 0 && s.result.cocReturn >= 0 ? "positive" : "negative"
                }
              />
            </div>
            <p className="mt-2 text-2xs text-muted-foreground">
              Cash to close: <span className="font-figure font-semibold text-foreground">{fmtUsd(s.result.totalCashRequired)}</span>
            </p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-2xs leading-relaxed text-muted-foreground">
        Cap rate, rent, and operating expenses are independent of financing - only debt service,
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
    <tr className="border-b border-rule-soft last:border-b-0">
      <th scope="row" className="py-2 pr-3 text-left text-xs font-semibold text-muted-foreground">
        {label}
      </th>
      {cells.map((cell, i) => {
        const t = tone?.(i) ?? "neutral";
        const cellClass =
          t === "positive"
            ? "text-positive"
            : t === "negative"
              ? "text-negative"
              : "text-foreground";
        return (
          <td
            key={i}
            className={`py-2 px-3 font-figure ${
              emphasize ? "font-semibold" : "font-normal"
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
      ? "text-positive"
      : tone === "negative"
        ? "text-negative"
        : "text-foreground";
  return (
    <div className="border-t border-rule-soft pt-1.5">
      <p className="text-xs font-medium text-muted-foreground">
        {label}
      </p>
      <p className={`mt-0.5 font-figure text-sm font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
