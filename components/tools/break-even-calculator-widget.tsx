"use client";

/**
 * Standalone break-even calculator widget.
 *
 *   Months to break-even = Total Cash Invested ÷ Monthly Net Cash Flow
 *
 * Quick way for investors to see "how many months until this property has
 * returned my initial capital from cash flow alone (excluding appreciation
 * + equity build)."
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

function classify(months: number, cashFlow: number): { label: string; color: string; note: string } {
  if (cashFlow <= 0) {
    return {
      label: "Never (negative cash flow)",
      color: "text-[var(--metric-negative)]",
      note: "Property doesn't break even on cash flow alone — relies on appreciation + equity build for return.",
    };
  }
  if (months <= 60) {
    return {
      label: "Very fast (<5 years)",
      color: "text-[var(--metric-positive)]",
      note: "Strong cash flow play — capital fully returned from rent within 5 years.",
    };
  }
  if (months <= 120) {
    return {
      label: "Reasonable (5-10 years)",
      color: "text-[var(--metric-positive)]",
      note: "Solid balanced deal — capital recycled within a typical hold period.",
    };
  }
  if (months <= 180) {
    return {
      label: "Slow (10-15 years)",
      color: "text-amber-700",
      note: "Capital-build is slow — this deal relies on appreciation, not cash flow, for the wealth build.",
    };
  }
  return {
    label: "Very slow (15+ years)",
    color: "text-amber-700",
    note: "Almost pure appreciation play — only makes sense in fast-growth markets with strong price upside.",
  };
}

export function BreakEvenCalculatorWidget() {
  const [downPayment, setDownPayment] = useState("60000");
  const [closingCosts, setClosingCosts] = useState("8000");
  const [rehab, setRehab] = useState("5000");
  const [monthlyCashFlow, setMonthlyCashFlow] = useState("450");

  const result = useMemo(() => {
    const totalInvested = num(downPayment) + num(closingCosts) + num(rehab);
    const cashFlow = num(monthlyCashFlow);
    if (cashFlow <= 0) return { totalInvested, months: Infinity, years: Infinity, cashFlow };
    const months = totalInvested / cashFlow;
    const years = months / 12;
    return { totalInvested, months, years, cashFlow };
  }, [downPayment, closingCosts, rehab, monthlyCashFlow]);

  const verdict = classify(result.months, result.cashFlow);
  const isInvalid = !Number.isFinite(result.months);

  // Moment-of-result handoff into the full analyzer (P2-2 pattern shared by
  // the other tool widgets). Down payment / closing / rehab don't map onto
  // the analyzer's price/rent handoff fields, so this is a bare tagged link
  // — the analyzer derives cash flow (and break-even) from its own inputs.
  const handoffHref = buildAnalyzerHandoffUrl({}, { utmSource: "break-even-calculator" });

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="be-down" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Down payment
          </Label>
          <div className="mt-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input id="be-down" type="number" inputMode="decimal" min="0"
              value={downPayment} onChange={(e) => setDownPayment(e.target.value)} className="pl-7" />
          </div>
        </div>
        <div>
          <Label htmlFor="be-closing" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Closing costs
          </Label>
          <div className="mt-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input id="be-closing" type="number" inputMode="decimal" min="0"
              value={closingCosts} onChange={(e) => setClosingCosts(e.target.value)} className="pl-7" />
          </div>
        </div>
        <div>
          <Label htmlFor="be-rehab" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Rehab / initial repairs
          </Label>
          <div className="mt-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input id="be-rehab" type="number" inputMode="decimal" min="0"
              value={rehab} onChange={(e) => setRehab(e.target.value)} className="pl-7" />
          </div>
        </div>
        <div>
          <Label htmlFor="be-cf" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Monthly net cash flow
          </Label>
          <div className="mt-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input id="be-cf" type="number" inputMode="decimal"
              value={monthlyCashFlow} onChange={(e) => setMonthlyCashFlow(e.target.value)} className="pl-7" />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-muted/30 p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Break-even</p>
        <p className={cn("mt-1 text-4xl font-extrabold tabular-nums", verdict.color)}>
          {isInvalid ? "—" : `${Math.round(result.months)} months`}
        </p>
        <p className="mt-1 text-sm text-muted-foreground tabular-nums">
          {isInvalid ? "Enter positive cash flow to compute" : `${result.years.toFixed(1)} years · ${fmtMoney(result.totalInvested)} invested`}
        </p>
        <p className="mt-3 text-sm">
          <span className={cn("font-bold", verdict.color)}>{verdict.label}.</span>{" "}
          <span className="text-muted-foreground">{verdict.note}</span>
        </p>
      </div>

      <Link
        href={handoffHref} target="_top"
        className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
      >
        <Sparkles className="w-4 h-4" />
        Open the free core deal screen for cash flow and Deal Score — Pro adds 10-year projections
        <ArrowUpRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
