"use client";

/**
 * 50% rule calculator widget — three-second expense triage.
 *
 * The rule (as the 50-percent-rule-rentals blog post states it):
 * operating expenses — everything except debt service — typically run
 * ~50% of gross rent, so estimated NOI ≈ rent × 50%, and estimated
 * cash flow is whatever's left after the mortgage payment (P&I).
 *
 * Note the rule's expense bundle lumps vacancy + maintenance + CapEx +
 * management + tax + insurance together; that's broader than the formal
 * NOI convention in lib/calc-analysis.ts (which excludes the CapEx
 * reserve). This widget follows the rule's own convention — it's a
 * triage tool, and the page copy says so. The adjustable expense ratio
 * covers the post's known failure modes (Texas taxes, Florida
 * insurance, pre-1940 housing stock → 55-65%).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { buildAnalyzerHandoffUrl } from "@/lib/analyzer-handoff";

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const fmt = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

export function FiftyPercentRuleWidget() {
  const [rent, setRent] = useState("1900");
  const [expenseRatio, setExpenseRatio] = useState("50");
  const [monthlyPI, setMonthlyPI] = useState("1150");

  const result = useMemo(() => {
    const r = num(rent);
    if (r <= 0) return null;
    const ratio = num(expenseRatio);
    const pi = num(monthlyPI);
    const expenses = (r * ratio) / 100;
    const noi = r - expenses;
    const cashFlow = noi - pi;
    return { rent: r, ratio, pi, expenses, noi, cashFlow };
  }, [rent, expenseRatio, monthlyPI]);

  // Carry the rent into the full analyzer (P2-2 handoff) — the analyzer
  // replaces the 50% guess with real expense lines.
  const handoffHref = buildAnalyzerHandoffUrl(
    { monthlyRent: num(rent) },
    { utmSource: "50-percent-rule-calculator" }
  );

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-7">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Inputs */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            50% Rule Calculator
          </h2>

          <div>
            <Label htmlFor="fiftypct-rent" className="text-sm font-medium text-foreground mb-1.5 block">
              Monthly Rent
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                id="fiftypct-rent"
                type="number"
                inputMode="numeric"
                value={rent}
                onChange={(e) => setRent(e.target.value)}
                className="pl-7 border-input bg-background text-base"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="fiftypct-expense-ratio" className="text-sm font-medium text-foreground mb-1.5 block">
              Expense Ratio
            </Label>
            <div className="relative">
              <Input
                id="fiftypct-expense-ratio"
                type="number"
                inputMode="decimal"
                step="5"
                value={expenseRatio}
                onChange={(e) => setExpenseRatio(e.target.value)}
                className="pr-8 border-input bg-background text-base"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              50% is the classic. Use 55&ndash;60% for pre-1940 housing
              stock, high-tax states (Texas), or high-insurance markets
              (Florida).
            </p>
          </div>

          <div>
            <Label htmlFor="fiftypct-pi" className="text-sm font-medium text-foreground mb-1.5 block">
              Monthly Mortgage Payment (P&amp;I)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                id="fiftypct-pi"
                type="number"
                inputMode="numeric"
                value={monthlyPI}
                onChange={(e) => setMonthlyPI(e.target.value)}
                className="pl-7 border-input bg-background text-base"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Principal + interest only — the rule&apos;s expense bundle
              already covers tax and insurance.
            </p>
          </div>
        </div>

        {/* Output */}
        <div className="bg-[var(--background)] rounded-xl border border-border p-5 sm:p-6 flex flex-col justify-center">
          {result === null ? (
            <p className="text-sm text-muted-foreground">
              Enter a monthly rent to run the triage.
            </p>
          ) : (
            <>
              <div className="text-center">
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Estimated Cash Flow
                </div>
                <div
                  className={cn(
                    "text-5xl sm:text-6xl font-extrabold mt-2 tabular-nums",
                    result.cashFlow >= 0
                      ? "text-[var(--metric-positive)]"
                      : "text-[var(--metric-negative)]"
                  )}
                >
                  {fmt(result.cashFlow)}
                  <span className="text-lg font-bold text-muted-foreground">/mo</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">
                  {result.cashFlow >= 0
                    ? "Clears the triage — worth opening the full underwrite with real expense lines."
                    : "Negative at the rule's estimate — either the price is too high for the rent, or this market needs the real numbers."}
                </p>
              </div>

              <div className="mt-5 pt-5 border-t border-border space-y-1.5 text-xs">
                <Row label="Gross monthly rent" value={fmt(result.rent)} />
                <Row
                  label={`Estimated operating expenses (${result.ratio}%)`}
                  value={`− ${fmt(result.expenses)}`}
                />
                <Row label="Estimated NOI (rule's convention)" value={fmt(result.noi)} bold />
                <Row label="Mortgage payment (P&I)" value={`− ${fmt(result.pi)}`} />
                <Row label="Estimated cash flow" value={`${fmt(result.cashFlow)}/mo`} bold />
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Triage only — the {result.ratio}% bundle lumps vacancy,
                maintenance, CapEx, management, tax, and insurance into one
                guess. Never commit to a deal on this number.
              </p>
            </>
          )}
        </div>
      </div>

      <Link
        href={handoffHref} target="_top"
        className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
      >
        <Sparkles className="w-4 h-4" />
        Replace the 50% guess in TrueCap&apos;s free core screen — Pro adds advanced decision outputs
        <ArrowUpRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between py-0.5 gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums shrink-0", bold ? "font-bold text-foreground" : "text-foreground")}>{value}</span>
    </div>
  );
}
