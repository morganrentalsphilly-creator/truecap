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
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { AuthorBio } from "@/components/marketing/author-bio";
import { BlogByline } from "@/components/marketing/blog-byline";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { ProductShot } from "@/components/marketing/product-shot";
import { SiteFooter } from "@/components/marketing/site-footer";
import { RelatedContent } from "@/components/marketing/related-content";
import { AnalyzeCtaLink } from "@/components/marketing/analyze-cta-link";
import {
  ComparisonFaq,
  type FaqItem,
} from "@/components/marketing/comparison-faq";
import { ActionRow, CloseSection } from "@/components/marketing/page-parts";
import { Section, SectionHeading } from "@/components/marketing/section";
import {
  VS_ACTIONS,
  VS_H1,
  VS_INTRO,
  VS_LEDE,
  VS_LINK_ROW,
  VS_NOTE,
  VS_PROSE,
  VS_SOURCES,
  VS_TLDR_GRID,
  VS_TLDR_LABEL,
  VS_TLDR_LIST,
  VsHero,
  VsMatrixTable,
} from "@/components/marketing/vs-page";
import { getSiteUrl } from "@/lib/site-url";
import { VsBreadcrumbSchema } from "@/components/marketing/vs-breadcrumb-schema";
import { buttonVariants } from "@/components/ui/button";
import { ScrollX } from "@/components/ui/scroll-x";
import { Header } from "@/components/investcalc/header";
import { lastmodFor } from "@/lib/seo/lastmod";
import { JsonLd } from "@/components/seo/json-ld";

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
    dateModified: lastmodFor("/vs/bricked"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema
        vsPath="/vs/bricked"
        pageName="TrueCap vs Bricked AI"
      />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs Bricked:{" "}
            what it&apos;s worth vs what it earns
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            Bricked is an AI valuation tool — it finds comps, estimates repairs,
            and prices cash offers for flippers and wholesalers working at
            volume. TrueCap is a rental-screening calculator — it estimates cash
            flow, cap rate, CoC, and DSCR from reviewed assumptions. Both say
            &quot;underwrite in seconds.&quot; They mean different things by it.
          </p>
          <ActionRow className={VS_ACTIONS}>
            <AnalyzeCtaLink analyticsSource="vs_hero" className={buttonVariants({ size: "cta" })}>
              Run a deal — 60 seconds
            </AnalyzeCtaLink>
            <Link
              href="/pricing"
              className={buttonVariants({ variant: "outline", size: "cta" })}
            >
              See TrueCap pricing
            </Link>
          </ActionRow>
          <p className={VS_NOTE}>
            Free analyzer: no card or signup
          </p>
        </VsHero>

        {/* Real product screenshot from the free sample deal, set as a
            document (no fake browser frame). */}
        <Section rule="none" rhythm="tight" aria-label="What the decision looks like">
          <ProductShot
            shot="verdict"
            frame="document"
            sizes="(min-width: 768px) 768px, 100vw"
            className="max-w-3xl"
            alt="TrueCap's decision view for the sample deal: the Offer Ceiling beside the asking price, cash flow after reserves, and DSCR"
            caption={<>Real output from the free sample deal. <Link href="/analyze?sample=1" prefetch={false} className="tc-link">Run it yourself</Link></>}
          />
        </Section>

        {/* TL;DR */}
        <Section rhythm="tight" aria-labelledby="vs-tldr-heading">
          <SectionHeading id="vs-tldr-heading">
            TL;DR
          </SectionHeading>
          <div className={VS_TLDR_GRID}>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use TrueCap when
              </h3>
              <ul className={VS_TLDR_LIST}>
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
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use Bricked when
              </h3>
              <ul className={VS_TLDR_LIST}>
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
        </Section>

        {/* Matrix */}
        <Section aria-labelledby="vs-matrix-heading">
          <SectionHeading id="vs-matrix-heading">
            Feature-by-feature
          </SectionHeading>
          <p className={VS_INTRO}>
            Side-by-side on every dimension that matters — including the ones
            where Bricked is genuinely ahead.
          </p>
          <ScrollX label="Comparison table" className="mt-8 max-w-5xl">
            <VsMatrixTable
              head={["Feature", "TrueCap", "Bricked"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.bricked,
                winner: row.winner === "bricked" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            Bricked details based on publicly available product info, verified
            June 2026. See{" "}
            <a
              href="https://bricked.ai"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              bricked.ai
            </a>{" "}
            for their current state.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            How the released tools can fit together
          </SectionHeading>
          <div className={VS_PROSE}>
            <ol>
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
            <p>
              Holding instead of flipping? Start with the{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                free TrueCap analyzer
              </Link>{" "}
              or the{" "}
              <IntentPrefetchLink
                href="/blog/brrrr-method-explained"
                className="tc-link"
              >
                BRRRR workflow guide
              </IntentPrefetchLink>
              .
            </p>
          </div>
        </Section>

        <ComparisonFaq competitorName="Bricked" items={BRICKED_FAQ} />

        {/* Pricing CTA */}
        <CloseSection
          headingId="vs-close-heading"
          heading={<>Review what the entered assumptions model — free.</>}
          lede={
            <>
              TrueCap&apos;s no-account preliminary screen covers cap rate, CoC,
              DSCR, and monthly cash flow. The first complete decision and
              evaluation allowances are shown on the pricing page. Pro adds
              10-year cash-flow and equity projections, sensitivity, Offer
              Ceiling, saved-deal comparison, and PDF reports in one paid plan.
              See live pricing for the current rate and limits.
            </>
          }
          actions={
            <ActionRow>
              <Link
                href="/analyze" prefetch={false}
                className={buttonVariants({ size: "cta" })}
              >
                Run a deal now
              </Link>
              <IntentPrefetchLink
                href="/pricing"
                className={buttonVariants({ variant: "outline", size: "cta" })}
              >
                See Pro pricing
              </IntentPrefetchLink>
            </ActionRow>
          }
        />

        <Section rule="none" rhythm="tight">
          <div className="max-w-5xl">
            <RelatedContent kind="vs" slug="bricked" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
                <li>
                  <IntentPrefetchLink
                    href="/vs/dealcheck"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs DealCheck
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/propstream"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs PropStream
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/mashvisor"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Mashvisor
                  </IntentPrefetchLink>
                </li>
              </ul>
            </footer>
          </div>
        </Section>
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
  },
];

