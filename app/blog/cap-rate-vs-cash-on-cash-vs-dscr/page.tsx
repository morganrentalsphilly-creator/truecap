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
import { BlogByline } from "@/components/marketing/blog-byline";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { RelatedContent } from "@/components/marketing/related-content";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { NO_DEBT_SERVICE_DSCR_LABEL } from "@/lib/financial-presentation";
import { getSiteUrl } from "@/lib/site-url";
import { ScrollX } from "@/components/ui/scroll-x";
import { Header } from "@/components/investcalc/header";
import { lastmodFor } from "@/lib/seo/lastmod";
import { JsonLd } from "@/components/seo/json-ld";
import { PostSources } from "@/components/blog/post-sources";

const SLUG = "cap-rate-vs-cash-on-cash-vs-dscr";
const TITLE = "Cap rate vs cash-on-cash vs DSCR: which one actually matters?";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Cap rate vs cash-on-cash vs DSCR: which matters?";
const DESCRIPTION =
  "Three metrics, three different jobs. A plain-English guide to when each one matters, when to ignore each one, and the mistakes to avoid.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = lastmodFor("/blog/cap-rate-vs-cash-on-cash-vs-dscr") ?? PUBLISHED_AT;
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
  },
  twitter: {
    card: "summary_large_image",
    title: SERP_TITLE,
    description: DESCRIPTION,
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
    a: "It depends on the product. DSCR is a primary coverage metric in many commercial and DSCR programs, while valuation, LTV, credit, reserves, property eligibility, and other conditions also matter. Formula, threshold, and pricing tiers vary by lender and program.",
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
    author: { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: "TrueCap", url: siteUrl },
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
        item: siteUrl,
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
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={faqLd} />

      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-8 sm:mb-10">
          <Link
            href="/blog"
            className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground"
          >
            ← Blog
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 leading-tight text-balance">
            {TITLE}
          </h1>
          <p className="text-2xs uppercase tracking-widest text-muted-foreground font-bold mt-3">
            {new Date(PUBLISHED_AT).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            · {READING_TIME_MIN} min read
          </p>
          <BlogByline />
          <p className="text-base sm:text-lg text-muted-foreground mt-4 leading-relaxed">
            {DESCRIPTION}
          </p>
        </header>

        <article className="prose prose-slate max-w-none [&>p]:max-w-[68ch] [&>ul]:max-w-[68ch] [&>ol]:max-w-[68ch] [&>blockquote]:max-w-[68ch] [&>h2]:max-w-[68ch] [&>h3]:max-w-[68ch] [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">
          <p>
            This post compares three numbers: cap rate, cash-on-cash return,
            DSCR. They all look like &ldquo;return&rdquo; metrics. They&apos;re
            not. Each one does a completely different job, and conflating them
            can lead new investors to the wrong conclusion.
          </p>

          <p>
            Below is a plain-English guide to what each metric actually tells
            you, when to use which one, and the negative-leverage trap to check
            for when borrowing costs are high.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            Cap rate vs cash-on-cash vs DSCR — the short answer
          </h2>
          <p>
            <strong>Cap rate</strong> measures the property&apos;s unleveraged
            return (use it to compare properties).{" "}
            <strong>Cash-on-cash return</strong> measures the return on YOUR
            specific cash invested after financing (use it to see what the
            financing does to your own return). <strong>DSCR</strong> measures the modeled
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
              <em>compare properties</em> against each other; set it beside
              alternatives like bonds only as context.
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
            Three metrics, three jobs. Read them together: each one covers a
            risk the other two leave out. On a cash purchase there is no debt
            service, so DSCR drops out.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            Cap rate — what it actually tells you
          </h2>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-sm sm:text-base font-mono">
              <span className="font-bold">Cap Rate</span> = NOI ÷ Purchase Price
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              where NOI = Annual Rent − Vacancy Allowance − Annual Operating
              Expenses
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
            , depends on every rent and expense assumption, so verify it line by
            line.
          </p>
          <p>
            <strong>Why it matters:</strong> of these three, cap rate is the
            only one that strips out financing. Two investors looking at the
            same property with different down payments and different interest
            rates will get different cash-on-cash numbers, but the cap rate is
            identical. That makes cap rate the right metric for comparing
            properties to each other, and a starting point, though not an
            apples-to-apples one, for setting real estate beside other asset
            classes (Treasuries, dividend stocks, REITs).
          </p>
          <p>
            <strong>A reference point, not a rule:</strong> set the cap rate
            beside the yield on a lower-risk alternative such as the 10-year
            Treasury. If Treasuries pay 4.5% and you&apos;re buying at a 4% cap,
            you&apos;re taking on property risk and work for less current yield
            than the Treasury pays, so the case rests on rent growth or
            appreciation you would need to support with evidence. Liquidity,
            leverage, taxes, and workload all differ, so treat the comparison as
            context.
          </p>
          <p>
            <strong>Where it breaks:</strong> cap rate ignores financing
            entirely. Take a 6% cap rate with a 75% loan on a 30-year schedule.
            At a 4% rate, the annual payments come to about 4.3% of the price,
            so the loan leaves a spread and lifts the cash return. At 8%, they
            come to about 6.6% of the price, more than the 6% the property
            earns. Cap rate alone can&apos;t tell you which of those deals
            you&apos;re looking at.
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
            <strong>Why it matters:</strong> this is the metric that shows what
            your financing does to your own return. Cap rate doesn&apos;t care
            about your down payment. Cash-on-cash does. CoC tells you whether the leverage
            you&apos;re using is helping or hurting.
          </p>
          <p>
            <strong>The benchmark rule:</strong> there is no universal
            cash-on-cash band. Set your own required return, then compare the
            result with verified alternatives: if an{" "}
            <a
              href="https://www.consumerfinance.gov/ask-cfpb/how-can-i-be-sure-my-money-is-safe-in-my-bank-account-en-1005/"
              className="text-primary font-semibold hover:underline"
            >
              insured savings account
            </a>{" "}
            or a Treasury pays close to the rental&apos;s CoC, the rental needs
            to offer something extra under an explicitly sourced scenario, while
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
            <Link
              href="/blog/how-to-calculate-dscr"
              className="text-primary font-semibold hover:underline"
            >
              DSCR (Debt Service Coverage Ratio)
            </Link>{" "}
            measures whether the property can
            cover its own mortgage payments from operating income alone. A DSCR
            of 1.25 means the property earns $1.25 of NOI for every $1.00 of
            mortgage payment.
          </p>
          <p>
            <strong>Why it matters:</strong> DSCR is a primary coverage metric
            in many commercial and non-QM DSCR programs. Those programs often
            use property coverage instead of personal DTI as the main ratio,
            while still applying their own{" "}
            <a
              href="https://mf.freddiemac.com/docs/conventional_small.pdf"
              className="text-primary font-semibold hover:underline"
            >
              borrower, credit, reserve, and property-eligibility requirements
            </a>
            , plus appraisal and insurance conditions. Credit to buy or
            maintain a rental the owner doesn&apos;t live in is{" "}
            <a
              href="https://www.consumerfinance.gov/rules-policy/regulations/1026/interp-3/"
              className="text-primary font-semibold hover:underline"
            >
              business-purpose credit
            </a>
            , which Regulation Z does not cover.
          </p>
          <p>
            <strong>The benchmark rule:</strong> there is no market-wide
            approval threshold. Even one lender&apos;s minimum can vary:{" "}
            <a
              href="https://mfguide.fanniemae.com/fnmf-pdf/download/10786"
              className="text-primary font-semibold hover:underline"
            >
              Fannie Mae&apos;s multifamily guide
            </a>{" "}
            sets its DSCR requirements by underwriting tier and computes debt
            service at the note rate or a floor rate, whichever is higher. Ask
            the lender for its current formula,
            accepted rent evidence, payment components, rounding, minimum, and
            pricing tiers. Use a separate, more conservative operating DSCR for your own
            risk decision.
          </p>
          <p>
            <strong>Where it breaks:</strong> DSCR tells you nothing about
            return. A property could have high modeled DSCR and low modeled CoC
            because of a large equity contribution. DSCR is one financing input,
            not a return metric or approval promise.
          </p>

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
            How to spot it: compare your cap rate with your loan constant
            (annual debt service ÷ loan amount), not just the note rate. If the
            loan constant exceeds the cap rate, debt lowers your cash-on-cash
            return below the cap rate. An upside value scenario, principal paydown, or a
            taxpayer-specific tax outcome does not erase a current operating
            shortfall; model each separately and decide whether you can carry
            the downside.
          </p>

          <h2 className="text-2xl sm:text-3xl">Side-by-side comparison</h2>
          <ScrollX cue stickyFirstColumn label="Data table" className="not-prose overflow-x-auto rounded-xl border border-border bg-card my-6">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
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
                  <td>Close to CoC (differs by closing costs, repairs, and CapEx reserve)</td>
                  <td>Close to cap rate (differs by closing costs, repairs, and CapEx reserve)</td>
                  <td>{NO_DEBT_SERVICE_DSCR_LABEL}</td>
                </tr>
              </tbody>
            </table>
          </ScrollX>

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
            analyzer. Pro adds the 10-year cash-flow and equity projection, the
            sensitivity grid, and the Offer Ceiling: the highest price that
            still meets your targets. Run a real deal in 60 seconds.
          </p>

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
        <PostSources
          sources={[
            {
              title: "CFPB, How can I be sure my money is safe in my bank account?",
              url: "https://www.consumerfinance.gov/ask-cfpb/how-can-i-be-sure-my-money-is-safe-in-my-bank-account-en-1005/",
            },
            {
              title: "Freddie Mac Multifamily, Optigo Conventional Small term sheet (4/26)",
              url: "https://mf.freddiemac.com/docs/conventional_small.pdf",
            },
            {
              title:
                "CFPB, Official Interpretation of 12 CFR 1026.3(a), Regulation Z business-purpose exemption",
              url: "https://www.consumerfinance.gov/rules-policy/regulations/1026/interp-3/",
            },
            {
              title:
                "Fannie Mae Multifamily Selling and Servicing Guide, Part II Sec. 203.02, Underwritten DSCR",
              url: "https://mfguide.fanniemae.com/fnmf-pdf/download/10786",
            },
          ]}
        />
        <RelatedContent kind="blog" slug={SLUG} title={TITLE} className="mt-10" />

        <RelatedBlogPosts currentSlug={SLUG} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <NewsletterSignup variant="expanded" source="blog" />
        </div>

        <footer className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Want the full underwriting workflow? TrueCap turns each of these
            metrics into a single live analyzer, and Pro adds a 10-year
            cash-flow and equity projection, sensitivity, and Offer Ceiling.
          </p>
        </footer>
      </main>
      <BlogStickyCta />
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
