import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldAlert } from "lucide-react";

import { Header } from "@/components/investcalc/header";
import { GlossaryTip } from "@/components/investcalc/glossary-tip";
import { SiteFooter } from "@/components/marketing/site-footer";
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
      <main id="main">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
          <div className="rounded-2xl border border-caution/30 bg-caution-light px-4 py-3 text-sm text-caution-text">
            <strong>Illustrative sample — not a customer result.</strong> The
            address and every input below are illustrative assumptions, not
            verified property facts.
          </div>

          <header className="mt-8 border-b border-border pb-8">
            <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-5xl">
              Doesn&apos;t meet your targets at asking.
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              Sample decision memo · {SAMPLE_DEAL_FIXTURE.display.shortAddress} ·
              asking {money(values.purchasePrice)}
            </p>
          </header>

          <section
            aria-labelledby="sample-decision"
            className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]"
          >
            <article className="rounded-2xl border-2 border-primary/30 bg-card p-5 shadow-sm sm:p-6">
              <h2
                id="sample-decision"
                className="text-xs font-extrabold uppercase tracking-widest text-primary"
              >
                Offer Ceiling
              </h2>
              <p className="mt-2 font-mono text-4xl font-extrabold tabular-nums text-primary sm:text-5xl">
                {money(maxOffer.maxPrice)}
              </p>
              <p className="mt-2 text-sm font-semibold">
                {SAMPLE_DEAL_FIXTURE.targetProfile.name} ·{" "}
                {describeMaoTarget(SAMPLE_DEAL_FIXTURE.maoTarget)}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                The asking price is{" "}
                {money(values.purchasePrice - maxOffer.maxPrice)} above this
                ceiling.
              </p>
              <dl className="mt-5 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Binding
                  </dt>
                  <dd className="mt-1 text-sm font-semibold">
                    {ceiling.bindingConstraints
                      .map((item) => item.criterion)
                      .join(" + ") || "Not resolved"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Next constraint
                  </dt>
                  <dd className="mt-1 text-sm font-semibold">
                    {ceiling.nextConstraint?.criterion ?? "None"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Screening range
                  </dt>
                  <dd className="mt-1 text-sm font-semibold">
                    {ceiling.range.lower == null
                      ? "No feasible downside price"
                      : money(ceiling.range.lower)}
                    –
                    {ceiling.range.upper == null
                      ? "No feasible upside price"
                      : money(ceiling.range.upper)}
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">
                      If {ceiling.range.label}.
                    </span>
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                The highest price that still meets{" "}
                {SAMPLE_DEAL_FIXTURE.targetProfile.name} under the assumptions
                shown.
              </p>
            </article>

            <article className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                Base economics at asking
              </h2>
              <dl className="mt-4 grid grid-cols-2 gap-4">
                {baseEconomics.map(({ label, term, value, toneClass }) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">
                      <GlossaryTip term={term} className="!no-underline">
                        {label}
                      </GlossaryTip>
                    </dt>
                    <dd
                      className={`mt-1 font-mono text-lg font-extrabold tabular-nums ${toneClass ?? "text-foreground"}`}
                    >
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
                Deal score {Math.round(dealScore.score)}/100 · a heuristic
                summary of the modeled numbers.
              </p>
            </article>
          </section>

          <section aria-labelledby="memo-what" className="mt-8">
            <h2 id="memo-what" className="text-lg font-extrabold">
              What a decision memo is
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              A decision memo is the written form of an analysis: the answer at
              asking price, the Offer Ceiling with the targets that produced
              it, the cash flow after reserves and the DSCR that drove the
              verdict, the assumptions with their sources, the two inputs most
              likely to change the outcome, and what to verify before you
              offer. It is what you hand a partner, a lender, or a client so
              the numbers and the reasoning travel together. This one is
              generated from the sample deal by the same engine that runs every
              analysis, so what you see here is exactly what a real deal
              produces.
            </p>
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-5 text-caution-text" aria-hidden />
                <h2 className="text-lg font-extrabold">
                  What could break the decision?
                </h2>
              </div>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed">
                <li>
                  <strong>Rent:</strong> {money(values.monthlyRent ?? 0)}/mo is
                  a scenario assumption; a signed lease or rent roll could move
                  the ceiling materially.
                </li>
                <li>
                  <strong>Financing:</strong> {values.interestRate}% at{" "}
                  {values.downPaymentPct}% down is not a quote. Rate, points,
                  PMI, and reserves can change cash flow and DSCR.
                </li>
                <li>
                  <strong>Operating costs:</strong> taxes, insurance, vacancy,
                  maintenance, management, and CapEx are screening inputs—not
                  verified bills or bids.
                </li>
              </ul>
            </article>

            <article className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-positive" aria-hidden />
                <h2 className="text-lg font-extrabold">
                  What should I verify next?
                </h2>
              </div>
              <ol className="mt-4 space-y-3 text-sm leading-relaxed">
                <li>
                  <strong>1. Income:</strong> confirm contract rent,
                  concessions, utilities, and current occupancy.
                </li>
                <li>
                  <strong>2. Debt:</strong> obtain a written investor-loan quote
                  with rate, points, DSCR definition, escrows, and reserve
                  requirements.
                </li>
                <li>
                  <strong>3. Property costs:</strong> verify post-transfer
                  taxes, insurance, inspection findings, and near-term capital
                  work.
                </li>
              </ol>
            </article>
          </section>

          <section className="mt-8 rounded-2xl border border-border bg-muted/30 p-5 text-sm sm:p-6">
            <h2 className="font-extrabold">Methodology and scope</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              Generated from TrueCap&apos;s sample deal using the{" "}
              {TRUECAP_UNDERWRITING_STANDARD_NAME} v{analysis.methodologyVersion}.
              Targets: {SAMPLE_DEAL_FIXTURE.targetProfile.name}. The same sample
              powers the homepage preview and the opened sample analysis.
            </p>
            <Link
              href="/methodology"
              className="mt-3 inline-flex min-h-11 items-center font-bold text-primary hover:underline"
            >
              Review the methodology{" "}
              <ArrowRight className="ml-1 size-4" aria-hidden />
            </Link>
          </section>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/analyze"
              prefetch={false}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 font-bold text-primary-foreground"
            >
              Analyze a Deal <ArrowRight className="ml-2 size-4" aria-hidden />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-5 font-bold"
            >
              See Decision Memo access
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
