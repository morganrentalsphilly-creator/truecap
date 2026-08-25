/**
 * Anchor blog post — "How to underwrite a rental property in 60 seconds".
 *
 * Targets high-intent educational queries:
 *   - "how to analyze a rental property"
 *   - "how to underwrite a rental property"
 *   - "rental property underwriting"
 *   - "rental property analysis"
 *   - "rental property due diligence"
 *
 * Strategy: comprehensive but readable, demonstrates TrueCap's expertise,
 * funnels every other section into the live calculator. Article + Breadcrumb
 * + FAQPage schema for maximum SERP eligibility.
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

const SLUG = "how-to-underwrite-a-rental-property-in-60-seconds";
const TITLE = "How to screen a rental property in 60 seconds";
const DESCRIPTION =
  "A fast preliminary rental screen: organize five inputs, review four modeled metrics, and identify what still needs verification before a complete underwrite.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = "2026-08-24";
const READING_TIME_MIN = 9;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "how to underwrite a rental property",
    "how to analyze a rental property",
    "rental property underwriting",
    "rental property analysis",
    "rental property due diligence",
    "cap rate",
    "cash on cash return",
    "dscr",
    "1% rule",
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
    q: "Is 60 seconds enough to underwrite a rental property?",
    a: "Sixty seconds is enough for a preliminary screen, not a complete underwrite or a decision to buy. It can organize the projected metrics, show how they compare with criteria you choose, and identify assumptions that need verification. Before making an offer, validate rent comps, inspect the property, review actual operating statements, and stress-test the assumptions yourself.",
  },
  {
    q: "What's the difference between underwriting and analyzing a rental property?",
    a: "In practice they're used interchangeably. 'Analysis' is more common among individual investors; 'underwriting' is the term lenders and institutional buyers use. Both describe the same workflow: gather the financial facts, compute the standard return metrics, decide if the projected return justifies the price and risk.",
  },
  {
    q: "What's the most important metric — cap rate, cash-on-cash, or DSCR?",
    a: "Depends what you care about. Cap rate measures the property as if you owned it free-and-clear — useful for comparing properties regardless of how they're financed. Cash-on-cash measures the return on the cash YOU specifically put in — useful for comparing leveraged deals. DSCR measures projected debt-service coverage, but each lender applies its own definition and minimum. A complete review should consider all three alongside cash flow and the underlying evidence.",
  },
  {
    q: "What's a 'good' cap rate?",
    a: "There is no universal good cap rate. Compare the property with relevant market evidence, its condition and workload, current financing, alternative uses of capital, and the return criteria you choose. A market median is context, not a suitability threshold.",
  },
  {
    q: "Why use a calculator instead of a spreadsheet?",
    a: "A well-built spreadsheet can be flexible, but the owner must maintain its formulas, units, versioning, and input sources. TrueCap provides a reviewed calculation path, labeled HUD and rate benchmarks, editable assumptions, and repeatable stress scenarios; those starting estimates still require property-specific verification.",
  },
  {
    q: "Should I underwrite a property before I tour it or after?",
    a: "A preliminary screen before a tour can help you identify the questions and assumptions that deserve attention on site. It does not replace the tour, inspection, document review, or your own decision about which properties merit deeper work.",
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
    // Author points at the /about Person entity (E-E-A-T): same @id as
    // the AboutPage schema so Google resolves one consistent author.
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
  // HowTo schema — Google can render step-by-step cards directly in
  // SERPs for "how to underwrite a rental property" queries. Massive
  // CTR boost when it wins the rich result.
  const howToLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to screen a rental property in 60 seconds",
    description:
      "A 60-second preliminary screen that organizes rent, expenses, financing, and four return metrics so you can identify what needs deeper verification.",
    totalTime: "PT1M",
    estimatedCost: { "@type": "MonetaryAmount", currency: "USD", value: "0" },
    tool: [
      { "@type": "HowToTool", name: "TrueCap rental property analyzer (free)" },
    ],
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Get the gross monthly rent",
        text: "Record current lease rent separately from market or pro forma rent. Use recent comparable rents and lease evidence for the property; treat HUD Fair Market Rent only as a labeled area benchmark, not a substitute for property-specific rent evidence.",
        url: `${canonicalUrl}#step-1`,
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Estimate operating expenses",
        text: "Enter expected post-acquisition property tax, an insurance quote when available, HOA and owner-paid utilities, plus separate assumptions for vacancy, management, maintenance, and replacement reserve. Leave an unknown unresolved instead of turning it into zero.",
        url: `${canonicalUrl}#step-2`,
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Estimate the mortgage payment",
        text: "Enter cash or financed acquisition, the expected down payment, rate, amortization term, and loan fees. A published rate is a benchmark; replace it with the lender's written quote and terms before relying on the result.",
        url: `${canonicalUrl}#step-3`,
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Compute the four return metrics",
        text: "Cap rate = NOI ÷ purchase price. Cash-on-cash = annual cash flow ÷ total cash invested. DSCR = NOI ÷ annual debt service. Monthly cash flow = rent minus expenses and debt service. Compare each result with the market evidence, lender rules, and investment criteria you select.",
        url: `${canonicalUrl}#step-4`,
      },
      {
        "@type": "HowToStep",
        position: 5,
        name: "Run the sanity checks",
        text: "Record whether the property meets the 1% benchmark, compare the projected cap rate with relevant alternatives, and note which assumptions can change the result. Use that evidence to choose your own next verification step.",
        url: `${canonicalUrl}#step-5`,
      },
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
          <BlogByline />
          <p className="text-base sm:text-lg text-muted-foreground mt-4 leading-relaxed">
            {DESCRIPTION}
          </p>
        </header>

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">
          <p>
            A fast first pass can organize a handful of inputs, compute standard
            ratios, and expose the assumptions most likely to change the result.
            It cannot complete the property-specific diligence or choose the
            investment. This post separates the quick screen from that deeper work.
          </p>

          <p>
            The goal isn&apos;t to make a final buy decision in 60 seconds.
            It&apos;s to <em>triage</em>: organize the projected metrics, compare
            them with criteria you choose, and identify the facts that need
            deeper verification before you decide what to do next.
          </p>

          <h2 className="text-2xl sm:text-3xl">The five numbers you need</h2>
          <p>
            A preliminary screen starts with five input groups. Some may appear
            in a listing; others require a lease, assessor record, insurance or
            lender quote, inspection, or an explicit starting assumption.
          </p>
          <ol>
            <li>
              <strong>Purchase price.</strong> The asking price. You&apos;ll later
              run scenarios against a negotiated price too, but start with what
              the seller wants.
            </li>
            <li>
              <strong>Monthly gross rent.</strong> If the property is occupied,
              record the current lease amount separately. If vacant, enter an
              estimated market rent supported by recent comparable properties.
              HUD Fair Market Rent can provide labeled area context, but it is
              not a floor or a property-specific rent comp.
            </li>
            <li>
              <strong>Operating expenses (annualized).</strong> <Link href="/glossary/property-tax" className="text-primary font-semibold hover:underline">Property tax</Link>,
              <Link href="/glossary/insurance" className="text-primary font-semibold hover:underline"> insurance</Link>, <Link href="/glossary/maintenance-reserve" className="text-primary font-semibold hover:underline">maintenance</Link>, management, <Link href="/glossary/vacancy" className="text-primary font-semibold hover:underline">vacancy reserve</Link>, HOA, owner-
              paid utilities, <Link href="/glossary/capex" className="text-primary font-semibold hover:underline">replacement reserve</Link>. A <Link href="/blog/50-percent-rule-rentals" className="text-primary font-semibold hover:underline">broad expense-ratio rule</Link> can be a
              labeled triage check, but it must not replace the individual
              categories or turn missing costs into zero.
            </li>
            <li>
              <strong>Financing terms.</strong> Down payment percentage,
              interest rate, amortization term, and loan fees. Use a clearly
              labeled benchmark for an early screen, then replace it with the
              written quote and terms for the loan you may use. For a cash
              purchase, model no debt service.
            </li>
            <li>
              <strong>Closing costs and initial cash items.</strong> Enter title,
              lender and transaction costs, cash-funded immediate repairs, and
              the initial reserve separately when known. A percentage default
              is only a starting estimate and must remain labeled as such.
            </li>
          </ol>

          <p>
            Have those five? You&apos;re ready to compute the four metrics that
            actually matter.
          </p>

          <h2 className="text-2xl sm:text-3xl">Metric 1: The 1% rule (5 seconds)</h2>
          <p>
            The <Link href="/glossary/1-percent-rule" className="text-primary font-semibold hover:underline">1% rule</Link> is the fastest possible screen. Divide monthly gross
            rent by the purchase price. It compares price with gross rent only;
            it says nothing about expenses, financing, condition, or actual cash flow.
          </p>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-sm sm:text-base font-mono">
              Monthly Rent ÷ Purchase Price = rent-to-price percentage
            </div>
          </div>
          <p>
            Example: $2,500/mo rent on a $250,000 property = 1.0%, which meets
            the benchmark. $1,800/mo rent on a $300,000 property = 0.6%, which
            does not meet it.
          </p>
          <p>
            Meeting or missing the 1% reference does not establish whether the
            property works. Continue with the complete expense and financing
            model, then compare the result with the criteria you selected.
          </p>
          <p>
            <Link href="/tools/1-percent-rule-calculator" className="text-primary font-semibold hover:underline">
              Run the 1% rule on a deal →
            </Link>
          </p>

          <h2 className="text-2xl sm:text-3xl">Metric 2: Cap rate (15 seconds)</h2>
          <p>
            Cap rate (capitalization rate) measures the unleveraged annual
            return — what the property earns as a percentage of its price,
            ignoring financing. It&apos;s the single most-used commercial real
            estate metric.
          </p>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-sm sm:text-base font-mono">
              <span className="font-bold">Cap Rate</span> = NOI ÷ Purchase Price
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              where NOI = Annual Rent − Annual Operating Expenses
            </div>
          </div>
          <p>
            Cap-rate ranges vary by property type, condition, market, lease
            quality, expense conventions, and data date. Compare like with like
            and verify that NOI excludes financing while including the applicable
            operating costs.
          </p>
          <p>
            Comparing cap rate with current alternatives can add context, but
            it is not an apples-to-apples suitability rule: liquidity, leverage,
            workload, transaction costs, taxes, condition risk, and uncertain
            future price changes differ materially.
          </p>
          <p>
            <Link href="/tools/cap-rate-calculator" className="text-primary font-semibold hover:underline">
              Compute cap rate →
            </Link>
          </p>

          <h2 className="text-2xl sm:text-3xl">Metric 3: Cash-on-cash return (15 seconds)</h2>
          <p>
            Cap rate ignores financing, which is great for comparing properties
            but useless for your personal investment decision. Cash-on-cash
            return measures the return on the cash <em>you actually
            invest</em>, after the mortgage payment.
          </p>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-sm sm:text-base font-mono">
              <span className="font-bold">CoC</span> = Annual Cash Flow ÷ Total Cash Invested
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Total Cash Invested = Down Payment + Closing Costs + Initial Repairs
            </div>
          </div>
          <p>
            Cash-on-cash is specific to the stated financing and initial-cash
            assumptions. There is no universal acceptable band. A negative
            result means the modeled pre-tax cash flow after reserve is below
            zero; it does not predict future appreciation or choose the next step.
          </p>
          <p>
            <Link href="/tools/cash-on-cash-calculator" className="text-primary font-semibold hover:underline">
              Compute cash-on-cash return →
            </Link>
          </p>

          <h2 className="text-2xl sm:text-3xl">Metric 4: DSCR (10 seconds)</h2>
          <p>
            Debt Service Coverage Ratio — the metric every lender pulls before
            approving a mortgage. DSCR is annual NOI divided by annual mortgage
            payments. It tells you (and your lender) whether the property can
            service its debt with operating income alone.
          </p>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-sm sm:text-base font-mono">
              <span className="font-bold">DSCR</span> = Annual NOI ÷ Annual Debt Service
            </div>
          </div>
          <p>
            DSCR definitions, minimums, rent evidence, expense treatment,
            leverage, and pricing tiers vary by lender and program. Use this
            ratio to test coverage and downside, then obtain the lender&apos;s
            written formula and quote; a modeled band does not establish
            approval or pricing.
          </p>
          <p>
            <Link href="/tools/dscr-calculator" className="text-primary font-semibold hover:underline">
              Compute DSCR →
            </Link>
          </p>

          <h2 className="text-2xl sm:text-3xl">The two sanity checks</h2>
          <p>
            Numbers can pencil and the deal can still be a trap. Two final
            checks before you call it.
          </p>

          <h3>Sanity check 1: Stress-test rent and vacancy</h3>
          <p>
            What happens to your DSCR and cash flow if rent comes in 10% below
            your estimate, or vacancy spikes from 5% to 10%? If a small miss on
            either input flips the deal from positive cash flow to negative,
            the result is highly sensitive to those assumptions. Label that
            risk and decide how much evidence or margin your criteria require.
          </p>

          <h3>Sanity check 2: Compare alternatives on the same basis</h3>
          <p>
            A current lower-risk yield can be one reference, but cap rate is not
            a total-return forecast and the risks are different. Record which
            cash flows, fees, taxes, liquidity limits, leverage, work, and future
            value assumptions are included before comparing alternatives.
          </p>

          <h2 className="text-2xl sm:text-3xl">Putting it together</h2>
          <p>
            The 60-second workflow:
          </p>
          <ol>
            <li>Record whether the property meets the 1% benchmark.</li>
            <li>Compute cap rate and compare it with relevant market evidence.</li>
            <li>Compute cash-on-cash using the financing you expect.</li>
            <li>Compute DSCR, then compare it with the written requirements of the lender and program you may use.</li>
            <li>Stress-test rent and vacancy; label any assumption that changes the cash-flow sign or coverage band.</li>
            <li>Compare alternatives on a clearly stated, like-for-like basis.</li>
          </ol>

          <p>
            These checks do not choose the next step for you. They make the
            tradeoffs visible so you can decide whether to continue with rent
            comps, actual tax records, inspection, document review, and an
            illustrative long-term model.
          </p>

          <p>
            <strong>The shortcut:</strong> TrueCap computes the first-pass metrics
            consistently and can start from labeled HUD, published-rate, and
            state effective-tax benchmarks when available. Every estimate stays
            editable and should be replaced with property-specific evidence.
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6"><NewsletterSignup variant="expanded" source="blog" /></div>

        <footer className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            TrueCap is a rental property analysis tool used by individual
            investors, agents, and active flippers to underwrite deals in
            seconds. Built by real estate investors, in Philadelphia.{" "}
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
