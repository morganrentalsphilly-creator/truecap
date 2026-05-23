"use client";

/**
 * Max Allowable Offer (MAO) card.
 *
 * Lives below the metric tiles on the analysis dashboard. The user types
 * their target cap rate / cash-on-cash / monthly cash flow thresholds; we
 * solve for the highest purchase price that still hits ALL of them.
 *
 * Self-contained state — does not touch the form. Reuses calculateAnalysis
 * via the calculateMaxAllowableOffer solver, so the math stays consistent.
 */

import { useMemo, useState } from "react";
import { Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { InvestmentFormValues } from "@/lib/investcalc-schema";
import { calculateMaxAllowableOffer } from "@/lib/max-allowable-offer";

interface MaxOfferCardProps {
  values: InvestmentFormValues | null;
}

const numberOrUndefined = (s: string): number | undefined => {
  if (s.trim() === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

export function MaxOfferCard({ values }: MaxOfferCardProps) {
  const [capRateInput, setCapRateInput] = useState("8");
  const [cocInput, setCocInput] = useState("8");
  const [cashFlowInput, setCashFlowInput] = useState("0");

  const mao = useMemo(() => {
    if (!values) return null;
    return calculateMaxAllowableOffer(values, {
      capRate: numberOrUndefined(capRateInput),
      cocReturn: numberOrUndefined(cocInput),
      monthlyCashFlow: numberOrUndefined(cashFlowInput),
    });
  }, [values, capRateInput, cocInput, cashFlowInput]);

  const formatPrice = (n: number) =>
    `$${Math.round(n).toLocaleString("en-US")}`;

  const noneSet =
    !numberOrUndefined(capRateInput) &&
    !numberOrUndefined(cocInput) &&
    numberOrUndefined(cashFlowInput) === undefined;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1.5">
        <Target className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm text-foreground">
          Max Allowable Offer
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Highest price you should pay to still hit your return thresholds.
        Uses your current rent, financing, and operating assumptions.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div>
          <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Target Cap Rate
          </Label>
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={capRateInput}
              onChange={(e) => setCapRateInput(e.target.value)}
              placeholder="8.0"
              className="pr-8 border-input bg-background"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              %
            </span>
          </div>
        </div>
        <div>
          <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Target Cash-on-Cash
          </Label>
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={cocInput}
              onChange={(e) => setCocInput(e.target.value)}
              placeholder="8.0"
              className="pr-8 border-input bg-background"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              %
            </span>
          </div>
        </div>
        <div>
          <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Min Monthly Cash Flow
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              $
            </span>
            <Input
              type="number"
              inputMode="numeric"
              step="50"
              value={cashFlowInput}
              onChange={(e) => setCashFlowInput(e.target.value)}
              placeholder="0"
              className="pl-7 border-input bg-background"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-border bg-[var(--background)] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Max offer
            </div>
            <div
              className={cn(
                "text-3xl sm:text-4xl font-black mt-1",
                mao ? "text-primary" : "text-muted-foreground"
              )}
            >
              {!values
                ? "—"
                : noneSet
                ? "Set a target"
                : mao
                ? formatPrice(mao.maxPrice)
                : "No price hits these targets"}
            </div>
          </div>
          {mao && (
            <div className="text-xs text-muted-foreground sm:text-right space-y-0.5">
              <div>At this price you'd get:</div>
              <div>
                <span className="font-semibold text-foreground">
                  {mao.achieved.capRate.toFixed(1)}%
                </span>{" "}
                cap ·{" "}
                <span className="font-semibold text-foreground">
                  {mao.achieved.cocReturn.toFixed(1)}%
                </span>{" "}
                CoC ·{" "}
                <span className="font-semibold text-foreground">
                  ${mao.achieved.netCashFlow.toLocaleString("en-US")}
                </span>
                /mo
              </div>
            </div>
          )}
        </div>
        {!mao && !noneSet && values && (
          <p className="text-xs text-muted-foreground mt-2">
            Try loosening one of your targets — these returns aren't reachable
            at any reasonable price given the rent and expenses entered.
          </p>
        )}
      </div>
    </div>
  );
}
