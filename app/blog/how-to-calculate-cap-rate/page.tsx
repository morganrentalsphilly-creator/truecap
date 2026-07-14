/**
 * How-to blog post — How to calculate cap rate.
 *
 * Targets high-intent calculator-adjacent queries:
 *   - "how to calculate cap rate"
 *   - "cap rate formula"
 *   - "how do you calculate cap rate"
 *   - "cap rate calculator"
 *   - "cap rate vs cash on cash"
 *   - "what is a good cap rate"
 *   - "cap rate explained"
 *   - "noi divided by purchase price"
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

const SLUG = "how-to-calculate-cap-rate";
const TITLE = "How to calculate cap rate (with worked examples) — 2026 guide";
const DESCRIPTION =
  "Cap rate = NOI ÷ purchase price. Sounds simple, but most investors get NOI wrong by skipping CapEx reserves or vacancy. Here&apos;s the formula, three worked examples (good deal / bad deal / cash purchase), and when cap rate is the wrong metric.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = "2026-06-07";
const READING_TIME_MIN = 7;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "how to calculate cap rate",
    "cap rate formula",
    "how do you calculate cap rate",
    "cap rate calculator",
    "cap rate vs cash on cash",
    "what is a good cap rate",
    "cap rate explained",
    "noi divided by purchase price",
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
    q: "What's the cap rate formula in one line?",
    a: "Cap rate = annual NOI ÷ purchase price (or current market value). NOI means net operating income — gross rents minus all operating expenses (taxes, insurance, maintenance, management, vacancy allowance, utilities you pay), but BEFORE mortgage payment. Mortgage is financing cost, not operating cost — never subtract it from NOI when computing cap rate.",
  },
  {
    q: "What counts as an operating expense in NOI?",
    a: "Property taxes, insurance, property management (typically 8-10% of rent), maintenance reserve (typically 1-1.5% of property value/year), CapEx reserve (typically 1% of property value/year), vacancy allowance (typically 5-8% of gross rents), utilities you pay (water, trash, sewer in many areas), HOA fees, and lawn/snow service. NOT: mortgage principal, mortgage interest, depreciation, or income tax.",
  },
  {
    q: "What's a good cap rate in 2026?",
    a: "Highly market-dependent. In Class A markets like Austin, Nashville, or Raleigh, 4-5% is competitive on stabilized properties. In Tier 2 / 3 markets like Cleveland, Memphis, or Birmingham, 7-9% is achievable but you take on more vacancy and rougher tenant pools. Above 10% usually means either heavy rehab risk, weak market fundamentals, or unrealistic NOI assumptions. Below 4% usually means you're paying for appreciation, not yield. There's no universal 'good' cap rate — it depends on what risk and market you're in.",
  },
  {
    q: "Should I use purchase price or market value in the denominator?",
    a: "Both are used in different contexts. Cap rate at purchase uses purchase price — useful for analyzing a specific deal. Cap rate at current market value (sometimes called 'yield on cost' when using purchase price) is useful for comparing across properties or tracking your portfolio. When commercial appraisers talk about cap rate, they typically mean market-value cap rate. When investors talk about a deal they bought, they usually mean purchase-price cap rate.",
  },
  {
    q: "Is cap rate higher always better?",
    a: "No. A 12% cap rate in a market where 7% is normal usually means something is wrong: deferred maintenance, vacancy risk you haven't priced in, neighborhood declining, or overstated rents. A 4% cap rate in a high-growth market where appreciation has averaged 7-9% annually can be a great deal. Cap rate is a starting filter, not a final answer.",
  },
  {
    q: "What's the difference between cap rate and cash-on-cash return?",
    a: "Cap rate ignores financing entirely (NOI ÷ price). Cash-on-cash includes the mortgage payment ((NOI − annual debt service) ÷ cash invested). So cap rate tells you the property's intrinsic yield, cash-on-cash tells you the return on the dollars you actually put in. A property with 6% cap rate can produce 12-15% cash-on-cash with 75% leverage when rates are below the cap rate — that spread is the 'positive leverage' that makes real estate work.",
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
  const howToLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to calculate cap rate on a rental property",
    description: "Five-step process to compute cap rate correctly: gather gross rent, subtract operating expenses to get NOI, divide by purchase price or market value.",
    step: [
      { "@type": "HowToStep", name: "Gather gross annual rent", text: "Multiply monthly market rent by 12. Use actual rent if leased, market rent if not." },
      { "@type": "HowToStep", name: "Subtract vacancy allowance", text: "Typical 5-8% of gross rents to account for turnover periods." },
      { "@type": "HowToStep", name: "Subtract operating expenses", text: "Property tax, insurance, management, maintenance reserve, CapEx reserve, utilities you pay, HOA. NOT mortgage." },
      { "@type": "HowToStep", name: "Calculate NOI", text: "What's left after vacancy and operating expenses. This is net operating income." },
      { "@type": "HowToStep", name: "Divide NOI by price", text: "Cap rate = NOI / purchase price. Express as percentage." },
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
          <BlogByline />
          <p className="text-base sm:text-lg text-muted-foreground mt-4 leading-relaxed">
            Cap rate = NOI ÷ purchase price. Sounds simple, but most
            investors get NOI wrong by skipping CapEx reserves or
            vacancy. Here&apos;s the formula, three worked examples
            (good deal / bad deal / cash purchase), and when cap rate
            is the wrong metric.
          </p>
        </header>

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">

          <h2 className="text-2xl sm:text-3xl">The cap rate formula</h2>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-base sm:text-lg font-mono">
              <span className="font-bold">Cap rate</span> = Annual NOI ÷ Purchase price
            </div>
          </div>
          <p>
            Two inputs. Get either one wrong and the cap rate lies to
            you. The formula is fine; the discipline is in how you
            compute NOI.
          </p>

          <h2 className="text-2xl sm:text-3xl">How to compute NOI correctly (5 steps)</h2>
          <p>
            NOI is net operating income — what the property earns after
            operating expenses but <em>before</em> debt service. Skipping
            any of the five steps below is the #1 reason cap rates look
            better on paper than they perform.
          </p>

          <h3>Step 1: Gross potential rent</h3>
          <p>
            Monthly market rent × 12. Use the actual lease rent if the
            property is currently rented; use comparable-property market
            rent if vacant.
          </p>

          <h3>Step 2: Subtract vacancy allowance</h3>
          <p>
            Typical 5-8% of gross rents. Even in a hot market, factor in
            turnover periods, the 30 days you might need to refresh
            between tenants, and a lease that ends mid-month. A property
            with a 12-year tenant is still going to turn over eventually.
          </p>

          <h3>Step 3: Subtract operating expenses</h3>
          <p>The full list — easy to skip half of these:</p>
          <ul>
            <li><strong>Property taxes</strong> (use the current
              assessment; some markets reassess at sale).</li>
            <li><strong>Insurance</strong> (landlord policy, not
              homeowner&apos;s).</li>
            <li><strong>Property management</strong> (8-10% of gross rent;
              include even if self-managing — your time has a real cost).</li>
            <li><strong>Maintenance reserve</strong> (1-1.5% of property
              value annually).</li>
            <li><strong>CapEx reserve</strong> (1% of property value
              annually for roof, HVAC, water heater, kitchen renovations,
              etc.).</li>
            <li><strong>Utilities you pay</strong> (water, trash, sewer
              in many areas; everything for multi-family common areas).</li>
            <li><strong>HOA fees</strong>, lawn/snow service, pest
              control.</li>
          </ul>
          <p>
            <strong>NOT</strong> in operating expenses: mortgage principal,
            mortgage interest, depreciation, or income tax. These are
            financing and tax items, not operating costs.
          </p>

          <h3>Step 4: Calculate NOI</h3>
          <p>
            What&apos;s left after step 2 and step 3. This is the
            property&apos;s true earning power.
          </p>

          <h3>Step 5: Divide by purchase price</h3>
          <p>
            NOI ÷ purchase price = cap rate. Multiply by 100 to express
            as a percentage.
          </p>

          <h2 className="text-2xl sm:text-3xl">Worked example #1: a good deal</h2>
          <p>
            $300K single-family in Tier 2 city, asking $300K, rents at
            $2,400/mo.
          </p>
          <ul>
            <li>Gross rent: $2,400 × 12 = <strong>$28,800</strong></li>
            <li>Vacancy (6%): −$1,728</li>
            <li>Effective gross income: $27,072</li>
            <li>Property tax: −$3,600</li>
            <li>Insurance: −$1,200</li>
            <li>Management (8%): −$2,166</li>
            <li>Maintenance (1.2%): −$3,600</li>
            <li>CapEx reserve (1%): −$3,000</li>
            <li>Utilities + HOA: −$600</li>
            <li><strong>NOI:</strong> $27,072 − $14,166 = <strong>$12,906</strong></li>
            <li><strong>Cap rate:</strong> $12,906 ÷ $300,000 = <strong>4.3%</strong></li>
          </ul>
          <p>
            That cap rate is low for a Tier 2 city — the seller&apos;s
            ask is rich for the rents. Maybe a great cash-on-cash deal
            with high leverage, but the property itself isn&apos;t a
            yield machine.
          </p>

          <h2 className="text-2xl sm:text-3xl">Worked example #2: the &ldquo;9% cap&rdquo; that isn&apos;t</h2>
          <p>
            Same property, but the broker tells you it&apos;s a &ldquo;9%
            cap.&rdquo;
          </p>
          <ul>
            <li>Gross rent: $28,800</li>
            <li>Property tax: −$3,600</li>
            <li>Insurance: −$1,200</li>
            <li>Broker&apos;s &ldquo;NOI&rdquo;: $28,800 − $4,800 = $24,000</li>
            <li>Broker&apos;s cap rate: $24,000 ÷ $300,000 = <strong>8%</strong></li>
          </ul>
          <p>
            The broker skipped vacancy, management, maintenance, CapEx,
            and utilities. The cap rate looks like 8% but the real one
            is 4.3%. This is the most common cap rate manipulation in
            broker pro formas — be ruthless about adding back every
            expense before trusting the number.
          </p>

          <h2 className="text-2xl sm:text-3xl">Worked example #3: cash purchase same property</h2>
          <p>
            Cap rate is identical regardless of financing — that&apos;s
            the whole point of using NOI (pre-debt service). A cash
            buyer of the property in example #1 gets the same 4.3% cap
            rate as a buyer using 75% leverage. Their cash-on-cash
            returns are very different; their cap rates are the same.
          </p>
          <p>
            This is why cap rate is the metric to use when comparing
            <em> properties</em>, and cash-on-cash is the metric to use
            when comparing <em> investments</em> (since financing is part
            of an investment decision but not part of a property&apos;s
            intrinsic yield).
          </p>

          <h2 className="text-2xl sm:text-3xl">When cap rate is the wrong metric</h2>
          <p>Cap rate breaks down in three cases:</p>
          <ul>
            <li><strong>Heavy rehab properties.</strong> A vacant
              gut-rehab has $0 NOI today. Cap rate at purchase is 0%
              regardless of upside. Use ARV cap rate (NOI after rehab ÷
              all-in cost) instead.</li>
            <li><strong>Short-term rentals.</strong> STR &ldquo;cap
              rates&rdquo; reported in listings often use unrealistically
              high projected revenue. Underwrite STRs on
              <Link href="/blog/short-term-rental-underwriting-playbook" className="text-primary font-semibold hover:underline"> cash flow with full OpEx buildup</Link> instead.</li>
            <li><strong>House hacks.</strong> When you live in one unit,
              the &ldquo;cap rate&rdquo; calculation is meaningless —
              use net housing cost vs. renting instead.
              <Link href="/blog/house-hack-underwriting-guide" className="text-primary font-semibold hover:underline"> Full guide here</Link>.</li>
          </ul>

          <div className="not-prose">
            <Link
              href="/tools/cap-rate-calculator"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold hover:opacity-95 transition-opacity"
            >
              <Calculator className="w-4 h-4" />
              Open the cap rate calculator
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            Related reading: <Link href="/blog/what-is-a-good-cap-rate" className="text-primary font-semibold hover:underline">What is a good cap rate</Link>, <Link href="/blog/cap-rate-vs-cash-on-cash-vs-dscr" className="text-primary font-semibold hover:underline">Cap rate vs cash-on-cash vs DSCR</Link>, <Link href="/glossary/cap-rate" className="text-primary font-semibold hover:underline">Cap rate (glossary)</Link>.
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
            Don&apos;t want to do the math by hand? TrueCap computes cap
            rate alongside cash flow, CoC, DSCR, and a 10-year
            projection — and surfaces the OpEx line items most calculators
            quietly skip.{" "}
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
