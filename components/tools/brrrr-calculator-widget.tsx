"use client";

/**
 * Standalone BRRRR calculator widget for /tools/brrrr-calculator.
 * Reuses lib/brrrr-analysis.ts so the public tool runs the same math
 * as the BRRRR card inside the full TrueCap analyzer.
 */

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { analyzeBrrrr } from "@/lib/brrrr-analysis";
import { buildAnalyzerHandoffUrl } from "@/lib/analyzer-handoff";

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const fmt = (n: number) =>
  n === Infinity ? "∞" : `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
const fmtPct = (n: number) => (n === Infinity ? "∞" : `${n.toFixed(1)}%`);

export function BrrrrCalculatorWidget() {
  const [price, setPrice] = useState("180000");
  const [rehab, setRehab] = useState("45000");
  const [arv, setArv] = useState("320000");
  const [downPct, setDownPct] = useState("20");
  const [closeAcq, setCloseAcq] = useState("3");
  const [refiLtv, setRefiLtv] = useState("75");
  const [refiRate, setRefiRate] = useState("7.0");
  const [refiTerm, setRefiTerm] = useState("30");
  const [closeRefi, setCloseRefi] = useState("2");
  const [hold, setHold] = useState("6");
  const [carry, setCarry] = useState("800");
  const [rent, setRent] = useState("2400");
  const [opex, setOpex] = useState("960"); // 40% of rent default

  const result = useMemo(() => {
    return analyzeBrrrr({
      purchasePrice: num(price),
      rehabBudget: num(rehab),
      arv: num(arv),
      refiLtvPct: num(refiLtv),
      refiRatePct: num(refiRate),
      refiTermYears: num(refiTerm),
      closingCostsPctAcq: num(closeAcq),
      closingCostsRefiPct: num(closeRefi),
      downPaymentPct: num(downPct),
      holdMonths: num(hold),
      monthlyCarryingCost: num(carry),
      postRefiMonthlyOpEx: num(opex),
      postRefiMonthlyRent: num(rent),
    });
  }, [price, rehab, arv, refiLtv, refiRate, refiTerm, closeAcq, closeRefi, downPct, hold, carry, rent, opex]);

  // Carry the user's purchase price + post-refi rent into the full analyzer (P2-2 handoff).
  const handoffHref = buildAnalyzerHandoffUrl(
    { purchasePrice: num(price), monthlyRent: num(rent) },
    { utmSource: "brrrr-calculator" }
  );

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-7">
      <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
        BRRRR Calculator
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
        <Money label="Purchase price" value={price} setValue={setPrice} />
        <Money label="Rehab budget" value={rehab} setValue={setRehab} />
        <Money label="ARV (after-repair value)" value={arv} setValue={setArv} />
        <Pct label="Down payment" value={downPct} setValue={setDownPct} />
        <Pct label="Closing costs (acq)" value={closeAcq} setValue={setCloseAcq} />
        <Plain label="Hold months" value={hold} setValue={setHold} />
        <Pct label="Refi LTV" value={refiLtv} setValue={setRefiLtv} />
        <Pct label="Refi rate" value={refiRate} setValue={setRefiRate} step="0.125" />
        <Plain label="Refi term (yrs)" value={refiTerm} setValue={setRefiTerm} />
        <Pct label="Refi closing %" value={closeRefi} setValue={setCloseRefi} />
        <Money label="Monthly carry (rehab)" value={carry} setValue={setCarry} />
        <Money label="Monthly rent (after)" value={rent} setValue={setRent} />
        <Money label="Monthly op-ex (after)" value={opex} setValue={setOpex} />
      </div>

      <div className="rounded-xl border border-border bg-[var(--background)] p-5 sm:p-6 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Metric label="Cash left in deal" value={fmt(result.cashLeftInDeal)}
            positive={result.cashLeftInDeal === 0}
            negative={result.cashLeftInDeal > 0 && result.cashLeftInDeal >= result.totalCashInvested}
          />
          <Metric label="Cash returned at refi" value={fmt(result.cashReturnedAtRefi)} positive={result.cashReturnedAtRefi > 0} />
          <Metric label="Post-refi CF" value={`${fmt(result.postRefiMonthlyCashFlow)}/mo`}
            positive={result.postRefiMonthlyCashFlow > 0}
            negative={result.postRefiMonthlyCashFlow < 0}
          />
          <Metric label="Post-refi CoC"
            value={result.isInfiniteReturn ? "∞ Infinite" : fmtPct(result.postRefiCashOnCashPct)}
            positive={result.isInfiniteReturn || result.postRefiCashOnCashPct > 10}
            negative={!result.isInfiniteReturn && result.postRefiCashOnCashPct < 0}
          />
        </div>

        {/* Refi shortfall: new loan < payoff + refi costs. The shortfall is
            already counted in "Cash left in deal" — this names it. */}
        {result.cashNeededAtRefi > 0 && (
          <p className="text-xs font-semibold text-[var(--metric-negative)]">
            Refi shortfall: the new loan doesn&apos;t cover the original loan payoff plus
            refi closing costs — you&apos;d bring {fmt(result.cashNeededAtRefi)} to the refi
            table (included in cash left in deal).
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5">Cash going in</div>
            <Row label="Down payment" value={fmt(result.originalDownPayment)} />
            <Row label="Closing costs" value={fmt(result.originalClosingCosts)} />
            <Row label="Rehab budget" value={fmt(result.rehabBudget)} />
            <Row label="Carrying costs" value={fmt(result.carryingCostsTotal)} />
            <Row label="Total cash invested" value={fmt(result.totalCashInvested)} bold />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5">Refi</div>
            <Row label="New loan amount" value={fmt(result.newLoanAmount)} />
            <Row label="Refi closing costs" value={fmt(result.refiClosingCosts)} />
            {result.cashNeededAtRefi > 0 ? (
              <Row label="Cash needed at refi" value={fmt(result.cashNeededAtRefi)} bold />
            ) : (
              <Row label="Cash returned" value={fmt(result.cashReturnedAtRefi)} bold />
            )}
            <Row label="New monthly payment" value={fmt(result.newMonthlyPayment)} />
            <Row label="Equity created" value={fmt(result.equityCreated)} bold />
          </div>
        </div>
      </div>

      <Link href={handoffHref} target="_top" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
        <Sparkles className="w-4 h-4" />
        Run the full analysis with these numbers — save BRRRRs, compare them, export PDFs — free in TrueCap
        <ArrowUpRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function Money({ label, value, setValue }: { label: string; value: string; setValue: (v: string) => void }) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
        <Input id={id} type="number" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} className="pl-7 border-input bg-background" />
      </div>
    </div>
  );
}
function Pct({ label, value, setValue, step = "0.5" }: { label: string; value: string; setValue: (v: string) => void; step?: string }) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">{label}</Label>
      <div className="relative">
        <Input id={id} type="number" inputMode="decimal" step={step} value={value} onChange={(e) => setValue(e.target.value)} className="pr-8 border-input bg-background" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
      </div>
    </div>
  );
}
function Plain({ label, value, setValue }: { label: string; value: string; setValue: (v: string) => void }) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">{label}</Label>
      <Input id={id} type="number" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} className="border-input bg-background" />
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
    <div className="flex justify-between py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("tabular-nums", bold ? "font-bold text-foreground" : "text-foreground")}>{value}</span>
    </div>
  );
}
