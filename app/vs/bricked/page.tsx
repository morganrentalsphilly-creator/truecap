/**
 * /vs/bricked — competitor comparison landing page.
 *
 * Target queries: "bricked ai alternative", "bricked ai review",
 * "bricked ai pricing", "bricked vs", "ai real estate underwriting".
 * Bricked (bricked.ai) is an AI comps + repair-estimate + ARV tool
 * aimed at wholesalers, flippers, agents, and acquisition teams. Its
 * plans are fixed monthly comp quotas (Basic and Growth, checked on
 * bricked.ai/pricing in October 2026). Its focus is VALUATION and the
 * offer; TrueCap's is rental RETURNS. Bricked also shows a rental offer
 * calculator (rent, costs, cash flow) and financing calculators, so no
 * cell here says it lacks them.
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
  },
  twitter: { card: "summary_large_image" },
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
    bricked: "Wholesalers, flippers, agents, acquisition teams",
    winner: "tie",
  },
  {
    feature: "Cash flow / cap rate / CoC / DSCR",
    truecap: "Yes — full engine, free tier",
    bricked:
      "A rental offer calculator with monthly rent, costs and cash flow; cap rate, CoC and DSCR are not listed on bricked.ai",
    winner: "tie",
  },
  {
    feature: "10-year cash-flow + equity projection",
    truecap: "Pro — editable rent, expense, value, and financing assumptions",
    bricked: "Not listed on bricked.ai",
    winner: "truecap",
  },
  {
    feature: "Financing math (PITI, amortization, DSCR)",
    truecap: "Yes — full loan modeling",
    bricked:
      "Offer calculators for hard money, seller finance and subject-to (loan amount, rate, monthly payment); no amortization schedule or DSCR published",
    winner: "tie",
  },
  {
    feature: "Comps + ARV / market value",
    truecap: "One free sale and rent comps lookup; Pro includes up to 50 per month",
    bricked:
      "Yes: comps from MLS, county records and public listing sites, with as-is value and ARV",
    winner: "bricked",
  },
  {
    feature: "Repair cost estimates",
    truecap:
      "A free rehab cost estimator: default line items you switch on or off, with the square footage, bath count and contingency you set",
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
      "HUD benchmark: ZIP-level when available, otherwise the HUD Fair Market Rent area; when an address has no county match, a statewide HUD figure, labeled as such",
    bricked: "A rental offer calculator with a monthly rent line",
    winner: "tie",
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
    bricked:
      "Basic $89 a month, or $69 a month billed yearly, for 100 comps a month; Growth $199 a month, or $149 billed yearly, for 300 (as of October 2026)",
    winner: "tie",
  },
  {
    feature: "PDF + share links",
    truecap: "Read-only share links free; PDFs included with Pro",
    bricked:
      "A PDF report with your logo, or a live link; white-label CMA reports on Growth",
    winner: "tie",
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
            and prices offers for flippers and wholesalers working at volume.
            TrueCap is a rental-screening calculator — it estimates cash flow,
            cap rate, CoC, and DSCR from reviewed assumptions. Both promise
            underwriting in seconds. They mean different things by it.
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
            priority
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
                  You analyze a few deals a month and don&apos;t need a monthly
                  comp quota.
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
            Bricked details checked against bricked.ai and its pricing page in
            October 2026. See{" "}
            <a
              href="https://bricked.ai/pricing"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              Bricked&apos;s pricing page
            </a>{" "}
            for current plans.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            How the two tools can fit together
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
                TrueCap&apos;s integrated BRRRR and flip models aren&apos;t
                offered right now.
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
                project ledger; use TrueCap&apos;s sensitivity grid for rent,
                vacancy, and rate.
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

        <ComparisonFaq
          competitorName="Bricked"
          items={BRICKED_FAQ}
          reviewedDate="October 2026"
        />

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
        offers at volume. TrueCap is a returns calculator: cash flow, DSCR,
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
        Partly. Bricked&apos;s offer calculators include a rental view with
        monthly rent, monthly costs, and monthly cash flow, plus financing
        views for hard money, seller finance, and subject-to. Its site does not
        list DSCR, cap rate, cash-on-cash, or a multi-year projection. TrueCap
        covers those: cap rate, cash-on-cash, and DSCR in the free analyzer, and
        a 10-year cash-flow and equity projection with Pro.
      </>
    ),
  },
  {
    question: "How does Bricked's pricing compare to TrueCap's?",
    answer: (
      <>
        Bricked&apos;s Basic plan is $89 a month, or $69 a month billed yearly,
        for 100 comps a month. Growth is $199 a month, or $149 billed yearly,
        for 300. Bricked says there are no per-use add-ons; Basic starts with a
        3-day free trial and there is no free tier (as of October 2026).
        TrueCap&apos;s core analyzer is free with no
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
        pricing by ZIP to produce itemized estimates, while TrueCap&apos;s free
        rehab cost estimator uses default line items you switch on or off,
        with the square footage, bath count and contingency you set.
        TrueCap&apos;s estimator is built for a quick planning budget, not
        contractor-grade scoping. If repair precision drives your
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
        and TrueCap&apos;s core analyzer for the stabilized rental fallback.
        TrueCap&apos;s integrated fix-and-flip and BRRRR models aren&apos;t
        offered right now. Choose the workflow that matches the decision you
        need.
      </>
    ),
  },
];

