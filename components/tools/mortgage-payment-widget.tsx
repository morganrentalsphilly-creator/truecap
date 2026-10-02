"use client";

/**
 * Mortgage Payment calculator widget. Computes monthly P&I plus a
 * full PITI estimate (P&I + tax + insurance) using standard fixed-rate
 * amortization. Also breaks down total interest paid over the loan life.
 */

import { useId, useMemo, useState } from "react";
import { AnalyzerHandoffLink } from "@/components/analyzer-handoff-link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildAnalyzerHandoffUrl } from "@/lib/analyzer-handoff";
import {
  allToolNumbersValid,
  validateToolNumber,
} from "@/lib/public-tool-validation";
import {
  calcInitialPmiMonthly,
  calcMonthlyPayment,
  DEFAULT_PMI_ANNUAL_RATE_PCT,
} from "@/lib/calc-analysis";

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

/** Whole dollars. The sign is the rounded figure's, so a value that rounds to
 * zero (total interest at a 0% rate is a hair under zero in floating point)
 * prints "$0", never "-$0". */
export const fmtMoney = (n: number) => {
  const rounded = Math.round(n);
  return `${rounded < 0 ? "-" : ""}$${Math.abs(rounded).toLocaleString("en-US")}`;
};

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
  const monthlyTotal = monthlyPI + monthlyTax + monthlyInsurance + monthlyPmi;
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

export type MortgagePaymentRawInputs = {
  price: string;
  downPct: string;
  rate: string;
  term: string;
  taxPct: string;
  insurancePct: string;
};

/**
 * What the six fields accept, as typed. A value outside these bounds gets a
 * visible, announced error under its field and the result is withheld; the
 * estimate is computed exactly as before for every value inside them. The
 * down payment, rate and term bounds are the analyzer's own
 * (lib/investcalc-schema.ts). The price ceiling and the 20% ceiling on the
 * property-tax rate are the ones the analyzer handoff accepts
 * (lib/analyzer-handoff.ts); insurance takes the same 20%.
 */
export function validateMortgagePaymentInputs(raw: MortgagePaymentRawInputs) {
  return {
    price: validateToolNumber(raw.price, {
      label: "Home price",
      min: 0,
      minExclusive: true,
      max: 100_000_000,
    }),
    downPct: validateToolNumber(raw.downPct, {
      label: "Down payment percent",
      min: 0,
      max: 100,
    }),
    rate: validateToolNumber(raw.rate, {
      label: "Interest rate",
      min: 0,
      max: 30,
    }),
    term: validateToolNumber(raw.term, {
      label: "Loan term in years",
      min: 1,
      max: 50,
    }),
    taxPct: validateToolNumber(raw.taxPct, {
      label: "Property tax rate",
      min: 0,
      max: 20,
    }),
    insurancePct: validateToolNumber(raw.insurancePct, {
      label: "Insurance rate",
      min: 0,
      max: 20,
    }),
  };
}

