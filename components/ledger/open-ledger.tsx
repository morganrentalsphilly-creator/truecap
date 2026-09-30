/**
 * The Verdict Ledger, opened: the homepage walkthrough (the expandable ledger
 * direction, docs/design-pass/checkpoint-2). The same rows as the hero, each a
 * native disclosure that is open by default and shows where its figure comes
 * from, down to the monthly arithmetic. Native <details> needs no client JS
 * and keeps every row reachable by keyboard; a reader can fold rows away.
 */

import type { ReactNode } from "react";
import type { LedgerPair, SampleDealLedger } from "@/lib/sample-deal-ledger";
import { formatLedgerDollars } from "@/lib/sample-deal-ledger";
import { formatDscr } from "@/lib/financial-presentation";
import {
  LEDGER_FIGURE_COLUMN,
  LEDGER_GRID,
  LedgerFigure,
  LedgerTotal,
  LedgerVerdict,
} from "@/components/ledger/ledger-parts";
import { ScrollX } from "@/components/ui/scroll-x";
import { cn } from "@/lib/utils";

type SubRow = {
  label: string;
  asking: ReactNode;
  ceiling: ReactNode;
  total?: boolean;
};

function DisclosureMark() {
  return (
    <>
      {/* Open: minus. Closed: plus. Drawn, one stroke weight, sized to the text. */}
      <svg
        aria-hidden
        viewBox="0 0 18 18"
        className="hidden size-[18px] shrink-0 group-open:block"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="1.5" y="1.5" width="15" height="15" />
        <path d="M5 9h8" />
      </svg>
      <svg
        aria-hidden
        viewBox="0 0 18 18"
        className="block size-[18px] shrink-0 group-open:hidden"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="1.5" y="1.5" width="15" height="15" />
        <path d="M5 9h8M9 5v8" />
      </svg>
    </>
  );
}

