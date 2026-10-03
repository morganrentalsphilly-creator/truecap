"use client";

/**
 * Mortgage Payment calculator widget. Computes monthly P&I plus a
 * full PITI estimate (P&I + tax + insurance) using standard fixed-rate
 * amortization. Also breaks down total interest paid over the loan life.
 *
 * Set on the calculator parts (components/tools/tool-parts.tsx), like the
 * 1% rule widget: the frame opens on the 2px ink rule with no card, the six
 * fields are the shared ToolNumberField, and the payment is the key figure
 * in DM Mono over the double rule (LedgerTotal), in ink. The result is
 * announced by its own one-line status, so the visible block is not a
 * second live region (ToolResult is one, and has no switch for that). The
 * seven lines behind the payment sit under the result on soft rules (after
 * the action on one column). The grid reads the frame's own width
 * (@container), so the widget lays out the same in the tool page's hero
 * column and in the /embed iframe.
 */

import { useId, useMemo, useState } from "react";
import { AnalyzerHandoffLink } from "@/components/analyzer-handoff-link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { LedgerFigure, LedgerTotal } from "@/components/ledger/ledger-parts";
import { ToolNumberField } from "@/components/tools/tool-number-field";
import { ToolFrame } from "@/components/tools/tool-parts";
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

  const headingId = useId();
  const handoffNoteId = useId();
  // The fields' ids stay React's own, as before; ToolNumberField derives the
  // error line's id from each.
  const priceId = useId();
  const downPctId = useId();
  const rateId = useId();
  const termId = useId();
  const taxPctId = useId();
  const insurancePctId = useId();

  // Carry the user's home price into the full analyzer (P2-2 handoff).
  const handoffHref = buildAnalyzerHandoffUrl(
    { purchasePrice: num(priceInput) },
    { utmSource: "mortgage-payment-calculator" },
  );

  return (
    // The page and the /embed iframe both show an H1 naming the calculator,
    // so the widget's own heading is for the outline only.
    <ToolFrame aria-labelledby={headingId}>
      <h2 id={headingId} className="sr-only">
        Mortgage payment calculator
      </h2>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-6 @lg:grid-cols-2">
        {/* Inputs. The percent fields pair up on one column (a phone, a
            narrow iframe) and again once the frame is 672px wide; between
            the two the field column is too narrow for a pair and they
            stack. */}
        <div className="min-w-0 space-y-5 @lg:row-span-2">
          <ToolNumberField
            id={priceId}
            label="Home price"
            prefix="$"
            min={0}
            max={100_000_000}
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            error={validated.price.error}
          />
          <div className="grid grid-cols-2 items-start gap-x-4 gap-y-5 @lg:grid-cols-1 @2xl:grid-cols-2">
            <ToolNumberField
              id={downPctId}
              label="Down payment %"
              suffix="%"
              step={0.5}
              min={0}
              max={100}
              value={downPctInput}
              onChange={(e) => setDownPctInput(e.target.value)}
              error={validated.downPct.error}
            />
            <ToolNumberField
              id={rateId}
              label="Interest rate"
              suffix="%"
              step={0.125}
              min={0}
              max={30}
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              error={validated.rate.error}
            />
          </div>
          <ToolNumberField
            id={termId}
            label="Loan term (years)"
            min={1}
            max={50}
            value={termInput}
            onChange={(e) => setTermInput(e.target.value)}
            error={validated.term.error}
          />
          <div className="grid grid-cols-2 items-start gap-x-4 gap-y-5 @lg:grid-cols-1 @2xl:grid-cols-2">
            <ToolNumberField
              id={taxPctId}
              label="Property tax (annual)"
              suffix="%"
              step={0.5}
              min={0}
              max={20}
              value={taxPctInput}
              onChange={(e) => setTaxPctInput(e.target.value)}
              error={validated.taxPct.error}
            />
            <ToolNumberField
              id={insurancePctId}
              label="Insurance (annual)"
              suffix="%"
              step={0.5}
              min={0}
              max={20}
              value={insurancePctInput}
              onChange={(e) => setInsurancePctInput(e.target.value)}
              error={validated.insurancePct.error}
            />
          </div>
        </div>

        {/* Output. On one column it opens on the rule under the fields. */}
        <div className="min-w-0 border-t border-border pt-5 @lg:border-t-0 @lg:pt-0">
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
          <p className="text-sm leading-snug font-semibold text-foreground">
            Estimated monthly payment
          </p>
          {/* The color sits on the line, as in ToolResult; wrap-anywhere
              keeps an eight-figure payment inside the frame. */}
          <p
            className={cn(
              "mt-3 wrap-anywhere",
              inputsValid ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <LedgerTotal className="text-key-sm sm:text-key">
              {inputsValid ? fmtMoney(result.monthlyTotal) : "—"}
            </LedgerTotal>
          </p>
          <p className="mt-4 max-w-[46ch] text-pretty text-base leading-relaxed text-muted-foreground">
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

        {/* What the payment is made of. On one column it follows the action
            (order-4 after the action's order-3), so the fields lead straight
            to the result and the action on a phone; in the two-column layout
            it sits under the result, beside the fields. Withheld while a
            field is in error, so a rejected value is never printed as a
            figure. */}
        <div
          className={cn(
            "order-4 min-w-0 text-sm @lg:order-none",
            !inputsValid && "hidden",
          )}
        >
          <dl className="border-t border-border">
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
          </dl>
          {result.monthlyPmi > 0 ? (
            <p className="mt-3 max-w-[68ch] text-pretty text-muted-foreground">
              PMI uses TrueCap&apos;s {DEFAULT_PMI_ANNUAL_RATE_PCT}% annual
              screening estimate on the starting loan. Verify the actual
              premium and cancellation rules with the lender.
            </p>
          ) : null}
        </div>

        {/* One plain action, then one line saying what is free and what is
            not (the 1% rule widget's pattern). The label claims no
            carry-over: only the home price is handed on, and not at all from
            a partner's iframe. */}
        <div className="order-3 min-w-0 @lg:order-none @lg:col-span-2">
          <AnalyzerHandoffLink
            handoffHref={handoffHref}
            target="_top"
            aria-describedby={handoffNoteId}
            className={cn(buttonVariants({ size: "cta" }), "w-full sm:w-auto")}
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
      </div>
    </ToolFrame>
  );
}

/** One line of the payment on a soft rule: the name in Ink 2, the figure in DM Mono. */
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
    <div className="flex items-baseline justify-between gap-4 border-b border-rule-soft py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>
        <LedgerFigure className={cn("text-foreground", bold && "font-medium")}>
          {value}
        </LedgerFigure>
      </dd>
    </div>
  );
}
