/**
 * /vs/yardi-breeze — competitor comparison landing page.
 *
 * Target queries: "yardi breeze alternative", "yardi breeze vs buildium", "yardi breeze pricing", "yardi breeze review".
 * Yardi Breeze is the small-business version of Yardi's enterprise property management suite — designed for 1-100 residential units. Direct competitor to Buildium and Rentec Direct.
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
  title: "Yardi Breeze vs TrueCap (2026): PM vs Analysis",
  description:
    "Yardi Breeze runs your portfolio after closing. TrueCap underwrites deals before. Honest comparison for small landlords.",
  keywords: [
    "yardi breeze alternative",
    "yardi breeze vs buildium",
    "yardi breeze pricing",
    "yardi breeze review",
  ],
  alternates: { canonical: "/vs/yardi-breeze" },
  openGraph: {
    title: "Yardi Breeze vs TrueCap (2026): PM vs Analysis",
    description:
      "Yardi Breeze is small-landlord PM software. TrueCap is the pre-purchase underwrite. Different stages.",
    url: "/vs/yardi-breeze",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap vs Yardi Breeze",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "yardibreeze" | "tie";
type Row = {
  feature: string;
  truecap: string;
  yardibreeze: string;
  winner: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Lifecycle stage",
    truecap: "Pre-purchase — underwrite the deal",
    yardibreeze: "Post-purchase — operate the portfolio",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, free tier",
    yardibreeze: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    yardibreeze: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "Deal score (0–100)",
    truecap: "Free — 0–100 score with factor breakdown",
    yardibreeze: "Not applicable",
    winner: "truecap",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    yardibreeze: "Not applicable",
    winner: "truecap",
  },
  {
    feature: "Tenant + lease management",
    truecap: "No",
    yardibreeze: "Yes — designed for 1-100 units",
    winner: "yardibreeze",
  },
  {
    feature: "Online rent collection",
    truecap: "No",
    yardibreeze: "Yes — ACH + card",
    winner: "yardibreeze",
  },
  {
    feature: "Maintenance request workflow",
    truecap: "No",
    yardibreeze: "Yes — work-order tracking + vendor mgmt",
    winner: "yardibreeze",
  },
  {
    feature: "Owner / partner portals",
    truecap: "No",
    yardibreeze: "Yes — multi-owner statements",
    winner: "yardibreeze",
  },
  {
    feature: "Full GL accounting",
    truecap: "Forward projection only",
    yardibreeze: "Yes — chart of accounts, balance sheet, 1099s",
    winner: "yardibreeze",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    yardibreeze: "No — paid only (demo available)",
    winner: "truecap",
  },
  {
    feature: "Pricing (entry tier)",
    truecap: "Free core; paid Pro — see live pricing",
    yardibreeze: "~$1-2/unit/month with $100 minimum (as of 2026)",
    winner: "tie",
  },
  {
    feature: "Built for solo investors (1-30 doors)",
    truecap: "Yes",
    yardibreeze: "Yes — 1-100 sweet spot",
    winner: "tie",
  },
];

export default function VsYardiBreezePage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Yardi Breeze vs TrueCap (2026): PM vs Analysis",
    url: `${siteUrl}/vs/yardi-breeze`,
    description:
      "Yardi Breeze runs your portfolio after closing. TrueCap underwrites deals before. Honest comparison for small landlords.",
    dateModified: lastmodFor("/vs/yardi-breeze"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema
        vsPath="/vs/yardi-breeze"
        pageName="TrueCap vs Yardi Breeze"
      />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs Yardi Breeze:{" "}
            pre-purchase calculator vs full PM platform
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            Yardi Breeze is the small-business version of Yardi&apos;s
            enterprise PM platform — built for residential landlords managing
            1-100 units. Tenant management, rent collection, accounting, owner
            reports. TrueCap models the first-year economics of properties you
            are considering. Different stages, complementary tools.
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
                  You&apos;re evaluating a property before making an offer.
                </li>
                <li>You want cap rate, DSCR, cash flow, projection.</li>
                <li>
                  You haven&apos;t yet reached 1-5 units (Yardi Breeze starts to
                  make sense above that).
                </li>
                <li>You want a free tier — no commitment.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use Yardi Breeze when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>You own 5-100 units and need PM-grade ops + accounting.</li>
                <li>
                  You need rent collection, lease management, work orders, owner
                  reports.
                </li>
                <li>
                  You want Yardi-level data quality but priced for small
                  portfolios.
                </li>
                <li>You may manage on behalf of other owners.</li>
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
              head={["Feature", "TrueCap", "Yardi Breeze"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.yardibreeze,
                winner: row.winner === "yardibreeze" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            Yardi Breeze details based on publicly available product info as of
            2026. See{" "}
            <a
              href="https://yardibreeze.com"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              yardibreeze.com
            </a>{" "}
            for their current state.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            How small portfolios use both
          </SectionHeading>
          <div className={VS_PROSE}>
            <ol>
              <li>
                <strong>Underwrite the next acquisition in TrueCap.</strong> Cap
                rate, DSCR, cash flow, projection.
              </li>
              <li>
                <strong>Close + onboard the property in Yardi Breeze.</strong> Set
                up the unit, accept applications, start rent collection.
              </li>
              <li>
                <strong>Operate in Yardi Breeze.</strong> Rent comes in, expenses
                get logged, owner reports build themselves.
              </li>
              <li>
                <strong>Annual review in TrueCap.</strong> Pull Yardi Breeze
                actuals; re-run TrueCap with real numbers. Use the delta as input
                to the next acquisition.
              </li>
            </ol>
            <p>
              Want the acquisition math on its own?{" "}
              <IntentPrefetchLink
                href="/blog/how-to-calculate-noi-rental-property"
                className="tc-link"
              >
                How to calculate NOI
              </IntentPrefetchLink>{" "}
              rebuilds the number Yardi Breeze reports after the fact, and{" "}
              <IntentPrefetchLink
                href="/blog/how-to-calculate-dscr"
                className="tc-link"
              >
                how to calculate DSCR
              </IntentPrefetchLink>{" "}
              shows the ratio your lender checks before you get there. When it is
              time to underwrite the next building, the full{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              runs both from an address.
            </p>
          </div>
        </Section>

        <ComparisonFaq competitorName="Yardi Breeze" items={YARDI_BREEZE_FAQ} />

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
            <RelatedContent kind="vs" slug="yardi-breeze" />
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
                    href="/vs/rentec-direct"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Rentec Direct
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/appfolio"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs AppFolio
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

const YARDI_BREEZE_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Yardi Breeze alternative?",
    answer: (
      <>
        No — different stages. Yardi Breeze operates rentals you own. TrueCap
        underwrites rentals you&apos;re considering buying. Landlords with 5-100
        units typically use both.
      </>
    ),
  },
  {
    question: "Yardi Breeze vs Buildium — which one?",
    answer: (
      <>
        Close call. Yardi Breeze inherits Yardi&apos;s enterprise data quality +
        reporting at small-business pricing. Buildium has a slightly cleaner UX
        and a larger ecosystem of integrations. Both serve 5-100 unit landlords.
        Pricing structures differ; demo both before committing.
      </>
    ),
  },
  {
    question: "Does Yardi Breeze have a free tier?",
    answer: (
      <>
        No — paid only with a demo. Pricing starts around $1-2/unit/month with a
        $100 minimum (as of 2026), which means even with 1 unit you&apos;d pay
        $100/month. For solo landlords below 50 units, TurboTenant or Avail
        (both free) are often more practical entry points.
      </>
    ),
  },
  {
    question: "Can Yardi Breeze underwrite new deals?",
    answer: (
      <>
        No — it&apos;s operational only. Pre-purchase underwriting (cap rate,
        DSCR, cash flow, projection) needs a separate calculator like TrueCap,
        DealCheck, or your spreadsheet.
      </>
    ),
  },
  {
    question: "When should I upgrade from TurboTenant to Yardi Breeze?",
    answer: (
      <>
        Typical signal: 10+ units, you want owner reports for partners or LPs,
        and you&apos;ve outgrown TurboTenant&apos;s accounting features. Below
        that threshold, the $100/mo minimum at Yardi Breeze isn&apos;t worth it.
      </>
    ),
  },
];

