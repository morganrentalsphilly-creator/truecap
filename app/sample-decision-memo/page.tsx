import type { Metadata } from "next";
import Link from "next/link";

import { Header } from "@/components/investcalc/header";
import { GlossaryTip } from "@/components/investcalc/glossary-tip";
import { LedgerFigure, LedgerTotal } from "@/components/ledger/ledger-parts";
import { ActionRow, PageHero } from "@/components/marketing/page-parts";
import { Section } from "@/components/marketing/section";
import { SiteFooter } from "@/components/marketing/site-footer";
import { buttonVariants } from "@/components/ui/button";
import { calculateSampleDealOutcome } from "@/lib/sample-deal-analysis";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";
import { buildOfferCeilingPresentation } from "@/lib/offer-ceiling";
import { describeMaoTarget } from "@/lib/mao-targets";
import { TRUECAP_UNDERWRITING_STANDARD_NAME } from "@/lib/underwriting-methodology";
import {
  METRIC_TONE_TEXT_CLASS,
  capRateTone,
  cashFlowTone,
  cocTone,
  dscrTone,
  formatDscr,
  formatRatioPct,
  formatSignedPct,
} from "@/lib/financial-presentation";
import type { GLOSSARY } from "@/lib/glossary";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Sample Rental Decision Memo",
  description:
    "See an illustrative TrueCap rental acquisition decision, including the Offer Ceiling, targets, downside range, risks, and verification plan.",
  alternates: { canonical: "/sample-decision-memo" },
  openGraph: {
    type: "website",
    url: "/sample-decision-memo",
    title: "Sample Rental Decision Memo | TrueCap",
    description:
      "See a complete sample rental decision with its Offer Ceiling, downside range, risks, and verification plan.",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap sample rental decision memo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sample Rental Decision Memo | TrueCap",
    description:
      "See a complete sample rental decision with its Offer Ceiling, downside range, risks, and verification plan.",
    images: ["/home.jpg"],
  },
};

const money = (value: number) =>
  `${value < 0 ? "-" : ""}$${Math.abs(Math.round(value)).toLocaleString("en-US")}`;

/** A ruled ledger row (the OpenLedger grammar): label left, value right. */
const LEDGER_ROW = "flex justify-between gap-4 border-t border-rule-soft py-2.5";

/**
 * A memo list: opened by the heavy rule, one soft rule under each item. The
 * measure caps the list, not the items, so every rule runs the same width
 * (StepList's grammar); the type size sits on the list so 62ch still counts
 * the items' characters.
 */
const MEMO_LIST =
  "mt-4 max-w-[62ch] border-t-2 border-foreground text-base leading-relaxed sm:text-lg";
const MEMO_LIST_ITEM = "text-pretty border-b border-rule-soft py-4";

