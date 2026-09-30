/**
 * /vs/mashvisor — competitor comparison landing page.
 *
 * Mashvisor positioning: market-data + heatmaps + STR-focused
 * Airbnb-rental analytics. They're strongest at the "where should I
 * invest?" question (market-level). TrueCap is strongest at the
 * "should I buy THIS property?" question (per-deal underwriting).
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
  title: "Mashvisor Alternative: Free Deal Analysis (2026)",
  description:
    "TrueCap vs Mashvisor for rental investors. Per-deal underwriting (TrueCap) vs market heatmaps + STR data (Mashvisor). Feature matrix + when each wins.",
  keywords: [
    "mashvisor alternative",
    "mashvisor vs truecap",
    "rental analysis tool comparison",
    "airbnb investment calculator",
  ],
  alternates: { canonical: "/vs/mashvisor" },
  openGraph: {
    title: "Mashvisor Alternative: Free Deal Analysis (2026)",
    description:
      "Per-deal underwriting vs market heatmaps + Airbnb data. Different jobs, different price points.",
    url: "/vs/mashvisor",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap vs Mashvisor",
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
    feature: "Primary job",
    truecap:
      "Per-deal underwriting — does this property fit my Buy Box?",
    mashvisor: "Market research — WHERE should I invest?",
    winner: "tie",
  },
  {
    feature: "Free tier depth",
    truecap:
      "Core cap rate, CoC, DSCR, cash flow, Deal score, and Buy Box fit",
    mashvisor: "Limited free preview; most data requires paid plan",
    winner: "truecap",
  },
  {
    feature: "Per-deal cap rate / CoC / DSCR",
    truecap: "Yes — live as you type, with inline benchmarks",
    mashvisor: "Yes — alongside market data",
    winner: "tie",
  },
  // NOT "with depreciation". Depreciation output is the tax_strategy feature,
  // which lib/entitlements-catalog.ts marks shipped:false — no plan, paid
  // included, can produce it today. Selling it here is a refund conversation on
  // the page whose whole argument is that we describe things accurately. The
  // 10-year cash-flow and equity projection IS released; that is what we claim.
  {
    feature: "10-year projection",
    truecap: "Pro — 10-year cash flow and equity projection",
    mashvisor: "Available",
    winner: "tie",
  },
  {
    feature: "Market-level heatmaps",
    truecap: "No — focused on the property in front of you",
    mashvisor: "Yes — neighborhood-level cap rate + rent heatmaps",
    winner: "mashvisor",
  },
  {
    feature: "Airbnb / STR market data",
    truecap: "Long-term focus; STR-specific fields coming",
    mashvisor: "Strong — pulls Airbnb occupancy + ADR data by ZIP",
    winner: "mashvisor",
  },
  {
    feature: "Sale + rent comps",
    truecap: "One free lookup; Pro includes 50 per month; no AVM",
    mashvisor: "Yes — included in their data layer",
    winner: "mashvisor",
  },
  {
    feature: "Property listings discovery",
    truecap: "Not the focus — start with an address you found elsewhere",
    mashvisor: "Yes — investment-property marketplace",
    winner: "mashvisor",
  },
  {
    feature: "Sensitivity / stress test",
    truecap: "Pro — rent ±10%, vacancy ±5pp, rates ±1pp",
    mashvisor: "Not the primary use case",
    winner: "truecap",
  },
  {
    feature: "Offer Ceiling solver",
    truecap: "Pro — works backward from your targets",
    mashvisor: "Not a primary feature",
    winner: "truecap",
  },
  {
    feature: "Deal score + breakdown",
    truecap: "Free — 0–100 score with per-subscore explanation",
    mashvisor: "Their own metric",
    winner: "tie",
  },
  {
    feature: "Free starting values",
    truecap: "HUD rent + FRED rate + manual property tax — free, no signup",
    mashvisor: "Behind paywall",
    winner: "truecap",
  },
  {
    feature: "Sharable read-only deal links",
    truecap: "Free — read-only public link; Pro adds co-branding",
    mashvisor: "Account-gated views",
    winner: "truecap",
  },
  {
    feature: "PDF deal report",
    truecap: "Included with Pro",
    mashvisor: "Available",
    winner: "tie",
  },
  {
    feature: "Pricing",
    truecap: "Free + monthly Pro on /pricing, no card to start",
    mashvisor: "Tiered paid plans, generally $$$ at scale",
    winner: "truecap",
  },
];

export default function VsMashvisorPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Mashvisor Alternative: Free Deal Analysis (2026)",
    url: `${siteUrl}/vs/mashvisor`,
    description:
      "Side-by-side comparison of TrueCap and Mashvisor for rental investors.",
    dateModified: lastmodFor("/vs/mashvisor"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema
        vsPath="/vs/mashvisor"
        pageName="TrueCap vs Mashvisor"
      />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs Mashvisor:{" "}
            per-deal math vs market data.
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            Mashvisor is built around market-level data — heatmaps, ZIP-code
            Airbnb occupancy, comps. TrueCap is built around per-deal math —
            should I actually buy this specific property? Different jobs,
            different price points. Here&apos;s when to pick which.
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

        <Section rhythm="tight" aria-labelledby="vs-tldr-heading">
          <SectionHeading id="vs-tldr-heading">
            TL;DR
          </SectionHeading>
          <div className={VS_TLDR_GRID}>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Pick TrueCap if
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>
                  You&apos;ve found a specific property and need to decide if it
                  pencils.
                </li>
                <li>
                  You want free core cap rate, CoC, DSCR, and cash-flow
                  analysis.
                </li>
                <li>
                  You want stress-test sensitivity and a 10-year cash-flow and
                  equity planning view.
                </li>
                <li>
                  You prefer labeled HUD rent and FRED rate benchmarks plus an
                  explicit manual local tax input.
                </li>
                <li>
                  You don&apos;t want to pay $$$/mo for market data you may not
                  need.
                </li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Pick Mashvisor if
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>
                  You&apos;re still deciding WHICH market to invest in (heatmaps
                  help).
                </li>
                <li>
                  You&apos;re running an STR strategy and need Airbnb occupancy
                  data.
                </li>
                <li>You want comparable sales (comps) data built in.</li>
                <li>You want to browse investment-property listings.</li>
              </ul>
            </div>
          </div>
        </Section>

        <Section aria-labelledby="vs-matrix-heading">
          <SectionHeading id="vs-matrix-heading">
            Feature-by-feature
          </SectionHeading>
          <p className={VS_INTRO}>
            Where each tool earns its keep.
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
            Mashvisor details based on publicly available product info as of
            2026. See{" "}
            <a
              href="https://mashvisor.com"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              mashvisor.com
            </a>{" "}
            for their current state.
          </p>
        </Section>

        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            The honest take
          </SectionHeading>
          <div className={VS_PROSE}>
            <p>
              Mashvisor is a great tool for market research and STR-focused
              strategies. The trade-off is price (their data is expensive to
              license, so the subscription has to cover that) and depth on the
              per-deal math (heatmaps tell you which neighborhood; they don&apos;t
              tell you whether THIS specific 3-bed off Market St clears your DSCR
              target with the lender you&apos;re actually talking to).
            </p>
            <p>
              TrueCap is built for the moment you have an address and need to
              decide. Free analyzer, no signup wall, real depth on the Pro tier.
              For long-term rentals especially, the per-deal math is what
              determines whether you&apos;re making money — the heatmaps just told
              you to look.
            </p>
            <p>
              Once the heatmap points you somewhere, the per-deal math is one
              address away: our{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                free deal analyzer
              </Link>{" "}
              returns cap rate, cash-on-cash return, and DSCR on the first screen.
              Our walkthrough on{" "}
              <Link
                href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
                className="tc-link"
              >
                underwriting a rental in 60 seconds
              </Link>{" "}
              shows the full move from listing to a reviewed underwrite.
            </p>
          </div>
        </Section>

        <ComparisonFaq competitorName="Mashvisor" items={MASHVISOR_FAQ} />

        <CloseSection
          headingId="vs-close-heading"
          heading={<>Underwriting the next deal? Start free.</>}
          lede={
            <>
              TrueCap free covers cap rate, CoC, DSCR, NCF, monthly cash flow, and
              plain read-only share links. Pro adds co-branding, 10-year cash-flow
              and equity projections, sensitivity, Offer Ceiling, saved-deal
              comparison, and included PDFs. No card to start.
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
            <RelatedContent kind="vs" slug="mashvisor" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
                <li>
                  <Link
                    href="/vs/dealcheck"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs DealCheck
                  </Link>
                </li>
                <li>
                  <Link
                    href="/vs/stessa"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Stessa
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

const MASHVISOR_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Mashvisor alternative?",
    answer: (
      <>
        Yes, but they solve different problems. Mashvisor is built for market
        discovery — heatmaps, neighborhood scoring, Airbnb comps. TrueCap is
        built for per-property underwriting — once you have an address, decide
        if the deal works. Many investors use both: Mashvisor to find a
        neighborhood, TrueCap to underwrite the specific listing.
      </>
    ),
  },
  {
    question: "How does TrueCap compare to Mashvisor for short-term rentals?",
    answer: (
      <>
        Mashvisor is stronger for short-term rental comparable research — they
        have Airbnb occupancy and ADR data baked in. TrueCap is stronger for the
        long-term rental underwrite. If STR is your primary strategy, Mashvisor
        + TrueCap together cover both halves of the job. If you&apos;re
        long-term buy and hold, TrueCap alone is enough.
      </>
    ),
  },
  {
    question: "Is Mashvisor or TrueCap cheaper?",
    answer: (
      <>
        The products have different scopes and changing plan terms. TrueCap has
        a free core analyzer plus paid Pro; new one-time PDF purchases are
        temporarily unavailable. Mashvisor publishes tiered market-data plans.
        Compare both official pricing pages for the features and current rates
        you need.
      </>
    ),
  },
  {
    question: "Does TrueCap have neighborhood heatmaps like Mashvisor?",
    answer: (
      <>
        No. TrueCap is explicitly not a market-discovery tool — we don&apos;t do
        heatmaps, neighborhood scoring, or nationwide-comparables. If you need
        that, use Mashvisor or AirDNA. TrueCap&apos;s job is to take an address
        you&apos;ve already chosen and underwrite the specific property.
      </>
    ),
  },
  {
    question: "Can I use TrueCap to analyze deals in any US market?",
    answer: (
      <>
        Yes. TrueCap pulls HUD Fair Market Rent (county-level), FRED 30-year
        mortgage rate (national). Property tax remains a manual local input with
        a disclosed generic fallback when blank. These are screening
        assumptions—not a property rent quote, mortgage offer, or parcel tax
        verification—so users should replace them with deal-specific evidence.
        The per-deal underwriting math itself is market-agnostic.
      </>
    ),
  },
];

