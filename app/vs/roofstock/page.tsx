/**
 * /vs/roofstock — competitor comparison landing page.
 *
 * Target queries: "Roofstock alternative", "Roofstock vs ...",
 * "Roofstock fees", "Roofstock analyzer", "is Roofstock worth it".
 * Roofstock's individual-investor offering and transaction terms can change.
 * TrueCap is a separate underwriting model investors can use to review a
 * property with their own assumptions.
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
  title: "Roofstock vs TrueCap (2026): Verify the Numbers",
  description:
    "Compare Roofstock's current individual-investor services with TrueCap's separate, assumption-driven rental underwriting workflow.",
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
      "Roofstock offers services for individual real-estate investors. TrueCap provides a separate, assumption-driven underwrite.",
    url: "/vs/roofstock",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap vs Roofstock",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "roofstock" | "tie";
type Row = {
  feature: string;
  truecap: string;
  roofstock: string;
  winner: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Primary purpose",
    truecap: "Per-deal underwriting calculator",
    roofstock:
      "Individual-investor real-estate services; confirm current offering",
    winner: "tie",
  },
  {
    feature: "Cost to use",
    truecap: "Free core and paid Pro — see live pricing",
    roofstock: "Service and transaction dependent — confirm current terms",
    winner: "tie",
  },
  {
    feature: "Underwriting perspective",
    truecap: "Separate model using editable assumptions",
    roofstock: "Materials and analysis vary by current service",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR",
    truecap: "Calculated from the assumptions entered",
    roofstock: "Confirm the metrics included in the current offering",
    winner: "truecap",
  },
  {
    feature: "Editable assumptions",
    truecap: "Rent, vacancy, management, reserves, taxes, financing, and more",
    roofstock: "Depends on the current product or transaction workflow",
    winner: "truecap",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent, expense, appreciation, and equity scenarios",
    roofstock: "Confirm the analysis included in the current offering",
    winner: "truecap",
  },
  {
    feature: "Sensitivity grid (stress test)",
    truecap: "Pro — rent ±10%, vacancy ±5pp, rate ±1pp",
    roofstock: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "Deal score with breakdown",
    truecap: "Free — 0–100 score with subscore drill-down",
    roofstock: "Confirm any rating methodology in the current offering",
    winner: "truecap",
  },
  {
    feature: "Starting data sources",
    truecap:
      "Editable HUD rent and FRED rate benchmarks; manual local property tax",
    roofstock: "Review the sources and dates in the relevant materials",
    winner: "tie",
  },
  {
    feature: "Transaction services",
    truecap: "No — analysis only",
    roofstock: "Depends on the current individual-investor service",
    winner: "roofstock",
  },
  {
    feature: "Property discovery",
    truecap:
      "No inventory; analyze a supported address or enter inputs manually",
    roofstock: "Depends on the current individual-investor service",
    winner: "roofstock",
  },
  {
    feature: "Property management connection",
    truecap: "Not included",
    roofstock: "Confirm availability and terms for the property",
    winner: "roofstock",
  },
  {
    feature: "Property coverage",
    truecap: "Supported U.S. addresses with manual input fallback",
    roofstock: "Service and property dependent",
    winner: "truecap",
  },
  {
    feature: "Shareable read-only deal link",
    truecap: "Free read-only public link; Pro adds co-branding",
    roofstock: "Confirm what can be shared from the current service",
    winner: "truecap",
  },
  {
    feature: "PDF report export",
    truecap: "Included with Pro",
    roofstock: "Confirm available documents for the current service",
    winner: "truecap",
  },
  {
    feature: "Mobile-first UX",
    truecap: "PWA — install to home screen",
    roofstock: "Mobile-friendly web app",
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
      "Side-by-side comparison of TrueCap (underwriting calculator) and Roofstock (turnkey rental marketplace).",
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
            marketplace vs independent underwrite
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            Roofstock&apos;s current site offers services for individual
            real-estate investors. TrueCap is a separate calculator: it does not
            sell or certify a property, but it lets you model a potential
            acquisition using assumptions you can inspect and replace. Confirm
            Roofstock&apos;s current service and transaction terms directly.
          </p>
          <ActionRow className={VS_ACTIONS}>
            <AnalyzeCtaLink analyticsSource="vs_hero" className={buttonVariants({ size: "cta" })}>
              Underwrite a Roofstock listing
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
                  You want an independent underwrite of a Roofstock listing.
                </li>
                <li>
                  You want to compare a Roofstock deal to a non-Roofstock deal
                  head-to-head.
                </li>
                <li>
                  You want to replace third-party assumptions with
                  property-specific evidence and test a range.
                </li>
                <li>
                  You want a 10-year cash-flow and equity projection, not a
                  year-one snapshot.
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
                  Its current individual-investor service matches the
                  transaction or ownership support you need.
                </li>
                <li>
                  You have reviewed the current fees, agreements, diligence
                  materials, and service providers.
                </li>
                <li>
                  You understand which work Roofstock performs and which remains
                  your responsibility.
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
            TrueCap provides an underwriting model; Roofstock&apos;s current
            individual-investor services should be confirmed on its official
            site.
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
            Roofstock details based on publicly available product info as of
            2026. See{" "}
            <a
              href="https://www.roofstock.com/investment-solutions/individual-investors"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              Roofstock&apos;s official individual-investor page
            </a>{" "}
            for their current state.
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
                <strong>Run the sensitivity grid (free on your first decision).</strong> If the deal
                changes across lower rent, higher vacancy, and higher-rate
                scenarios. The grid is decision support, not a forecast.
              </li>
              <li>
                <strong>Review the Deal score and its inputs.</strong> It is a
                heuristic summary of the modeled numbers, 0–100. Apply your own
                criteria and complete diligence.
              </li>
            </ol>
            <p>
              Want a faster read on a Roofstock listing? The free{" "}
              <Link
                href="/tools/gross-rent-multiplier-calculator"
                className="tc-link"
              >
                gross rent multiplier calculator
              </Link>{" "}
              triages one in seconds, and when the listing survives that screen
              the full{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              computes{" "}
              <Link
                href="/glossary/cap-rate"
                className="tc-link"
              >
                cap rate
              </Link>{" "}
              and{" "}
              <Link
                href="/glossary/cash-on-cash-return"
                className="tc-link"
              >
                cash-on-cash return
              </Link>{" "}
              from the address. For the full workflow, our guide on{" "}
              <Link
                href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
                className="tc-link"
              >
                60-second underwriting
              </Link>{" "}
              walks through exactly the steps above.
            </p>
          </div>
        </Section>

        <ComparisonFaq competitorName="Roofstock" items={ROOFSTOCK_FAQ} />

        {/* Pricing CTA */}
        <CloseSection
          headingId="vs-close-heading"
          heading={<>Pressure-test your next Roofstock deal — free.</>}
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
            <RelatedContent kind="vs" slug="roofstock" />
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
                <li>
                  <Link
                    href="/vs/mashvisor"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Mashvisor
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

const ROOFSTOCK_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Roofstock alternative?",
    answer: (
      <>
        Not directly — they solve different problems. Roofstock is a current
        individual-investor services vary by offering. TrueCap is a separate
        calculator for supported properties and manually entered assumptions.
        The tools may complement each other, but neither replaces
        property-specific diligence.
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
        For supported U.S. addresses, paste the address into TrueCap. If lookup
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
        Recalculate it from the documented inputs. Confirm how income, vacancy,
        taxes, insurance, management, maintenance, utilities, and reserves are
        defined, then replace them with current evidence and test a range.
        TrueCap&apos;s result is also only as reliable as the assumptions
        entered.
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

