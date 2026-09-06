/**
 * Blog post: operating expense ratio (OER) for a rental property.
 *
 * Targets queries: "operating expense ratio", "OER real estate",
 * "what is a good operating expense ratio", "operating expense ratio
 * rental property", "how to calculate operating expense ratio", "opex
 * ratio rental", "operating expense ratio formula".
 *
 * Angle: OER is the measured efficiency metric appraisers and lenders
 * use — operating expenses ÷ effective gross income — not the 50% rule
 * heuristic. Give the formula, the strict in/out inclusion rules (the
 * four things that aren't operating expenses), a full line-by-line
 * duplex example, 2026 benchmark bands, the exact reconciliation to the
 * 50% rule, and the OER → NOI → cap rate → value ripple. Slots into the
 * NOI / cap-rate / 50%-rule cluster and funnels into the NOI + cap-rate
 * calculators and the analyzer.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { RelatedContent } from "@/components/marketing/related-content";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "operating-expense-ratio-rental-property";
const TITLE_PLAIN =
  "Operating expense ratio (OER): what's a good one for a rental? (2026)";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE_PLAIN.
const SERP_TITLE = "Operating expense ratio (OER) for rentals (2026)";
const DESCRIPTION =
  "OER = operating expenses ÷ effective gross income. The formula, what counts (and what doesn't), 2026 benchmark bands, and a worked duplex.";
const PUBLISHED_AT = "2026-07-06";
const MODIFIED_AT = "2026-07-06";
const READING_TIME = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "operating expense ratio",
    "OER real estate",
    "what is a good operating expense ratio",
    "operating expense ratio rental property",
    "how to calculate operating expense ratio",
    "opex ratio rental",
    "operating expense ratio formula",
    "operating expenses rental property",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    title: SERP_TITLE,
    description: DESCRIPTION,
    url: `/blog/${SLUG}`,
    type: "article",
    publishedTime: PUBLISHED_AT,
    modifiedTime: MODIFIED_AT,
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE_PLAIN }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const FAQS = [
  {
    q: "What is a good operating expense ratio for a rental property?",
    a: "For a typical single-family or small multifamily rental in 2026, a healthy OER runs about 40–50% of effective gross income. Newer, well-run properties in low-tax areas can sit in the 30s; older buildings with owner-paid utilities in high-tax metros routinely run 50–60% or more. There is no universally 'good' number — a higher OER isn't automatically bad if the rents are high enough that the property still throws off strong NOI. OER measures efficiency, not profitability.",
  },
  {
    q: "How do you calculate the operating expense ratio?",
    a: "Divide total annual operating expenses by effective gross income (gross rent plus other income, minus vacancy and collection loss). On a duplex collecting $28,200 of effective income with $11,156 of operating expenses, the OER is $11,156 ÷ $28,200 ≈ 40%. Include taxes, insurance, management, repairs, owner-paid utilities, and reserves; exclude the mortgage, depreciation, and income taxes.",
  },
  {
    q: "Does the operating expense ratio include the mortgage?",
    a: "No. Debt service — your mortgage principal and interest — is a financing cost, not an operating cost, so it sits below net operating income and is never part of the OER. That's deliberate: OER is meant to describe how the property runs regardless of how any particular buyer financed it, so two investors with different loans can compare the same building on equal footing. Putting the mortgage in the numerator is the single most common OER mistake.",
  },
  {
    q: "What's the difference between the OER and the 50% rule?",
    a: "The 50% rule is the napkin version of the OER. It says operating costs run roughly half of gross rent, and it bundles vacancy and capital reserves into that 'half' while excluding the mortgage. The OER is the measured metric: actual operating expenses divided by effective (post-vacancy) income. On the same duplex the 50% rule flags about $15,000 of all-in costs against $30,000 of gross rent, while the precise OER lands near 40–46% of the $28,200 of effective income. The rule screens; the ratio underwrites.",
  },
];

export default function OperatingExpenseRatioPost() {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/blog/${SLUG}`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: TITLE_PLAIN,
    description: DESCRIPTION,
    datePublished: PUBLISHED_AT,
    dateModified: MODIFIED_AT,
    url: canonicalUrl,
    author: { "@type": "Person", "@id": `${siteUrl}/about#morgan`, name: "Morgan Page", url: `${siteUrl}/about` },
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
      { "@type": "ListItem", position: 3, name: TITLE_PLAIN, item: canonicalUrl },
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
              Operating expense ratio (OER): what&apos;s a good one for a
              rental? (2026)
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
              Two rentals can collect the exact same rent and be worth wildly
              different amounts, because one keeps 60 cents of every rent dollar
              and the other keeps 40. The operating expense ratio is the number
              that tells you which is which. It&apos;s the metric appraisers and
              commercial lenders reach for first — a one-line read on how
              efficiently a property runs, and the hinge that quietly sets your
              net operating income, your cap rate, and what the building is
              actually worth. Here is the formula, the strict rules for what
              counts as an operating expense and what doesn&apos;t, a
              line-by-line worked example, honest 2026 benchmarks, and the
              reason a wrong OER assumption can misprice a deal by tens of
              thousands of dollars.
            </p>
          </header>

          <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              What the operating expense ratio measures
            </h2>
            <p>
              The operating expense ratio is the share of a property&apos;s
              income that gets eaten by the cost of running it:
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <code className="text-sm sm:text-base text-foreground font-mono">
                OER = Operating expenses ÷ Effective gross income
              </code>
            </div>
            <p>
              <strong>Effective gross income</strong> (EGI) is all the money the
              property actually brings in: gross potential rent, plus any other
              income like laundry or parking, minus vacancy and collection loss.
              It&apos;s the top line after you&apos;ve been honest about empty
              units — not the rent roll&apos;s dream number.{" "}
              <strong>Operating expenses</strong> are what it costs to keep the
              property running and rentable this year — taxes, insurance,
              management, repairs, utilities the owner pays, and so on. Divide
              one by the other and you get a percentage. An OER of 45% means 45
              cents of every effective rent dollar goes to running costs, and 55
              cents survives as{" "}
              <Link
                href="/blog/how-to-calculate-noi-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                net operating income
              </Link>
              . Lower is more efficient; higher means the property works harder
              to keep less.
            </p>
            <p>
              That last point is why OER matters more than it looks. NOI, cap
              rate, and — for anything a bank underwrites on its economics —
              value all sit downstream of this one ratio. Miss it and every
              number built on top of it is wrong in the same direction.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              What counts as an operating expense — and what doesn&apos;t
            </h2>
            <p>
              The ratio is only as honest as the line items you feed it, and the
              classification is where most people go wrong. An operating expense
              is a recurring cost of running the property that any owner would
              face regardless of how they financed it. That includes:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Property taxes and insurance</li>
              <li>Property management (even if you self-manage — more below)</li>
              <li>Repairs and maintenance</li>
              <li>Utilities the owner pays (water/sewer, trash, common-area electric)</li>
              <li>HOA dues, landscaping, snow removal, pest control</li>
              <li>Licensing, turnover/advertising, and property-level accounting or legal</li>
              <li>Replacement reserves for big-ticket items (by appraisal convention)</li>
            </ul>
            <p>
              Four costs are <strong>not</strong> operating expenses, and folding
              any of them in wrecks the ratio:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>The mortgage.</strong> Principal and interest are
                financing, not operations. Debt service lives below NOI, so it
                never touches the OER.
              </li>
              <li>
                <strong>Depreciation.</strong> A paper deduction on your tax
                return, not a cash cost of running the building.
              </li>
              <li>
                <strong>Capital expenditures.</strong> A new roof or a full HVAC
                replacement is a capital item, not an operating one — though a
                <em> reserve</em> that sets money aside for it is a legitimate
                operating line. Book the reserve, not the lumpy replacement.
              </li>
              <li>
                <strong>Your income taxes.</strong> Personal to you, not to the
                property.
              </li>
            </ul>
            <p>
              One more trap: <strong>vacancy is not an operating expense.</strong>{" "}
              It&apos;s a deduction from gross rent that you take to <em>reach</em>{" "}
              effective gross income — the denominator — so it&apos;s already
              accounted for. Investors who list vacancy up in the expense column
              are double-counting it and inflating the ratio. If you want to
              pressure-test the assumption that drives that denominator, the{" "}
              <Link
                href="/tools/vacancy-rate-calculator"
                className="text-primary font-semibold hover:underline"
              >
                vacancy rate calculator
              </Link>{" "}
              derives it from turnover instead of guessing 5%.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              A worked example: the $250K duplex
            </h2>
            <p>
              Take a $250,000 duplex, two units at $1,250/month, so $30,000 of
              gross potential rent a year. Assume 6% vacancy and collection loss,
              which knocks $1,800 off the top and leaves{" "}
              <strong>$28,200 of effective gross income</strong>. Here are the
              operating expenses, line by line:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Operating expense</th>
                    <th className="text-right">Annual</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Property taxes</td>
                    <td className="text-right">$3,600</td>
                  </tr>
                  <tr>
                    <td>Insurance</td>
                    <td className="text-right">$1,500</td>
                  </tr>
                  <tr>
                    <td>Property management (8% of EGI)</td>
                    <td className="text-right">$2,256</td>
                  </tr>
                  <tr>
                    <td>Repairs &amp; maintenance</td>
                    <td className="text-right">$1,700</td>
                  </tr>
                  <tr>
                    <td>Water / sewer / trash</td>
                    <td className="text-right">$1,400</td>
                  </tr>
                  <tr>
                    <td>Landscaping, pest, licensing, admin</td>
                    <td className="text-right">$700</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Total operating expenses</strong>
                    </td>
                    <td className="text-right">
                      <strong>$11,156</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              So the ratio is $11,156 ÷ $28,200 ≈ <strong>40%</strong>, and NOI
              is $28,200 − $11,156 = <strong>$17,044</strong>, a 6.8% cap rate on
              the $250,000 price. But notice what&apos;s missing: reserves. Add a
              modest <strong>$1,700 replacement reserve</strong> — the appraiser
              always does — and operating expenses climb to $12,856, the OER
              rises to <strong>about 46%</strong>, and NOI falls to $15,344, a
              6.1% cap rate. That single decision, whether to book reserves, is
              worth six points of OER and 0.7 points of cap rate on the very same
              building. It&apos;s the classic{" "}
              <Link
                href="/blog/capex-maintenance-reserves-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                reserves-and-CapEx question
              </Link>
              , and it&apos;s the difference between a ratio that flatters the
              deal and one that tells the truth.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              What&apos;s a good OER? Honest 2026 benchmarks
            </h2>
            <p>
              There is no single right answer, because the ratio depends heavily
              on the age of the building, who pays the utilities, and how
              punishing the local tax bill is. As a working set of 2026 bands,
              measured on effective gross income and excluding debt service:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Property profile</th>
                    <th className="text-right">Typical OER</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Newer build, tenant-paid utilities, low-tax metro</td>
                    <td className="text-right">30–40%</td>
                  </tr>
                  <tr>
                    <td>Typical SFR / small multifamily, moderate age</td>
                    <td className="text-right">40–50%</td>
                  </tr>
                  <tr>
                    <td>Older building, owner-paid utilities, high-tax metro</td>
                    <td className="text-right">50–60%</td>
                  </tr>
                  <tr>
                    <td>Class C, heavy turnover, all-bills-paid</td>
                    <td className="text-right">60%+</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Two cautions before you use these. First, a high OER isn&apos;t
              automatically a bad deal — a building can run at 55% and still be a
              strong buy if the rents are high enough that the remaining 45%
              produces plenty of NOI. OER measures <em>efficiency</em>, not
              <em> profitability</em>; pair it with cash flow and cap rate before
              you judge. Second, the bands only compare fairly across properties
              with the same utility and tax structure. An all-bills-paid building
              will always post a higher OER than an identical one where tenants
              pay their own power — that&apos;s a difference in who holds the
              expense, not in how well the property is run.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              OER and the 50% rule are the same idea
            </h2>
            <p>
              If the ratio feels familiar, it should: the{" "}
              <Link
                href="/blog/50-percent-rule-rentals"
                className="text-primary font-semibold hover:underline"
              >
                50% rule
              </Link>{" "}
              is just the OER done on a napkin. The rule says operating costs run
              about half of gross rent — but the version investors actually quote
              bundles vacancy and reserves into that &quot;half&quot; and
              measures against gross rent rather than effective income. Line the
              two up on our duplex and they nearly touch. Operating expenses
              ($11,156) plus vacancy ($1,800) plus reserves ($1,700) come to
              $14,656 — about <strong>49% of the $30,000 gross rent</strong>,
              almost exactly what the 50% rule predicts.
            </p>
            <p>
              The difference is precision and denominator. The 50% rule is a
              five-second screen against gross rent that lets you triage a
              listing before you&apos;ve gathered a single real number. The OER
              is the measured metric against effective income that you compute
              once you have the actuals — the version that survives a lender&apos;s
              or an appraiser&apos;s review. Use the rule to decide whether a
              deal is worth an hour; use the OER when you sit down to underwrite
              it.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              From OER to value: why the ratio moves the price
            </h2>
            <p>
              Here&apos;s the part that turns OER from a trivia number into a
              money number. Value on any income property a bank underwrites runs
              through NOI, and NOI is just effective income times one minus the
              OER:
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <code className="text-sm sm:text-base text-foreground font-mono">
                NOI = EGI × (1 − OER) &nbsp;→&nbsp; Value = NOI ÷ market cap rate
              </code>
            </div>
            <p>
              Because value is a multiple of NOI, and NOI moves one-for-one with
              the OER, a small error in the ratio levers into a large error in
              the price. Underwrite our duplex at a rosy{" "}
              <strong>35% OER</strong> — the number you get by lowballing
              management and skipping reserves — and NOI reads $28,200 × 0.65 =
              $18,330. Run it honestly at the <strong>~46%</strong> we built line
              by line, and NOI is $15,344. At a 6.5% market cap rate, that&apos;s
              the difference between a <strong>$282,000</strong> valuation and a{" "}
              <strong>$236,000</strong> one — about{" "}
              <strong>$46,000</strong> of value riding on an eleven-point
              assumption about operating efficiency. Nobody argues over a $46,000
              price cut, but plenty of investors wave through the OER assumption
              that causes it. The free{" "}
              <Link
                href="/analyze"
                className="text-primary font-semibold hover:underline"
              >
                TrueCap analyzer
              </Link>{" "}
              lets you watch that swing move as you change the expense lines:
              NOI and cap rate re-price together, line by line.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Five ways people get OER wrong
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Putting the mortgage in the numerator.</strong> Debt
                service is financing, not operations. It belongs below NOI. This
                is the error that turns a 45% property into a &quot;75% OER
                disaster&quot; that doesn&apos;t exist.
              </li>
              <li>
                <strong>Double-counting vacancy.</strong> Vacancy is netted out
                of income to reach EGI. Listing it again as an expense inflates
                the ratio and understates NOI.
              </li>
              <li>
                <strong>Zeroing out management because you self-manage.</strong>{" "}
                Your time isn&apos;t free, and a future buyer will price in 8–10%
                for a manager. Leave it in, or your OER is a personal number that
                doesn&apos;t transfer with the property.
              </li>
              <li>
                <strong>Skipping reserves entirely.</strong> An OER with no line
                for the roof, the furnace, or the parking lot looks great right
                up until one of them fails. It&apos;s the most common way a deal
                pencils on paper and bleeds in real life.
              </li>
              <li>
                <strong>Comparing across different utility or tax setups.</strong>{" "}
                An all-bills-paid or high-tax property carries a structurally
                higher OER. Normalize for who pays what before you rank two
                buildings against each other.
              </li>
            </ul>

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
              The operating expense ratio is the cleanest one-number read on how
              hard a property has to work to keep what it earns. Compute it
              honestly — operating expenses over effective gross income, with
              reserves in and the mortgage, depreciation, capital items, and
              vacancy out — and it tells you at a glance whether a building runs
              efficiently, how it stacks up against comparable properties, and
              exactly how much NOI survives to drive value. Get lazy with the
              inputs and it becomes a flattering fiction that talks you into
              overpaying. Anchor it against the{" "}
              <Link
                href="/blog/50-percent-rule-rentals"
                className="text-primary font-semibold hover:underline"
              >
                50% rule
              </Link>{" "}
              as a sanity check, and let the{" "}
              <Link href="/" className="text-primary font-semibold hover:underline">
                TrueCap analyzer
              </Link>{" "}
              carry the operating expenses straight through to NOI, cap rate,
              cash flow, and DSCR — so the ratio you assume and the modeled result
              always come from the same set of numbers. None of this is
              investment advice; confirm the actual expenses, taxes, and rents on
              any specific property before you rely on the ratio.
            </p>
          </div>
        </article>
        <RelatedContent kind="blog" slug={SLUG} title={TITLE_PLAIN} className="mt-10" />
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
