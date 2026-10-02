/**
 * /vs/mashvisor-for-short-term-rentals — niche use-case comparison page (Short-term rentals cut).
 *
 * Target queries: "mashvisor short term rental", "mashvisor airbnb", "best str market tool", "airbnb investment calculator", "mashvisor alternative for str". Long-tail audience-slicing comparison.
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
  title: "Mashvisor vs TrueCap for STR Deals (2026)",
  description:
    "Mashvisor scores STR markets with Airbnb data. TrueCap underwrites the specific deal. Honest comparison for STR investors plus how they fit together.",
  keywords: [
    "mashvisor short term rental",
    "mashvisor airbnb",
    "best str market tool",
    "airbnb investment calculator",
    "mashvisor alternative for str",
  ],
  alternates: { canonical: "/vs/mashvisor-for-short-term-rentals" },
  openGraph: {
    title: "Mashvisor vs TrueCap for STR Deals (2026)",
    description:
      "STR-specific TrueCap vs Mashvisor: market scoring vs per-deal underwriting. They do different jobs.",
    url: "/vs/mashvisor-for-short-term-rentals",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

type Verdict = "truecap" | "mashvisor" | "tie";
type Row = {
  feature: string;
  truecap: string;
  mashvisor: string;
  winner?: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Market discovery (heatmaps, scores)",
    truecap: "No",
    mashvisor:
      "Yes, on Standard and above: heatmaps and neighborhood analytics for short-term and long-term rentals",
    winner: "mashvisor",
  },
  {
    feature: "STR revenue projection (ADR + occupancy)",
    truecap: "Manual — plug monthly revenue into rent field",
    mashvisor: "Yes — automated from Airbnb data",
    winner: "mashvisor",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, free tier",
    mashvisor:
      "Cash flow, cap rate and cash-on-cash estimates; editable expenses on Standard and above; DSCR not listed",
    winner: "tie",
  },
  {
    feature: "Mortgage + financing math (PITI + amortization)",
    truecap: "Yes — full",
    mashvisor:
      "Adjustable financing assumptions in its calculator, and a mortgage calculator",
    winner: "tie",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    mashvisor: "Not listed on Mashvisor's plan comparison",
  },
  {
    feature: "Deal score (0–100)",
    truecap: "Free — 0–100 score with factor breakdown",
    mashvisor: "Investment Opportunity Score per property",
    winner: "tie",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    mashvisor: "Long-term and short-term (Airbnb) rental estimates",
    winner: "tie",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    mashvisor:
      "No free plan on its pricing page; platform subscriptions have no free trial",
  },
  {
    feature: "Pricing (paid tier)",
    truecap: "Paid Pro; see live pricing for current rates",
    mashvisor:
      "$39.99 to $99.99 a month billed annually, or $49.99 to $119.99 billed quarterly (as of October 2026)",
  },
];

const NICHE_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Mashvisor alternative for STRs?",
    answer: (
      <>
        Not really — they solve different problems. Mashvisor is STR market
        discovery + revenue projection. TrueCap is the underwriting calculator
        that runs the deal math on top. Mashvisor feeds inputs; TrueCap runs cap
        rate / DSCR / cash flow. The two are used at different steps.
      </>
    ),
  },
  {
    question: "Mashvisor vs AirDNA — which one for STR data?",
    answer: (
      <>
        AirDNA is STR-specific: its free plan has a limited Rentalizer revenue
        calculator and market insights, and its Market Research plan adds a
        customizable Rentalizer, comparable sets, and historical market data.
        Mashvisor covers both long-term and short-term rentals, with heatmaps
        and rental comps on its Standard plan and above. Compare each
        vendor&apos;s current plans for the markets you care about.
      </>
    ),
  },
  {
    question: "Does Mashvisor do underwriting?",
    answer: (
      <>
        Partly. Mashvisor estimates cash flow, cap rate, and cash-on-cash return
        for a property, and Standard and Professional subscribers can edit
        expenses and recalculate. TrueCap adds DSCR, sensitivity, an Offer
        Ceiling for your targets, and a cash-flow and equity projection for a
        shortlisted property. TrueCap does not currently expose a tax-specific
        module.
      </>
    ),
  },
  {
    question: "Can I use TrueCap free with Mashvisor data?",
    answer: (
      <>
        Yes. TrueCap free covers cap rate, CoC, DSCR, and cash flow on every
        analysis. Pull Mashvisor&apos;s projected monthly STR revenue, replace
        TrueCap&apos;s area benchmark with it, and review every operating
        assumption. Pro adds a 10-year cash-flow and equity projection plus
        sensitivity.
      </>
    ),
  },
  {
    question: "Is a Mashvisor subscription worth it?",
    answer: (
      <>
        Mashvisor&apos;s priced plans run $39.99 to $99.99 a month billed
        annually, or $49.99 to $119.99 billed quarterly (as of October 2026). If
        you&apos;re actively scouting STR markets across multiple regions, the
        market data and heatmaps replace manual market research. If you invest
        in one local market with 1-2 properties, you may not need market
        discovery: TrueCap with AirDNA&apos;s Rentalizer (limited on
        AirDNA&apos;s free plan, customizable on its paid Market Research plan)
        may be enough.
      </>
    ),
  },
];

export default function VsMashvisorForShortTermRentalsPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Mashvisor vs TrueCap for STR Deals (2026)",
    url: `${siteUrl}/vs/mashvisor-for-short-term-rentals`,
    description:
      "Mashvisor scores STR markets with Airbnb data. TrueCap underwrites the specific deal. Honest comparison for STR investors plus how they fit together.",
    dateModified: lastmodFor("/vs/mashvisor-for-short-term-rentals"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema
        vsPath="/vs/mashvisor-for-short-term-rentals"
        pageName="TrueCap vs Mashvisor for short-term rentals"
      />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs Mashvisor for short-term rentals:{" "}
            market scoring vs per-deal STR underwriting
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            Both serve STR investors. Mashvisor is the market-discovery +
            revenue-projection tool (Airbnb occupancy rates, ADR by
            neighborhood). TrueCap turns user-reviewed revenue assumptions into
            a full modeled analysis (cap rate, DSCR, cash flow, projection). The
            user verifies the inputs and makes the investment decision.
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

        <Section rhythm="tight" aria-labelledby="vs-tldr-heading">
          <SectionHeading id="vs-tldr-heading">
            TL;DR for short-term rental investors
          </SectionHeading>
          <div className={VS_TLDR_GRID}>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use TrueCap when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>
                  You want a full underwriting analysis with cap rate, DSCR,
                  cash flow on a specific STR.
                </li>
                <li>
                  You want financing math (PITI, amortization) on a specific
                  property.
                </li>
                <li>
                  You&apos;re comparing LTR vs STR scenarios on the same
                  property.
                </li>
                <li>You want a free tier that doesn&apos;t cap analyses.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use Mashvisor when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>
                  You want STR market discovery (heatmaps, neighborhood Airbnb
                  scores).
                </li>
                <li>
                  You want automated STR revenue projections from real Airbnb
                  data.
                </li>
                <li>
                  You&apos;re scouting which city or neighborhood to invest in
                  next.
                </li>
                <li>
                  You&apos;re scaling STR investments across multiple markets.
                </li>
              </ul>
            </div>
          </div>
        </Section>

        <Section aria-labelledby="vs-matrix-heading">
          <SectionHeading id="vs-matrix-heading">
            Short-term rental feature-by-feature
          </SectionHeading>
          <p className={VS_INTRO}>
            Where each tool wins on the short-term rental workflow
            specifically.
          </p>
          <ScrollX label="Comparison table" className="mt-8 max-w-5xl">
            <VsMatrixTable
              head={["Feature", "TrueCap", "Mashvisor"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.mashvisor,
                winner: row.winner === "mashvisor" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            Mashvisor plans, prices and features were checked against its
            pricing page in October 2026. See{" "}
            <a
              href="https://www.mashvisor.com/pricing"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              mashvisor.com/pricing
            </a>{" "}
            for current terms.
          </p>
          <div className={VS_PROSE}>
            <p>
              Once Mashvisor hands you an ADR and occupancy figure, you can run
              your own underwrite on it. Our{" "}
              <IntentPrefetchLink
                href="/blog/short-term-rental-underwriting-playbook"
                className="tc-link"
              >
                short-term rental underwriting playbook
              </IntentPrefetchLink>{" "}
              walks through turning revenue projections into a complete modeled
              underwrite, and the{" "}
              <IntentPrefetchLink
                href="/blog/best-short-term-rental-analysis-tool-2026"
                className="tc-link"
              >
                best STR analysis tools of 2026
              </IntentPrefetchLink>{" "}
              rounds up where the data comes from. To put those projections
              through the deal math yourself, our{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                free deal analyzer
              </Link>{" "}
              turns an ADR and occupancy estimate into cap rate and cash flow in
              one pass.
            </p>
          </div>
        </Section>

        <ComparisonFaq
          competitorName="Mashvisor"
          items={NICHE_FAQ}
          reviewedDate="October 2026"
        />

        <CloseSection
          headingId="vs-close-heading"
          heading={<>Underwrite your next short-term rental deal, free.</>}
          lede={
            <>
              Free covers the standard cap rate, CoC, DSCR, cash flow, and plain
              read-only share links. Pro adds 10-year cash-flow and equity
              projections, sensitivity, Offer Ceiling, co-branding, and included
              PDFs. New one-time PDF checkout is temporarily unavailable.
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
            <RelatedContent kind="vs" slug="mashvisor-for-short-term-rentals" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
                <li>
                  <IntentPrefetchLink
                    href="/vs/mashvisor"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Mashvisor
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/airdna"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs AirDNA
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/hostaway"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Hostaway
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
