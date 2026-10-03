/**
 * /tools/break-even-calculator — standalone SEO landing page.
 *
 * Targets: "rental property break-even calculator", "rental property
 * break even point", "how long until rental property pays for itself".
 *
 * On the calculator page template (DESIGN.md "Components"; the reference is
 * /tools/1-percent-rule-calculator): PageHero with the widget as its aside,
 * the breadcrumb under the H1, the guide in a 68ch reading column
 * (ArticleBody, prose-ledger) with the formula printed on rules
 * (ToolFormula) and the related links on rules (RuledList), the analyzer
 * CTA where the guide ends, the FAQ as ruled rows (FaqSection; the page
 * keeps its own FAQPage node), then the embed invite and the related links
 * in the same column. The copy stays here, in the page, where the copy
 * guards read it.
 */

import type { Metadata } from "next";
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { getSiteUrl } from "@/lib/site-url";
import { BreakEvenCalculatorWidget } from "@/components/tools/break-even-calculator-widget";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";
import { ToolEmbedInvite } from "@/components/marketing/tool-embed-invite";
import { ToolFormula } from "@/components/tools/tool-parts";
import {
  ARTICLE_META,
  ARTICLE_META_LINK,
  ArticleBody,
} from "@/components/marketing/article";
import { FaqSection } from "@/components/marketing/faq-section";
import {
  PageHero,
  RuledList,
  UnderTitleAnalyzeLink,
} from "@/components/marketing/page-parts";
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
  title: "Free Break-Even Calculator — Months to Recoup Cash",
  description:
    "Free rental break-even calculator. Estimate how many months the entered cash flow would take to recover the entered initial cash.",
  keywords: [
    "rental property break-even calculator",
    "break-even calculator rental",
    "how long until rental pays for itself",
    "rental property payback period",
    "investment property break-even",
    "real estate break-even point",
  ],
  alternates: { canonical: "/tools/break-even-calculator" },
  openGraph: {
    ...OPEN_GRAPH_BASE,
    title: "Free Break-Even Calculator — Months to Recoup Cash",
    description: "How many months until your rental property has returned your initial investment from cash flow alone.",
    url: "/tools/break-even-calculator",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is the break-even point on a rental property?",
    a: "Break-even on a rental property is the number of months it takes for the property's net cash flow to return your initial cash invested (down payment + closing costs + initial repairs). It measures pure cash-on-cash recovery — it excludes appreciation and equity build from mortgage paydown.",
  },
  {
    q: "What's a good break-even period for a rental property?",
    a: "There is no universal good period. Compare the modeled duration with your own liquidity needs, cash-flow targets, financing, evidence quality, and alternative uses of capital. The result assumes the entered monthly cash flow remains constant.",
  },
  {
    q: "Does break-even include appreciation or equity?",
    a: "No. Break-even isolates cash-on-cash recovery — how fast monthly cash flow alone returns your investment. Adding appreciation + principal paydown gives you total return (use IRR or 10-year projection for that). Break-even is a useful complement, not a replacement.",
  },
  {
    q: "How is break-even different from cash-on-cash return?",
    a: "Cash-on-cash is annualized (return ÷ cash invested, as a percentage). Break-even is duration (cash invested ÷ monthly cash flow, expressed in months). They measure the same dynamic from different angles. 12% cash-on-cash ≈ 100-month (8.3-year) break-even.",
  },
  {
    q: "If my cash flow is negative, what does break-even mean?",
    a: "With zero or negative monthly cash flow, there is no cash-flow recovery period under the entered assumptions. Appreciation, principal paydown, future rent changes, taxes, and sale proceeds are outside this calculation and should be modeled separately.",
  },
];

