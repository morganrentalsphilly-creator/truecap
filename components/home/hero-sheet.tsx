/**
 * The hero's sheet (DESIGN.md "The homepage", Blueprint): the sample deal on
 * a drafting sheet. A caption row, then the PriceScrubber island: the
 * schematic, the price track, the Offer Ceiling on the highlight stroke with
 * the gap in dollars (this file's key figure, handed into the island so the
 * answer sits above the readout and inside the first screen), the readout
 * and the source chips; then the link into the walkthrough.
 *
 * SERVER COMPONENT. Every figure comes from the engine through
 * lib/sample-deal-ledger.ts and lib/sample-deal-sweep.ts; the sheet is set
 * at the ceiling state in the HTML, so it works without JavaScript and
 * causes no layout shift when the island hydrates onto it.
 */

import Link from "next/link";
import { isFragmentHref } from "@/components/marketing/fragment-href";
import { PriceScrubber, type ScrubberSource } from "@/components/home/price-scrubber";
import { LedgerTotal } from "@/components/ledger/ledger-parts";
import { formatDscr } from "@/lib/financial-presentation";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";
import { formatLedgerDollars, type SampleDealLedger } from "@/lib/sample-deal-ledger";
import { compactSweep, type SampleDealSweep } from "@/lib/sample-deal-sweep";
import { calculateSampleDealOutcome } from "@/lib/sample-deal-analysis";

const SCRUBBER_TOUCH_FLAG_SCRIPT = `(function(){var d=document;function f(e){var t=e.target;if(t&&t.closest&&t.closest("[data-price-scrubber]")){d.documentElement.setAttribute("data-scrubber-touched","");d.removeEventListener("pointerdown",f,true);}}d.addEventListener("pointerdown",f,true);})();`;

/** "Cash flow ≥ $750/mo" reads "cash flow ≥ $750/mo" mid-sentence; an acronym keeps its capitals. */
function inSentence(label: string): string {
  return /^[A-Z][a-z]/.test(label) ? label[0].toLowerCase() + label.slice(1) : label;
}

export function HeroSheet({
  ledger,
  sweep,
  walkthroughHref,
}: {
  ledger: SampleDealLedger;
  sweep: SampleDealSweep;
  /** Where the walkthrough link goes: the story on the same page. */
  walkthroughHref?: string;
}) {
  // The homepage passes "#how-it-works", a same-page fragment: a plain <a>
  // (fragment-href.ts). As a next/link it prefetched the whole homepage again
  // (~24 KB on a phone) when it scrolled into view, and a second tap did not
  // scroll. The sign-in shell passes "/#how-it-works", a route: it stays a Link.
  const WalkthroughLink = isFragmentHref(walkthroughHref) ? "a" : Link;
  const { analysis } = calculateSampleDealOutcome();
  const values = SAMPLE_DEAL_FIXTURE.values;
  const rent = `${formatLedgerDollars(values.monthlyRent ?? 0)}/mo`;
  const rate = `${values.interestRate}%`;
  const downPaymentPct = `${values.downPaymentPct}%`;
  // Every chip reads the sample's one provenance record (audit A1), so the
  // hero, the receipts, the memo and the opened sample say the same thing.
  const line = SAMPLE_DEAL_FIXTURE.provenance.fields;
  const sources: ScrubberSource[] = [
    { label: "Rent", value: rent, source: line.rent.tag, basis: line.rent.basis, replaceWith: line.rent.replaceWith },
    {
      label: "Rate",
      value: rate,
      source: line.interestRate.tag,
      basis: line.interestRate.basis,
      replaceWith: line.interestRate.replaceWith,
    },
    {
      label: "Property tax",
      value: `${values.propertyTaxPct}%`,
      source: line.propertyTax.tag,
      basis: line.propertyTax.basis,
      replaceWith: line.propertyTax.replaceWith,
    },
    {
      label: "Down payment",
      value: downPaymentPct,
      source: line.downPayment.tag,
      basis: line.downPayment.basis,
      replaceWith: line.downPayment.replaceWith,
    },
  ];

  return (
    <figure
      data-hero-ledger=""
      className="min-w-0 rounded-lg bg-card p-4 shadow-lg sm:p-6"
      aria-labelledby="hero-sheet-caption"
    >
      <figcaption
        id="hero-sheet-caption"
        className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-border pb-3 font-mono text-xs text-muted-foreground"
      >
        <span>
          <span className="font-medium text-foreground">{ledger.title}</span> · Sample deal
        </span>
        <span>Every input editable · drag the price</span>
      </figcaption>

      {/* Before the island hydrates, a pointer on the sheet is the visitor
          taking the handle: flag it so the island never plays its moment
          over them (audit A3). Inline and first, so it is listening before
          the sheet paints. */}
      <script dangerouslySetInnerHTML={{ __html: SCRUBBER_TOUCH_FLAG_SCRIPT }} />
      <div className="mt-4">
        <PriceScrubber
          points={compactSweep(sweep)}
          asking={sweep.asking}
          ceiling={sweep.ceiling}
          target={sweep.target}
          atAsking={{
            cashFlow: `${formatLedgerDollars(analysis.netCashFlow)}/mo`,
            dscr: formatDscr(analysis.dscr, true),
            coc: `${analysis.cocReturn.toFixed(1)}%`,
            meets: ledger.meetsTargets.asking,
          }}
          inputs={{ rent, rate, downPaymentPct, bedrooms: values.bedrooms ?? 0 }}
          sources={sources}
          keyFigure={
            <>
              {/* The one total: the Offer Ceiling on the highlight stroke,
                  under the price track and above the readout. */}
              <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t-2 border-foreground pt-3">
                <span className="font-display text-xl sm:text-2xl">Offer Ceiling</span>
                <LedgerTotal draw className="highlight-stroke text-key-sm lg:text-key">
                  {formatLedgerDollars(ledger.offerCeiling)}
                </LedgerTotal>
              </div>
              {/* docs/voice.md: state the gap in dollars, never a vague "misses". */}
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                {ledger.belowAsking > 0
                  ? `Asking price is ${formatLedgerDollars(ledger.belowAsking)} above the ceiling.`
                  : "Asking price clears the sample targets."}
                {ledger.bindingTarget ? ` Binding target: ${inSentence(ledger.bindingTarget)}.` : null}
              </p>
            </>
          }
        />
      </div>

      {walkthroughHref ? (
        <p className="mt-2 text-base">
          <WalkthroughLink href={walkthroughHref} className="tc-link inline-flex min-h-11 items-center">
            See where every figure comes from
          </WalkthroughLink>
        </p>
      ) : null}
    </figure>
  );
}
