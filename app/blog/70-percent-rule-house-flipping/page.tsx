/**
 * Blog post: the 70% rule for house flipping (and BRRRR).
 *
 * Targets queries: "70 percent rule house flipping", "70% rule real
 * estate", "how to calculate 70%-rule price screen flip", "70%-rule price screen",
 * "ARV minus repairs formula", "how to calculate ARV", "70 rule BRRRR",
 * "what should I offer on a flip", "70 percent rule calculator".
 *
 * Angle: the 70% rule is a screen, not underwriting. Give the formula, a
 * full worked flip P&L that shows where the 30% spread actually goes, the
 * ARV comp method (the input people fudge), the rehab number, when the
 * multiplier should move off 70, the BRRRR 75%-refi tie-in, and the
 * rigorous backward solve the rule approximates. This is the canonical
 * flip/BRRRR max-offer explainer the strategy cluster points to, and it
 * funnels into the rehab estimator + BRRRR calculator + analyzer.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ARTICLE_HEADER,
  ARTICLE_LEDE,
  ARTICLE_META,
  ARTICLE_META_LINK,
  ARTICLE_TITLE,
  ArticleBody,
  ArticleEnd,
  ArticleMain,
  ArticlePage,
  ArticleTable,
  ToolFormula,
  UnderTitleAnalyzeLink,
} from "@/components/marketing/article";
import { BlogByline } from "@/components/marketing/blog-byline";
import { FaqSection } from "@/components/marketing/faq-section";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { RelatedContent } from "@/components/marketing/related-content";
import { getSiteUrl } from "@/lib/site-url";
import { Header } from "@/components/investcalc/header";
import { lastmodFor } from "@/lib/seo/lastmod";
import { JsonLd } from "@/components/seo/json-ld";
import { PostSources } from "@/components/blog/post-sources";

const SLUG = "70-percent-rule-house-flipping";
const TITLE =
  "The 70% rule for house flipping (and BRRRR): calculate a 70%-rule price screen (2026)";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "70% rule for flipping: the price screen (2026)";
const DESCRIPTION =
  "The 70% rule screens a flip's price at 70% of ARV minus repairs. Here's the formula, a worked flip and BRRRR example, and when 70% is the wrong number.";
const PUBLISHED_AT = "2026-07-05";
const MODIFIED_AT = lastmodFor("/blog/70-percent-rule-house-flipping") ?? PUBLISHED_AT;
const READING_TIME = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "70 percent rule house flipping",
    "70% rule real estate",
    "70%-rule price screen",
    "how to calculate ARV",
    "ARV minus repairs formula",
    "how much to offer on a flip",
    "70 rule BRRRR",
    "after repair value",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    title: SERP_TITLE,
    description: DESCRIPTION,
    url: `/blog/${SLUG}`,
    type: "article",
    publishedTime: PUBLISHED_AT,
    modifiedTime: MODIFIED_AT,
  },
  twitter: { card: "summary_large_image" },
};

const FAQS = [
  {
    q: "What is the 70% rule in house flipping?",
    a: "It's a rule of thumb that calculates a screening boundary at 70% of a property's projected ARV minus repairs. On a property modeled at $300,000 renovated with $45,000 of work, the 70%-rule price screen is (0.70 × $300,000) − $45,000 = $165,000. The 30% held back is not all profit; it covers buying, holding, and selling costs first. This is not a recommended offer or appraisal.",
  },
  {
    q: "How do you calculate ARV (after-repair value)?",
    a: "ARV is based on comparable sales of renovated homes near the subject — ideally ones that sold within the last 3–6 months, sit within about half a mile, and match on beds, baths, and square footage. The common method is to take the price per finished square foot of those comps and multiply by the subject's square footage, then cap the result at the neighborhood ceiling (the most a renovated home on that street realistically sells for). ARV is set by the market, not by how much you spend on the rehab.",
  },
  {
    q: "Does the 70% rule work for BRRRR?",
    a: "It can be an initial screen, not a refinance rule. Cash-out LTV, eligible value, seasoning, appraisal treatment, costs, and approval vary by lender, program, borrower, and property. A 75% case is only a planning scenario and does not promise that most or all cash returns; verify the completed rental's income, expenses, coverage, appraisal downside, and written loan terms.",
  },
  {
    q: "Is the 70% rule outdated in 2026?",
    a: "It still works as a screen, but 70 was never a universal number. Higher financing costs — hard money usually costs more than conventional financing — make holding costs a bigger drag on long rehabs, which argues for a lower multiplier on heavy projects. On cheap houses, fixed costs push you toward 60–65%; on expensive houses with light work, 72–75% can be justified. Treat 70% as the center of a range, not a law.",
  },
  {
    q: "What if there aren't good comparable sales?",
    a: "Thin comps are a real risk because ARV drives the rule. Widen the search carefully and adjust for relevant differences. If you still cannot support a credible ARV, label the uncertainty, test a wider margin, and verify before recording a decision. A 70%-rule price screen built on a guessed ARV is still a guess.",
  },
];

export default function SeventyPercentRulePost() {
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
    author: { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: "TrueCap", url: siteUrl },
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntityOfPage: canonicalUrl,
    image: [`${siteUrl}/home.jpg`],
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "TrueCap", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
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
    <ArticlePage>
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={faqLd} />

      <ArticleMain>
        <article>
          <header className={ARTICLE_HEADER}>
            <h1 className={ARTICLE_TITLE}>{TITLE}</h1>
            <p className={ARTICLE_META}>
              <Link href="/blog" className={ARTICLE_META_LINK}>
                Blog
              </Link>{" "}
              ·{" "}
              {/* A date-only PUBLISHED_AT is UTC midnight: format it in UTC, as /blog does, or a render west of UTC shows the day before. */}
              {new Date(PUBLISHED_AT).toLocaleDateString("en-US", {
                timeZone: "UTC",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}{" "}
              · {READING_TIME} min read
            </p>
            <BlogByline />
            <UnderTitleAnalyzeLink />
            <p className={ARTICLE_LEDE}>
              Every flip and every BRRRR deal is won or lost at the offer. Pay
              too much and no amount of hustle on the rehab earns it back — the
              spread you needed was gone before you got the keys. The 70% rule is
              the back-of-the-napkin screen investors use to keep that from
              happening: it screens the price at 70% of the finished value,
              minus what the repairs will cost. It fits on an index card, it
              works often enough to be worth memorizing, and — like every rule of
              thumb — it quietly lies in exactly the situations where the money is
              biggest. Here is the formula, a full worked flip, how to pin down
              the two inputs that actually drive it, the version BRRRR investors
              use, and when 70% is the wrong number.
            </p>
          </header>

          <ArticleBody>
            <h2>What the 70% rule actually says</h2>
            <p>
              The rule calculates a <strong>70%-rule price screen</strong>—a
              screening boundary intended to leave room for modeled costs and profit:
            </p>
            <ToolFormula formula="70%-rule price screen = (ARV × 0.70) − Repair costs" />
            <p>
              <strong>ARV</strong> is the after-repair value: what the property
              will sell for once it&apos;s fixed up, not what it&apos;s worth
              today in its current condition. <strong>Repair costs</strong> are
              your all-in rehab budget. Everything hinges on those two numbers,
              and we&apos;ll spend most of this post on getting them right. Take a
              house you expect to be worth $300,000 renovated that needs $45,000
              of work:
            </p>
            <ToolFormula formula="70%-rule price screen = (0.70 × $300,000) − $45,000 = $165,000" />
            <p>
              So the rule screens the price at $165,000 — not because that&apos;s
              what the seller wants or what the property is worth in its current
              condition, but because it leaves 30% of the finished value to cover
              everything between the contract and the closing on the resale, plus
              your profit. (The free{" "}
              <Link
                href="/tools/arv-calculator"
                className="tc-link"
              >
                ARV calculator
              </Link>{" "}
              runs this exact formula against your own comps — the comps-based
              ARV and the 70%-rule price screen at any multiplier in one
              screen. Already have the ARV? The free{" "}
              <Link
                href="/tools/70-percent-rule-calculator"
                className="tc-link"
              >
                70% rule calculator
              </Link>{" "}
              shows the 70%-rule price screen at 60/65/70/75% side by side.)
            </p>

            <h2>Where the other 30% goes</h2>
            <p>
              The 30% you held back isn&apos;t profit — it&apos;s profit plus
              every cost the formula doesn&apos;t name. On a $300,000 ARV, that
              spread is $90,000 (ARV × 0.30), and it has to stretch over four
              things:
            </p>
            <ul>
              <li>
                <strong>Buying costs</strong> — closing costs, lender points, and
                inspections on the purchase.
              </li>
              <li>
                <strong>Holding costs</strong> — the interest, property tax,
                insurance, and utilities you pay every month you own it, whether
                it&apos;s rented or gutted.
              </li>
              <li>
                <strong>Selling costs</strong> — agent commission and closing
                costs when you sell the finished house, which land on the higher
                ARV, not on your low purchase price.
              </li>
              <li>
                <strong>Profit</strong> — what&apos;s left, and the entire reason
                you took the risk.
              </li>
            </ul>
            <p>
              Skip any of these when you&apos;re eyeballing a deal and you&apos;ll
              systematically overpay. In the worked example below, buying,
              holding, and selling costs take about 12.6% of ARV and profit is
              about 17.4%. Change any of those assumptions — a longer
              hold, a pricier market, a thinner margin — and the right multiplier
              moves off 70%.
            </p>

            <h2>A full worked flip</h2>
            <p>
              Numbers make the 30% concrete. Buy the house at the $165,000 price
              screen, put $45,000 into it, and sell it six months later at the
              $300,000 ARV. Here is the whole ledger:
            </p>
            <ArticleTable label="Data table" stickyFirstColumn={false}>
              <table className="[&_td:last-child]:whitespace-nowrap [&_td:last-child]:text-right [&_th:last-child]:text-right">
                <thead>
                  <tr>
                    <th className="text-left">Line</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>At 70%-rule price screen</td>
                    <td className="text-right">$165,000</td>
                  </tr>
                  <tr>
                    <td>Acquisition closing costs (~2%)</td>
                    <td className="text-right">$3,300</td>
                  </tr>
                  <tr>
                    <td>Rehab</td>
                    <td className="text-right">$45,000</td>
                  </tr>
                  <tr>
                    <td>Holding, 6 mo (interest + 2 points + tax/ins/utilities)</td>
                    <td className="text-right">~$15,000</td>
                  </tr>
                  <tr>
                    <td>Selling costs (5% commission + ~1.5% closing on $300K)</td>
                    <td className="text-right">$19,500</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Total all-in</strong>
                    </td>
                    <td className="text-right">
                      <strong>$247,800</strong>
                    </td>
                  </tr>
                  <tr>
                    <td>Resale</td>
                    <td className="text-right">$300,000</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Net profit</strong>
                    </td>
                    <td className="text-right">
                      <strong>~$52,200</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </ArticleTable>
            <p>
              That $52,200 is about 17% of ARV — a healthy flip. Watch how the
              $90,000 spread split: roughly $37,800 went to buying, holding, and
              selling, and $52,200 was profit. The rehab wasn&apos;t in the
              spread at all — the formula subtracts it separately, which is
              exactly why you can&apos;t quietly fold rehab into &quot;costs&quot;
              and double-count it. And notice the biggest line after the house and
              the rehab: $19,500 of selling costs, paid on the finished value.{" "}
              <Link
                href="/blog/hard-money-vs-dscr-loan"
                className="tc-link"
              >
                Hard money
              </Link>{" "}
              usually costs more than conventional financing, so get written
              quotes. At an assumed 11% rate and 2 points, on a $165,000 loan held
              six months you&apos;re paying about $9,000 in interest and $3,300 in
              points before you replace a single fixture. Investors who forget
              that commissions and holding costs scale with the deal — not with
              the bargain price they paid — are the ones whose projected $70,000
              profit shows up at closing as $50,000.
            </p>

            <h2>ARV: the input that matters most</h2>
            <p>
              Of the two inputs, ARV is the one people fudge — usually upward,
              because a higher ARV justifies a higher offer and makes the deal you
              already want to do look fine. Discipline here is most of the edge.
              ARV comes from <strong>sold comparables</strong>, not from your
              rehab budget and not from active listings. The market decides what a
              renovated house is worth; your job is to read the market, not argue
              with it. The tightest comps are homes that sold — closed, not just
              listed — in the last 3–6 months, sit within about half a mile, match
              the subject on beds, baths, and square footage within ~20%, and,
              critically, were themselves renovated, so you&apos;re comparing
              finished-to-finished.
            </p>
            <p>
              The workhorse method is price per finished square foot. Say three
              renovated comps nearby sold like this:
            </p>
            <ArticleTable label="Data table">
              <table>
                <thead>
                  <tr>
                    <th className="text-left">Comp</th>
                    <th className="text-right">Sold price</th>
                    <th className="text-right">Size</th>
                    <th className="text-right">$/sqft</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>A</td>
                    <td className="text-right">$312,000</td>
                    <td className="text-right">1,480 sqft</td>
                    <td className="text-right">$211</td>
                  </tr>
                  <tr>
                    <td>B</td>
                    <td className="text-right">$298,000</td>
                    <td className="text-right">1,420 sqft</td>
                    <td className="text-right">$210</td>
                  </tr>
                  <tr>
                    <td>C</td>
                    <td className="text-right">$305,000</td>
                    <td className="text-right">1,460 sqft</td>
                    <td className="text-right">$209</td>
                  </tr>
                </tbody>
              </table>
            </ArticleTable>
            <p>
              They cluster around $210/sqft. Your subject is 1,450 finished square
              feet, so 1,450 × $210 ≈ $304,500 — round down to $300,000 to stay
              honest. Then sanity-check against the{" "}
              <strong>neighborhood ceiling</strong>: if the nicest renovated homes
              on the street top out around $310,000, no kitchen you install makes
              yours worth $340,000. You cannot renovate a house above what the
              block supports, and nearly every over-ambitious ARV traces back to
              ignoring that ceiling.
            </p>

            <h2>The rehab number: the other half of the equation</h2>
            <p>
              ARV sets the top of the deal; the repair estimate sets how much of
              it you keep. Get the rehab wrong and the 70% rule faithfully hands
              you a 70%-rule price screen that&apos;s also wrong. Build the rehab
              number from contractor bids or the rehab cost estimator&apos;s line
              items; per-square-foot costs vary widely with local labor and
              materials.
            </p>
            <p>
              On the 1,450-sqft subject, the example&apos;s $45,000 works out to
              about $31/sqft. Whatever number you build bottom-up from a
              contractor walk-through, add a contingency — the rehab cost
              estimator starts at 10%, and the older the house, the higher it
              should go — because the expensive surprises (knob-and-tube
              wiring, a failed sewer lateral, rot behind the tub) are the ones you
              find after demolition, not before. The{" "}
              <Link
                href="/tools/rehab-cost-estimator"
                className="tc-link"
              >
                rehab cost estimator
              </Link>{" "}
              and the full{" "}
              <Link
                href="/blog/how-to-estimate-rehab-costs"
                className="tc-link"
              >
                framework for pricing a scope
              </Link>{" "}
              are worth using before you ever plug a number into the rule.
            </p>

            <h2>Why 70% isn&apos;t always the right number</h2>
            <p>
              The single biggest mistake with the 70% rule is treating the 70 as
              a law of physics. It&apos;s a stand-in for a specific bundle of
              cost-and-profit assumptions, and when those assumptions don&apos;t
              hold, the multiplier should move. Fixed costs are the reason.
              Commissions scale with ARV, but a title search, a dumpster, six
              months of insurance, and a permit cost about the same on a $130,000
              house as on a $400,000 one — so on cheap houses those fixed costs
              eat a much bigger share of a much smaller spread.
            </p>
            <ArticleTable label="Data table">
              <table>
                <thead>
                  <tr>
                    <th className="text-left">Situation</th>
                    <th className="text-left">What&apos;s different</th>
                    <th className="text-right">Screen as % of ARV</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Low ARV (&lt; ~$150K), cheaper market</td>
                    <td>Fixed costs are a big share of a small spread</td>
                    <td className="text-right">60–65%</td>
                  </tr>
                  <tr>
                    <td>Typical ($200K–$400K), moderate rehab</td>
                    <td>The rule&apos;s home turf</td>
                    <td className="text-right">70%</td>
                  </tr>
                  <tr>
                    <td>High ARV (&gt; ~$600K), light rehab</td>
                    <td>Fat spread; costs are a small share</td>
                    <td className="text-right">72–75%</td>
                  </tr>
                  <tr>
                    <td>Long or heavy rehab (9+ months)</td>
                    <td>Holding costs balloon</td>
                    <td className="text-right">drop 3–5 pts</td>
                  </tr>
                  <tr>
                    <td>Red-hot seller&apos;s market</td>
                    <td>Competition; win rate falls at 70%</td>
                    <td className="text-right">72–75%*</td>
                  </tr>
                </tbody>
              </table>
            </ArticleTable>
            <p>
              <em>
                *Higher isn&apos;t permission to overpay — it&apos;s a warning
                that a thinner margin needs a tighter rehab number and a faster
                exit.
              </em>{" "}
              None of these adjustments break the rule; they remind you that 70%
              encodes a set of numbers, and your numbers might differ. When they
              do, back into the multiplier from the real costs rather than
              defending the 70 out of habit.
            </p>

            <h2>The BRRRR version: the 75% refinance tie-in</h2>
            <p>
              Buy-and-hold investors use the same skeleton with a different
              destination. In a{" "}
              <Link
                href="/blog/brrrr-method-explained"
                className="tc-link"
              >
                BRRRR deal
              </Link>{" "}
              you&apos;re not selling — you refinance the finished rental and pull
              your cash back out to do it again. The binding constraint is the
              refinance. There is no universal cash-out ceiling: maximum LTV
              (for a conforming cash-out refinance of an investment property,{" "}
              <a
                href="https://sf.freddiemac.com/general/maximum-ltv-tltv-htltv-ratio-requirements-for-conforming-and-super-conforming-mortgages"
                className="tc-link"
              >
                Freddie Mac allows up to 75% on one unit and 70% on 2-4 units
              </a>
              ), eligible value, seasoning (
              <a
                href="https://selling-guide.fanniemae.com/sel/b2-1.3-03/cash-out-refinance-transactions"
                className="tc-link"
              >
                Fannie Mae generally requires six months on title
              </a>
              ), appraisal treatment, and approval vary by lender, program,
              borrower, and property. The 75% case below is
              an editable planning scenario, not a loan quote, appraisal, or
              promise that capital can be recovered.
            </p>
            <p>
              Run our house as a BRRRR. ARV $300,000, so a 75% cash-out refinance
              funds a new loan of $225,000. Buy at the 70%-rule price of $165,000
              and add $45,000 of rehab, and your all-in on the property is
              $210,000. In the simplified scenario, a $225,000 gross new loan
              exceeds that purchase-plus-rehab amount by $15,000 before payoff,
              lender, closing, holding, and other costs. Actual proceeds depend
              on approval, eligible value, payoff, fees, and closing figures; the
              scenario does not promise that little or no cash remains invested.
              That potential capital recycling is the appeal of BRRRR, and
              it&apos;s why the 70% purchase cap fits so naturally: the roughly
              five-point gap between the 70% you paid and a 75% refinance, where
              one is available, is about the room the transaction costs need. Miss high on
              the rehab or drag the timeline and you leave more cash in — the{" "}
              <Link
                href="/blog/brrrr-method-explained"
                className="tc-link"
              >
                BRRRR workflow guide
              </Link>{" "}
              explains which inputs a complete model needs. And if the{" "}
              <Link
                href="/blog/how-to-refinance-a-rental-property"
                className="tc-link"
              >
                refinanced rental
              </Link>{" "}
              won&apos;t cash-flow after all that, the deal was never a BRRRR — it
              was a flip you forgot to sell. Pressure-test it as a{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                hold on cap rate and DSCR
              </Link>{" "}
              before you commit.
            </p>

            <h2>The honest version: solve the price backward</h2>
            <p>
              The 70% rule is triage, not underwriting. A more complete backward
              solve starts from ARV and subtracts modeled costs plus the profit
              you require, leaving the price as the remainder:
            </p>
            <ToolFormula
              formula={
                <>
                  Backward-solve price = ARV − selling − holding − buying − rehab −
                  required profit
                </>
              }
            />
            <p>
              Plug in the flip&apos;s actual figures — $19,500 selling, $15,000
              holding, $3,300 buying, $45,000 rehab, and a $50,000 target profit:
            </p>
            <ToolFormula
              formula={
                <>
                  Backward-solve price = $300,000 − $19,500 − $15,000 − $3,300 −
                  $45,000 − $50,000 = $167,200
                </>
              }
            />
            <p>
              That lands within about $2,000 of the 70% rule&apos;s $165,000 —
              which is the point. On a textbook deal the rule and the real math
              agree, so the shortcut is a fine screen. The gap only opens when
              your costs or your target profit stray from the averages the 70
              assumes — and then the backward solve is right and the rule is
              wrong. Use the rule to decide which listings are worth an hour; use
              the full solve before you sign.
            </p>

          </ArticleBody>

          {/* faqLd above is the one FAQPage node for these rows. */}
          <FaqSection
            id="faq"
            variant="inline"
            heading="FAQ"
            items={FAQS}
            structuredData={false}
            contact={null}
          />

          <ArticleBody className="mt-16">
            <h2>The bottom line</h2>
            <p>
              The 70% rule earns its place because it compresses a real
              underwriting model into one line you can run in your head on a
              listing: screen at 70% of the finished value, minus the repairs,
              and you&apos;ve usually left enough room for the costs and the profit.
              Respect what it&apos;s actually doing, though. The 70 is an average
              of assumptions about holding, selling, and margin — honest on a
              typical deal in a typical market, and quietly wrong on a cheap house,
              a long rehab, or a bidding war. Get the two inputs right first: an
              ARV disciplined by real sold comps and a neighborhood ceiling, and a
              rehab number built bottom-up with a contingency. Then use the rule to
              screen and the backward solve to commit. The free{" "}
              <Link
                href="/tools/70-percent-rule-calculator"
                className="tc-link"
              >
                70% rule calculator
              </Link>{" "}
              runs the 70%-rule price screen from your ARV and repair budget.
              The{" "}
              <Link href="/analyze" prefetch={false} className="tc-link">
                TrueCap analyzer
              </Link>{" "}
              does not model a flip. It screens the finished property as a
              rental: cash flow, cap rate, and DSCR from the price, rent, and
              loan terms you enter. Run it if you plan to hold. Confirm your own
              costs, comps, and financing terms before recording a decision; the
              70%-rule price screen is not a recommended offer.
            </p>
          </ArticleBody>
        </article>
        <PostSources
          sources={[
            {
              title: "Freddie Mac, Maximum LTV/TLTV/HTLTV Ratio Requirements for Conforming and Super Conforming Mortgages",
              url: "https://sf.freddiemac.com/general/maximum-ltv-tltv-htltv-ratio-requirements-for-conforming-and-super-conforming-mortgages",
            },
            {
              title: "Fannie Mae Selling Guide B2-1.3-03, Cash-Out Refinance Transactions",
              url: "https://selling-guide.fanniemae.com/sel/b2-1.3-03/cash-out-refinance-transactions",
            },
          ]}
        />
        <RelatedContent kind="blog" slug={SLUG} title={TITLE} className="mt-10" />
        <RelatedBlogPosts currentSlug={SLUG} />
      </ArticleMain>
      <ArticleEnd>
        <BlogStickyCta inArticleColumn />
      </ArticleEnd>
      <SiteFooter />
      <ScrollDepthTracker />
    </ArticlePage>
  );
}
