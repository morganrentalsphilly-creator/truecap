/**
 * /tools/closing-cost-calculator — standalone SEO landing page.
 *
 * Targets: "closing cost calculator", "rental property closing costs",
 * "investment property closing costs", "how much closing costs rental".
 *
 * Layout: the calculator page template (DESIGN.md "Components"; the 1% rule
 * calculator is the reference). The widget sits beside the H1 in PageHero,
 * with the breadcrumb as the meta line under the H1 (nothing sits above an
 * H1), the guide runs in a 68ch reading column (ArticleBody), the FAQ is
 * ruled rows (FaqSection; the page keeps its own FAQPage node), and the
 * related links, the embed invite and RelatedContent follow in that column.
 * The page has no closing ask of its own, so it has no CloseSection.
 */

import type { Metadata } from "next";
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { getSiteUrl } from "@/lib/site-url";
import { ClosingCostCalculatorWidget } from "@/components/tools/closing-cost-calculator-widget";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";
import { ToolEmbedInvite } from "@/components/marketing/tool-embed-invite";
import {
  ARTICLE_META,
  ARTICLE_META_LINK,
  ArticleBody,
} from "@/components/marketing/article";
import { FaqSection } from "@/components/marketing/faq-section";
import { PageHero, UnderTitleAnalyzeLink } from "@/components/marketing/page-parts";
import { Section } from "@/components/marketing/section";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";
import { RelatedContent } from "@/components/marketing/related-content";
import { Header } from "@/components/investcalc/header";
import { lastmodFor } from "@/lib/seo/lastmod";
import { JsonLd } from "@/components/seo/json-ld";
import { buildToolAppLd, toolAppId } from "@/lib/seo/tool-app-ld";
import { OPEN_GRAPH_BASE } from "@/lib/seo/open-graph-base";

export const metadata: Metadata = {
  title: "Free Closing Cost Calculator — Line-Item Estimate",
  description:
    "Free closing cost calculator for rental purchases. Enter origination, title, transfer tax, escrow, prepaids, and due-diligence estimates.",
  keywords: [
    "closing cost calculator",
    "rental property closing costs",
    "investment property closing costs",
    "how much closing costs",
    "real estate closing costs",
    "investment property closing fees",
  ],
  alternates: { canonical: "/tools/closing-cost-calculator" },
  openGraph: {
    ...OPEN_GRAPH_BASE,
    title: "Free Closing Cost Calculator — Line-Item Estimate",
    description: "Estimate closing costs on a rental property purchase from the line items you enter, with each one broken out.",
    url: "/tools/closing-cost-calculator",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What are typical closing costs on a rental property?",
    a: "There is no universal percentage. The amount depends on the loan, points, jurisdiction, title and settlement charges, prepaid items, escrows, inspections, and negotiated credits. Use written lender and settlement estimates for the property before relying on the total.",
  },
  {
    q: "What's included in closing costs?",
    a: "Common categories include lender charges and points, title and settlement services, recording and transfer charges, prepaid interest and insurance, tax or insurance escrows, appraisal, inspection, and other property-specific due diligence. Not every transaction includes every item.",
  },
  {
    q: "Are closing costs higher for investment properties vs primary?",
    a: "They can differ because occupancy, loan program, leverage, points, reserves, insurance, and jurisdiction affect the quote. Compare written estimates using the same property, borrower, loan amount, rate-lock assumptions, and closing date.",
  },
  {
    q: "Can closing costs be negotiated?",
    a: "Some lender and service-provider charges may be negotiable or shoppable; statutory taxes and recording charges generally are not. Review the written Loan Estimate or equivalent itemization and ask which services you may choose before comparing offers.",
  },
  {
    q: "Can closing costs be rolled into the loan?",
    a: "It depends on the transaction and loan program. A lender may allow some costs to be covered through credits or added to a refinance balance, subject to underwriting and leverage limits. Financing costs increases the loan balance and total borrowing cost, so verify the exact treatment in the written quote.",
  },
];

