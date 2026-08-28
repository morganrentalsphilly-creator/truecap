"use client";

/**
 * Standalone rental property tax calculator widget.
 *
 * Models the Schedule E tax position of a single rental property —
 * gross rent, operating expenses, mortgage interest, depreciation,
 * net taxable income, tax owed (at user's marginal bracket), and
 * after-tax cash flow.
 *
 * Depreciation = (building basis ÷ 27.5) for residential. Building
 * basis defaults to 80% of purchase price (the rest is land).
 *
 * This is a planning calculator — not tax advice.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildAnalyzerHandoffUrl } from "@/lib/analyzer-handoff";

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const fmtMoney = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

export function RentalPropertyTaxCalculatorWidget() {
  const [purchasePrice, setPurchasePrice] = useState("300000");
  const [landPct, setLandPct] = useState("20");
  const [monthlyRent, setMonthlyRent] = useState("2400");
  const [annualExpenses, setAnnualExpenses] = useState("9600");
  const [annualMortgageInterest, setAnnualMortgageInterest] = useState("11500");
  const [annualPrincipalPaid, setAnnualPrincipalPaid] = useState("3200");
  const [marginalRate, setMarginalRate] = useState("24");

  const result = useMemo(() => {
    const price = num(purchasePrice);
    const landRatio = num(landPct) / 100;
    const buildingBasis = price * (1 - landRatio);
    const annualDepreciation = buildingBasis / 27.5;

    const grossRent = num(monthlyRent) * 12;
    const opex = num(annualExpenses);
    const interest = num(annualMortgageInterest);
    const principal = num(annualPrincipalPaid);

    // Schedule E taxable income
    const taxableIncome = grossRent - opex - interest - annualDepreciation;
    const taxOwed = Math.max(0, (taxableIncome * num(marginalRate)) / 100);

    // Pre-tax cash flow (cash basis)
    const preTaxCashFlow = grossRent - opex - interest - principal;
    const afterTaxCashFlow = preTaxCashFlow - taxOwed;

    // Tax shield value of depreciation
    const taxSavingsFromDepreciation =
      (annualDepreciation * num(marginalRate)) / 100;

    return {
      buildingBasis,
      annualDepreciation,
      grossRent,
      opex,
      interest,
      principal,
      taxableIncome,
      taxOwed,
      preTaxCashFlow,
      afterTaxCashFlow,
      taxSavingsFromDepreciation,
    };
  }, [
    purchasePrice,
    landPct,
    monthlyRent,
    annualExpenses,
    annualMortgageInterest,
    annualPrincipalPaid,
    marginalRate,
  ]);

  const verdict =
    result.taxableIncome < 0
      ? "Tax loss"
      : result.taxableIncome < 1000
      ? "Near zero"
      : result.taxableIncome < 5000
      ? "Modest income"
      : "Taxable income";
  const verdictColor =
    result.taxableIncome <= 0
      ? "text-[var(--metric-positive)]"
      : "text-amber-700";

  // Carry the user's price + rent into the full analyzer (P2-2 handoff).
  const handoffHref = buildAnalyzerHandoffUrl(
    { purchasePrice: num(purchasePrice), monthlyRent: num(monthlyRent) },
    { utmSource: "rental-property-tax-calculator" }
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        Property + financing
      </p>
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="tax-price" className="text-xs text-muted-foreground">
            Purchase price
          </Label>
          <div className="mt-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              $
            </span>
            <Input
              id="tax-price"
              type="number"
              inputMode="decimal"
              min="0"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              className="pl-7"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="tax-land" className="text-xs text-muted-foreground">
            Land value % (typically 15-25%)
          </Label>
          <Input
            id="tax-land"
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            value={landPct}
            onChange={(e) => setLandPct(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      <p className="mt-6 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        Annual income + expenses
      </p>
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="tax-rent" className="text-xs text-muted-foreground">
            Monthly rent
          </Label>
          <div className="mt-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              $
            </span>
            <Input
              id="tax-rent"
              type="number"
              inputMode="decimal"
              min="0"
              value={monthlyRent}
              onChange={(e) => setMonthlyRent(e.target.value)}
              className="pl-7"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="tax-opex" className="text-xs text-muted-foreground">
            Annual operating expenses
          </Label>
          <div className="mt-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              $
            </span>
            <Input
              id="tax-opex"
              type="number"
              inputMode="decimal"
              min="0"
              value={annualExpenses}
              onChange={(e) => setAnnualExpenses(e.target.value)}
              className="pl-7"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="tax-int" className="text-xs text-muted-foreground">
            Annual mortgage interest
          </Label>
          <div className="mt-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              $
            </span>
            <Input
              id="tax-int"
              type="number"
              inputMode="decimal"
              min="0"
              value={annualMortgageInterest}
              onChange={(e) => setAnnualMortgageInterest(e.target.value)}
              className="pl-7"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="tax-prin" className="text-xs text-muted-foreground">
            Annual principal paid (cash flow only)
          </Label>
          <div className="mt-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              $
            </span>
            <Input
              id="tax-prin"
              type="number"
              inputMode="decimal"
              min="0"
              value={annualPrincipalPaid}
              onChange={(e) => setAnnualPrincipalPaid(e.target.value)}
              className="pl-7"
            />
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Label htmlFor="tax-bracket" className="text-xs text-muted-foreground">
          Your marginal federal tax bracket (%)
        </Label>
        <Input
          id="tax-bracket"
          type="number"
          inputMode="decimal"
          min="0"
          max="50"
          step="1"
          value={marginalRate}
          onChange={(e) => setMarginalRate(e.target.value)}
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Common 2025 brackets: 12%, 22%, 24%, 32%, 35%, 37%.
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-muted/30 p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Taxable income (Schedule E)
        </p>
        <p
          className={cn(
            "mt-1 text-4xl font-extrabold tabular-nums",
            verdictColor
          )}
        >
          {fmtMoney(result.taxableIncome)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground tabular-nums">
          Tax owed: {fmtMoney(result.taxOwed)} ·{" "}
          <span className={cn("font-semibold", verdictColor)}>{verdict}</span>
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground">
              Pre-tax cash flow
            </p>
            <p className="mt-1 text-lg font-extrabold tabular-nums text-foreground">
              {fmtMoney(result.preTaxCashFlow)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="font-bold uppercase tracking-widest text-[10px] text-muted-foreground">
              After-tax cash flow
            </p>
            <p className="mt-1 text-lg font-extrabold tabular-nums text-foreground">
              {fmtMoney(result.afterTaxCashFlow)}
            </p>
          </div>
        </div>

        <details className="mt-3 group">
          <summary className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground">
            Breakdown
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground tabular-nums">
            <li className="flex justify-between">
              <span>Building basis (depreciable)</span>
              <span>{fmtMoney(result.buildingBasis)}</span>
            </li>
            <li className="flex justify-between">
              <span>Annual depreciation (÷ 27.5)</span>
              <span>{fmtMoney(result.annualDepreciation)}</span>
            </li>
            <li className="flex justify-between">
              <span>Gross rent</span>
              <span>{fmtMoney(result.grossRent)}</span>
            </li>
            <li className="flex justify-between">
              <span>− Operating expenses</span>
              <span>{fmtMoney(result.opex)}</span>
            </li>
            <li className="flex justify-between">
              <span>− Mortgage interest</span>
              <span>{fmtMoney(result.interest)}</span>
            </li>
            <li className="flex justify-between">
              <span>− Depreciation</span>
              <span>{fmtMoney(result.annualDepreciation)}</span>
            </li>
            <li className="flex justify-between border-t border-border pt-1 mt-1 font-semibold text-foreground">
              <span>= Schedule E taxable income</span>
              <span>{fmtMoney(result.taxableIncome)}</span>
            </li>
            <li className="flex justify-between pt-2 text-[var(--metric-positive)]">
              <span>Depreciation tax shield ({fmtPct(num(marginalRate))})</span>
              <span>{fmtMoney(result.taxSavingsFromDepreciation)}/yr</span>
            </li>
          </ul>
        </details>
      </div>

      <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
        Estimates only. Actual tax outcome depends on passive activity rules,
        QBI deduction (Section 199A), state tax, and your total income.
        Always consult a CPA before relying on these numbers for tax
        planning.
      </p>

      <Link
        href={handoffHref} target="_top"
        className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
      >
        <Sparkles className="w-4 h-4" />
        Run the released rental screen with these inputs — cash flow, cap rate, CoC, and DSCR — free
        <ArrowUpRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
