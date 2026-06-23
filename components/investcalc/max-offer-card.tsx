"use client";

/**
 * "What price makes this deal work?" - the Max Allowable Offer surface.
 *
 * Answers two questions from the same targets:
 *   1. Forward - the HIGHEST price you should pay to still hit every target
 *      (cap rate, cash-on-cash, monthly cash flow, DSCR).
 *   2. Inverse - to make YOUR CURRENT price work, the rent or rate you'd need.
 *
 * Self-contained state - never touches the form. Reuses calculateAnalysis via
 * the solvers in lib/max-allowable-offer.ts so the math stays consistent.
 */

import { useMemo, useState } from "react";
import { Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { InvestmentFormValues } from "@/lib/investcalc-schema";
import {
  calculateMaxAllowableOffer,
  solveRequiredMonthlyRent,
  solveRequiredInterestRate,
  type MaoTarget,
} from "@/lib/max-allowable-offer";

interface MaxOfferCardProps {
  values: InvestmentFormValues | null;
}

const numberOrUndefined = (s: string): number | undefined => {
  if (s.trim() === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function MaxOfferCard({ values }: MaxOfferCardProps) {
  const [capRateInput, setCapRateInput] = useState("8");
  const [cocInput, setCocInput] = useState("8");
  const [cashFlowInput, setCashFlowInput] = useState("0");
  const [dscrInput, setDscrInput] = useState("");

  const target: MaoTarget = useMemo(
    () => ({
      capRate: numberOrUndefined(capRateInput),
      cocReturn: numberOrUndefined(cocInput),
      monthlyCashFlow: numberOrUndefined(cashFlowInput),
      dscr: numberOrUndefined(dscrInput),
    }),
    [capRateInput, cocInput, cashFlowInput, dscrInput]
  );

  const noneSet =
    target.capRate === undefined &&
    target.cocReturn === undefined &&
    target.monthlyCashFlow === undefined &&
    target.dscr === undefined;

  const active = Boolean(values) && !noneSet;
  const mao = useMemo(() => (active ? calculateMaxAllowableOffer(values!, target) : null), [active, values, target]);
  const reqRent = useMemo(() => (active ? solveRequiredMonthlyRent(values!, target) : null), [active, values, target]);
  const reqRate = useMemo(() => (active ? solveRequiredInterestRate(values!, target) : null), [active, values, target]);

  const currentPrice = values ? Number(values.purchasePrice) : null;
  const currentMeets = reqRent?.alreadyMet ?? reqRate?.alreadyMet ?? false;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1.5">
        <Target className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm text-foreground">What price makes this deal work?</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Set your return targets - we solve the highest price you should pay, and what it&apos;d take to
        make your current price work. Uses your current rent, financing, and operating assumptions.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div>
          <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Target Cap Rate
          </Label>
          <div className="relative">
            <Input type="number" inputMode="decimal" step="0.1" value={capRateInput} onChange={(e) => setCapRateInput(e.target.value)} placeholder="8.0" className="pr-7 border-input bg-background" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
          </div>
        </div>
        <div>
          <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Target Cash-on-Cash
          </Label>
          <div className="relative">
            <Input type="number" inputMode="decimal" step="0.1" value={cocInput} onChange={(e) => setCocInput(e.target.value)} placeholder="8.0" className="pr-7 border-input bg-background" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
          </div>
        </div>
        <div>
          <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Min Cash Flow
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
            <Input type="number" inputMode="numeric" step="50" value={cashFlowInput} onChange={(e) => setCashFlowInput(e.target.value)} placeholder="0" className="pl-7 border-input bg-background" />
          </div>
        </div>
        <div>
          <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Min DSCR <span className="font-normal lowercase tracking-normal">(opt)</span>
          </Label>
          <Input type="number" inputMode="decimal" step="0.05" value={dscrInput} onChange={(e) => setDscrInput(e.target.value)} placeholder="1.25" className="border-input bg-background" />
        </div>
      </div>

      {/* Forward: max offer */}
      <div className="mt-5 rounded-xl border border-border bg-[var(--background)] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Max offer</div>
            <div className={cn("mt-1 font-mono text-3xl font-extrabold tabular-nums tracking-tight sm:text-4xl", mao ? "text-primary" : "text-muted-foreground")}>
              {!values ? "—" : noneSet ? "Set a target" : mao ? money(mao.maxPrice) : "No price hits these targets"}
            </div>
          </div>
          {mao && (
            <div className="text-xs text-muted-foreground sm:text-right space-y-0.5">
              <div>At this price you&apos;d get:</div>
              <div>
                <span className="font-semibold text-foreground">{mao.achieved.capRate.toFixed(1)}%</span> cap ·{" "}
                <span className="font-semibold text-foreground">{mao.achieved.cocReturn.toFixed(1)}%</span> CoC ·{" "}
                <span className="font-semibold text-foreground">${mao.achieved.netCashFlow.toLocaleString("en-US")}</span>/mo ·{" "}
                <span className="font-semibold text-foreground">{mao.achieved.dscr > 0 ? mao.achieved.dscr.toFixed(2) : "—"}</span> DSCR
              </div>
            </div>
          )}
        </div>
        {!mao && !noneSet && values && (
          <p className="text-xs text-muted-foreground mt-2">
            Try loosening one of your targets - these returns aren&apos;t reachable at any reasonable price given the rent and expenses entered.
          </p>
        )}
      </div>

      {/* Inverse: make the current price work */}
      {active && currentPrice ? (
        <div className="mt-4 rounded-xl border border-dashed border-border p-4 sm:p-5">
          <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Or - make your current price work
          </div>
          {currentMeets ? (
            <p className="mt-1.5 text-sm text-foreground">
              Your current price ({money(currentPrice)}) already clears these targets. ✓
            </p>
          ) : (
            <div className="mt-1.5 space-y-1 text-sm text-foreground">
              <p className="text-xs text-muted-foreground">At {money(currentPrice)}, you&apos;d need:</p>
              <p>
                Rent{" "}
                {reqRent && !reqRent.unreachable ? (
                  <>
                    ≥ <span className="font-bold text-primary">{money(reqRent.value)}/mo</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">— not reachable by rent alone</span>
                )}
              </p>
              {reqRate === null ? null : (
                <p>
                  or rate{" "}
                  {!reqRate.unreachable ? (
                    <>
                      ≤ <span className="font-bold text-primary">{reqRate.value}%</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">— not reachable by rate alone</span>
                  )}
                </p>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
