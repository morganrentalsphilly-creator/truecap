/**
 * Anchor blog post #2 — "Cap rate vs cash-on-cash vs DSCR: which one
 * actually matters?"
 *
 * Targets high-volume comparison queries:
 *   - "cap rate vs cash on cash"
 *   - "cap rate vs cash on cash return"
 *   - "dscr vs cap rate"
 *   - "real estate metrics comparison"
 *   - "rental property metrics explained"
 *
 * Comparison posts are SEO gold because the searcher has clear intent
 * ("I'm trying to decide between X and Y") and there's a long tail of
 * variants. Same schema stack as post #1 for maximum SERP eligibility.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { RelatedContent } from "@/components/marketing/related-content";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { NO_DEBT_SERVICE_DSCR_LABEL } from "@/lib/financial-presentation";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "cap-rate-vs-cash-on-cash-vs-dscr";
const TITLE = "Cap rate vs cash-on-cash vs DSCR: which one actually matters?";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Cap rate vs cash-on-cash vs DSCR: which matters?";
const DESCRIPTION =
  "Three metrics, three different jobs. A plain-English guide to when each one matters, when to ignore each one, and why most investors get this wrong.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = "2026-06-01";
const READING_TIME_MIN = 8;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "cap rate vs cash on cash",
    "cap rate vs cash on cash return",
    "dscr vs cap rate",
    "real estate metrics comparison",
    "rental property metrics explained",
    "which real estate metric matters",
    "cap rate vs dscr",
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
  twitter: {
    card: "summary_large_image",
    title: SERP_TITLE,
    description: DESCRIPTION,
    images: ["/home.jpg"],
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "Which metric matters most when comparing rental properties?",
    a: "No single metric is sufficient. Cap rate can compare modeled unlevered operating yield, cash-on-cash incorporates the modeled capital stack, and DSCR compares modeled NOI with modeled debt service. Compare inputs and definitions as well as outputs.",
  },
  {
    q: "Which metric matters most when actually buying a property?",
    a: "All three answer different questions: DSCR tests modeled debt coverage, cash-on-cash measures modeled annual cash return on your invested cash, and cap rate compares unlevered operating yield. A DSCR result does not guarantee loan approval, and none of the three establishes future wealth or fair value on its own.",
  },
  {
    q: "What's the relationship between cap rate and cash-on-cash?",
    a: "Cap rate is an unlevered operating-yield ratio. Cash-on-cash reflects modeled annual cash flow relative to modeled initial cash. Financing can raise or lower cash-on-cash depending on the rate, leverage, fees, amortization, expenses, and property performance. When borrowing cost exceeds the modeled unlevered yield, the scenario may exhibit negative leverage.",
  },
  {
    q: "What's a 'good' value for each metric?",
    a: "There is no universal good value. Compare cap rate and cash-on-cash with verified local alternatives and your risk target. Compare DSCR with your own operating cushion and the lender's written formula and threshold; a ratio alone does not make a file bankable.",
  },
  {
    q: "Can a deal have a great cap rate and terrible DSCR?",
    a: "Yes. Cap rate excludes financing while DSCR includes modeled debt service, so leverage and loan terms can produce weak debt coverage even when NOI is positive. Test different financing scenarios and verify the lender's formula; the ratio alone does not dictate whether to proceed.",
  },
  {
    q: "Which metric do lenders care about?",
    a: "It depends on the product. DSCR is a primary coverage metric in many commercial and DSCR programs, while valuation, LTV, credit, reserves, guarantor strength, property eligibility, and other conditions also matter. Formula, threshold, and pricing tiers vary by lender and program.",
  },
];

export default function BlogPost() {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/blog/${SLUG}`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${canonicalUrl}#article`,
    headline: TITLE,
    description: DESCRIPTION,
    datePublished: PUBLISHED_AT,
    dateModified: MODIFIED_AT,
    author: {
      "@type": "Person",
      "@id": `${siteUrl}/about#morgan`,
      name: "Morgan Page",
      url: `${siteUrl}/about`,
    },
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntityOfPage: canonicalUrl,
    image: [`${siteUrl}/home.jpg`],
    inLanguage: "en-US",
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
        <header className="mb-8 sm:mb-10">
          <Link
            href="/blog"
            className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
          >
            ← TrueCap Blog
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 leading-tight text-balance">
            {TITLE}
          </h1>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mt-3">
            {new Date(PUBLISHED_AT).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            · {READING_TIME_MIN} min read
          </p>
          <p className="text-base sm:text-lg text-muted-foreground mt-4 leading-relaxed">
            {DESCRIPTION}
          </p>
        </header>

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">
          <p>
            Every rental property pitch deck shows three numbers: cap rate,
            cash-on-cash return, DSCR. They all look like &ldquo;return&rdquo;
            metrics. They&apos;re not. Each one does a completely different job,
            and conflating them is the single most common analytical mistake new
            investors make.
          </p>

          <p>
            This post is a plain-English guide to what each metric actually
            tells you, when to use which one, and the trap that catches almost
            every first-time investor in 2026&apos;s rate environment.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            Cap rate vs cash-on-cash vs DSCR — the short answer
          </h2>
          <p>
            <strong>Cap rate</strong> measures the property&apos;s unleveraged
            return (use it to compare properties).{" "}
            <strong>Cash-on-cash return</strong> measures the return on YOUR
            specific cash invested after financing (use it to make personal
            investment decisions). <strong>DSCR</strong> measures the modeled
            NOI relative to modeled debt service (some lenders use their own
            version as one part of underwriting).
          </p>
          <p>Three metrics, three completely different jobs:</p>
          <ul>
            <li>
              <strong>
                <Link
                  href="/glossary/cap-rate"
                  className="text-primary font-semibold hover:underline"
                >
                  Cap rate
                </Link>
              </strong>{" "}
              — the property&apos;s unleveraged annual return. Use it to{" "}
              <em>compare properties</em> against each other and against
              alternatives like bonds.
            </li>
            <li>
              <strong>
                <Link
                  href="/glossary/cash-on-cash-return"
                  className="text-primary font-semibold hover:underline"
                >
                  Cash-on-cash return
                </Link>
              </strong>{" "}
              — the return on the cash YOU specifically invest. Use it to{" "}
              understand how the modeled capital stack changes the annual cash
              return. It does not make the investment decision.
            </li>
            <li>
              <strong>
                <Link
                  href="/glossary/dscr"
                  className="text-primary font-semibold hover:underline"
                >
                  DSCR
                </Link>
              </strong>{" "}
              — the property&apos;s ability to cover its mortgage from operating
              income. Compare it with the specific lender&apos;s written
              convention; it cannot predict whether a lender will approve the
              file.
            </li>
          </ul>
          <p>
            Three metrics, three jobs. You need all of them. Skipping any one
            means you&apos;re missing critical risk.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            Cap rate — what it actually tells you
          </h2>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-sm sm:text-base font-mono">
              <span className="font-bold">Cap Rate</span> = NOI ÷ Purchase Price
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              where NOI = Annual Rent − Annual Operating Expenses
            </div>
          </div>
          <p>
            Cap rate is the property&apos;s earning power as if you owned it
            free-and-clear. No mortgage, no financing, no leverage. Just rent
            in, expenses out, divided by what you paid. The numerator,{" "}
            <Link
              href="/glossary/noi"
              className="text-primary font-semibold hover:underline"
            >
              NOI
            </Link>
            , is the single most-disputed line in residential underwriting.
          </p>
          <p>
            <strong>Why it matters:</strong> cap rate is the only metric that
            strips out financing. Two investors looking at the same property
            with different down payments and different interest rates will get
            different cash-on-cash numbers, but the cap rate is identical. That
            makes cap rate the right metric for comparing properties to each
            other, and for comparing real estate to other asset classes
            (Treasuries, dividend stocks, REITs).
          </p>
          <p>
            <strong>The benchmark rule:</strong> your cap rate should
            comfortably exceed the 10-year Treasury yield. If Treasuries pay
            4.5% and you&apos;re buying at a 4% cap, you&apos;re taking real-
            estate-level risk for less than risk-free return. That&apos;s a deal
            you need an appreciation thesis to justify.
          </p>
          <p>
            <strong>Where it breaks:</strong> cap rate ignores financing
            entirely. A property with a 6% cap rate could be a great deal
            (interest rates at 4%, you keep the spread) or a disaster (interest
            rates at 8%, you&apos;re paying more in mortgage than the property
            earns). Cap rate alone can&apos;t tell you which.
          </p>
          <h2 className="text-2xl sm:text-3xl">
            Cash-on-cash — what it actually tells you
          </h2>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-sm sm:text-base font-mono">
              <span className="font-bold">CoC</span> = Annual Cash Flow ÷ Total
              Cash Invested
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              after mortgage P&amp;I, after closing costs, after rehab
            </div>
          </div>
          <p>
            Cash-on-cash measures the return on the cash{" "}
            <em>you specifically invested</em>, after the lender takes their
            cut. If you put $60,000 into a deal and it produces $5,000 of cash
            flow per year, that&apos;s an 8.3% CoC.
          </p>
          <p>
            <strong>Why it matters:</strong> this is the metric for your
            personal investment decision. Cap rate doesn&apos;t care about your
            down payment. Cash-on-cash does. CoC tells you whether the leverage
            you&apos;re using is helping or hurting.
          </p>
          <p>
            <strong>The benchmark rule:</strong> 8-10% CoC is strong, 5-7% is
            acceptable in most 2026 markets, below 5% needs an appreciation
            story. Compare against your alternatives — if you can get 5% from
            high-yield savings with zero risk, a 5% CoC on a rental needs to
            offer something extra under an explicitly sourced scenario, while
            any tax outcome remains taxpayer-specific.
          </p>
          <p>
            <strong>Where it breaks:</strong> CoC doesn&apos;t account for
            principal paydown (your mortgage balance is dropping monthly — real
            equity being built), a separately sourced appreciation scenario, or
            taxpayer-specific tax effects. For a broader view, pair CoC with
            explicitly stated scenarios and keep current operating cash flow
            distinct from projected value and tax outcomes.
          </p>
          <h2 className="text-2xl sm:text-3xl">
            DSCR — what it actually tells you
          </h2>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-sm sm:text-base font-mono">
              <span className="font-bold">DSCR</span> = Annual NOI ÷ Annual Debt
              Service
            </div>
          </div>
          <p>
            DSCR (Debt Service Coverage Ratio) measures whether the property can
            cover its own mortgage payments from operating income alone. A DSCR
            of 1.25 means the property earns $1.25 of NOI for every $1.00 of
            mortgage payment.
          </p>
          <p>
            <strong>Why it matters:</strong> DSCR is a primary coverage metric
            in many commercial and non-QM DSCR programs. Those programs often
            use property coverage instead of personal DTI as the main ratio,
            while still applying borrower, credit, reserve, appraisal,
            insurance, and property requirements.
          </p>
          <p>
            <strong>The benchmark rule:</strong> there is no market-wide
            approval threshold. Ask the lender for its current formula, accepted
            rent evidence, payment components, rounding, minimum, and pricing
            tiers. Use a separate, more conservative operating DSCR for your own
            risk decision.
          </p>
          <p>
            <strong>Where it breaks:</strong> DSCR tells you nothing about
            return. A property could have high modeled DSCR and low modeled CoC
            because of a large equity contribution. DSCR is one financing input,
            not a return metric or approval promise.
          </p>
          <p></p>

          <h2 className="text-2xl sm:text-3xl">A negative-leverage scenario</h2>
          <p>
            Negative leverage can occur when the effective cost of borrowing
            exceeds the property&apos;s modeled unlevered operating yield.
          </p>
          <p>
            For example, hold the property assumptions constant and compare a
            lower-rate scenario with a higher-rate scenario. When financing cost
            rises above the modeled property yield, debt service can reduce
            cash-on-cash return. Fees, amortization, leverage, reserves, and
            timing also matter, so do not infer the outcome from two headline
            percentages alone.
          </p>
          <p>
            How to spot it: compare your cap rate to your effective borrowing
            rate. If borrowing rate exceeds cap rate, you have negative
            leverage. An upside value scenario, principal paydown, or a
            taxpayer-specific tax outcome does not erase a current operating
            shortfall; model each separately and decide whether you can carry
            the downside.
          </p>

          <h2 className="text-2xl sm:text-3xl">Side-by-side comparison</h2>
          <div className="not-prose overflow-x-auto rounded-xl border border-border bg-card my-6">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 font-bold text-foreground">
                    What it measures
                  </th>
                  <th className="text-left p-3 font-bold text-foreground">
                    Cap rate
                  </th>
                  <th className="text-left p-3 font-bold text-foreground">
                    Cash-on-cash
                  </th>
                  <th className="text-left p-3 font-bold text-foreground">
                    DSCR
                  </th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-3 [&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-0">
                <tr>
                  <td className="text-muted-foreground">Includes financing?</td>
                  <td>No</td>
                  <td>Yes</td>
                  <td>Yes</td>
                </tr>
                <tr>
                  <td className="text-muted-foreground">Best for…</td>
                  <td>Comparing properties</td>
                  <td>Modeled cash return on entered equity</td>
                  <td>Modeled debt coverage</td>
                </tr>
                <tr>
                  <td className="text-muted-foreground">
                    Universal threshold?
                  </td>
                  <td>No</td>
                  <td>No</td>
                  <td>No; compare the lender&apos;s written program terms</td>
                </tr>
                <tr>
                  <td className="text-muted-foreground">Lenders care?</td>
                  <td>Program-dependent</td>
                  <td>Not usually a lender covenant by itself</td>
                  <td>Program-dependent</td>
                </tr>
                <tr>
                  <td className="text-muted-foreground">Cash purchase?</td>
                  <td>Same as CoC</td>
                  <td>Same as cap rate</td>
                  <td>{NO_DEBT_SERVICE_DSCR_LABEL}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl sm:text-3xl">So which one matters most?</h2>
          <p>
            None is universally first. Read the three together and keep their
            inputs, formulas, and limitations visible.
          </p>
          <p>
            Cap rate omits financing, cash-on-cash depends on entered equity and
            cash-flow assumptions, and DSCR depends on the chosen NOI and debt-
            service convention. None proves fair value, future performance,
            bankability, or suitability.
          </p>
          <p>
            All three numbers live next to each other in TrueCap&apos;s main
            analyzer, alongside the released 10-year cash-flow and equity
            projection, sensitivity grid, and Offer Ceiling. Run a real deal in
            60 seconds.
          </p>

          <div className="not-prose"></div>

          <h2 className="text-2xl sm:text-3xl">FAQ</h2>
          {FAQS.map((f, i) => (
            <details
              key={i}
              className="not-prose bg-card border border-border rounded-xl p-4 sm:p-5 mb-3"
            >
              <summary className="cursor-pointer font-bold text-foreground">
                {f.q}
              </summary>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {f.a}
              </p>
            </details>
          ))}
        </article>
        <RelatedContent kind="blog" slug={SLUG} title={TITLE} className="mt-10" />

        <RelatedBlogPosts currentSlug={SLUG} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <NewsletterSignup variant="expanded" source="blog" />
        </div>

        <footer className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Want the full underwriting workflow? TrueCap turns each of these
            metrics — plus a 10-year cash-flow and equity projection,
            sensitivity, and Offer Ceiling — into a single live analyzer.{" "}
          </p>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
      <BlogStickyCta />
    </div>
  );
}
