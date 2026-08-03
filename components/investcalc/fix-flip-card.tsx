"use client";

/**
 * Fix-and-Flip analysis card.
 *
 * Combines the user's acquisition assumptions from the main form with
 * flip-specific inputs (rehab, hold months, ARV, selling costs).
 * Reports gross/net profit, ROI on cash invested, annualized ROI,
 * profit-per-day, and the break-even ARV.
 */

import { useMemo, useState } from "react";
import { TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { analyzeFixFlip } from "@/lib/fix-flip-analysis";
import type { InvestmentFormValues } from "@/lib/investcalc-schema";

interface FixFlipCardProps {
  values: InvestmentFormValues | null;
  defaultRehab?: number;
}

const fmt = (n: number) =>
  n === Infinity ? "∞" : `${n < 0 ? "-" : ""}$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;
const fmtPct = (n: number) => (Number.isFinite(n) ? `${n.toFixed(1)}%` : "—");

/** Approximate monthly carrying cost = property tax + insurance + utilities
 *  + monthly loan interest while held. We don't have direct fields for tax
 *  and insurance dollars, so estimate from property tax % and a default
 *  insurance assumption. */
function estimateCarryingCost(values: InvestmentFormValues | null, downPaymentPct: number): number {
  if (!values) return 0;
  const price = Number(values.purchasePrice) || 0;
  const taxPct = Number(values.propertyTaxPct) || 1.2;
  const insurancePct = Number(values.insurancePct) || 0.5;
  const ratePct = Number(values.interestRate) || 7;
  const loan = price * (1 - downPaymentPct / 100);
  const monthlyInterest = (loan * (ratePct / 100)) / 12; // interest-only approx
  const monthlyTax = (price * (taxPct / 100)) / 12;
  const monthlyIns = (price * (insurancePct / 100)) / 12;
  const monthlyUtil = Number(values.utilitiesMonthly) || 100;
  return Math.round(monthlyInterest + monthlyTax + monthlyIns + monthlyUtil);
}

export function FixFlipCard({ values, defaultRehab }: FixFlipCardProps) {
  const purchasePrice = Number(values?.purchasePrice) || 0;
  const defaultDp = Number(values?.downPaymentPct) || 20;
  const defaultCloseAcq = Number(values?.closingCostsPct) || 3;

  const [rehabInput, setRehabInput] = useState<string>("");
  const [arvInput, setArvInput] = useState<string>("");
  const [holdInput, setHoldInput] = useState<string>("6");
  const [sellPctInput, setSellPctInput] = useState<string>("7");
  const [dpInput, setDpInput] = useState<string>(String(defaultDp));
  const [carryOverride, setCarryOverride] = useState<string>("");
  const [expanded, setExpanded] = useState(true);

  const effectiveRehab = (() => {
    const typed = Number(rehabInput);
    if (rehabInput !== "" && Number.isFinite(typed)) return typed;
    return defaultRehab ?? 0;
  })();

  const analysis = useMemo(() => {
    if (!purchasePrice || purchasePrice <= 0) return null;
    const arv = Number(arvInput);
    if (!arv || arv <= 0) return null;
    const dpPct = Number(dpInput) || defaultDp;
    const carryAuto = estimateCarryingCost(values, dpPct);
    const carry = carryOverride !== "" && Number.isFinite(Number(carryOverride))
      ? Number(carryOverride)
      : carryAuto;

    return analyzeFixFlip({
      purchasePrice,
      rehabBudget: effectiveRehab,
      arv,
      closingCostsPctAcq: defaultCloseAcq,
      sellingCostsPct: Number(sellPctInput) || 7,
      holdMonths: Math.max(0, Number(holdInput) || 0),
      monthlyCarryingCost: carry,
      downPaymentPct: dpPct,
    });
  }, [
    purchasePrice, defaultDp, defaultCloseAcq,
    effectiveRehab, arvInput, sellPctInput, holdInput, dpInput, carryOverride, values,
  ]);

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">
            Fix-and-flip analyzer
          </span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          /* 44px tap band on phones, desktop box unchanged — same fix as the
             BRRRR card's toggle (both ship publicly on /d/ share pages). */
          className="text-xs text-muted-foreground hover:text-foreground flex min-h-11 items-center gap-1 -mr-2 px-2 py-2 sm:min-h-0 sm:py-0"
        >
          {expanded ? <>Collapse <ChevronUp className="w-3.5 h-3.5" /></> : <>Expand <ChevronDown className="w-3.5 h-3.5" /></>}
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Buy → rehab → sell. Carrying costs auto-estimated from your property
        tax, insurance, financing, and utility assumptions.
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
                placeholder={defaultRehab && defaultRehab > 0 ? String(defaultRehab) : "30000"}
                className="pl-7 border-input bg-background"
              />
            </div>
            {defaultRehab && defaultRehab > 0 && rehabInput === "" && (
              <p className="text-[10px] text-muted-foreground mt-1">Using estimator total</p>
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
                placeholder="450000"
                className="pl-7 border-input bg-background"
              />
            </div>
          </div>
          <div>
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
              Hold Time
            </Label>
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                value={holdInput}
                onChange={(e) => setHoldInput(e.target.value)}
                className="pr-10 border-input bg-background"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mo</span>
            </div>
          </div>
          <div>
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
              Selling Costs
            </Label>
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                step="0.5"
                value={sellPctInput}
                onChange={(e) => setSellPctInput(e.target.value)}
                className="pr-8 border-input bg-background"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
          </div>
          <div>
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
              Down Payment
            </Label>
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                value={dpInput}
                onChange={(e) => setDpInput(e.target.value)}
                className="pr-8 border-input bg-background"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">100 for cash buy</p>
          </div>
          <div>
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
              Carry / mo (optional)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
              <Input
                type="number"
                inputMode="decimal"
                value={carryOverride}
                onChange={(e) => setCarryOverride(e.target.value)}
                placeholder={
                  values
                    ? String(estimateCarryingCost(values, Number(dpInput) || defaultDp))
                    : "auto"
                }
                className="pl-7 border-input bg-background"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Auto from form</p>
          </div>
        </div>
      )}

      {!analysis ? (
        <div className="text-xs text-muted-foreground rounded-xl border border-border bg-[var(--background)] px-4 py-3">
          Enter purchase price, rehab budget, and ARV to run the flip math.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-[var(--background)] p-4 sm:p-5 space-y-4">
          {/* Headline metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Metric
              label="Net profit"
              value={fmt(analysis.netProfit)}
              positive={analysis.netProfit > 0}
              negative={analysis.netProfit < 0}
            />
            <Metric
              label="ROI on cash"
              value={fmtPct(analysis.roiOnCashPct)}
              positive={analysis.roiOnCashPct > 15}
              negative={analysis.roiOnCashPct < 0}
            />
            <Metric
              label="Annualized ROI"
              value={fmtPct(analysis.annualizedRoiPct)}
              positive={analysis.annualizedRoiPct > 20}
              negative={analysis.annualizedRoiPct < 0}
            />
            <Metric
              label="Profit / day"
              value={fmt(analysis.profitPerDay)}
              positive={analysis.profitPerDay > 0}
              negative={analysis.profitPerDay < 0}
            />
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5">
                Cash going in
              </div>
              <Row label="Cash at close" value={fmt(analysis.cashAtClose)} />
              <Row label="Rehab" value={fmt(analysis.rehabBudget)} />
              <Row label="Carrying" value={fmt(analysis.carryingCostsTotal)} />
              <Row label="Total cash invested" value={fmt(analysis.totalCashInvested)} bold />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5">
                Sale
              </div>
              <Row label="Selling costs" value={fmt(analysis.sellingCosts)} />
              <Row label="Gross profit" value={fmt(analysis.grossProfit)} />
              <Row label="Break-even ARV" value={fmt(analysis.breakEvenArv)} bold />
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
      <span className={cn("tabular-nums", bold ? "font-bold text-foreground" : "text-foreground")}>
        {value}
      </span>
    </div>
  );
}
