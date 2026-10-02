/**
 * Blog post: How to refinance a rental property.
 *
 * Targets queries: "refinance rental property", "cash out refinance
 * investment property", "rental property refinance rates", "investment
 * property refi requirements", "DSCR refinance".
 */

import type { Metadata } from "next";
import Link from "next/link";
import { PostSources } from "@/components/blog/post-sources";
import { BlogByline } from "@/components/marketing/blog-byline";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { RelatedContent } from "@/components/marketing/related-content";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";
import { Header } from "@/components/investcalc/header";
import { lastmodFor } from "@/lib/seo/lastmod";
import { JsonLd } from "@/components/seo/json-ld";

const SLUG = "how-to-refinance-a-rental-property";
const TITLE = "How to refinance a rental property — rate-and-term, cash-out, and DSCR options";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "How to refinance a rental property (2026)";
const DESCRIPTION =
  "How to refinance a rental property: rate-and-term vs cash-out, LTV and DSCR considerations, break-even math, and five mistakes to avoid.";
const PUBLISHED_AT = "2026-05-26";
const MODIFIED_AT = lastmodFor("/blog/how-to-refinance-a-rental-property") ?? PUBLISHED_AT;
const READING_TIME = 10;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "refinance rental property",
    "cash out refinance investment property",
    "rental property refinance rates",
    "investment property refi requirements",
    "DSCR refinance",
    "rental property refi LTV",
    "when to refinance rental property",
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

