"use client";

/**
 * Standalone BRRRR calculator widget for /tools/brrrr-calculator.
 * Reuses lib/brrrr-analysis.ts so the public tool runs the same math
 * as the BRRRR card inside the full TrueCap analyzer.
 */

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  analyzeBrrrr,
  validateBrrrrInputs,
  type BrrrrInputs,
} from "@/lib/brrrr-analysis";
import { buildAnalyzerHandoffUrl } from "@/lib/analyzer-handoff";

const parseInput = (s: string) => (s.trim() === "" ? Number.NaN : Number(s));

const fmt = (n: number) =>
  Number.isFinite(n)
    ? `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`
    : "—";
const fmtPct = (n: number) => (Number.isFinite(n) ? `${n.toFixed(1)}%` : "—");

export function BrrrrCalculatorWidget() {
  const [price, setPrice] = useState("180000");
  const [rehab, setRehab] = useState("45000");
  const [arv, setArv] = useState("320000");
  const [downPct, setDownPct] = useState("20");
  const [closeAcq, setCloseAcq] = useState("3");
  const [refiLtv, setRefiLtv] = useState("75");
  const [refiRate, setRefiRate] = useState("7.0");
  const [refiTerm, setRefiTerm] = useState("30");
  const [closeRefi, setCloseRefi] = useState("2");
  const [hold, setHold] = useState("6");
  const [carry, setCarry] = useState("800");
  const [rent, setRent] = useState("2400");
  const [opex, setOpex] = useState("960"); // 40% of rent default

  const calculation = useMemo(() => {
    const inputs: BrrrrInputs = {
      purchasePrice: parseInput(price),
      rehabBudget: parseInput(rehab),
      arv: parseInput(arv),
      refiLtvPct: parseInput(refiLtv),
      refiRatePct: parseInput(refiRate),
      refiTermYears: parseInput(refiTerm),
      closingCostsPctAcq: parseInput(closeAcq),
      closingCostsRefiPct: parseInput(closeRefi),
      downPaymentPct: parseInput(downPct),
      holdMonths: parseInput(hold),
      monthlyCarryingCost: parseInput(carry),
      postRefiMonthlyOpEx: parseInput(opex),
      postRefiMonthlyRent: parseInput(rent),
    };
    const issues = validateBrrrrInputs(inputs);
    return {
      inputs,
      issues,
      result: issues.length === 0 ? analyzeBrrrr(inputs) : null,
    };
  }, [price, rehab, arv, refiLtv, refiRate, refiTerm, closeAcq, closeRefi, downPct, hold, carry, rent, opex]);

  const invalidFields = new Set(calculation.issues.map((issue) => issue.field));

  // Carry the user's purchase price + post-refi rent into the full analyzer (P2-2 handoff).
  const handoffHref = buildAnalyzerHandoffUrl(
    calculation.result
      ? {
          purchasePrice: calculation.inputs.purchasePrice,
          monthlyRent: calculation.inputs.postRefiMonthlyRent,
          strategy: "brrrr",
        }
      : { strategy: "brrrr" },
    { utmSource: "brrrr-calculator" }
  );

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-7">
      <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
        BRRRR Calculator
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
        <Money label="Purchase price" value={price} setValue={setPrice} min={1} max={100_000_000} invalid={invalidFields.has("purchasePrice")} />
        <Money label="Rehab budget" value={rehab} setValue={setRehab} min={0} max={100_000_000} invalid={invalidFields.has("rehabBudget")} />
        <Money label="ARV (after-repair value)" value={arv} setValue={setArv} min={1} max={100_000_000} invalid={invalidFields.has("arv")} />
        <Pct label="Down payment" value={downPct} setValue={setDownPct} min={0} max={100} invalid={invalidFields.has("downPaymentPct")} />
        <Pct label="Closing costs (acq)" value={closeAcq} setValue={setCloseAcq} min={0} max={25} invalid={invalidFields.has("closingCostsPctAcq")} />
        <Plain label="Hold months" value={hold} setValue={setHold} min={0} max={120} invalid={invalidFields.has("holdMonths")} />
        <Pct label="Refi LTV" value={refiLtv} setValue={setRefiLtv} min={0.1} max={100} invalid={invalidFields.has("refiLtvPct")} />
        <Pct label="Refi rate" value={refiRate} setValue={setRefiRate} step="0.125" min={0} max={50} invalid={invalidFields.has("refiRatePct")} />
        <Plain label="Refi term (yrs)" value={refiTerm} setValue={setRefiTerm} min={1} max={50} invalid={invalidFields.has("refiTermYears")} />
        <Pct label="Refi closing %" value={closeRefi} setValue={setCloseRefi} min={0} max={25} invalid={invalidFields.has("closingCostsRefiPct")} />
        <Money label="Monthly carry (rehab)" value={carry} setValue={setCarry} min={0} max={1_000_000} invalid={invalidFields.has("monthlyCarryingCost")} />
        <Money label="Monthly rent (after)" value={rent} setValue={setRent} min={1} max={1_000_000} invalid={invalidFields.has("postRefiMonthlyRent")} />
        <Money label="Monthly op-ex (after)" value={opex} setValue={setOpex} min={0} max={1_000_000} invalid={invalidFields.has("postRefiMonthlyOpEx")} />
      </div>

      {calculation.result ? (
      <div className="rounded-xl border border-border bg-[var(--background)] p-5 sm:p-6 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Metric label="Cash left in deal" value={fmt(calculation.result.cashLeftInDeal)}
            positive={calculation.result.cashLeftInDeal === 0}
            negative={calculation.result.cashLeftInDeal > 0 && calculation.result.cashLeftInDeal >= calculation.result.totalCashInvested}
          />
          <Metric label="Cash returned at refi" value={fmt(calculation.result.cashReturnedAtRefi)} positive={calculation.result.cashReturnedAtRefi > 0} />
          <Metric label="Post-refi CF" value={`${fmt(calculation.result.postRefiMonthlyCashFlow)}/mo`}
            positive={calculation.result.postRefiMonthlyCashFlow > 0}
            negative={calculation.result.postRefiMonthlyCashFlow < 0}
          />
          <Metric label="Post-refi CoC"
            value={calculation.result.isInfiniteReturn ? "∞ Infinite" : fmtPct(calculation.result.postRefiCashOnCashPct)}
            positive={calculation.result.isInfiniteReturn || calculation.result.postRefiCashOnCashPct > 10}
            negative={!calculation.result.isInfiniteReturn && calculation.result.postRefiCashOnCashPct < 0}
          />
        </div>

        {/* Refi shortfall: new loan < payoff + refi costs. The shortfall is
            already counted in "Cash left in deal" — this names it. */}
        {calculation.result.cashNeededAtRefi > 0 && (
          <p className="text-xs font-semibold text-[var(--metric-negative)]">
            Refi shortfall: the new loan doesn&apos;t cover the original loan payoff plus
            refi closing costs — you&apos;d bring {fmt(calculation.result.cashNeededAtRefi)} to the refi
            table (included in cash left in deal).
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5">Cash going in</div>
            <Row label="Down payment" value={fmt(calculation.result.originalDownPayment)} />
            <Row label="Closing costs" value={fmt(calculation.result.originalClosingCosts)} />
            <Row label="Rehab budget" value={fmt(calculation.result.rehabBudget)} />
            <Row label="Carrying costs" value={fmt(calculation.result.carryingCostsTotal)} />
            <Row label="Total cash invested" value={fmt(calculation.result.totalCashInvested)} bold />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5">Refi</div>
            <Row label="New loan amount" value={fmt(calculation.result.newLoanAmount)} />
            <Row label="Refi closing costs" value={fmt(calculation.result.refiClosingCosts)} />
            {calculation.result.cashNeededAtRefi > 0 ? (
              <Row label="Cash needed at refi" value={fmt(calculation.result.cashNeededAtRefi)} bold />
            ) : (
              <Row label="Cash returned" value={fmt(calculation.result.cashReturnedAtRefi)} bold />
            )}
            <Row label="New monthly payment" value={fmt(calculation.result.newMonthlyPayment)} />
            <Row label="Equity created" value={fmt(calculation.result.equityCreated)} bold />
          </div>
        </div>
      </div>
      ) : (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-[var(--metric-negative)]/35 bg-[var(--metric-negative)]/5 p-5"
        >
          <p className="text-sm font-bold text-foreground">Check the highlighted inputs.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The calculator will resume when every required value is within its supported range.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-[var(--metric-negative)]">
            {calculation.issues.slice(0, 4).map((issue) => (
              <li key={issue.field}>{issue.message}</li>
            ))}
            {calculation.issues.length > 4 ? (
              <li>Correct {calculation.issues.length - 4} more highlighted fields.</li>
            ) : null}
          </ul>
        </div>
      )}

      <Link href={handoffHref} target="_top" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
        <Sparkles className="w-4 h-4" />
        Open the free core deal screen with these numbers — Pro adds BRRRR, comparisons, and PDFs
        <ArrowUpRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

type NumericFieldProps = {
  label: string;
  value: string;
  setValue: (v: string) => void;
  min: number;
  max: number;
  invalid: boolean;
};

function Money({ label, value, setValue, min, max, invalid }: NumericFieldProps) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
        <Input id={id} type="number" inputMode="decimal" min={min} max={max} aria-invalid={invalid || undefined} value={value} onChange={(e) => setValue(e.target.value)} className="pl-7 border-input bg-background" />
      </div>
    </div>
  );
}
function Pct({ label, value, setValue, min, max, invalid, step = "0.5" }: NumericFieldProps & { step?: string }) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">{label}</Label>
      <div className="relative">
        <Input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} aria-invalid={invalid || undefined} value={value} onChange={(e) => setValue(e.target.value)} className="pr-8 border-input bg-background" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
      </div>
    </div>
  );
}
function Plain({ label, value, setValue, min, max, invalid }: NumericFieldProps) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">{label}</Label>
      <Input id={id} type="number" inputMode="numeric" min={min} max={max} step="1" aria-invalid={invalid || undefined} value={value} onChange={(e) => setValue(e.target.value)} className="border-input bg-background" />
    </div>
  );
}
function Metric({ label, value, positive, negative }: { label: string; value: string; positive?: boolean; negative?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{label}</div>
      <div className={cn("text-base sm:text-lg font-extrabold mt-0.5 tabular-nums",
        positive && "text-[var(--metric-positive)]",
        negative && "text-[var(--metric-negative)]",
        !positive && !negative && "text-foreground")}>
        {value}
      </div>
    </div>
  );
}
function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums", bold ? "font-bold text-foreground" : "text-foreground")}>{value}</span>
    </div>
  );
}
