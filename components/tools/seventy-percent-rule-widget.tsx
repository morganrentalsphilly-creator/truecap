"use client";

/**
 * 70% rule calculator widget — the max-offer rule on its own URL.
 *
 * Differs from the ARV calculator widget in scope, not math: this page
 * takes ARV directly and returns a clearly labeled rule-of-thumb price screen,
 * while /tools/arv-calculator builds ARV from sold comps first. The
 * max-offer arithmetic is SHARED via components/tools/max-offer-math.ts
 * (never duplicated), which carries the lib/max-allowable-offer.ts
 * round-DOWN-to-$500 convention.
 *
 * The multiplier ladder (60 / 65 / 70 / 75) mirrors the situation table
 * in the 70-percent-rule blog post — cheap houses push toward 60-65%,
 * expensive light-rehab houses can justify 72-75%. The contextual
 * warnings reuse the same thresholds as the ARV widget so the two
 * pages never disagree about the same deal.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { buildAnalyzerHandoffUrl } from "@/lib/analyzer-handoff";
import { computeRuleMaxOffer } from "@/components/tools/max-offer-math";

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const fmt = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

/** The multiplier ladder from the 70-percent-rule post's situation table. */
const LADDER = [60, 65, 70, 75] as const;

export function SeventyPercentRuleWidget() {
  // Defaults = the worked example from the 70-percent-rule blog post
  // ($300k ARV, $45k repairs), so the article and the widget describe
  // the same deal.
  const [arv, setArv] = useState("300000");
  const [repairs, setRepairs] = useState("45000");
  const [multiplier, setMultiplier] = useState("70");

  const result = useMemo(() => {
    const a = num(arv);
    if (a <= 0) return null;
    const mult = num(multiplier);
    const rep = num(repairs);
    const mao = computeRuleMaxOffer(a, mult, rep);
    // The rule's holdback: everything between your offer + repairs and
    // the resale price. Costs come out of this spread first; margin is
    // what's left.
    const spread = a - (mao > 0 ? mao : 0) - rep;
    const ladder = LADDER.map((pct) => ({
      pct,
      mao: computeRuleMaxOffer(a, pct, rep),
    }));
    return { arv: a, mult, mao, spread, ladder };
  }, [arv, repairs, multiplier]);

  // Never seed this heuristic into the analyzer as a verified purchase price.
  const handoffHref = buildAnalyzerHandoffUrl(
    {},
    { utmSource: "70-percent-rule-calculator" }
  );

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-7">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Inputs */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            70% Rule Calculator
          </h2>

          <div>
            <Label htmlFor="seventypct-arv" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">
              After-repair value (ARV)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
              <Input id="seventypct-arv" type="number" inputMode="numeric" value={arv} onChange={(e) => setArv(e.target.value)} className="pl-7 border-input bg-background" />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              What the property sells for <em>after</em>{" "}the rehab. Don&apos;t
              have it? Build it from sold comps with the{" "}
              <Link href="/tools/arv-calculator" target="_top" className="text-primary font-semibold hover:underline">
                ARV calculator
              </Link>
              .
            </p>
          </div>

          <div>
            <Label htmlFor="seventypct-repairs" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">
              Repair costs
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
              <Input id="seventypct-repairs" type="number" inputMode="numeric" value={repairs} onChange={(e) => setRepairs(e.target.value)} className="pl-7 border-input bg-background" />
            </div>
          </div>

          <div>
            <Label htmlFor="seventypct-multiplier" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">
              Rule multiplier
            </Label>
            <div className="relative">
              <Input id="seventypct-multiplier" type="number" inputMode="decimal" step="1" value={multiplier} onChange={(e) => setMultiplier(e.target.value)} className="pr-8 border-input bg-background" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              70% is the classic center. Cheap houses (&lt;~$150k ARV) push
              toward 60&ndash;65%; expensive houses with light rehabs can
              justify 72&ndash;75%.
            </p>
          </div>
        </div>

        {/* Output */}
        <div className="bg-[var(--background)] rounded-xl border border-border p-5 sm:p-6 flex flex-col justify-between">
          {result === null ? (
            <p className="text-sm text-muted-foreground">
              Enter the after-repair value to see the 70%-rule price screen.
            </p>
          ) : (
            <>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  70%-rule price screen ({result.mult}%)
                </div>
                <div
                  className={cn(
                    "text-5xl sm:text-6xl font-extrabold mt-1 tabular-nums",
                    result.mao > 0
                      ? "text-[var(--metric-positive)]"
                      : "text-[var(--metric-negative)]"
                  )}
                >
                  {fmt(result.mao)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {result.mult}% of ARV − repairs, rounded down to a $500 step.
                </p>
              </div>

              {result.mao <= 0 ? (
                <p className="text-xs font-semibold text-[var(--metric-negative)] mt-4">
                  At this multiplier the repairs consume the entire allowable
                  price — the rule produces no feasible price screen for this deal
                  as entered.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-4">
                  The {fmt(result.spread)} between your all-in cost and the
                  resale price is <strong className="text-foreground">not all profit</strong>{" "}—
                  buying, holding, and selling costs come out first.
                </p>
              )}

              {result.mao > 0 && result.arv < 150_000 && (
                <p className="text-xs font-semibold text-amber-700 mt-3">
                  Sub-$150k ARV: fixed costs (title, permits, utilities,
                  insurance) eat a big share of a small spread — many flippers
                  drop the multiplier to 60&ndash;65% here.
                </p>
              )}
              {result.mao > 0 && result.arv > 600_000 && (
                <p className="text-xs font-semibold text-muted-foreground mt-3">
                  $600k+ ARV with a light rehab can justify 72&ndash;75% — but a
                  thinner margin needs a tighter rehab number and a faster exit.
                </p>
              )}

              <div className="text-xs mt-5 pt-4 border-t border-border">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5">
                  Price screen at other multipliers
                </div>
                {result.ladder.map((step) => (
                  <div key={step.pct} className="flex justify-between py-0.5 gap-3">
                    <span className={cn(step.pct === result.mult ? "font-bold text-foreground" : "text-muted-foreground")}>
                      {step.pct}% of ARV
                    </span>
                    <span className={cn("tabular-nums shrink-0", step.pct === result.mult ? "font-bold text-foreground" : "text-foreground")}>
                      {step.mao > 0 ? fmt(step.mao) : "no feasible ceiling"}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <Link href={handoffHref} target="_top" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
        <Sparkles className="w-4 h-4" />
        Open the released rental analyzer with a separately verified purchase price
        <ArrowUpRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
