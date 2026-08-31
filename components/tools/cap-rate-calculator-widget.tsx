"use client";

/**
 * Standalone cap rate calculator widget for the /tools/cap-rate-calculator
 * public page. Self-contained — no form context, no auth, computes cap
 * rate inline as the user types.
 */

import { useMemo, useState } from "react";
import { AnalyzerHandoffLink } from "@/components/analyzer-handoff-link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { buildAnalyzerHandoffUrl } from "@/lib/analyzer-handoff";

const numberOrZero = (s: string): number => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const fmtMoney = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

function classifyCapRate(rate: number): {
  label: string;
  color: string;
  desc: string;
} {
  if (rate < 0)
    return {
      label: "Negative",
      color: "text-[var(--metric-negative)]",
      desc: "Operating at a loss.",
    };
  if (rate < 4)
    return {
      label: "Below market",
      color: "text-[var(--metric-negative)]",
      desc: "Lower than most US rental markets.",
    };
  if (rate < 6)
    return {
      label: "Coastal / luxury market",
      color: "text-foreground",
      desc: "Typical for Tier 1 / appreciation plays.",
    };
  if (rate < 8)
    return {
      label: "Healthy",
      color: "text-[var(--metric-positive)]",
      desc: "Solid cash-flowing market.",
    };
  if (rate < 11)
    return {
      label: "Strong",
      color: "text-[var(--metric-positive)]",
      desc: "Cash-flow-heavy market.",
    };
  // Neutral, NOT green — a double-digit cap usually signals risk (C/D class,
  // soft rents, deferred maintenance), so don't color it like a healthy deal.
  return {
    label: "High-risk / distressed",
    color: "text-foreground",
    desc: "Verify rents and condition.",
  };
}

export function CapRateCalculatorWidget() {
  const [priceInput, setPriceInput] = useState("295000");
  const [rentInput, setRentInput] = useState("2950");
  const [opexPctInput, setOpexPctInput] = useState("40");

  const { capRate, noi, opEx, annualRent } = useMemo(() => {
    const price = numberOrZero(priceInput);
    const rent = numberOrZero(rentInput);
    const opexPct =
      Math.max(0, Math.min(100, numberOrZero(opexPctInput))) / 100;
    const annual = rent * 12;
    const ops = annual * opexPct;
    const noiVal = annual - ops;
    const cr = price > 0 ? (noiVal / price) * 100 : 0;
    return { capRate: cr, noi: noiVal, opEx: ops, annualRent: annual };
  }, [priceInput, rentInput, opexPctInput]);

  const classification = classifyCapRate(capRate);

  // Carry the user's price + rent into the full analyzer (P2-2 handoff).
  const handoffHref = buildAnalyzerHandoffUrl(
    {
      purchasePrice: numberOrZero(priceInput),
      monthlyRent: numberOrZero(rentInput),
    },
    { utmSource: "cap-rate-calculator" },
  );

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-7">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Inputs */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Cap Rate Calculator
          </h2>

          <div>
            <Label
              htmlFor="caprate-price"
              className="text-sm font-medium text-foreground mb-1.5 block"
            >
              Property Purchase Price
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="caprate-price"
                type="number"
                inputMode="numeric"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder="295000"
                className="pl-7 border-input bg-background text-base"
              />
            </div>
          </div>

          <div>
            <Label
              htmlFor="caprate-rent"
              className="text-sm font-medium text-foreground mb-1.5 block"
            >
              Monthly Rent
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="caprate-rent"
                type="number"
                inputMode="numeric"
                value={rentInput}
                onChange={(e) => setRentInput(e.target.value)}
                placeholder="2950"
                className="pl-7 border-input bg-background text-base"
              />
            </div>
          </div>

          <div>
            <Label
              htmlFor="caprate-opex"
              className="text-sm font-medium text-foreground mb-1.5 block"
            >
              NOI Operating Expenses (% of rent)
            </Label>
            <div className="relative">
              <Input
                id="caprate-opex"
                type="number"
                inputMode="decimal"
                step="1"
                value={opexPctInput}
                onChange={(e) => setOpexPctInput(e.target.value)}
                placeholder="40"
                className="pr-8 border-input bg-background text-base"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Default 40% is a rough SFR screen for taxes, insurance,
              maintenance, vacancy, and management. It excludes debt service and
              the below-NOI CapEx reserve. Real expenses vary.
            </p>
          </div>
        </div>

        {/* Output */}
        <div className="bg-[var(--background)] rounded-xl border border-border p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Cap rate
            </div>
            <div
              className={cn(
                "text-5xl sm:text-6xl font-extrabold mt-1 tabular-nums",
                classification.color,
              )}
            >
              {capRate.toFixed(2)}%
            </div>
            <div
              className={cn("text-sm font-semibold mt-1", classification.color)}
            >
              {classification.label}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {classification.desc}
            </p>
          </div>

          <div className="mt-5 pt-5 border-t border-border space-y-1.5 text-xs">
            <Row label="Annual rent (gross)" value={fmtMoney(annualRent)} />
            <Row label="Operating expenses" value={fmtMoney(opEx)} />
            <Row
              label="Net Operating Income (NOI)"
              value={fmtMoney(noi)}
              bold
            />
            <Row
              label="Purchase price"
              value={fmtMoney(numberOrZero(priceInput))}
            />
          </div>
        </div>
      </div>

      <AnalyzerHandoffLink
        handoffHref={handoffHref}
        target="_top"
        className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
      >
        <Sparkles className="w-4 h-4" />
        Run the free core analysis; projections appear when your access includes
        them
        <ArrowUpRight className="w-4 h-4" />
      </AnalyzerHandoffLink>
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
