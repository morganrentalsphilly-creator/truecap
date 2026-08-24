/**
 * Blog post: the 70% rule for house flipping (and BRRRR).
 *
 * Targets queries: "70 percent rule house flipping", "70% rule real
 * estate", "how to calculate offer ceiling flip", "70%-rule offer ceiling",
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
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "70-percent-rule-house-flipping";
const TITLE =
  "The 70% rule for house flipping (and BRRRR): calculate an Offer Ceiling (2026)";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "70% rule for flipping: Offer Ceiling (2026)";
const DESCRIPTION =
  "The 70% rule caps your offer at 70% of ARV minus repairs. Here's the formula, a worked flip and BRRRR example, and when 70% is the wrong number.";
const PUBLISHED_AT = "2026-07-05";
const MODIFIED_AT = "2026-07-05";
const READING_TIME = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "70 percent rule house flipping",
    "70% rule real estate",
    "Offer Ceiling",
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
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const FAQS = [
  {
    q: "What is the 70% rule in house flipping?",
    a: "It's a rule of thumb that calculates a screening boundary at 70% of a property's projected ARV minus repairs. On a property modeled at $300,000 renovated with $45,000 of work, the 70%-rule Offer Ceiling is (0.70 × $300,000) − $45,000 = $165,000. The 30% held back is not all profit; it covers buying, holding, and selling costs first. This is not a recommended offer or appraisal.",
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
    a: "It still works as a screen, but 70 was never a universal number. Higher financing costs — hard money runs roughly 9.5–13% plus points in 2026 — make holding costs a bigger drag on long rehabs, which argues for a lower multiplier on heavy projects. On cheap houses, fixed costs push you toward 60–65%; on expensive houses with light work, 72–75% can be justified. Treat 70% as the center of a range, not a law.",
  },
  {
    q: "What if there aren't good comparable sales?",
    a: "Thin comps are a real risk because ARV drives the rule. Widen the search carefully and adjust for relevant differences. If you still cannot support a credible ARV, label the uncertainty, test a wider margin, and verify before recording a decision. An Offer Ceiling built on a guessed ARV is still a guess.",
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
    author: { "@type": "Person", name: "Morgan Page", url: siteUrl },
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntityOfPage: canonicalUrl,
    image: [`${siteUrl}/home.jpg`],
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "TrueCap", item: `${siteUrl}/` },
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
              Every flip and every BRRRR deal is won or lost at the offer. Pay
              too much and no amount of hustle on the rehab earns it back — the
              spread you needed was gone before you got the keys. The 70% rule is
              the back-of-the-napkin screen investors use to keep that from
              happening: it caps what you offer at 70% of the finished value,
              minus what the repairs will cost. It fits on an index card, it
              works often enough to be worth memorizing, and — like every rule of
              thumb — it quietly lies in exactly the situations where the money is
              biggest. Here is the formula, a full worked flip, how to pin down
              the two inputs that actually drive it, the version BRRRR investors
              use, and when 70% is the wrong number.
            </p>
          </header>

          <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              What the 70% rule actually says
            </h2>
            <p>
              The rule calculates a <strong>70%-rule Offer Ceiling</strong>—a
              screening boundary intended to leave room for modeled costs and profit:
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <code className="text-sm sm:text-base text-foreground font-mono">
                Offer Ceiling = (ARV × 0.70) − Repair costs
              </code>
            </div>
            <p>
              <strong>ARV</strong> is the after-repair value: what the property
              will sell for once it&apos;s fixed up, not what it&apos;s worth
              today in its current condition. <strong>Repair costs</strong> are
              your all-in rehab budget. Everything hinges on those two numbers,
              and we&apos;ll spend most of this post on getting them right. Take a
              house you expect to be worth $300,000 renovated that needs $45,000
              of work:
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <code className="text-sm sm:text-base text-foreground font-mono">
                Offer Ceiling = (0.70 × $300,000) − $45,000 = $165,000
              </code>
            </div>
            <p>
              So you offer no more than $165,000 — not because that&apos;s what
              the seller wants or what the property is worth in its current
              condition, but because it leaves 30% of the finished value to cover
              everything between the contract and the closing on the resale, plus
              your profit. (The free{" "}
              <Link
                href="/tools/arv-calculator"
                className="text-primary font-semibold hover:underline"
              >
                ARV calculator
              </Link>{" "}
              runs this exact formula against your own comps — the comps-based
              ARV, the Offer Ceiling at any multiplier, and the 75% refi line in one
              screen. Already have the ARV? The free{" "}
              <Link
                href="/tools/70-percent-rule-calculator"
                className="text-primary font-semibold hover:underline"
              >
                70% rule calculator
              </Link>{" "}
              shows the Offer Ceiling at 60/65/70/75% side by side.)
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Where the other 30% goes
            </h2>
            <p>
              The 30% you held back isn&apos;t profit — it&apos;s profit plus
              every cost the formula doesn&apos;t name. On a $300,000 ARV, that
              spread is $90,000 (ARV × 0.30), and it has to stretch over four
              things:
            </p>
            <ul className="list-disc pl-6 space-y-1">
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
              systematically overpay. The 70% is calibrated so that, on a normal
              deal, the first three eat roughly 12–14% of ARV and your profit is
              the remaining 16–17%. Change any of those assumptions — a longer
              hold, a pricier market, a thinner margin — and the right multiplier
              moves off 70%.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              A full worked flip
            </h2>
            <p>
              Numbers make the 30% concrete. Buy the house at the $165,000 max
              offer, put $45,000 into it, and sell it six months later at the
              $300,000 ARV. Here is the whole ledger:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Line</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>At Offer Ceiling</td>
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
            </div>
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
                className="text-primary font-semibold hover:underline"
              >
                Hard money
              </Link>{" "}
              in 2026 runs roughly 9.5–13% plus 1.5–3 points, so on a $165,000
              loan held six months you&apos;re paying about $9,000 in interest and
              $3,300 in points before you replace a single fixture. Investors who
              forget that commissions and holding costs scale with the deal — not
              with the bargain price they paid — are the ones whose
              &quot;guaranteed&quot; $70,000 profit shows up at closing as
              $50,000.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              ARV: the input that matters most
            </h2>
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
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
            </div>
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

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The rehab number: the other half of the equation
            </h2>
            <p>
              ARV sets the top of the deal; the repair estimate sets how much of
              it you keep. Get the rehab wrong and the 70% rule faithfully hands
              you an Offer Ceiling that&apos;s also wrong. A rough 2026 scope-to-cost
              ladder, per finished square foot:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Cosmetic</strong> (paint, flooring, fixtures, minor
                kitchen): ~$15–25/sqft
              </li>
              <li>
                <strong>Moderate</strong> (full kitchen and baths, some systems,
                curb appeal): ~$30–50/sqft
              </li>
              <li>
                <strong>Full gut or major systems</strong> (roof, HVAC,
                electrical, plumbing, layout): ~$60–90/sqft
              </li>
            </ul>
            <p>
              On the 1,450-sqft subject, a moderate rehab at about $31/sqft is the
              $45,000 in the example. Whatever number you build bottom-up from a
              contractor walk-through, add a contingency of 10–25% — the older the
              house, the higher — because the expensive surprises (knob-and-tube
              wiring, a failed sewer lateral, rot behind the tub) are the ones you
              find after demolition, not before. The{" "}
              <Link
                href="/tools/rehab-cost-estimator"
                className="text-primary font-semibold hover:underline"
              >
                rehab cost estimator
              </Link>{" "}
              and the full{" "}
              <Link
                href="/blog/how-to-estimate-rehab-costs"
                className="text-primary font-semibold hover:underline"
              >
                framework for pricing a scope
              </Link>{" "}
              are worth using before you ever plug a number into the rule.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Why 70% isn&apos;t always the right number
            </h2>
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Situation</th>
                    <th className="text-left">What&apos;s different</th>
                    <th className="text-right">Offer as % of ARV</th>
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
            </div>
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

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The BRRRR version: the 75% refinance tie-in
            </h2>
            <p>
              Buy-and-hold investors use the same skeleton with a different
              destination. In a{" "}
              <Link
                href="/blog/brrrr-method-explained"
                className="text-primary font-semibold hover:underline"
              >
                BRRRR deal
              </Link>{" "}
              you&apos;re not selling — you refinance the finished rental and pull
              your cash back out to do it again. The binding constraint is the
              refinance. There is no universal cash-out ceiling: maximum LTV,
              eligible value, seasoning, appraisal treatment, and approval vary
              by lender, program, borrower, and property. The 75% case below is
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
              five-point gap between the 70% you paid and the 75% you can
              refinance is about the room the transaction costs need. Miss high on
              the rehab or drag the timeline and you leave more cash in — the{" "}
              <Link
                href="/tools/brrrr-calculator"
                className="text-primary font-semibold hover:underline"
              >
                BRRRR calculator
              </Link>{" "}
              shows exactly how much. And if the{" "}
              <Link
                href="/blog/how-to-refinance-a-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                refinanced rental
              </Link>{" "}
              won&apos;t cash-flow after all that, the deal was never a BRRRR — it
              was a flip you forgot to sell. Pressure-test it as a{" "}
              <Link
                href="/tools/cap-rate-calculator"
                className="text-primary font-semibold hover:underline"
              >
                hold on cap rate and DSCR
              </Link>{" "}
              before you commit.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The honest version: solve the offer backward
            </h2>
            <p>
              The 70% rule is triage, not underwriting. A more complete Offer Ceiling starts
              from ARV and subtracts modeled costs plus
              the profit you require, leaving the price as the remainder:
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <code className="text-sm sm:text-base text-foreground font-mono">
                Offer Ceiling = ARV − selling − holding − buying − rehab − required
                profit
              </code>
            </div>
            <p>
              Plug in the flip&apos;s actual figures — $19,500 selling, $15,000
              holding, $3,300 buying, $45,000 rehab, and a $50,000 target profit:
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <code className="text-sm sm:text-base text-foreground font-mono">
                Offer Ceiling = $300,000 − $19,500 − $15,000 − $3,300 − $45,000 −
                $50,000 = $167,200
              </code>
            </div>
            <p>
              That lands within about $2,000 of the 70% rule&apos;s $165,000 —
              which is the point. On a textbook deal the rule and the real math
              agree, so the shortcut is a fine screen. The gap only opens when
              your costs or your target profit stray from the averages the 70
              assumes — and then the backward solve is right and the rule is
              wrong. Use the rule to decide which listings are worth an hour; use
              the full solve before you sign.
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
              The 70% rule earns its place because it compresses a real
              underwriting model into one line you can run in your head on a
              listing: offer 70% of the finished value, minus the repairs, and
              you&apos;ve usually left enough room for the costs and the profit.
              Respect what it&apos;s actually doing, though. The 70 is an average
              of assumptions about holding, selling, and margin — honest on a
              typical deal in a typical market, and quietly wrong on a cheap house,
              a long rehab, or a bidding war. Get the two inputs right first: an
              ARV disciplined by real sold comps and a neighborhood ceiling, and a
              rehab number built bottom-up with a contingency. Then use the rule to
              screen and the backward solve to commit. The{" "}
              <Link href="/" className="text-primary font-semibold hover:underline">
                TrueCap analyzer
              </Link>{" "}
              runs a property&apos;s Offer Ceiling, cash flow, cap rate, and DSCR from
              the same inputs — so whether you&apos;re flipping it or holding it,
              you can see the number that protects your spread before you write the
              offer. None of this is investment or lending advice; confirm your own
              costs, comps, and financing terms before recording a decision. The Offer Ceiling is not a recommended offer.
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
