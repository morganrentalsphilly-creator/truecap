/**
 * Anchor blog post #4 — "What's a good cap rate for rental property in 2026?"
 *
 * Targets high-volume search queries:
 *   - "what is a good cap rate"
 *   - "good cap rate for rental property"
 *   - "average cap rate by city"
 *   - "cap rate benchmarks 2026"
 *   - "what cap rate should i look for"
 *
 * Complements /tools/cap-rate-calculator (computational) and the
 * /blog/cap-rate-vs-cash-on-cash-vs-dscr post (comparative) by going
 * deep on benchmarks + market context.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Calculator } from "lucide-react";
import { BlogByline } from "@/components/marketing/blog-byline";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "what-is-a-good-cap-rate";
const TITLE = "What's a good cap rate for rental property in 2026?";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "What's a good cap rate for rental property in 2026";
const DESCRIPTION =
  "There's no single answer — cap rate benchmarks shift by market, property type, and the prevailing risk-free rate. Plain-English guide to what's good in cash-flow markets, appreciation markets, and the negative-leverage rate environment of 2026.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = "2026-08-11";
const READING_TIME_MIN = 9;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "what is a good cap rate",
    "good cap rate for rental property",
    "average cap rate",
    "cap rate benchmarks",
    "cap rate 2026",
    "what cap rate should i look for",
    "cap rate by city",
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
    q: "What's considered a good cap rate?",
    a: "Market-dependent. In 2026: 6-10% is strong in cash-flow markets (Midwest, Sun Belt secondary), 4-6% is typical in balanced markets, 3-5% is the norm in coastal Tier-1 markets where appreciation does the heavy lifting. The universal rule: your cap rate should comfortably exceed the 10-year Treasury yield (~4-5% in mid-2026) — otherwise you're taking real-estate-level risk for less than risk-free return.",
  },
  {
    q: "What's the highest cap rate I should look for?",
    a: "There's no upper limit on cap rate that automatically means 'good deal'. A 15% cap rate property in a declining neighborhood with high turnover is worse than a 6% cap rate property in a steady appreciating market. Above ~10%, scrutinize WHY: is it the neighborhood (vacancy risk, tenant quality), the property condition (deferred maintenance, looming capex), the rents (above-market and unsustainable), or genuinely a distressed seller?",
  },
  {
    q: "Is a 5% cap rate too low?",
    a: "Depends on the market and your strategy. In a coastal appreciation market (Bay Area, Boston, Manhattan, Seattle), 5% caps are the entry point and you accept the cash-flow trade-off for appreciation upside. In a Sun Belt cash-flow market, 5% is uncompetitive — there are better deals available. With 2026 mortgage rates at 6.5-7.5%, a 5% cap rate creates negative leverage — your borrowed money costs more than the property earns.",
  },
  {
    q: "What's a good cap rate vs. the 10-year Treasury?",
    a: "Cap rate should exceed the 10-year Treasury by at least 2-3 percentage points to compensate for real estate's illiquidity, tenant risk, and operational headache. With 10-year Treasuries yielding ~4.5% in mid-2026, that puts a 'reasonable' cap rate floor at roughly 6.5-7.5% before adjustments for market quality, property condition, or appreciation thesis.",
  },
  {
    q: "Has 'good cap rate' changed over the past few years?",
    a: "Significantly. From 2010-2022 with mortgage rates at 3-5%, cap rates of 5-6% were attractive because leverage was nearly free. In 2026 with rates at 6.5-7.5%, that same 5-6% cap rate is mediocre — leverage costs more than the property earns. The 'good cap rate' bar has risen by roughly 1-1.5 percentage points to compensate. Sellers haven't fully repriced, which is why so many deals 2024-26 don't pencil.",
  },
  {
    q: "Should I use NOI or pro-forma NOI for cap rate?",
    a: "For triage: pro-forma NOI (your projected operating performance once you take over). For final underwriting: trailing 12-month actual NOI from the seller's books, if available, plus your conservative adjustments. Brokers will pitch optimistic pro-forma cap rates — always recompute using your own assumptions before deciding.",
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
    // Author points at the /about Person entity (E-E-A-T anchor @id).
    author: { "@type": "Person", "@id": `${siteUrl}/about#morgan`, name: "Morgan Page", url: `${siteUrl}/about` },
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
          <Link href="/blog" className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground">
            ← TrueCap Blog
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 leading-tight text-balance">
            {TITLE}
          </h1>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mt-3">
            {new Date(PUBLISHED_AT).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}{" "}
            · {READING_TIME_MIN} min read
          </p>
          <BlogByline />
          <p className="text-base sm:text-lg text-muted-foreground mt-4 leading-relaxed">
            {DESCRIPTION}
          </p>
        </header>

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">
          <p>
            &ldquo;Is a 7% <Link href="/glossary/cap-rate" className="text-primary font-semibold hover:underline">cap rate</Link> good?&rdquo; is one of the most-Googled
            questions in real estate investing — and one of the worst-answered.
            The honest answer is: <em>it depends</em>. On the market. On the
            rate environment. On the property type. On what alternative
            investments you&apos;re comparing it to. This post gives you the
            framework professional investors actually use to decide whether a
            cap rate is good, instead of leaving you with another vague
            internet number.
          </p>

          <h2 className="text-2xl sm:text-3xl">What&apos;s a good cap rate? The short answer</h2>
          <p>
            A good cap rate for rental property in 2026 is <strong>6-10%</strong> in cash-flow markets (Cleveland, Indianapolis, Memphis), <strong>5-7%</strong> in balanced markets (Atlanta, Phoenix, Charlotte), and <strong>3-5%</strong> in appreciation markets (Boston, Bay Area, Manhattan). Anything below the prevailing 10-year Treasury yield (~4-5%) requires strong appreciation thesis to justify.
          </p>
          <p>By tier:</p>
          <ul>
            <li>
              <strong>Cash-flow markets</strong> (<Link href="/markets/cleveland" className="text-primary font-semibold hover:underline">Cleveland</Link>, Indianapolis,
              Memphis, Birmingham, older Sun Belt multifamily): <strong>6-10%</strong>
              is healthy. Above 10% requires scrutiny.
            </li>
            <li>
              <strong>Balanced markets</strong> (Atlanta, Phoenix, Charlotte,
              Nashville, Austin): <strong>5-7%</strong> is typical. The trade-off
              is mix of cash flow + appreciation.
            </li>
            <li>
              <strong>Appreciation markets</strong> (Bay Area, Seattle, Boston,
              Manhattan, coastal California, Miami): <strong>3-5%</strong> is the
              norm. Return depends on price growth, not yield.
            </li>
          </ul>
          <p>
            But these benchmarks shifted up by ~1-1.5 percentage points in
            2024 when mortgage rates went vertical, and most sellers haven&apos;t
            fully adjusted. Anyone underwriting at pre-2022 benchmarks today is
            buying into negative leverage without realizing it.
          </p>

          <h2 className="text-2xl sm:text-3xl">The right way to evaluate a cap rate</h2>
          <p>
            Three comparisons matter. Skip any one and you&apos;ll either
            overpay or pass on something genuinely good.
          </p>

          <h3>1. Compare to the local market median</h3>
          <p>
            What&apos;s the typical cap rate for similar properties in this
            specific submarket? Brokers usually know. CoStar, RealPage, and
            CBRE quarterly reports publish this for multifamily. For
            single-family rentals, scan recently-sold listings on the MLS for
            6 months and compute the median yourself. If the deal you&apos;re
            looking at is materially below market, the seller is either
            underpriced or hiding something. Above market, you have negotiating
            room.
          </p>

          <h3>2. Compare to the 10-year Treasury yield</h3>
          <p>
            The 10-year Treasury is the closest thing to a risk-free return.
            Real estate isn&apos;t risk-free — tenants leave, roofs leak,
            properties don&apos;t sell on demand. Your cap rate needs to
            compensate for all of that PLUS a real return on top.
          </p>
          <p>
            The rule professional investors use: <strong>cap rate should beat
            the 10-year Treasury by at least 200-300 basis points (2-3
            percentage points).</strong> With 10-year Treasuries at ~4.5% in
            mid-2026, that puts your cap rate floor at roughly 6.5-7.5%. Below
            that, you&apos;re explicitly accepting sub-risk-free risk-adjusted
            return, which only makes sense if (a) you have a strong
            appreciation thesis or (b) you&apos;re harvesting meaningful tax
            benefits (depreciation shield, 1031 exchange optionality).
          </p>

          <h3>3. Compare to your borrowing cost</h3>
          <p>
            This is the one that&apos;s catching most investors flat-footed in
            2026. If your mortgage rate is 7%, every dollar you borrow costs
            7% per year. If the property earns a 6% cap rate, every borrowed
            dollar is LOSING 1% per year. That&apos;s called <strong>negative
            leverage</strong> and it&apos;s the dominant problem in 2026
            underwriting.
          </p>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-sm sm:text-base font-mono">
              <strong>Positive leverage:</strong> cap rate &gt; borrowing rate
            </div>
            <div className="text-sm sm:text-base font-mono mt-1">
              <strong>Negative leverage:</strong> cap rate &lt; borrowing rate
            </div>
          </div>
          <p>
            You can still buy negative-leverage deals — sometimes they&apos;re
            justified by appreciation, principal paydown, or tax benefits. But
            you need to know what you&apos;re signing up for. Don&apos;t
            accidentally buy negative leverage because you anchored on
            pre-2022 cap-rate intuition.
          </p>

          <h2 className="text-2xl sm:text-3xl">Cap rate benchmarks by market type</h2>
          <div className="not-prose overflow-x-auto rounded-xl border border-border bg-card my-6">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 font-bold text-foreground">Market type</th>
                  <th className="text-left p-3 font-bold text-foreground">Typical cap (2026)</th>
                  <th className="text-left p-3 font-bold text-foreground">Return assumption</th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-3 [&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-0">
                <tr><td className="text-muted-foreground">Cash-flow secondary (Midwest, older Sun Belt MF)</td><td>6-10%</td><td>Mostly cash flow</td></tr>
                <tr><td className="text-muted-foreground">Balanced growth (Sun Belt primary)</td><td>5-7%</td><td>Mix cash flow + appreciation</td></tr>
                <tr><td className="text-muted-foreground">Appreciation (coastal Tier-1)</td><td>3-5%</td><td>Mostly appreciation</td></tr>
                <tr><td className="text-muted-foreground">Luxury / ultra-coastal</td><td>2-4%</td><td>Trophy asset, capital preservation</td></tr>
                <tr><td className="text-muted-foreground">Distressed / value-add</td><td>10%+ pro-forma</td><td>Forced appreciation via reno</td></tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl sm:text-3xl">Cap rate red flags</h2>

          <h3>Pro-forma cap rate that&apos;s 30%+ above trailing</h3>
          <p>
            If the broker&apos;s pro-forma cap rate (their projected
            performance for you) is dramatically higher than the trailing
            12-month actual, ask why. Usually it&apos;s assumed rent bumps
            that may or may not be achievable, plus aggressive expense
            assumptions. Recompute using trailing actuals first, then layer
            on YOUR conservative growth assumptions.
          </p>

          <h3>Cap rate below the 10-year Treasury</h3>
          <p>
            Sub-Treasury cap rates require either strong appreciation thesis,
            tax-strategy harvest, or trophy-asset rationale. If you can&apos;t
            articulate which one in two sentences, walk.
          </p>

          <h3>Cap rate without a matching cash-flow reserve</h3>
          <p>
            Many cap-rate quotes leave out <Link href="/glossary/capex" className="text-primary font-semibold hover:underline">capital expenditure reserves</Link> (the
            5-10% of rent you&apos;ll need for roof, HVAC, water heater
            replacements over time). Lender-style <Link href="/glossary/noi" className="text-primary font-semibold hover:underline">NOI</Link> leaves CapEx below the line;
            TrueCap follows that convention for cap rate and DSCR, then
            subtracts the reserve from cash flow and cash-on-cash return. If
            a quoted cap rate omits the reserve, compare it on the same NOI
            basis but still fund CapEx before judging spendable returns. (Full breakdown in our <Link href="/blog/rental-property-pro-forma-explained" className="text-primary font-semibold hover:underline">rental property pro forma guide</Link>.)
          </p>

          <h2 className="text-2xl sm:text-3xl">The simplest way to check</h2>
          <p>
            Stop trying to remember the right number. Plug your specific
            property into a calculator that computes cap rate, compares to
            current Treasury yield, flags negative leverage, and stress-tests
            against -10% rent. Takes 30 seconds. Tells you whether the cap
            rate is genuinely good for THIS property in TODAY&apos;s rate
            environment — not based on benchmarks from a 2019 BiggerPockets
            article.
          </p>

          <div className="not-prose">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold hover:opacity-95 transition-opacity"
            >
              <Calculator className="w-4 h-4" />
              Check a real deal in 60 seconds
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <p>
            Or, if you just want the standalone math:{" "}
            <Link href="/tools/cap-rate-calculator" className="text-primary font-semibold hover:underline">
              free cap-rate calculator →
            </Link>
          </p>

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
      <div className="max-w-3xl mx-auto px-4 sm:px-6"><NewsletterSignup variant="expanded" source="blog" /></div>

        <footer className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Related: <Link href="/blog/cap-rate-vs-cash-on-cash-vs-dscr" className="font-bold text-foreground hover:underline">Cap rate vs cash-on-cash vs DSCR →</Link>{" "}
            ·{" "}
            <Link href="/blog/how-to-underwrite-a-rental-property-in-60-seconds" className="font-bold text-foreground hover:underline">How to underwrite a rental in 60 seconds →</Link>
          </p>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
      <BlogStickyCta />
    </div>
  );
}
