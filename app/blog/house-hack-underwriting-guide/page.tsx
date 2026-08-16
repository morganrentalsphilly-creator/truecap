/**
 * Strategy blog post — House hack underwriting guide.
 *
 * Targets high-intent queries:
 *   - "house hack underwriting"
 *   - "how to analyze a house hack"
 *   - "house hack vs rent"
 *   - "duplex house hack"
 *   - "fha 3.5 percent down house hack"
 *   - "owner occupant rental analysis"
 *   - "house hack calculator"
 *   - "house hack first investment property"
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

const SLUG = "house-hack-underwriting-guide";
const TITLE = "House hack underwriting: how to know if a duplex, triplex, or fourplex actually beats renting";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "House hack underwriting: does it beat renting?";
const DESCRIPTION =
  "House hacking sounds great in a podcast and confusing in a spreadsheet. The honest math: your housing cost vs. renting the equivalent, factoring in down payment, mortgage paydown, appreciation, and the very real cost of being your tenants' landlord.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = "2026-06-07";
const READING_TIME_MIN = 12;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "house hack underwriting",
    "how to analyze a house hack",
    "house hack vs rent",
    "duplex house hack",
    "fha 3.5 percent down house hack",
    "owner occupant rental analysis",
    "house hack calculator",
    "house hack first investment property",
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
    q: "What is house hacking in one sentence?",
    a: "Buying a 2-4 unit property (or a single-family with a lawful rentable configuration), living in part of it, and renting the rest to offset some housing cost. Eligible owner-occupants may have lower-down-payment options, but the borrower, property, occupancy, reserves, insurance, and program terms determine financing.",
  },
  {
    q: "What's the right benchmark — cash flow or housing savings?",
    a: "Housing savings, not cash flow. A house hack 'cash flowing' means rents from the other units exceed your mortgage plus expenses, which is rare in expensive markets. What matters is whether your net housing cost (PITI minus rents collected minus utility share from tenants) is lower than what you'd pay to rent a comparable place. If you'd pay $2,200/month to rent a 1-bed and your house hack nets you out at $800/month for the same housing quality, you're saving $1,400/month even if the property doesn't 'cash flow' in the traditional sense.",
  },
  {
    q: "Do I need to count the property as a rental for tax purposes?",
    a: "Mixed personal and rental use requires a supported allocation, and reporting depends on the facts, ownership, services provided, use days, basis, and current tax rules. Do not assume every allocated expense or loss is currently deductible, or that the owner-occupied share produces an itemized deduction. Have a qualified tax professional determine the treatment.",
  },
  {
    q: "Can I refinance out of the owner-occupant loan after I move out?",
    a: "A later move, lease, or refinance depends on the occupancy representations, loan documents, program rules, lender requirements, local rental law, insurance, and facts at that time. FHA generally requires intent to occupy as a principal residence within 60 days and for at least one year, but that rule is not blanket permission to convert the property or a promise that a refinance will be available.",
  },
  {
    q: "What's the catch with FHA 3.5% down?",
    a: "FHA eligibility, mortgage insurance, property standards, occupancy, reserves, and 3-4 unit Net Self-Sufficiency Rental Income Eligibility are governed by current HUD and lender requirements. Conventional alternatives use different, program-specific underwriting. Compare current written loan estimates and requirements; no generic percentage or TrueCap rent estimate implies approval.",
  },
  {
    q: "Should I house hack a duplex or a fourplex?",
    a: "Duplex if you value privacy and want to test landlording at small scale. Fourplex if you want maximum scale and tolerate more management complexity. Triplex is a sweet spot many investors love — three income streams, one shared roof, often eligible for FHA self-sufficiency. The actual answer depends on which configuration is available in your market at a price the underwriting supports — don't over-optimize between configurations you can't actually find.",
  },
  {
    q: "What's the biggest mistake first-time house hackers make?",
    a: "Underestimating the management overhead. Living next door to your tenants means hearing every late-night argument, fielding every drip-faucet text at 11pm, and handling every awkward conversation about late rent in person. It's not 'passive.' Build in a self-management premium when you compare to renting — your time has a real cost. Many house hackers move out at year 2 specifically to put distance between themselves and the management work.",
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
            House hacking sounds great in a podcast and confusing in a
            spreadsheet. The honest math: your housing cost vs. renting
            the equivalent, factoring in down payment, mortgage paydown,
            appreciation, and the very real cost of being your
            tenants&apos; landlord.
          </p>
        </header>

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">
          <p>
            House hacking is one of the highest-leverage moves in
            residential real estate: 3.5-5% down owner-occupant
            financing, the ability to offset most of your housing cost
            with tenant rent, and a year-1 head start on your investment
            career. But the math is misleading if you compare it to a
            traditional rental analysis — a house hack rarely &ldquo;cash
            flows&rdquo; in the way a pure rental does, and you can talk
            yourself out of great deals by using the wrong benchmark.
          </p>
          <p>
            This guide walks through what to actually model, the
            owner-occupant tax wrinkles, the FHA self-sufficiency test
            that kills many 3-4 unit deals, and the comparison that
            matters: house hack vs. renting the equivalent.
          </p>

          <h2 className="text-2xl sm:text-3xl">The right benchmark: housing cost vs. renting</h2>
          <p>
            A traditional rental is judged on cash flow, cap rate, and
            CoC return. A house hack should be judged primarily on
            whether your <strong>net housing cost</strong> beats renting
            the equivalent.
          </p>
          <p>
            Worked example. $500K duplex in a Tier 2 city. 5% owner-occupant
            conventional loan at 7%, PITI ~$3,800/month. You live in
            unit A; unit B rents for $1,900/month. Utilities $200/month
            (you pay common areas, tenant pays own).
          </p>
          <ul>
            <li><strong>Your net housing cost:</strong> $3,800 PITI +
              $200 utilities − $1,900 rent collected =
              <strong> $2,100/month</strong></li>
            <li><strong>Comparable rental cost:</strong> renting unit A
              on the open market would cost ~$1,900/month.</li>
            <li><strong>Apparent &ldquo;loss&rdquo; vs. renting:</strong>
              $2,100 − $1,900 = <strong>−$200/month</strong></li>
          </ul>
          <p>
            On the surface, this modeled cash outflow is $200/month higher than
            the comparison rent. Other scenario components to display separately
            include:
          </p>
          <ul>
            <li>Modeled principal reduction, which builds equity but is not
              spendable cash and depends on the actual amortization.</li>
            <li>Flat, upside, and downside property-value cases; appreciation
              is not earned monthly or guaranteed.</li>
            <li>An illustrative depreciation calculation based on a supported
              building basis and placed-in-service facts; current tax benefit
              depends on the taxpayer and applicable limits.</li>
          </ul>
          <p>
            Do not add projected appreciation, principal reduction, and a
            hypothetical tax effect to cash flow and call the total a monthly
            saving. Compare cash, equity, tax, liquidity, and exit scenarios
            separately, including buying and selling costs and downside cases.
          </p>

          <h2 className="text-2xl sm:text-3xl">The five-bucket model</h2>
          <p>
            For a proper house hack underwrite, model five separate
            buckets and don&apos;t conflate them:
          </p>

          <h3>1. Cash flow (the conventional rental metric)</h3>
          <p>
            All rents collected, minus all expenses (PITI + maintenance
            + vacancy + management + utilities you pay). This is what
            traditional underwriting calls cash flow. For most house
            hacks this number is negative because one unit is vacant to
            you — but it&apos;s the wrong primary metric.
          </p>

          <h3>2. Net housing cost (the house hack metric)</h3>
          <p>
            All cash out (PITI + utilities + your share of maintenance)
            minus rents collected. This is what you actually pay to live
            there. Compare directly to what you&apos;d pay to rent the
            equivalent.
          </p>

          <h3>3. Forced savings (mortgage paydown)</h3>
          <p>
            Annual principal paid down on the loan. Year 1 on a $475K
            7%/30-year loan is ~$5,000 — growing each year. This is real
            wealth accumulation that doesn&apos;t show up in cash flow.
          </p>

          <h3>4. Appreciation</h3>
          <p>
            Long-term residential appreciation has averaged 3-5%
            annually. On a $500K property that&apos;s $15-25K/year of
            expected wealth growth. Underwrite conservatively (3% or use
            the historical average for your specific MSA from FHFA data),
            but don&apos;t zero it out.
          </p>

          <h3>5. Tax shield</h3>
          <p>
            The rental portion of the property gets Schedule E treatment.
            That means depreciation, mortgage interest allocation, and
            operating expense deductions on the rented unit(s). Your
            occupied portion may receive different treatment. Allocation,
            deductibility, passive-loss limits, basis, and personal-use rules
            are taxpayer-specific; the model does not promise a tax shield.
          </p>

          <h2 className="text-2xl sm:text-3xl">The FHA self-sufficiency test (3-4 unit only)</h2>
          <p>
            FHA loans are the most-celebrated house hack vehicle — 3.5%
            down, lower credit score thresholds, owner-occupant rates.
            But for 3-4 unit properties, HUD applies a
            <strong> Net Self-Sufficiency Rental Income Eligibility</strong>{" "}
            calculation. The lender performs it using the current Handbook and
            appraisal inputs; a TrueCap rent scenario does not establish the
            eligible rent, denominator, result, or loan approval.
          </p>
          <p>
            If the FHA calculation does not support a proposed loan, possible
            next questions—not guaranteed workarounds—include:
          </p>
          <ul>
            <li><strong>A conventional owner-occupant quote</strong>:
              separate program, borrower, property, mortgage-insurance, and
              occupancy underwriting applies.</li>
            <li><strong>A different down payment</strong>: ask the lender to
              recalculate using verified terms; more equity does not by itself
              guarantee eligibility.</li>
            <li><strong>A different property</strong>: ask the lender whether a
              different eligible unit count changes the applicable underwriting;
              it still requires a complete property and borrower review.</li>
          </ul>

          <h2 className="text-2xl sm:text-3xl">FHA vs conventional owner-occupant — compare actual quotes</h2>
          <p>
            Compare lender-confirmed down payment, rate, APR, points, mortgage
            insurance, reserves, occupancy, eligible unit count, appraisal and
            property standards, self-sufficiency treatment, prepayment terms,
            and cash to close. Program rules and lender overlays change; neither
            label is automatically cheaper or easier for a specific borrower.
          </p>

          <h2 className="text-2xl sm:text-3xl">What to actually model</h2>
          <p>Build a model that&apos;s honest about:</p>

          <h3>1. Rental income on occupied units only (year 1)</h3>
          <p>
            Underwrite assuming your unit is vacant (to you) for the
            first 12 months. Use market rents on every other unit.
            Don&apos;t credit yourself with &ldquo;phantom rent&rdquo;
            for your own unit.
          </p>

          <h3>2. Realistic operating expenses</h3>
          <p>
            Maintenance 1.5-2% of property value annually, CapEx reserve
            1%, vacancy 8% (despite owner-occupant being there for year
            1+), property management 0 if self-managed (most house
            hackers do), utilities for common areas and any you provide.
            Don&apos;t skip CapEx reserves because the building
            &ldquo;looks new&rdquo; — the roof and furnace age
            regardless.
          </p>

          <h3>3. Year-1 vs. year-2 (the move-out year)</h3>
          <p>Run two scenarios:</p>
          <ul>
            <li><strong>Year 1 (you live there):</strong> your unit is
              vacant to you, your net housing cost vs. renting is the
              decision metric.</li>
            <li><strong>Year 2+ (you&apos;ve moved out, fully rented):</strong>
              all units producing market rent, traditional cash flow /
              CoC / cap rate analysis applies. This is what the property
              looks like as a pure rental once you move on.</li>
          </ul>

          <h3>4. The tax allocation</h3>
          <p>
            Square-footage allocation between owner-occupied and rental
            portions. Talk to a CPA on the specifics — the rules are
            mechanical but the deductions add up.
          </p>

          <h2 className="text-2xl sm:text-3xl">The non-financial costs</h2>
          <p>
            The honest part most house-hack content skips: you&apos;re
            living next door to your tenants. Specifically:
          </p>
          <ul>
            <li><strong>You hear everything.</strong> Loud guests, late
              arguments, kids running, dogs barking.</li>
            <li><strong>You&apos;re on call 24/7.</strong> The leaky
              toilet at midnight is your problem.</li>
            <li><strong>Conflict avoidance gets expensive.</strong> Many
              owner-occupant landlords let tenants slide on rent or lease
              violations because confronting someone you share walls
              with is hard.</li>
            <li><strong>Tenant turnover hits twice as hard.</strong> You
              hear the move-out at midnight and you have to coordinate
              the rehab while living next door to it.</li>
          </ul>
          <p>
            None of these kill the strategy. But they&apos;re why most
            successful house hackers move out at month 13 and convert
            the deal into a pure rental. House hacking is a tactic, not
            a long-term lifestyle.
          </p>

          <div className="not-prose">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold hover:opacity-95 transition-opacity"
            >
              <Calculator className="w-4 h-4" />
              Underwrite a house hack
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            Related reading: <Link href="/blog/house-hacking-explained" className="text-primary font-semibold hover:underline">House hacking explained</Link>, <Link href="/blog/best-rental-analysis-tool-for-house-hackers" className="text-primary font-semibold hover:underline">Best rental analysis tool for house hackers</Link>, <Link href="/blog/single-family-vs-multi-family-rental" className="text-primary font-semibold hover:underline">Single-family vs multi-family</Link>.
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
            Analyzing a duplex or fourplex as a house hack? TrueCap
            models owner-occupant deals with one unit vacant to you —
            the math that almost no other calculator handles cleanly.{" "}
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
