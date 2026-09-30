/**
 * /vs/biggerpockets-calculator — competitor comparison landing page.
 *
 * Target queries: "BiggerPockets calculator alternative", "BiggerPockets
 * vs ...", "free BiggerPockets calculator", "BiggerPockets calculator
 * pro", "BP rental calculator". MASSIVE commercial-intent search volume —
 * BiggerPockets is the brand-name destination for real estate calculators.
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
  VS_FOOTNOTE,
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
  title: "Free BiggerPockets Calculator Alternative (2026)",
  description:
    "A fair TrueCap vs BiggerPockets calculator workflow comparison: address-first screening, detailed analysis, decision packaging, and ecosystem tradeoffs.",
  keywords: [
    "biggerpockets calculator alternative",
    "biggerpockets calculator vs truecap",
    "truecap vs biggerpockets",
    "biggerpockets rental calculator",
    "biggerpockets pro alternative",
    "free biggerpockets calculator",
    "rental analysis tool comparison",
  ],
  alternates: { canonical: "/vs/biggerpockets-calculator" },
  openGraph: {
    title: "Free BiggerPockets Calculator Alternative (2026)",
    description:
      "Address-first decision workflow vs a detailed calculator inside a broader investor ecosystem.",
    url: "/vs/biggerpockets-calculator",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap vs BiggerPockets Calculator",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Row = { workflow: string; truecap: string; bp: string };

const MATRIX: Row[] = [
  {
    workflow: "First screen",
    truecap:
      "Address-first screen with editable starting assumptions and core economics.",
    bp: "Detailed rental-property input workflow with report-style results.",
  },
  {
    workflow: "Underwriting sequence",
    truecap:
      "Connects Buy Box fit, Offer Ceiling, downside, and presentation.",
    bp: "Centers on a detailed calculator and the investor's interpretation of its report.",
  },
  {
    workflow: "Scenario depth",
    truecap:
      "Includes a 10-year cash-flow and equity projection plus downside sensitivity in paid workflows.",
    bp: "Its rental calculator captures purchase, loan, income, expense, and projection inputs.",
  },
  {
    workflow: "Offer Ceiling",
    truecap:
      "Offer Ceiling works backward from your target and shows threshold alternatives.",
    bp: "The calculator supports an offer-price input inside a broader rental analysis.",
  },
  {
    workflow: "Ecosystem",
    truecap: "Focused product, methodology, blog, and glossary.",
    bp: "Calculator inside a large community, education, media, and marketplace ecosystem.",
  },
  {
    workflow: "Best fit",
    truecap: "Investors who want a guided address-to-underwrite sequence.",
    bp: "Investors who value a detailed calculator inside the BiggerPockets ecosystem.",
  },
];

export default function VsBiggerPocketsCalculatorPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Free BiggerPockets Calculator Alternative (2026)",
    url: `${siteUrl}/vs/biggerpockets-calculator`,
    description:
      "Side-by-side comparison of TrueCap and the BiggerPockets Rental Property Calculator for rental underwriting.",
    dateModified: lastmodFor("/vs/biggerpockets-calculator"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema
        vsPath="/vs/biggerpockets-calculator"
        pageName="TrueCap vs BiggerPockets Calculator"
      />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs BiggerPockets Calculator:{" "}
            which one fits how you actually work?
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            BiggerPockets has been the default real estate analysis tool for two
            decades. Their calculator is solid. We built TrueCap because we
            wanted an address-first workflow that connects the initial screen to
            Buy Box fit, an Offer Ceiling, downside, and presentation.
            BiggerPockets may be the better choice when its community and
            education ecosystem are part of what you value. Here is the workflow
            comparison.
          </p>
          <ActionRow className={VS_ACTIONS}>
            <AnalyzeCtaLink analyticsSource="vs_hero" className={buttonVariants({ size: "cta" })}>
              Try the TrueCap free analyzer
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
            TL;DR — which to pick
          </SectionHeading>
          <div className={VS_TLDR_GRID}>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Pick TrueCap if
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>
                  You want a fully usable free tier with no per-analysis limits.
                </li>
                <li>
                  You want an address-first screen with labeled starting
                  assumptions.
                </li>
                <li>
                  You want a Deal score with a plain-English breakdown.
                </li>
                <li>You want a portfolio rollup across saved deals.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Pick BiggerPockets if
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>
                  You&apos;re already deep in the BiggerPockets ecosystem
                  (forums, podcast, books, courses).
                </li>
                <li>
                  You want the community + calculator + content all bundled in
                  one membership.
                </li>
                <li>
                  You want the longest track record / brand recognition in the
                  space.
                </li>
                <li>
                  You already have a paid Pro subscription you&apos;re using.
                </li>
                <li>
                  You need the BP forums for partner / lender / contractor
                  connections.
                </li>
              </ul>
            </div>
          </div>
          <p className={VS_FOOTNOTE}>
            Only need a free calculator? Full list:{" "}
            <IntentPrefetchLink
              href="/blog/free-biggerpockets-calculator-alternatives"
              className="tc-link"
            >
              free BiggerPockets calculator alternatives
            </IntentPrefetchLink>
          </p>
        </Section>

        {/* Matrix */}
        <Section aria-labelledby="vs-matrix-heading">
          <SectionHeading id="vs-matrix-heading">
            Workflow-by-workflow
          </SectionHeading>
          <p className={VS_INTRO}>
            Both tools analyze rentals. The difference is how the analysis
            becomes a decision.
          </p>
          <ScrollX label="Comparison table" className="mt-8 max-w-5xl">
            <VsMatrixTable
              head={["Workflow", "TrueCap", "BiggerPockets Calculator"]}
              rows={MATRIX.map((row) => ({
                label: row.workflow,
                truecap: row.truecap,
                competitor: row.bp,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            Pricing and feature availability change. BiggerPockets Calculator
            details were reviewed against its official product pages on August
            15, 2026. See{" "}
            <a
              href="https://www.biggerpockets.com/rental-property-calculator"
              target="_blank"
              rel="noopener noreferrer"
              className="tc-link"
            >
              BiggerPockets Rental Property Calculator
            </a>{" "}
            for its current state.
          </p>
        </Section>

        {/* Workflow fit */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            Choose TrueCap when you want a focused decision workflow
          </SectionHeading>
          <div className={VS_PROSE}>
            <ul>
              <li>
                <strong>Screen before creating an account.</strong> TrueCap&apos;s
                core analyzer is available before signup.
              </li>
              <li>
                <strong>Start from labeled assumptions.</strong> TrueCap can
                pre-fill editable HUD area rent and the FRED owner-occupied
                mortgage-rate benchmark; property tax is a manual local input.
              </li>
              <li>
                <strong>Keep the product focused.</strong> TrueCap centers on
                screening, offer price, downside, and presenting the decision;
                BiggerPockets pairs its calculator with a much broader investor
                ecosystem.
              </li>
              <li>
                <strong>Connect the outputs.</strong> TrueCap&apos;s Buy Box fit
                leads into the Offer Ceiling, downside, and reporting instead of
                treating each as a separate destination.
              </li>
            </ul>
          </div>
        </Section>

        {/* When NOT to switch */}
        <Section aria-labelledby="vs-choice-heading">
          <SectionHeading id="vs-choice-heading">
            When BiggerPockets is the right choice
          </SectionHeading>
          <div className={VS_PROSE}>
            <p>
              Be honest: not every investor should switch. Stay with BiggerPockets
              if any of these apply:
            </p>
            <ul>
              <li>
                You actively use the forums for partner / lender / contractor
                introductions in your market.
              </li>
              <li>You&apos;re working through a BP course or bootcamp.</li>
              <li>
                You need an established brand-name for credibility (if you&apos;re
                using output in client presentations to investors).
              </li>
              <li>
                You already have all your historical deals in BP and don&apos;t
                want to migrate.
              </li>
            </ul>
            <p>
              If you only need one number — not a full calculator suite —
              TrueCap&apos;s free single-purpose tools cover the screening end
              for free: the{" "}
              <IntentPrefetchLink
                href="/tools/1-percent-rule-calculator"
                className="tc-link"
              >
                1% rule calculator
              </IntentPrefetchLink>
              , the{" "}
              <IntentPrefetchLink
                href="/tools/gross-rent-multiplier-calculator"
                className="tc-link"
              >
                gross rent multiplier calculator
              </IntentPrefetchLink>
              , and the{" "}
              <IntentPrefetchLink
                href="/tools/mortgage-payment-calculator"
                className="tc-link"
              >
                mortgage payment calculator
              </IntentPrefetchLink>
              . Cap rate, cash-on-cash and DSCR are not separate pages here — they
              come out of the{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                full analyzer
              </Link>
              , and if you would rather run the arithmetic yourself, the
              walkthroughs on{" "}
              <IntentPrefetchLink
                href="/blog/how-to-calculate-cap-rate"
                className="tc-link"
              >
                how to calculate cap rate
              </IntentPrefetchLink>{" "}
              and{" "}
              <IntentPrefetchLink
                href="/blog/how-to-calculate-dscr"
                className="tc-link"
              >
                how to calculate DSCR
              </IntentPrefetchLink>{" "}
              show every step. For the rehab side, start with{" "}
              <IntentPrefetchLink
                href="/blog/brrrr-method-explained"
                className="tc-link"
              >
                the BRRRR workflow guide
              </IntentPrefetchLink>
              .
            </p>
          </div>
        </Section>

        <ComparisonFaq
          competitorName="BiggerPockets Calculator"
          items={BP_FAQ}
          reviewedDate="August 15, 2026"
        />

        {/* Pricing CTA */}
        <CloseSection
          headingId="vs-close-heading"
          heading={<>Try TrueCap free — see if the address-to-underwrite workflow fits.</>}
          lede={
            <>
              Screen a property without a card, inspect the assumptions and core
              economics, then decide whether TrueCap&apos;s connected Buy Box,
              Offer Ceiling, downside, and reporting workflow fits how you acquire
              rentals.
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
            <RelatedContent kind="vs" slug="biggerpockets-calculator" />
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
                    href="/vs/stessa"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Stessa
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

const BP_FAQ: FaqItem[] = [
  {
    question: "Is the BiggerPockets calculator free?",
    answer: (
      <>
        BiggerPockets can change calculator access and membership terms, so
        check its official{" "}
        <a
          href="https://www.biggerpockets.com/rental-property-calculator"
          target="_blank"
          rel="noopener noreferrer"
          className="tc-link"
        >
          calculator page
        </a>{" "}
        for the current offer. TrueCap&apos;s core screen is available without
        signup or a monthly analysis limit.
      </>
    ),
  },
  {
    question:
      "What's the best alternative to the BiggerPockets rental calculator?",
    answer: (
      <>
        TrueCap is an address-first alternative: it can pre-fill editable HUD
        rent and the FRED owner-occupied mortgage-rate benchmark, keeps property
        tax manual, and shows Buy Box fit plus a Deal score
        alongside the standard metrics. BiggerPockets&apos; calculator is a
        detailed analysis workflow inside a much larger community and education
        ecosystem.
      </>
    ),
  },
  {
    question: "How much is TrueCap vs BiggerPockets Pro?",
    answer: (
      <>
        See TrueCap&apos;s{" "}
        <IntentPrefetchLink href="/pricing" className="tc-link">
          live pricing page
        </IntentPrefetchLink>{" "}
        and BiggerPockets&apos; official membership and calculator pages for
        current prices. BiggerPockets bundles a broader community and education
        ecosystem, so price alone is not an apples-to-apples comparison.
      </>
    ),
  },
  {
    question: "Does TrueCap have a 10-year projection like BiggerPockets?",
    answer: (
      <>
        Yes. TrueCap Pro&apos;s 10-year projection models user-editable rent
        growth, expense growth, appreciation, and amortization into annual cash
        flow and equity scenarios. These are estimates, not forecasts or
        guarantees, and they can be included in a report.
      </>
    ),
  },
  {
    question:
      "Can I share a TrueCap analysis without making the viewer sign up?",
    answer: (
      <>
        Yes — and you don&apos;t need Pro for it. TrueCap generates a public
        read-only share link for a deal on the free tier, with no login required
        for the recipient. Pro adds custom co-branding such as logo, color, and
        company name.
      </>
    ),
  },
  {
    question: "When should I stick with BiggerPockets?",
    answer: (
      <>
        Stick with BiggerPockets if its community, education, and existing
        calculator workflow are central to how you invest. Choose TrueCap if you
        want a focused address-to-underwrite experience with labeled starting
        assumptions, Buy Box fit, an Offer Ceiling, downside, and
        presentation in one sequence.
      </>
    ),
  },
];
