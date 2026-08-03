"use client";

/**
 * Mortgage Payment calculator widget. Computes monthly P&I plus a
 * full PITI estimate (P&I + tax + insurance) using standard fixed-rate
 * amortization. Also breaks down total interest paid over the loan life.
 */

import { useId, useMemo, useState } from "react";
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

function calcMonthlyPayment(principal: number, annualRatePct: number, years: number): number {
  if (!Number.isFinite(principal) || principal <= 0) return 0;
  if (!Number.isFinite(years) || years <= 0) return 0;
  if (!Number.isFinite(annualRatePct) || annualRatePct < 0) return 0;
  if (annualRatePct === 0) return principal / (years * 12);
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

export function MortgagePaymentWidget() {
  const [priceInput, setPriceInput] = useState("295000");
  const [downPctInput, setDownPctInput] = useState("20");
  const [rateInput, setRateInput] = useState("6.75");
  const [termInput, setTermInput] = useState("30");
  const [taxPctInput, setTaxPctInput] = useState("1.49");
  const [insurancePctInput, setInsurancePctInput] = useState("0.5");

  const result = useMemo(() => {
    const price = num(priceInput);
    const downPct = num(downPctInput);
    const loan = Math.max(0, price - (price * downPct) / 100);
    const downPayment = price - loan;
    const monthlyPI = calcMonthlyPayment(loan, num(rateInput), num(termInput));
    const monthlyTax = (price * num(taxPctInput)) / 100 / 12;
    const monthlyInsurance = (price * num(insurancePctInput)) / 100 / 12;
    const monthlyPITI = monthlyPI + monthlyTax + monthlyInsurance;
    const totalPayments = monthlyPI * num(termInput) * 12;
    const totalInterest = totalPayments - loan;
    return { loan, downPayment, monthlyPI, monthlyTax, monthlyInsurance, monthlyPITI, totalInterest };
  }, [priceInput, downPctInput, rateInput, termInput, taxPctInput, insurancePctInput]);

  // Carry the user's home price into the full analyzer (P2-2 handoff).
  const handoffHref = buildAnalyzerHandoffUrl(
    { purchasePrice: num(priceInput) },
    { utmSource: "mortgage-payment-calculator" }
  );

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-7">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Inputs */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Mortgage Payment Calculator
          </h2>

          <FieldMoney label="Home Price" value={priceInput} setValue={setPriceInput} />
          <div className="grid grid-cols-2 gap-3">
            <FieldPct label="Down Payment %" value={downPctInput} setValue={setDownPctInput} />
            <FieldPct label="Interest Rate" value={rateInput} setValue={setRateInput} step="0.125" />
          </div>
          <FieldNum label="Loan Term (years)" value={termInput} setValue={setTermInput} />
          <div className="grid grid-cols-2 gap-3">
            <FieldPct label="Property Tax (annual)" value={taxPctInput} setValue={setTaxPctInput} />
            <FieldPct label="Insurance (annual)" value={insurancePctInput} setValue={setInsurancePctInput} />
          </div>
        </div>

        {/* Output */}
        <div className="bg-[var(--background)] rounded-xl border border-border p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Monthly Payment (PITI)
            </div>
            <div className={cn("text-5xl sm:text-6xl font-extrabold mt-1 tabular-nums text-foreground")}>
              {fmtMoney(result.monthlyPITI)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Principal + Interest + Tax + Insurance.
            </p>
          </div>

          <div className="mt-5 pt-5 border-t border-border space-y-1.5 text-xs">
            <Row label="Loan amount" value={fmtMoney(result.loan)} />
            <Row label="Down payment" value={fmtMoney(result.downPayment)} />
            <Row label="Monthly P&I" value={fmtMoney(result.monthlyPI)} bold />
            <Row label="Monthly tax" value={fmtMoney(result.monthlyTax)} />
            <Row label="Monthly insurance" value={fmtMoney(result.monthlyInsurance)} />
            <Row label="Total interest over loan" value={fmtMoney(result.totalInterest)} />
          </div>
        </div>
      </div>

      <Link
        href={handoffHref} target="_top"
        className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
      >
        <Sparkles className="w-4 h-4" />
        Run the full analysis with these numbers — cap rate, cash flow, DSCR, projections — free
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
