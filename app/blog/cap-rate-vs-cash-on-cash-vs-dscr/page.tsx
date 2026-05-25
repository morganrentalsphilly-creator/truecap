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
import { ArrowUpRight, Calculator } from "lucide-react";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "cap-rate-vs-cash-on-cash-vs-dscr";
const TITLE = "Cap rate vs cash-on-cash vs DSCR: which one actually matters?";
const DESCRIPTION =
  "Three different metrics, three different jobs. A plain-English guide to when each one matters, when to ignore each one, and why most investors get this wrong.";
const PUBLISHED_AT = "2026-05-24";
const READING_TIME_MIN = 8;

export const metadata: Metadata = {
  title: `${TITLE} | TrueCap Blog`,
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
    title: TITLE,
    description: DESCRIPTION,
    url: `/blog/${SLUG}`,
    type: "article",
    publishedTime: PUBLISHED_AT,
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/home.jpg"],
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "Which metric matters most when comparing rental properties?",
    a: "Cap rate. It strips out financing differences (which vary by buyer and rate environment) and shows you the property's pure earning power. Cash-on-cash and DSCR are personal to YOUR financing structure — useful for your investment decision, useless for comparing two listings.",
  },
  {
    q: "Which metric matters most when actually buying a property?",
    a: "All three, in this order: DSCR (will you get approved?), cash-on-cash (will the deal grow your net worth at the rate you want?), then cap rate (is the property fairly priced for its market?). Skip any and you're missing critical risk you'll regret.",
  },
  {
    q: "What's the relationship between cap rate and cash-on-cash?",
    a: "Cap rate is unleveraged annual return. Cash-on-cash is leveraged annual return on YOUR cash. When leverage is cheap (low interest rates), cash-on-cash > cap rate — you're capturing the spread. When leverage is expensive (high rates), cash-on-cash can fall BELOW cap rate — you're paying the bank more than the property earns. This is called negative leverage and it's the dominant problem in 2024-26 underwriting.",
  },
  {
    q: "What's a 'good' value for each metric?",
    a: "Cap rate: 6-10% in cash-flow markets, 3-5% in appreciation markets. Cash-on-cash: 8-10%+ is strong, 5-7% is acceptable, below 5% needs an appreciation or tax story. DSCR: 1.25+ is bankable, 1.5+ unlocks better rate tiers, below 1.2 most lenders won't fund.",
  },
  {
    q: "Can a deal have a great cap rate and terrible DSCR?",
    a: "Yes — happens constantly in 2026's rate environment. A property with 7% cap rate financed at 7.5% interest will have DSCR below 1.0 — the property cash-flows on paper (cap > 0) but doesn't cover its own mortgage. Either come in with more cash (lowers debt service, raises DSCR), buy at a lower price (raises cap rate), or walk.",
  },
  {
    q: "Which metric do lenders care about?",
    a: "DSCR, by far. Cap rate matters for property valuation in some commercial loan products (the lender wants to know the property's standalone value if they had to foreclose), but the loan-approval gate is DSCR. Almost every commercial / DSCR loan product requires 1.0-1.25 minimum, with rate tier improvements at 1.25 and 1.5.",
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
    dateModified: PUBLISHED_AT,
    author: {
      "@type": "Organization",
      name: "TrueCap",
      url: siteUrl,
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-8 sm:mb-10">
          <Link
            href="/blog"
            className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
          >
            ← TrueCap Blog
          </Link>
          <h1 className="text-3xl sm:text-4xl font-black text-foreground mt-2 leading-tight text-balance">
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

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-black [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">
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

          <h2 className="text-2xl sm:text-3xl">The 60-second version</h2>
          <p>
            Skip to the bottom for nuance, but here&apos;s the short answer:
          </p>
          <ul>
            <li>
              <strong>Cap rate</strong> — the property&apos;s unleveraged annual
              return. Use it to <em>compare properties</em> against each other
              and against alternatives like bonds.
            </li>
            <li>
              <strong>Cash-on-cash return</strong> — the return on the cash YOU
              specifically invest. Use it to <em>make your personal investment
              decision</em>: is this worth my capital?
            </li>
            <li>
              <strong>DSCR</strong> — the property&apos;s ability to cover its
              mortgage from operating income. Use it to <em>get financed</em>:
              will a lender say yes?
            </li>
          </ul>
          <p>
            Three metrics, three jobs. You need all of them. Skipping any one
            means you&apos;re missing critical risk.
          </p>

          <h2 className="text-2xl sm:text-3xl">Cap rate — what it actually tells you</h2>
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
            in, expenses out, divided by what you paid.
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
          <p>
            <Link href="/tools/cap-rate-calculator" className="text-primary font-semibold hover:underline">
              Compute cap rate on a real property →
            </Link>
          </p>

          <h2 className="text-2xl sm:text-3xl">Cash-on-cash — what it actually tells you</h2>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-sm sm:text-base font-mono">
              <span className="font-bold">CoC</span> = Annual Cash Flow ÷ Total Cash Invested
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              after mortgage P&amp;I, after closing costs, after rehab
            </div>
          </div>
          <p>
            Cash-on-cash measures the return on the cash <em>you specifically
            invested</em>, after the lender takes their cut. If you put $60,000
            into a deal and it produces $5,000 of cash flow per year, that&apos;s
            an 8.3% CoC.
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
            offer something extra (appreciation, tax savings, optionality).
          </p>
          <p>
            <strong>Where it breaks:</strong> CoC doesn&apos;t account for
            principal paydown (your mortgage balance is dropping monthly — real
            wealth being built), appreciation (the property&apos;s value is
            usually growing), or tax savings (depreciation often makes the deal
            net-positive on an after-tax basis even when cash flow is thin).
            For a full picture, pair CoC with a 10-year projection.
          </p>
          <p>
            <Link href="/tools/cash-on-cash-calculator" className="text-primary font-semibold hover:underline">
              Compute cash-on-cash return →
            </Link>
          </p>

          <h2 className="text-2xl sm:text-3xl">DSCR — what it actually tells you</h2>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-sm sm:text-base font-mono">
              <span className="font-bold">DSCR</span> = Annual NOI ÷ Annual Debt Service
            </div>
          </div>
          <p>
            DSCR (Debt Service Coverage Ratio) measures whether the property
            can cover its own mortgage payments from operating income alone. A
            DSCR of 1.25 means the property earns $1.25 of NOI for every $1.00
            of mortgage payment.
          </p>
          <p>
            <strong>Why it matters:</strong> DSCR is what lenders care about.
            DSCR loan products — non-QM loans that approve based on the
            property&apos;s economics instead of your personal income — have
            exploded in popularity. They almost always require minimum DSCR of
            1.0-1.25 with better rate tiers at 1.25 and 1.5.
          </p>
          <p>
            <strong>The benchmark rule:</strong> 1.25+ is bankable, 1.5+ unlocks
            better rate tiers, below 1.2 most DSCR lenders won&apos;t fund.
            Conventional Fannie/Freddie investment-property loans don&apos;t
            check DSCR explicitly but use your personal DTI, which has a similar
            gating effect.
          </p>
          <p>
            <strong>Where it breaks:</strong> DSCR tells you nothing about
            return. A property could have DSCR of 2.0 (lender loves it) and CoC
            of 2% (you should hate it). DSCR is a financing gate, not a
            return metric.
          </p>
          <p>
            <Link href="/tools/dscr-calculator" className="text-primary font-semibold hover:underline">
              Compute DSCR →
            </Link>
          </p>

          <h2 className="text-2xl sm:text-3xl">The 2026 trap: negative leverage</h2>
          <p>
            Here&apos;s the trap that&apos;s catching almost every first-time
            investor in the current rate environment.
          </p>
          <p>
            From 2010 to 2022, interest rates were almost always below cap
            rates. If a property had a 6% cap rate and your mortgage was at
            4%, leverage made you money — you borrowed at 4%, the property
            returned 6%, and you kept the 2% spread on every borrowed dollar.
            Cash-on-cash was usually higher than cap rate. This was called
            <em> positive leverage.</em>
          </p>
          <p>
            In 2026, with 30-year fixed investment-property rates at 6.5-7.5%
            and cap rates in most markets at 5-7%, the math flips. If a
            property has a 6% cap rate and your mortgage is at 7%, every
            borrowed dollar costs more than it earns. Cash-on-cash falls
            <em> below</em> cap rate. This is <strong>negative leverage</strong>,
            and it&apos;s the dominant problem in 2026 underwriting.
          </p>
          <p>
            How to spot it: compare your cap rate to your effective borrowing
            rate. If borrowing rate exceeds cap rate, you have negative
            leverage. The deal can still work — if appreciation, tax savings,
            or principal paydown compensates — but you need to know what
            you&apos;re signing up for.
          </p>

          <h2 className="text-2xl sm:text-3xl">Side-by-side comparison</h2>
          <div className="not-prose overflow-x-auto rounded-xl border border-border bg-card my-6">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 font-bold text-foreground">What it measures</th>
                  <th className="text-left p-3 font-bold text-foreground">Cap rate</th>
                  <th className="text-left p-3 font-bold text-foreground">Cash-on-cash</th>
                  <th className="text-left p-3 font-bold text-foreground">DSCR</th>
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
                  <td>Personal investment decision</td>
                  <td>Getting a loan</td>
                </tr>
                <tr>
                  <td className="text-muted-foreground">Healthy benchmark</td>
                  <td>6-10% cash-flow / 3-5% appreciation</td>
                  <td>8-10%+</td>
                  <td>1.25+</td>
                </tr>
                <tr>
                  <td className="text-muted-foreground">Lenders care?</td>
                  <td>Sometimes (commercial)</td>
                  <td>No</td>
                  <td>Always</td>
                </tr>
                <tr>
                  <td className="text-muted-foreground">Cash purchase?</td>
                  <td>Same as CoC</td>
                  <td>Same as cap rate</td>
                  <td>N/A (no debt)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl sm:text-3xl">So which one matters most?</h2>
          <p>
            All three. In a strict order: DSCR first (without financing
            approval, nothing else matters), then cash-on-cash (the metric for
            YOUR decision), then cap rate (the market context check).
          </p>
          <p>
            Skip DSCR and you&apos;ll find a great-looking deal you can&apos;t
            get a loan for. Skip cash-on-cash and you&apos;ll buy a property
            with great cap rate that doesn&apos;t actually make money after
            your mortgage payment. Skip cap rate and you&apos;ll overpay for a
            property that&apos;s cheap in your specific financing scenario but
            objectively overpriced for its market.
          </p>
          <p>
            All three numbers live next to each other in TrueCap&apos;s main
            analyzer, alongside the rest of the underwriting math (10-year
            projection, tax strategy, exit scenarios). Run a real deal in 60
            seconds.
          </p>

          <div className="not-prose">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold hover:opacity-95 transition-opacity"
            >
              <Calculator className="w-4 h-4" />
              Run a 60-second analysis
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <h2 className="text-2xl sm:text-3xl">FAQ</h2>
          {FAQS.map((f, i) => (
            <details key={i} className="not-prose bg-card border border-border rounded-xl p-4 sm:p-5 mb-3">
              <summary className="cursor-pointer font-bold text-foreground">
                {f.q}
              </summary>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {f.a}
              </p>
            </details>
          ))}
        </article>

        <RelatedBlogPosts currentSlug={SLUG} />

        <footer className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Want the full underwriting workflow? TrueCap turns each of these
            metrics — plus 10-year projection, tax strategy, exit scenarios —
            into a single live analyzer.{" "}
            <Link href="/" className="font-bold text-foreground hover:underline">
              Open the analyzer →
            </Link>
          </p>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
      <BlogStickyCta />
    </div>
  );
}
