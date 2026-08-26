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
import {
  calcInitialPmiMonthly,
  calcMonthlyPayment,
  DEFAULT_PMI_ANNUAL_RATE_PCT,
} from "@/lib/calc-analysis";

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const fmtMoney = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

export type MortgagePaymentEstimateInput = {
  price: number;
  downPaymentPct: number;
  interestRate: number;
  loanTermYears: number;
  propertyTaxPct: number;
  homeownerInsurancePct: number;
};

/** Pure, testable public-tool calculation. Mortgage insurance deliberately
 * calls the same helper and default rate as the underwriting engine. */
export function calculateMortgagePaymentEstimate(
  input: MortgagePaymentEstimateInput,
) {
  const loan = Math.max(
    0,
    input.price - (input.price * input.downPaymentPct) / 100,
  );
  const downPayment = input.price - loan;
  const monthlyPI = calcMonthlyPayment(
    loan,
    input.interestRate,
    input.loanTermYears,
  );
  const monthlyTax = (input.price * input.propertyTaxPct) / 100 / 12;
  const monthlyInsurance =
    (input.price * input.homeownerInsurancePct) / 100 / 12;
  const monthlyPmi = calcInitialPmiMonthly(
    loan,
    input.downPaymentPct,
    DEFAULT_PMI_ANNUAL_RATE_PCT,
  );
  const monthlyTotal =
    monthlyPI + monthlyTax + monthlyInsurance + monthlyPmi;
  const totalPayments = monthlyPI * input.loanTermYears * 12;
  const totalInterest = totalPayments - loan;

  return {
    loan,
    downPayment,
    monthlyPI,
    monthlyTax,
    monthlyInsurance,
    monthlyPmi,
    monthlyTotal,
    totalInterest,
  };
}

export function MortgagePaymentWidget() {
  const [priceInput, setPriceInput] = useState("295000");
  const [downPctInput, setDownPctInput] = useState("20");
  const [rateInput, setRateInput] = useState("6.75");
  const [termInput, setTermInput] = useState("30");
  const [taxPctInput, setTaxPctInput] = useState("1.49");
  const [insurancePctInput, setInsurancePctInput] = useState("0.5");

  const result = useMemo(() => {
    return calculateMortgagePaymentEstimate({
      price: num(priceInput),
      downPaymentPct: num(downPctInput),
      interestRate: num(rateInput),
      loanTermYears: num(termInput),
      propertyTaxPct: num(taxPctInput),
      homeownerInsurancePct: num(insurancePctInput),
    });
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
              Estimated Monthly Payment
            </div>
            <div className={cn("text-5xl sm:text-6xl font-extrabold mt-1 tabular-nums text-foreground")}>
              {fmtMoney(result.monthlyTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Principal, interest, property tax, homeowner&apos;s insurance
              {result.monthlyPmi > 0 ? ", and estimated mortgage insurance." : "."}
            </p>
          </div>

          <div className="mt-5 pt-5 border-t border-border space-y-1.5 text-xs">
            <Row label="Loan amount" value={fmtMoney(result.loan)} />
            <Row label="Down payment" value={fmtMoney(result.downPayment)} />
            <Row label="Monthly P&I" value={fmtMoney(result.monthlyPI)} bold />
            <Row label="Monthly tax" value={fmtMoney(result.monthlyTax)} />
            <Row label="Monthly homeowner's insurance" value={fmtMoney(result.monthlyInsurance)} />
            <Row label="Estimated monthly PMI" value={fmtMoney(result.monthlyPmi)} />
            <Row label="Total interest over loan" value={fmtMoney(result.totalInterest)} />
            {result.monthlyPmi > 0 ? (
              <p className="pt-2 text-[11px] leading-relaxed text-muted-foreground">
                PMI uses TrueCap&apos;s {DEFAULT_PMI_ANNUAL_RATE_PCT}% annual screening estimate on the starting loan. Verify the actual premium and cancellation rules with the lender.
              </p>
            ) : null}
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
