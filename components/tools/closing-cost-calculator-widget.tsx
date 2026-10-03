"use client";

/**
 * Standalone closing cost calculator widget.
 *
 * The widget lets users adjust each line item (origination,
 * title, recording, taxes, escrow, prepaid items) to see how the
 * total moves.
 *
 * Set on the calculator parts (components/tools/tool-parts.tsx), like the 1%
 * rule widget: the frame opens on the 2px ink rule with no card, the fields
 * are the shared ToolNumberField, the total is the key figure in DM Mono
 * over the double rule, in ink, the breakdown is rows on rules, and the
 * analyzer handoff is one plain button with a line under it.
 */

import { useMemo, useState } from "react";
import { AnalyzerHandoffLink } from "@/components/analyzer-handoff-link";
import {
  DisclosureMark,
  LedgerFigure,
  LedgerTotal,
} from "@/components/ledger/ledger-parts";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildAnalyzerHandoffUrl } from "@/lib/analyzer-handoff";
import { ToolNumberField } from "@/components/tools/tool-number-field";
import { ToolFrame } from "@/components/tools/tool-parts";
import { validateToolNumber } from "@/lib/public-tool-validation";

const fmtMoney = (n: number) =>
  `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
const fmtPct = (n: number) => `${n.toFixed(2)}%`;

// One column on a phone, two once the frame itself is 24rem wide (@container:
// the hero column on the tool page, a partner's iframe on /embed).
const FIELD_GRID_CLASS =
  "mt-3 grid grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-5 @sm:grid-cols-2";
// A breakdown line: the item, then its amount in DM Mono, on a soft rule.
const BREAKDOWN_ROW_CLASS =
  "flex justify-between gap-3 border-b border-rule-soft py-2";

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
    ],
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
    const total =
      origination +
      title +
      recording +
      transfer +
      insurance +
      taxes +
      appr +
      inspect;
    const pctOfPrice = (total / price) * 100;
    return {
      loanAmount,
      origination,
      title,
      recording,
      transfer,
      insurance,
      taxes,
      appr,
      inspect,
      total,
      pctOfPrice,
    };
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
      ? "text-caution-text"
      : "text-foreground";

  // Carry the user's purchase price into the full analyzer (P2-2 handoff).
  const handoffHref = buildAnalyzerHandoffUrl(
    validated.purchasePrice.ok
      ? { purchasePrice: validated.purchasePrice.value }
      : {},
    { utmSource: "closing-cost-calculator" },
  );

  return (
    <ToolFrame>
      <ToolNumberField
        id="cc-price"
        label="Purchase price"
        prefix="$"
        min={0.01}
        max={100_000_000}
        value={purchasePrice}
        onChange={(e) => setPurchasePrice(e.target.value)}
        error={validated.purchasePrice.error}
      />

      <p className="mt-8 text-base font-semibold text-foreground">
        Loan + title fees
      </p>
      <div className={FIELD_GRID_CLASS}>
        <ToolNumberField
          id="cc-down"
          label="Down payment"
          suffix="%"
          min={0}
          max={100}
          step={1}
          value={downPaymentPct}
          onChange={(e) => setDownPaymentPct(e.target.value)}
          error={validated.downPaymentPct.error}
        />
        <ToolNumberField
          id="cc-orig"
          label="Origination (% of loan)"
          suffix="%"
          min={0}
          max={25}
          step={0.1}
          value={originationPct}
          onChange={(e) => setOriginationPct(e.target.value)}
          error={validated.originationPct.error}
        />
        <ToolNumberField
          id="cc-title"
          label="Title insurance"
          suffix="%"
          min={0}
          max={25}
          step={0.1}
          value={titlePct}
          onChange={(e) => setTitlePct(e.target.value)}
          error={validated.titlePct.error}
        />
        <ToolNumberField
          id="cc-record"
          label="Recording fees"
          prefix="$"
          min={0}
          max={10_000_000}
          value={recordingFees}
          onChange={(e) => setRecordingFees(e.target.value)}
          error={validated.recordingFees.error}
        />
        <ToolNumberField
          id="cc-transfer"
          label="Transfer tax"
          suffix="%"
          min={0}
          max={25}
          step={0.1}
          value={transferTaxPct}
          onChange={(e) => setTransferTaxPct(e.target.value)}
          error={validated.transferTaxPct.error}
        />
      </div>

      <p className="mt-8 text-base font-semibold text-foreground">
        Prepaid items + due diligence
      </p>
      <div className={FIELD_GRID_CLASS}>
        <ToolNumberField
          id="cc-ins"
          label="Insurance prepay"
          prefix="$"
          min={0}
          max={10_000_000}
          value={insurancePrepay}
          onChange={(e) => setInsurancePrepay(e.target.value)}
          error={validated.insurancePrepay.error}
        />
        <ToolNumberField
          id="cc-tax"
          label="Tax escrow"
          prefix="$"
          min={0}
          max={10_000_000}
          value={taxEscrow}
          onChange={(e) => setTaxEscrow(e.target.value)}
          error={validated.taxEscrow.error}
        />
        <ToolNumberField
          id="cc-appr"
          label="Appraisal"
          prefix="$"
          min={0}
          max={10_000_000}
          value={appraisal}
          onChange={(e) => setAppraisal(e.target.value)}
          error={validated.appraisal.error}
        />
        <ToolNumberField
          id="cc-inspect"
          label="Inspection"
          prefix="$"
          min={0}
          max={10_000_000}
          value={inspection}
          onChange={(e) => setInspection(e.target.value)}
          error={validated.inspection.error}
        />
      </div>

      {/* The result opens on the rule under the fields. */}
      <div className="mt-8 border-t border-border pt-5">
        {/* One polite status line when the result changes, for screen
            readers. The figure block is therefore not ToolResult, whose own
            live region would read the result a second time. */}
        <span
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {result && verdict
            ? `${verdict}. Total modeled closing costs ${fmtMoney(result.total)}, or ${fmtPct(result.pctOfPrice)} of purchase price.`
            : "Fix the highlighted inputs to calculate modeled closing costs."}
        </span>
        <p className="text-sm leading-snug font-semibold text-foreground">
          Total closing costs
        </p>
        {/* The key figure in DM Mono over the double rule, in ink (Ink 2 for
            the placeholder); the caution color stays on the line under it.
            The color sits on the line, not on LedgerTotal (see ToolResult). */}
        <p
          className={cn(
            "mt-3 wrap-anywhere",
            result ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <LedgerTotal className="text-key-sm sm:text-key">
            {result ? fmtMoney(result.total) : "—"}
          </LedgerTotal>
        </p>
        <p className="mt-4 max-w-[46ch] text-pretty text-base leading-relaxed text-muted-foreground">
          {result && verdict ? (
            <>
              <LedgerFigure>{fmtPct(result.pctOfPrice)}</LedgerFigure> of
              purchase price ·{" "}
              <span className={cn("font-semibold", verdictColor)}>
                {verdict}
              </span>
            </>
          ) : (
            "Fix the highlighted inputs to calculate"
          )}
        </p>
        {result ? (
          <details className="group mt-3">
            <summary className="flex min-h-12 max-w-md cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-foreground [&::-webkit-details-marker]:hidden">
              Breakdown
              <DisclosureMark />
            </summary>
            <ul className="max-w-md border-t border-border text-sm text-muted-foreground">
              {/* State the loan the origination is charged against. Without it
                  the reader cannot tell which basis the fee used, which is how
                  the price-based version went unnoticed. */}
              <li className={BREAKDOWN_ROW_CLASS}>
                <span>Loan amount</span>
                <LedgerFigure className="text-foreground">{fmtMoney(result.loanAmount)}</LedgerFigure>
              </li>
              <li className={BREAKDOWN_ROW_CLASS}>
                <span>Origination (on loan)</span>
                <LedgerFigure className="text-foreground">{fmtMoney(result.origination)}</LedgerFigure>
              </li>
              <li className={BREAKDOWN_ROW_CLASS}>
                <span>Title insurance</span>
                <LedgerFigure className="text-foreground">{fmtMoney(result.title)}</LedgerFigure>
              </li>
              <li className={BREAKDOWN_ROW_CLASS}>
                <span>Recording fees</span>
                <LedgerFigure className="text-foreground">{fmtMoney(result.recording)}</LedgerFigure>
              </li>
              <li className={BREAKDOWN_ROW_CLASS}>
                <span>Transfer tax</span>
                <LedgerFigure className="text-foreground">{fmtMoney(result.transfer)}</LedgerFigure>
              </li>
              <li className={BREAKDOWN_ROW_CLASS}>
                <span>Insurance prepay</span>
                <LedgerFigure className="text-foreground">{fmtMoney(result.insurance)}</LedgerFigure>
              </li>
              <li className={BREAKDOWN_ROW_CLASS}>
                <span>Tax escrow</span>
                <LedgerFigure className="text-foreground">{fmtMoney(result.taxes)}</LedgerFigure>
              </li>
              <li className={BREAKDOWN_ROW_CLASS}>
                <span>Appraisal</span>
                <LedgerFigure className="text-foreground">{fmtMoney(result.appr)}</LedgerFigure>
              </li>
              <li className={BREAKDOWN_ROW_CLASS}>
                <span>Inspection</span>
                <LedgerFigure className="text-foreground">{fmtMoney(result.inspect)}</LedgerFigure>
              </li>
            </ul>
          </details>
        ) : null}
      </div>

      {/* The action is one plain button (the 1% rule widget's pattern), 48px
          and full width on phones; what the analysis adds is the line under
          it, which aria-describedby reads with the link. The words are the
          old text link's, split where its first dash was. */}
      <AnalyzerHandoffLink
        handoffHref={handoffHref}
        target="_top"
        aria-describedby="cc-handoff-note"
        className={cn(buttonVariants({ size: "cta" }), "mt-6 w-full sm:w-auto")}
      >
        Run the full analysis with these numbers
      </AnalyzerHandoffLink>
      <p
        id="cc-handoff-note"
        className="mt-2 text-pretty text-sm text-muted-foreground"
      >
        cash flow, cash-to-close, returns — free
      </p>
    </ToolFrame>
  );
}
