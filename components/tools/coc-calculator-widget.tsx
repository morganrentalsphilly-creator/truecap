"use client";

/**
 * Cash-on-Cash return calculator widget for /tools/cash-on-cash-calculator.
 * Self-contained; computes CoC inline as the user types. Walks the user
 * through the underlying math (cash invested + annual cash flow) rather
 * than just asking for the final two numbers.
 */

import { useId, useMemo, useState } from "react";
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

const fmtMoney = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

function classify(coc: number): { label: string; color: string; note: string } {
  if (coc < 0) return { label: "Negative", color: "text-[var(--metric-negative)]", note: "Money out of pocket each year." };
  if (coc < 4) return { label: "Below market", color: "text-[var(--metric-negative)]", note: "Likely under-leveraged or over-priced." };
  if (coc < 8) return { label: "Modest", color: "text-foreground", note: "Common for appreciation-focused markets." };
  if (coc < 12) return { label: "Healthy", color: "text-[var(--metric-positive)]", note: "Typical target for buy-and-hold investors." };
  if (coc < 20) return { label: "Strong", color: "text-[var(--metric-positive)]", note: "Cash-flow-heavy deal." };
  return { label: "Exceptional — verify", color: "text-[var(--metric-positive)]", note: "Sanity-check rent, expenses, and price." };
}

function calcMonthlyPayment(principal: number, annualRatePct: number, years: number): number {
  // Match the defensive guards used by lib/calc-analysis.ts so an empty
  // "Loan Term" field can't produce Infinity (which would render as "∞"
  // and break the live readout).
  if (!Number.isFinite(principal) || principal <= 0) return 0;
  if (!Number.isFinite(years) || years <= 0) return 0;
  if (!Number.isFinite(annualRatePct) || annualRatePct < 0) return 0;
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

export function CocCalculatorWidget() {
  const [price, setPrice] = useState("295000");
  const [downPct, setDownPct] = useState("20");
  const [closePct, setClosePct] = useState("3");
  const [ratePct, setRatePct] = useState("6.75");
  const [termYrs, setTermYrs] = useState("30");
  const [rent, setRent] = useState("2950");
  const [opexPct, setOpexPct] = useState("40");

  const result = useMemo(() => {
    const p = num(price);
    const dp = (p * num(downPct)) / 100;
    const closing = (p * num(closePct)) / 100;
    const loan = p - dp;
    const mort = calcMonthlyPayment(loan, num(ratePct), num(termYrs));
    const opex = (num(rent) * num(opexPct)) / 100;
    const monthlyCF = num(rent) - opex - mort;
    const annualCF = monthlyCF * 12;
    const cashIn = dp + closing;
    const coc = cashIn > 0 ? (annualCF / cashIn) * 100 : 0;
    return { dp, closing, loan, mort, opex, monthlyCF, annualCF, cashIn, coc };
  }, [price, downPct, closePct, ratePct, termYrs, rent, opexPct]);

  const c = classify(result.coc);

  // Carry the user's price + rent into the full analyzer (P2-2 handoff).
  const handoffHref = buildAnalyzerHandoffUrl(
    { purchasePrice: num(price), monthlyRent: num(rent) },
    { utmSource: "cash-on-cash-calculator" }
  );

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-7">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Inputs */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Cash-on-Cash Calculator
          </h2>

          <FieldMoney label="Purchase Price" value={price} setValue={setPrice} />
          <div className="grid grid-cols-2 gap-3">
            <FieldPct label="Down Payment" value={downPct} setValue={setDownPct} />
            <FieldPct label="Closing Costs" value={closePct} setValue={setClosePct} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldPct label="Interest Rate" value={ratePct} setValue={setRatePct} step="0.125" />
            <FieldNum label="Loan Term (yrs)" value={termYrs} setValue={setTermYrs} />
          </div>
          <FieldMoney label="Monthly Rent" value={rent} setValue={setRent} />
          <FieldPct label="Operating Expenses (% of rent)" value={opexPct} setValue={setOpexPct} />
        </div>

        {/* Output */}
        <div className="bg-[var(--background)] rounded-xl border border-border p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Cash-on-cash return
            </div>
            <div className={cn("text-5xl sm:text-6xl font-extrabold mt-1 tabular-nums", c.color)}>
              {result.coc.toFixed(2)}%
            </div>
            <div className={cn("text-sm font-semibold mt-1", c.color)}>{c.label}</div>
            <p className="text-xs text-muted-foreground mt-1">{c.note}</p>
          </div>

          <div className="mt-5 pt-5 border-t border-border space-y-1.5 text-xs">
            <Row label="Annual cash flow" value={fmtMoney(result.annualCF)} bold />
            <Row label="Monthly cash flow" value={fmtMoney(result.monthlyCF)} />
            <Row label="Monthly mortgage" value={fmtMoney(result.mort)} />
            <Row label="Monthly operating expenses" value={fmtMoney(result.opex)} />
            <Row label="Cash invested (down + closing)" value={fmtMoney(result.cashIn)} bold />
          </div>
        </div>
      </div>

      <Link
        href={handoffHref} target="_top"
        className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
      >
        <Sparkles className="w-4 h-4" />
        Run the full analysis with these numbers — cap rate, DSCR, and cash-flow and equity projections — free
        <ArrowUpRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function FieldMoney({ label, value, setValue }: { label: string; value: string; setValue: (v: string) => void }) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-foreground mb-1.5 block">{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="pl-7 border-input bg-background text-base"
        />
      </div>
    </div>
  );
}

function FieldPct({ label, value, setValue, step = "0.5" }: { label: string; value: string; setValue: (v: string) => void; step?: string }) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-foreground mb-1.5 block">{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="pr-8 border-input bg-background text-base"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
      </div>
    </div>
  );
}

function FieldNum({ label, value, setValue }: { label: string; value: string; setValue: (v: string) => void }) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-foreground mb-1.5 block">{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="border-input bg-background text-base"
      />
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums", bold ? "font-bold text-foreground" : "text-foreground")}>
        {value}
      </span>
    </div>
  );
}
