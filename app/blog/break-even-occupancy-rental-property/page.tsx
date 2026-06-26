/**
 * Blog post: break-even occupancy and the break-even ratio for rentals.
 *
 * Targets queries: "break-even occupancy", "break even ratio real
 * estate", "break-even rent rental property", "how much vacancy can a
 * rental survive", "break-even occupancy formula", "default ratio
 * rental", "break even point rental cash flow".
 *
 * Note: distinct from /tools/break-even-calculator, which measures the
 * PAYBACK PERIOD (months to recover cash). This post covers the OTHER
 * break-even — the occupancy/rent floor where the deal stops covering
 * its bills. The post disambiguates the two explicitly.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "break-even-occupancy-rental-property";
const TITLE = "Break-even occupancy: how much vacancy a rental can survive (2026)";
const DESCRIPTION =
  "Break-even occupancy is the rent or occupancy floor where a rental stops covering its bills. The formula, a worked 2026 example, and the DSCR-1.0 link.";
const PUBLISHED_AT = "2026-06-26";
const MODIFIED_AT = "2026-06-26";
const READING_TIME = 10;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "break-even occupancy",
    "break-even ratio real estate",
    "break-even rent rental property",
    "how much vacancy can a rental survive",
    "break-even occupancy formula",
    "default ratio rental property",
    "break-even point rental cash flow",
    "margin of safety rental property",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    title: TITLE,
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
    q: "What is break-even occupancy on a rental property?",
    a: "Break-even occupancy is the percentage of full (gross potential) rent you must collect to exactly cover operating expenses plus the mortgage payment. The formula is (annual operating expenses + annual debt service) ÷ gross potential rent. If it comes out to 86%, the property pays for itself as long as you collect at least 86% of full rent — which means you can absorb up to 14% in vacancy and non-payment before cash flow turns negative.",
  },
  {
    q: "What is a good break-even ratio for a rental?",
    a: "As a rule of thumb, investors and lenders like to see a break-even occupancy (or break-even ratio) below about 85% — that leaves at least a 15-point cushion for vacancy, turnover, and the occasional non-paying tenant. 85%–90% is workable but tight; above 90% you have very little room for error; and above 100% the property loses money even at full occupancy. It is a guideline, not a hard line, and the right threshold depends on how stable rents are in your market.",
  },
  {
    q: "How is break-even occupancy different from DSCR?",
    a: "They are two views of the same cushion. Break-even occupancy is the exact occupancy level at which DSCR falls to 1.0 — the point where net operating income equals debt service and not a dollar more. DSCR measures coverage at your projected occupancy; break-even occupancy tells you how far occupancy can fall before that coverage disappears. A deal can have a comfortable break-even occupancy and still sit just under a lender's 1.20 DSCR floor, because the two answer different questions.",
  },
  {
    q: "Is break-even occupancy the same as the break-even calculator on TrueCap?",
    a: "No — they are two different break-evens, and confusing them is common. The break-even calculator measures the payback period: how many months of cash flow it takes to return the cash you put in (down payment + closing + repairs). Break-even occupancy measures something else entirely: the rent or occupancy floor below which the property stops covering its monthly bills. One is about how fast you get your money back; the other is about how much can go wrong before you start feeding the property.",
  },
  {
    q: "Does break-even occupancy include vacancy in the expenses?",
    a: "No, and that is the point. Break-even occupancy is solved against full (gross potential) rent precisely so that vacancy becomes the variable you are testing. You put operating expenses and debt service in the numerator, full rent in the denominator, and the result tells you how much vacancy and non-payment the deal can absorb. Folding an assumed vacancy figure into the expenses would double-count it and understate your true cushion.",
  },
];

export default function BreakEvenOccupancyPost() {
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
              Cap rate and cash-on-cash tell you what a rental earns when
              everything goes right. Break-even occupancy tells you the opposite —
              how far rent can fall or vacancy can climb before the property stops
              covering its own bills. It is the quiet downside metric lenders run
              and small investors skip, and in a 2026 market of 7% money and flat
              rents, it is often the number that separates a resilient deal from a
              fragile one. Here is the formula, a worked example with the cushion
              measured to the point, and the clean bridge that ties it to DSCR.
            </p>
          </header>

          <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Two different &quot;break-evens&quot; — don&apos;t confuse them
            </h2>
            <p>
              The word &quot;break-even&quot; gets attached to two completely
              different rental metrics, so it is worth separating them up front.
              The first is the <strong>payback period</strong>: how many months of
              cash flow it takes to recover the cash you put in — down payment,
              closing costs, and initial repairs. That is what TrueCap&apos;s{" "}
              <Link
                href="/tools/break-even-calculator"
                className="text-primary font-semibold hover:underline"
              >
                break-even calculator
              </Link>{" "}
              measures, and it answers &quot;how fast do I get my money back?&quot;
            </p>
            <p>
              This article is about the <em>other</em> break-even:{" "}
              <strong>break-even occupancy</strong> (and its cousin, the break-even
              ratio). It answers a different question — &quot;how much can go wrong
              before this property stops paying for itself each month?&quot; One
              metric is about speed of return; this one is about margin of safety.
              Both matter, and the rest of this post is about the second.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The formula
            </h2>
            <p>
              Break-even occupancy is the share of full rent you have to collect to
              exactly cover everything the property costs to run and finance:
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <code className="text-sm sm:text-base text-foreground font-mono">
                Break-even occupancy = (Operating expenses + Debt service) ÷ Gross
                potential rent
              </code>
            </div>
            <p>
              Three pieces, all annual.{" "}
              <strong>Gross potential rent</strong> is what the property collects at
              100% occupancy — every unit rented, every month, no vacancy.{" "}
              <strong>Operating expenses</strong> are everything it costs to run the
              property <em>except</em> the mortgage: taxes, insurance, repairs,
              capital reserves, management, water, lawn. <strong>Debt service</strong>{" "}
              is the annual mortgage principal and interest. Notice what is{" "}
              <em>not</em> in the formula: vacancy. We deliberately solve against
              full rent so that vacancy becomes the thing the metric measures, not
              an input we bake in.
            </p>
            <p>
              The same number, framed as a percentage of income consumed, is the{" "}
              <strong>break-even ratio</strong> (lenders sometimes call it the
              default ratio). A break-even occupancy of 86% means bills eat 86% of
              full rent and 14 cents of every dollar is your cushion. The
              conventional comfort line is a break-even ratio under about{" "}
              <strong>85%</strong> — enough room to survive a 15% hit to income — but
              that is a guideline, not a law.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              A worked example: a duplex with a real cushion
            </h2>
            <p>
              Take a $300,000 duplex, 25% down ($75,000), financing $225,000 at 7%
              over 30 years. That principal-and-interest payment runs about $1,497 a
              month, or $17,964 a year (run your own number on the{" "}
              <Link
                href="/tools/mortgage-payment-calculator"
                className="text-primary font-semibold hover:underline"
              >
                mortgage payment calculator
              </Link>
              ). Each side rents for $1,400, so gross potential rent is $2,800 a
              month — $33,600 a year at full occupancy. The owner self-manages and
              pays water, with operating expenses laid out like this:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Annual operating expense</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Property taxes</td>
                    <td className="text-right">$3,600</td>
                  </tr>
                  <tr>
                    <td>Insurance</td>
                    <td className="text-right">$2,000</td>
                  </tr>
                  <tr>
                    <td>Repairs &amp; maintenance</td>
                    <td className="text-right">$2,400</td>
                  </tr>
                  <tr>
                    <td>Capital reserves</td>
                    <td className="text-right">$1,680</td>
                  </tr>
                  <tr>
                    <td>Water / lawn / admin</td>
                    <td className="text-right">$1,220</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Total operating expenses</strong>
                    </td>
                    <td className="text-right">
                      <strong>$10,900</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              Now plug in. Operating expenses ($10,900) plus debt service ($17,964)
              equal $28,864 a year of fixed cost to keep the lights on and the loan
              current. Against $33,600 of gross potential rent:
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <code className="text-sm sm:text-base text-foreground font-mono">
                $28,864 ÷ $33,600 = 0.859 → break-even occupancy ≈ 86%
              </code>
            </div>
            <p>
              So the duplex pays for itself as long as you collect at least 86% of
              full rent. You can lose up to <strong>14%</strong> of gross rent to
              vacancy and non-payment — roughly a month and a half of empty unit per
              year across the building — before monthly cash flow turns negative.
              If you underwrote a 5% vacancy assumption (95% collection), you are
              sitting nine full points above your break-even line. That gap is the
              margin of safety, and it is the thing cap rate alone never shows you.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The dollar version: break-even rent
            </h2>
            <p>
              The same math flips into a rent floor, which some investors find more
              tangible than a percentage. At full occupancy, the property breaks
              even when collected rent equals fixed cost: $28,864 ÷ 12 ={" "}
              <strong>$2,405 a month</strong>. Current rent is $2,800, so rents
              could slide about <strong>$395 a month — roughly 14%</strong> — before
              the building stops covering itself. (Same 14% as the occupancy cushion,
              which is no coincidence: a 14% rent cut and 14% vacancy hit gross
              income identically.) That is a useful sanity check against a soft
              market: if comparable rents are already drifting down and your
              break-even rent is only a hair below today&apos;s rent, the deal is
              more fragile than the headline cap rate suggests. It is the same
              instinct behind the{" "}
              <Link
                href="/blog/1-percent-rule-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                1% rule
              </Link>
              , just made precise for one specific property instead of applied as a
              blanket screen.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The clean bridge: break-even occupancy is where DSCR hits 1.0
            </h2>
            <p>
              Here is the relationship worth memorizing. Debt-service coverage ratio
              is net operating income divided by debt service. At the exact
              occupancy where the property breaks even, net operating income equals
              debt service — so{" "}
              <strong>break-even occupancy is simply the occupancy level at which
              DSCR equals 1.0</strong>. Above that line DSCR is greater than one and
              you keep cash; below it DSCR drops under one and you feed the property
              out of pocket.
            </p>
            <p>
              Check it on the duplex. At 86% occupancy, effective gross income is
              $33,600 × 0.86 ≈ $28,900; subtract $10,900 of operating expenses and{" "}
              <Link
                href="/blog/how-to-calculate-noi-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                net operating income
              </Link>{" "}
              is about $18,000 — essentially identical to the $17,964 debt service,
              for a{" "}
              <Link
                href="/tools/dscr-calculator"
                className="text-primary font-semibold hover:underline"
              >
                DSCR
              </Link>{" "}
              of 1.0. At the projected 95% occupancy, NOI is about $21,000 and DSCR
              is roughly 1.17. That second number is a reminder that the two metrics
              answer different questions: a deal can carry a comfortable 14-point
              occupancy cushion and still land just under a lender&apos;s typical
              1.20 DSCR floor. Break-even occupancy measures resilience; DSCR
              measures coverage at your assumed occupancy. You want both, and you
              want to know which one a given deal is failing.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              When the cushion collapses: the overpaid twin
            </h2>
            <p>
              Break-even occupancy is most useful as a comparison. Take the exact
              same duplex — same two units, same $2,800 of rent — but assume you win
              a bidding war and pay $340,000 instead of $300,000. Now you finance
              $255,000, the payment climbs to about $1,697 a month ($20,364 a year),
              and the higher assessed value pushes property taxes up to roughly
              $4,400, lifting operating expenses to $11,700. Same income, heavier
              cost:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Metric</th>
                    <th className="text-right">$300k (disciplined)</th>
                    <th className="text-right">$340k (overpaid)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Gross potential rent</td>
                    <td className="text-right">$33,600</td>
                    <td className="text-right">$33,600</td>
                  </tr>
                  <tr>
                    <td>Operating expenses</td>
                    <td className="text-right">$10,900</td>
                    <td className="text-right">$11,700</td>
                  </tr>
                  <tr>
                    <td>Debt service</td>
                    <td className="text-right">$17,964</td>
                    <td className="text-right">$20,364</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Break-even occupancy</strong>
                    </td>
                    <td className="text-right">
                      <strong>86%</strong>
                    </td>
                    <td className="text-right">
                      <strong>95%</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              At $340,000, fixed cost is $32,064 and break-even occupancy jumps to
              $32,064 ÷ $33,600 = <strong>95.4%</strong>. The cushion has shrunk from
              14 points to under 5. A single vacant month across the building is an
              8.3% income loss — that alone drops you below the break-even line and
              into negative cash flow for the year. The same property, the same rent,
              and a $40,000 difference in price quietly converts a resilient deal into
              one that needs near-perfect occupancy just to stay flat. The price you
              pay does not change what the building rents for; it changes how much
              bad luck the building can absorb.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Putting it to work in an underwrite
            </h2>
            <p>
              The practical move is to compute break-even occupancy and then hold it
              up against the vacancy you actually expect. If your market runs 6%
              vacancy and your deal breaks even at 86% occupancy (i.e. it tolerates
              14% vacancy), you have an 8-point margin — healthy. If the same market
              meets a deal that breaks even at 95%, your realistic vacancy already
              eats most of the room, and one bad tenant turns the year red. The
              honest vacancy figure to compare against is its own exercise, covered
              in{" "}
              <Link
                href="/blog/vacancy-rate-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                what vacancy rate to assume
              </Link>
              .
            </p>
            <p>
              A rough set of benchmarks for single-family and small multifamily:
              under 85% break-even occupancy is comfortable; 85%–90% is workable but
              worth a second look at your expense estimates; above 90% is thin and
              demands a stable rental market; and anything at or above 100% means the
              property loses money even fully occupied — an appreciation bet, not a
              cash-flow deal. One honest caveat on the math: we treated operating
              expenses as fixed. In reality, percentage-based costs like property
              management (typically 8%–10% of collected rent) shrink as collections
              fall, which nudges your true break-even occupancy slightly lower. It is
              a small, conservative-leaning simplification — your real cushion is a
              touch larger than the fixed-cost formula implies, which is the right
              direction to be wrong in.
            </p>
            <p>
              Break-even occupancy also sits naturally alongside the expense-side
              heuristics you may already use. The{" "}
              <Link
                href="/blog/50-percent-rule-rentals"
                className="text-primary font-semibold hover:underline"
              >
                50% rule
              </Link>{" "}
              gives you a fast gut-check on operating expenses; break-even occupancy
              takes those expenses plus the actual loan and turns them into a single
              resilience number you can compare across deals. Run it on every
              property and you start to feel the difference between a deal that earns
              a little and a deal that can take a punch.
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
              Break-even occupancy is the cheapest insurance in underwriting: one
              division that tells you how much vacancy, turnover, and non-payment a
              deal can absorb before it starts costing you money. Add up operating
              expenses and debt service, divide by full rent, and compare the result
              to the vacancy you actually expect. A disciplined purchase price buys
              you cushion; an aggressive one spends it. The full{" "}
              <Link href="/" className="text-primary font-semibold hover:underline">
                TrueCap analyzer
              </Link>{" "}
              runs this for you — enter a property and it returns cash flow, cap
              rate, DSCR, and the occupancy your deal needs to stay above water, so
              you see the downside before you sign, not after the first vacancy.
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
