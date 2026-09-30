/**
 * /vs/rentec-direct — competitor comparison landing page.
 *
 * Target queries: "rentec direct alternative", "rentec vs buildium", "rentec direct pricing", "rentec direct review".
 * Rentec Direct is small-landlord PM software — sweet spot is 5-100 units. Cheaper than Buildium, more feature-rich than TurboTenant. Investors compare it as the next step up from a basic ops tool.
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
  title: "Rentec Direct vs TrueCap (2026): PM vs Analysis",
  description:
    "Rentec Direct runs the rentals you own (5-100 units). TrueCap underwrites the ones you're considering. Honest side-by-side.",
  keywords: [
    "rentec direct alternative",
    "rentec vs buildium",
    "rentec direct pricing",
    "rentec direct review",
  ],
  alternates: { canonical: "/vs/rentec-direct" },
  openGraph: {
    title: "Rentec Direct vs TrueCap (2026): PM vs Analysis",
    description:
      "Rentec Direct manages 5-100 unit landlord ops. TrueCap underwrites the deal before. Different stages.",
    url: "/vs/rentec-direct",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap vs Rentec Direct",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "rentecdirect" | "tie";
type Row = {
  feature: string;
  truecap: string;
  rentecdirect: string;
  winner: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Lifecycle stage",
    truecap: "Pre-purchase — underwrite the deal",
    rentecdirect: "Post-purchase — operate the portfolio",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, free tier",
    rentecdirect: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    rentecdirect: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "Deal score (0–100)",
    truecap: "Free — 0–100 score with factor breakdown",
    rentecdirect: "Not applicable",
    winner: "truecap",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    rentecdirect: "Not applicable",
    winner: "truecap",
  },
  {
    feature: "Tenant + lease management",
    truecap: "No",
    rentecdirect: "Yes — designed for 5-100 units",
    winner: "rentecdirect",
  },
  {
    feature: "Online rent collection",
    truecap: "No",
    rentecdirect: "Yes — ACH + card",
    winner: "rentecdirect",
  },
  {
    feature: "Maintenance request workflow",
    truecap: "No",
    rentecdirect: "Yes — work order tracking",
    winner: "rentecdirect",
  },
  {
    feature: "Accounting + Schedule E",
    truecap: "Forward projection only",
    rentecdirect: "Yes — full GL + 1099 + Schedule E",
    winner: "rentecdirect",
  },
  {
    feature: "Owner portals (for partnerships)",
    truecap: "No",
    rentecdirect: "Yes — multi-owner statements",
    winner: "rentecdirect",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    rentecdirect: "No — paid only (trial available)",
    winner: "truecap",
  },
  {
    feature: "Pricing (entry tier)",
    truecap: "Free core; paid Pro — see live pricing",
    rentecdirect: "~$45/mo for landlords, ~$60+/mo for PMs (as of 2026)",
    winner: "truecap",
  },
  {
    feature: "Sweet spot",
    truecap: "1-30 doors, solo investor",
    rentecdirect: "5-100 units, small PM or scaling landlord",
    winner: "tie",
  },
];

export default function VsRentecDirectPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Rentec Direct vs TrueCap (2026): PM vs Analysis",
    url: `${siteUrl}/vs/rentec-direct`,
    description:
      "Rentec Direct runs the rentals you own (5-100 units). TrueCap underwrites the ones you're considering. Honest side-by-side.",
    dateModified: lastmodFor("/vs/rentec-direct"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema
        vsPath="/vs/rentec-direct"
        pageName="TrueCap vs Rentec Direct"
      />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs Rentec Direct:{" "}
            pre-purchase calculator vs landlord ops platform
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            Rentec Direct is property management software targeted at small
            landlords running 5-100 units — tenant management, rent collection,
            accounting, owner portals. TrueCap models the pre-purchase economics
            of properties you are considering. We don&apos;t compete; different
            halves of the rental lifecycle.
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
                <li>You&apos;re evaluating a property before buying.</li>
                <li>You want cap rate, DSCR, cash flow, projection.</li>
                <li>You want a free tier — no monthly commitment.</li>
                <li>You&apos;re not managing 5+ rentals yet.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use Rentec Direct when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>You own 5-100 units and need PM-grade ops + accounting.</li>
                <li>
                  You want rent collection, lease management, work orders, owner
                  reports in one tool.
                </li>
                <li>
                  You&apos;re scaling past what TurboTenant or Avail can handle.
                </li>
                <li>
                  You may want to manage for other owners (semi-pro PM
                  workflow).
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
              head={["Feature", "TrueCap", "Rentec Direct"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.rentecdirect,
                winner: row.winner === "rentecdirect" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            Rentec Direct details based on publicly available product info as of
            2026. See{" "}
            <a
              href="https://rentecdirect.com"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              rentecdirect.com
            </a>{" "}
            for their current state.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            How TrueCap + Rentec Direct fit together
          </SectionHeading>
          <div className={VS_PROSE}>
            <ol>
              <li>
                <strong>Underwrite the next property in TrueCap.</strong> Cap
                rate, DSCR, cash flow, projection.
              </li>
              <li>
                <strong>Close + onboard the property in Rentec Direct.</strong>{" "}
                Set up the unit, accept applications, sign lease, start rent
                collection.
              </li>
              <li>
                <strong>Operate in Rentec Direct.</strong> Rent comes in, expenses
                get logged, Schedule E builds itself.
              </li>
              <li>
                <strong>Annual review.</strong> Pull Rentec Direct&apos;s actuals;
                re-run TrueCap&apos;s projection with real numbers.
              </li>
            </ol>
            <p>
              Only here for the acquisition math? Our walkthroughs on{" "}
              <IntentPrefetchLink
                href="/blog/how-to-calculate-cap-rate"
                className="tc-link"
              >
                how to calculate cap rate
              </IntentPrefetchLink>
              ,{" "}
              <IntentPrefetchLink
                href="/blog/how-to-calculate-dscr"
                className="tc-link"
              >
                how to calculate DSCR
              </IntentPrefetchLink>
              , and{" "}
              <IntentPrefetchLink
                href="/blog/how-to-calculate-noi-rental-property"
                className="tc-link"
              >
                how to calculate NOI
              </IntentPrefetchLink>{" "}
              each work an example end to end, so the actuals Rentec Direct
              reports later have something to be measured against. To skip the
              arithmetic, run the address through the full{" "}
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

        <ComparisonFaq
          competitorName="Rentec Direct"
          items={RENTEC_DIRECT_FAQ}
        />

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
            <RelatedContent kind="vs" slug="rentec-direct" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
                <li>
                  <IntentPrefetchLink
                    href="/vs/buildium"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Buildium
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/turbotenant"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs TurboTenant
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/avail"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Avail
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

const RENTEC_DIRECT_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Rentec Direct alternative?",
    answer: (
      <>
        No — different stages. Rentec Direct operates rentals you own. TrueCap
        underwrites rentals you&apos;re considering buying. Landlords running
        5-100 units typically use both.
      </>
    ),
  },
  {
    question: "Rentec Direct vs Buildium — which one?",
    answer: (
      <>
        Rentec Direct is generally cheaper and a better fit for landlords
        managing their own units (5-100). Buildium leans toward property
        management companies and scales further. For solo investors growing past
        TurboTenant or Avail, Rentec Direct is often the next step up before
        Buildium.
      </>
    ),
  },
  {
    question: "Does Rentec Direct have a free tier?",
    answer: (
      <>
        No — paid only, with a free trial. Pricing starts around $45/month for
        landlords as of 2026, with per-unit fees scaling up. TrueCap is free for
        the underwriting layer; if you&apos;re not yet at 5+ units, Rentec
        Direct may be premature.
      </>
    ),
  },
  {
    question: "Can I use Rentec Direct for underwriting new deals?",
    answer: (
      <>
        No — Rentec Direct is operational only. For pre-purchase underwriting
        (cap rate, DSCR, cash flow, projection), use TrueCap, DealCheck, or your
        spreadsheet.
      </>
    ),
  },
  {
    question: "Should I use TurboTenant or Rentec Direct?",
    answer: (
      <>
        TurboTenant is better for 1-5 units with a strong free tier. Rentec
        Direct is better once you&apos;re at 5-100 units and need richer
        accounting + owner reporting. Both pair with TrueCap upstream.
      </>
    ),
  },
];

