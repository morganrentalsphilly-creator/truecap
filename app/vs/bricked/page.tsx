/**
 * /vs/bricked — competitor comparison landing page.
 *
 * Target queries: "bricked ai alternative", "bricked ai review",
 * "bricked ai pricing", "bricked vs", "ai real estate underwriting".
 * Bricked (bricked.ai) is an AI comps + repair-estimate + ARV tool
 * aimed at flippers, wholesalers, and acquisition teams ($49-199/mo,
 * metered per comp). It does VALUATION; TrueCap does RETURNS. The
 * honest framing — "what it's worth vs what it earns" — is also the
 * one that wins, because their tool genuinely has no cash-flow layer.
 * First-mover note: as of June 2026 Bricked has no comparison content
 * of their own; owning "bricked alternative" early frames the matchup.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Calculator,
  Check,
  Minus,
  Sparkles,
  X,
} from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { ProductShot } from "@/components/marketing/product-shot";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ScrollToFormButton } from "@/components/marketing/scroll-to-form-button";
import {
  ComparisonFaq,
  type FaqItem,
} from "@/components/marketing/comparison-faq";
import { getSiteUrl } from "@/lib/site-url";
import { VsBreadcrumbSchema } from "@/components/marketing/vs-breadcrumb-schema";

export const metadata: Metadata = {
  title: "Bricked AI vs TrueCap (2026): Flip ARV vs Rentals",
  description:
    "Bricked focuses on AI comps, ARV, and repair costs. TrueCap screens stabilized rental cash flow, cap rate, CoC, and DSCR from reviewed assumptions.",
  keywords: [
    "bricked ai alternative",
    "bricked ai review",
    "bricked ai pricing",
    "bricked vs truecap",
    "ai real estate underwriting",
    "ai rental property calculator",
  ],
  alternates: { canonical: "/vs/bricked" },
  openGraph: {
    title: "Bricked AI vs TrueCap (2026): Flip ARV vs Rentals",
    description:
      "Bricked: AI comps, ARV, and repair costs. TrueCap: stabilized rental cash flow, cap rate, CoC, and DSCR.",
    url: "/vs/bricked",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap vs Bricked AI",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "bricked" | "tie";
type Row = {
  feature: string;
  truecap: string;
  bricked: string;
  winner: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Primary purpose",
    truecap: "Preliminary rental screen from editable assumptions",
    bricked: "AI valuation — what's it worth, what do repairs cost?",
    winner: "tie",
  },
  {
    feature: "Built for",
    truecap: "Buy-and-hold investors, house-hackers, agents",
    bricked: "Flippers, wholesalers, acquisition teams",
    winner: "tie",
  },
  {
    feature: "Cash flow / cap rate / CoC / DSCR",
    truecap: "Yes — full engine, free tier",
    bricked: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "10-year cash-flow + equity projection",
    truecap: "Pro — editable rent, expense, value, and financing assumptions",
    bricked: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "Financing math (PITI, amortization, DSCR)",
    truecap: "Yes — full loan modeling",
    bricked: "Not included",
    winner: "truecap",
  },
  {
    feature: "Comps + ARV / market value",
    truecap: "Purchase price is user input — no AVM",
    bricked: "Yes — AI-selected comps from MLS + county data, ARV + CMV",
    winner: "bricked",
  },
  {
    feature: "Repair cost estimates",
    truecap: "Rehab estimator with sq-ft-based defaults",
    bricked: "Itemized, ZIP-localized material + labor costs",
    winner: "bricked",
  },
  {
    feature: "Photo-based condition scoring",
    truecap: "No",
    bricked: "Yes — renovated vs as-is detection",
    winner: "bricked",
  },
  {
    feature: "Rent data",
    truecap:
      "HUD area benchmark — ZIP-level when available, otherwise broader FMR area",
    bricked: "Not the focus",
    winner: "truecap",
  },
  {
    feature: "AI deal Q&A on your numbers",
    truecap: "Yes — grounded in the computed analysis",
    bricked: "AI picks comps; no investment Q&A",
    winner: "truecap",
  },
  {
    feature: "Try without signup",
    truecap: "Yes — full analysis, no account",
    bricked: "No — account + 3-day trial",
    winner: "truecap",
  },
  {
    feature: "Free tier",
    truecap: "Yes — unlimited core underwriting",
    bricked: "No — trial only",
    winner: "truecap",
  },
  {
    feature: "Entry pricing",
    truecap: "Free core; paid Pro with published limits — see live pricing",
    bricked: "$49/mo for 100 comps, metered up to $199/mo (as of June 2026)",
    winner: "truecap",
  },
  {
    feature: "PDF + share links",
    truecap: "Read-only share links free; PDFs included with Pro",
    bricked: "Not the focus",
    winner: "truecap",
  },
  {
    feature: "API access",
    truecap: "No",
    bricked: "Yes — Growth tier and up",
    winner: "bricked",
  },
];

export default function VsBrickedPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Bricked AI vs TrueCap (2026): Flip ARV vs Rentals",
    url: `${siteUrl}/vs/bricked`,
    description:
      "Bricked focuses on AI comps, ARV, and repair costs. TrueCap screens stabilized rental cash flow, cap rate, CoC, and DSCR.",
    dateModified: "2026-06-12",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema
        vsPath="/vs/bricked"
        pageName="TrueCap vs Bricked AI"
      />
      <main id="main" className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-2">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
          >
            ← TrueCap
          </Link>
        </div>

        {/* Hero */}
        <section className="mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary mb-4">
            <Sparkles className="size-3" />
            Honest comparison
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight text-balance">
            TrueCap vs Bricked:{" "}
            <span className="text-primary">
              what it&apos;s worth vs what it earns
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Bricked is an AI valuation tool — it finds comps, estimates repairs,
            and prices cash offers for flippers and wholesalers working at
            volume. TrueCap is a rental-screening calculator — it estimates cash
            flow, cap rate, CoC, and DSCR from reviewed assumptions. Both say
            &quot;underwrite in seconds.&quot; They mean different things by it.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5">
              <Calculator className="size-4" />
              Run a deal — 60 seconds
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </ScrollToFormButton>
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              See TrueCap pricing
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Free analyzer: no card or signup
          </p>
        </section>

        {/* Real product screenshot from the free sample deal. */}
        <section className="mb-12 sm:mb-16" aria-label="What the decision looks like">
          <ProductShot
            shot="verdict"
            alt="TrueCap's decision view for the sample deal: the Offer Ceiling beside the asking price, cash flow after reserves, and DSCR"
            caption={<>Real output from the free sample deal. <Link href="/analyze?sample=1" prefetch={false} className="font-semibold text-primary underline underline-offset-4">Run it yourself →</Link></>}
          />
        </section>

        {/* TL;DR */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">
            TL;DR
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">
                Use TrueCap when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>
                  You&apos;re deciding whether a rental deserves your down
                  payment.
                </li>
                <li>
                  You want cash flow, DSCR, cap rate, and CoC — with financing
                  math baked in.
                </li>
                <li>
                  You want sensitivity and a 10-year cash-flow and equity
                  planning projection.
                </li>
                <li>
                  You analyze a few deals a month and don&apos;t want a $49+
                  metered plan.
                </li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use Bricked when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>
                  You make cash offers at volume and need ARV from comps, fast.
                </li>
                <li>
                  You want itemized repair estimates grounded in local costs.
                </li>
                <li>You need photo-based renovated-vs-as-is comp filtering.</li>
                <li>
                  You&apos;re a wholesaling / acquisitions team with comp
                  budgets.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Matrix */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            Feature-by-feature
          </h2>
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">
            Side-by-side on every dimension that matters — including the ones
            where Bricked is genuinely ahead.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Feature
                  </th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-primary">
                    TrueCap
                  </th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Bricked
                  </th>
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row) => (
                  <tr
                    key={row.feature}
                    className="border-t border-border align-top"
                  >
                    <td className="py-3 px-3 text-sm font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <WinnerBadge winner={row.winner} side="row" />
                        {row.feature}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                      <div className="flex items-start gap-2">
                        <WinnerBadge winner={row.winner} side="truecap" />
                        <span>{row.truecap}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                      <div className="flex items-start gap-2">
                        <WinnerBadge winner={row.winner} side="bricked" />
                        <span>{row.bricked}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Bricked details based on publicly available product info, verified
            June 2026. See{" "}
            <a
              href="https://bricked.ai"
              target="_blank"
              rel="noopener"
              className="underline"
            >
              bricked.ai
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* Complementary workflow */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            How the released tools can fit together
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
            <li>
              <strong>Get ARV and repair costs from Bricked.</strong> Their
              comps and localized repair estimates answer the valuation
              question.
            </li>
            <li>
              <strong>
                Keep ARV and repair costs in a complete project ledger.
              </strong>{" "}
              TrueCap&apos;s integrated BRRRR and flip models are not currently
              released.
            </li>
            <li>
              <strong>Use TrueCap for the stabilized rental screen.</strong>{" "}
              Enter the expected post-renovation rent, operating expenses, and
              permanent loan to test cash flow and DSCR separately from the
              renovation ledger.
            </li>
            <li>
              <strong>Stress-test each model.</strong> Vary ARV, rehab,
              timeline, refinance terms, and later capital contributions in the
              project ledger; use TrueCap&apos;s released grid for rent,
              vacancy, and rate sensitivity.
            </li>
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            Holding instead of flipping? Start with the{" "}
            <Link
              href="/"
              className="font-semibold text-primary hover:underline"
            >
              free TrueCap analyzer
            </Link>{" "}
            or the{" "}
            <Link
              href="/blog/brrrr-method-explained"
              className="font-semibold text-primary hover:underline"
            >
              BRRRR workflow guide
            </Link>
            .
          </p>
        </section>

        <ComparisonFaq competitorName="Bricked" items={BRICKED_FAQ} />

        {/* Pricing CTA */}
        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Review what the entered assumptions model — free.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            TrueCap&apos;s no-account preliminary screen covers cap rate, CoC,
            DSCR, and monthly cash flow. The first complete decision and
            evaluation allowances are shown on the pricing page. Pro adds
            10-year cash-flow and equity projections, sensitivity, Offer
            Ceiling, saved-deal comparison, and PDF reports in one paid plan.
            See live pricing for the current rate and limits.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              See Pro pricing
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 border border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground px-4 py-2.5 rounded-xl font-bold hover:bg-primary-foreground/20 transition-colors"
            >
              <Calculator className="w-4 h-4" />
              Run a deal now
            </Link>
          </div>
        </section>

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground leading-relaxed">
          Other comparisons:{" "}
          <Link
            href="/vs/dealcheck"
            className="font-bold text-foreground hover:underline"
          >
            TrueCap vs DealCheck
          </Link>
          {" · "}
          <Link
            href="/vs/propstream"
            className="font-bold text-foreground hover:underline"
          >
            TrueCap vs PropStream
          </Link>
          {" · "}
          <Link
            href="/vs/mashvisor"
            className="font-bold text-foreground hover:underline"
          >
            TrueCap vs Mashvisor
          </Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const BRICKED_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Bricked alternative?",
    answer: (
      <>
        For rental investors, yes — for wholesalers, not really. Bricked is an
        AI valuation tool: comps, ARV, and repair estimates for people making
        cash offers at volume. TrueCap is a returns calculator: cash flow, DSCR,
        cap rate, sensitivity, and 10-year cash-flow and equity projections for
        people underwriting a rental. If you searched &quot;Bricked
        alternative&quot; because you wanted to review a property&apos;s modeled
        returns, TrueCap supports that workflow — and it&apos;s free to start.
      </>
    ),
    plainTextAnswer:
      "For rental investors yes; for wholesalers not really. Bricked is AI valuation (comps, ARV, repairs) for volume cash offers. TrueCap screens stabilized rental assumptions with cash flow, DSCR, sensitivity, and projections. Free to start.",
  },
  {
    question: "Does Bricked calculate cash flow or DSCR?",
    answer: (
      <>
        No. Bricked produces comps, ARV/market value, repair estimates, and an
        offer price. It does not model rental income, operating expenses,
        financing, DSCR, cap rate, cash-on-cash, taxes, or long-term projections
        — the entire question of what the property earns as a rental is out of
        its scope. That&apos;s the half TrueCap covers.
      </>
    ),
    plainTextAnswer:
      "No. Bricked produces comps, ARV, repair estimates, and an offer price. It doesn't model rental income, expenses, financing, DSCR, cap rate, taxes, or projections — that's the half TrueCap covers.",
  },
  {
    question: "How does Bricked's pricing compare to TrueCap's?",
    answer: (
      <>
        Bricked starts at $49/month for 100 comps, rising to $199/month for 500
        (metered, with a 3-day trial and no free tier) — priced for acquisition
        teams running volume. TrueCap&apos;s core analyzer is free with no
        analysis cap and no account required. Pro adds advanced analysis and
        reporting with published limits, including 50 comp lookups per month and
        comparison of up to four saved deals. PDF reports are included with Pro.
        See TrueCap&apos;s live pricing page for current rates and terms.
      </>
    ),
    plainTextAnswer:
      "Bricked publishes metered comp plans and a trial. TrueCap has unlimited free core analyses and paid Pro with published limits. Check both live pricing pages for current rates and terms.",
  },
  {
    question:
      "Are Bricked's repair estimates better than TrueCap's rehab estimator?",
    answer: (
      <>
        For precision, likely yes — Bricked aggregates local material and labor
        pricing by ZIP to produce itemized estimates, while TrueCap&apos;s rehab
        estimator uses square-footage-based defaults you adjust yourself.
        TrueCap&apos;s estimator is built for a quick budget inside a hold
        analysis, not contractor-grade scoping. If repair precision drives your
        deals (heavy rehabs, flips at volume), Bricked&apos;s approach is
        stronger; plug its number into TrueCap to see what the deal earns after
        the rehab.
      </>
    ),
    plainTextAnswer:
      "For precision, likely yes — Bricked uses ZIP-localized material + labor costs; TrueCap's rehab estimator uses sq-ft defaults for quick budgeting inside a hold analysis. Use Bricked's number in TrueCap to see what the deal earns after rehab.",
  },
  {
    question: "I'm a fix-and-flipper — which should I use?",
    answer: (
      <>
        If you flip at volume, Bricked&apos;s comps + repair engine fits your
        acquisition workflow. If you flip occasionally — or you&apos;re deciding
        between flipping and holding, use a complete project ledger for the flip
        and TrueCap&apos;s released core analyzer for the stabilized rental
        fallback. TrueCap&apos;s integrated fix-and-flip and BRRRR models are
        not currently released. Choose a released workflow that matches the
        decision you need.
      </>
    ),
    plainTextAnswer:
      "Bricked focuses on acquisition and comp workflows. TrueCap currently supports the stabilized rental screen but not an integrated flip or BRRRR lifecycle model. Use a complete project ledger for the project cash flows.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "bricked";
}) {
  if (side === "row") return null;
  if (winner === "tie") {
    return (
      <Minus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
    );
  }
  if (winner === side) {
    return (
      <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-green)]" />
    );
  }
  return <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />;
}
