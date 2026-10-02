/**
 * /vs/baselane — competitor comparison landing page.
 *
 * Target queries: "baselane alternative", "baselane vs stessa", "baselane review", "baselane pricing", "rental property banking".
 * Baselane is rental banking + bookkeeping + rent collection — all-in-one financial stack for landlords. Direct competitor to Stessa on the accounting side, Avail/TurboTenant on rent collection. Strong free tier on banking.
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
  title: "Baselane vs TrueCap (2026): Banking vs Analysis",
  description:
    "Baselane is rental banking + bookkeeping for properties you own. TrueCap underwrites the ones you're considering. Honest comparison + how the two fit.",
  keywords: [
    "baselane alternative",
    "baselane vs stessa",
    "baselane review",
    "baselane pricing",
    "rental property banking",
  ],
  alternates: { canonical: "/vs/baselane" },
  openGraph: {
    title: "Baselane vs TrueCap (2026): Banking vs Analysis",
    description:
      "Baselane is rental banking + bookkeeping after closing. TrueCap underwrites the deal before. Different stages.",
    url: "/vs/baselane",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap vs Baselane",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "baselane" | "tie";
type Row = {
  feature: string;
  truecap: string;
  baselane: string;
  winner: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Lifecycle stage",
    truecap: "Pre-purchase — underwrite the deal",
    baselane: "Post-purchase — banking + bookkeeping + ops",
    winner: "tie",
  },
  {
    feature: "Cap rate / CoC / DSCR analysis",
    truecap: "Yes — full engine, free tier",
    baselane: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "10-year projection",
    truecap: "Pro — rent + expense + appreciation",
    baselane: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "Deal score (0–100)",
    truecap: "Free — 0–100 score with factor breakdown",
    baselane: "Not applicable",
    winner: "truecap",
  },
  {
    feature: "Sensitivity grid",
    truecap: "Pro — rent ±10%, vacancy ±5pp, rate ±1pp",
    baselane: "Not modeled",
    winner: "truecap",
  },
  {
    feature: "Rental business banking",
    truecap: "No",
    baselane: "Yes — FDIC-insured business checking",
    winner: "baselane",
  },
  {
    feature: "Auto-categorized expenses",
    truecap: "No",
    baselane: "Yes, auto-tagging is on the paid Smart plan",
    winner: "baselane",
  },
  {
    feature: "Schedule E P&L reports",
    truecap: "Forward projection only",
    baselane: "Yes — actuals from bank feed",
    winner: "baselane",
  },
  {
    feature: "Rent collection (ACH)",
    truecap: "No",
    baselane: "Yes — ACH free",
    winner: "baselane",
  },
  {
    feature: "Starting values (rent/rate/tax)",
    truecap: "HUD rent + FRED rate + manual local property tax",
    baselane: "Not applicable",
    winner: "truecap",
  },
  {
    feature: "Pricing (entry tier)",
    truecap: "Free core; paid Pro — see live pricing",
    baselane: "Banking + bookkeeping free; advanced ~$22/mo (as of 2026)",
    winner: "tie",
  },
  {
    feature: "Free tier",
    truecap: "Yes — core cap rate, CoC, DSCR, and cash flow",
    baselane: "Yes — banking + basic bookkeeping",
    winner: "tie",
  },
  {
    feature: "Shareable read-only deal link",
    truecap: "Free — read-only public link; Pro adds co-branding",
    baselane: "Not the use case",
    winner: "truecap",
  },
  {
    feature: "PDF deal report",
    truecap: "Included with Pro",
    baselane: "Schedule E reports for tax filing",
    winner: "tie",
  },
];

export default function VsBaselanePage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Baselane vs TrueCap (2026): Banking vs Analysis",
    url: `${siteUrl}/vs/baselane`,
    description:
      "Baselane is rental banking + bookkeeping for properties you own. TrueCap underwrites the ones you're considering. Honest comparison + how the two fit.",
    dateModified: lastmodFor("/vs/baselane"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema
        vsPath="/vs/baselane"
        pageName="TrueCap vs Baselane"
      />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs Baselane:{" "}
            underwrite before, bank + book after
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            Baselane is a rental-property banking + bookkeeping + rent
            collection platform — FDIC-insured business banking,
            auto-categorized expenses, Schedule E reports, ACH rent collection.
            TrueCap is a pre-purchase underwriting calculator that helps screen
            an acquisition. We don&apos;t compete; we cover different halves of
            the rental lifecycle.
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
                <li>
                  You want a 10-year planning projection for cash flow and
                  equity.
                </li>
                <li>
                  You want standardized economics and Buy Box fit to
                  compare 2-3 deals side-by-side.
                </li>
                <li>
                  You want source-labeled assumptions for a partner review, with
                  inputs independently verified.
                </li>
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Use Baselane when
              </h3>
              <ul className={VS_TLDR_LIST}>
                <li>You own rentals and want one bank account per property.</li>
                <li>
                  You want auto-categorized expense tracking + Schedule E
                  reports.
                </li>
                <li>
                  You want online rent collection (ACH free, no separate
                  platform).
                </li>
                <li>
                  You&apos;re consolidating QuickBooks + Stessa + a checking
                  account into one tool.
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
              head={["Feature", "TrueCap", "Baselane"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.baselane,
                winner: row.winner === "baselane" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            Baselane details based on publicly available product info as of
            2026. See{" "}
            <a
              href="https://baselane.com"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              baselane.com
            </a>{" "}
            for their current state.
          </p>
        </Section>

        {/* Complementary workflow */}
        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            How TrueCap + Baselane fit together
          </SectionHeading>
          <div className={VS_PROSE}>
            <ol>
              <li>
                <strong>Source the deal.</strong> Zillow, MLS, off-market.
              </li>
              <li>
                <strong>Underwrite in TrueCap.</strong> Start with editable HUD
                rent and FRED rate benchmarks, then enter a local property-tax
                bill or reviewed rate. Check cap rate, DSCR, and cash flow. Save
                the deal.
              </li>
              <li>
                <strong>Close the property.</strong> Open a Baselane account for
                the new property — banking + a dedicated checking account.
              </li>
              <li>
                <strong>Operate in Baselane.</strong> Collect rent via ACH; the
                bank feed auto-categorizes mortgage, taxes, insurance, repairs.
                Schedule E builds itself.
              </li>
              <li>
                <strong>Annual tax time.</strong> Pull the Schedule E report from
                Baselane; pass to your CPA. Re-run the original TrueCap analysis
                with actual numbers to see how it&apos;s tracking vs projection.
              </li>
            </ol>
            <p>
              Curious about the underwriting half on its own? Start with the free{" "}
              <IntentPrefetchLink
                href="/tools/mortgage-payment-calculator"
                className="tc-link"
              >
                mortgage payment calculator
              </IntentPrefetchLink>{" "}
              to size the PITI that Baselane&apos;s bank feed will later
              categorize, then run the full{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              for the cap rate, DSCR, and cash flow that sit on top of it. Our
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

        <ComparisonFaq competitorName="Baselane" items={BASELANE_FAQ} />

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
            <RelatedContent kind="vs" slug="baselane" />
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
                    href="/vs/avail"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs Avail
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/rentredi"
                    className={VS_LINK_ROW}
                  >
                    TrueCap vs RentRedi
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

const BASELANE_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Baselane alternative?",
    answer: (
      <>
        No — different stages. Baselane is post-purchase banking + bookkeeping
        for properties you own. TrueCap is pre-purchase underwriting for
        properties you&apos;re considering buying. The two cover different
        stages and can be used together.
      </>
    ),
  },
  {
    question: "Is Baselane FDIC-insured?",
    answer: (
      <>
        Yes. Baselane partners with FDIC-insured banks (Thread Bank and Blue
        Ridge Bank as of 2026) for deposit insurance up to standard FDIC limits
        ($250k per depositor per bank). They&apos;re not a chartered bank
        themselves — they&apos;re a fintech with bank partners.
      </>
    ),
  },
  {
    question: "Should I use Baselane or Stessa?",
    answer: (
      <>
        Baselane bundles banking + bookkeeping + rent collection. Stessa is more
        focused on bookkeeping + financial reporting (you connect your existing
        bank). If you want a dedicated business checking account per property
        AND simplified bookkeeping, Baselane is the more integrated choice. If
        you already have business banking set up and just want bookkeeping,
        Stessa works. Both have free tiers — try both.
      </>
    ),
  },
  {
    question: "Does TrueCap track actual expenses like Baselane?",
    answer: (
      <>
        No. TrueCap models projected expenses for underwriting (taxes,
        insurance, vacancy, mgmt %, maintenance, capex). It doesn&apos;t connect
        to your bank to track actuals. That&apos;s Baselane (or Stessa)
        territory. Building accounting into TrueCap would dilute the
        underwriting focus.
      </>
    ),
  },
  {
    question: "Can I share a TrueCap analysis with my CPA via Baselane?",
    answer: (
      <>
        Not directly — they&apos;re separate tools. TrueCap generates a free
        read-only share link and includes PDFs with Pro. You can provide the
        review snapshot alongside Baselane&apos;s historical reports, subject to
        your CPA&apos;s requested documentation.
      </>
    ),
  },
];

