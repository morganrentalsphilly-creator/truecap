/**
 * Public SEO landing page for the 70% rule calculator.
 *
 * Same strategy as /tools/cap-rate-calculator (the canonical tool-page
 * pattern): working calculator above the fold, long-form content below.
 *
 * Deliberate scope split with /tools/arv-calculator: that page builds
 * ARV from sold comps (the input), THIS page is about the RULE itself —
 * when 70% works, when it lies, and how the multiplier should move
 * (the situation table mirrors the 70-percent-rule blog post). The
 * max-offer math is shared via components/tools/max-offer-math.ts so
 * the two pages can never disagree. Cross-linked both ways with the
 * ARV calculator and the blog post.
 *
 * Layout: the calculator page template (DESIGN.md "Components"; the 1% rule
 * calculator is the reference). The widget sits beside the H1 in PageHero,
 * the guide runs in a 68ch reading column (ArticleBody) with the formula on
 * rules (ToolFormula) and the situation table as a ruled table
 * (ArticleTable), the FAQ is ruled rows (FaqSection; the page keeps its own
 * FAQPage node), and the page closes once on the heavy rule (CloseSection).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { getSiteUrl } from "@/lib/site-url";
import { SeventyPercentRuleWidget } from "@/components/tools/seventy-percent-rule-widget";
import { ToolFormula } from "@/components/tools/tool-parts";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";
import { ToolEmbedInvite } from "@/components/marketing/tool-embed-invite";
import {
  ARTICLE_META,
  ARTICLE_META_LINK,
  ArticleBody,
  ArticleTable,
} from "@/components/marketing/article";
import { FaqSection } from "@/components/marketing/faq-section";
import {
  ActionRow,
  CloseSection,
  PageHero,
  UnderTitleAnalyzeLink,
} from "@/components/marketing/page-parts";
import { Section } from "@/components/marketing/section";
import { LedgerFigure } from "@/components/ledger/ledger-parts";
import { buttonVariants } from "@/components/ui/button";

import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";
import { RelatedContent } from "@/components/marketing/related-content";
import { Header } from "@/components/investcalc/header";
import { JsonLd } from "@/components/seo/json-ld";
import { buildToolAppLd } from "@/lib/seo/tool-app-ld";
import { OPEN_GRAPH_BASE } from "@/lib/seo/open-graph-base";
export const metadata: Metadata = {
  title: "70% Rule Calculator | 70%-rule price screen",
  description:
    "Free 70% rule calculator. 70%-rule price screen = 70% of ARV minus repairs — computed live, with guidance on when the rule works and when it can mislead.",
  keywords: [
    "70 percent rule calculator",
    "70% rule calculator",
    "70 rule real estate",
    "70%-rule price screen calculator",
    "ARV minus repairs",
  ],
  alternates: { canonical: "/tools/70-percent-rule-calculator" },
  openGraph: {
    ...OPEN_GRAPH_BASE,
    title: "70% Rule Calculator — Early Price Screen",
    description:
      "70%-rule price screen = 70% of ARV minus repairs. Compute the boundary at 60/65/70/75% and learn when 70% is the wrong screen.",
    url: "/tools/70-percent-rule-calculator",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is the 70% rule in real estate?",
    a: "It's a rule of thumb that calculates a screening boundary at 70% of a property's projected after-repair value (ARV) minus repairs. On a property modeled at $300,000 renovated with $45,000 of work, the 70%-rule price screen is (0.70 × $300,000) − $45,000 = $165,000. The 30% held back is not all profit; buying, holding, and selling costs come first.",
  },
  {
    q: "Is the 70%-rule price screen the same as TrueCap's Offer Ceiling?",
    a: "No — they are different calculations and should not be compared. The 70%-rule price screen on this page is a rule of thumb: entered ARV × your selected multiplier, minus entered repairs. TrueCap's Offer Ceiling is a separate result from the full underwriting model: the highest price that still meets your targets, under your financing and operating assumptions. This page does not compute an Offer Ceiling.",
  },
  {
    q: "Where does the ARV number come from?",
    a: "Comparable sales of renovated homes near the subject — ideally sold within the last 3–6 months, within about half a mile, matching on beds, baths, and square footage. The common method takes the price per finished square foot of those comps times the subject's square footage. ARV is set by the market, not by how much you spend on the rehab. Our ARV calculator builds the number from your comps.",
  },
  {
    q: "Does the 70% rule work for BRRRR?",
    a: "It can be an initial screen, not a refinance rule. Cash-out LTV, eligible value, seasoning, appraisal treatment, costs, and approval vary by lender, program, borrower, and property. A 75% case is only a planning scenario and does not promise that most or all cash returns; verify the completed rental's income, expenses, coverage, appraisal downside, and written loan terms.",
  },
  {
    q: "Is the 70% rule outdated in 2026?",
    a: "It still works as a screen, but 70 was never a universal number. Higher financing costs — hard money runs roughly 9.5–13% plus points in 2026 — make holding costs a bigger drag on long rehabs, which argues for a lower multiplier on heavy projects. On cheap houses, fixed costs push you toward 60–65%; on expensive houses with light work, 72–75% can be justified. Treat 70% as the center of a range, not a law.",
  },
  {
    q: "Why is the 70%-rule price screen rounded down to $500?",
    a: "Rounding down keeps the displayed amount at or below the rule's own modeled boundary. TrueCap's Offer Ceiling uses the same convention.",
  },
];

export default function SeventyPercentRuleCalculatorPage() {
  const siteUrl = getSiteUrl();


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
    slug: "70-percent-rule-calculator",
    name: "70% Rule Calculator",
    description:
      "Free 70% rule calculator. 70%-rule price screen = 70% of ARV minus repairs, with the boundary shown at common multipliers.",
    featureList: [
      "70%-rule price screen from ARV + repair costs",
      "Offer ladder at 60 / 65 / 70 / 75% multipliers",
      "Down-only $500 rounding — never quotes above the ceiling",
      "Free, no signup",
    ],
  });

  return (
    // relative + overflow-x-clip, as on the homepage: clips any sideways bleed
    // from a descendant without making a scroll container (sticky header ok).
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <ToolBreadcrumbSchema toolPath="/tools/70-percent-rule-calculator" toolName="70% rule calculator" />
      <JsonLd data={faqLd} />
      <JsonLd data={appLd} />

      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        {/* The calculator in the first screen: from 1024px the widget sits
            beside the H1. The hub link is the visible half of the breadcrumb
            schema and sits under the H1, never above it. The hero's action
            is the one short analyzer link under the H1 (P2-80). */}
        <PageHero
          title="70% rule calculator"
          lede="An early acquisition screen: selected percentage of after-repair value, minus repairs. Enter ARV and the renovation estimate to see the 60%, 65%, 70%, and 75% boundaries."
          actions={<UnderTitleAnalyzeLink />}
          aside={<SeventyPercentRuleWidget />}
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
            <p>
              <strong>Educational guide:</strong> The material below explains
              this early acquisition rule and its common use cases. TrueCap
              does not currently expose an integrated flip or BRRRR lifecycle
              model.
            </p>
            <h2>What is the 70% rule?</h2>
            <p>
              The 70% rule is the standard quick screen for house flips
              and BRRRR deals. It caps what you pay for a property that
              needs work:
            </p>
            <ToolFormula
              formula="70%-rule price screen = (ARV × 70%) − Repair costs"
              example="e.g. ($300,000 ARV × 0.70) − $45,000 repairs = $165,000 70%-rule price screen"
            />
            <p>
              The 30% you hold back is <strong>not all profit</strong>. It
              has to cover buying costs, holding costs (financing,
              insurance, utilities, taxes while you own it), and selling
              costs first — the margin is what survives all three. That
              framing is the single most important thing to understand
              about the rule, and it&apos;s why the full worked flip
              P&amp;L in our{" "}
              <IntentPrefetchLink href="/blog/70-percent-rule-house-flipping" className="tc-link">70% rule deep-dive</IntentPrefetchLink>{" "}
              is worth ten minutes before your first offer.
            </p>

            <h2>
              The rule leans entirely on ARV — get that number right
            </h2>
            <p>
              Repairs you can estimate line by line. The multiplier is a
              convention. ARV — what the property sells for{" "}
              <em>after</em>{" "}the rehab — is the input the whole rule leans
              on, and the one people fudge. It comes from comparable sales
              of <strong>renovated</strong>{" "}homes near the subject:
              ideally sold in the last 3&ndash;6 months, within about half
              a mile, matching on beds, baths, and square footage. ARV is
              set by the market, not by how much you spend on the rehab.
            </p>
            <p>
              If you don&apos;t have an ARV yet, build one from your comps
              with the{" "}
              <IntentPrefetchLink href="/tools/arv-calculator" className="tc-link">ARV calculator</IntentPrefetchLink>{" "}
              — it computes the price-per-square-foot average, sanity-checks
              the result against the comps&apos; actual sale range, and
              runs this same max-offer math on the way out. And price the
              rehab input honestly with the{" "}
              <IntentPrefetchLink href="/tools/rehab-cost-estimator" className="tc-link">rehab cost estimator</IntentPrefetchLink>{" "}
              — a guessed repair number turns the rule&apos;s output into
              a guess with a decimal point.
            </p>

            <h2>
              When 70% is the wrong number
            </h2>
            <p>
              The single biggest mistake with the 70% rule is treating the
              70 as a law of physics. It stands in for a specific bundle
              of cost-and-profit assumptions, and when those assumptions
              don&apos;t hold, the multiplier should move. Fixed costs are
              the reason: commissions scale with ARV, but a title search,
              a dumpster, six months of insurance, and a permit cost about
              the same on a $130,000 house as on a $400,000 one — so on
              cheap houses those fixed costs eat a much bigger share of a
              much smaller spread.
            </p>
            <ArticleTable label="Results table" stickyFirstColumn={false}>
              <table>
                <thead>
                  <tr>
                    <th>Situation</th>
                    <th>What&apos;s different</th>
                    <th className="text-right">Offer as % of ARV</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Low ARV (&lt; ~$150K), cheaper market</td>
                    <td>Fixed costs are a big share of a small spread</td>
                    <td className="text-right"><LedgerFigure>60&ndash;65%</LedgerFigure></td>
                  </tr>
                  <tr>
                    <td>Typical ($200K&ndash;$400K), moderate rehab</td>
                    <td>The rule&apos;s home turf</td>
                    <td className="text-right"><LedgerFigure>70%</LedgerFigure></td>
                  </tr>
                  <tr>
                    <td>High ARV (&gt; ~$600K), light rehab</td>
                    <td>Fat spread; costs are a small share</td>
                    <td className="text-right"><LedgerFigure>72&ndash;75%</LedgerFigure></td>
                  </tr>
                  <tr>
                    <td>Long or heavy rehab (9+ months)</td>
                    <td>Holding costs balloon</td>
                    <td className="text-right"><LedgerFigure>drop 3&ndash;5 pts</LedgerFigure></td>
                  </tr>
                  <tr>
                    <td>Red-hot seller&apos;s market</td>
                    <td>Competition; win rate falls at 70%</td>
                    <td className="text-right"><LedgerFigure>72&ndash;75%*</LedgerFigure></td>
                  </tr>
                </tbody>
              </table>
            </ArticleTable>
            <p>
              <em>
                *Higher isn&apos;t permission to overpay — it&apos;s a
                warning that a thinner margin needs a tighter rehab number
                and a faster exit.
              </em>{" "}
              None of these adjustments break the rule; they remind you
              that 70% encodes a set of numbers, and your numbers might
              differ. The calculator&apos;s multiplier ladder shows the max
              offer at 60, 65, 70, and 75% side by side so you can see
              exactly what each assumption is worth in dollars.
            </p>

            <h2>Educational context: the 70% rule and refinance plans</h2>
            <p>
              TrueCap does not currently expose an integrated BRRRR lifecycle
              model. As educational context, a BRRRR plan uses a future
              refinance rather than a sale. Maximum
              LTV, eligible value, seasoning, appraisal treatment, costs, and
              approval vary by lender, program, borrower, and property. A 75%
              refinance case is an editable scenario—not a ceiling, quote, or
              promise that capital returns.
            </p>
            <p>
              But a BRRRR has a second gate a flip doesn&apos;t: the
              finished property has to work <em>as a rental</em>. If it
              won&apos;t cash-flow at the refinanced payment, it isn&apos;t
              a BRRRR — it&apos;s a flip you accidentally kept. Model the
              full cycle with the{" "}
              <IntentPrefetchLink href="/blog/brrrr-method-explained" className="tc-link">BRRRR workflow guide</IntentPrefetchLink>, and
              check the rental math in the{" "}
              <Link href="/analyze" prefetch={false} className="tc-link">TrueCap analyzer</Link>{" "}
              — cap rate and DSCR together — before you commit.
            </p>

            <h2>
              What the rule can&apos;t tell you
            </h2>
            <p>
              The 70% rule is a screen, not underwriting. It approximates
              a rigorous backward solve — start from the resale price,
              subtract the actual buying, holding, and selling costs and
              your required profit, and whatever is left is the real
              70%-rule price screen. The rule compresses all of those costs into
              one multiplier, which is exactly why the multiplier has to
              move when your costs do. Three things it cannot see:
            </p>
            <ul>
              <li>
                <strong>Your financing.</strong>{" "}Hard money at roughly
                9.5&ndash;13% plus points makes every extra month of
                holding expensive; cash changes the math entirely.
              </li>
              <li>
                <strong>Your timeline.</strong>{" "}A six-week cosmetic rehab
                and a nine-month gut job can have the same repair budget
                and wildly different holding costs.
              </li>
              <li>
                <strong>Your exit.</strong>{" "}Sell vs. refinance-and-hold
                produce different cost stacks from the same purchase.
              </li>
            </ul>
            <p>
              When a deal passes the screen, back into the offer using a
              separate, reviewed project ledger for acquisition, renovation,
              holding, financing, and disposition costs. TrueCap&apos;s
              analyzer screens only the stabilized rental case, including
              cash flow, cap rate, cash-on-cash return, DSCR, Buy Box fit,
              and a Deal score.
            </p>

            </ArticleBody>

            {/* The analyzer CTA where the guide hands off to TrueCap, inside
                the article, so the page closes once, on the CloseSection
                below. */}
            <ToolsConversionCta calculatorName="70% rule calculator" hook="The 70% rule is an initial screen. TrueCap's rental analyzer adds itemized costs, stabilized cash flow, and TrueCap's Offer Ceiling under your Buy Box." />

            {/* The page's FAQPage node is faqLd above, built from the same
                FAQS, so the section emits none of its own. */}
            <FaqSection
              id="seventypct-faq"
              variant="inline"
              heading="Frequently asked questions"
              items={FAQS}
              structuredData={false}
            />
          </article>
        </Section>

        <CloseSection
          heading="Go from screen to underwrite — free"
          headingId="seventypct-close-heading"
          lede={
            <>
              The 70% rule is an early acquisition screen, not a defensible
              offer by itself. For a stabilized hold, TrueCap&apos;s Offer Ceiling
              is the highest price that still meets your targets, calculated
              from the assumptions shown.
            </>
          }
          actions={
            <>
              <ul className="border-t-2 border-foreground">
                {[
                  "Entered-ARV × selected-multiplier screen on this page",
                  "Editable rehab and acquisition-cost assumptions",
                  "TrueCap's Offer Ceiling for the rental case (included in your first decision, Pro after)",
                  "Cash flow, cap rate, CoC, DSCR on the keep scenario",
                  "Buy Box fit, with a Deal score",
                  "Free to start — no credit card",
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
                  Open the rental analyzer
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
            <ToolEmbedInvite slug="70-percent-rule-calculator" />

            <RelatedContent kind="tool" slug="70-percent-rule-calculator" title="70% Rule Calculator" className="mt-12" />
          </div>
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}
