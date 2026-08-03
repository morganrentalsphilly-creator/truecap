"use client";

/**
 * 2% rule calculator widget — the strict cash-flow-market screener.
 * Rent ÷ price × 100, judged against the 2% bar (with the 1% bar as
 * context — same ratio, different threshold).
 *
 * Stance mirrors the 1-percent-rule page's 2%-rule FAQ: very few US
 * properties hit 2% in 2026, and most that do are in distressed
 * neighborhoods where management headaches eat the cash flow — so a
 * pass here gets a caution, not a celebration. No pass/fail thresholds
 * are invented: 2% and 1% are the rules' own definitions.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles, Check, X, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { buildAnalyzerHandoffUrl } from "@/lib/analyzer-handoff";

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

export function TwoPercentRuleWidget() {
  const [price, setPrice] = useState("120000");
  const [rent, setRent] = useState("1500");

  const { ratio, meetsTwo, meetsOne } = useMemo(() => {
    const p = num(price);
    const r = num(rent);
    const ratio = p > 0 ? (r / p) * 100 : 0;
    return { ratio, meetsTwo: ratio >= 2, meetsOne: ratio >= 1 };
  }, [price, rent]);

  // Carry the user's price + rent into the full analyzer (P2-2 handoff).
  const handoffHref = buildAnalyzerHandoffUrl(
    { purchasePrice: num(price), monthlyRent: num(rent) },
    { utmSource: "2-percent-rule-calculator" }
  );

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-7">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            2% Rule Calculator
          </h2>

          <div>
            <Label htmlFor="twopct-price" className="text-sm font-medium text-foreground mb-1.5 block">
              Purchase Price
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                id="twopct-price"
                type="number"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="pl-7 border-input bg-background text-base"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="twopct-rent" className="text-sm font-medium text-foreground mb-1.5 block">
              Monthly Rent
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                id="twopct-rent"
                type="number"
                inputMode="numeric"
                value={rent}
                onChange={(e) => setRent(e.target.value)}
                className="pl-7 border-input bg-background text-base"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            The 2% rule is the strict version of the 1% rule — a bar so
            high in 2026 that clearing it is a reason to look{" "}
            <em>harder</em>, not to celebrate. Deals that hit 2% usually
            carry the risk that explains the price.
          </p>
        </div>

        <div className="bg-[var(--background)] rounded-xl border border-border p-5 sm:p-6 flex flex-col justify-center items-center text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Rent / Price
          </div>
          <div className={cn("text-5xl sm:text-6xl font-extrabold mt-2 tabular-nums",
            meetsOne ? "text-[var(--metric-positive)]" : "text-[var(--metric-negative)]")}
          >
            {ratio.toFixed(2)}%
          </div>
          <div className="mt-3 flex flex-col items-center gap-1.5">
            {meetsTwo ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" /> Meets the 2% rule — verify why
              </span>
            ) : meetsOne ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--brand-green-light)] text-[var(--metric-positive)] font-bold text-sm">
                <Check className="w-4 h-4" /> Passes 1%, below 2%
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-[var(--metric-negative)] font-bold text-sm">
                <X className="w-4 h-4" /> Below the 1% rule
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-4 max-w-xs">
            {meetsTwo
              ? "A ratio this high usually signals a distressed area, deferred maintenance, or optimistic rent — underwrite before celebrating."
              : meetsOne
                ? "Strong screening territory for a cash-flow market — worth the full underwrite."
                : "Either an appreciation play, or the price is too high relative to rent."}
          </p>
        </div>
      </div>

      <Link
        href={handoffHref} target="_top"
        className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
      >
        <Sparkles className="w-4 h-4" />
        Run the full analysis with these numbers — cap rate, CoC, DSCR, cash flow — free in TrueCap
        <ArrowUpRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
