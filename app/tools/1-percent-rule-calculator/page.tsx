/**
 * /tools/1-percent-rule-calculator — the calculator page template (DESIGN.md
 * "Components", 2026-09 design pass). The calculator sits in the first
 * screen: PageHero's 5/7 grid, the H1 and the lede on the left, the widget in
 * the wider column from 1024px (under the lede on phones). Then the guide in
 * a 68ch reading column (ArticleBody, prose-ledger) with the rule printed on
 * rules (ToolFormula) and the FAQ as ruled rows under its one FAQPage node
 * (FaqSection emits it), the close on the heavy rule (CloseSection), and the
 * embed invite, the analyzer CTA and the related links in the same column.
 * Copy stays here, in the page, where the copy guards read it.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { getSiteUrl } from "@/lib/site-url";
import { OnePercentRuleWidget } from "@/components/tools/one-percent-rule-widget";
import { ToolFormula } from "@/components/tools/tool-parts";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";
import { ToolEmbedInvite } from "@/components/marketing/tool-embed-invite";
import {
  ARTICLE_META,
  ARTICLE_META_LINK,
  ArticleBody,
} from "@/components/marketing/article";
import { FaqSection } from "@/components/marketing/faq-section";
import { ActionRow, CloseSection, PageHero } from "@/components/marketing/page-parts";
import { Section } from "@/components/marketing/section";
import { buttonVariants } from "@/components/ui/button";

import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";
import { RelatedContent } from "@/components/marketing/related-content";
import { Header } from "@/components/investcalc/header";
import { JsonLd } from "@/components/seo/json-ld";
import { buildToolAppLd } from "@/lib/seo/tool-app-ld";
export const metadata: Metadata = {
  title: "Free 1% Rule Calculator — Instant Pass/Fail Screen",
  description:
    "Free 1% rule calculator. Instantly screen any rental deal Pass / Fail. Plus when the rule applies, when it doesn't, and what to do on a fail.",
  keywords: [
    "1 percent rule calculator",
    "one percent rule real estate",
    "rental property 1 percent rule",
    "1% rule calculator",
    "real estate screening rule",
  ],
  alternates: { canonical: "/tools/1-percent-rule-calculator" },
  openGraph: {
    title: "Free 1% Rule Calculator — Instant Pass/Fail Screen",
    description:
      "Pass / fail the 1% rule in 5 seconds. Plus plain-English guidance on when the rule applies and when it doesn't.",
    url: "/tools/1-percent-rule-calculator",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap 1% rule calculator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/home.jpg"],
  },
};

const FAQS = [
  {
    q: "What is the 1% rule in real estate?",
    a: "The 1% rule says monthly rent should equal at least 1% of the purchase price. A $200,000 property should rent for at least $2,000/month. It's a 5-second screening filter, not a complete analysis.",
  },
  {
    q: "Is the 1% rule still relevant in 2026?",
    a: "Yes, but with context. In high-appreciation coastal markets, almost no property passes the 1% rule — and many of those are still great investments because appreciation makes up the difference. In cash-flow markets (Midwest, Sun Belt), the 1% rule is still a useful quick filter for healthy rentals.",
  },
  {
    q: "What's the difference between the 1% rule and cap rate?",
    a: "The 1% rule is gross rent over price. Cap rate is NOI (rent minus operating expenses) over price. The 1% rule is a faster screening tool; cap rate is the more accurate metric for actual underwriting. A property can pass the 1% rule but have a poor cap rate if expenses are unusually high.",
  },
  {
    q: "What about the 2% rule?",
    a: "Some investors target a 2% rule for high-cash-flow markets. Realistically, very few US properties hit 2% in 2026 — most that do are in distressed neighborhoods where management headaches eat the cash flow. Pass any 2% deal through a deeper underwrite before celebrating.",
  },
  {
    q: "If a property fails the 1% rule, should I skip it?",
    a: "Not automatically. Failing the 1% rule means: (a) it's an appreciation market where investors accept lower cash flow, or (b) the price is too high relative to rent. Decide which one applies. Buy-and-hold cash flow investors usually skip failing properties; appreciation-focused investors don't even look at the 1% rule.",
  },
  {
    q: "Does the 1% rule work for multi-family?",
    a: "Yes, just use total monthly rent across all units. A duplex priced at $250,000 with $1,400 + $1,200 rent ($2,600 total) hits 1.04% — it passes. The rule is unit-count-agnostic.",
  },
];

export default function OnePercentRulePage() {
  const siteUrl = getSiteUrl();

  const appLd = buildToolAppLd(siteUrl, {
    slug: "1-percent-rule-calculator",
    name: "1% Rule Calculator",
    description:
      "Free 1% rule calculator. Instantly screen any rental deal Pass / Fail. Plus when the rule applies, when it doesn't, and what to do on a fail.",
    featureList: [
      "Validate the 1% rule on any address",
      "Compare monthly rent to purchase price",
      "Instant Pass / Fail screening",
    ],
  });

  return (
    // relative + overflow-x-clip, as on the homepage: clips any sideways bleed
    // from a descendant without making a scroll container (sticky header ok).
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <ToolBreadcrumbSchema
        toolPath="/tools/1-percent-rule-calculator"
        toolName="1% rule calculator"
      />
      <JsonLd data={appLd} />

      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        {/* The calculator in the first screen: at 1095px the widget sits
            beside the H1 with its result and handoff above the fold. The
            hub link is the visible half of the breadcrumb schema; like the
            blog's hub link it sits under the H1, never above it. */}
        <PageHero
          title="1% Rule Calculator"
          lede="The 5-second filter for whether a rental property is worth a deeper underwrite. Pass means run the full analysis; fail means either an appreciation market or an overpriced deal."
          aside={<OnePercentRuleWidget />}
        >
          <p className={ARTICLE_META}>
            <Link href="/tools" className={ARTICLE_META_LINK}>
              Free tools
            </Link>
          </p>
        </PageHero>

        {/* rule="none": PageHero's bottom rule already separates the head. */}
        <Section rule="none">
          <article className="max-w-[68ch]">
            <ArticleBody>
              <h2>What is the 1% rule?</h2>
              <p>
                The 1% rule is a back-of-the-envelope screening filter investors
                use to decide whether a rental property deserves a full
                underwrite. The rule:
              </p>
              <ToolFormula
                formula="Monthly rent ≥ 1% of purchase price"
                example="$200,000 price × 1% = $2,000/month rent required to pass"
              />
              <p>
                That&apos;s it. No expenses, no financing, no projection — just a
                5-second sanity check. For the full deal screen, the{" "}
                <Link
                  href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
                  className="tc-link"
                >
                  60-second underwriting workflow
                </Link>{" "}
                shows what to do next once a property clears this filter.
              </p>

              <h2>Why investors use it</h2>
              <p>
                The 1% rule exists because new investors look at <em>too many</em>{" "}
                properties. Reading every listing in detail is slow. A quick
                gross-rent-to-price filter cuts the universe of properties down to
                the ones likely to cash-flow, which is where the time investment
                in full underwriting pays off.
              </p>
              <p>
                Veteran investors who know their market well often skip the rule
                entirely — they can eyeball whether a property &ldquo;feels
                right.&rdquo; New investors and out-of-market buyers benefit from
                the discipline. For the formal definition (and how it relates to
                the{" "}
                <Link href="/glossary/cap-rate" className="tc-link">
                  cap rate
                </Link>{" "}
                metric), see the{" "}
                <Link href="/glossary/1-percent-rule" className="tc-link">
                  1% rule glossary entry
                </Link>
                .
              </p>

              <h2>When the 1% rule works</h2>
              <ul>
                <li>
                  <strong>Cash-flow markets.</strong> Midwest cities (Cleveland,
                  Detroit, Memphis), Sun Belt suburbs, and rural areas where
                  prices are low enough that the math works.
                </li>
                <li>
                  <strong>Buy-and-hold investors.</strong> If your strategy
                  depends on monthly cash flow rather than appreciation, you need
                  rent that significantly exceeds expenses.
                </li>
                <li>
                  <strong>Triage when looking at many properties.</strong> A
                  weekend of scrolling listings is exhausting; the 1% rule makes
                  the scroll productive.
                </li>
              </ul>

              <h2>When the 1% rule misleads</h2>
              <ul>
                <li>
                  <strong>Coastal / Tier-1 markets.</strong> Almost nothing in SF,
                  NYC, Seattle, or Boston passes the 1% rule. That doesn&apos;t
                  mean the deals are bad — it means cash flow isn&apos;t the goal
                  in those markets. Investors accept lower rent-to-price ratios in
                  exchange for higher long-term appreciation.
                </li>
                <li>
                  <strong>Properties with unusual expenses.</strong> A high-HOA
                  condo, a property with $20k annual property taxes, or a house
                  needing $60k of rehab can pass the 1% rule and still be a
                  money-loser.
                </li>
                <li>
                  <strong>Properties with above-market rent.</strong> If the
                  current tenant is paying more than what a new lease would fetch,
                  the 1% rule overstates the real return. Confirm rents are
                  sustainable.
                </li>
              </ul>

              <h2>After the 1% rule: what to check</h2>
              <p>
                A property that passes the 1% rule has earned a closer look. Next
                steps:
              </p>
              <ol>
                <li>Pull the actual property tax bill (not estimate)</li>
                <li>Get an insurance quote from a real broker</li>
                <li>Walk the comps — what do similar units actually rent for?</li>
                <li>Get a rough rehab estimate if the property needs work</li>
                <li>
                  Run the full underwrite —{" "}
                  <Link href="/analyze" prefetch={false} className="tc-link">
                    cap rate
                  </Link>
                  ,{" "}
                  <Link href="/analyze" prefetch={false} className="tc-link">
                    CoC
                  </Link>
                  ,{" "}
                  <Link href="/analyze" prefetch={false} className="tc-link">
                    DSCR
                  </Link>
                  , cash flow
                </li>
              </ol>
              <p>
                TrueCap handles steps 4 and 5 in about four minutes once you have
                the inputs. Two sibling screens are worth knowing too: our{" "}
                <Link href="/blog/50-percent-rule-rentals" className="tc-link">
                  50% rule walkthrough
                </Link>{" "}
                shows how to triage the expense side (does the rent survive
                operating costs and the mortgage?), and the{" "}
                <Link href="/tools/2-percent-rule-calculator" className="tc-link">
                  2% rule calculator
                </Link>{" "}
                covers the stricter cash-flow-market bar — including why a 2% deal
                in 2026 deserves suspicion before celebration.
              </p>
            </ArticleBody>

            {/* FaqSection emits the page's one FAQPage node for these rows. */}
            <FaqSection
              id="onepct-faq"
              variant="inline"
              heading="Frequently asked questions"
              items={FAQS}
            />
          </article>
        </Section>

        <CloseSection
          heading="Take the deal past the 1% rule"
          headingId="onepct-close-heading"
          lede="Passing the 1% rule earns a deal a closer look. TrueCap runs the full underwrite — cap rate, CoC, DSCR, cash flow, 10-year cash-flow and equity projections, sensitivity, and Offer Ceiling — in about four minutes, free to start."
          actions={
            <>
              <ul className="border-t-2 border-foreground">
                {[
                  "Cap rate + CoC + DSCR + monthly cash flow",
                  "10-year projection with rent growth (Pro)",
                  "Offer Ceiling and downside sensitivity (included in your first decision, Pro after)",
                  "Editable operating and financing assumptions",
                  "Free to start",
                ].map((line) => (
                  <li
                    key={line}
                    className="border-b border-rule-soft py-3 text-pretty text-base"
                  >
                    {line}
                  </li>
                ))}
              </ul>
              <ActionRow className="mt-6">
                <Link
                  href="/analyze" prefetch={false}
                  className={buttonVariants({ size: "cta" })}
                >
                  Open the full TrueCap analyzer
                </Link>
              </ActionRow>
            </>
          }
        />

        {/* The tail shares the reading column. Each block spaces itself from
            the one above (mt-12); the first one, directly under the close,
            takes the close's own bottom space instead. */}
        <Section rule="none" rhythm="tight" containerClassName="pt-0 sm:pt-0">
          <div className="max-w-[68ch] [&>*:first-child]:mt-0">
            {/* Backlink engine — quiet, collapsed, renders nothing if this

                tool has no embeddable widget. See the component header. */}

            <ToolEmbedInvite slug="1-percent-rule-calculator" />

            <ToolsConversionCta
              calculatorName="1% rule calculator"
              hook="The 1% rule is a quick gross-rent screen. TrueCap's free core analyzer adds editable DSCR, cap rate, and cash-flow modeling. Projections appear when your free trial or plan includes them."
            />

            <RelatedContent kind="tool" slug="1-percent-rule-calculator" title="1% Rule Calculator" className="mt-12" />
          </div>
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}
