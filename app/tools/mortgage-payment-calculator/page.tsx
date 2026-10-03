/**
 * Public SEO landing page for the mortgage payment calculator. The
 * highest-volume real-estate finance keyword on our /tools list.
 * Funnels into the full TrueCap analyzer via the standard CTA.
 *
 * On the calculator page template (DESIGN.md "Components"; the reference is
 * /tools/1-percent-rule-calculator): PageHero with the widget as its aside,
 * the hub link under the H1, the guide in a 68ch reading column
 * (ArticleBody, prose-ledger) with the formula printed on rules
 * (ToolFormula), the analyzer CTA where the guide ends, then the embed
 * invite and the related links in the same column. The copy stays here, in
 * the page, where the copy guards read it.
 */

import type { Metadata } from "next";
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { getSiteUrl } from "@/lib/site-url";
import { MortgagePaymentWidget } from "@/components/tools/mortgage-payment-widget";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";
import { ToolEmbedInvite } from "@/components/marketing/tool-embed-invite";
import { ToolFormula } from "@/components/tools/tool-parts";
import {
  ARTICLE_META,
  ARTICLE_META_LINK,
  ArticleBody,
} from "@/components/marketing/article";
import { PageHero, UnderTitleAnalyzeLink } from "@/components/marketing/page-parts";
import { Section } from "@/components/marketing/section";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";
import { RelatedContent } from "@/components/marketing/related-content";
import { Header } from "@/components/investcalc/header";
import { JsonLd } from "@/components/seo/json-ld";
import { buildToolAppLd } from "@/lib/seo/tool-app-ld";
import { OPEN_GRAPH_BASE } from "@/lib/seo/open-graph-base";

