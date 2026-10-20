/**
 * The hero's sheet (DESIGN.md "The homepage", Blueprint): the sample deal on
 * a drafting sheet. A caption row, the schematic and the price track with
 * their readout (the PriceScrubber island), then the Offer Ceiling on the
 * highlight stroke with the gap in dollars and the link into the walkthrough.
 *
 * SERVER COMPONENT. Every figure comes from the engine through
 * lib/sample-deal-ledger.ts and lib/sample-deal-sweep.ts; the sheet is set
 * at the ceiling state in the HTML, so it works without JavaScript and
 * causes no layout shift when the island hydrates onto it.
 */

import Link from "next/link";
import { PriceScrubber, type ScrubberSource } from "@/components/home/price-scrubber";
import { LedgerTotal } from "@/components/ledger/ledger-parts";
import { formatDscr } from "@/lib/financial-presentation";
import { DATA_SOURCE_FACTS, PROPERTY_TAX_FACTS } from "@/lib/product-facts";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";
import { formatLedgerDollars, type SampleDealLedger } from "@/lib/sample-deal-ledger";
import { compactSweep, type SampleDealSweep } from "@/lib/sample-deal-sweep";
import { calculateSampleDealOutcome } from "@/lib/sample-deal-analysis";

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
  const { analysis } = calculateSampleDealOutcome();
  const values = SAMPLE_DEAL_FIXTURE.values;
  const rent = `${formatLedgerDollars(values.monthlyRent ?? 0)}/mo`;
  const rate = `${values.interestRate}%`;
  const downPaymentPct = `${values.downPaymentPct}%`;
  const sources: ScrubberSource[] = [
    {
      label: "Rent",
      value: rent,
      source: "HUD FMR",
      basis: `${DATA_SOURCE_FACTS.rent}. A placeholder rent, not the property's own.`,
      replaceWith: "the property's leases or local rent comps",
    },
    {
      label: "Rate",
      value: rate,
      source: "FRED rate",
      basis: `${DATA_SOURCE_FACTS.mortgageRate}, with its date shown in the analyzer.`,
      replaceWith: "an investor lender quote",
    },
    {
      label: "Property tax",
      source: "Your input",
      basis: `${PROPERTY_TAX_FACTS.notAutoFilled} ${PROPERTY_TAX_FACTS.blankFieldBehavior}`,
      replaceWith: "the local annual bill or a reviewed effective rate",
    },
    {
      label: "Down payment",
      value: downPaymentPct,
      source: "TrueCap default",
      basis: "The analyzer's starting down payment; the mortgage line is solved from it.",
      replaceWith: "your lender's terms",
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
        />
      </div>

      {/* The one total: the Offer Ceiling on the highlight stroke. */}
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
      {walkthroughHref ? (
        <p className="text-base">
          <Link href={walkthroughHref} className="tc-link inline-flex min-h-11 items-center">
            See where every figure comes from
          </Link>
        </p>
      ) : null}
    </figure>
  );
}
