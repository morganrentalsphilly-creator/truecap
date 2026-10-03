/**
 * /tools/vacancy-rate-calculator — standalone SEO landing page.
 *
 * Targets: "vacancy rate calculator", "rental vacancy rate",
 * "how to calculate vacancy rate", "what is a good vacancy rate".
 *
 * On the calculator page template (DESIGN.md "Components"; the reference is
 * /tools/1-percent-rule-calculator): PageHero with the widget as its aside,
 * the breadcrumb under the H1, the guide in a 68ch reading column
 * (ArticleBody, prose-ledger) with the next-step links on rules (RuledList),
 * the analyzer CTA where the guide ends, the FAQ as ruled rows (FaqSection;
 * the page keeps its own FAQPage node), then the embed invite and the
 * related links in the same column. The copy stays here, in the page, where
 * the copy guards read it.
 */

import type { Metadata } from "next";
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { getSiteUrl } from "@/lib/site-url";
import { VacancyRateCalculatorWidget } from "@/components/tools/vacancy-rate-calculator-widget";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";
import { ToolEmbedInvite } from "@/components/marketing/tool-embed-invite";
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
import { CURRENT_DEFAULT_FACTS } from "@/lib/product-facts";

export const metadata: Metadata = {
  title: "Free Vacancy Rate Calculator — Effective Rate",
  description:
    "Free vacancy rate calculator. Convert vacant days and turnover cost into an effective vacancy rate, graded against fixed rule-of-thumb bands.",
  keywords: [
    "vacancy rate calculator",
    "rental vacancy rate",
    "how to calculate vacancy rate",
    "what is a good vacancy rate",
    "rental property vacancy",
    "vacancy loss calculator",
  ],
  alternates: { canonical: "/tools/vacancy-rate-calculator" },
  openGraph: {
    ...OPEN_GRAPH_BASE,
    title: "Free Vacancy Rate Calculator — Effective Rate",
    description:
      "Compute the effective vacancy rate on a rental property, including turnover cost, for the vacancy line in your cash flow model.",
    url: "/tools/vacancy-rate-calculator",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

/**
 * The one national figure this page quotes, typed once (docs/voice.md rule 5).
 * Source: U.S. Census Bureau, Quarterly Residential Vacancies and
 * Homeownership (Housing Vacancy Survey), release CB26-116, the national
 * rental vacancy rate. The survey publishes quarterly; to quote a newer
 * release, read the rate from the release and change rate and period
 * together, here and nowhere else. The FAQ answer and the lede both read
 * this constant (lib/__tests__/reference-content-truth-guards pins that).
 */
const HVS_RENTAL_VACANCY = {
  rate: "7.3%",
  period: "the second quarter of 2026",
  href: "https://www.census.gov/housing/hvs/index.html",
} as const;

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is a good vacancy rate for rental property?",
    a: `The Census Bureau's Housing Vacancy Survey put the national rental vacancy rate at ${HVS_RENTAL_VACANCY.rate} in ${HVS_RENTAL_VACANCY.period}. That is one national figure, not a target for a single property. This calculator grades its result against fixed rule-of-thumb bands, not market data: under 5% reads "Aggressive (low)", 5% to under 8% "Realistic", 8% to under 12% "Conservative", and 12% or more "Distressed". TrueCap's analyzer starts at ${CURRENT_DEFAULT_FACTS.vacancy} vacancy as an editable default; replace it with recent vacancy on comparable units in your submarket.`,
  },
  {
    q: "How do you calculate vacancy rate?",
    a: "Vacancy rate = (annual vacancy loss ÷ annual gross potential rent) × 100. Annual vacancy loss = (vacant days × daily rent) + turnover costs (cleaning, repairs, listing fees). The calculator above does this math automatically.",
  },
  {
    q: "What's included in vacancy loss?",
    a: "Two components: (1) lost rent during the actual vacant days between tenants, and (2) turnover cost: cleaning, paint touch-up, minor repairs, listing fees, and any lease-up fee a property manager charges. Leaving turnover cost out understates the effective rate.",
  },
  {
    q: "How much does the vacancy assumption change the numbers?",
    a: "On a rental with $20,000 of annual gross rent, moving the vacancy assumption from 8% to 5% adds $600 a year of modeled income. If nothing else changes, that is $600 of NOI, and at a 7% cap rate about $8,600 of value. Re-run any pro forma with your own vacancy assumption.",
  },
  {
    q: "Does vacancy rate vary by market?",
    a: "Yes. Vacancy varies by property, lease terms, submarket, season and management, so a national figure is not a local one. Ask a local property manager for 12-month historical vacancy on comparable units in your submarket, and use that.",
  },
];

