"use client";

/**
 * BRRRR analysis card.
 *
 * Combines the user's standard acquisition inputs (purchase price, financing,
 * rent, op-ex from the main analysis) with three new BRRRR-specific inputs
 * (rehab budget, ARV, refi LTV/rate/term). Outputs the cash-out math, the
 * cash left in deal, the post-refi cash flow, and an "infinite return" flag
 * when the BRRRR pulls all the original capital back out.
 */

import { useMemo, useState } from "react";
import { Repeat, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AnalysisResult } from "@/lib/calc-analysis";
import { analyzeBrrrr } from "@/lib/brrrr-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";

interface BrrrrCardProps {
  values: InvestmentFormValues | null;
  result: AnalysisResult | null;
  /** Rehab estimate flowing in from the rehab estimator card, if any. */
  defaultRehab?: number;
}

const fmt = (n: number) =>
  n === Infinity ? "∞" : `$${Math.round(n).toLocaleString("en-US")}`;
const fmtPct = (n: number) =>
  n === Infinity ? "∞" : `${n.toFixed(1)}%`;

/** AnalysisResult exposes totalOperatingExpenses directly (sum of tax,
 *  insurance, HOA, utilities, maintenance, vacancy, management, capex).
 *  No need to back-derive from rent / mortgage / cash flow. */
function deriveOpEx(result: AnalysisResult | null): number {
  if (!result) return 0;
  return Math.max(0, Number(result.totalOperatingExpenses) || 0);
}

