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
import { buildAnalyzerHandoffUrl } from "@/lib/analyzer-handoff";
import { ToolNumberField } from "@/components/tools/tool-number-field";
import { validateToolNumber } from "@/lib/public-tool-validation";

const fmtMoney = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
const fmtPct = (n: number) => `${n.toFixed(2)}%`;

export function ClosingCostCalculatorWidget() {
  const [purchasePrice, setPurchasePrice] = useState("300000");
  // Origination is a LENDER charge quoted against the loan, not the price —
  // "Usually 0.5-1% of the loan amount" per our own
  // /blog/closing-costs-investment-property, which works the example
  // "$250,000 duplex, 25% down ... Loan amount: $187,500 ... origination (1%):
  // $1,875". The widget had no loan or down-payment input at all and multiplied
  // the percentage by the purchase price, overstating the fee by 1/(1-down) —
  // 25% high at 20% down — while disclosing no basis anywhere on the page.
  const [downPaymentPct, setDownPaymentPct] = useState("20");
  const [originationPct, setOriginationPct] = useState("1.0");
  const [titlePct, setTitlePct] = useState("0.5");
  const [recordingFees, setRecordingFees] = useState("250");
  const [transferTaxPct, setTransferTaxPct] = useState("0.5");
  const [insurancePrepay, setInsurancePrepay] = useState("1400");
  const [taxEscrow, setTaxEscrow] = useState("1200");
  const [appraisal, setAppraisal] = useState("550");
  const [inspection, setInspection] = useState("450");

  const validated = useMemo(
    () => ({
      purchasePrice: validateToolNumber(purchasePrice, {
        label: "Purchase price",
        min: 0,
        minExclusive: true,
        max: 100_000_000,
      }),
      downPaymentPct: validateToolNumber(downPaymentPct, {
        label: "Down payment percentage",
        min: 0,
        max: 100,
      }),
      originationPct: validateToolNumber(originationPct, {
        label: "Origination percentage",
        min: 0,
        max: 25,
      }),
      titlePct: validateToolNumber(titlePct, {
        label: "Title insurance percentage",
        min: 0,
        max: 25,
      }),
      recordingFees: validateToolNumber(recordingFees, {
        label: "Recording fees",
        min: 0,
        max: 10_000_000,
      }),
      transferTaxPct: validateToolNumber(transferTaxPct, {
        label: "Transfer tax percentage",
        min: 0,
        max: 25,
      }),
      insurancePrepay: validateToolNumber(insurancePrepay, {
        label: "Insurance prepay",
        min: 0,
        max: 10_000_000,
      }),
      taxEscrow: validateToolNumber(taxEscrow, {
        label: "Tax escrow",
        min: 0,
        max: 10_000_000,
      }),
      appraisal: validateToolNumber(appraisal, {
        label: "Appraisal",
        min: 0,
        max: 10_000_000,
      }),
      inspection: validateToolNumber(inspection, {
        label: "Inspection",
        min: 0,
        max: 10_000_000,
      }),
    }),
    [
      appraisal,
      downPaymentPct,
      inspection,
      insurancePrepay,
      originationPct,
      purchasePrice,
      recordingFees,
      taxEscrow,
      titlePct,
      transferTaxPct,
    ]
  );

  const result = useMemo(() => {
    if (
      !validated.purchasePrice.ok ||
      !validated.downPaymentPct.ok ||
      !validated.originationPct.ok ||
      !validated.titlePct.ok ||
      !validated.recordingFees.ok ||
      !validated.transferTaxPct.ok ||
      !validated.insurancePrepay.ok ||
      !validated.taxEscrow.ok ||
      !validated.appraisal.ok ||
      !validated.inspection.ok
    ) {
      return null;
    }

    const price = validated.purchasePrice.value;
    // Origination is charged on the LOAN; title insurance and transfer tax are
    // charged on the PRICE. Keeping the two bases distinct is the whole point
    // of adding a down-payment input.
    const loanAmount = price * (1 - validated.downPaymentPct.value / 100);
    const origination = (loanAmount * validated.originationPct.value) / 100;
    const title = (price * validated.titlePct.value) / 100;
    const recording = validated.recordingFees.value;
    const transfer = (price * validated.transferTaxPct.value) / 100;
    const insurance = validated.insurancePrepay.value;
    const taxes = validated.taxEscrow.value;
    const appr = validated.appraisal.value;
    const inspect = validated.inspection.value;
    const total = origination + title + recording + transfer + insurance + taxes + appr + inspect;
    const pctOfPrice = (total / price) * 100;
    return { loanAmount, origination, title, recording, transfer, insurance, taxes, appr, inspect, total, pctOfPrice };
  }, [validated]);

  const verdict = !result
    ? null
    : result.pctOfPrice < 2
      ? "Modeled costs below 2%"
      : result.pctOfPrice < 4
        ? "Modeled costs from 2% to 4%"
        : result.pctOfPrice < 6
          ? "Modeled costs from 4% to 6%"
          : "Modeled costs of 6% or more — verify";
  const verdictColor = !result
    ? "text-muted-foreground"
    : result.pctOfPrice >= 6
      ? "text-amber-700"
      : "text-foreground";

  // Carry the user's purchase price into the full analyzer (P2-2 handoff).
  const handoffHref = buildAnalyzerHandoffUrl(
    validated.purchasePrice.ok ? { purchasePrice: validated.purchasePrice.value } : {},
    { utmSource: "closing-cost-calculator" }
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <ToolNumberField id="cc-price" label="Purchase price" prefix="$" min={0.01} max={100_000_000} value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} error={validated.purchasePrice.error} />

      <p className="mt-6 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Loan + title fees</p>
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ToolNumberField id="cc-down" label="Down payment" suffix="%" min={0} max={100} step={1} value={downPaymentPct} onChange={(e) => setDownPaymentPct(e.target.value)} error={validated.downPaymentPct.error} labelClassName="normal-case tracking-normal font-medium" />
        <ToolNumberField id="cc-orig" label="Origination (% of loan)" suffix="%" min={0} max={25} step={0.1} value={originationPct} onChange={(e) => setOriginationPct(e.target.value)} error={validated.originationPct.error} labelClassName="normal-case tracking-normal font-medium" />
        <ToolNumberField id="cc-title" label="Title insurance" suffix="%" min={0} max={25} step={0.1} value={titlePct} onChange={(e) => setTitlePct(e.target.value)} error={validated.titlePct.error} labelClassName="normal-case tracking-normal font-medium" />
        <ToolNumberField id="cc-record" label="Recording fees" prefix="$" min={0} max={10_000_000} value={recordingFees} onChange={(e) => setRecordingFees(e.target.value)} error={validated.recordingFees.error} labelClassName="normal-case tracking-normal font-medium" />
        <ToolNumberField id="cc-transfer" label="Transfer tax" suffix="%" min={0} max={25} step={0.1} value={transferTaxPct} onChange={(e) => setTransferTaxPct(e.target.value)} error={validated.transferTaxPct.error} labelClassName="normal-case tracking-normal font-medium" />
      </div>

      <p className="mt-6 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Prepaid items + due diligence</p>
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ToolNumberField id="cc-ins" label="Insurance prepay" prefix="$" min={0} max={10_000_000} value={insurancePrepay} onChange={(e) => setInsurancePrepay(e.target.value)} error={validated.insurancePrepay.error} labelClassName="normal-case tracking-normal font-medium" />
        <ToolNumberField id="cc-tax" label="Tax escrow" prefix="$" min={0} max={10_000_000} value={taxEscrow} onChange={(e) => setTaxEscrow(e.target.value)} error={validated.taxEscrow.error} labelClassName="normal-case tracking-normal font-medium" />
        <ToolNumberField id="cc-appr" label="Appraisal" prefix="$" min={0} max={10_000_000} value={appraisal} onChange={(e) => setAppraisal(e.target.value)} error={validated.appraisal.error} labelClassName="normal-case tracking-normal font-medium" />
        <ToolNumberField id="cc-inspect" label="Inspection" prefix="$" min={0} max={10_000_000} value={inspection} onChange={(e) => setInspection(e.target.value)} error={validated.inspection.error} labelClassName="normal-case tracking-normal font-medium" />
      </div>

      <div className="mt-6 rounded-xl border border-border bg-muted/30 p-5">
        <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {result && verdict
            ? `${verdict}. Total modeled closing costs ${fmtMoney(result.total)}, or ${fmtPct(result.pctOfPrice)} of purchase price.`
            : "Fix the highlighted inputs to calculate modeled closing costs."}
        </span>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Total closing costs</p>
        <p className={cn("mt-1 text-4xl font-extrabold tabular-nums", verdictColor)}>{result ? fmtMoney(result.total) : "—"}</p>
        <p className="mt-1 text-sm text-muted-foreground tabular-nums">
          {result && verdict ? <>{fmtPct(result.pctOfPrice)} of purchase price · <span className={cn("font-semibold", verdictColor)}>{verdict}</span></> : "Fix the highlighted inputs to calculate"}
        </p>
        {result ? (
          <details className="mt-3 group">
            <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-md text-xs font-semibold text-muted-foreground hover:text-foreground">Breakdown</summary>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground tabular-nums">
              {/* State the loan the origination is charged against. Without it
                  the reader cannot tell which basis the fee used, which is how
                  the price-based version went unnoticed. */}
              <li className="flex justify-between"><span>Loan amount</span><span>{fmtMoney(result.loanAmount)}</span></li>
              <li className="flex justify-between"><span>Origination (on loan)</span><span>{fmtMoney(result.origination)}</span></li>
              <li className="flex justify-between"><span>Title insurance</span><span>{fmtMoney(result.title)}</span></li>
              <li className="flex justify-between"><span>Recording fees</span><span>{fmtMoney(result.recording)}</span></li>
              <li className="flex justify-between"><span>Transfer tax</span><span>{fmtMoney(result.transfer)}</span></li>
              <li className="flex justify-between"><span>Insurance prepay</span><span>{fmtMoney(result.insurance)}</span></li>
              <li className="flex justify-between"><span>Tax escrow</span><span>{fmtMoney(result.taxes)}</span></li>
              <li className="flex justify-between"><span>Appraisal</span><span>{fmtMoney(result.appr)}</span></li>
              <li className="flex justify-between"><span>Inspection</span><span>{fmtMoney(result.inspect)}</span></li>
            </ul>
          </details>
        ) : null}
      </div>

      <Link
        href={handoffHref} target="_top"
        className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-bold text-primary hover:underline"
      >
        <Sparkles className="w-4 h-4" />
        Run the full analysis with these numbers — cash flow, cash-to-close, returns — free
        <ArrowUpRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
