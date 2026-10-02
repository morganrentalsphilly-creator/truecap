/**
 * /vs/crexi — competitor comparison landing page.
 *
 * Target queries: "crexi alternative", "crexi vs loopnet", "crexi pricing", "crexi review", "commercial real estate marketplace".
 * Crexi is a commercial real estate marketplace + intelligence platform — the LoopNet alternative for CRE listings, comps, and analytics. Different category than TrueCap (we're SFR/multifamily-focused) but investors evaluating CRE consider both.
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
  title: "Crexi vs TrueCap (2026): Commercial vs Rental",
  description:
    "Crexi is the commercial real-estate marketplace and intelligence platform. TrueCap is residential rental underwriting. See which fits your asset class.",
  keywords: [
    "crexi alternative",
    "crexi vs loopnet",
    "crexi pricing",
    "crexi review",
    "commercial real estate marketplace",
  ],
  alternates: { canonical: "/vs/crexi" },
  openGraph: {
    title: "Crexi vs TrueCap (2026): Commercial vs Rental",
    description:
      "Crexi is a commercial real-estate marketplace. TrueCap is residential underwriting. Different asset classes.",
    url: "/vs/crexi",
    type: "website",
    images: [
      { url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Crexi" },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "crexi" | "tie";
type Row = { feature: string; truecap: string; crexi: string; winner: Verdict };

const MATRIX: Row[] = [
  {
    feature: "Primary asset class",
    truecap: "Residential (SFR, small multifamily, owner-occupant)",
    crexi: "Commercial (office, retail, industrial, multifamily)",
    winner: "tie",
  },
  {
    feature: "Lifecycle stage",
    truecap: "Per-deal underwriting calculator",
    crexi: "Marketplace + intelligence",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine for residential",
    crexi:
      "Valuation calculator on sale listings (DSCR, cap rate, ROI) after free registration",
    winner: "tie",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — residential rent + expense + appreciation",
    crexi: "Not listed in its listing calculator",
    winner: "truecap",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax (residential)",
    crexi:
      "Listing calculator inputs: purchase price, NOI, down payment, rate and term",
    winner: "tie",
  },
  {
    feature: "CRE listings (office, retail, industrial)",
    truecap: "No — residential focus",
    crexi: "Yes, a national CRE marketplace for sale, lease and auction listings",
    winner: "crexi",
  },
  {
    feature: "CRE sale + lease comps",
    truecap: "No",
    crexi: "Yes, 46M+ sales comps plus lease data on paid Intelligence plans",
    winner: "crexi",
  },
  {
    feature: "Broker listing tools",
    truecap: "No",
    crexi: "Yes, Crexi PRO helps brokers market listings",
    winner: "crexi",
  },
  {
    feature: "Tenant info (CRE)",
    truecap: "Not applicable",
    crexi: "Yes, tenant history in its Intelligence lease data",
    winner: "crexi",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core residential underwriting",
    crexi: "Free to browse and list; paid for Intelligence",
    winner: "tie",
  },
  {
    feature: "Pricing (entry tier)",
    truecap: "Free core; paid Pro — see live pricing",
    crexi:
      "Free to browse and list; Intelligence Select $299/month, or $269/month billed yearly; higher tiers on request (as of October 2026)",
    winner: "tie",
  },
];

export default function VsCrexiPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Crexi vs TrueCap (2026): Commercial vs Rental",
    url: `${siteUrl}/vs/crexi`,
    description:
      "Crexi is the commercial real-estate marketplace + intelligence platform. TrueCap is residential rental underwriting. Different asset classes — honest comparison.",
    dateModified: lastmodFor("/vs/crexi"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema vsPath="/vs/crexi" pageName="TrueCap vs Crexi" />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs Crexi:{" "}
            residential underwriting vs commercial marketplace
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            Crexi is a commercial real-estate marketplace + intelligence
            platform for CRE listings, sale comps, lease data, and broker
            listing tools. TrueCap is a residential rental
            underwriting calculator — single-family, small multifamily,
            owner-occupant. Different asset classes. Investors who do both
            residential and commercial may use Crexi for sourcing CRE deals and
            TrueCap for residential.
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
                  You&apos;re underwriting residential rentals (SFR, 2-4 unit
                  multifamily, owner-occupant).
                </li>
                <li>
                  You want cap rate, CoC, DSCR, cash flow on a specific
                  residential address.
                </li>
                <li>
                  You want financing math (PITI, amortization) on a specific
                  residential address.
                </li>
                <li>You&apos;re not evaluating commercial deals.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use Crexi when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>
                  You&apos;re sourcing commercial real estate (office, retail,
                  industrial, multifamily).
                </li>
                <li>You need a CRE listings marketplace + comp database.</li>
                <li>You&apos;re a CRE broker marketing listings.</li>
                <li>
                  You&apos;re evaluating commercial deals where Crexi&apos;s
                  data is the comp source.
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
            Side-by-side on every dimension that matters for a
            comparison-shopping investor.
          </p>
          <ScrollX label="Comparison table" className="mt-8 max-w-5xl">
            <VsMatrixTable
              head={["Feature", "TrueCap", "Crexi"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.crexi,
                winner: row.winner === "crexi" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            Crexi details were checked against its{" "}
            <a
              href="https://www.crexi.com/intelligence"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              Intelligence pricing page
            </a>{" "}
            and its sale listings in October 2026. Features and prices can
            change.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            Where each one fits
          </SectionHeading>
          <div className={VS_PROSE}>
            <ul>
              <li>
                <strong>If you do both residential and CRE.</strong> TrueCap
                underwrites your residential deals; Crexi sources and provides
                comps for your CRE deals.
              </li>
              <li>
                <strong>For CRE underwriting specifically.</strong> Crexi shows
                you the deal + market comps, and the valuation calculator on its
                sale listings returns DSCR, cap rate, and ROI after free
                registration. For a full CRE model, use dedicated CRE
                underwriting software or a CRE spreadsheet model.
              </li>
              <li>
                <strong>If you&apos;re purely residential.</strong> TrueCap
                covers the underwriting. Crexi&apos;s marketplace is commercial,
                so source residential deals on the MLS or a residential listing
                site.
              </li>
            </ul>
            <p>
              Want the residential underwriting half on its own? The free{" "}
              <IntentPrefetchLink
                href="/tools/closing-cost-calculator"
                className="tc-link"
              >
                closing cost calculator
              </IntentPrefetchLink>{" "}
              sizes the cash you actually need at the table, and the full{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              returns{" "}
              <IntentPrefetchLink
                href="/glossary/cap-rate"
                className="tc-link"
              >
                cap rate
              </IntentPrefetchLink>
              , DSCR, and cash flow from an address — no CRE model required. Our
              guide on{" "}
              <IntentPrefetchLink
                href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
                className="tc-link"
              >
                60-second underwriting
              </IntentPrefetchLink>{" "}
              walks through the workflow end-to-end.
            </p>
          </div>
        </Section>

        <ComparisonFaq
          competitorName="Crexi"
          items={CREXI_FAQ}
          reviewedDate="October 2026"
        />

        {/* Pricing CTA */}
        <CloseSection
          headingId="vs-close-heading"
          heading={<>Underwrite the next deal — free.</>}
          lede={
            <>
              TrueCap free covers cap rate, CoC, DSCR, and monthly cash flow.
              Pro adds 10-year cash-flow and equity projections, sensitivity,
              the Offer Ceiling, co-branded share links and PDF reports; see
              live pricing for current terms. No card to start.
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
            <RelatedContent kind="vs" slug="crexi" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
                <li>
                  <IntentPrefetchLink
                    href="/vs/roofstock"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Roofstock
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
                <li>
                  <IntentPrefetchLink
                    href="/vs/propstream"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs PropStream
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

const CREXI_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Crexi alternative?",
    answer: (
      <>
        No — different asset classes. Crexi is commercial real estate (office,
        retail, industrial, multifamily). TrueCap is residential
        (single-family, small multifamily, owner-occupant). The two don&apos;t
        overlap meaningfully.
      </>
    ),
  },
  {
    question: "Crexi vs LoopNet — which one?",
    answer: (
      <>
        That choice is outside what TrueCap does, so this page takes no side.
        Compare listing coverage in your market, data tools, and current
        pricing on Crexi&apos;s and LoopNet&apos;s own sites before choosing.
      </>
    ),
  },
  {
    question: "Does TrueCap support commercial real estate?",
    answer: (
      <>
        Not really — we&apos;re built for residential underwriting (SFR, 2-4
        unit, owner-occupant). Commercial deals (office, retail, industrial)
        have entirely different cash-flow math, lease structures, and metrics
        (NOI multiples, vacancy by tenant type, TI / LC allowances). For CRE
        underwriting use dedicated CRE software or a CRE spreadsheet.
      </>
    ),
  },
  {
    question: "Is Crexi free?",
    answer: (
      <>
        Free to browse listings and to list properties. Crexi Intelligence
        Select is $299 a month, or $269 a month billed yearly, and higher tiers
        are priced on request (as of October 2026).
      </>
    ),
  },
  {
    question: "Can I use TrueCap for small multifamily commercial deals?",
    answer: (
      <>
        Yes. TrueCap is built for 1-4 unit residential deals, and the form
        accepts more units. The owner-occupant property type also handles small
        multifamily configurations. For 5+ unit multifamily that&apos;s classified as
        commercial financing, the math gets different (commercial loans + DSCR
        underwriting standards) and you&apos;d want a dedicated multifamily
        calculator.
      </>
    ),
  },
];

