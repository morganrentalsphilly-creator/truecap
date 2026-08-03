"use client";

/**
 * 1% rule calculator widget — simple pass/fail screener.
 * Rent ÷ price × 100. Passes if ≥ 1%.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { buildAnalyzerHandoffUrl } from "@/lib/analyzer-handoff";

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

export function OnePercentRuleWidget() {
  const [price, setPrice] = useState("180000");
  const [rent, setRent] = useState("1900");

  const { ratio, passes } = useMemo(() => {
    const p = num(price);
    const r = num(rent);
    const ratio = p > 0 ? (r / p) * 100 : 0;
    return { ratio, passes: ratio >= 1 };
  }, [price, rent]);

  // Carry the user's price + rent into the full analyzer (P2-2 handoff).
  const handoffHref = buildAnalyzerHandoffUrl(
    { purchasePrice: num(price), monthlyRent: num(rent) },
    { utmSource: "1-percent-rule-calculator" }
  );

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-7">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            1% Rule Calculator
          </h2>

          <div>
            <Label htmlFor="onepct-price" className="text-sm font-medium text-foreground mb-1.5 block">
              Purchase Price
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                id="onepct-price"
                type="number"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="pl-7 border-input bg-background text-base"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="onepct-rent" className="text-sm font-medium text-foreground mb-1.5 block">
              Monthly Rent
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                id="onepct-rent"
                type="number"
                inputMode="numeric"
                value={rent}
                onChange={(e) => setRent(e.target.value)}
                className="pl-7 border-input bg-background text-base"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            The 1% rule is a screening filter, not a verdict. A property
            that passes is worth a deeper underwrite. A property that fails
            isn&apos;t necessarily a bad deal — appreciation markets often
            fail the 1% rule for good reason.
          </p>
        </div>

        <div className="bg-[var(--background)] rounded-xl border border-border p-5 sm:p-6 flex flex-col justify-center items-center text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Rent / Price
          </div>
          <div className={cn("text-5xl sm:text-6xl font-extrabold mt-2 tabular-nums",
            passes ? "text-[var(--metric-positive)]" : "text-[var(--metric-negative)]")}
          >
            {ratio.toFixed(2)}%
          </div>
          <div className="mt-3">
            {passes ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--brand-green-light)] text-[var(--metric-positive)] font-bold text-sm">
                <Check className="w-4 h-4" /> Passes 1% rule
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-[var(--metric-negative)] font-bold text-sm">
                <X className="w-4 h-4" /> Fails 1% rule
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-4 max-w-xs">
            {passes
              ? "Run a full underwrite — this property may cash-flow well."
              : "Either this is an appreciation play, or the price is too high relative to rent."}
          </p>
        </div>
      </div>

      <Link
        href={handoffHref} target="_top"
        className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
      >
        <Sparkles className="w-4 h-4" />
        Run the full analysis with these numbers — cap rate, CoC, DSCR, cash flow, exits — free in TrueCap
        <ArrowUpRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
