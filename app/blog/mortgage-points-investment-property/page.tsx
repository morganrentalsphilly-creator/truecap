/**
 * Blog post: are mortgage points worth it on an investment property.
 *
 * Targets queries: "mortgage points investment property", "discount points
 * rental property", "are mortgage points worth it", "buying down mortgage
 * rate rental", "should I buy points investment property", "mortgage points
 * break even", "discount points vs origination points", "points tax
 * deductible rental property".
 *
 * Angle: points are an investment with a yield (~20%/yr at 2026 pricing) and
 * a break-even (~5 years), but three things change the call for an investor
 * specifically — the lender's buydown steepness sets the real break-even, the
 * IRS makes you amortize rental points over the loan's life instead of
 * deducting them up front, and the strongest reason to buy points is often
 * qualifying a thin DSCR rather than the break-even at all. The 2026 "date the
 * rate" refinance expectation is what most often makes points a quiet loss.
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
  "Are mortgage points worth it on an investment property? (2026)";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Mortgage points on an investment property (2026)";
const DESCRIPTION =
  "Mortgage points trade cash now for a lower rate. The break-even math, the DSCR and cash-on-cash effects, and the rental tax rule that flips the answer.";
const PUBLISHED_AT = "2026-06-29";
const MODIFIED_AT = "2026-06-29";
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
    a: "One point equals 1% of the loan amount, paid in cash at closing — $2,000 on a $200,000 loan. As a rule of thumb each point buys the rate down about 0.25%, but the real ratio is set by the lender's daily rate sheet and runs anywhere from roughly 0.125% to 0.375% per point. Always ask for the buydown ladder in writing and compare the actual payment at each option instead of trusting the rule of thumb.",
  },
  {
    q: "What is the break-even on buying mortgage points?",
    a: "Divide the upfront cost by the monthly payment savings. At 2026 pricing — about a quarter-point of rate per point of cost — that lands near 60 months, roughly five years, and it barely changes whether you buy one point or four because the cost and the savings scale together. If you hold the loan past the break-even without selling or refinancing, points pay off; sell or refinance sooner and you lose money.",
  },
  {
    q: "Are points on a rental property tax-deductible?",
    a: "Not all at once. Unlike points on your primary residence, which are often deductible in the year you pay them, points on a rental or investment-property loan must be amortized — deducted in equal slices over the life of the loan — under IRS Publication 527. If you sell or refinance with a different lender before the term is up, the remaining unamortized points can usually be written off that year. Confirm the specifics with your CPA; this is not tax advice.",
  },
  {
    q: "Should I buy points or just put more money down?",
    a: "They do different jobs. A point lowers your rate, which lowers your payment and lifts your DSCR; a larger down payment shrinks the loan itself and only raises cash-on-cash when the cap rate clears the loan constant. If your constraint is qualifying — a DSCR a hair under the lender's line — points are the targeted fix. If you simply have spare cash and the deal already pencils, weigh the roughly 20% pre-tax yield on points against what those dollars do as a bigger down payment or as reserves.",
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
              At 3% nobody asked whether to buy down the rate. At 2026&apos;s
              investor rates of roughly 7%, it is one of the first questions on
              the closing call. Mortgage points — also called discount points —
              let you pay cash up front in exchange for a permanently lower
              interest rate, and the pitch is seductively simple: spend a little
              now, save every month for the life of the loan. Whether that trade
              is smart turns on three numbers most buyers never run — the
              break-even, the effect on your DSCR, and a tax rule that treats
              points on a rental differently from points on your own home. Here
              is the worked math on a $250,000 rental, and the cases where buying
              points is the right move versus an expensive reflex.
            </p>
          </header>

          <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              What a point actually buys
            </h2>
            <p>
              A discount point is a prepayment of interest. One point costs{" "}
              <strong>1% of the loan amount</strong> and lowers your note rate by
              a fixed amount the lender sets:
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-1">
              <code className="block text-sm sm:text-base text-foreground font-mono">
                1 point = 1% of the loan amount, paid at closing
              </code>
              <code className="block text-sm sm:text-base text-foreground font-mono">
                Rule of thumb: 1 point ≈ 0.25% off the rate (it varies)
              </code>
            </div>
            <p>
              On a $250,000 single-family rental bought with 20% down, you borrow{" "}
              <strong>$200,000</strong>, so one point is <strong>$2,000</strong>.
              The &quot;quarter-point per point&quot; rule is only a starting
              guess. The real ratio comes off the lender&apos;s daily rate sheet
              and can run from about 0.125% to 0.375% of rate per point depending
              on the day, the loan program, and how the secondary market is
              priced. Never accept the rule of thumb — ask for the full buydown
              ladder in writing and read the payment at each rung, because that
              steepness is what decides whether points are a bargain or a trap.
            </p>
            <p>
              Two distinctions trip people up. <strong>Discount points</strong>{" "}
              buy down your rate; <strong>origination points</strong> are simply
              a fee the lender charges to make the loan and do nothing to your
              rate — when a quote lists &quot;2 points,&quot; confirm which kind.
              And points have a mirror image: a <strong>lender credit</strong> is
              a negative point, where you accept a slightly higher rate and the
              lender hands you cash toward closing costs. That is the same lever
              pulled the other direction, and in a market where you expect to
              refinance soon it is often the smarter side of the trade.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The break-even, worked
            </h2>
            <p>
              The whole decision reduces to one ratio: how long it takes the
              monthly savings to repay the upfront cost.
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <code className="text-sm sm:text-base text-foreground font-mono">
                Break-even (months) = Cost of points ÷ Monthly payment savings
              </code>
            </div>
            <p>
              Take the $200,000 loan at a base rate of 7.0% over 30 years and
              walk down the buydown ladder at a quarter-point per point. You can
              reproduce every payment on the{" "}
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
              One point trims the payment about <strong>$33 a month</strong>, two
              points about <strong>$66</strong> — call it $33 of monthly relief
              per point at this loan size. Against a $2,000-per-point cost, that
              is a break-even of roughly <strong>60 months, five years</strong>.
              Flip the ratio around and the same fact reads as a yield: $400 of
              annual savings on a $2,000 outlay is a <strong>20% pre-tax return —
              </strong> but only for as long as you keep the loan. Points are an
              investment that pays about 20% a year, front-loaded and completely
              illiquid, and that return evaporates the day you refinance or sell.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Why the per-point break-even barely moves
            </h2>
            <p>
              Notice the break-even column hardly changes from one point to four.
              That is not a coincidence: each additional point costs another 1%
              of the loan and saves another ~0.25% of rate, so cost and savings
              climb in lockstep and their ratio stays put. Buying more points
              does not make the deal better or worse per dollar — it just scales
              the same bet up. The number that genuinely moves the break-even is
              the one variable the rule of thumb hides: <strong>how steep the
              lender&apos;s ladder is.</strong>
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
                    <td>0.375% (steep)</td>
                    <td className="text-right">$49.98</td>
                    <td className="text-right">~40 mo (3.3 yr)</td>
                  </tr>
                  <tr>
                    <td>0.250% (typical)</td>
                    <td className="text-right">$33.41</td>
                    <td className="text-right">~60 mo (5.0 yr)</td>
                  </tr>
                  <tr>
                    <td>0.125% (shallow)</td>
                    <td className="text-right">$16.75</td>
                    <td className="text-right">~119 mo (10 yr)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              Same $2,000 point, same loan — and the break-even swings from a
              reasonable three-and-a-half years to a borderline-absurd ten,
              purely on how much rate the point buys. A shallow ladder is a tell
              that the lender does not really want to sell the buydown, and at a
              ten-year break-even points almost never make sense for a rental you
              might trade out of. This is why &quot;is a quarter-point per
              point&quot; is the first thing to verify, not assume.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The rental wrinkle: you can&apos;t deduct points up front
            </h2>
            <p>
              Here is where investors get tripped up by advice written for
              homeowners. On a primary residence, the points you pay to buy the
              home are often deductible <em>in the year you pay them</em>. On a{" "}
              <strong>rental or investment property, they are not.</strong> The
              IRS treats those points as prepaid interest that must be{" "}
              <strong>amortized over the life of the loan</strong> — on a
              30-year mortgage, your $4,000 of points becomes roughly a $133
              deduction each year, not a $4,000 deduction in year one (
              <Link
                href="/blog/rental-property-tax-deductions"
                className="text-primary font-semibold hover:underline"
              >
                see the full deduction list
              </Link>
              ). That stretches the after-tax payback well past the pre-tax
              break-even.
            </p>
            <p>
              There is a saving grace: if you sell the property or refinance with
              a <em>different</em> lender before the loan&apos;s term is up, the
              points you have not yet deducted can generally be written off all
              at once in that year. So the tax tail and the refinance decision
              are linked — the same early refinance that wastes the rate buydown
              at least lets you recover the leftover deduction. The mechanics are
              specific and easy to get wrong, so treat this as the shape of the
              rule, not filing instructions, and confirm your situation with a
              CPA. None of this is tax advice.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The real reason to buy points: rescuing a DSCR
            </h2>
            <p>
              The strongest case for points often has nothing to do with the
              break-even. A lower rate means a lower payment, and a lower payment
              means a higher{" "}
              <Link
                href="/#main"
                className="text-primary font-semibold hover:underline"
              >
                debt-service-coverage ratio
              </Link>
              . When a deal is sitting just under the line a lender needs, points
              can be the cheapest way to push it over. Take the same $200,000
              loan against $18,200 of net operating income:
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
              Two points move the DSCR from 1.14 to exactly{" "}
              <strong>1.20</strong> — and if that is the lender&apos;s minimum,
              $4,000 is what unlocks the loan, the rate tier, or both. Many{" "}
              <Link
                href="/blog/dscr-loans-explained"
                className="text-primary font-semibold hover:underline"
              >
                DSCR-loan programs
              </Link>{" "}
              price in bands — 1.10, 1.20, 1.25 — so a buydown that crosses a
              band can pay for itself in a better rate quite apart from the
              monthly savings. When points are the difference between closing and
              not closing, the five-year break-even is beside the point; the
              alternative was no deal.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              What points do to cash-on-cash
            </h2>
            <p>
              Points cut two ways on returns: they raise monthly cash flow (lower
              payment) but also raise your cash in the deal (the points are cash
              out of pocket). Run both through{" "}
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
              At first glance points win cleanly — cash-on-cash climbs from 3.88%
              to 4.93% — because the ~20% yield on the points dwarfs the ~3.9% the
              rest of your cash is earning, so adding them pulls the blended
              return up. But that snapshot quietly assumes you hold the loan long
              enough to bank the full savings. It is a year-one photograph of a
              five-year bet. If you refinance in three years, you spent $4,000 to
              save about $2,400 — a real loss — even though the first statement
              looked prettier. Cash-on-cash rewards the buydown before the
              break-even has actually been earned, which is exactly why you read
              it next to the hold period, not on its own.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The 2026 refinance trap
            </h2>
            <p>
              The advice you hear most in a high-rate market is &quot;marry the
              house, date the rate&quot; — buy now, refinance when rates fall.
              That mantra and buying points are in direct conflict. A point only
              pays off if you keep the exact loan it bought down past the
              break-even, and an investor who fully expects to refinance inside
              two or three years is pre-committing to throw the buydown away. On
              the example, refinancing at month 36 turns $4,000 of points into
              about $2,400 of realized savings — you lit roughly $1,600 on fire
              for a lower rate you abandoned.
            </p>
            <p>
              So the points decision is really a conviction test about your hold
              and your rate outlook. If you believe rates are headed down and you
              will{" "}
              <Link
                href="/blog/how-to-refinance-a-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                refinance the rental
              </Link>{" "}
              within a few years, skip points — or take the lender credit and let
              someone else pay your closing costs. If you are buying a long-term
              hold, financing is unlikely to improve soon, and you intend to keep
              this loan a decade, points are a legitimate way to lower your{" "}
              <Link
                href="/blog/negative-leverage-real-estate"
                className="text-primary font-semibold hover:underline"
              >
                loan constant
              </Link>{" "}
              and widen the spread that decides whether leverage is helping you
              at all.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              When points are worth it — and when they aren&apos;t
            </h2>
            <p>
              Buy points when at least one of three things is true: you are
              holding the property and the loan well past the break-even
              (typically five-plus years at 2026 pricing); the buydown crosses a
              DSCR or rate-tier threshold that the deal otherwise misses; or the
              lender&apos;s ladder is unusually steep and the break-even falls to
              three years or so. In any of those, the math or the approval
              justifies the cash.
            </p>
            <p>
              Skip points when you expect to refinance or sell before the
              break-even, when the ladder is shallow (a quarter-point break-even
              past seven or eight years is a red flag), or when the same cash
              would do more work elsewhere — as reserves, or weighed against a
              larger{" "}
              <Link
                href="/blog/how-much-down-payment-investment-property"
                className="text-primary font-semibold hover:underline"
              >
                down payment
              </Link>
              . And do not confuse a permanent buydown with a{" "}
              <strong>temporary buydown</strong> (a 2-1 or 3-2-1): those lower the
              rate for only the first one to three years before it snaps back to
              the note rate, they are usually paid by a seller as a concession,
              and they are a cash-flow bridge, not a long-term rate cut. Underwrite
              the property at the permanent rate regardless of any temporary
              buydown attached to it.
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
              Mortgage points are not a discount; they are a trade — cash today
              for a lower payment tomorrow — and like any trade they have a price,
              a yield, and a break-even. At 2026 pricing that break-even sits near
              five years and the yield near 20% a year, but both depend entirely
              on the lender&apos;s buydown ladder and on your actually keeping the
              loan that long. For an investor, layer on two facts homeowner advice
              skips: the points are deductible only as you amortize them over the
              loan&apos;s life, and the single best reason to buy them is often to
              lift a thin{" "}
              <Link
                href="/blog/piti-explained-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                payment-driven DSCR
              </Link>{" "}
              over a lender&apos;s line rather than to chase the break-even at all.
              Run the buydown ladder, the DSCR at each rung, and your honest hold
              period together — the full{" "}
              <Link href="/" className="text-primary font-semibold hover:underline">
                TrueCap analyzer
              </Link>{" "}
              moves the payment, cash flow, DSCR, and cash-on-cash the moment you
              change the rate, so you can see what a point really buys before you
              pay for it. None of this is investment or tax advice; run your own
              numbers against your own loan terms before you commit.
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
