/**
 * Blog post: are mortgage points worth it on an investment property.
 *
 * Targets queries: "mortgage points investment property", "discount points
 * rental property", "are mortgage points worth it", "buying down mortgage
 * rate rental", "should I buy points investment property", "mortgage points
 * break even", "discount points vs origination points", "points tax
 * deductible rental property".
 *
 * Angle: points are an upfront-cost-versus-payment tradeoff. The actual
 * lender quote, hold period, loan outcome, underwriting rules, and
 * taxpayer-specific treatment determine the result.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "mortgage-points-investment-property";
const TITLE =
  "Mortgage points on an investment property: compare the actual quotes";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Mortgage points on an investment property";
const DESCRIPTION =
  "Use a lender's written rate-and-fee ladder to compare point cost, payment savings, break-even, DSCR, cash-on-cash, and taxpayer-specific treatment.";
const PUBLISHED_AT = "2026-06-29";
const MODIFIED_AT = "2026-08-29";
const READING_TIME = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "mortgage points investment property",
    "discount points rental property",
    "are mortgage points worth it",
    "buying down mortgage rate rental",
    "should I buy points investment property",
    "mortgage points break even",
    "discount points vs origination points",
    "points tax deductible rental property",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    title: SERP_TITLE,
    description: DESCRIPTION,
    url: `/blog/${SLUG}`,
    type: "article",
    publishedTime: PUBLISHED_AT,
    modifiedTime: MODIFIED_AT,
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const FAQS = [
  {
    q: "How much does one mortgage point cost and how much does it lower my rate?",
    a: "A quoted point commonly means 1% of the loan amount, but confirm whether the charge is a discount point, origination charge, or another fee. The rate change is not fixed by the word 'point'; it comes from the lender's same-day written rate-and-fee ladder for the actual file. Compare note rate, APR, payment, cash to close, lock terms, and every fee at each option.",
  },
  {
    q: "What is the break-even on buying mortgage points?",
    a: "A simple pre-tax screen divides the incremental upfront cost by the incremental monthly payment savings. The result depends entirely on the paired written quotes and does not capture taxes, opportunity cost, time value, loan changes, sale, refinance, default, or prepayment terms. Compare the simple break-even with a full hold-period cash-flow analysis.",
  },
  {
    q: "Are points on a rental property tax-deductible?",
    a: "Tax treatment depends on what the charge actually is, loan purpose, property use, payment period, accounting method, refinance or payoff facts, and current law. Do not copy primary-residence treatment or assume an immediate deduction for a rental. Have a qualified tax professional classify the charge and determine the timing from the closing documents.",
  },
  {
    q: "Should I buy points or just put more money down?",
    a: "Run both written scenarios. Points may reduce the payment while increasing cash to close; a larger down payment changes the loan balance, leverage, reserves, and possibly pricing or eligibility. Compare total cash, payment, DSCR under the lender's method, cash-on-cash, liquidity, break-even, and exit scenarios. Neither option is automatically better or an approval guarantee.",
  },
];

export default function MortgagePointsPost() {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/blog/${SLUG}`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: TITLE,
    description: DESCRIPTION,
    datePublished: PUBLISHED_AT,
    dateModified: MODIFIED_AT,
    url: canonicalUrl,
    author: { "@type": "Person", name: "Morgan Page", url: siteUrl },
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntityOfPage: canonicalUrl,
    image: [`${siteUrl}/home.jpg`],
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "TrueCap",
        item: `${siteUrl}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${siteUrl}/blog`,
      },
      { "@type": "ListItem", position: 3, name: TITLE, item: canonicalUrl },
    ],
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

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <article>
          <div className="mb-2">
            <Link
              href="/blog"
              className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
            >
              ← Blog
            </Link>
          </div>
          <header className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight text-balance">
              {TITLE}
            </h1>
            <p className="mt-3 text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
              {new Date(PUBLISHED_AT).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}{" "}
              · {READING_TIME} min read
            </p>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              A lender may offer several combinations of rate, points, credits,
              and fees. The only reliable comparison uses same-day written
              options for the actual borrower and property. This guide preserves
              the break-even math with hypothetical quotes, then shows which
              lender, tax, liquidity, and exit questions must be verified.
            </p>
          </header>

          <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              What a point actually buys
            </h2>
            <p>
              A quote may use one point to mean{" "}
              <strong>1% of the loan amount</strong>. Confirm whether each
              charge is a discount point, origination charge, or another fee,
              and read the rate change from the lender&apos;s written ladder:
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-1">
              <code className="block text-sm sm:text-base text-foreground font-mono">
                Point charge = quoted percentage × loan amount
              </code>
              <code className="block text-sm sm:text-base text-foreground font-mono">
                Rate change per point = lender&apos;s written quote, not a fixed
                rule
              </code>
            </div>
            <p>
              In the hypothetical below, a $200,000 loan makes one quoted point
              $2,000. The rate change, however, is an assumption supplied by the
              example. Ask for the full same-day ladder in writing and compare
              payment, APR, fees, cash to close, lock terms, and any prepayment
              charge at each rung.
            </p>
            <p>
              Two distinctions trip people up. <strong>Discount points</strong>{" "}
              buy down your rate; <strong>origination points</strong> are simply
              a fee the lender charges to make the loan and do nothing to your
              rate — when a quote lists &quot;2 points,&quot; confirm which
              kind. A lender-credit option may trade a higher rate for a
              closing-cost credit. Its value depends on the written quote, how
              long the loan remains outstanding, and all other terms; it is not
              automatically preferable for a short expected hold.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The break-even, worked
            </h2>
            <p>
              A simple screening ratio estimates how long monthly payment
              savings take to recover the incremental upfront cost.
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <code className="text-sm sm:text-base text-foreground font-mono">
                Break-even (months) = Cost of points ÷ Monthly payment savings
              </code>
            </div>
            <p>
              The following hypothetical uses a $200,000, 30-year loan, a 7.0%
              base-rate assumption, and an assumed 0.25-percentage-point rate
              change per point. These are not current quotes. You can reproduce
              the payment arithmetic on the{" "}
              <Link
                href="/tools/mortgage-payment-calculator"
                className="text-primary font-semibold hover:underline"
              >
                mortgage payment calculator
              </Link>
              :
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Points (cost)</th>
                    <th className="text-right">Rate</th>
                    <th className="text-right">P&amp;I / mo</th>
                    <th className="text-right">Saved / mo</th>
                    <th className="text-right">Break-even</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>0 ($0)</td>
                    <td className="text-right">7.00%</td>
                    <td className="text-right">$1,330.60</td>
                    <td className="text-right">—</td>
                    <td className="text-right">—</td>
                  </tr>
                  <tr>
                    <td>1 ($2,000)</td>
                    <td className="text-right">6.75%</td>
                    <td className="text-right">$1,297.20</td>
                    <td className="text-right">$33.41</td>
                    <td className="text-right">~60 mo</td>
                  </tr>
                  <tr>
                    <td>2 ($4,000)</td>
                    <td className="text-right">6.50%</td>
                    <td className="text-right">$1,264.14</td>
                    <td className="text-right">$66.47</td>
                    <td className="text-right">~60 mo</td>
                  </tr>
                  <tr>
                    <td>4 ($8,000)</td>
                    <td className="text-right">6.00%</td>
                    <td className="text-right">$1,199.10</td>
                    <td className="text-right">$131.50</td>
                    <td className="text-right">~61 mo</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              Under those assumptions, one point trims the payment about $33 per
              month and the simple break-even is about 60 months. That result is
              specific to the illustrative ladder. It ignores opportunity cost,
              time value, taxes, transaction changes, and the chance that the
              loan is sold, refinanced, modified, prepaid, or otherwise ends.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Why the break-even barely moves in this hypothetical
            </h2>
            <p>
              In this simplified ladder, cost and assumed savings scale
              similarly, so the simple break-even changes little. A real ladder
              may not be linear and may change other fees or eligibility.
              Calculate each pair of actual quotes separately.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Rate cut per point</th>
                    <th className="text-right">Saved / mo (1 pt)</th>
                    <th className="text-right">Break-even</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>0.375% (hypothetical A)</td>
                    <td className="text-right">$49.98</td>
                    <td className="text-right">~40 mo (3.3 yr)</td>
                  </tr>
                  <tr>
                    <td>0.250% (hypothetical B)</td>
                    <td className="text-right">$33.41</td>
                    <td className="text-right">~60 mo (5.0 yr)</td>
                  </tr>
                  <tr>
                    <td>0.125% (hypothetical C)</td>
                    <td className="text-right">$16.75</td>
                    <td className="text-right">~119 mo (10 yr)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              These three assumed ladders show that the break-even can change
              materially with the rate reduction. They do not identify a normal,
              favorable, or unfavorable quote. Use the lender&apos;s actual
              ladder and the expected hold and exit scenarios.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Tax treatment must come from the actual charge and loan
            </h2>
            <p>
              Do not copy primary-residence treatment to a rental or assume
              every charge called a point is prepaid interest. Classification
              and timing can depend on the charge, loan purpose, use, payment
              period, accounting method, refinance or payoff facts, and current
              law. The{" "}
              <Link
                href="/blog/rental-property-tax-deductions"
                className="text-primary font-semibold hover:underline"
              >
                rental-property tax guide
              </Link>{" "}
              provides a general checklist, but the closing documents and
              taxpayer facts control.
            </p>
            <p>
              A sale, payoff, modification, or refinance may change the
              treatment of any remaining amount, but the result is not
              universal. Have a qualified tax professional classify the fee and
              determine the applicable timing before using a tax benefit in the
              break-even.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              How points can change a modeled DSCR
            </h2>
            <p>
              A lower modeled rate reduces the payment and can increase a{" "}
              <Link
                href="/#main"
                className="text-primary font-semibold hover:underline"
              >
                debt-service-coverage ratio
              </Link>
              . Whether that changes eligibility or pricing depends on the
              lender&apos;s accepted rent, payment definition, threshold,
              rounding, fees, reserves, and full matrix. The table below
              continues the hypothetical $200,000 loan with $18,200 of modeled
              NOI:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Points</th>
                    <th className="text-right">Rate</th>
                    <th className="text-right">Annual debt service</th>
                    <th className="text-right">DSCR</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>0</td>
                    <td className="text-right">7.00%</td>
                    <td className="text-right">$15,967</td>
                    <td className="text-right">1.14</td>
                  </tr>
                  <tr>
                    <td>1</td>
                    <td className="text-right">6.75%</td>
                    <td className="text-right">$15,566</td>
                    <td className="text-right">1.17</td>
                  </tr>
                  <tr>
                    <td>2</td>
                    <td className="text-right">6.50%</td>
                    <td className="text-right">$15,170</td>
                    <td className="text-right">
                      <strong>1.20</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              In the example, two points move modeled DSCR from 1.14 to 1.20. If
              a lender&apos;s written matrix used that threshold and accepted
              every other input, the change could affect the file. Actual{" "}
              <Link
                href="/blog/dscr-loans-explained"
                className="text-primary font-semibold hover:underline"
              >
                DSCR-loan programs
              </Link>{" "}
              vary, and modeled DSCR does not establish approval, rate tier, or
              closing. Obtain the lender&apos;s calculation and complete written
              terms before paying non-refundable fees.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              What points do to cash-on-cash
            </h2>
            <p>
              In a model, points can lower the payment while raising the cash in
              the deal. Run both effects through{" "}
              <Link
                href="/#main"
                className="text-primary font-semibold hover:underline"
              >
                cash-on-cash
              </Link>{" "}
              on the example — $50,000 down, $7,500 of other closing costs,
              $18,200 NOI:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Scenario</th>
                    <th className="text-right">Cash in</th>
                    <th className="text-right">Cash flow / mo</th>
                    <th className="text-right">Cash-on-cash</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>0 points (7.00%)</td>
                    <td className="text-right">$57,500</td>
                    <td className="text-right">$186</td>
                    <td className="text-right">3.88%</td>
                  </tr>
                  <tr>
                    <td>2 points (6.50%)</td>
                    <td className="text-right">$61,500</td>
                    <td className="text-right">$253</td>
                    <td className="text-right">4.93%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              Under the hypothetical inputs, cash-on-cash rises from 3.88% to
              4.93%. That snapshot assumes the stated payment savings continue;
              it does not prove the points outperform over the hold. A refinance
              at month 36 in this example would produce about $2,400 of payment
              savings against $4,000 of upfront cost before taxes, time value,
              or other effects. Compare a full hold-period cash-flow schedule,
              not the first-year ratio alone.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              A refinance-before-break-even scenario
            </h2>
            <p>
              A simple break-even assumes the quoted loan remains outstanding
              long enough for payment savings to recover the upfront charge. In
              this article&apos;s hypothetical two-point case, ending the loan
              at month 36 produces about $2,400 of payment savings against
              $4,000 of upfront cost, before taxes, time value, transaction
              costs, or any payoff terms. That is an illustrative shortfall, not
              a forecast of future rates or a recommendation to refinance.
            </p>
            <p>
              Compare each written quote across several loan-duration scenarios,
              including a possible sale, payoff, or{" "}
              <Link
                href="/blog/how-to-refinance-a-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                refinance the rental
              </Link>
              . Do not assume a future refinance will be available or
              economical, and do not assume a lender credit is free; it may be
              paired with a different rate or other terms. For every option,
              compare total cash, cumulative payments, remaining balance, exit
              costs, and the modeled{" "}
              <Link
                href="/blog/negative-leverage-real-estate"
                className="text-primary font-semibold hover:underline"
              >
                loan constant
              </Link>{" "}
              over the same time horizons.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              A decision checklist for the written options
            </h2>
            <p>
              For each option, compare the simple break-even with realistic hold
              and loan-duration scenarios; confirm the lender&apos;s DSCR
              calculation, pricing tiers, reserves, and eligibility in writing;
              and measure the effect on liquidity. A modeled threshold crossing
              does not establish approval, and a short break-even does not make
              the rest of the loan terms favorable.
            </p>
            <p>
              Also compare the quoted point option with a zero-point option, any
              lender-credit option, required reserves, and a larger{" "}
              <Link
                href="/blog/how-much-down-payment-investment-property"
                className="text-primary font-semibold hover:underline"
              >
                down payment
              </Link>
              . If a quote includes a <strong>temporary buydown</strong>, obtain
              the introductory and permanent payment schedules, funding source,
              qualification method, and all terms in writing. Model the
              permanent payment and do not treat an introductory payment as a
              permanent rate reduction.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              FAQ
            </h2>
            {FAQS.map((f) => (
              <div key={f.q}>
                <h3 className="text-xl font-bold text-foreground mt-6 mb-2">
                  {f.q}
                </h3>
                <p>{f.a}</p>
              </div>
            ))}

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The bottom line
            </h2>
            <p>
              Mortgage points exchange more cash at closing for the rate and
              payment shown on a particular quote. There is no universal
              break-even, yield, tax treatment, or approval effect. Compare the
              lender&apos;s complete same-day ladder, calculate each option over
              multiple hold and loan-duration scenarios, and have a qualified
              tax professional classify the actual charges. If the modeled rate
              changes a{" "}
              <Link
                href="/blog/piti-explained-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                payment-driven DSCR
              </Link>
              , confirm the lender&apos;s own inputs and threshold rather than
              relying on the model. The{" "}
              <Link
                href="/"
                className="text-primary font-semibold hover:underline"
              >
                TrueCap analyzer
              </Link>{" "}
              recalculates payment, cash flow, DSCR, and cash-on-cash from the
              rate and costs you enter; it does not provide a quote, verify
              eligibility, or give lending, investment, legal, or tax advice.
              Reconcile the model with the final lender documents before
              committing funds.
            </p>
          </div>
        </article>
      </main>
      <RelatedBlogPosts currentSlug={SLUG} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <NewsletterSignup variant="expanded" source="blog" />
      </div>
      <BlogStickyCta />
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