export default function ClosingCostCalculatorPage() {
  const siteUrl = getSiteUrl();
  const ld = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Closing Cost Calculator — TrueCap",
    description: "Free rental property closing cost calculator.",
    url: `${siteUrl}/tools/closing-cost-calculator`,
    dateModified: lastmodFor("/tools/closing-cost-calculator"),
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntity: { "@id": toolAppId(siteUrl, "closing-cost-calculator") },
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const appLd = buildToolAppLd(siteUrl, {
    slug: "closing-cost-calculator",
    name: "Closing Cost Calculator",
    description:
      "Free closing cost calculator for rental purchases with editable lender, title, tax, escrow, prepaid, and due-diligence inputs.",
    featureList: [
      "Line-item breakdown: origination, title, escrow",
      "Transfer tax + prepaid items included",
      "Total closing cost estimate as % of price",
    ],
  });

  return (
    // relative + overflow-x-clip, as on the homepage: clips any sideways bleed
    // from a descendant without making a scroll container (sticky header ok).
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={ld} />
      <JsonLd data={faqLd} />
      <JsonLd data={appLd} />
      <ToolBreadcrumbSchema toolName="Closing Cost Calculator" toolPath="/tools/closing-cost-calculator" />

      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        {/* The calculator in the first screen: from 1024px the widget sits
            beside the H1. The breadcrumb keeps its words and both links and
            sits under the H1 as the meta line, never above it. The hero's
            action is the one short analyzer link under the H1 (P2-80). */}
        <PageHero
          title="Rental property closing cost calculator"
          lede="Enter the major line items from lender, title, settlement, insurance, tax, and inspection estimates. The result is only as complete as the inputs and should be replaced with written transaction-specific figures before closing."
          actions={<UnderTitleAnalyzeLink />}
          aside={<ClosingCostCalculatorWidget />}
        >
          <nav aria-label="Breadcrumb" className={ARTICLE_META}>
            <ol className="flex flex-wrap items-center gap-2">
              <li><IntentPrefetchLink href="/" className={ARTICLE_META_LINK}>Home</IntentPrefetchLink></li>
              <li aria-hidden="true">›</li>
              <li><IntentPrefetchLink href="/tools" className={ARTICLE_META_LINK}>Tools</IntentPrefetchLink></li>
              <li aria-hidden="true">›</li>
              <li className="font-semibold text-foreground">Closing cost calculator</li>
            </ol>
          </nav>
        </PageHero>

        {/* rule="none": PageHero's bottom rule already separates the head. */}
        <Section rule="none">
          <div className="max-w-[68ch]">
            <article>
              <ArticleBody>
                <h2>What closing costs include</h2>
                <p>
                  Closing costs fall into five buckets:
                </p>
                <ul>
                  <li><strong>Lender charges:</strong> origination, discount points, processing, underwriting, and other charges shown on the written estimate.</li>
                  <li><strong>Title + escrow fees:</strong> owner&apos;s title insurance, escrow / settlement fee, title search.</li>
                  <li><strong>Government charges:</strong> recording fees, transfer tax, and mortgage tax where applicable.</li>
                  <li><strong>Prepaid items:</strong> insurance, tax or insurance escrows, and mortgage interest from closing to the first payment period.</li>
                  <li><strong>Due diligence:</strong> appraisal, inspection, optional radon/sewer/pest inspections.</li>
                </ul>
                <p>
                  Include transaction costs in <IntentPrefetchLink href="/glossary/closing-costs" className="tc-link">total cash invested</IntentPrefetchLink> when computing <IntentPrefetchLink href="/glossary/cash-on-cash-return" className="tc-link">cash-on-cash return</IntentPrefetchLink>. Omitting them understates modeled cash invested and overstates the resulting return percentage.
                </p>
              </ArticleBody>

              {/* The analyzer CTA where the guide ends, inside the article. */}
              <ToolsConversionCta calculatorName="Closing cost calculator" />

              {/* The page's FAQPage node is faqLd above, built from the same
                  FAQS, so the section emits none of its own. */}
              <FaqSection
                id="cc-faq"
                variant="inline"
                heading="Frequently asked questions"
                items={FAQS}
                structuredData={false}
              />
            </article>

            {/* The page's own related links, set like RelatedContent below
                them: a rule, the heading at the H3 step, underlined links in
                44px rows. */}
            <section aria-labelledby="cc-related-heading" className="mt-12 border-t border-border pt-6">
              <h2 id="cc-related-heading" className="font-display text-balance text-h3-sm sm:text-2xl">Related calculators and terms</h2>
              <ul className="mt-3 grid gap-x-8 sm:grid-cols-2">
                <li className="min-w-0"><IntentPrefetchLink href="/tools/mortgage-payment-calculator" className="tc-link inline-flex min-h-11 items-center py-1 text-base">Mortgage payment calculator</IntentPrefetchLink></li>
                <li className="min-w-0"><IntentPrefetchLink href="/tools/break-even-calculator" className="tc-link inline-flex min-h-11 items-center py-1 text-base">Break-even calculator</IntentPrefetchLink></li>
                <li className="min-w-0"><IntentPrefetchLink href="/glossary/cash-on-cash-return" className="tc-link inline-flex min-h-11 items-center py-1 text-base">Cash-on-cash return</IntentPrefetchLink></li>
                <li className="min-w-0"><IntentPrefetchLink href="/glossary/down-payment" className="tc-link inline-flex min-h-11 items-center py-1 text-base">Down payment</IntentPrefetchLink></li>
              </ul>
            </section>

            {/* Backlink engine — quiet, collapsed, renders nothing if this
                tool has no embeddable widget. See the component header. */}
            <ToolEmbedInvite slug="closing-cost-calculator" />

            <RelatedContent kind="tool" slug="closing-cost-calculator" title="Closing Cost Calculator" className="mt-12" />
          </div>
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}
