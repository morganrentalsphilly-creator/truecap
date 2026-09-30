/**
 * The Verdict Ledger, closed: the homepage hero's visual (DESIGN.md "The
 * ledger as the hero"). Price, the binding row on the band, DSCR, the pass or
 * miss against the Buy Box, and the Offer Ceiling over its double rule, for the
 * sample deal at asking and at the ceiling. Every figure comes from
 * lib/sample-deal-ledger.ts, which reads the engine; nothing is typed here.
 */

import Link from "next/link";
import type { SampleDealLedger } from "@/lib/sample-deal-ledger";
import { formatLedgerDollars } from "@/lib/sample-deal-ledger";
import { formatDscr } from "@/lib/financial-presentation";
import {
  LEDGER_FIGURE_COLUMN,
  LedgerCaption,
  LedgerFigure,
  LedgerTotal,
  LedgerVerdict,
} from "@/components/ledger/ledger-parts";
import { ScrollX } from "@/components/ui/scroll-x";
import { cn } from "@/lib/utils";

const cell = "py-3 align-top sm:py-3.5";
const figure = "text-right text-[15px] sm:text-lg lg:text-xl";

export function VerdictLedger({
  ledger,
  walkthroughHref,
}: {
  ledger: SampleDealLedger;
  /** Where "open every row" goes: the walkthrough section on the same page. */
  walkthroughHref?: string;
}) {
  const cashFlowTarget = ledger.target.monthlyCashFlow;
  const dscrTarget = ledger.target.dscr;
  return (
    <figure
      data-hero-ledger=""
      className="min-w-0"
      aria-labelledby="hero-ledger-caption"
    >
      <LedgerCaption
        id="hero-ledger-caption"
        title={ledger.title}
        note="Sample deal · every input editable"
      />
      {/* A three-column figure table cannot reflow below about 260px (a
          390px phone at 200% zoom); there it scrolls inside its own
          keyboard-reachable region instead of pushing the page sideways
          (WCAG 1.4.10 exempts data tables from reflow). */}
      <ScrollX label="The sample deal at asking and at the Offer Ceiling">
        <table className="w-full border-collapse text-[15px] sm:text-base lg:text-[17px]">
          <caption className="sr-only">
            The sample deal at its asking price and at its Offer Ceiling
          </caption>
          <thead>
            <tr className="border-b border-border text-[13px] text-muted-foreground sm:text-[15px]">
              <th scope="col" className="py-2.5 text-left font-semibold">
                <span className="sr-only">Line item</span>
              </th>
              <th
                scope="col"
                className={cn(
                  LEDGER_FIGURE_COLUMN,
                  "py-2.5 pl-2 text-right font-semibold",
                )}
              >
                At asking
              </th>
              <th
                scope="col"
                className={cn(
                  LEDGER_FIGURE_COLUMN,
                  "py-2.5 pl-2 text-right font-semibold",
                )}
              >
                At the Offer Ceiling
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-rule-soft">
              <th
                scope="row"
                className={cn(cell, "pr-2 text-left font-medium")}
              >
                Price
              </th>
              <td className={cn(cell, figure, "pl-2")}>
                <LedgerFigure>
                  {formatLedgerDollars(ledger.askingPrice)}
                </LedgerFigure>
              </td>
              <td className={cn(cell, figure, "pl-2")}>
                <LedgerFigure>
                  {formatLedgerDollars(ledger.offerCeiling)}
                </LedgerFigure>
              </td>
            </tr>
            <tr className="border-b border-rule-soft bg-band">
              <th
                scope="row"
                className={cn(
                  cell,
                  "pr-2 text-left font-medium shadow-[-0.5rem_0_0_var(--band)]",
                )}
              >
                Cash flow after reserves
                {cashFlowTarget != null ? (
                  <span className="block text-[13px] font-normal text-muted-foreground sm:text-sm">
                    Target ≥ {formatLedgerDollars(cashFlowTarget)}/mo
                  </span>
                ) : null}
              </th>
              <td className={cn(cell, figure, "pl-2")}>
                <LedgerFigure>
                  {formatLedgerDollars(ledger.cashFlowMonthly.asking)}/mo
                </LedgerFigure>
              </td>
              <td
                className={cn(
                  cell,
                  figure,
                  "pl-2 shadow-[0.5rem_0_0_var(--band)]",
                )}
              >
                <LedgerFigure>
                  {formatLedgerDollars(ledger.cashFlowMonthly.ceiling)}/mo
                </LedgerFigure>
                {ledger.bindingTarget ? (
                  <span className="block font-sans text-xs text-muted-foreground sm:text-[13px]">
                    binding target
                  </span>
                ) : null}
              </td>
            </tr>
            <tr className="border-b border-rule-soft">
              <th
                scope="row"
                className={cn(cell, "pr-2 text-left font-medium")}
              >
                DSCR
                {dscrTarget != null ? (
                  <span className="block text-[13px] font-normal text-muted-foreground sm:text-sm">
                    Target ≥ {dscrTarget}
                  </span>
                ) : null}
              </th>
              <td className={cn(cell, figure, "pl-2")}>
                <LedgerFigure>
                  {formatDscr(ledger.dscr.asking, true)}
                </LedgerFigure>
              </td>
              <td className={cn(cell, figure, "pl-2")}>
                <LedgerFigure>
                  {formatDscr(ledger.dscr.ceiling, true)}
                </LedgerFigure>
              </td>
            </tr>
            <tr>
              <th
                scope="row"
                className={cn(cell, "pr-2 text-left font-medium")}
              >
                Meets the Buy Box
              </th>
              <td className={cn(cell, "pl-2 text-right")}>
                <LedgerVerdict pass={ledger.meetsTargets.asking}>
                  {ledger.meetsTargets.asking ? "Yes" : "No"}
                </LedgerVerdict>
              </td>
              <td className={cn(cell, "pl-2 text-right")}>
                <LedgerVerdict pass={ledger.meetsTargets.ceiling}>
                  {ledger.meetsTargets.ceiling ? "Yes" : "No"}
                </LedgerVerdict>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t border-foreground">
              <th
                scope="row"
                className="pb-3 pt-4 text-left align-bottom font-display text-xl sm:text-2xl lg:text-[28px]"
              >
                Offer Ceiling
              </th>
              <td colSpan={2} className="pb-3 pt-3 text-right">
                <LedgerTotal draw className="text-key-sm lg:text-key">
                  {formatLedgerDollars(ledger.offerCeiling)}
                </LedgerTotal>
              </td>
            </tr>
          </tfoot>
        </table>
      </ScrollX>
      {/* docs/voice.md: state the gap in dollars, never a vague "misses". */}
      <p className="mt-3 text-sm text-muted-foreground sm:text-[15px]">
        {ledger.belowAsking > 0
          ? `Asking price is ${formatLedgerDollars(ledger.belowAsking)} above the ceiling.`
          : "Asking price clears the sample targets."}
        {ledger.bindingTarget
          ? ` Binding target: ${ledger.bindingTarget}.`
          : null}
      </p>
      {walkthroughHref ? (
        <p className="text-sm sm:text-[15px]">
          <Link
            href={walkthroughHref}
            className="tc-link inline-flex min-h-11 items-center"
          >
            Open every row and show the arithmetic
          </Link>
        </p>
      ) : null}
    </figure>
  );
}