function SubRows({ rows, caption }: { rows: SubRow[]; caption: string }) {
  return (
    <table className="mt-3.5 w-full border-collapse text-sm sm:text-[15.5px]">
      <caption className="sr-only">{caption}</caption>
      <thead className="sr-only">
        <tr>
          <th scope="col">Line</th>
          <th scope="col">At asking</th>
          <th scope="col">At the Offer Ceiling</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.label}
            className={cn(
              "border-t",
              row.total
                ? "border-foreground font-semibold"
                : "border-rule-soft",
            )}
          >
            <th
              scope="row"
              className={cn(
                "py-1.5 pr-2 text-left sm:py-2",
                row.total ? "font-semibold" : "font-normal",
              )}
            >
              {row.label}
            </th>
            <td
              className={cn(
                LEDGER_FIGURE_COLUMN,
                "py-1.5 pl-2 text-right sm:py-2",
              )}
            >
              {row.asking}
            </td>
            <td
              className={cn(
                LEDGER_FIGURE_COLUMN,
                "py-1.5 pl-2 text-right sm:py-2",
              )}
            >
              {row.ceiling}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function money(pair: LedgerPair): { asking: ReactNode; ceiling: ReactNode } {
  return {
    asking: <LedgerFigure>{formatLedgerDollars(pair.asking)}</LedgerFigure>,
    ceiling: <LedgerFigure>{formatLedgerDollars(pair.ceiling)}</LedgerFigure>,
  };
}

function Group({
  label,
  target,
  asking,
  ceiling,
  banded = false,
  children,
}: {
  label: string;
  target?: string;
  asking: ReactNode;
  ceiling: ReactNode;
  banded?: boolean;
  children: ReactNode;
}) {
  return (
    <details open className="group border-b border-border">
      <summary
        className={cn(
          LEDGER_GRID,
          "min-h-12 cursor-pointer list-none items-baseline py-3.5 sm:py-4 [&::-webkit-details-marker]:hidden",
          banded && "-mx-2 bg-band px-2",
        )}
      >
        {/* The mark sits on the label's first line; a long label wraps
            beside it, and the target drops under the label on phones. */}
        <span className="flex min-w-0 items-start gap-2.5 text-base font-semibold sm:text-xl">
          <span className="flex h-[1lh] shrink-0 items-center">
            <DisclosureMark />
          </span>
          <span className="min-w-0">
            {label}
            {target ? (
              <span className="block text-[13px] font-normal text-muted-foreground sm:ml-2.5 sm:inline sm:text-[15px]">
                {target}
              </span>
            ) : null}
          </span>
        </span>
        <span className="text-right text-[14.5px] sm:text-lg lg:text-[22px]">
          <span className="sr-only">At asking: </span>
          {asking}
        </span>
        <span className="text-right text-[14.5px] sm:text-lg lg:text-[22px]">
          <span className="sr-only">At the Offer Ceiling: </span>
          {ceiling}
        </span>
      </summary>
      <div className="pb-5 pl-3 sm:pl-7">{children}</div>
    </details>
  );
}

function Note({ lead, children }: { lead: string; children: ReactNode }) {
  return (
    <p className="max-w-[62ch] text-[15px] leading-relaxed sm:text-[16.5px]">
      <span className="font-semibold">{lead}</span> {children}
    </p>
  );
}

export type OpenLedgerNotes = {
  price: { lead: string; body: string };
  cashFlow: { lead: string; body: string };
  ceiling: { lead: string; body: string };
};

export function OpenLedger({
  ledger,
  notes,
}: {
  ledger: SampleDealLedger;
  notes: OpenLedgerNotes;
}) {
  const cashFlowTarget = ledger.target.monthlyCashFlow;
  const dscrTarget = ledger.target.dscr;
  const { cashToClose } = ledger;
  // Below about 260px (a 390px phone at 200% zoom) the figure columns cannot
  // fit; the ledger then scrolls inside its own keyboard-reachable region
  // (ScrollX) rather than widening the page.
  return (
    <ScrollX label="The sample deal, every row open">
      <div
        data-open-ledger=""
        className="min-w-[16rem] border-t-2 border-foreground"
      >
        <div
          aria-hidden
          className={cn(
            LEDGER_GRID,
            "border-b border-border py-2.5 text-[13px] font-semibold text-muted-foreground sm:text-[15px]",
          )}
        >
          <span>The sample deal, every row open</span>
          <span className="text-right">At asking</span>
          <span className="text-right">At the Offer Ceiling</span>
        </div>

        <Group
          label="Price"
          asking={
            <LedgerFigure>
              {formatLedgerDollars(ledger.askingPrice)}
            </LedgerFigure>
          }
          ceiling={
            <LedgerFigure>
              {formatLedgerDollars(ledger.offerCeiling)}
            </LedgerFigure>
          }
        >
          <Note lead={notes.price.lead}>{notes.price.body}</Note>
          <SubRows
            caption="What it takes to close, at each price"
            rows={[
              {
                label: `Down payment, ${cashToClose.downPaymentPct}%`,
                ...money(cashToClose.downPayment),
              },
              {
                label:
                  cashToClose.closingCostsPct != null
                    ? `Closing costs, ${cashToClose.closingCostsPct}%`
                    : "Closing costs",
                ...money(cashToClose.closingCosts),
              },
              {
                label: "Cash to close",
                ...money(cashToClose.total),
                total: true,
              },
            ]}
          />
        </Group>

        <Group
          banded
          label="Cash flow after reserves"
          target={
            cashFlowTarget != null
              ? `Target ≥ ${formatLedgerDollars(cashFlowTarget)}/mo`
              : undefined
          }
          asking={
            <LedgerFigure>
              {formatLedgerDollars(ledger.cashFlowMonthly.asking)}/mo
            </LedgerFigure>
          }
          ceiling={
            <LedgerFigure>
              {formatLedgerDollars(ledger.cashFlowMonthly.ceiling)}/mo
            </LedgerFigure>
          }
        >
          <Note lead={notes.cashFlow.lead}>{notes.cashFlow.body}</Note>
          <SubRows
            caption="Rent down to cash flow after reserves, per month"
            rows={ledger.monthly.map((line) => ({
              label: line.label,
              ...money(line.value),
              total: line.total,
            }))}
          />
        </Group>

        <Group
          label="DSCR"
          target={dscrTarget != null ? `Target ≥ ${dscrTarget}` : undefined}
          asking={
            <LedgerFigure>{formatDscr(ledger.dscr.asking, true)}</LedgerFigure>
          }
          ceiling={
            <LedgerFigure>{formatDscr(ledger.dscr.ceiling, true)}</LedgerFigure>
          }
        >
          <SubRows
            caption="Debt service coverage, per year"
            rows={[
              {
                label: "Net operating income, per year",
                ...money(ledger.annual.noi),
              },
              {
                label: "Debt service, per year",
                ...money(ledger.annual.debtService),
              },
              {
                label: "Income divided by debt service",
                asking: (
                  <LedgerFigure>
                    {formatDscr(ledger.dscr.asking, true)}
                  </LedgerFigure>
                ),
                ceiling: (
                  <LedgerFigure>
                    {formatDscr(ledger.dscr.ceiling, true)}
                  </LedgerFigure>
                ),
                total: true,
              },
            ]}
          />
        </Group>

        <Group
          label="Meets the Buy Box"
          asking={
            <LedgerVerdict pass={ledger.meetsTargets.asking}>
              {ledger.meetsTargets.asking ? "Yes" : "No"}
            </LedgerVerdict>
          }
          ceiling={
            <LedgerVerdict pass={ledger.meetsTargets.ceiling}>
              {ledger.meetsTargets.ceiling ? "Yes" : "No"}
            </LedgerVerdict>
          }
        >
          <SubRows
            caption="Each target at each price"
            rows={[
              ...(cashFlowTarget != null
                ? [
                    {
                      label: `Cash flow at least ${formatLedgerDollars(cashFlowTarget)}/mo`,
                      asking:
                        ledger.cashFlowShortfall != null ? (
                          <LedgerVerdict pass={false}>
                            Misses by{" "}
                            <LedgerFigure>
                              {formatLedgerDollars(ledger.cashFlowShortfall)}
                            </LedgerFigure>
                          </LedgerVerdict>
                        ) : (
                          <LedgerVerdict pass>Meets</LedgerVerdict>
                        ),
                      ceiling: <LedgerVerdict pass>Meets</LedgerVerdict>,
                    },
                  ]
                : []),
              ...(dscrTarget != null
                ? [
                    {
                      label: `DSCR at least ${dscrTarget}`,
                      asking: (
                        <LedgerVerdict pass={ledger.dscr.asking >= dscrTarget}>
                          {ledger.dscr.asking >= dscrTarget
                            ? "Meets"
                            : "Misses"}
                        </LedgerVerdict>
                      ),
                      ceiling: (
                        <LedgerVerdict pass={ledger.dscr.ceiling >= dscrTarget}>
                          {ledger.dscr.ceiling >= dscrTarget
                            ? "Meets"
                            : "Misses"}
                        </LedgerVerdict>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </Group>

        <details open className="group">
          <summary className="flex min-h-12 cursor-pointer list-none flex-wrap items-end justify-between gap-x-4 gap-y-2 pb-2 pt-5 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2.5 font-display text-2xl sm:text-3xl">
              <DisclosureMark />
              Offer Ceiling
            </span>
            <LedgerTotal className="text-key-sm lg:text-[3rem]">
              {formatLedgerDollars(ledger.offerCeiling)}
            </LedgerTotal>
          </summary>
          <div className="pl-3 pt-2 sm:pl-7">
            <Note lead={notes.ceiling.lead}>{notes.ceiling.body}</Note>
            <dl className="mt-3.5 text-sm sm:text-[15.5px]">
              {ledger.bindingTarget ? (
                <div className="flex justify-between gap-4 border-t border-rule-soft py-1.5 sm:py-2">
                  <dt>Binding target</dt>
                  <dd className="text-right">{ledger.bindingTarget}</dd>
                </div>
              ) : null}
              {ledger.nextConstraint ? (
                <div className="flex justify-between gap-4 border-t border-rule-soft py-1.5 sm:py-2">
                  <dt>Next constraint</dt>
                  <dd className="text-right">{ledger.nextConstraint}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 border-t border-rule-soft py-1.5 sm:py-2">
                <dt>Below asking</dt>
                <dd className="text-right">
                  <LedgerFigure>
                    {formatLedgerDollars(ledger.belowAsking)}
                  </LedgerFigure>
                </dd>
              </div>
            </dl>
          </div>
        </details>
      </div>
    </ScrollX>
  );
}
