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

/** "Cash flow ≥ $750/mo" reads "cash flow ≥ $750/mo" mid-sentence; an
 * acronym ("DSCR ≥ 1.25") keeps its capitals. */
function inSentence(label: string): string {
  return /^[A-Z][a-z]/.test(label) ? label[0].toLowerCase() + label.slice(1) : label;
}
const figure = "text-right text-base sm:text-lg lg:text-xl";

export function VerdictLedger({
  ledger,
  walkthroughHref,
}: {
  ledger: SampleDealLedger;
  /** Where the walkthrough link goes: the opened ledger on the same page. */
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
      {/* 0.5rem wider than the table on each side, so the binding row's band
          can bleed past the rules without the scroll box clipping it. */}
      <ScrollX
        label="The sample deal at asking and at the Offer Ceiling"
        className="-mx-2 px-2"
      >
        <table className="w-full border-collapse text-base lg:text-lg">
          <caption className="sr-only">
            The sample deal at its asking price and at its Offer Ceiling
          </caption>
          <thead>
            <tr className="border-b border-border text-sm text-muted-foreground sm:text-base lg:text-sm xl:text-base">
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
                  "ledger-bleed-start pr-2 text-left font-medium",
                )}
              >
                Cash flow after reserves{" "}
                {cashFlowTarget != null ? (
                  <span className="block text-sm font-normal text-muted-foreground">
                    Target ≥&nbsp;{formatLedgerDollars(cashFlowTarget)}/mo
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
                  "ledger-bleed-end pl-2",
                )}
              >
                <LedgerFigure>
                  {formatLedgerDollars(ledger.cashFlowMonthly.ceiling)}/mo
                </LedgerFigure>
                {ledger.bindingTarget ? (
                  <span className="block font-sans text-sm text-muted-foreground">
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
                DSCR{" "}
                {dscrTarget != null ? (
                  <span className="block text-sm font-normal text-muted-foreground">
                    Target ≥&nbsp;{dscrTarget}
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
                className="pb-3 pt-4 text-left align-baseline font-display text-xl sm:text-2xl"
              >
                Offer Ceiling
              </th>
              <td colSpan={2} className="pb-3 pt-3 text-right align-baseline">
                <LedgerTotal draw className="text-key-sm lg:text-key">
                  {formatLedgerDollars(ledger.offerCeiling)}
                </LedgerTotal>
              </td>
            </tr>
          </tfoot>
        </table>
      </ScrollX>
      {/* docs/voice.md: state the gap in dollars, never a vague "misses". */}
      <p className="mt-3 text-sm text-muted-foreground sm:text-base">
        {ledger.belowAsking > 0
          ? `Asking price is ${formatLedgerDollars(ledger.belowAsking)} above the ceiling.`
          : "Asking price clears the sample targets."}
        {ledger.bindingTarget
          ? ` Binding target: ${inSentence(ledger.bindingTarget)}.`
          : null}
      </p>
      {walkthroughHref ? (
        <p className="text-base">
          <Link
            href={walkthroughHref}
            className="tc-link inline-flex min-h-11 items-center"
          >
            See where every figure comes from
          </Link>
        </p>
      ) : null}
    </figure>
  );
}
