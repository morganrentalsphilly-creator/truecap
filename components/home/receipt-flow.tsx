/**
 * "Every number has a receipt" (OVERHAUL.md §6.3): the sources drawn as a
 * flow into the result, in Plaid's manner. HUD feeds the rent, FRED feeds
 * the rate, you feed the property tax, and the three leaders meet at the
 * Offer Ceiling. It sits in the homepage's one mid-page navy band (DESIGN.md
 * "The homepage" 3; DataSourcesSection is the `tone="navy"` Section): the
 * sources are rows on the band's lines, their colours from the band's scope,
 * and the result is a white sheet set in it (data-tone="sheet"), the Offer
 * Ceiling at the smaller key-figure step with no highlight stroke.
 * Each node is a SourcePopover on the sample's own value: its
 * source line from SAMPLE_DEAL_FIXTURE.provenance (the sample's rent is the
 * example's, not HUD's), what fills it on the visitor's own deal, and what to
 * replace it with. The leaders
 * draw themselves in once as the section scrolls into view, on every engine
 * (components/home/receipt-leaders.tsx, a CSS keyframe on a mask), and are fully
 * drawn by default, so no-JavaScript and reduced motion see the finished
 * drawing. While a source's popover is open, its leader goes solid and the
 * result figure it feeds darkens to the sheet's ink (globals.css, on
 * data-receipt-node, data-receipt-leader and data-receipt-figure; the sheet
 * names the ink through --receipt-open-color).
 *
 * SERVER COMPONENT. The figures come from the engine's ledger and the
 * sample fixture; the popovers and the leaders are the client leaves.
 */

import { SourcePopover } from "@/components/motion/source-popover";
import { ReceiptLeaders } from "@/components/home/receipt-leaders";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";
import { formatLedgerDollars, type SampleDealLedger } from "@/lib/sample-deal-ledger";
import { calculateSampleDealOutcome } from "@/lib/sample-deal-analysis";
import { formatDscr } from "@/lib/financial-presentation";

