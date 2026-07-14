"use client";

/**
 * House-hacking calculator widget — owner-occupant math for 2-4 unit
 * properties. You live in one unit, rent the others; the widget shows
 * what's left of the mortgage payment after tenant rent: your
 * effective monthly housing cost ("live for $X/mo").
 *
 * Conventions mirror the rest of TrueCap:
 *   - The owner-occupied unit contributes $0 income — same treatment
 *     as lib/calc-analysis.ts's owner-occupant branch (occupied unit
 *     is excluded from rental income).
 *   - Defaults come from the house-hack starter template in
 *     lib/starter-templates.ts (5% down conventional owner-occupant,
 *     6.5% rate, 1.5% property tax, 0.5% insurance) and its reserve
 *     assumptions (vacancy 4%, maintenance 7%, CapEx 5% of collected
 *     rent, self-managed).
 *   - P&I uses the same standard fixed-rate amortization as the
 *     mortgage-payment widget.
 *   - PMI: below 20% down the full payment includes conventional PMI at
 *     the engine's DEFAULT_PMI_ANNUAL_RATE_PCT — the analyzer this page
 *     hands off to auto-applies it, so omitting it here would show a
 *     rosier number than TrueCap's own underwrite of identical inputs
 *     (the default IS 5% down; FHA MIP differs — noted in the UI).
 *
 * The headline number is PITI minus rent collected — the "housing cost
 * vs renting" benchmark the house-hack underwriting guide argues for —
 * with an "after reserves" line so nobody mistakes the optimistic
 * number for the underwritten one.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { buildAnalyzerHandoffUrl } from "@/lib/analyzer-handoff";
import {
  DEFAULT_PMI_ANNUAL_RATE_PCT,
  PMI_DOWN_PAYMENT_THRESHOLD_PCT,
} from "@/lib/calc-analysis";

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const fmt = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

function calcMonthlyPayment(principal: number, annualRatePct: number, years: number): number {
  if (!Number.isFinite(principal) || principal <= 0) return 0;
  if (!Number.isFinite(years) || years <= 0) return 0;
  if (!Number.isFinite(annualRatePct) || annualRatePct < 0) return 0;
  if (annualRatePct === 0) return principal / (years * 12);
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

/** House-hack starter template reserve assumptions (self-managed, so no
 *  management line): vacancy 4% + maintenance 7% + CapEx 5% of rent. */
const RESERVES_PCT = 4 + 7 + 5;

const UNIT_OPTIONS = [
  { units: 2, label: "Duplex" },
  { units: 3, label: "Triplex" },
  { units: 4, label: "Fourplex" },
] as const;