export const metadata: Metadata = {
  title: "Free Mortgage Payment Calculator — Full PITI",
  description:
    "Free mortgage payment calculator with P&I, tax, homeowner insurance, and estimated PMI below 20% down. No signup.",
  keywords: [
    "mortgage payment calculator",
    "mortgage calculator",
    "piti calculator",
    "rental property mortgage calculator",
    "home loan calculator",
    "monthly mortgage payment",
    "mortgage payment with tax and insurance",
  ],
  alternates: { canonical: "/tools/mortgage-payment-calculator" },
  openGraph: {
    ...OPEN_GRAPH_BASE,
    title: "Free Mortgage Payment Calculator — Full PITI",
    description:
      "Compute principal, interest, tax, homeowner insurance, estimated PMI, and total interest paid over the loan.",
    url: "/tools/mortgage-payment-calculator",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function MortgagePaymentPage() {
  const siteUrl = getSiteUrl();

  const appLd = buildToolAppLd(siteUrl, {
    slug: "mortgage-payment-calculator",
    name: "Mortgage Payment Calculator",
    description:
      "Free mortgage payment calculator with P&I, tax, homeowner insurance, and estimated PMI below 20% down. No signup.",
    featureList: [
      "Monthly P&I from price, down payment, rate, term",
      "Include PMI + taxes + insurance",
      "Total interest over the loan",
    ],
  });

  return (
    // relative + overflow-x-clip, as on the homepage: clips any sideways bleed
    // from a descendant without making a scroll container (sticky header ok).
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <ToolBreadcrumbSchema
        toolPath="/tools/mortgage-payment-calculator"
        toolName="Mortgage payment calculator"
      />
      <JsonLd data={appLd} />

      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        {/* The calculator in the first screen: the widget sits beside the H1
            from 1024px and under the lede on phones. The hub link is the
            visible half of the breadcrumb schema and sits under the H1,
            never above it. The hero's action is the one short analyzer link
            under the H1 (P2-80). */}
        <PageHero
          title="Mortgage payment calculator"
          lede={
            <p>
              Principal, interest, tax, insurance — and the total interest
              you&apos;ll pay over the life of the loan. Below 20% down, the
              estimate also includes mortgage insurance using the same screening
              assumption as TrueCap&apos;s analyzer. Built for rental property
              investors who need to know the real monthly cost before they
              offer.
            </p>
          }
          actions={<UnderTitleAnalyzeLink />}
          aside={<MortgagePaymentWidget />}
        >
          <p className={ARTICLE_META}>
            <IntentPrefetchLink href="/tools" className={ARTICLE_META_LINK}>
              Free tools
            </IntentPrefetchLink>
          </p>
        </PageHero>

        {/* rule="none": PageHero's bottom rule already separates the head. */}
        <Section rule="none">
          <article className="max-w-[68ch]">
            <ArticleBody>
              <h2>
                Why PITI matters more than P&amp;I
              </h2>
              <p>
                Most mortgage calculators show P&amp;I — principal and interest
                only. That&apos;s the number lenders quote in ads because
                it&apos;s the lowest. But it&apos;s not what you actually pay each
                month. Add property tax and insurance and you get PITI — the real
                cash that leaves your account. PITI typically runs 15-25% higher
                than P&amp;I depending on your state&apos;s tax rate. Underwriting
                a deal on P&amp;I-only math is the fastest way to make a deal look
                more profitable than it is. (For a full breakdown of each piece,
                read{" "}
                <IntentPrefetchLink
                  href="/blog/piti-explained-rental-property"
                  className="tc-link"
                >
                  PITI explained for rental property
                </IntentPrefetchLink>
                .)
              </p>

              <h2>The amortization formula</h2>
              <ToolFormula formula={<>P&amp;I = L × r / (1 − (1 + r)^−n)</>} />
              <p>
                Where <strong>L</strong> = loan amount, <strong>r</strong> =
                monthly interest rate (annual rate ÷ 12), <strong>n</strong> =
                total months. Mortgages are fully amortizing — early payments are
                mostly interest, late payments mostly principal. On a 30-year
                mortgage at 7%, you don&apos;t cross the 50/50
                principal-to-interest line until about year 20.
              </p>

              <h2>
                Investment property vs primary residence rates
              </h2>
              <p>
                Investment-property pricing can differ from owner-occupant pricing
                based on occupancy, property type, leverage, credit, reserves,
                points, term, lender, and market conditions. The FRED series shown
                by TrueCap is a national owner-occupied benchmark, not an
                investment-property quote. Enter a current written quote for the
                scenario you are evaluating.
              </p>

              <h2>Down payment scenarios</h2>
              <p>
                Minimum equity and pricing adjustments vary by loan program,
                occupancy, unit count, borrower, and property. Model the actual
                down payment from a current lender proposal; a cash scenario can
                be modeled separately by removing debt service.
              </p>

              <h2>
                Don&apos;t forget escrow + PMI
              </h2>
              <p>
                Mortgage-insurance and escrow requirements depend on the loan
                program and documents. Do not infer a premium or cancellation date
                from an equity percentage alone. Review the written loan estimate
                and program terms, then enter the actual premium, taxes,
                insurance, and escrowed items in the model.
              </p>

              <h2>The full picture</h2>
              <p>
                A mortgage payment is just one input in a real underwrite. You
                also need to know your DSCR (does the property cover the payment?
                —{" "}
                <IntentPrefetchLink
                  href="/blog/how-to-calculate-dscr"
                  className="tc-link"
                >
                  how to calculate DSCR
                </IntentPrefetchLink>{" "}
                explains TrueCap&apos;s preliminary ratio; lenders may use a
                different NOI and debt-service convention), cash-on-cash return
                (what does your money actually earn?), the upfront cash to close
                (estimate it with the{" "}
                <IntentPrefetchLink
                  href="/tools/closing-cost-calculator"
                  className="tc-link"
                >
                  closing cost calculator
                </IntentPrefetchLink>
                ), and, when your access includes it, a 10-year cash-flow and
                equity projection (how might the stabilized hold evolve?).
                TrueCap&apos;s free core analyzer combines the preliminary
                first-year rental metrics; evaluation and paid access gates apply
                to projection features.
              </p>
            </ArticleBody>

            {/* The analyzer CTA where the guide ends, inside the article. */}
            <ToolsConversionCta
              calculatorName="Mortgage payment calculator"
              hook="The free core analyzer plugs your mortgage assumptions into editable DSCR and cash-flow modeling. Projections, sensitivity, and Offer Ceiling appear only when your evaluation or plan access includes them."
            />
          </article>

          {/* The tail shares the reading column; each block spaces itself
              from the one above (mt-12). */}
          <div className="max-w-[68ch]">
            {/* Backlink engine — quiet, collapsed, renders nothing if this
                tool has no embeddable widget. See the component header. */}
            <ToolEmbedInvite slug="mortgage-payment-calculator" />

            <RelatedContent kind="tool" slug="mortgage-payment-calculator" title="Mortgage Payment Calculator" className="mt-12" />
          </div>
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}