export function ReceiptFlow({ ledger }: { ledger: SampleDealLedger }) {
  const values = SAMPLE_DEAL_FIXTURE.values;
  const { maxOffer } = calculateSampleDealOutcome();
  const atCeiling = maxOffer?.achieved;
  // The sample's values with the sample's own source line (audit A1); "what"
  // says what fills the same input on the visitor's own deal.
  const line = SAMPLE_DEAL_FIXTURE.provenance.fields;
  const nodes = [
    {
      key: "rent",
      source: line.rent.tag,
      label: "Rent",
      value: `${formatLedgerDollars(values.monthlyRent ?? 0)}/mo`,
      what: "On your address: HUD's rent benchmark",
      basis: line.rent.basis,
      replaceWith: line.rent.replaceWith,
    },
    {
      key: "rate",
      source: line.interestRate.tag,
      label: "Mortgage rate",
      value: `${values.interestRate}%`,
      what: "On your deal: the latest FRED week",
      basis: line.interestRate.basis,
      replaceWith: line.interestRate.replaceWith,
    },
    {
      key: "tax",
      source: line.propertyTax.tag,
      label: "Property tax",
      value: `${values.propertyTaxPct}% a year`,
      what: "On your deal: never auto-filled, you enter it",
      basis: line.propertyTax.basis,
      replaceWith: line.propertyTax.replaceWith,
    },
  ];
  return (
    <div
      data-receipt-flow=""
      className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,2fr)_minmax(0,5fr)] lg:items-center lg:gap-0"
    >
      {/* Rows on lines (DESIGN.md "Card": not for lists, sources or FAQs).
          Each row is a button that opens its receipt, and says so: the
          source tag keeps the site's source cue (SourcePopover's dotted
          underline, solid on hover), the pointer is a hand, and the row
          takes the band's own lighter navy (--band in the navy scope) on
          hover, while pressed and while its receipt is open. The band is
          the button's ::before, so the text stays on the page's rail and
          never touches the band's edge; the button holds the row's padding
          and is a block-level flex box (inline, it sat on a text line whose
          strut added 5px above it), so the whole row between its lines is
          the target and the band sits evenly in it. From 1024px the
          figure sits at the row's mid-height with 16px after it, where its
          leader starts. */}
      <ol className="border-t border-border" aria-label="The starting values and where each comes from">
        {nodes.map((n) => (
          <li key={n.key} data-receipt-node={n.key} className="border-b border-border">
            <SourcePopover
              source={n.source}
              basis={n.basis}
              replaceWith={n.replaceWith}
              className="group/row relative isolate flex w-full cursor-pointer items-start justify-between gap-4 rounded-none py-4 no-underline before:absolute before:inset-y-1 before:-left-2 before:-right-2 before:-z-10 before:rounded-control before:transition-colors before:duration-[var(--duration-fast)] hover:before:bg-band active:before:bg-band data-[state=open]:before:bg-band lg:items-center lg:pr-4 lg:before:-left-4 lg:before:right-0"
            >
              <span className="min-w-0 text-left">
                <span className="block w-fit tc-meta text-muted-foreground underline decoration-dotted decoration-1 underline-offset-[5px] transition-colors duration-[var(--duration-fast)] group-hover/row:text-foreground group-hover/row:decoration-solid">
                  {n.source}
                </span>
                <span className="mt-0.5 block text-base font-semibold text-foreground">{n.label}</span>
                <span className="block text-pretty text-sm text-muted-foreground">{n.what}</span>
              </span>
              <span className="shrink-0 font-figure text-2xl font-semibold text-foreground">{n.value}</span>
            </SourcePopover>
          </li>
        ))}
      </ol>
      {/* The leaders, between the sources and the result from 1024px; on
          phones the flow reads top to bottom and the leaders become one
          vertical dashed line. The lighter cobalt: inside the band
          --primary is white, and plain cobalt is 2.6:1 on the navy.
          Stretched to the row (a percentage height cannot resolve in the
          centred grid), so the leaders, which fill it, start at the three
          rows' mid-heights and end at the result's. */}
      <div className="relative mx-auto h-10 w-px border-l border-dashed border-sidebar-primary lg:h-auto lg:w-full lg:self-stretch lg:border-0" aria-hidden>
        <ReceiptLeaders />
      </div>
      {/* The result: a white sheet in the band. data-tone="sheet" restores
          the light tokens for everything inside it, and the open-state rule
          reads this sheet's ink. No highlight stroke here: the page's one
          stroke at display size is the hero's. */}
      <div
        data-tone="sheet"
        className="rounded-object border border-border bg-card p-5 text-foreground shadow-panel sm:p-6 [--receipt-open-color:var(--foreground)]"
      >
        <p className="tc-meta text-muted-foreground">Result · sample deal</p>
        <p className="mt-2 text-sm text-muted-foreground">Offer Ceiling</p>
        <p className="font-display font-figure text-key-sm text-foreground">{formatLedgerDollars(ledger.offerCeiling)}</p>
        {atCeiling ? (
          // Each figure names the sources that feed it, so an open source
          // popover can darken it: rent and the property tax move the cash
          // flow, the rate moves the mortgage and so the DSCR.
          <p className="mt-3 font-figure text-sm text-muted-foreground">
            <span data-receipt-figure="cash-flow">Cash flow {formatLedgerDollars(atCeiling.netCashFlow)}/mo</span>
            {" · "}
            <span data-receipt-figure="dscr">DSCR {formatDscr(atCeiling.dscr, true)}</span>
            {" · "}
            <span>CoC {atCeiling.cocReturn.toFixed(1)}%</span>
          </p>
        ) : null}
        <p className="mt-3 text-sm text-muted-foreground">
          Every assumption stays labeled and editable in the analyzer; replace a starting value and the result moves with it.
        </p>
      </div>
    </div>
  );
}
