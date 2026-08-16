"use client";

/**
 * Standalone rental property ROI calculator widget.
 *
 *   Total ROI = (Annual cash flow + Annual principal paydown + Annual
 *                appreciation) ÷ Total cash invested
 *
 * Captures the FULL return story — not just cash flow, not just
 * appreciation. The actual investor-grade ROI number.
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
const fmtPct = (n: number) => `${n.toFixed(2)}%`;

function classify(roi: number): { label: string; color: string; note: string } {
  if (!Number.isFinite(roi) || roi === 0) {
    return { label: "Invalid", color: "text-muted-foreground", note: "Enter positive cash invested above 0." };
  }
  if (roi < 0) return { label: "Negative", color: "text-[var(--metric-negative)]", note: "Losing money — review assumptions." };
  if (roi >= 18) return { label: "Excellent", color: "text-[var(--metric-positive)]", note: "Top-decile leveraged return." };
  if (roi >= 12) return { label: "Strong", color: "text-[var(--metric-positive)]", note: "Solid combined return on capital." };
  if (roi >= 8) return { label: "Decent", color: "text-foreground", note: "Reasonable return; better than most index funds." };
  if (roi >= 4) return { label: "Weak", color: "text-amber-700", note: "Bond-like return — better than nothing but not why you invest in rentals." };
  return { label: "Poor", color: "text-amber-700", note: "Less than bonds. Don't deploy capital here unless there's a non-financial reason." };
}

export function RoiCalculatorWidget() {
  const [purchasePrice, setPurchasePrice] = useState("300000");
  const [cashInvested, setCashInvested] = useState("75000");
  const [annualCashFlow, setAnnualCashFlow] = useState("5400");
  const [annualPrincipalPaydown, setAnnualPrincipalPaydown] = useState("3200");
  const [appreciationRate, setAppreciationRate] = useState("3.5");

  const result = useMemo(() => {
    const cash = num(cashInvested);
    const cf = num(annualCashFlow);
    const principal = num(annualPrincipalPaydown);
    const apprPct = num(appreciationRate);
    const apprAmt = (num(purchasePrice) * apprPct) / 100;
    const totalReturn = cf + principal + apprAmt;
    if (cash <= 0) return { totalReturn, roi: NaN, cashFlowPct: NaN, principalPct: NaN, apprPct: NaN, apprAmt };
    return {
      totalReturn,
      roi: (totalReturn / cash) * 100,
      cashFlowPct: (cf / cash) * 100,
      principalPct: (principal / cash) * 100,
      apprPct: (apprAmt / cash) * 100,
      apprAmt,
    };
  }, [purchasePrice, cashInvested, annualCashFlow, annualPrincipalPaydown, appreciationRate]);

  const verdict = classify(result.roi);

  // Carry the user's purchase price into the full analyzer (P2-2 handoff).
  // This widget collects an annual cash-flow figure, not a monthly rent, so
  // only the purchase price maps cleanly onto the analyzer's inputs.
  const handoffHref = buildAnalyzerHandoffUrl(
    { purchasePrice: num(purchasePrice) },
    { utmSource: "roi-calculator" }
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="roi-price" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Purchase price</Label>
          <div className="mt-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input id="roi-price" type="number" inputMode="decimal" min="0"
              value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} className="pl-7" />
          </div>
        </div>
        <div>
          <Label htmlFor="roi-cash" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total cash invested</Label>
          <div className="mt-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input id="roi-cash" type="number" inputMode="decimal" min="0"
              value={cashInvested} onChange={(e) => setCashInvested(e.target.value)} className="pl-7" />
          </div>
        </div>
        <div>
          <Label htmlFor="roi-cf" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Annual cash flow</Label>
          <div className="mt-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input id="roi-cf" type="number" inputMode="decimal"
              value={annualCashFlow} onChange={(e) => setAnnualCashFlow(e.target.value)} className="pl-7" />
          </div>
        </div>
        <div>
          <Label htmlFor="roi-principal" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Annual principal paydown</Label>
          <div className="mt-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input id="roi-principal" type="number" inputMode="decimal" min="0"
              value={annualPrincipalPaydown} onChange={(e) => setAnnualPrincipalPaydown(e.target.value)} className="pl-7" />
          </div>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="roi-appr" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Appreciation rate (%/yr)</Label>
          <div className="mt-1 relative">
            <Input id="roi-appr" type="number" inputMode="decimal" min="0" step="0.1"
              value={appreciationRate} onChange={(e) => setAppreciationRate(e.target.value)} className="pr-8" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Historical US average ~3.5%; varies dramatically by market.</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-muted/30 p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Total ROI</p>
        <p className={cn("mt-1 text-4xl font-extrabold tabular-nums", verdict.color)}>{Number.isFinite(result.roi) ? fmtPct(result.roi) : "—"}</p>
        <p className="mt-1 text-sm text-muted-foreground tabular-nums">{fmtMoney(result.totalReturn)} annual return on cash invested</p>
        <div className="mt-4 grid grid-cols-3 gap-3 text-[11px]">
          <div>
            <p className="font-bold uppercase tracking-widest text-muted-foreground">Cash flow</p>
            <p className="mt-1 text-base font-bold text-foreground tabular-nums">{Number.isFinite(result.cashFlowPct) ? fmtPct(result.cashFlowPct) : "—"}</p>
          </div>
          <div>
            <p className="font-bold uppercase tracking-widest text-muted-foreground">Principal</p>
            <p className="mt-1 text-base font-bold text-foreground tabular-nums">{Number.isFinite(result.principalPct) ? fmtPct(result.principalPct) : "—"}</p>
          </div>
          <div>
            <p className="font-bold uppercase tracking-widest text-muted-foreground">Appreciation</p>
            <p className="mt-1 text-base font-bold text-foreground tabular-nums">{Number.isFinite(result.apprPct) ? fmtPct(result.apprPct) : "—"}</p>
          </div>
        </div>
        <p className="mt-4 text-sm">
          <span className={cn("font-bold", verdict.color)}>{verdict.label}.</span>{" "}
          <span className="text-muted-foreground">{verdict.note}</span>
        </p>
      </div>

      <Link
        href={handoffHref} target="_top"
        className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
      >
        <Sparkles className="w-4 h-4" />
        Open the free core deal screen for cash flow and DSCR — Pro adds 10-year, tax, and exit outputs
        <ArrowUpRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