export default function BreakEvenCalculatorPage() {
  const siteUrl = getSiteUrl();
  const ld = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Rental Property Break-Even Calculator — TrueCap",
    description: "Free rental property break-even calculator.",
    url: `${siteUrl}/tools/break-even-calculator`,
    dateModified: lastmodFor("/tools/break-even-calculator"),
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntity: { "@id": toolAppId(siteUrl, "break-even-calculator") },
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
    slug: "break-even-calculator",
    name: "Rental Property Break-Even Calculator",
    description:
      "Free rental break-even calculator estimating cash-flow recovery time from entered assumptions.",
    featureList: [
      "Months to recover initial cash investment",
      "Uses the monthly net cash flow you enter, after operating expenses and debt service",
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
      <ToolBreadcrumbSchema toolName="Break-Even Calculator" toolPath="/tools/break-even-calculator" />

      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        {/* The calculator in the first screen: the widget sits beside the H1
            from 1024px and under the lede on phones. The breadcrumb is the
            visible half of the breadcrumb schema and sits under the H1,
            never above it. The hero's action is the one short analyzer link
            under the H1 (P2-80). */}
        <PageHero
          title="Rental property break-even calculator"
          lede="Estimate how many months the entered monthly net cash flow would take to recover the entered down payment, closing costs, and initial repairs. The result assumes cash flow stays constant and excludes appreciation, principal paydown, taxes, and sale proceeds."
          actions={<UnderTitleAnalyzeLink />}
          aside={<BreakEvenCalculatorWidget />}
        >
          <nav aria-label="Breadcrumb" className={ARTICLE_META}>
            <ol className="flex flex-wrap items-center gap-x-2">
              <li><IntentPrefetchLink href="/" className={ARTICLE_META_LINK}>Home</IntentPrefetchLink></li>
              <li aria-hidden="true">›</li>
              <li><IntentPrefetchLink href="/tools" className={ARTICLE_META_LINK}>Tools</IntentPrefetchLink></li>
              <li aria-hidden="true">›</li>
              <li aria-current="page">Break-even calculator</li>
            </ol>
          </nav>
        </PageHero>

        {/* rule="none": PageHero's bottom rule already separates the head. */}
        <Section rule="none">
          <article className="max-w-[68ch]">
            <ArticleBody>
              <h2>How break-even is calculated</h2>
              <ToolFormula formula="Break-even months = Total cash invested ÷ Monthly net cash flow" />
              <p>
                Total cash invested = down payment + closing costs + initial repairs/rehab. Monthly net cash flow = rent minus all operating expenses minus mortgage P&amp;I. Divide one by the other and you get the number of months until you&apos;ve gotten your initial investment back, purely from rental income.
              </p>
              <p>
                Worked example: you put $60,000 down on a $300,000 property + $8,000 closing + $5,000 initial repairs = $73,000 invested. Monthly cash flow $450. Break-even = $73,000 ÷ $450 = 162 months = 13.5 years.
              </p>

              {/* The related links as rows on rules (they were pills);
                  not-prose, so they keep RuledList's own type. */}
              <h2>Related metrics and calculators</h2>
              <RuledList
                className="not-prose my-8"
                items={[
                  {
                    term: (
                      <IntentPrefetchLink href="/glossary/cash-on-cash-return" className="tc-link inline-flex min-h-11 items-center">
                        Cash-on-cash return
                      </IntentPrefetchLink>
                    ),
                  },
                  {
                    term: (
                      <IntentPrefetchLink href="/glossary/cap-rate" className="tc-link inline-flex min-h-11 items-center">
                        Cap rate
                      </IntentPrefetchLink>
                    ),
                  },
                  {
                    term: (
                      <IntentPrefetchLink href="/glossary/irr" className="tc-link inline-flex min-h-11 items-center">
                        IRR
                      </IntentPrefetchLink>
                    ),
                  },
                  {
                    term: (
                      <IntentPrefetchLink href="/tools/mortgage-payment-calculator" className="tc-link inline-flex min-h-11 items-center">
                        Mortgage payment calculator
                      </IntentPrefetchLink>
                    ),
                  },
                  {
                    term: (
                      <IntentPrefetchLink href="/tools/closing-cost-calculator" className="tc-link inline-flex min-h-11 items-center">
                        Closing cost calculator
                      </IntentPrefetchLink>
                    ),
                  },
                ]}
              />
            </ArticleBody>

            {/* The analyzer CTA where the guide ends, inside the article. */}
            <ToolsConversionCta calculatorName="Break-even calculator" />

            {/* The page's own FAQPage node (faqLd above) stays the one in
                the document, so FaqSection emits none. */}
            <FaqSection
              id="be-faq"
              variant="inline"
              heading="Frequently asked questions"
              items={FAQS}
              structuredData={false}
            />
          </article>

          {/* The tail shares the reading column; each block spaces itself
              from the one above (mt-12). */}
          <div className="max-w-[68ch]">
            {/* Backlink engine — quiet, collapsed, renders nothing if this
                tool has no embeddable widget. See the component header. */}
            <ToolEmbedInvite slug="break-even-calculator" />

            <RelatedContent kind="tool" slug="break-even-calculator" title="Break-Even Calculator" className="mt-12" />
          </div>
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}
