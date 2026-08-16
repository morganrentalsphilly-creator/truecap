/**
 * Anchor blog post #5 — "Cash flow vs appreciation: which rental
 * strategy actually wins in 2026?"
 *
 * Targets high-volume investor strategy queries:
 *   - "cash flow vs appreciation"
 *   - "real estate cash flow vs appreciation"
 *   - "should i invest for cash flow or appreciation"
 *   - "appreciation vs cash flow real estate"
 *
 * Different angle from the other 4 posts (which are mostly metric
 * explainers / financing). This is a STRATEGY post — broadens the
 * audience to include investors who haven't decided what to optimize
 * for yet.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Calculator } from "lucide-react";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "cash-flow-vs-appreciation";
const TITLE = "Cash flow vs appreciation: which rental strategy actually wins in 2026?";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Cash flow vs appreciation: which wins in 2026?";
const DESCRIPTION =
  "Cash-flow investors and appreciation investors both think they're right. Both can be. A 10-year side-by-side that quantifies when each strategy wins — and the specific 2026 conditions that have flipped the historical math.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = "2026-06-01";
const READING_TIME_MIN = 9;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "cash flow vs appreciation",
    "real estate cash flow vs appreciation",
    "should i invest for cash flow or appreciation",
    "appreciation vs cash flow real estate",
    "cash flow investing",
    "appreciation investing",
    "rental property strategy",
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
    q: "Which strategy makes more money over 10 years?",
    a: "Depends on the appreciation rate. Historically (last 30 years, ~3% national average appreciation), appreciation-heavy strategies have edged out cash-flow strategies on total return — but with much higher variance. In high-appreciation markets (Bay Area, Boston, Seattle averaging 5-7%), appreciation wins decisively. In flat / declining markets (parts of the Midwest), cash flow wins. For most investors in most markets in 2026, a balanced market with both cash flow AND appreciation slightly above zero is the sweet spot.",
  },
  {
    q: "Isn't cash flow safer?",
    a: "Mostly yes. Cash-flow deals give you a buffer against vacancy, repair surprises, and rate spikes — the property is still paying for itself even when things go wrong. Appreciation plays assume you can hold through downturns; if you're forced to sell during a price dip (job loss, divorce, life event), appreciation strategies can produce real losses while cash-flow strategies usually just stop earning.",
  },
  {
    q: "What's the role of tax benefits in this comparison?",
    a: "Significant. Depreciation deductions often turn a positive-cash-flow rental into a paper tax loss, sheltering the cash flow from income tax. For high-income investors (real estate professionals or those with passive income to offset), this can add 1-3% effective annual return to either strategy. Appreciation gets favorable long-term capital gains treatment when sold; can be deferred indefinitely via 1031 exchange.",
  },
  {
    q: "What about principal paydown — does that count as cash flow or appreciation?",
    a: "Neither, technically. Principal paydown is forced savings — your tenant pays down the mortgage, building your equity without you spending the cash. Over a 30-year hold, principal paydown alone typically returns 4-7% per year on the original investment. Most cash-flow vs appreciation debates ignore it, which is a mistake — it can be the largest single return component on long-term holds.",
  },
  {
    q: "Does 2026's high-rate environment change the answer?",
    a: "Financing cost changes leverage, but there is no single current rate, cap rate, or market-wide result. Compare a property-specific loan quote with verified NOI, and run flat, upside, and downside rent, expense, rate, and exit scenarios. Neither a cash-flow label nor an appreciation thesis is inherently safe.",
  },
  {
    q: "Can a single deal do both?",
    a: "Yes — that's the sweet spot most experienced investors target. Balanced markets (Sun Belt primary cities like Atlanta, Charlotte, Nashville) historically offer 5-7% cap rates AND 3-4% appreciation. Combined with principal paydown + tax savings, total levered return lands 12-18%. Single-deal optimization is harder than picking a strategy and committing to it, but it's the most resilient long-term.",
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
    author: { "@type": "Person", name: "Morgan Page", url: siteUrl },
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
          <p className="text-base sm:text-lg text-muted-foreground mt-4 leading-relaxed">
            {DESCRIPTION}
          </p>
        </header>

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">
          <p>
            Walk into any real-estate investor meetup and you&apos;ll find two
            tribes. The cash-flow people think appreciation investors are
            gamblers. The appreciation people think cash-flow investors are
            penny-pinchers leaving real wealth on the table. Both are
            partly right, and the truth is more interesting than either
            camp wants to admit.
          </p>

          <p>
            This post runs the math on both strategies over a realistic
            10-year hold, in three different market environments, with
            2026 borrowing costs. By the end you&apos;ll know which one fits
            your situation and what to actually optimize for.
          </p>

          <h2 className="text-2xl sm:text-3xl">Defining the terms</h2>
          <p>
            <strong>Cash-flow investing</strong>: buy in markets where the
            property generates positive <Link href="/glossary/monthly-cash-flow" className="text-primary font-semibold hover:underline">monthly cash flow</Link> after every
            expense + the mortgage. Optimize for <Link href="/glossary/cap-rate" className="text-primary font-semibold hover:underline">cap rate</Link> and <Link href="/glossary/dscr" className="text-primary font-semibold hover:underline">DSCR</Link>.
            Typical markets: Midwest cash-flow cities like{" "}
            <Link href="/markets/cleveland" className="text-primary font-semibold hover:underline">Cleveland</Link>{" "}
            and <Link href="/markets/indianapolis" className="text-primary font-semibold hover:underline">Indianapolis</Link>,
            older Sun Belt multifamily, blue-collar suburbs.
          </p>
          <p>
            <strong>Appreciation investing</strong>: buy in markets where
            price growth is fast and reliable, even if monthly cash flow
            is thin or slightly negative. Optimize for total return over
            5-10 years, not monthly income. Typical markets: coastal
            Tier-1, fast-growing Sun Belt primary cities, supply-
            constrained metros.
          </p>
          <p>
            <strong>Most investors aren&apos;t pure either</strong>. A 6%
            cap rate property with 3% appreciation has both. The real
            question is which side of the bet you weight more heavily
            when picking deals.
          </p>

          <h2 className="text-2xl sm:text-3xl">The 4 sources of rental return</h2>
          <p>
            Before we compare, name the components. Every rental property
            generates total return from four buckets, and the cash-flow
            vs appreciation debate often ignores two of them:
          </p>
          <ol>
            <li>
              <strong>Cash flow</strong> — net monthly income after all expenses + mortgage. Run any deal&apos;s number in 30 seconds with the <Link href="/tools/rental-cash-flow-calculator" className="text-primary font-semibold hover:underline">rental cash flow calculator</Link>.
            </li>
            <li>
              <strong>Principal paydown</strong> — your tenant pays down the mortgage. Forced savings. Usually 4-7% annual return on original investment.
            </li>
            <li>
              <strong>Appreciation</strong> — property value growth. Unrealized until you sell or refinance.
            </li>
            <li>
              <strong><Link href="/glossary/tax-savings" className="text-primary font-semibold hover:underline">Tax savings</Link></strong> — depreciation shields cash flow + interest deducts at your marginal rate. 1-3% effective annual return for most investors. (See <Link href="/blog/rental-property-tax-deductions" className="text-primary font-semibold hover:underline">rental property tax deductions</Link> for the full list.)
            </li>
          </ol>
          <p>
            Total return = sum of all four. The cash-flow tribe usually
            counts buckets 1, 2, 4 and discounts 3. The appreciation tribe
            counts 3 heavily and downplays 1. Both miss bucket 2 entirely.
          </p>

          <h2 className="text-2xl sm:text-3xl">10-year comparison: 3 markets</h2>
          <p>
            Same investor, same $400k purchase, 25% down, 7% rate, 10-year hold.
            Different cap rates and appreciation assumptions for each market.
          </p>
          <div className="not-prose overflow-x-auto rounded-xl border border-border bg-card my-6">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 font-bold text-foreground">Market type</th>
                  <th className="text-left p-3 font-bold text-foreground">Cash flow (10y)</th>
                  <th className="text-left p-3 font-bold text-foreground">Principal paydown</th>
                  <th className="text-left p-3 font-bold text-foreground">Appreciation</th>
                  <th className="text-left p-3 font-bold text-foreground">Total return on $100k cash</th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-3 [&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-0">
                <tr>
                  <td>
                    <strong className="text-foreground">Cash-flow heavy</strong>
                    <div className="text-[11px] text-muted-foreground">8% cap · 1% appreciation</div>
                  </td>
                  <td>~$36,000</td>
                  <td>~$58,000</td>
                  <td>~$42,000</td>
                  <td>~136%</td>
                </tr>
                <tr>
                  <td>
                    <strong className="text-foreground">Balanced</strong>
                    <div className="text-[11px] text-muted-foreground">6% cap · 3% appreciation</div>
                  </td>
                  <td>~$8,000</td>
                  <td>~$58,000</td>
                  <td>~$138,000</td>
                  <td>~204%</td>
                </tr>
                <tr>
                  <td>
                    <strong className="text-foreground">Appreciation heavy</strong>
                    <div className="text-[11px] text-muted-foreground">4% cap · 5% appreciation</div>
                  </td>
                  <td>~−$24,000</td>
                  <td>~$58,000</td>
                  <td>~$252,000</td>
                  <td>~286%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            <em>Conservative estimate; ignores tax savings + assumes
            appreciation actually materializes. Real numbers vary by
            market, loan terms, and what year the cycle catches you.</em>
          </p>

          <h2 className="text-2xl sm:text-3xl">What the table actually shows</h2>
          <p>
            Three takeaways most strategy debates miss:
          </p>

          <h3>1. Appreciation wins on paper when it happens</h3>
          <p>
            5% annual appreciation compounded over 10 years on a $400k
            property is $252k of value growth — massively more than any
            cash flow stream could match. If you genuinely believe in
            5%+ appreciation for your market and you can stomach the
            negative monthly cash flow, the math favors appreciation.
          </p>

          <h3>2. Principal paydown is huge and ignored</h3>
          <p>
            ~$58k of principal paydown over 10 years on a $300k loan at
            7%. That&apos;s the same across all three strategies — every
            month, your tenant builds your equity. On the cash-flow-heavy
            row, principal paydown is bigger than cash flow itself. Most
            comparisons skip this entirely.
          </p>

          <h3>3. Cash flow protects the downside</h3>
          <p>
            The appreciation-heavy row has -$24k cash flow over 10 years
            — you&apos;re feeding the property out of pocket every month.
            If life changes (job loss, market dip, forced sale), you
            don&apos;t have the same modeled cushion. Positive modeled cash flow
            can improve resilience, but it is not bulletproof: rent, vacancy,
            collections, expenses, capital work, financing, and sale proceeds
            can all differ from the scenario.
          </p>

          <h2 className="text-2xl sm:text-3xl">The 2026 plot twist</h2>
          <p>
            All of the above assumes appreciation actually happens. From
            historical periods produced different results by market, but none
            establishes a future path. Current rates and year-over-year price
            changes also move continuously. Underwrite flat, upside, and
            downside appreciation cases using current local evidence rather
            than treating a national narrative as a forecast.
          </p>
          <p>
            If you&apos;re betting on appreciation in 2026, you&apos;re
            making an active forecast call. The historical 3% national
            average doesn&apos;t apply in every market — and you&apos;re
            paying it with NEGATIVE monthly cash flow in the appreciation
            scenario above. Get the appreciation forecast wrong and the
            deal is a real loss.
          </p>
          <p>
            That&apos;s why most 2026 underwriting weighs cash flow more
            heavily than 2018 underwriting did. Cash flow is observable;
            appreciation is a guess.
          </p>

          <h2 className="text-2xl sm:text-3xl">Which strategy fits you</h2>
          <p>Honest answers to honest questions:</p>
          <ul>
            <li>
              <strong>How long can you hold?</strong> Appreciation needs 7-10+
              years to reliably outperform. Less than 5? Cash flow.
            </li>
            <li>
              <strong>Can you survive a forced sale?</strong> If a job loss
              or life event would force you to liquidate during a dip,
              appreciation strategies become dangerous. Cash flow gives
              you the option to wait it out.
            </li>
            <li>
              <strong>What&apos;s your day-job income?</strong> High income +
              ability to use real-estate-professional tax status?
              Appreciation gets boosted by tax savings. Low day-job
              income? Cash flow is more useful.
            </li>
            <li>
              <strong>What&apos;s your conviction on the market?</strong>{" "}
              If you don&apos;t have a specific reason to believe Market X
              will appreciate, don&apos;t buy there as an appreciation
              play. Cash flow markets give you a deal that works even
              with 0% appreciation.
            </li>
          </ul>

          <h2 className="text-2xl sm:text-3xl">The hybrid sweet spot</h2>
          <p>
            The boring-but-right answer: most experienced investors
            target balanced markets with 5-7% cap rates AND 3-4% expected
            appreciation. Combined with principal paydown and tax
            savings, total levered return lands in the 12-18% range. You
            get cash flow that pays the bills, appreciation that
            compounds, downside protection if appreciation underdelivers,
            and tax benefits on top.
          </p>
          <p>
            Concrete 2026 examples of that balance:{" "}
            <Link href="/markets/atlanta" className="text-primary font-semibold hover:underline">Atlanta</Link>,{" "}
            <Link href="/markets/charlotte" className="text-primary font-semibold hover:underline">Charlotte</Link>, and{" "}
            <Link href="/markets/tampa" className="text-primary font-semibold hover:underline">Tampa</Link>{" "}
            tend to pair mid-single-digit cap rates with a real appreciation tailwind — see each
            market&apos;s breakdown for current cap-rate and rent benchmarks.
          </p>
          <p>
            Picking that hybrid sweet spot deal requires actually
            computing all four return components for a specific property,
            in a specific market, at your specific financing — not just
            anchoring on a strategy.
          </p>

          <div className="not-prose">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold hover:opacity-95 transition-opacity"
            >
              <Calculator className="w-4 h-4" />
              Run a real deal — all 4 return components
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <p>
            TrueCap models cash flow, principal paydown, appreciation,
            and tax savings on the same screen so you can see which
            strategy each specific deal actually rewards — without
            having to pick a side first.
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
            Related:{" "}
            <Link href="/blog/what-is-a-good-cap-rate" className="font-bold text-foreground hover:underline">
              What&apos;s a good cap rate in 2026 →
            </Link>{" "}
            ·{" "}
            <Link href="/blog/cap-rate-vs-cash-on-cash-vs-dscr" className="font-bold text-foreground hover:underline">
              Cap rate vs CoC vs DSCR →
            </Link>{" "}
            ·{" "}
            <Link href="/glossary" className="font-bold text-foreground hover:underline">
              Glossary →
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