export default function VacancyRateCalculatorPage() {
  const siteUrl = getSiteUrl();
  const ld = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Vacancy Rate Calculator — TrueCap",
    description: "Free rental property vacancy rate calculator.",
    url: `${siteUrl}/tools/vacancy-rate-calculator`,
    dateModified: lastmodFor("/tools/vacancy-rate-calculator"),
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntity: { "@id": toolAppId(siteUrl, "vacancy-rate-calculator") },
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
    slug: "vacancy-rate-calculator",
    name: "Vacancy Rate Calculator",
    description:
      "Free vacancy rate calculator for rental properties. Convert vacant days + turnover cost into an effective vacancy rate, graded against fixed rule-of-thumb bands.",
    featureList: [
      "Convert vacant days into effective vacancy rate",
      "Include turnover costs in the calculation",
      "Result graded against fixed rule-of-thumb vacancy bands",
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
      <ToolBreadcrumbSchema
        toolName="Vacancy Rate Calculator"
        toolPath="/tools/vacancy-rate-calculator"
      />

      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        {/* The calculator in the first screen: the widget sits beside the H1
            from 1024px and under the lede on phones. The breadcrumb is the
            visible half of the breadcrumb schema and sits under the H1,
            never above it. The hero's action is the one short analyzer link
            under the H1 (P2-80). */}
        <PageHero
          title="Rental property vacancy rate calculator"
          lede={
            <p>
              The Census Bureau&apos;s{" "}
              <a
                href={HVS_RENTAL_VACANCY.href}
                target="_blank"
                rel="noopener noreferrer"
                className="tc-link"
              >
                Housing Vacancy Survey
              </a>{" "}
              put the national rental vacancy rate at {HVS_RENTAL_VACANCY.rate} in{" "}
              {HVS_RENTAL_VACANCY.period}. A pro forma that assumes 5% sits below
              that. This calculator converts vacant days + turnover cost into an
              effective vacancy rate to use in your underwrite.
            </p>
          }
          actions={<UnderTitleAnalyzeLink />}
          aside={<VacancyRateCalculatorWidget />}
        >
          <nav aria-label="Breadcrumb" className={ARTICLE_META}>
            <ol className="flex flex-wrap items-center gap-x-2">
              <li>
                <IntentPrefetchLink href="/" className={ARTICLE_META_LINK}>
                  Home
                </IntentPrefetchLink>
              </li>
              <li aria-hidden="true">›</li>
              <li>
                <IntentPrefetchLink href="/tools" className={ARTICLE_META_LINK}>
                  Tools
                </IntentPrefetchLink>
              </li>
              <li aria-hidden="true">›</li>
              <li aria-current="page">Vacancy rate calculator</li>
            </ol>
          </nav>
        </PageHero>

        {/* rule="none": PageHero's bottom rule already separates the head. */}
        <Section rule="none">
          <article className="max-w-[68ch]">
            <ArticleBody>
              <h2>How to model vacancy</h2>
              <p>
                Three checks before you settle on a vacancy assumption:
              </p>
              <ul>
                <li>
                  <strong>Include turnover cost.</strong> At $1,500 a month, a
                  14-day vacancy with $400 of cleaning and paint costs as much as
                  about 22 vacant days. Counting only the vacant days leaves that
                  out.
                </li>
                <li>
                  <strong>Match the property.</strong> Vacancy varies by property,
                  lease terms, submarket, season and management. A national or
                  metro figure is a starting point, not the number for one
                  building.
                </li>
                <li>
                  <strong>Verify with a local PM.</strong> Ask a property manager
                  for 12-month historical vacancy on comparable units in your
                  submarket, and use it in place of the figure in a seller&apos;s
                  pro forma.
                </li>
              </ul>
              <p>
                Vacancy is part of your{" "}
                <IntentPrefetchLink
                  href="/glossary/operating-expense-ratio"
                  className="tc-link"
                >
                  effective gross income calculation
                </IntentPrefetchLink>
                , which feeds into{" "}
                <IntentPrefetchLink
                  href="/glossary/noi"
                  className="tc-link"
                >
                  NOI
                </IntentPrefetchLink>{" "}
                and{" "}
                <IntentPrefetchLink
                  href="/glossary/cap-rate"
                  className="tc-link"
                >
                  cap rate
                </IntentPrefetchLink>
                . On a property whose annual rent is 12% of its price,
                understating vacancy by 3 points overstates the cap rate by about
                a third of a point.
              </p>

              {/* The next-step links as rows on rules (they were pills);
                  not-prose, so they keep RuledList's own type. */}
              <h2>Where your vacancy number goes next</h2>
              <RuledList
                className="not-prose my-8"
                items={[
                  {
                    term: (
                      <IntentPrefetchLink
                        href="/tools/break-even-calculator"
                        className="tc-link"
                      >
                        Break-even calculator
                      </IntentPrefetchLink>
                    ),
                  },
                  {
                    term: (
                      <IntentPrefetchLink
                        href="/blog/how-to-calculate-noi-rental-property"
                        className="tc-link"
                      >
                        How to calculate NOI
                      </IntentPrefetchLink>
                    ),
                  },
                  {
                    term: (
                      <IntentPrefetchLink
                        href="/blog/how-to-calculate-cap-rate"
                        className="tc-link"
                      >
                        How to calculate cap rate
                      </IntentPrefetchLink>
                    ),
                  },
                  {
                    term: (
                      <IntentPrefetchLink
                        href="/blog/how-to-calculate-cash-on-cash-return"
                        className="tc-link"
                      >
                        How to calculate cash-on-cash
                      </IntentPrefetchLink>
                    ),
                  },
                ]}
              />
            </ArticleBody>

            {/* The analyzer CTA where the guide ends, inside the article. */}
            <ToolsConversionCta calculatorName="Vacancy rate calculator" />

            {/* The page's own FAQPage node (faqLd above) stays the one in
                the document, so FaqSection emits none. */}
            <FaqSection
              id="vr-faq"
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
            <ToolEmbedInvite slug="vacancy-rate-calculator" />

            <RelatedContent kind="tool" slug="vacancy-rate-calculator" title="Vacancy Rate Calculator" className="mt-12" />
          </div>
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}
