/**
 * /vs/yardi-breeze — competitor comparison landing page.
 *
 * Target queries: "yardi breeze alternative", "yardi breeze vs buildium", "yardi breeze pricing", "yardi breeze review".
 * Yardi Breeze is property management software from Yardi. Competitor cells were checked in
 * October 2026 against yardibreeze.com/residential-features/ (features and pricing); Yardi
 * publishes no unit range, so the page ties its advice to the $100 monthly minimum.
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
      "Yardi Breeze is property management software. TrueCap is the pre-purchase underwrite. Different stages.",
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
    yardibreeze: "Not on Yardi Breeze's published feature list",
    winner: "truecap",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    yardibreeze: "Not on Yardi Breeze's published feature list",
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
    yardibreeze: "Yes: applications, screening and leases online",
    winner: "yardibreeze",
  },
  {
    feature: "Online rent collection",
    truecap: "No",
    yardibreeze: "Yes: debit card, credit card and ACH",
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
    yardibreeze: "Yes: owner reports by email or secure portal",
    winner: "yardibreeze",
  },
  {
    feature: "Full GL accounting",
    truecap: "Forward projection only",
    yardibreeze: "Yes: general ledger, financial statements and 1099 e-file",
    winner: "yardibreeze",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    yardibreeze: "No free plan listed; demo available",
    winner: "truecap",
  },
  {
    feature: "Pricing (entry tier)",
    truecap: "Free core; paid Pro — see live pricing",
    yardibreeze:
      "Residential: $1 per unit per month, $100 monthly minimum, annual agreement (as of October 2026)",
    winner: "tie",
  },
  {
    feature: "Who it is for",
    truecap: "Agents with investor clients, and buy-and-hold investors",
    yardibreeze:
      "Owners and managers of residential, commercial, affordable, self storage, association and manufactured housing portfolios",
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
            Yardi Breeze is property management software from Yardi: tenant
            management, rent collection, accounting, owner reports. Residential
            pricing starts at $1 per unit per month with a $100 monthly minimum.
            TrueCap models the first-year economics of properties you are
            considering. Different stages, complementary tools.
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
                  You own a few units: residential Breeze bills at least $100 a
                  month however few units you have.
                </li>
                <li>You want a free tier — no commitment.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use Yardi Breeze when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>
                  You manage enough units to carry a $100 monthly minimum and
                  need operations and accounting in one tool.
                </li>
                <li>
                  You need rent collection, lease management, work orders, owner
                  reports.
                </li>
                <li>
                  You want general ledger accounting, financial statements and
                  1099 e-file.
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
            Yardi Breeze details checked in October 2026 against{" "}
            <a
              href="https://www.yardibreeze.com/residential-features/"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              Yardi Breeze&apos;s residential features and pricing page
            </a>
            . See Yardi Breeze for current plans.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            How TrueCap and Yardi Breeze fit together
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
                get logged, owner reports go out by email or portal.
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
              rebuilds the number your financial statements show after the
              fact, and{" "}
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

        <ComparisonFaq
          competitorName="Yardi Breeze"
          items={YARDI_BREEZE_FAQ}
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
        underwrites rentals you&apos;re considering buying. The two fit one
        after the other: TrueCap before you buy, Yardi Breeze once you own.
      </>
    ),
  },
  {
    question: "Yardi Breeze vs Buildium — which one?",
    answer: (
      <>
        We don&apos;t rank property management software. Yardi Breeze publishes
        residential pricing of $1 per unit per month with a $100 monthly
        minimum on an annual agreement (as of October 2026). Compare that with
        Buildium&apos;s pricing page for your unit count before committing.
      </>
    ),
  },
  {
    question: "Does Yardi Breeze have a free tier?",
    answer: (
      <>
        Yardi Breeze lists no free plan; it offers a demo. Residential Breeze
        is $1 per unit per month with a $100 monthly minimum on an annual
        agreement (as of October 2026), so an owner with one unit pays the
        $100 minimum. TurboTenant publishes a free plan if you manage a few
        units yourself.
      </>
    ),
  },
  {
    question: "Can Yardi Breeze underwrite new deals?",
    answer: (
      <>
        Yardi Breeze&apos;s published feature list covers managing properties
        you own: leasing, rent collection, accounting, owner tools and
        maintenance. It lists no pre-purchase deal analysis. Pre-purchase
        underwriting (cap rate, DSCR, cash flow, projection) needs a separate
        calculator like TrueCap, DealCheck, or your spreadsheet.
      </>
    ),
  },
  {
    question: "When should I upgrade from TurboTenant to Yardi Breeze?",
    answer: (
      <>
        Start from the price. Residential Breeze bills a $100 monthly minimum
        on an annual agreement, the same for 1 unit or 100. It earns that when
        you need what its feature list names, such as general ledger
        accounting, owner reports and 1099 e-file. TurboTenant&apos;s paid
        plans start at $149 a year for up to 10 units (both as of October
        2026).
      </>
    ),
  },
];