export default function SampleDecisionMemoPage() {
  const { analysis, dealScore, maxOffer } = calculateSampleDealOutcome();
  if (!maxOffer) return null;
  const ceiling = buildOfferCeilingPresentation({
    values: SAMPLE_DEAL_FIXTURE.values,
    result: maxOffer,
    source: "selected-targets",
  });
  const values = SAMPLE_DEAL_FIXTURE.values;
  const hasDebtService = analysis.monthlyPayment > 0;
  // Same four numbers, same one-decimal formats and colour rules as the
  // decision card and the shared viewer (lib/financial-presentation).
  const baseEconomics: {
    label: string;
    term: keyof typeof GLOSSARY;
    value: string;
    toneClass: string | undefined;
  }[] = [
    {
      label: "Monthly cash flow",
      term: "cashFlow",
      value: money(analysis.netCashFlow),
      toneClass: METRIC_TONE_TEXT_CLASS[cashFlowTone(analysis.netCashFlow)],
    },
    {
      label: "Cap rate",
      term: "capRate",
      value: formatRatioPct(analysis.capRate),
      toneClass: METRIC_TONE_TEXT_CLASS[capRateTone(analysis.capRate)],
    },
    {
      label: "Cash-on-cash",
      term: "coc",
      value:
        analysis.totalCashRequired > 0
          ? formatSignedPct(analysis.cocReturn)
          : "N/A",
      toneClass:
        METRIC_TONE_TEXT_CLASS[
          cocTone(analysis.cocReturn, analysis.totalCashRequired)
        ],
    },
    {
      label: "DSCR",
      term: "dscr",
      value: formatDscr(analysis.dscr, hasDebtService),
      toneClass:
        METRIC_TONE_TEXT_CLASS[
          dscrTone(
            analysis.dscr,
            hasDebtService,
            values.propertyType === "owner-occupant",
          )
        ],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header initialUser={null} initialEntitlements={null} />
      {/* One <main>: scripts/capture-screenshots.ts shoots main.first() on
          this route for the homepage's memo image (MEMO_SHOT). */}
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <PageHero
          title="Doesn't meet your targets at asking."
          lede={`Sample decision memo · ${SAMPLE_DEAL_FIXTURE.display.shortAddress} · asking ${money(values.purchasePrice)}`}
        >
          {/* The truth label stays in the first screen (app/for-agents says
              the memo is labeled as not a customer result). Under the lede,
              on a soft rule, in ink: a label above the H1 would be an
              eyebrow, and orange means a miss. */}
          <p className="mt-4 max-w-[68ch] text-pretty border-t border-rule-soft pt-2.5 text-base">
            <strong className="font-semibold">
              Illustrative sample — not a customer result.
            </strong>{" "}
            The address and every input below are illustrative assumptions,
            not verified property facts.
          </p>
        </PageHero>

        <Section aria-labelledby="sample-decision" rhythm="tight" rule="none">
          <div className="grid gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            {/* The decision: the Offer Ceiling as the memo's one total, over
                the double rule (no draw: the homepage keeps the one motion). */}
            <div className="min-w-0 border-t-2 border-foreground">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 pb-2 pt-5">
                <h2
                  id="sample-decision"
                  className="font-display text-balance text-h3-sm sm:text-2xl"
                >
                  Offer Ceiling
                </h2>
                <LedgerTotal className="text-key-sm lg:text-key">
                  {money(maxOffer.maxPrice)}
                </LedgerTotal>
              </div>
              <p className="mt-3 text-base font-semibold">
                {SAMPLE_DEAL_FIXTURE.targetProfile.name} ·{" "}
                {describeMaoTarget(SAMPLE_DEAL_FIXTURE.maoTarget)}
              </p>
              <p className="mt-1 text-pretty text-base text-muted-foreground">
                The asking price is{" "}
                {money(values.purchasePrice - maxOffer.maxPrice)} above this
                ceiling.
              </p>
              <dl className="mt-4 text-base">
                <div className={LEDGER_ROW}>
                  <dt>Binding</dt>
                  <dd className="text-right">
                    {ceiling.bindingConstraints
                      .map((item) => item.criterion)
                      .join(" + ") || "Not resolved"}
                  </dd>
                </div>
                <div className={LEDGER_ROW}>
                  <dt>Next constraint</dt>
                  <dd className="text-right">
                    {ceiling.nextConstraint?.criterion ?? "None"}
                  </dd>
                </div>
                {/* A grid, so the "If …" note can run the row's full width
                    under the label and the figures. */}
                <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 border-t border-rule-soft py-2.5">
                  <dt>Screening range</dt>
                  <dd className="text-right">
                    {ceiling.range.lower == null ? (
                      "No feasible downside price"
                    ) : (
                      <LedgerFigure>{money(ceiling.range.lower)}</LedgerFigure>
                    )}
                    –
                    {ceiling.range.upper == null ? (
                      "No feasible upside price"
                    ) : (
                      <LedgerFigure>{money(ceiling.range.upper)}</LedgerFigure>
                    )}
                  </dd>
                  <dd className="col-span-2 mt-1 text-pretty text-sm text-muted-foreground">
                    If {ceiling.range.label}.
                  </dd>
                </div>
              </dl>
              {/* The rule closes the ledger at the rows' width; the measure
                  caps only the text under it (OpenLedger's closing line). */}
              <div className="border-t border-border pt-3">
                <p className="max-w-[62ch] text-pretty text-sm leading-relaxed text-muted-foreground">
                  The highest price that still meets{" "}
                  {SAMPLE_DEAL_FIXTURE.targetProfile.name} under the assumptions
                  shown.
                </p>
              </div>
            </div>

            <div className="min-w-0 border-t-2 border-foreground">
              <h2 className="font-display text-balance py-2.5 text-h3-sm sm:text-2xl">
                Base economics at asking
              </h2>
              <dl>
                {baseEconomics.map(({ label, term, value, toneClass }) => (
                  <div
                    key={label}
                    className="flex items-baseline justify-between gap-4 border-t border-rule-soft"
                  >
                    {/* The dotted underline marks a defined term (DESIGN.md,
                        the OWID reference); it carries the affordance, so
                        the help icon stays off. */}
                    <dt className="text-base">
                      <GlossaryTip term={term} showIcon={false}>
                        {label}
                      </GlossaryTip>
                    </dt>
                    <dd>
                      <LedgerFigure
                        className={cn("text-lg", toneClass ?? "text-foreground")}
                      >
                        {value}
                      </LedgerFigure>
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="text-pretty border-t border-border pt-3 text-sm text-muted-foreground">
                Deal score {Math.round(dealScore.score)}/100 · a heuristic
                summary of the modeled numbers.
              </p>
            </div>
          </div>
        </Section>

        <Section aria-labelledby="memo-what" rhythm="tight">
          <div className="max-w-[68ch]">
            {/* Every h2 on the page takes one size, so this aside does not
                outrank the Offer Ceiling heading above it. */}
            <h2
              id="memo-what"
              className="font-display text-balance text-h3-sm sm:text-2xl"
            >
              What a decision memo is
            </h2>
            <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
              A decision memo is the written form of an analysis: the answer at
              asking price, the Offer Ceiling with the targets that produced
              it, the cash flow after reserves and the DSCR that drove the
              verdict, the assumptions with their sources, the two inputs most
              likely to change the outcome, and what to verify before you
              offer. For an investor, it is what you hand your lender or
              partner. For an agent, it is what your investor client receives:
              the numbers and the reasoning travel together, under your name,
              with every assumption still editable. This one is
              generated from the sample deal by the same engine that runs every
              analysis, so what you see here is exactly what a real deal
              produces.
            </p>
          </div>
        </Section>

        <Section rhythm="tight">
          <div className="grid gap-x-16 gap-y-12 lg:grid-cols-2">
            <div className="min-w-0">
              <h2 className="font-display text-balance text-h3-sm sm:text-2xl">
                What could break the decision?
              </h2>
              <ul className={MEMO_LIST}>
                <li className={MEMO_LIST_ITEM}>
                  <strong className="font-semibold">Rent:</strong>{" "}
                  {money(values.monthlyRent ?? 0)}/mo is a scenario assumption;
                  a signed lease or rent roll could move the ceiling
                  materially.
                </li>
                <li className={MEMO_LIST_ITEM}>
                  <strong className="font-semibold">Financing:</strong>{" "}
                  {values.interestRate}% at {values.downPaymentPct}% down is
                  not a quote. Rate, points, PMI, and reserves can change cash
                  flow and DSCR.
                </li>
                <li className={MEMO_LIST_ITEM}>
                  <strong className="font-semibold">Operating costs:</strong>{" "}
                  taxes, insurance, vacancy, maintenance, management, and CapEx
                  are screening inputs—not verified bills or bids.
                </li>
              </ul>
            </div>

            <div className="min-w-0">
              <h2 className="font-display text-balance text-h3-sm sm:text-2xl">
                What should I verify next?
              </h2>
              {/* The numbers are typed copy, so the list keeps no markers of
                  its own. */}
              <ol className={cn(MEMO_LIST, "list-none")}>
                <li className={MEMO_LIST_ITEM}>
                  <strong className="font-semibold">1. Income:</strong> confirm
                  contract rent, concessions, utilities, and current
                  occupancy.
                </li>
                <li className={MEMO_LIST_ITEM}>
                  <strong className="font-semibold">2. Debt:</strong> obtain a
                  written investor-loan quote with rate, points, DSCR
                  definition, escrows, and reserve requirements.
                </li>
                <li className={MEMO_LIST_ITEM}>
                  <strong className="font-semibold">3. Property costs:</strong>{" "}
                  verify post-transfer taxes, insurance, inspection findings,
                  and near-term capital work.
                </li>
              </ol>
            </div>
          </div>
        </Section>

        <Section aria-labelledby="memo-method" rhythm="tight">
          <div className="max-w-[68ch]">
            <h2
              id="memo-method"
              className="font-display text-balance text-h3-sm sm:text-2xl"
            >
              Methodology and scope
            </h2>
            <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">
              Generated from TrueCap&apos;s sample deal using the{" "}
              {TRUECAP_UNDERWRITING_STANDARD_NAME} v{analysis.methodologyVersion}.
              Targets: {SAMPLE_DEAL_FIXTURE.targetProfile.name}. The same sample
              powers the homepage preview and the opened sample analysis.
            </p>
            <Link
              href="/methodology"
              className="tc-link mt-2 inline-flex min-h-11 items-center text-base"
            >
              Review the methodology
            </Link>
          </div>
        </Section>

        <Section rule="heavy" rhythm="tight">
          <ActionRow>
            <Link
              href="/analyze"
              prefetch={false}
              className={buttonVariants({ size: "cta" })}
            >
              Analyze a deal
            </Link>
            <Link
              href="/pricing"
              className={buttonVariants({ variant: "outline", size: "cta" })}
            >
              See decision memo access
            </Link>
          </ActionRow>
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}
