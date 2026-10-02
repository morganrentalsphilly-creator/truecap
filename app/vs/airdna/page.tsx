/**
 * /vs/airdna — competitor comparison landing page.
 *
 * Target queries: "airdna alternative", "airdna vs mashvisor", "airdna pricing", "airdna review", "str data tool".
 * AirDNA is short-term rental market data: occupancy, ADR and revenue by market, plus Rentalizer, a revenue projection for one address with a cash-purchase cap rate. Vendor facts on this page were checked against airdna.co/pricing and help.airdna.co in October 2026.
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
  title: "AirDNA vs TrueCap (2026): STR Data vs Deal Math",
  description:
    "AirDNA estimates STR revenue. TrueCap underwrites the full deal. Honest comparison for short-term rental investors plus how they fit together.",
  keywords: [
    "airdna alternative",
    "airdna vs mashvisor",
    "airdna pricing",
    "airdna review",
    "str data tool",
  ],
  alternates: { canonical: "/vs/airdna" },
  openGraph: {
    title: "AirDNA vs TrueCap (2026): STR Data vs Deal Math",
    description:
      "AirDNA estimates STR revenue. TrueCap underwrites the full deal. How the two fit together.",
    url: "/vs/airdna",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

type Verdict = "truecap" | "airdna" | "tie";
type Row = {
  feature: string;
  truecap: string;
  airdna: string;
  winner: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Primary purpose",
    truecap: "Per-deal underwriting calculator",
    airdna: "STR market + property revenue data",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, free tier",
    airdna:
      "Rentalizer's calculator gives net operating income and a cap rate for a cash purchase; no cash-on-cash, DSCR or mortgage math is published",
    winner: "tie",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    airdna: "Future demand data on the Market Research plan",
    winner: "tie",
  },
  {
    feature: "Deal score (0–100)",
    truecap: "Free — 0–100 score with factor breakdown",
    airdna:
      "Market Score: a market-level grade from 40 to 100 that includes investability",
    winner: "tie",
  },
  {
    feature: "STR revenue projection (ADR + occupancy)",
    truecap: "Editable input only",
    airdna: "Yes: Rentalizer projects revenue from comparable listings",
    winner: "airdna",
  },
  {
    feature: "Comparable STR listings nearby",
    truecap: "No",
    airdna:
      "Yes: comparable listings in Rentalizer; custom comp sets on Market Research",
    winner: "airdna",
  },
  {
    feature: "Long-term rent baseline",
    truecap: "HUD Fair Market Rent",
    airdna: "Not the focus",
    winner: "truecap",
  },
  {
    feature: "Mortgage + financing math",
    truecap: "Yes — PITI + DSCR + amortization",
    airdna: "Not listed; Rentalizer's cap rate is for a cash purchase",
    winner: "truecap",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    airdna: "STR-specific data only",
    winner: "truecap",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    airdna: "Free plan with a limited Rentalizer and limited market insights",
    winner: "tie",
  },
  {
    feature: "Pricing (paid tier)",
    truecap: "Paid Pro; see live pricing for current rates",
    airdna:
      "Market Research $125 a month, or $400 a year ($34 a month billed annually); Rentalizer is included, not sold per report (as of October 2026)",
    winner: "tie",
  },
  {
    feature: "Shareable read-only analysis",
    truecap: "Free — read-only public link; Pro adds co-branding",
    airdna: "PDF report downloads on Market Research",
    winner: "tie",
  },
];

export default function VsAirdnaPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "AirDNA vs TrueCap (2026): STR Data vs Deal Math",
    url: `${siteUrl}/vs/airdna`,
    description:
      "AirDNA estimates STR revenue. TrueCap underwrites the full deal. Honest comparison for short-term rental investors plus how they fit together.",
    dateModified: lastmodFor("/vs/airdna"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema vsPath="/vs/airdna" pageName="TrueCap vs AirDNA" />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs AirDNA:{" "}
            STR revenue data vs full underwriting
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            AirDNA is a short-term rental data provider: occupancy, ADR, and
            revenue by market, plus a revenue projection for an individual
            address, built from Airbnb, Vrbo, and Booking.com listings. TrueCap
            is the underwriting calculator that turns that revenue projection
            into a full deal analysis (cap rate, DSCR, cash flow, projection).
            AirDNA estimates the revenue; TrueCap adds financing, DSCR, and your
            Offer Ceiling, the highest price that still meets your targets.
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
                  You want a full underwriting analysis with cap rate, DSCR,
                  cash flow.
                </li>
                <li>You want financing math (PITI, amortization).</li>
                <li>
                  You want to compare LTR and STR scenarios on the same
                  property.
                </li>
                <li>You want a free tier that doesn&apos;t cap analyses.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use AirDNA when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>
                  You want STR revenue projections built from comparable
                  listings (ADR, occupancy, revenue).
                </li>
                <li>
                  You&apos;re evaluating multiple STR markets and need
                  comparable data.
                </li>
                <li>
                  You want a property-level Rentalizer report built from real
                  listing data.
                </li>
                <li>
                  You&apos;re scaling STR investments and need market
                  intelligence.
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
              head={["Feature", "TrueCap", "AirDNA"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.airdna,
                winner: row.winner === "airdna" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            AirDNA details checked against airdna.co/pricing and AirDNA&apos;s
            help center in October 2026. See{" "}
            <a
              href="https://www.airdna.co/pricing"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              AirDNA&apos;s pricing page
            </a>{" "}
            for current plans.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            How AirDNA and TrueCap fit together
          </SectionHeading>
          <div className={VS_PROSE}>
            <ol>
              <li>
                <strong>Pick a target STR market in AirDNA.</strong> Market
                data: occupancy rates, ADR, seasonality, regulation.
              </li>
              <li>
                <strong>Run a Rentalizer report on the specific property.</strong>{" "}
                AirDNA&apos;s address-level revenue projection (limited on the
                Free plan, customizable on Market Research).
              </li>
              <li>
                <strong>
                  Plug AirDNA&apos;s projected monthly revenue into TrueCap.
                </strong>{" "}
                Override the HUD long-term rent field with AirDNA&apos;s STR
                estimate (e.g. annual revenue ÷ 12, discounted for vacancy +
                cleaning).
              </li>
              <li>
                <strong>Run the stabilized-rental underwrite in TrueCap.</strong>{" "}
                Cap rate, DSCR, cash flow, sensitivity, and a 10-year cash-flow
                and equity projection.
              </li>
              <li>
                <strong>Save the deal + revisit later.</strong> Re-run with
                updated AirDNA data when market conditions shift.
              </li>
            </ol>
            <p>
              Set the revenue forecast aside for a moment. Check whether projected
              STR income even covers the note with the free{" "}
              <IntentPrefetchLink
                href="/tools/mortgage-payment-calculator"
                className="tc-link"
              >
                mortgage payment calculator
              </IntentPrefetchLink>
              , then run the full{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              for cap rate, DSCR, and cash flow. Our guide on{" "}
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
          competitorName="AirDNA"
          items={AIRDNA_FAQ}
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
            <RelatedContent kind="vs" slug="airdna" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
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
                    href="/vs/hostfully"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Hostfully
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/hostaway"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Hostaway
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

const AIRDNA_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap an AirDNA alternative?",
    answer: (
      <>
        No — they solve different problems. AirDNA is STR market + revenue data;
        TrueCap is the underwriting calculator. AirDNA estimates the revenue;
        TrueCap adds financing, DSCR, and cash flow on top. The two can be used
        together.
      </>
    ),
  },
  {
    question: "AirDNA vs Mashvisor — which one for STR data?",
    answer: (
      <>
        AirDNA focuses on short-term rental data (ADR, occupancy, revenue).
        Mashvisor covers short-term rentals too and also estimates long-term
        rental rates. If STR is your only strategy, AirDNA&apos;s focus fits.
        If you compare long-term and short-term rents on the same property,
        look at Mashvisor as well.
      </>
    ),
  },
  {
    question: "Does AirDNA do cap rate or DSCR calculations?",
    answer: (
      <>
        Partly. Rentalizer estimates revenue and, once you add expenses and a
        purchase price, shows net operating income and a cap rate for a cash
        purchase. AirDNA&apos;s help center does not describe DSCR,
        cash-on-cash, or mortgage math. For those, plug the revenue into a
        separate calculator (TrueCap, DealCheck, or your spreadsheet).
      </>
    ),
  },
  {
    question: "How accurate are AirDNA's revenue projections?",
    answer: (
      <>
        They are estimates. Rentalizer projects revenue from comparable
        listings, and AirDNA reports a Comp Set Strength (Low, Medium, or High)
        that shows how consistent those comps are, so the projection still
        depends on the property being a good comp match in the local market.
        Always run sensitivity (TrueCap Pro&apos;s sensitivity grid lets you
        stress-test): what happens if AirDNA&apos;s projection is 20% high?
      </>
    ),
  },
  {
    question: "Can I use TrueCap free with AirDNA?",
    answer: (
      <>
        Yes — TrueCap&apos;s free tier covers core cap rate, CoC, DSCR, and
        cash-flow math. Pull AirDNA&apos;s monthly revenue projection, override
        TrueCap&apos;s HUD rent field with it, and run the analysis. You
        don&apos;t need TrueCap Pro for that basic combined workflow.
      </>
    ),
  },
];

