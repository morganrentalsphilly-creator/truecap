"use client";

/**
 * Standalone GRM (Gross Rent Multiplier) calculator widget. GRM is a
 * fast screening metric used in commercial real estate to compare
 * properties without needing detailed operating-expense data.
 *
 *   GRM = Property Price ÷ Annual Gross Rent
 *
 * Lower = better. Typical SFR rentals: 8-12. Multifamily: 6-10 in
 * cash-flow markets, 12-18 in appreciation markets.
 */

import { useMemo, useState } from "react";
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

function classify(grm: number): { label: string; color: string; note: string } {
  if (grm <= 0)
    return {
      label: "Invalid",
      color: "text-muted-foreground",
      note: "Enter a price and monthly rent above 0.",
    };
  if (grm < 6)
    return {
      label: "Very strong",
      color: "text-[var(--metric-positive)]",
      note: "Cash-flow-heavy market or a deeply distressed deal — verify everything.",
    };
  if (grm < 10)
    return {
      label: "Healthy",
      color: "text-[var(--metric-positive)]",
      note: "Typical cash-flow market — Midwest / Sun Belt / older multifamily.",
    };
  if (grm < 14)
    return {
      label: "Balanced",
      color: "text-foreground",
      note: "Mixed cash-flow / appreciation market.",
    };
  if (grm < 20)
    return {
      label: "Appreciation play",
      color: "text-foreground",
      note: "Coastal / Tier-1 market — return depends on appreciation, not cash flow.",
    };
  return {
    label: "Expensive",
    color: "text-[var(--metric-negative)]",
    note: "Very low yield relative to price. Common in luxury / ultra-coastal markets.",
  };
}

export function GrmCalculatorWidget() {
  const [priceInput, setPriceInput] = useState("295000");
  const [rentInput, setRentInput] = useState("2950");

  const result = useMemo(() => {
    const price = num(priceInput);
    const monthlyRent = num(rentInput);
    const annualRent = monthlyRent * 12;
    const grm = annualRent > 0 ? price / annualRent : 0;
    return { price, monthlyRent, annualRent, grm };
  }, [priceInput, rentInput]);

  const c = classify(result.grm);

  // Carry the user's price + rent into the full analyzer (P2-2 handoff).
  const handoffHref = buildAnalyzerHandoffUrl(
    { purchasePrice: num(priceInput), monthlyRent: num(rentInput) },
    { utmSource: "gross-rent-multiplier-calculator" }
  );

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-7">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Inputs */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            GRM Calculator
          </h2>

          <div>
            <Label htmlFor="grm-price" className="text-sm font-medium text-foreground mb-1.5 block">
              Property Price
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                id="grm-price"
                type="number"
                inputMode="numeric"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                className="pl-7 border-input bg-background text-base"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="grm-rent" className="text-sm font-medium text-foreground mb-1.5 block">
              Monthly Gross Rent
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                id="grm-rent"
                type="number"
                inputMode="numeric"
                value={rentInput}
                onChange={(e) => setRentInput(e.target.value)}
                className="pl-7 border-input bg-background text-base"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Gross rent — not net. Don&apos;t subtract expenses for this metric.
            </p>
          </div>
        </div>

        {/* Output */}
        <div className="bg-[var(--background)] rounded-xl border border-border p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              GRM
            </div>
            {/* classify() already labels grm <= 0 "Invalid", but the headline
                still printed a precise-looking "0.0" beside it. Show the
                em-dash placeholder instead — the same contract the 1%, 2% and
                Break-Even tools use for an input they do not have. */}
            <div className={cn("text-5xl sm:text-6xl font-extrabold mt-1 tabular-nums", c.color)}>
              {result.grm > 0 ? result.grm.toFixed(1) : "—"}
            </div>
            <div className={cn("text-sm font-semibold mt-1", c.color)}>{c.label}</div>
            <p className="text-xs text-muted-foreground mt-1">{c.note}</p>
          </div>

          <div className="mt-5 pt-5 border-t border-border space-y-1.5 text-xs">
            <Row label="Property price" value={fmtMoney(result.price)} />
            <Row label="Monthly rent" value={fmtMoney(result.monthlyRent)} />
            <Row label="Annual rent" value={fmtMoney(result.annualRent)} bold />
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
