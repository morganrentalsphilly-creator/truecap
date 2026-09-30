/**
 * /vs/reonomy — competitor comparison landing page.
 *
 * Target queries: "reonomy alternative", "reonomy vs propstream", "reonomy pricing", "reonomy review", "commercial real estate data".
 * Reonomy is commercial real estate property + owner intelligence — pull CRE data (owner, debt, transactions, tenants) at the property level. Subsidiary of Altus Group. Different audience than TrueCap (commercial-focused) but appears in investor searches.
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
  title: "Reonomy vs TrueCap (2026): CRE Data vs Rentals",
  description:
    "Reonomy is commercial real estate intelligence (owner, debt, tenants). TrueCap is residential underwriting. Different asset classes — honest comparison.",
  keywords: [
    "reonomy alternative",
    "reonomy vs propstream",
    "reonomy pricing",
    "reonomy review",
    "commercial real estate data",
  ],
  alternates: { canonical: "/vs/reonomy" },
  openGraph: {
    title: "Reonomy vs TrueCap (2026): CRE Data vs Rentals",
    description:
      "Reonomy is commercial RE intelligence + owner data. TrueCap is residential underwriting. Different asset classes.",
    url: "/vs/reonomy",
    type: "website",
    images: [
      { url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Reonomy" },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "reonomy" | "tie";
type Row = {
  feature: string;
  truecap: string;
  reonomy: string;
  winner: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Primary asset class",
    truecap: "Residential (SFR, small multifamily, owner-occupant)",
    reonomy: "Commercial (office, retail, industrial, multifamily 5+)",
    winner: "tie",
  },
  {
    feature: "Primary use",
    truecap: "Per-deal underwriting (model cash flow and returns)",
    reonomy: "CRE property + owner intelligence (find + research)",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine for residential",
    reonomy: "Not modeled (intelligence only)",
    winner: "truecap",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    reonomy: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    reonomy: "CRE property data only",
    winner: "truecap",
  },
  {
    feature: "Commercial property data (50M+ properties)",
    truecap: "No — residential focus",
    reonomy: "Yes — best-in-class CRE coverage",
    winner: "reonomy",
  },
  {
    feature: "Owner contact info",
    truecap: "No",
    reonomy: "Yes — phone + email for CRE owners",
    winner: "reonomy",
  },
  {
    feature: "Debt + transaction history",
    truecap: "No",
    reonomy: "Yes — mortgage + sale history",
    winner: "reonomy",
  },
  {
    feature: "Tenant rosters (CRE)",
    truecap: "No",
    reonomy: "Yes — tenant lookup",
    winner: "reonomy",
  },
  {
    feature: "Free tier",
    truecap: "Yes — full residential underwriting",
    reonomy: "Paid only (enterprise pricing)",
    winner: "truecap",
  },
  {
    feature: "Pricing",
    truecap: "Free core; paid Pro — see live pricing",
    reonomy: "Custom (typically $300+/mo enterprise)",
    winner: "truecap",
  },
];

export default function VsReonomyPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Reonomy vs TrueCap (2026): CRE Data vs Rentals",
    url: `${siteUrl}/vs/reonomy`,
    description:
      "Reonomy is commercial real estate intelligence (owner, debt, tenants). TrueCap is residential underwriting. Different asset classes — honest comparison.",
    dateModified: lastmodFor("/vs/reonomy"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema vsPath="/vs/reonomy" pageName="TrueCap vs Reonomy" />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs Reonomy:{" "}
            residential underwriting vs commercial intelligence
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            Reonomy is commercial real estate intelligence — property data,
            owner contact info, debt + transaction history, tenant rosters
            across 50M+ CRE properties. Used by CRE brokers, lenders, and
            institutional investors for prospecting + due diligence. TrueCap is
            a residential rental underwriting calculator — single-family, small
            multifamily, owner-occupant. Different asset classes, different
            jobs.
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
                  You underwrite residential rentals (SFR, small multifamily,
                  owner-occupant).
                </li>
                <li>
                  You want cap rate, CoC, DSCR, cash flow on specific addresses.
                </li>
                <li>You&apos;re not pursuing commercial deals.</li>
                <li>You want a free tier — no enterprise contract.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use Reonomy when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>You source commercial real estate deals.</li>
                <li>You need CRE owner contact info for outreach.</li>
                <li>
                  You research CRE debt + transaction history for due diligence.
                </li>
                <li>
                  You&apos;re an institutional investor, broker, or lender
                  working in CRE.
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
              head={["Feature", "TrueCap", "Reonomy"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.reonomy,
                winner: row.winner === "reonomy" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            Reonomy details based on publicly available product info as of 2026.
            See{" "}
            <a
              href="https://reonomy.com"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              reonomy.com
            </a>{" "}
            for their current state.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            Where investors use both
          </SectionHeading>
          <div className={VS_PROSE}>
            <ul>
              <li>
                <strong>If you do residential and commercial.</strong> TrueCap for
                residential underwriting; Reonomy for CRE prospecting + due
                diligence.
              </li>
              <li>
                <strong>Purely residential investors.</strong> Reonomy is overkill
                — residential MLS, PropStream, or DealMachine fit better. TrueCap
                handles the underwriting.
              </li>
              <li>
                <strong>Purely commercial investors.</strong> Reonomy + a
                CRE-specific underwriting tool (Argus, RealNex). TrueCap
                isn&apos;t built for CRE.
              </li>
            </ul>
            <p>
              Only need the residential underwriting?{" "}
              <IntentPrefetchLink
                href="/blog/how-to-calculate-cap-rate"
                className="tc-link"
              >
                How to calculate cap rate
              </IntentPrefetchLink>{" "}
              covers the formula Reonomy assumes you already know, and{" "}
              <IntentPrefetchLink
                href="/blog/what-is-a-good-cap-rate"
                className="tc-link"
              >
                what is a good cap rate
              </IntentPrefetchLink>{" "}
              frames the result against real market ranges. For the full
              residential underwrite — cap rate, cash-on-cash, DSCR and a 10-year
              projection — start with the{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>
              .
            </p>
          </div>
        </Section>

        <ComparisonFaq competitorName="Reonomy" items={REONOMY_FAQ} />

        {/* Pricing CTA */}
        <CloseSection
          headingId="vs-close-heading"
          heading={<>Underwrite the next deal — free.</>}
          lede={
            <>
              TrueCap free covers cap rate, CoC, DSCR, NCF, and monthly cash flow.
              Pro adds 10-year cash-flow and equity projections, sensitivity,
              Offer Ceiling, co-branded share links, and PDF reports with Pro; see
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
            <RelatedContent kind="vs" slug="reonomy" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
                <li>
                  <IntentPrefetchLink
                    href="/vs/crexi"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Crexi
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
                    href="/vs/dealcheck"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs DealCheck
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

const REONOMY_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Reonomy alternative?",
    answer: (
      <>
        No — different asset classes. Reonomy is commercial real estate
        intelligence. TrueCap is residential rental underwriting. The two
        don&apos;t overlap meaningfully.
      </>
    ),
  },
  {
    question: "Reonomy vs PropStream — which one?",
    answer: (
      <>
        Different asset classes. Reonomy is commercial real estate (office,
        retail, industrial, large multifamily). PropStream is residential
        (single-family, small multifamily, distressed sellers). If you&apos;re
        sourcing CRE deals, Reonomy. If you&apos;re sourcing residential
        off-market deals, PropStream.
      </>
    ),
  },
  {
    question: "Is Reonomy enterprise-only?",
    answer: (
      <>
        Effectively yes. Reonomy uses custom enterprise pricing (typically
        $300+/month and up depending on data tier and team size). They primarily
        serve CRE brokers, lenders, and institutional investors. For solo
        residential investors, the data isn&apos;t relevant and the price
        isn&apos;t justified.
      </>
    ),
  },
  {
    question: "Does Reonomy do underwriting?",
    answer: (
      <>
        No — it&apos;s a data intelligence platform. You pull property data,
        owner contact info, debt + transaction history, then use that data as
        input to your own underwriting model (an Argus model, an Excel CRE
        underwrite, or a custom institutional process).
      </>
    ),
  },
  {
    question: "Should solo investors care about Reonomy?",
    answer: (
      <>
        Only if you&apos;re moving into commercial real estate. For residential
        investing (the bulk of TrueCap&apos;s audience), Reonomy isn&apos;t
        relevant — the data doesn&apos;t cover SFR ownership in the way
        PropStream / BatchLeads do, and the price is built for enterprise
        budgets.
      </>
    ),
  },
];