export function BrrrrCard({ values, result, defaultRehab }: BrrrrCardProps) {
  const purchasePrice = Number(values?.purchasePrice) || 0;
  const downPaymentPct = Number(values?.downPaymentPct) || 20;
  const baseRatePct = Number(values?.interestRate) || 6.5;
  const baseCloseAcqPct = Number(values?.closingCostsPct) || 3;

  // BRRRR-specific inputs
  const [rehabInput, setRehabInput] = useState<string>("");
  const [arvInput, setArvInput] = useState<string>("");
  const [refiLtvInput, setRefiLtvInput] = useState<string>("75");
  const [refiRateInput, setRefiRateInput] = useState<string>(String(baseRatePct));
  const [refiTermInput, setRefiTermInput] = useState<string>("30");
  const [holdMonthsInput, setHoldMonthsInput] = useState<string>("6");
  const [refiCloseInput, setRefiCloseInput] = useState<string>("2");
  const [expanded, setExpanded] = useState(true);

  // Default the rehab budget from the rehab estimator's total whenever it
  // changes - but only if the user hasn't typed their own value.
  const effectiveRehab = (() => {
    const typed = Number(rehabInput);
    if (rehabInput !== "" && Number.isFinite(typed)) return typed;
    return defaultRehab ?? 0;
  })();

  const rehabPlaceholder = defaultRehab && defaultRehab > 0
    ? `${defaultRehab.toLocaleString()}`
    : "25000";

  const analysis = useMemo(() => {
    if (!purchasePrice || purchasePrice <= 0) return null;
    const arv = Number(arvInput);
    if (!arv || arv <= 0) return null;
    const rent = result?.monthlyRentalIncome ?? 0;
    const opEx = deriveOpEx(result);

    return analyzeBrrrr({
      purchasePrice,
      rehabBudget: effectiveRehab,
      arv,
      refiLtvPct: Number(refiLtvInput) || 75,
      refiRatePct: Number(refiRateInput) || baseRatePct,
      refiTermYears: Number(refiTermInput) || 30,
      closingCostsPctAcq: baseCloseAcqPct,
      closingCostsRefiPct: Number(refiCloseInput) || 2,
      downPaymentPct,
      holdMonths: Number(holdMonthsInput) || 0,
      monthlyCarryingCost: opEx || rent * 0.25 || 600,
      postRefiMonthlyOpEx: opEx,
      postRefiMonthlyRent: rent,
    });
  }, [
    purchasePrice, downPaymentPct, baseRatePct, baseCloseAcqPct,
    effectiveRehab, arvInput, refiLtvInput, refiRateInput, refiTermInput,
    refiCloseInput, holdMonthsInput, result,
  ]);

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <div className="flex items-center gap-2">
          <Repeat className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">
            BRRRR analyzer
          </span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          {expanded ? <>Collapse <ChevronUp className="w-3.5 h-3.5" /></> : <>Expand <ChevronDown className="w-3.5 h-3.5" /></>}
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Models a buy-rehab-rent-refinance cycle. Uses your purchase price,
        financing, rent, and operating expenses from the main analysis; you
        enter rehab budget, ARV, and refi terms.
      </p>

      {expanded && (
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
          <div>
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
              Rehab Budget
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
              <Input
                type="number"
                inputMode="decimal"
                value={rehabInput}
                onChange={(e) => setRehabInput(e.target.value)}
                placeholder={rehabPlaceholder}
                className="pl-7 border-input bg-background"
              />
            </div>
            {defaultRehab && defaultRehab > 0 && rehabInput === "" && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Using estimator total
              </p>
            )}
          </div>
          <div>
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
              ARV
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
              <Input
                type="number"
                inputMode="decimal"
                value={arvInput}
                onChange={(e) => setArvInput(e.target.value)}
                placeholder="425000"
                className="pl-7 border-input bg-background"
              />
            </div>
          </div>
          <div>
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
              Refi LTV
            </Label>
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                step="1"
                value={refiLtvInput}
                onChange={(e) => setRefiLtvInput(e.target.value)}
                className="pr-8 border-input bg-background"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
          </div>
          <div>
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
              Refi Rate
            </Label>
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                step="0.125"
                value={refiRateInput}
                onChange={(e) => setRefiRateInput(e.target.value)}
                className="pr-8 border-input bg-background"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
          </div>
          <div>
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
              Refi Term
            </Label>
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                step="1"
                value={refiTermInput}
                onChange={(e) => setRefiTermInput(e.target.value)}
                className="pr-12 border-input bg-background"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">yrs</span>
            </div>
          </div>
          <div>
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
              Hold (rehab → refi)
            </Label>
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                step="1"
                value={holdMonthsInput}
                onChange={(e) => setHoldMonthsInput(e.target.value)}
                className="pr-10 border-input bg-background"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mo</span>
            </div>
          </div>
          <div>
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
              Refi Closing
            </Label>
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                step="0.25"
                value={refiCloseInput}
                onChange={(e) => setRefiCloseInput(e.target.value)}
                className="pr-8 border-input bg-background"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
          </div>
        </div>
      )}

      {!analysis ? (
        <div className="text-xs text-muted-foreground rounded-xl border border-border bg-[var(--background)] px-4 py-3">
          Enter purchase price, rehab budget, and ARV to run the BRRRR math.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-[var(--background)] p-4 sm:p-5 space-y-4">
          {/* Headline */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Metric
              label="Cash left in deal"
              value={fmt(analysis.cashLeftInDeal)}
              positive={analysis.cashLeftInDeal === 0}
              negative={analysis.cashLeftInDeal > 0}
            />
            <Metric
              label="Cash returned"
              value={fmt(analysis.cashReturnedAtRefi)}
              positive={analysis.cashReturnedAtRefi > 0}
            />
            <Metric
              label="Post-refi CF"
              value={`${fmt(analysis.postRefiMonthlyCashFlow)}/mo`}
              positive={analysis.postRefiMonthlyCashFlow > 0}
              negative={analysis.postRefiMonthlyCashFlow < 0}
            />
            <Metric
              label="Post-refi CoC"
              value={analysis.isInfiniteReturn ? "∞ Infinite return" : fmtPct(analysis.postRefiCashOnCashPct)}
              positive={analysis.isInfiniteReturn || analysis.postRefiCashOnCashPct > 8}
              negative={!analysis.isInfiniteReturn && analysis.postRefiCashOnCashPct < 0}
            />
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5">
                Cash going in
              </div>
              <Row label="Down payment" value={fmt(analysis.originalDownPayment)} />
              <Row label="Closing costs" value={fmt(analysis.originalClosingCosts)} />
              <Row label="Rehab budget" value={fmt(analysis.rehabBudget)} />
              <Row label="Carrying costs" value={fmt(analysis.carryingCostsTotal)} />
              <Row label="Total cash invested" value={fmt(analysis.totalCashInvested)} bold />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5">
                Refi
              </div>
              <Row label="New loan amount" value={fmt(analysis.newLoanAmount)} />
              <Row label="Refi closing costs" value={fmt(analysis.refiClosingCosts)} />
              <Row label="Cash returned" value={fmt(analysis.cashReturnedAtRefi)} bold />
              <Row label="New monthly payment" value={fmt(analysis.newMonthlyPayment)} />
              <Row
                label="Equity created"
                value={fmt(analysis.equityCreated)}
                bold
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  positive,
  negative,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
        {label}
      </div>
      <div
        className={cn(
          "text-base sm:text-lg font-extrabold mt-0.5 tabular-nums",
          positive && "text-[var(--metric-positive)]",
          negative && "text-[var(--metric-negative)]",
          !positive && !negative && "text-foreground"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "tabular-nums",
          bold ? "font-bold text-foreground" : "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}
