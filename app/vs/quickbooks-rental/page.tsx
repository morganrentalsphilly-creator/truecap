/**
 * /vs/quickbooks-rental — competitor comparison landing page.
 *
 * Target queries: "quickbooks for rentals", "quickbooks alternative landlord", "quickbooks vs stessa", "quickbooks rental property", "best accounting for rentals".
 * QuickBooks Online is general-purpose small-business accounting that can be set up for rental bookkeeping (per-property books need class and location tracking, on Plus and above). Stessa / Baselane / Landlord Studio are rental-specific competitors; TrueCap is upstream of all of them.
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
  title: "QuickBooks vs TrueCap for Rentals (2026)",
  description:
    "QuickBooks is general-purpose accounting. TrueCap is pre-purchase rental underwriting. See where each fits and how rental-specific accounting tools compare.",
  keywords: [
    "quickbooks for rentals",
    "quickbooks alternative landlord",
    "quickbooks vs stessa",
    "quickbooks rental property",
    "best accounting for rentals",
  ],
  alternates: { canonical: "/vs/quickbooks-rental" },
  openGraph: {
    title: "QuickBooks vs TrueCap for Rentals (2026)",
    description:
      "QuickBooks is general-purpose accounting. TrueCap is pre-purchase underwriting. Different stages.",
    url: "/vs/quickbooks-rental",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

type Verdict = "truecap" | "quickbooksrental" | "tie";
type Row = {
  feature: string;
  truecap: string;
  quickbooksrental: string;
  winner?: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Lifecycle stage",
    truecap: "Pre-purchase — underwrite the deal",
    quickbooksrental: "Post-purchase — general accounting",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, free tier",
    quickbooksrental: "Not among QuickBooks' listed plan features",
    winner: "truecap",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    quickbooksrental: "Not among QuickBooks' listed plan features",
    winner: "truecap",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    quickbooksrental: "Not among QuickBooks' listed plan features",
    winner: "truecap",
  },
  {
    feature: "Rental-specific categorization",
    truecap: "Forward-looking expense modeling",
    quickbooksrental:
      "General business accounting; its pricing page lists nothing rental-specific",
  },
  {
    feature: "Bank-feed sync",
    truecap: "No",
    quickbooksrental:
      "Yes: bank connections that sync transactions; the Free plan connects one bank",
    winner: "quickbooksrental",
  },
  {
    feature: "Per-property P&L",
    truecap: "Forward projection per deal",
    quickbooksrental: "Class and location tracking, on the Plus plan and above",
    winner: "tie",
  },
  {
    feature: "Schedule E export",
    truecap: "No",
    quickbooksrental:
      "Profit and loss reports; Schedule E is not named on its pricing page",
  },
  {
    feature: "Rental rent collection",
    truecap: "No",
    quickbooksrental:
      "Invoices paid by card or bank transfer through QuickBooks Payments",
    winner: "quickbooksrental",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    quickbooksrental:
      "Yes: a Free plan (1 user, 2 invoices a month, 1 bank connection); paid plans from $38 to $340 a month (as of October 2026)",
    winner: "tie",
  },
  {
    feature: "Built for rental property",
    truecap: "Yes: rental underwriting for agents and investors",
    quickbooksrental: "No: general business accounting",
    winner: "truecap",
  },
];

export default function VsQuickbooksRentalPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "QuickBooks vs TrueCap for Rentals (2026)",
    url: `${siteUrl}/vs/quickbooks-rental`,
    description:
      "QuickBooks is general-purpose accounting. TrueCap is pre-purchase rental underwriting. See where each fits and how rental-specific accounting tools compare.",
    dateModified: lastmodFor("/vs/quickbooks-rental"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema
        vsPath="/vs/quickbooks-rental"
        pageName="TrueCap vs QuickBooks for rentals"
      />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs QuickBooks for rentals:{" "}
            underwrite the deal vs track the books
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            QuickBooks Online is general-purpose small-business accounting that
            can be set up for rental bookkeeping. It is not built around
            rentals: per-property books run through class and location
            tracking, which is on the Plus plan and above. TrueCap is
            pre-purchase rental underwriting (cap rate, cash flow, DSCR,
            projection). Different stages. For rental-specific accounting,
            compare Stessa, Baselane, and Landlord Studio.
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
                <li>You&apos;re evaluating rental properties before buying.</li>
                <li>You want cap rate, DSCR, cash flow, projection.</li>
                <li>
                  You&apos;re not yet tracking actual rental income / expenses.
                </li>
                <li>You want the core underwriting metrics free.</li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use QuickBooks for rentals when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>
                  You already use QuickBooks for other businesses (single-tool
                  preference).
                </li>
                <li>You have a CPA who specifically wants QuickBooks files.</li>
                <li>You need general accounting beyond just rentals.</li>
                <li>
                  You&apos;ve set up rental-specific classes / locations in
                  QuickBooks (Plus and above) and it works.
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
              head={["Feature", "TrueCap", "QuickBooks for rentals"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.quickbooksrental,
                winner: row.winner === "quickbooksrental" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            QuickBooks plans and prices were read from Intuit&apos;s pricing
            page in October 2026. See{" "}
            <a
              href="https://quickbooks.intuit.com/pricing/"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              quickbooks.intuit.com/pricing
            </a>{" "}
            for current terms.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            Compare a rental-specific tool first
          </SectionHeading>
          <div className={VS_PROSE}>
            <ol>
              <li>
                <strong>Underwrite the property in TrueCap.</strong> Cap rate,
                DSCR, cash flow, projection.
              </li>
              <li>
                <strong>Decide on accounting tool.</strong> QuickBooks can do it
                with class tracking per property (Plus and above) and your own
                Schedule E mapping. Stessa, Baselane, and Landlord Studio are
                built for rentals; compare their plans before you choose.
              </li>
              <li>
                <strong>Operate.</strong> Whichever accounting tool you pick, log
                income + expenses + receipts.
              </li>
              <li>
                <strong>Annual tax time.</strong> Pull the Schedule E equivalent
                from your accounting tool; pass to your CPA. Re-run TrueCap to
                compare actuals vs projection.
              </li>
            </ol>
            <p>
              Sizing up a purchase instead of recording one? The free{" "}
              <IntentPrefetchLink
                href="/tools/rental-property-spreadsheet"
                className="tc-link"
              >
                rental property spreadsheet
              </IntentPrefetchLink>{" "}
              lays the numbers out the way you already work, and the full{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              tells you whether a deal is worth bookkeeping for at all — cap rate,
              cash-on-cash, and DSCR from an address, the asking price and a
              bedroom count. Our guide on{" "}
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
          competitorName="QuickBooks for rentals"
          items={QUICKBOOKS_FAQ}
        />

        {/* Pricing CTA */}
        <CloseSection
          headingId="vs-close-heading"
          heading={<>Underwrite the next deal — free.</>}
          lede={
            <>
              TrueCap free covers cap rate, CoC, DSCR, and monthly cash flow.
              Your first complete decision also includes the Offer Ceiling.
              Pro adds 10-year cash-flow and equity projections, sensitivity, the
              Offer Ceiling, co-branded share links, and PDF reports; see live
              pricing for current terms. No card to start.
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
            <RelatedContent kind="vs" slug="quickbooks-rental" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
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
                    href="/vs/baselane"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Baselane
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/landlord-studio"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Landlord Studio
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

const QUICKBOOKS_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a QuickBooks alternative?",
    answer: (
      <>
        No — different stages and different jobs. QuickBooks is general
        accounting (your books, bills, transactions). TrueCap is pre-purchase
        underwriting (does this property cash flow?). They don&apos;t compete.
      </>
    ),
  },
  {
    question: "Should I use QuickBooks for my rentals?",
    answer: (
      <>
        It can work, especially if you already use QuickBooks for other
        businesses or your CPA asks for it. Per-property books use class and
        location tracking, which is on the Plus plan and above, and Schedule E
        is not named on QuickBooks&apos; pricing page, so plan on mapping
        categories to it yourself. Rental-specific tools are built around those
        reports: Stessa lists a Schedule E report on its paid Manage and Pro
        plans, and Landlord Studio lists Schedule E reports on Pro and Pro Plus.
        Compare them before you choose.
      </>
    ),
  },
  {
    question: "Which QuickBooks plan fits rentals?",
    answer: (
      <>
        For per-property books you need class and location tracking, which
        Intuit lists on QuickBooks Online Plus ($140 a month as of October 2026)
        and above. If you only need that for rentals, compare a rental-specific
        tool before you choose.
      </>
    ),
  },
  {
    question: "Does TrueCap connect to QuickBooks?",
    answer: (
      <>
        No — TrueCap is forward-looking (underwriting projections). It
        doesn&apos;t sync with accounting tools. If you want actuals tracking
        after closing, Stessa or Baselane connect to bank feeds and handle the
        bookkeeping side, then you re-run TrueCap with the actual numbers for
        the annual review.
      </>
    ),
  },
  {
    question: "What's the cheapest rental accounting setup?",
    answer: (
      <>
        Stessa publishes a free Essentials plan with paid Manage and Pro tiers;
        its current pricing places Schedule E on Manage and Pro. Baselane also
        publishes a free entry point with banking and rent collection. Compare
        live limits and fees with QuickBooks before choosing; QuickBooks may
        still fit landlords with non-rental businesses.
      </>
    ),
  },
];

