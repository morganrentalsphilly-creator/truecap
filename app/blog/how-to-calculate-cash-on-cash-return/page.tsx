/**
 * How-to blog post — How to calculate cash-on-cash return.
 *
 * Targets high-intent calculator-adjacent queries:
 *   - "how to calculate cash on cash return"
 *   - "cash on cash return formula"
 *   - "coc return calculator"
 *   - "cash on cash return real estate"
 *   - "cash on cash vs cap rate"
 *   - "how to calculate coc"
 *   - "what is a good cash on cash return"
 *   - "rental property roi calculation"
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

const SLUG = "how-to-calculate-cash-on-cash-return";
const TITLE = "How to calculate cash-on-cash return on a rental property — 2026 guide";
const DESCRIPTION =
  "Cash-on-cash return = annual cash flow ÷ total cash invested. It&apos;s the only metric that tells you the return on the dollars you actually put in. Here&apos;s the formula, what counts as &lsquo;total cash invested,&rsquo; three worked examples, and the trap most calculators fall into.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = "2026-06-07";
const READING_TIME_MIN = 7;

export const metadata: Metadata = {
  title: `${TITLE} | TrueCap Blog`,
  description: DESCRIPTION,
  keywords: [
    "how to calculate cash on cash return",
    "cash on cash return formula",
    "coc return calculator",
    "cash on cash return real estate",
    "cash on cash vs cap rate",
    "how to calculate coc",
    "what is a good cash on cash return",
    "rental property roi calculation",
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
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/home.jpg"],
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What's the cash-on-cash return formula?",
    a: "Cash-on-cash (CoC) return = annual pre-tax cash flow ÷ total cash invested. Annual cash flow = NOI − annual debt service (12 × monthly mortgage payment). Total cash invested = down payment + closing costs + upfront rehab + initial reserves. Express the result as a percentage. Year 1 CoC is the standard quoted number; it changes over time as rents grow but cash invested stays fixed.",
  },
  {
    q: "What counts as 'total cash invested'?",
    a: "Everything you put into the deal before it stabilizes: (1) down payment, (2) closing costs (typically 2-4% of purchase price — title, lender fees, inspections, appraisal, transfer taxes), (3) any upfront rehab or make-ready costs to make it rentable, (4) any operating reserves you fund at closing. NOT included: the loan amount (that's the bank's money), or future repairs you'll pay out of cash flow.",
  },
  {
    q: "What's a good cash-on-cash return?",
    a: "Investor benchmarks vary, but rough guidance: under 4% suggests you're betting on appreciation; 4-8% is conservative buy-and-hold territory; 8-12% is solid in most markets; 12%+ usually means heavy leverage, secondary markets, or value-add. The 'right' CoC depends on what you're optimizing — a 6% CoC in Austin with strong appreciation often beats a 14% CoC in a declining Midwest market once you factor in vacancy risk and capital appreciation. Don't chase CoC for its own sake.",
  },
  {
    q: "How does cash-on-cash return differ from cap rate?",
    a: "Cap rate is unlevered yield (NOI ÷ price) — it ignores financing entirely. Cash-on-cash is levered return (cash flow ÷ cash invested) — it bakes in your specific financing. When the mortgage rate is below the cap rate, leverage amplifies returns (positive leverage) and CoC exceeds cap rate. When the rate is above the cap rate, leverage hurts (negative leverage) and CoC drops below cap rate. In 2026 with rates at 6.5-7.5% and many markets trading at 5-6% cap rates, leverage is often negative — a sign that buyers are paying for expected appreciation, not yield.",
  },
  {
    q: "Should I include principal paydown in cash flow?",
    a: "No — at least not in standard cash-on-cash. CoC measures actual cash hitting your pocket, and principal paydown isn't cash you receive. It's wealth accumulation (equity built), so it counts toward total return, not cash-on-cash return. If you want a combined metric, look at IRR or 'equity return' (cash flow + principal paydown + appreciation) ÷ cash invested. CoC stays purely about cash.",
  },
  {
    q: "Why does year-1 cash-on-cash matter if rents grow?",
    a: "Year 1 is the moment of decision: it's when you're deciding whether to buy. The CoC you can actually verify against current rents is the year-1 number. CoC growth in years 2-10 depends on rent growth assumptions you can't verify — those are projections. Underwrite to year 1 actuals; treat the trajectory as a bonus, not the basis for the buy decision.",
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
  const howToLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to calculate cash-on-cash return on a rental property",
    description: "Five-step process: compute NOI, subtract annual debt service for cash flow, tally total cash invested, divide.",
    step: [
      { "@type": "HowToStep", name: "Compute NOI", text: "Gross rent minus vacancy minus all operating expenses. NOT including mortgage." },
      { "@type": "HowToStep", name: "Compute annual debt service", text: "Monthly mortgage payment (principal + interest) × 12." },
      { "@type": "HowToStep", name: "Calculate annual cash flow", text: "NOI minus annual debt service equals annual pre-tax cash flow." },
      { "@type": "HowToStep", name: "Tally total cash invested", text: "Down payment + closing costs + upfront rehab + initial reserves." },
      { "@type": "HowToStep", name: "Divide cash flow by cash invested", text: "Express as percentage. This is year-1 cash-on-cash return." },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }} />

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
            Cash-on-cash return = annual cash flow ÷ total cash invested.
            It&apos;s the only metric that tells you the return on the
            dollars you actually put in. Here&apos;s the formula, what
            counts as &ldquo;total cash invested,&rdquo; three worked
            examples, and the trap most calculators fall into.
          </p>
        </header>

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">

          <h2 className="text-2xl sm:text-3xl">The cash-on-cash formula</h2>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-base sm:text-lg font-mono">
              <span className="font-bold">CoC</span> = Annual pre-tax cash flow ÷ Total cash invested
            </div>
          </div>
          <p>
            Cap rate measures the property. Cash-on-cash measures
            <em> you</em> &mdash; specifically, the return on the
            dollars you actually wrote checks for. Two investors buying
            the same property at the same price can have radically
            different cash-on-cash returns based purely on how much they
            put down.
          </p>

          <h2 className="text-2xl sm:text-3xl">The 5-step process</h2>

          <h3>Step 1: Compute NOI</h3>
          <p>
            Net operating income = gross rent − vacancy − operating
            expenses (taxes, insurance, management, maintenance reserve,
            CapEx reserve, utilities, HOA). NOT including mortgage. Full
            walkthrough in <Link href="/blog/how-to-calculate-cap-rate" className="text-primary font-semibold hover:underline">how to calculate cap rate</Link>.
          </p>

          <h3>Step 2: Compute annual debt service</h3>
          <p>
            Monthly mortgage payment (principal + interest only — exclude
            tax/insurance escrow since those are already in operating
            expenses) × 12.
          </p>

          <h3>Step 3: Calculate annual cash flow</h3>
          <p>
            Annual cash flow = NOI − annual debt service. This is the
            pre-tax cash that actually hits your bank account.
          </p>

          <h3>Step 4: Tally total cash invested</h3>
          <p>What you wrote checks for, before stabilization:</p>
          <ul>
            <li><strong>Down payment.</strong> The non-financed portion
              of the purchase price.</li>
            <li><strong>Closing costs.</strong> Title, lender fees,
              inspection, appraisal, transfer taxes — usually 2-4% of
              purchase price.</li>
            <li><strong>Upfront rehab / make-ready.</strong> Anything you
              had to spend to make it rentable.</li>
            <li><strong>Initial reserves.</strong> Some investors fund
              3-6 months of debt service as an operating reserve at
              closing — that&apos;s real cash invested.</li>
          </ul>
          <p>
            <strong>NOT</strong> included: the loan amount (that&apos;s
            the bank&apos;s money), nor any future repairs you&apos;ll
            pay out of cash flow.
          </p>

          <h3>Step 5: Divide</h3>
          <p>
            Annual cash flow ÷ total cash invested. Express as
            percentage.
          </p>

          <h2 className="text-2xl sm:text-3xl">Worked example #1: leveraged single-family</h2>
          <p>
            $300K property, 25% down at 7%, $2,400/mo rent, NOI from
            cap-rate example $12,906.
          </p>
          <ul>
            <li>Loan amount: $225,000</li>
            <li>Monthly P&amp;I (30 year, 7%): $1,497</li>
            <li>Annual debt service: $17,964</li>
            <li>Annual cash flow: $12,906 − $17,964 = <strong>−$5,058</strong></li>
            <li>Cash invested: $75K down + $9K closing + $5K make-ready = $89,000</li>
            <li><strong>CoC:</strong> −$5,058 ÷ $89,000 = <strong>−5.7%</strong></li>
          </ul>
          <p>
            Negative CoC means you&apos;re writing a check every month
            to own this property. That can still make sense if you
            believe in strong appreciation, but in 2026 it&apos;s a hard
            sell — bidding for negative cash flow on a 4.3% cap rate
            with 7% mortgage rate is paying for hope.
          </p>

          <h2 className="text-2xl sm:text-3xl">Worked example #2: same property with more leverage</h2>
          <p>
            Same $300K property, but with a DSCR loan at 80% LTV /
            7.5%.
          </p>
          <ul>
            <li>Loan amount: $240,000</li>
            <li>Monthly P&amp;I (30 year, 7.5%): $1,678</li>
            <li>Annual debt service: $20,136</li>
            <li>Annual cash flow: $12,906 − $20,136 = <strong>−$7,230</strong></li>
            <li>Cash invested: $60K down + $9K closing + $5K make-ready = $74,000</li>
            <li><strong>CoC:</strong> −$7,230 ÷ $74,000 = <strong>−9.8%</strong></li>
          </ul>
          <p>
            More leverage made the deal worse, not better — because the
            mortgage rate (7.5%) is higher than the cap rate (4.3%).
            This is negative leverage in action. The cap rate / mortgage
            rate spread is the single biggest driver of whether leverage
            helps or hurts.
          </p>

          <h2 className="text-2xl sm:text-3xl">Worked example #3: a real deal in a higher-cap market</h2>
          <p>
            $180K Tier 3 single-family, $1,800/mo rent, 25% down at 7%.
            Cap rate is ~8% on the same expense methodology.
          </p>
          <ul>
            <li>NOI (~8% cap): ~$14,400</li>
            <li>Loan: $135K at 7% / 30 = $898/mo P&amp;I</li>
            <li>Annual debt service: $10,776</li>
            <li>Annual cash flow: $14,400 − $10,776 = <strong>$3,624</strong></li>
            <li>Cash invested: $45K down + $5.4K closing + $3K make-ready = $53,400</li>
            <li><strong>CoC:</strong> $3,624 ÷ $53,400 = <strong>6.8%</strong></li>
          </ul>
          <p>
            8% cap, 7% mortgage rate, 1 point of positive leverage on
            75% LTV — gets you a 6.8% CoC return. Not spectacular, but a
            real cash-flowing deal. Tier 3 markets carry vacancy and
            tenant risk you don&apos;t get in Tier 1, so a 6-8% CoC is
            often the realistic ceiling without value-add.
          </p>

          <h2 className="text-2xl sm:text-3xl">The trap most calculators fall into</h2>
          <p>
            The two biggest CoC mistakes:
          </p>
          <ul>
            <li><strong>Forgetting closing costs in cash invested.</strong>
              A 25% down payment is the headline number, but the actual
              cash out of pocket is 27-30% once you add closing. Skipping
              closing inflates CoC by 10-15%.</li>
            <li><strong>Using gross rent in cash flow instead of NOI.</strong>
              Subtracting mortgage from <em>gross</em> rent — instead of
              from NOI — produces a cash flow number that ignores
              vacancy, maintenance, and CapEx. The CoC looks 30-50%
              better than reality.</li>
          </ul>

          <div className="not-prose">
            <Link
              href="/tools/cash-on-cash-calculator"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold hover:opacity-95 transition-opacity"
            >
              <Calculator className="w-4 h-4" />
              Open the cash-on-cash calculator
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            Related reading: <Link href="/blog/how-to-calculate-cap-rate" className="text-primary font-semibold hover:underline">How to calculate cap rate</Link>, <Link href="/blog/cap-rate-vs-cash-on-cash-vs-dscr" className="text-primary font-semibold hover:underline">Cap rate vs cash-on-cash vs DSCR</Link>, <Link href="/blog/cash-on-cash-vs-irr" className="text-primary font-semibold hover:underline">Cash-on-cash vs IRR</Link>.
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
            Want CoC computed alongside cap rate, DSCR, and a 10-year
            projection — with the OpEx line items most calculators
            quietly skip? TrueCap does all of it in one screen.{" "}
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
