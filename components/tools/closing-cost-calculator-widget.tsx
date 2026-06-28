"use client";

/**
 * Standalone closing cost calculator widget.
 *
 * Closing costs on investment property typically run 2-5% of purchase
 * price. The widget lets users adjust each line item (origination,
 * title, recording, taxes, escrow, prepaid items) to see how the
 * total moves.
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

export function ClosingCostCalculatorWidget() {
  const [purchasePrice, setPurchasePrice] = useState("300000");
  const [originationPct, setOriginationPct] = useState("1.0");
  const [titlePct, setTitlePct] = useState("0.5");
  const [recordingFees, setRecordingFees] = useState("250");
  const [transferTaxPct, setTransferTaxPct] = useState("0.5");
  const [insurancePrepay, setInsurancePrepay] = useState("1400");
  const [taxEscrow, setTaxEscrow] = useState("1200");
  const [appraisal, setAppraisal] = useState("550");
  const [inspection, setInspection] = useState("450");

  const result = useMemo(() => {
    const price = num(purchasePrice);
    const origination = (price * num(originationPct)) / 100;
    const title = (price * num(titlePct)) / 100;
    const recording = num(recordingFees);
    const transfer = (price * num(transferTaxPct)) / 100;
    const insurance = num(insurancePrepay);
    const taxes = num(taxEscrow);
    const appr = num(appraisal);
    const inspect = num(inspection);
    const total = origination + title + recording + transfer + insurance + taxes + appr + inspect;
    const pctOfPrice = price > 0 ? (total / price) * 100 : 0;
    return { origination, title, recording, transfer, insurance, taxes, appr, inspect, total, pctOfPrice };
  }, [purchasePrice, originationPct, titlePct, recordingFees, transferTaxPct, insurancePrepay, taxEscrow, appraisal, inspection]);

  const verdict = result.pctOfPrice < 2 ? "Low" : result.pctOfPrice < 4 ? "Typical" : result.pctOfPrice < 6 ? "High" : "Very high";
  const verdictColor = result.pctOfPrice < 4 ? "text-[var(--metric-positive)]" : "text-amber-600";

  // Carry the user's purchase price into the full analyzer (P2-2 handoff).
  const handoffHref = buildAnalyzerHandoffUrl(
    { purchasePrice: num(purchasePrice) },
    { utmSource: "closing-cost-calculator" }
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div>
        <Label htmlFor="cc-price" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Purchase price</Label>
        <div className="mt-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
          <Input id="cc-price" type="number" inputMode="decimal" min="0"
            value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} className="pl-7" />
        </div>
      </div>

      <p className="mt-6 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Loan + title fees</p>
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cc-orig" className="text-xs text-muted-foreground">Origination (%)</Label>
          <Input id="cc-orig" type="number" inputMode="decimal" min="0" step="0.1"
            value={originationPct} onChange={(e) => setOriginationPct(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="cc-title" className="text-xs text-muted-foreground">Title insurance (%)</Label>
          <Input id="cc-title" type="number" inputMode="decimal" min="0" step="0.1"
            value={titlePct} onChange={(e) => setTitlePct(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="cc-record" className="text-xs text-muted-foreground">Recording fees ($)</Label>
          <Input id="cc-record" type="number" inputMode="decimal" min="0"
            value={recordingFees} onChange={(e) => setRecordingFees(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="cc-transfer" className="text-xs text-muted-foreground">Transfer tax (%)</Label>
          <Input id="cc-transfer" type="number" inputMode="decimal" min="0" step="0.1"
            value={transferTaxPct} onChange={(e) => setTransferTaxPct(e.target.value)} />
        </div>
      </div>

      <p className="mt-6 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Prepaid items + due diligence</p>
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cc-ins" className="text-xs text-muted-foreground">Insurance prepay ($)</Label>
          <Input id="cc-ins" type="number" inputMode="decimal" min="0"
            value={insurancePrepay} onChange={(e) => setInsurancePrepay(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="cc-tax" className="text-xs text-muted-foreground">Tax escrow ($)</Label>
          <Input id="cc-tax" type="number" inputMode="decimal" min="0"
            value={taxEscrow} onChange={(e) => setTaxEscrow(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="cc-appr" className="text-xs text-muted-foreground">Appraisal ($)</Label>
          <Input id="cc-appr" type="number" inputMode="decimal" min="0"
            value={appraisal} onChange={(e) => setAppraisal(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="cc-inspect" className="text-xs text-muted-foreground">Inspection ($)</Label>
          <Input id="cc-inspect" type="number" inputMode="decimal" min="0"
            value={inspection} onChange={(e) => setInspection(e.target.value)} />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-muted/30 p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Total closing costs</p>
        <p className={cn("mt-1 text-4xl font-extrabold tabular-nums", verdictColor)}>{fmtMoney(result.total)}</p>
        <p className="mt-1 text-sm text-muted-foreground tabular-nums">{fmtPct(result.pctOfPrice)} of purchase price · <span className={cn("font-semibold", verdictColor)}>{verdict}</span></p>
        <details className="mt-3 group">
          <summary className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground">Breakdown</summary>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground tabular-nums">
            <li className="flex justify-between"><span>Origination</span><span>{fmtMoney(result.origination)}</span></li>
            <li className="flex justify-between"><span>Title insurance</span><span>{fmtMoney(result.title)}</span></li>
            <li className="flex justify-between"><span>Recording fees</span><span>{fmtMoney(result.recording)}</span></li>
            <li className="flex justify-between"><span>Transfer tax</span><span>{fmtMoney(result.transfer)}</span></li>
            <li className="flex justify-between"><span>Insurance prepay</span><span>{fmtMoney(result.insurance)}</span></li>
            <li className="flex justify-between"><span>Tax escrow</span><span>{fmtMoney(result.taxes)}</span></li>
            <li className="flex justify-between"><span>Appraisal</span><span>{fmtMoney(result.appr)}</span></li>
            <li className="flex justify-between"><span>Inspection</span><span>{fmtMoney(result.inspect)}</span></li>
          </ul>
        </details>
      </div>

      <Link
        href={handoffHref} target="_top"
        className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
      >
        <Sparkles className="w-4 h-4" />
        Run the full analysis with these numbers — cash flow, cash-to-close, returns — free
        <ArrowUpRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
