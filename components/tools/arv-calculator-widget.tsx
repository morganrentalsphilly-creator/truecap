"use client";

/**
 * Standalone ARV calculator widget for /tools/arv-calculator.
 *
 * Two calculations, same conventions as the rest of TrueCap:
 *
 *   ARV       = average renovated-comp $/sq ft × subject finished sq ft
 *   Max offer = (ARV × multiplier%) − repair costs   (the 70% rule)
 *
 * The comps method + the worked numbers mirror the how-to-calculate-arv
 * blog post; the max-offer arithmetic mirrors the 70-percent-rule post
 * and lib/fix-flip-analysis.ts (ARV is the resale top line the flip
 * engine subtracts costs from). Like lib/max-allowable-offer.ts, the
 * displayed offer is rounded DOWN to a $500 step — never up, so the
 * widget never quotes a price above the rule's own ceiling. The 75%
 * refi line uses the same LTV convention as lib/brrrr-analysis.ts's
 * default refi inputs on /tools/brrrr-calculator.
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

export function ArvCalculatorWidget() {
  // Defaults = the first three comps from the how-to-calculate-arv guide's
  // worked example (1,400 sq ft subject, $45k rehab), so the tool page's
  // article and the live widget describe the same deal.
  const [subjectSqft, setSubjectSqft] = useState("1400");
  const [repairs, setRepairs] = useState("45000");
  const [multiplier, setMultiplier] = useState("70");
  const [comp1Price, setComp1Price] = useState("262000");
  const [comp1Sqft, setComp1Sqft] = useState("1450");
  const [comp2Price, setComp2Price] = useState("248500");
  const [comp2Sqft, setComp2Sqft] = useState("1350");
  const [comp3Price, setComp3Price] = useState("270000");
  const [comp3Sqft, setComp3Sqft] = useState("1500");

  const result = useMemo(() => {
    const comps = [
      { price: num(comp1Price), sqft: num(comp1Sqft) },
      { price: num(comp2Price), sqft: num(comp2Sqft) },
      { price: num(comp3Price), sqft: num(comp3Sqft) },
    ].filter((c) => c.price > 0 && c.sqft > 0);
    const sqft = num(subjectSqft);
    if (comps.length === 0 || sqft <= 0) return null;

    const ppsfs = comps.map((c) => c.price / c.sqft);
    const avgPpsf = ppsfs.reduce((a, b) => a + b, 0) / ppsfs.length;
    const arv = avgPpsf * sqft;
    // Shared with the 70% rule widget — rounds DOWN to a $500 step
    // (lib/max-allowable-offer.ts convention): rounding to nearest could
    // quote an offer ABOVE the rule's ceiling.
    const mao = computeRuleMaxOffer(arv, num(multiplier), num(repairs));
    const refiLoan75 = arv * 0.75;
    const compPrices = comps.map((c) => c.price);
    return {
      comps,
      ppsfs,
      avgPpsf,
      arv,
      mao,
      refiLoan75,
      minCompPrice: Math.min(...compPrices),
      maxCompPrice: Math.max(...compPrices),
    };
  }, [subjectSqft, repairs, multiplier, comp1Price, comp1Sqft, comp2Price, comp2Sqft, comp3Price, comp3Sqft]);

  // Moment-of-result handoff (P2-2 pattern): carry the max offer into the
  // full analyzer as the purchase price — the number the rule says to pay.
  const handoffHref = buildAnalyzerHandoffUrl(
    result && result.mao >= 10000 ? { purchasePrice: result.mao } : {},
    { utmSource: "arv-calculator" }
  );

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-7">
      <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
        ARV + 70% Rule Calculator
      </h2>

      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
        Sold comps — renovated, recent, nearby
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
        <Money label="Comp 1 sale price" value={comp1Price} setValue={setComp1Price} />
        <Plain label="Comp 1 sq ft" value={comp1Sqft} setValue={setComp1Sqft} />
        <Money label="Comp 2 sale price" value={comp2Price} setValue={setComp2Price} />
        <Plain label="Comp 2 sq ft" value={comp2Sqft} setValue={setComp2Sqft} />
        <Money label="Comp 3 sale price" value={comp3Price} setValue={setComp3Price} />
        <Plain label="Comp 3 sq ft" value={comp3Sqft} setValue={setComp3Sqft} />
      </div>

      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
        Your property + the rule
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
        <Plain label="Subject finished sq ft" value={subjectSqft} setValue={setSubjectSqft} />
        <Money label="Repair costs" value={repairs} setValue={setRepairs} />
        <Pct label="Rule multiplier" value={multiplier} setValue={setMultiplier} step="1" />
      </div>

      <div className="rounded-xl border border-border bg-[var(--background)] p-5 sm:p-6 space-y-4">
        {result === null ? (
          <p className="text-sm text-muted-foreground">
            Enter at least one sold comp (sale price + square footage) and your
            property&apos;s finished square footage to estimate ARV.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <Metric label="Estimated ARV" value={fmt(result.arv)} />
              <Metric label="Avg comp $/sq ft" value={`$${result.avgPpsf.toFixed(2)}`} />
              <Metric
                label={`Max offer (${num(multiplier)}% rule)`}
                value={fmt(result.mao)}
                positive={result.mao > 0}
                negative={result.mao <= 0}
              />
              <Metric label="75% LTV refi loan" value={fmt(result.refiLoan75)} />
            </div>

            {/* Sanity check straight from the comps method: a credible ARV
                sits inside the range the comps actually sold in. */}
            {result.arv > result.maxCompPrice ? (
              <p className="text-xs font-semibold text-amber-700">
                Sanity check: this ARV is ABOVE every comp&apos;s actual sale price
                ({fmt(result.minCompPrice)}–{fmt(result.maxCompPrice)}). Be
                suspicious — check the subject square footage and whether the comps
                are truly comparable before trusting it.
              </p>
            ) : result.arv < result.minCompPrice ? (
              <p className="text-xs font-semibold text-amber-700">
                Sanity check: this ARV is below every comp&apos;s actual sale price
                ({fmt(result.minCompPrice)}–{fmt(result.maxCompPrice)}). That can
                happen when the subject is much smaller than the comps — stay
                within about ±20% of your square footage when picking them.
              </p>
            ) : (
              <p className="text-xs font-semibold text-[var(--metric-positive)]">
                Sanity check passed: the ARV sits inside your comps&apos; actual
                sale range ({fmt(result.minCompPrice)}–{fmt(result.maxCompPrice)}).
              </p>
            )}

            {result.mao <= 0 && (
              <p className="text-xs font-semibold text-[var(--metric-negative)]">
                At this multiplier the repairs consume the entire allowable price —
                the rule says there is no workable offer on this deal as entered.
              </p>
            )}
            {result.mao > 0 && result.arv < 150_000 && (
              <p className="text-xs font-semibold text-amber-700">
                Sub-$150k ARV: fixed costs (title, permits, utilities, insurance)
                eat a big share of a small spread — many flippers drop the
                multiplier to 60–65% here.
              </p>
            )}
            {result.mao > 0 && result.arv > 600_000 && (
              <p className="text-xs font-semibold text-muted-foreground">
                $600k+ ARV with a light rehab can justify 72–75% — but a thinner
                margin needs a tighter rehab number and a faster exit.
              </p>
            )}

            <div className="text-xs">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5">
                Comp breakdown
              </div>
              {result.comps.map((c, i) => (
                <Row
                  key={i}
                  label={`Comp ${i + 1} — ${fmt(c.price)} ÷ ${c.sqft.toLocaleString("en-US")} sq ft`}
                  value={`$${result.ppsfs[i].toFixed(2)}/sq ft`}
                />
              ))}
              <Row
                label={`ARV — $${result.avgPpsf.toFixed(2)} × ${num(subjectSqft).toLocaleString("en-US")} sq ft`}
                value={fmt(result.arv)}
                bold
              />
              <Row
                label={`Max offer — ${num(multiplier)}% of ARV − ${fmt(num(repairs))} repairs, rounded down to $500`}
                value={fmt(result.mao)}
                bold
              />
            </div>
          </>
        )}
      </div>

      <Link href={handoffHref} target="_top" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
        <Sparkles className="w-4 h-4" />
        Run the full deal at this price — rehab, refi, cash flow, verdict — free in TrueCap
        <ArrowUpRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function Money({ label, value, setValue }: { label: string; value: string; setValue: (v: string) => void }) {
  return (
    <div>
      <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
        <Input type="number" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} className="pl-7 border-input bg-background" />
      </div>
    </div>
  );
}
function Pct({ label, value, setValue, step = "0.5" }: { label: string; value: string; setValue: (v: string) => void; step?: string }) {
  return (
    <div>
      <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">{label}</Label>
      <div className="relative">
        <Input type="number" inputMode="decimal" step={step} value={value} onChange={(e) => setValue(e.target.value)} className="pr-8 border-input bg-background" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
      </div>
    </div>
  );
}
function Plain({ label, value, setValue }: { label: string; value: string; setValue: (v: string) => void }) {
  return (
    <div>
      <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">{label}</Label>
      <Input type="number" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} className="border-input bg-background" />
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
    <div className="flex justify-between py-0.5 gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums shrink-0", bold ? "font-bold text-foreground" : "text-foreground")}>{value}</span>
    </div>
  );
}