export default function RefinancePost() {
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

  return (
    <div className="min-h-screen bg-background">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbLd} />
      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <article>
        <div className="mb-2"><Link href="/blog" className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground">← Blog</Link></div>
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight text-balance">{TITLE}</h1>
          <p className="mt-3 text-2xs uppercase tracking-widest text-muted-foreground font-bold">
            {new Date(PUBLISHED_AT).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} · {READING_TIME} min read
          </p>
          <BlogByline />
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Refinancing can change a rental&apos;s payment, term, risk, or available
            equity, but it also adds quote-specific costs and underwriting risk.
            Here&apos;s how to compare the structures without assuming approval.
          </p>
        </header>

        <div className="prose prose-neutral max-w-none [&>p]:max-w-[68ch] [&>ul]:max-w-[68ch] [&>ol]:max-w-[68ch] [&>blockquote]:max-w-[68ch] [&>h2]:max-w-[68ch] [&>h3]:max-w-[68ch] text-foreground space-y-6 leading-relaxed">
          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The three reasons to refinance</h2>
          <p>
            Refi exists for three core jobs. Be honest about which one applies to your situation — they have different math.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">Reason 1: Rate-and-term refi to lower the payment</h3>
          <p>
            If a current written quote is meaningfully better than the existing
            note, a rate-and-term refinance may lower the payment. The result
            depends on balance, rate, amortization, fees, and term.
          </p>
          <p>
            <strong>The math:</strong> complete quoted closing costs divided by
            modeled monthly savings = simple break-even months. Include points,
            lender and third-party fees, any existing prepayment cost, changed
            amortization, and omitted tax effects before deciding.
          </p>
          <p>
            Illustration only: $300k loan. Current rate 7.5%, payment $2,098.
            Refi to 6.5%, payment $1,896. Savings $202/mo. Closing costs $5,500.
            Simple break-even = 27 months. Actual quotes, payments, costs, and
            the appropriate decision may differ.
          </p>
          <p>
            See our <Link href="/glossary/interest-rate" className="text-primary font-semibold hover:underline">interest rate</Link> and <Link href="/glossary/loan-term" className="text-primary font-semibold hover:underline">loan term</Link> glossary entries for more on how rate + term interact. Before requesting quotes, run the entered balance, rate, and term through the <Link href="/tools/mortgage-payment-calculator" className="text-primary font-semibold hover:underline">mortgage payment calculator</Link> to see the PITI breakdown to compare against the lender&apos;s written payment estimate.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">Reason 2: Cash-out refi to recycle capital</h3>
          <p>
            If the lender accepts a higher appraised value and approves a
            cash-out loan, some eligible equity may become net proceeds after
            the existing payoff, fees, reserves, and closing costs.
          </p>
          <p>
            <strong>Illustrative math:</strong> assume the selected program
            permits a new loan at 75% of lender-accepted value. Existing debt
            gets paid off; the remainder after all costs is modeled cash to the
            borrower. Actual pricing and leverage are quote-specific. For
            reference, Freddie Mac&apos;s{" "}
            <a
              href="https://sf.freddiemac.com/general/maximum-ltv-tltv-htltv-ratio-requirements-for-conforming-and-super-conforming-mortgages"
              className="text-primary font-semibold hover:underline"
            >
              maximum LTV for a cash-out refinance
            </a>{" "}
            of an investment property is 75% for one unit and 70% for two to
            four units, lower than its limits for a home you live in.
          </p>
          <p>
            Example: bought property for $300k with a $225k loan. Assume the
            lender accepts a $400k appraisal and approves 75% LTV: $300k modeled
            gross principal. After a $225k payoff and $6k assumed closing costs,
            the illustration produces $69k; neither the value, approval, nor net
            proceeds are guaranteed.
          </p>
          <p>
            Cash-out refinancing is one possible capital-recycling step in a{" "}
            <Link href="/blog/brrrr-method-explained" className="text-primary font-semibold hover:underline">BRRRR strategy</Link>, subject to appraisal, proceeds, and approval.
            Seasoning and the eligible value basis vary by program. Under
            Fannie Mae&apos;s{" "}
            <a
              href="https://selling-guide.fanniemae.com/sel/b2-1.3-03/cash-out-refinance-transactions"
              className="text-primary font-semibold hover:underline"
            >
              cash-out refinance rules
            </a>
            , for example, at least one borrower must have been on title for
            six months before the loan disburses, and a first mortgage being
            paid off generally must be at least 12 months old; a separate
            delayed-financing exception covers some recent cash purchases.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">Reason 3: Restructure terms</h3>
          <p>
            Sometimes the goal isn&apos;t saving money or pulling equity — it&apos;s changing the structure. Common cases:
          </p>
          <ul>
            <li><strong>ARM to fixed</strong> — locking in a fixed rate before your ARM resets</li>
            <li><strong>Interest-only to amortizing</strong> — your IO period is ending and you want to refi rather than face the payment shock</li>
            <li><strong>Removing a co-borrower</strong> — partnership dissolution, divorce, family arrangement changes</li>
            <li><strong>Changing borrower or entity</strong> — some products permit entity borrowing, but title, existing-loan, insurance, tax, guaranty, and legal consequences require lender and professional review</li>
          </ul>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The loan types available</h2>
          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">Conventional (Fannie Mae / Freddie Mac)</h3>
          <p>
            Eligible conventional agency programs may offer competitive
            pricing, but DTI, documentation, reserves, appraisal, occupancy,
            financed-property, and lender-overlay rules apply. Fannie
            Mae&apos;s{" "}
            <a
              href="https://selling-guide.fanniemae.com/sel/b3-4.1-01/minimum-reserve-requirements"
              className="text-primary font-semibold hover:underline"
            >
              minimum reserve requirements
            </a>
            , for example, call for six months of reserves on an
            investment-property transaction underwritten through Desktop
            Underwriter, plus 2%, 4%, or 6% of the mortgage balances on your
            other financed properties (not counting the property being
            refinanced or your own home), depending on how many financed
            properties you have. Pricing,
            leverage, and eligibility are file-specific; verify the current
            program guide and written quote.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">DSCR (non-QM)</h3>
          <p>
            See our <Link href="/blog/how-to-calculate-dscr#dscr-loans" className="text-primary font-semibold hover:underline">DSCR loans deep dive</Link> for the full picture. These programs primarily underwrite the property&apos;s coverage rather than using personal DTI as the main ratio, while still reviewing borrower and property risks. They can be useful when conventional income rules or financed-property limits constrain a file. Pricing, leverage, documentation, recourse, and prepayment terms vary, so compare current written quotes. See the <Link href="/glossary/dscr" className="text-primary font-semibold hover:underline">DSCR</Link> glossary entry for the math.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">Commercial / portfolio loans</h3>
          <p>
            Commercial and portfolio structures may address properties or
            borrower situations outside a selected conventional program, but
            rate, term, amortization, leverage, documentation, recourse, and
            timing vary widely. Obtain current written proposals and compare
            total cost and exit risk.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">The refi process — stages to plan for</h2>
          <p>
            This is a process outline, not a promised timeline. Lender workload,
            appraisal availability, property complexity, title, insurance,
            borrower responsiveness, and underwriting conditions can materially
            change timing and cost. An application or appraisal does not
            guarantee clear-to-close.
          </p>
          <ol>
            <li><strong>Compare:</strong> request same-day written quotes using the same lock period, loan purpose, value, and assumptions.</li>
            <li><strong>Apply:</strong> submit the documents required for the chosen borrower, property, and program.</li>
            <li><strong>Validate collateral:</strong> complete appraisal, title, insurance, payoff, and any lease or rent review.</li>
            <li><strong>Clear underwriting:</strong> answer conditions and review final rate, points, fees, cash to close, recourse, and prepayment terms.</li>
            <li><strong>Close only after approval:</strong> sign final documents; funding, payoff, and any proceeds follow the lender&apos;s closing process.</li>
          </ol>
          <p>
            Ask the lender and settlement provider for a file-specific schedule
            and preserve contingency time; do not tie a purchase or bridge-loan
            maturity to an advertised turnaround.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">Five refinance mistakes to avoid</h2>
          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">1. Refi-ing too early (before break-even works)</h3>
          <p>
            If you&apos;ll sell or refinance again before the modeled break-even,
            quoted costs may exceed the projected savings. Run the complete
            break-even comparison before committing.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">2. Not shopping 3+ lenders</h3>
          <p>
            The{" "}
            <a
              href="https://www.consumerfinance.gov/consumer-tools/mortgages/shopping-for-a-mortgage/"
              className="text-primary font-semibold hover:underline"
            >
              CFPB&apos;s mortgage-shopping guide
            </a>{" "}
            suggests comparing at least three loan offers from different
            lenders. Shop multiple same-day quotes using identical assumptions
            and compare rate, points, lender credits, fees, prepayment terms,
            recourse, and cash to close. As an illustration, if otherwise
            comparable $300k, 30-year quotes at 6.5% and 6.8% differ by 30bp,
            the modeled difference is about $60/month or $21k over the full
            term; actual quote spreads and realized savings vary.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">3. Pulling too much cash out at the top of the market</h3>
          <p>
            In a simplified illustration that ignores principal paydown, a loan
            initially at 75% LTV would be about 88% LTV after a 15% value
            decline. Actual value and future refinance options may differ.
            Stress-test a lower appraisal and leave a liquidity buffer. How much
            cushion to build in depends on the market: appraised values swing
            further in appreciation-driven metros like{" "}
            <Link href="/markets/phoenix" className="text-primary font-semibold hover:underline">Phoenix</Link> than in cash-flow markets where price moves less year to year.
            The FHFA{" "}
            <a
              href="https://fred.stlouisfed.org/data/ATNHPIUS38060Q.txt"
              className="text-primary font-semibold hover:underline"
            >
              house price index for the Phoenix metro
            </a>{" "}
            fell about 51% from the fourth quarter of 2006 to the second
            quarter of 2011, while the{" "}
            <a
              href="https://fred.stlouisfed.org/data/ATNHPIUS32820Q.txt"
              className="text-primary font-semibold hover:underline"
            >
              index for the Memphis metro
            </a>{" "}
            fell about 15% from the second quarter of 2007 to the second
            quarter of 2012.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">4. Ignoring DSCR options when conventional won&apos;t fit</h3>
          <p>
            When a file does not fit a selected conventional program, a DSCR or
            portfolio program may be another option. Eligibility, pricing,
            leverage, appraisal, reserves, property rules, documentation, and
            approval remain lender- and file-specific.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">5. Refusing to refi for &quot;just&quot; 50bp</h3>
          <p>
            In this stated illustration, a $400k, 30-year loan held 10 years at
            6.5% versus 7.0% changes the modeled payment by about $133/month and
            interest by about $20k over those 10 years. With $6k of assumed
            costs, the simple break-even is about 45 months before omitted
            costs or tax effects. Use the actual quote and expected hold period
            rather than treating 50bp as an automatic refinance signal.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">Run the math before you commit</h2>
          <p>
            Refi decisions hinge on rate, term, closing costs, and hold period.
            For the simple break-even, enter the quoted closing costs, set the
            down payment and rehab to $0, and enter the modeled monthly savings
            as the monthly net cash flow in the <Link href="/tools/break-even-calculator" className="text-primary font-semibold hover:underline">break-even calculator</Link>. Then run
            the property in <Link href="/" className="text-primary font-semibold hover:underline">TrueCap</Link> once with the existing loan terms and
            once with the quoted new terms to compare modeled cash flow and
            interest. TrueCap is not a lender quote, appraisal,
            underwriting decision, or approval; replace every assumption with
            the current written terms for your file.
          </p>
          <p>
            Related reading: <Link href="/blog/cap-rate-vs-cash-on-cash-vs-dscr" className="text-primary font-semibold hover:underline">cap rate vs CoC vs DSCR</Link> for how refi changes each metric, and <Link href="/blog/how-to-calculate-dscr#dscr-loans" className="text-primary font-semibold hover:underline">DSCR loans explained</Link> for when DSCR refi is the right choice.
          </p>
          <p className="text-sm text-muted-foreground">
            Verify current written pricing, leverage, seasoning, value basis,
            appraisal, DSCR or DTI treatment, credit, reserves, documentation,
            recourse, prepayment terms, costs, and timing with the lender.
          </p>
        </div>
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
            {
              title: "Fannie Mae Selling Guide B3-4.1-01, Minimum Reserve Requirements",
              url: "https://selling-guide.fanniemae.com/sel/b3-4.1-01/minimum-reserve-requirements",
            },
            {
              title: "CFPB, Shopping for a mortgage",
              url: "https://www.consumerfinance.gov/consumer-tools/mortgages/shopping-for-a-mortgage/",
            },
            {
              title: "FRED, FHFA All-Transactions House Price Index for Phoenix-Mesa-Chandler, AZ (MSA)",
              url: "https://fred.stlouisfed.org/data/ATNHPIUS38060Q.txt",
            },
            {
              title: "FRED, FHFA All-Transactions House Price Index for Memphis, TN-MS-AR (MSA)",
              url: "https://fred.stlouisfed.org/data/ATNHPIUS32820Q.txt",
            },
          ]}
        />
        <RelatedContent kind="blog" slug={SLUG} title={TITLE} className="mt-10" />
        <RelatedBlogPosts currentSlug={SLUG} />
      </main>
      <div className="max-w-3xl mx-auto px-4 sm:px-6"><NewsletterSignup variant="expanded" source="blog" /></div>
      <BlogStickyCta />
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
