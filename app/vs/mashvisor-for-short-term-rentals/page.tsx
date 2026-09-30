/**
 * /vs/mashvisor-for-short-term-rentals — niche use-case comparison page (Short-term rentals cut).
 *
 * Target queries: "mashvisor short term rental", "mashvisor airbnb", "best str market tool", "airbnb investment calculator", "mashvisor alternative for str". Long-tail audience-slicing comparison.
 */

import type { Metadata } from "next";
import Link from "next/link";
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
      "STR-specific TrueCap vs Mashvisor: market scoring vs per-deal underwriting. Most STR investors use both.",
    url: "/vs/mashvisor-for-short-term-rentals",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap vs Mashvisor for Short-Term Rentals — honest comparison",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "mashvisor" | "tie";
type Row = {
  feature: string;
  truecap: string;
  mashvisor: string;
  winner: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Market discovery (heatmaps, scores)",
    truecap: "No",
    mashvisor: "Yes — STR + LTR by neighborhood",
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
    mashvisor: "Listing-level cap rate based on assumed inputs",
    winner: "truecap",
  },
  {
    feature: "Mortgage + financing math (PITI + amortization)",
    truecap: "Yes — full",
    mashvisor: "Limited",
    winner: "truecap",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    mashvisor: "Forward STR revenue forecast",
    winner: "tie",
  },
  {
    feature: "Deal score (0–100)",
    truecap: "Free — 0–100 score with factor breakdown",
    mashvisor: "Investibility score per property",
    winner: "tie",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    mashvisor: "STR-focused; LTR rent estimates included",
    winner: "tie",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    mashvisor: "Limited free dashboard; full data paid",
    winner: "truecap",
  },
  {
    feature: "Pricing (paid tier)",
    truecap: "Paid Pro; see live pricing for current rates",
    mashvisor: "$70-300/mo depending on plan (as of 2026)",
    winner: "truecap",
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
        rate / DSCR / cash flow. STR investors typically use both.
      </>
    ),
  },
  {
    question: "Mashvisor vs AirDNA — which one for STR data?",
    answer: (
      <>
        AirDNA is more STR-specific and considered the gold standard for ADR,
        occupancy, and RevPAR data. Mashvisor covers both LTR and STR plus
        broader market analysis (heatmaps, comparable sales). For STR-primary
        investors, AirDNA wins on data depth. For investors evaluating LTR vs
        STR on the same property, Mashvisor&apos;s broader scope wins.
      </>
    ),
  },
  {
    question: "Does Mashvisor do underwriting?",
    answer: (
      <>
        Sort of — Mashvisor shows listing-level cap rate estimates based on its
        assumed inputs (rent, vacancy, expenses). TrueCap adds editable
        financing, DSCR, sensitivity, and a cash-flow and equity projection for
        a shortlisted property. It does not currently expose a tax-specific
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
    question: "Is Mashvisor's $70-300/mo worth it?",
    answer: (
      <>
        If you&apos;re actively scouting STR markets across multiple regions,
        yes — the data + heatmaps save dozens of hours per month. If you&apos;re
        a hometown STR investor with 1-2 properties in your local market,
        Mashvisor is overkill. TrueCap + AirDNA Rentalizer reports ($20-40 per
        property) are cheaper and more deal-specific.
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
        pageName="TrueCap vs Mashvisor for Short-Term Rentals"
      />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs Mashvisor for Short-term rentals:{" "}
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
            sizes="(min-width: 768px) 768px, 100vw"
            className="max-w-3xl"
            alt="TrueCap's decision view for the sample deal: the Offer Ceiling beside the asking price, cash flow after reserves, and DSCR"
            caption={<>Real output from the free sample deal. <Link href="/analyze?sample=1" prefetch={false} className="tc-link">Run it yourself</Link></>}
          />
        </Section>

        <Section rhythm="tight" aria-labelledby="vs-tldr-heading">
          <SectionHeading id="vs-tldr-heading">
            TL;DR for Short-term rentals investors
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
                  You want financing math (PITI, amortization) and an
                  illustrative tax-impact model.
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
            Short-term rentals feature-by-feature
          </SectionHeading>
          <p className={VS_INTRO}>
            Where each tool wins on the Short-term rentals workflow
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
          <div className={VS_PROSE}>
            <p>
              Once Mashvisor hands you an ADR and occupancy figure, the underwrite
              is on you. Our{" "}
              <Link
                href="/blog/short-term-rental-underwriting-playbook"
                className="tc-link"
              >
                short-term rental underwriting playbook
              </Link>{" "}
              walks through turning revenue projections into a complete modeled
              underwrite, and the{" "}
              <Link
                href="/blog/best-short-term-rental-analysis-tool-2026"
                className="tc-link"
              >
                best STR analysis tools of 2026
              </Link>{" "}
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
          competitorName="Mashvisor (Short-term rentals)"
          items={NICHE_FAQ}
        />

        <CloseSection
          headingId="vs-close-heading"
          heading={<>Underwrite your next Short-term rentals deal — free.</>}
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
              <Link
                href="/pricing"
                className={buttonVariants({ variant: "outline", size: "cta" })}
              >
                See Pro pricing
              </Link>
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
                  <Link
                    href="/vs/mashvisor"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Mashvisor
                  </Link>
                </li>
                <li>
                  <Link
                    href="/vs/airdna"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs AirDNA
                  </Link>
                </li>
                <li>
                  <Link
                    href="/vs/hostaway"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Hostaway
                  </Link>
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
