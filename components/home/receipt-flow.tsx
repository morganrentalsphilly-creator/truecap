/**
 * "Every number has a receipt" (OVERHAUL.md §6.3): the sources drawn as a
 * flow into the result, in Plaid's manner. HUD feeds the rent, FRED feeds
 * the rate, you feed the property tax, and the three leaders meet at the
 * Offer Ceiling. Each node is a SourcePopover: what the source is, its basis,
 * and what to replace it with, in lib/product-facts.ts's words. The leaders
 * draw themselves in once as the section scrolls into view, on every engine
 * (components/home/receipt-leaders.tsx, Motion pathLength), and are fully
 * drawn by default, so no-JavaScript and reduced motion see the finished
 * drawing. While a source's popover is open, its leader goes solid and the
 * result figure it feeds brightens (globals.css, on data-receipt-node,
 * data-receipt-leader and data-receipt-figure).
 *
 * SERVER COMPONENT. The figures come from the engine's ledger and the
 * sample fixture; the popovers and the leaders are the client leaves.
 */

import { SourcePopover } from "@/components/motion/source-popover";
import { ReceiptLeaders } from "@/components/home/receipt-leaders";
import { DATA_SOURCE_FACTS, PROPERTY_TAX_FACTS } from "@/lib/product-facts";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";
import { formatLedgerDollars, type SampleDealLedger } from "@/lib/sample-deal-ledger";
import { calculateSampleDealOutcome } from "@/lib/sample-deal-analysis";
import { formatDscr } from "@/lib/financial-presentation";

export function ReceiptFlow({ ledger }: { ledger: SampleDealLedger }) {
  const values = SAMPLE_DEAL_FIXTURE.values;
  const { maxOffer } = calculateSampleDealOutcome();
  const atCeiling = maxOffer?.achieved;
  const nodes = [
    {
      key: "rent",
      source: "HUD FMR" as const,
      label: "Rent",
      value: `${formatLedgerDollars(values.monthlyRent ?? 0)}/mo`,
      what: "HUD Fair Market Rent benchmark",
      basis: `${DATA_SOURCE_FACTS.rent}. A placeholder rent for the sample, not the property's own.`,
      replaceWith: "the property's leases or local rent comps",
    },
    {
      key: "rate",
      source: "FRED rate" as const,
      label: "Mortgage rate",
      value: `${values.interestRate}%`,
      what: "FRED 30-year fixed series",
      basis: `${DATA_SOURCE_FACTS.mortgageRate}, with its date shown in the analyzer.`,
      replaceWith: "an investor lender quote, before deciding",
    },
    {
      key: "tax",
      source: "Your input" as const,
      label: "Property tax",
      value: "Your input",
      what: "Never auto-filled",
      basis: `${PROPERTY_TAX_FACTS.notAutoFilled} ${PROPERTY_TAX_FACTS.blankFieldBehavior}`,
      replaceWith: "a local annual bill or a reviewed effective rate",
    },
  ];
  return (
    <div
      data-receipt-flow=""
      className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,2fr)_minmax(0,5fr)] lg:items-center lg:gap-0"
    >
      <ol className="grid gap-3" aria-label="The starting values and where each comes from">
        {nodes.map((n) => (
          <li key={n.key} data-receipt-node={n.key} className="rounded-lg border border-border bg-card p-4 shadow-xs">
            <SourcePopover
              source={n.source}
              basis={n.basis}
              replaceWith={n.replaceWith}
              className="w-full items-start justify-between gap-4 rounded-none no-underline"
            >
              <span className="min-w-0 text-left">
                <span className="block font-mono text-xs text-muted-foreground">{n.source}</span>
                <span className="mt-0.5 block text-base font-semibold text-foreground">{n.label}</span>
                <span className="block text-sm text-muted-foreground">{n.what}</span>
              </span>
              <span className="shrink-0 font-figure text-lg font-semibold text-foreground">{n.value}</span>
            </SourcePopover>
          </li>
        ))}
      </ol>
      {/* The leaders, between the sources and the result from 1024px; on
          phones the flow reads top to bottom and the leaders become one
          vertical dashed line. */}
      <div className="relative mx-auto h-10 w-px border-l border-dashed border-primary lg:h-full lg:w-full lg:border-0" aria-hidden>
        <ReceiptLeaders />
      </div>
      <div className="rounded-lg bg-navy p-5 text-navy-foreground shadow-lg sm:p-6">
        <p className="font-mono text-xs text-navy-muted">Result · sample deal</p>
        <p className="mt-2 text-sm text-navy-muted">Offer Ceiling</p>
        <p className="font-display font-figure text-key-sm text-white sm:text-key">{formatLedgerDollars(ledger.offerCeiling)}</p>
        {atCeiling ? (
          // Each figure names the sources that feed it, so an open source
          // popover can brighten it: rent and the property tax move the cash
          // flow, the rate moves the mortgage and so the DSCR.
          <p className="mt-3 font-figure text-sm text-navy-muted">
            <span data-receipt-figure="cash-flow">Cash flow {formatLedgerDollars(atCeiling.netCashFlow)}/mo</span>
            {" · "}
            <span data-receipt-figure="dscr">DSCR {formatDscr(atCeiling.dscr, true)}</span>
            {" · "}
            <span>CoC {atCeiling.cocReturn.toFixed(1)}%</span>
          </p>
        ) : null}
        <p className="mt-3 text-sm text-navy-muted">
          Every assumption stays labeled and editable in the analyzer; replace a starting value and the result moves with it.
        </p>
      </div>
    </div>
  );
}
