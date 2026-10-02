/**
 * /vs/roofstock — competitor comparison landing page.
 *
 * Target queries: "Roofstock alternative", "Roofstock vs ...",
 * "Roofstock fees", "Roofstock analyzer", "is Roofstock worth it".
 * What Roofstock offers an individual buyer today, as roofstock.com and
 * stessa.com rendered on 2026-10-02: its "Explore Properties" link opens
 * Stessa's marketplace ("Investment Properties Powered by Roofstock"), and
 * roofstock.com presents three brands, Mynd (property management), Stessa
 * (landlord software) and RentPrep (tenant screening). The page must agree
 * with /blog/roofstock-vs-mashvisor-vs-propstream, which is sourced the same
 * way. A row is marked for one side only where the other side's cell states a
 * checked fact. TrueCap is a separate underwriting model investors can use to
 * review a property with their own assumptions.
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
  title: "Roofstock vs TrueCap (2026): Verify the Numbers",
  description:
    "Roofstock now sends individual buyers to Stessa's marketplace, with Mynd for management and RentPrep for screening. See where TrueCap's own underwrite fits.",
  keywords: [
    "roofstock alternative",
    "roofstock vs truecap",
    "roofstock analyzer",
    "roofstock fees",
    "is roofstock worth it",
    "turnkey rental analyzer",
  ],
  alternates: { canonical: "/vs/roofstock" },
  openGraph: {
    title: "Roofstock vs TrueCap (2026): Verify the Numbers",
    description:
      "Roofstock's property listings now open on Stessa's marketplace. TrueCap models the purchase from assumptions you can inspect and replace.",
    url: "/vs/roofstock",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

type Verdict = "truecap" | "roofstock" | "tie";
type Row = {
  feature: string;
  truecap: string;
  roofstock: string;
  winner: Verdict;
};

// Every Roofstock cell restates roofstock.com, Stessa's marketplace pages or
// Stessa's help center as rendered on 2026-10-02 (the sources are linked under
// the table). A row favors one side only where the other side's cell states a
// checked fact; a cell that can only point at the vendor is a tie.
const MATRIX: Row[] = [
  {
    feature: "Primary purpose",
    truecap: "Per-deal underwriting calculator",
    roofstock:
      "Services for residential investors: listings on Stessa's marketplace, Mynd for property management, RentPrep for tenant screening",
    winner: "tie",
  },
  {
    feature: "Cost to use",
    truecap: "Free core and paid Pro — see live pricing",
    roofstock:
      "Marketplace listings can be browsed without an account; see Stessa, Mynd and RentPrep for each service's pricing",
    winner: "tie",
  },
  {
    feature: "Underwriting perspective",
    truecap: "Separate model using editable assumptions",
    roofstock:
      "Stessa's marketplace projects rent and returns from its own inputs, which you can replace",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR",
    truecap: "Calculated from the assumptions entered",
    roofstock:
      "Gross yield, cap rate and cash on cash on marketplace listing cards",
    winner: "tie",
  },
  {
    feature: "Editable assumptions",
    truecap: "Rent, vacancy, management, reserves, taxes, financing, and more",
    roofstock:
      "Offer price, financing, rent and operating costs in the marketplace calculator",
    winner: "tie",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent, expense, appreciation, and equity scenarios",
    roofstock:
      "The marketplace calculator shows projected cash flow, cap rate and ROI",
    winner: "tie",
  },
  {
    feature: "Sensitivity grid (stress test)",
    truecap: "Pro — rent ±10%, vacancy ±5pp, rate ±1pp",
    roofstock:
      "Stessa's Stress Test report models rent collection scenarios against your cash reserves",
    winner: "tie",
  },
  {
    feature: "Deal score with breakdown",
    truecap: "Free — 0–100 score with subscore drill-down",
    roofstock: "Neighborhood, school and crime scores on each listing",
    winner: "tie",
  },
  {
    feature: "Starting data sources",
    truecap:
      "Editable HUD rent and FRED rate benchmarks; manual local property tax",
    roofstock:
      "Stessa's rent estimates and comps, with default property tax, insurance and HOA estimates",
    winner: "tie",
  },
  {
    feature: "Transaction services",
    truecap: "No — analysis only",
    roofstock:
      "The marketplace connects you with a vetted local agent who helps negotiate, inspect and close",
    winner: "roofstock",
  },
  {
    feature: "Property discovery",
    truecap:
      "No inventory; analyze a supported address or enter inputs manually",
    roofstock:
      "Listings on Stessa's marketplace, with buy box filters and alerts",
    winner: "roofstock",
  },
  {
    feature: "Property management connection",
    truecap: "Not included",
    roofstock: "Mynd, Roofstock's full-service property management brand",
    winner: "roofstock",
  },
  {
    feature: "Property coverage",
    truecap: "Supported U.S. addresses with manual input fallback",
    roofstock: "Listings across the U.S., per Stessa's help center",
    winner: "tie",
  },
  {
    feature: "Shareable read-only deal link",
    truecap: "Free read-only public link; Pro adds co-branding",
    roofstock: "See Stessa's marketplace for what a listing lets you share",
    winner: "tie",
  },
  {
    feature: "PDF report export",
    truecap: "Included with Pro",
    roofstock: "See Stessa's marketplace for its report options",
    winner: "tie",
  },
  {
    feature: "Mobile-first UX",
    truecap: "PWA — install to home screen",
    roofstock: "Stessa has iOS and Android apps",
    winner: "tie",
  },
];

export default function VsRoofstockPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Roofstock vs TrueCap (2026): Verify the Numbers",
    url: `${siteUrl}/vs/roofstock`,
    description:
      "Side-by-side comparison of TrueCap, a rental underwriting calculator, and Roofstock, whose services for individual investors run through Stessa's marketplace, Mynd and RentPrep.",
    dateModified: lastmodFor("/vs/roofstock"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema
        vsPath="/vs/roofstock"
        pageName="TrueCap vs Roofstock"
      />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs Roofstock:{" "}
            investor services vs your own underwrite
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            Roofstock&apos;s Explore Properties link now opens Stessa&apos;s
            investment-property marketplace, and roofstock.com points individual
            investors to three brands: Mynd for property management, Stessa for
            landlord software and RentPrep for tenant screening. TrueCap is a
            separate calculator: it does not sell or certify a property, but it
            lets you model a potential acquisition using assumptions you can
            inspect and replace. Confirm Roofstock&apos;s current service and
            transaction terms directly.
          </p>
          <ActionRow className={VS_ACTIONS}>
            <AnalyzeCtaLink analyticsSource="vs_hero" className={buttonVariants({ size: "cta" })}>
              Analyze a deal free
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
            priority
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
                  You want your own underwrite of a listing you found on
                  Stessa&apos;s marketplace, where Roofstock now sends buyers.
                </li>
                <li>
                  You want to run a marketplace listing and a deal from
                  anywhere else through the same model.
                </li>
                <li>
                  You want to replace third-party assumptions with
                  property-specific evidence and test a range.
                </li>
                <li>
                  You want a 10-year cash-flow and equity projection (Pro).
                </li>
                <li>
                  You want a Deal score with a transparent breakdown.
                </li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use Roofstock when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>
                  You want to browse listings with investor metrics: its
                  Explore Properties link opens Stessa&apos;s marketplace.
                </li>
                <li>
                  You want a vetted local agent to help negotiate, inspect and
                  close.
                </li>
                <li>
                  You want full-service property management (Mynd) or tenant
                  screening (RentPrep).
                </li>
                <li>
                  You have independently verified the property-specific
                  financial assumptions.
                </li>
              </ul>
            </div>
          </div>
          <div className={VS_PROSE}>
            <p>
              Treat any seller, marketplace, manager, or calculator pro forma as a
              model rather than a promise. Verify the evidence behind rent, taxes,
              insurance, financing, vacancy, management, maintenance, and capital
              reserves, then sensitivity-test the assumptions before deciding.
            </p>
          </div>
        </Section>

        {/* Matrix */}
        <Section aria-labelledby="vs-matrix-heading">
          <SectionHeading id="vs-matrix-heading">
            Feature-by-feature
          </SectionHeading>
          <p className={VS_INTRO}>
            TrueCap provides an underwriting model. The Roofstock column is
            what roofstock.com and Stessa&apos;s marketplace pages said in
            October 2026; confirm current details on those sites.
          </p>
          <ScrollX label="Comparison table" className="mt-8 max-w-5xl">
            <VsMatrixTable
              head={["Feature", "TrueCap", "Roofstock"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.roofstock,
                winner: row.winner === "roofstock" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            Roofstock details are from{" "}
            <a
              href="https://www.roofstock.com/investment-solutions/individual-investors"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              Roofstock&apos;s official individual-investor page
            </a>
            ,{" "}
            <a
              href="https://www.stessa.com/investment-properties"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              Stessa&apos;s marketplace
            </a>
            , its{" "}
            <a
              href="https://www.stessa.com/investment-property-marketplace/"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              marketplace overview
            </a>{" "}
            and{" "}
            <a
              href="https://support.stessa.com/en/articles/10779191-stessa-investment-properties-marketplace"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              Stessa&apos;s help center
            </a>
            , read in October 2026.
          </p>
        </Section>

        {/* The pressure-test angle */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            How to review a property with your own assumptions
          </SectionHeading>
          <div className={VS_PROSE}>
            <ol>
              <li>
                <strong>
                  Copy the listing address into the TrueCap analyzer.
                </strong>{" "}
                TrueCap starts with editable HUD rent and FRED rate benchmarks;
                property tax stays manual. They are starting assumptions, not
                property-specific quotes or guarantees.
              </li>
              <li>
                <strong>Replace rent with property-specific evidence.</strong>{" "}
                Compare current local comps, executed leases where available,
                concessions, condition, and seasonality. Test a range rather than
                using a universal percentage threshold.
              </li>
              <li>
                <strong>
                  Use property- and market-specific expense evidence.
                </strong>{" "}
                Obtain current tax, insurance, management, maintenance, leasing,
                utility, and capital-reserve estimates, then model a reasonable
                range.
              </li>
              <li>
                <strong>Run the sensitivity grid (free on your first decision).</strong> See how
                the deal changes across lower-rent, higher-vacancy and
                higher-rate scenarios. The grid is decision support, not a
                forecast.
              </li>
              <li>
                <strong>Review the Deal score and its inputs.</strong> It is a
                heuristic summary of the modeled numbers, 0–100. Apply your own
                criteria and complete diligence.
              </li>
            </ol>
            <p>
              Want a faster read on a marketplace listing? The free{" "}
              <IntentPrefetchLink
                href="/tools/gross-rent-multiplier-calculator"
                className="tc-link"
              >
                gross rent multiplier calculator
              </IntentPrefetchLink>{" "}
              triages one in seconds, and when the listing survives that screen
              the full{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              computes{" "}
              <IntentPrefetchLink
                href="/glossary/cap-rate"
                className="tc-link"
              >
                cap rate
              </IntentPrefetchLink>{" "}
              and{" "}
              <IntentPrefetchLink
                href="/glossary/cash-on-cash-return"
                className="tc-link"
              >
                cash-on-cash return
              </IntentPrefetchLink>{" "}
              from the address. For the full workflow, our guide on{" "}
              <IntentPrefetchLink
                href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
                className="tc-link"
              >
                60-second underwriting
              </IntentPrefetchLink>{" "}
              walks through exactly the steps above.
            </p>
          </div>
        </Section>

        {/* reviewedDate: every Roofstock cell, link and FAQ statement on this
            page was compared with roofstock.com, Stessa's marketplace pages
            and Stessa's help center as rendered on 2026-10-02. */}
        <ComparisonFaq
          competitorName="Roofstock"
          items={ROOFSTOCK_FAQ}
          reviewedDate="October 2026"
        />

        {/* Pricing CTA */}
        <CloseSection
          headingId="vs-close-heading"
          heading={<>Underwrite the next listing on your own assumptions.</>}
          lede={
            <>
              Free covers the core underwrite and plain read-only share links. Pro
              adds 10-year cash-flow and equity projections, sensitivity, Offer
              Ceiling, co-branding, and included PDFs. New one-time PDF purchases
              are temporarily unavailable. No card to start.
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
            <RelatedContent kind="vs" slug="roofstock" />
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

const ROOFSTOCK_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Roofstock alternative?",
    answer: (
      <>
        Not directly. They solve different problems. Roofstock offers services
        for residential investors: property listings through Stessa&apos;s
        marketplace, property management through Mynd and tenant screening
        through RentPrep. TrueCap is a separate calculator for supported
        properties and manually entered assumptions. The tools may complement
        each other, but neither replaces property-specific diligence.
      </>
    ),
  },
  {
    question: "Are Roofstock listings actually good deals?",
    answer: (
      <>
        That cannot be determined from the platform name. Review the property,
        agreement, current service terms, rent evidence, taxes, insurance,
        financing, vacancy, management, maintenance, reserves, title,
        inspection, and local rules. Sensitivity-test a range; TrueCap does not
        certify a property as a good or bad investment.
      </>
    ),
  },
  {
    question: "What is Roofstock's fee compared to using TrueCap?",
    answer: (
      <>
        Roofstock&apos;s offering and transaction terms can change, so use the
        relevant agreement and official site for the current fees. TrueCap has a
        free core analyzer plus paid Pro; new one-time PDF purchases are
        temporarily unavailable. Its live pricing page is the source of truth.
      </>
    ),
  },
  {
    question: "Can TrueCap analyze any Roofstock listing?",
    answer: (
      <>
        Roofstock&apos;s listings now open on Stessa&apos;s marketplace. For
        supported U.S. addresses, paste the address into TrueCap. If lookup
        data is unavailable, enter the property inputs manually. HUD rent and
        FRED rate are editable screening benchmarks; property tax is a manual
        local input. Replace them with property-specific evidence.
      </>
    ),
  },
  {
    question: "Should I trust the Roofstock pro-forma cap rate?",
    answer: (
      <>
        Stessa&apos;s marketplace, which Roofstock powers, shows a cap rate on
        its listing cards, and its calculator starts from default estimates
        for property taxes, insurance and HOA fees. Recalculate it from the
        documented inputs. Confirm how income, vacancy, taxes, insurance,
        management, maintenance, utilities, and reserves are defined, then
        replace them with current evidence and test a range. TrueCap&apos;s
        result is also only as reliable as the assumptions entered.
      </>
    ),
  },
  {
    question: "When should I skip Roofstock and find deals elsewhere?",
    answer: (
      <>
        Compare Roofstock&apos;s current service, property availability,
        agreements, fees, diligence materials, providers, and support with
        direct sourcing and other alternatives. Choose based on the specific
        transaction and your ability to complete local, legal, financial, and
        physical diligence.
      </>
    ),
  },
];
