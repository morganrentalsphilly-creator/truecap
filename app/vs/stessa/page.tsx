/**
 * /vs/stessa — competitor comparison landing page.
 *
 * Stessa now spans acquisition and owned-property operations. Its investment
 * property marketplace includes discovery, buy boxes, listing-level metrics,
 * comps, and editable underwriting. This page compares that current product
 * with TrueCap's narrower acquisition-decision workflow.
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
  title: "TrueCap vs Stessa (2026): Acquisition Workflows",
  description:
    "A dated TrueCap vs Stessa comparison. Both support acquisition analysis; Stessa also offers listing discovery and owned-property operations.",
  keywords: [
    "stessa alternative",
    "stessa vs truecap",
    "rental property acquisition software",
    "rental underwriting comparison",
  ],
  alternates: { canonical: "/vs/stessa" },
  openGraph: {
    title: "TrueCap vs Stessa (2026): Acquisition Workflows",
    description:
      "Both support acquisition analysis; Stessa also offers listing discovery and owned-property operations.",
    url: "/vs/stessa",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

type Verdict = "truecap" | "stessa" | "tie";
type Row = {
  feature: string;
  truecap: string;
  stessa: string;
  winner: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Product scope",
    truecap:
      "Focused acquisition screening, target review, and decision records",
    stessa:
      "Acquisition marketplace and underwriting plus accounting and landlord operations",
    winner: "tie",
  },
  {
    feature: "Listing discovery",
    truecap: "No marketplace; analyze an address or listing you bring",
    stessa:
      "Marketplace with investor filters, map layers, watchlists, and buy-box alerts",
    winner: "stessa",
  },
  {
    feature: "Pre-purchase analysis",
    truecap:
      "Cash flow, cap rate, CoC, DSCR, editable assumptions, and paid advanced views",
    stessa:
      "Listing-level rent and sale comps plus editable offer, financing, rent, and operating-cost assumptions",
    winner: "tie",
  },
  {
    feature: "Public returns calculator",
    truecap: "No-account core rental analyzer",
    stessa:
      "Purchase, debt, rent, expense, DSCR, depreciation, and after-tax outputs",
    winner: "tie",
  },
  {
    feature: "Offer Ceiling",
    truecap:
      "Pro — the highest price that still meets your targets",
    stessa:
      "The reviewed official sources describe custom offer-price scenarios, not an Offer Ceiling",
    winner: "truecap",
  },
  {
    feature: "Downside sensitivity",
    truecap: "Pro acquisition grid for rent, vacancy, and rate changes",
    stessa:
      "Owned-portfolio Stress Test varies rent collection and expenses against cash reserves; marketplace assumptions are also editable",
    winner: "tie",
  },
  {
    feature: "Acquisition data context",
    truecap:
      "Editable HUD area-rent and FRED rate benchmarks; manual local property tax",
    stessa:
      "Projected rent, public-record tax, insurance estimate, sale/rent comps, and neighborhood metrics",
    winner: "tie",
  },
  {
    feature: "Longer-range pro forma",
    truecap: "Pro includes a modeled 10-year view",
    stessa:
      "Current Pro pricing publishes budgeting and pro-forma; the reviewed page does not specify a horizon",
    winner: "tie",
  },
  {
    feature: "Owned-property accounting",
    truecap: "No bank-feed accounting",
    stessa: "Automatic bank feeds, transaction tracking, and financial reports",
    winner: "stessa",
  },
  {
    feature: "Tax-time reporting",
    truecap: "No tax-specific module offered right now",
    stessa: "Schedule E report is listed on current Manage and Pro plans",
    winner: "stessa",
  },
  {
    feature: "Rent collection and leasing",
    truecap: "No",
    stessa:
      "Rent collection, tenant screening, maintenance, forms, and plan-dependent eSignatures",
    winner: "stessa",
  },
  {
    feature: "Document storage",
    truecap:
      "Due-diligence checklist and document vault on saved deals (a free account saves up to 5)",
    stessa: "Unlimited document storage is listed across current plans",
    winner: "tie",
  },
];

export default function VsStessaPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "TrueCap vs Stessa (2026): Acquisition Workflows",
    url: `${siteUrl}/vs/stessa`,
    description:
      "Side-by-side comparison of TrueCap and Stessa for rental investors.",
    dateModified: lastmodFor("/vs/stessa"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema vsPath="/vs/stessa" pageName="TrueCap vs Stessa" />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs Stessa:{" "}
            two acquisition workflows, different depth.
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            Stessa now spans acquisition through owned-property operations: its
            marketplace includes discovery, buy boxes, comps, and editable
            underwriting. TrueCap stays focused on a source-labeled acquisition
            decision and the Offer Ceiling: the highest price that still meets your targets.
          </p>
          <p className={VS_NOTE}>
            Reviewed October 2026 against the official sources linked below.
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
                  You already find listings elsewhere and want a focused
                  acquisition review.
                </li>
                <li>You want each starting benchmark labeled and editable.</li>
                <li>
                  You want Buy Box fit and an Offer Ceiling.
                </li>
                <li>
                  You want downside testing and a shareable decision record.
                </li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Pick Stessa if
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>
                  You want to discover listings with investor filters and
                  buy-box alerts.
                </li>
                <li>
                  You want projected rent, comps, and underwriting in that
                  marketplace.
                </li>
                <li>You want bank-connected automatic transaction tracking.</li>
                <li>
                  You want rent collection, leasing tools, and tax-time reports
                  in the same broader product.
                </li>
              </ul>
            </div>
          </div>
          <p className={VS_FOOTNOTE}>
            <strong className="font-semibold text-foreground">Honest take:</strong> the
            products overlap during acquisition. Stessa is no longer accurately
            described as post-purchase only. The meaningful comparison is
            focused decision workflow versus a broader search-to-operations
            platform; using both is optional, not the default answer.
          </p>
        </Section>

        <Section aria-labelledby="vs-matrix-heading">
          <SectionHeading id="vs-matrix-heading">
            Feature-by-feature
          </SectionHeading>
          <p className={VS_INTRO}>
            Note: green check ≠ &quot;better&quot; — it means &quot;this is what
            the tool is built for.&quot;
          </p>
          {/* The note above describes a green check, so this table keeps
              one until that sentence changes (the other /vs tables mark the
              favored side in ink). */}
          <ScrollX label="Comparison table" className="mt-8 max-w-5xl">
            <VsMatrixTable
              winnerMark="positive"
              head={["Feature", "TrueCap", "Stessa"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.stessa,
                winner: row.winner === "stessa" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <div className={VS_SOURCES}>
            <p className="font-semibold text-foreground">
              Sources reviewed October 2026:
            </p>
            <ul className="mt-1">
              <li>
                <a
                  href="https://www.stessa.com/investment-property-marketplace/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tc-link inline-flex min-h-11 items-center"
                >
                  Stessa Investment Property Marketplace
                </a>
              </li>
              <li>
                <a
                  href="https://support.stessa.com/en/articles/10779191-stessa-investment-properties-marketplace"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tc-link inline-flex min-h-11 items-center"
                >
                  Marketplace help article
                </a>
              </li>
              <li>
                <a
                  href="https://support.stessa.com/en/articles/11146447-investment-property-metrics-faq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tc-link inline-flex min-h-11 items-center"
                >
                  Investment Property Metrics FAQ
                </a>
              </li>
              <li>
                <a
                  href="https://support.stessa.com/en/articles/3904791-stress-test-sensitivity-analysis-report"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tc-link inline-flex min-h-11 items-center"
                >
                  Stress Test / Sensitivity Analysis Report
                </a>
              </li>
              <li>
                <a
                  href="https://www.stessa.com/rental-returns-and-income-tax-calculator/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tc-link inline-flex min-h-11 items-center"
                >
                  Rental Property Returns and Income Tax Calculator
                </a>
              </li>
              <li>
                <a
                  href="https://www.stessa.com/pricing/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tc-link inline-flex min-h-11 items-center"
                >
                  Stessa pricing
                </a>
              </li>
            </ul>
            <p className="mt-2">
              Features and plan placement can change; verify the current product
              before buying.
            </p>
          </div>
        </Section>

        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            The actual recommendation
          </SectionHeading>
          <div className={VS_PROSE}>
            <p>
              Choose TrueCap when you bring your own listings and want a focused,
              source-labeled acquisition review with an Offer Ceiling.
            </p>
            <p>
              Evaluate Stessa when you want listing discovery, buy-box alerts,
              comps, and underwriting connected to ongoing accounting and landlord
              operations.
            </p>
            <p>
              If you already use Stessa, test its current acquisition workflow
              against your needs before adding another analyzer. If you prefer
              TrueCap for acquisition, Stessa can still receive the property after
              closing for actuals.
            </p>
            <p>
              For acquisition specifically, the highest-leverage TrueCap pages are
              the walkthroughs on{" "}
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
              </IntentPrefetchLink>
              , which take the math end to end before you commit to a full
              underwrite, plus the longer-form guides on{" "}
              <IntentPrefetchLink
                href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
                className="tc-link"
              >
                60-second underwriting
              </IntentPrefetchLink>{" "}
              and{" "}
              <IntentPrefetchLink
                href="/blog/rental-property-tax-deductions"
                className="tc-link"
              >
                rental property tax deductions
              </IntentPrefetchLink>{" "}
              (the operations side that overlaps with what Stessa tracks).
            </p>
          </div>
        </Section>

        <ComparisonFaq
          competitorName="Stessa"
          items={STESSA_FAQ}
          reviewedDate="October 2026"
        />

        <CloseSection
          headingId="vs-close-heading"
          heading={<>Underwriting the next deal? Start free.</>}
          lede={
            <>
              TrueCap free covers cap rate, CoC, model DSCR, monthly cash
              flow, up to five saves, read-only share links, and the due-diligence
              checklist/document vault. Pro adds sensitivity, the Offer Ceiling,
              10-year projections, focused comparison, Buy Box screening,
              co-branding, and PDF reports. See live pricing for current terms.
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
            <RelatedContent kind="vs" slug="stessa" />
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

const STESSA_FAQ: FaqItem[] = [
  {
    question: "Is Stessa the same kind of tool as TrueCap?",
    answer: (
      <>
        They overlap, but their scope differs. Stessa&apos;s investment-property
        marketplace supports listing discovery, buy boxes, comps, and editable
        acquisition underwriting, then Stessa continues into accounting and
        landlord operations. TrueCap is narrower: a source-labeled acquisition
        decision workflow built around your targets.
      </>
    ),
  },
  {
    question: "Should I use Stessa or TrueCap?",
    answer: (
      <>
        Choose based on workflow. TrueCap fits investors who source listings
        elsewhere and want a focused target, sensitivity, and decision-record
        workflow. Stessa fits investors who want marketplace discovery and
        acquisition analysis connected to accounting and operations. Some
        investors may use both, but neither pairing nor a strict before/after
        split should be assumed.
      </>
    ),
  },
  {
    question: "Is Stessa free?",
    answer: (
      <>
        Stessa currently publishes a free Essentials tier plus paid Manage and
        Pro tiers with different feature sets. Its current pricing places the
        Schedule E report on Manage and Pro, while Essentials includes basic
        financial reports. Check both live pricing pages for current rates,
        marketplace access, and plan terms.
      </>
    ),
  },
  {
    question: "Does TrueCap track expenses like Stessa?",
    answer: (
      <>
        No. TrueCap models projected expenses for underwriting (taxes,
        insurance, vacancy, management, maintenance, and reserves), but it does
        not connect to a bank or treat projected values as actuals. Stessa
        provides those accounting and operations workflows.
      </>
    ),
  },
  {
    question: "Can I share a TrueCap analysis with my accountant?",
    answer: (
      <>
        Yes — every TrueCap user can generate a public read-only share link for
        free; Pro adds co-branding and includes the multi-page PDF. Reports
        reflect the analysis fields available for that deal and can support an
        accountant&apos;s independent review.
      </>
    ),
  },
];