export function MortgagePaymentWidget() {
  const [priceInput, setPriceInput] = useState("295000");
  const [downPctInput, setDownPctInput] = useState("20");
  const [rateInput, setRateInput] = useState("6.75");
  const [termInput, setTermInput] = useState("30");
  const [taxPctInput, setTaxPctInput] = useState("1.49");
  const [insurancePctInput, setInsurancePctInput] = useState("0.5");

  const validated = useMemo(
    () =>
      validateMortgagePaymentInputs({
        price: priceInput,
        downPct: downPctInput,
        rate: rateInput,
        term: termInput,
        taxPct: taxPctInput,
        insurancePct: insurancePctInput,
      }),
    [
      priceInput,
      downPctInput,
      rateInput,
      termInput,
      taxPctInput,
      insurancePctInput,
    ],
  );
  const inputsValid = allToolNumbersValid(Object.values(validated));

  const result = useMemo(() => {
    return calculateMortgagePaymentEstimate({
      price: num(priceInput),
      downPaymentPct: num(downPctInput),
      // A pasted negative rate must not turn the payment into a credit.
      interestRate: Math.max(0, num(rateInput)),
      loanTermYears: num(termInput),
      propertyTaxPct: num(taxPctInput),
      homeownerInsurancePct: num(insurancePctInput),
    });
  }, [
    priceInput,
    downPctInput,
    rateInput,
    termInput,
    taxPctInput,
    insurancePctInput,
  ]);

  const handoffNoteId = useId();

  // Carry the user's home price into the full analyzer (P2-2 handoff).
  const handoffHref = buildAnalyzerHandoffUrl(
    { purchasePrice: num(priceInput) },
    { utmSource: "mortgage-payment-calculator" },
  );

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-7">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Inputs */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Mortgage Payment Calculator
          </h2>

          <FieldMoney
            label="Home Price"
            value={priceInput}
            setValue={setPriceInput}
            min={0}
            max={100_000_000}
            error={validated.price.error}
          />
          <div className="grid grid-cols-2 gap-3">
            <FieldPct
              label="Down Payment %"
              value={downPctInput}
              setValue={setDownPctInput}
              min={0}
              max={100}
              error={validated.downPct.error}
            />
            <FieldPct
              label="Interest Rate"
              value={rateInput}
              setValue={setRateInput}
              step="0.125"
              min={0}
              max={30}
              error={validated.rate.error}
            />
          </div>
          <FieldNum
            label="Loan Term (years)"
            value={termInput}
            setValue={setTermInput}
            min={1}
            max={50}
            error={validated.term.error}
          />
          <div className="grid grid-cols-2 gap-3">
            <FieldPct
              label="Property Tax (annual)"
              value={taxPctInput}
              setValue={setTaxPctInput}
              min={0}
              max={20}
              error={validated.taxPct.error}
            />
            <FieldPct
              label="Insurance (annual)"
              value={insurancePctInput}
              setValue={setInsurancePctInput}
              min={0}
              max={20}
              error={validated.insurancePct.error}
            />
          </div>
        </div>

        {/* Output */}
        <div className="bg-[var(--background)] rounded-xl border border-border p-5 sm:p-6 flex flex-col justify-between">
          {/* The result is announced when it changes: one polite status line
              for screen readers, in place of eight rows re-read per keystroke. */}
          <span
            className="sr-only"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {inputsValid
              ? `Estimated monthly payment ${fmtMoney(result.monthlyTotal)}. Monthly principal and interest ${fmtMoney(result.monthlyPI)}.`
              : "Fix the highlighted inputs to calculate the payment."}
          </span>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Estimated Monthly Payment
            </div>
            <div
              className={cn(
                "font-mono text-4xl sm:text-5xl font-extrabold mt-1 tabular-nums",
                inputsValid ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {inputsValid ? fmtMoney(result.monthlyTotal) : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {inputsValid ? (
                <>
                  Principal, interest, property tax, homeowner&apos;s insurance
                  {result.monthlyPmi > 0
                    ? ", and estimated mortgage insurance."
                    : "."}
                </>
              ) : (
                "Fix the highlighted inputs to calculate."
              )}
            </p>
          </div>

          <div
            className={cn(
              "mt-5 pt-5 border-t border-border space-y-1.5 text-xs",
              !inputsValid && "hidden",
            )}
          >
            <Row label="Loan amount" value={fmtMoney(result.loan)} />
            <Row label="Down payment" value={fmtMoney(result.downPayment)} />
            <Row label="Monthly P&I" value={fmtMoney(result.monthlyPI)} bold />
            <Row label="Monthly tax" value={fmtMoney(result.monthlyTax)} />
            <Row
              label="Monthly homeowner's insurance"
              value={fmtMoney(result.monthlyInsurance)}
            />
            <Row
              label="Estimated monthly PMI"
              value={fmtMoney(result.monthlyPmi)}
            />
            <Row
              label="Total interest over loan"
              value={fmtMoney(result.totalInterest)}
            />
            {result.monthlyPmi > 0 ? (
              <p className="pt-2 text-2xs leading-relaxed text-muted-foreground">
                PMI uses TrueCap&apos;s {DEFAULT_PMI_ANNUAL_RATE_PCT}% annual
                screening estimate on the starting loan. Verify the actual
                premium and cancellation rules with the lender.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* One plain action, then one line saying what is free and what is not
          (the 1% rule widget's pattern). The label claims no carry-over: only
          the home price is handed on, and not at all from a partner's iframe. */}
      <AnalyzerHandoffLink
        handoffHref={handoffHref}
        target="_top"
        aria-describedby={handoffNoteId}
        className={cn(buttonVariants({ size: "cta" }), "mt-6 w-full sm:w-auto")}
      >
        Run the full analysis
      </AnalyzerHandoffLink>
      <p
        id={handoffNoteId}
        className="mt-2 text-pretty text-sm text-muted-foreground"
      >
        Cap rate, CoC, DSCR and cash flow are free in TrueCap. The 10-year
        projection is a Pro feature.
      </p>
    </div>
  );
}

/** What every field takes so an out-of-range value is marked and announced. */
type FieldBounds = {
  min: number;
  max: number;
  /** The validation message, or null while the value is in range. */
  error: string | null;
};

/** The error line under a field; role="alert" so it is read when it appears. */
function FieldError({ id, error }: { id: string; error: string | null }) {
  if (!error) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-destructive-text">
      {error}
    </p>
  );
}

function FieldMoney({
  label,
  value,
  setValue,
  min,
  max,
  error,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
} & FieldBounds) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <Label
        htmlFor={id}
        className="text-sm font-medium text-foreground mb-1.5 block"
      >
        {label}
      </Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          $
        </span>
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "pl-7 border-input bg-background text-base",
            error && "border-destructive",
          )}
        />
      </div>
      <FieldError id={errorId} error={error} />
    </div>
  );
}

function FieldPct({
  label,
  value,
  setValue,
  step = "0.5",
  min,
  max,
  error,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  step?: string;
} & FieldBounds) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <Label
        htmlFor={id}
        className="text-sm font-medium text-foreground mb-1.5 block"
      >
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "pr-8 border-input bg-background text-base",
            error && "border-destructive",
          )}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          %
        </span>
      </div>
      <FieldError id={errorId} error={error} />
    </div>
  );
}

function FieldNum({
  label,
  value,
  setValue,
  min,
  max,
  error,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
} & FieldBounds) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <Label
        htmlFor={id}
        className="text-sm font-medium text-foreground mb-1.5 block"
      >
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "border-input bg-background text-base",
          error && "border-destructive",
        )}
      />
      <FieldError id={errorId} error={error} />
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "tabular-nums",
          bold ? "font-bold text-foreground" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}