export function HouseHackingCalculatorWidget() {
  const [unitCount, setUnitCount] = useState(2);
  const [price, setPrice] = useState("400000");
  const [downPct, setDownPct] = useState("5");
  const [rate, setRate] = useState("6.5");
  const [term, setTerm] = useState("30");
  const [taxPct, setTaxPct] = useState("1.5");
  const [insurancePct, setInsurancePct] = useState("0.5");
  const [rent2, setRent2] = useState("1500");
  const [rent3, setRent3] = useState("1400");
  const [rent4, setRent4] = useState("1400");

  const result = useMemo(() => {
    const p = num(price);
    if (p <= 0) return null;
    const loan = Math.max(0, p - (p * num(downPct)) / 100);
    const downPayment = p - loan;
    const monthlyPI = calcMonthlyPayment(loan, num(rate), num(term));
    const monthlyTax = (p * num(taxPct)) / 100 / 12;
    const monthlyInsurance = (p * num(insurancePct)) / 100 / 12;
    // Below 20% down, conventional PMI applies — same threshold + default
    // rate the analyzer auto-charges, so this widget and the handed-off
    // underwrite agree on identical inputs (the default here IS 5% down).
    const monthlyPMI =
      num(downPct) < PMI_DOWN_PAYMENT_THRESHOLD_PCT
        ? (loan * (DEFAULT_PMI_ANNUAL_RATE_PCT / 100)) / 12
        : 0;
    const piti = monthlyPI + monthlyTax + monthlyInsurance + monthlyPMI;
    // Your unit contributes $0 — only the rented units count as income
    // (the calc-analysis owner-occupant convention).
    const rents = [num(rent2), num(rent3), num(rent4)].slice(0, unitCount - 1);
    const rentCollected = rents.reduce((sum, r) => sum + Math.max(r, 0), 0);
    const effectiveCost = piti - rentCollected;
    const reserves = (rentCollected * RESERVES_PCT) / 100;
    const effectiveCostWithReserves = effectiveCost + reserves;
    return {
      loan,
      downPayment,
      monthlyPI,
      monthlyTax,
      monthlyInsurance,
      monthlyPMI,
      piti,
      rentCollected,
      effectiveCost,
      reserves,
      effectiveCostWithReserves,
    };
  }, [price, downPct, rate, term, taxPct, insurancePct, rent2, rent3, rent4, unitCount]);

  // Moment-of-result handoff: land in the analyzer with the House Hack
  // play pre-selected (owner-occupant form + starter defaults applied).
  const handoffHref = buildAnalyzerHandoffUrl(
    { purchasePrice: num(price), strategy: "house-hack" },
    { utmSource: "house-hacking-calculator" }
  );

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-7">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Inputs */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            House Hacking Calculator
          </h2>

          <div>
            <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">
              Property — you live in one unit
            </Label>
            <div className="flex gap-2" role="group" aria-label="Number of units">
              {UNIT_OPTIONS.map((opt) => (
                <button
                  key={opt.units}
                  type="button"
                  onClick={() => setUnitCount(opt.units)}
                  aria-pressed={unitCount === opt.units}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-bold border transition-colors",
                    unitCount === opt.units
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <FieldMoney label="Purchase price" value={price} setValue={setPrice} />
          <div className="grid grid-cols-2 gap-3">
            <FieldPct label="Down payment %" value={downPct} setValue={setDownPct} />
            <FieldPct label="Interest rate" value={rate} setValue={setRate} step="0.125" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldNum label="Loan term (years)" value={term} setValue={setTerm} />
            <FieldPct label="Property tax (annual)" value={taxPct} setValue={setTaxPct} />
          </div>
          <FieldPct label="Insurance (annual)" value={insurancePct} setValue={setInsurancePct} />

          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground pt-1">
            Rent from the units you don&apos;t live in
          </p>
          <div className="grid grid-cols-2 gap-3">
            <FieldMoney label="Unit 2 monthly rent" value={rent2} setValue={setRent2} />
            {unitCount >= 3 && (
              <FieldMoney label="Unit 3 monthly rent" value={rent3} setValue={setRent3} />
            )}
            {unitCount >= 4 && (
              <FieldMoney label="Unit 4 monthly rent" value={rent4} setValue={setRent4} />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Your own unit counts as $0 income — that&apos;s the
            owner-occupant convention TrueCap&apos;s full analyzer uses
            too. Judge the result against what you&apos;d pay to rent a
            comparable place, not against a pure rental&apos;s cash flow.
          </p>
        </div>

        {/* Output */}
        <div className="bg-[var(--background)] rounded-xl border border-border p-5 sm:p-6 flex flex-col justify-between">
          {result === null ? (
            <p className="text-sm text-muted-foreground">
              Enter a purchase price to see your effective housing cost.
            </p>
          ) : (
            <>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Your effective housing cost
                </div>
                <div
                  className={cn(
                    "text-5xl sm:text-6xl font-extrabold mt-1 tabular-nums",
                    result.effectiveCost <= 0
                      ? "text-[var(--metric-positive)]"
                      : "text-foreground"
                  )}
                >
                  {fmt(Math.abs(result.effectiveCost))}
                  <span className="text-lg font-bold text-muted-foreground">/mo</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {result.effectiveCost <= 0
                    ? "Tenant rent covers the whole payment — you're paid to live there before reserves."
                    : "What's left of the full payment (PITI) after tenant rent."}
                </p>
              </div>

              <div className="mt-5 pt-5 border-t border-border space-y-1.5 text-xs">
                <Row label="Loan amount" value={fmt(result.loan)} />
                <Row label={`Down payment (${num(downPct)}%)`} value={fmt(result.downPayment)} />
                <Row label="Monthly P&I" value={fmt(result.monthlyPI)} />
                <Row label="Monthly tax + insurance" value={fmt(result.monthlyTax + result.monthlyInsurance)} />
                {result.monthlyPMI > 0 && (
                  <Row
                    label={`Mortgage insurance — PMI (${DEFAULT_PMI_ANNUAL_RATE_PCT}%/yr under ${PMI_DOWN_PAYMENT_THRESHOLD_PCT}% down)`}
                    value={fmt(result.monthlyPMI)}
                  />
                )}
                <Row label="Full payment (PITI)" value={fmt(result.piti)} bold />
                <Row label="Rent collected from other units" value={`− ${fmt(result.rentCollected)}`} bold />
                <Row
                  label={`Reserves — vacancy, maintenance, CapEx (${RESERVES_PCT}% of rent)`}
                  value={`+ ${fmt(result.reserves)}`}
                />
                <Row
                  label="Effective cost after reserves"
                  value={`${fmt(result.effectiveCostWithReserves)}/mo`}
                  bold
                />
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                The after-reserves number is the one to underwrite with —
                vacancies and repairs happen even when you live next door.
                Self-managed, so no management fee is included.
                {result.monthlyPMI > 0 &&
                  " PMI shown is conventional — FHA loans carry MIP instead (~0.55%/yr, usually for the life of the loan), covered in the FAQ below."}
              </p>
            </>
          )}
        </div>
      </div>

      <Link
        href={handoffHref} target="_top"
        className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
      >
        <Sparkles className="w-4 h-4" />
        Run the full house-hack underwrite — per-unit rents, cash flow, year-2 move-out — free in TrueCap
        <ArrowUpRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function FieldMoney({ label, value, setValue }: { label: string; value: string; setValue: (v: string) => void }) {
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
function FieldPct({ label, value, setValue, step = "0.5" }: { label: string; value: string; setValue: (v: string) => void; step?: string }) {
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
function FieldNum({ label, value, setValue }: { label: string; value: string; setValue: (v: string) => void }) {
  return (
    <div>
      <Label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">{label}</Label>
      <Input type="number" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} className="border-input bg-background" />
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
