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
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "how-to-underwrite-a-rental-property-in-60-seconds";
const TITLE = "How to underwrite a rental property in 60 seconds";
const DESCRIPTION =
  "The five numbers, four metrics, and two sanity checks every real estate investor uses to triage a rental deal in under a minute — no spreadsheet required.";
const PUBLISHED_AT = "2026-05-24";
const READING_TIME_MIN = 9;

export const metadata: Metadata = {
  title: `${TITLE} | TrueCap Blog`,
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
    a: "Sixty seconds is enough to triage a deal — to decide whether it's worth a full underwrite. It's NOT enough to buy. The 60-second pass tells you 'this is worth a deeper look' or 'pass.' Before making an offer you'll spend hours validating rent comps, inspecting the property, reviewing the actual operating statements, and stress-testing assumptions. The 60-second screen just keeps you from wasting those hours on deals that obviously don't pencil.",
  },
  {
    q: "What's the difference between underwriting and analyzing a rental property?",
    a: "In practice they're used interchangeably. 'Analysis' is more common among individual investors; 'underwriting' is the term lenders and institutional buyers use. Both describe the same workflow: gather the financial facts, compute the standard return metrics, decide if the projected return justifies the price and risk.",
  },
  {
    q: "What's the most important metric — cap rate, cash-on-cash, or DSCR?",
    a: "Depends what you care about. Cap rate measures the property as if you owned it free-and-clear — useful for comparing properties regardless of how they're financed. Cash-on-cash measures the return on the cash YOU specifically put in — useful for personal investment decisions and for comparing leveraged deals. DSCR is what lenders care about — it determines whether you can actually get financed. For a full underwrite, you need all three. For a 60-second screen, start with cap rate and the 1% rule.",
  },
  {
    q: "What's a 'good' cap rate?",
    a: "Market-dependent. In cash-flow markets (Midwest, Sun Belt secondary cities, older multifamily), 6-10% is healthy. In appreciation markets (Tier-1 coastal cities), you'll see 3-5% — the return assumption there is price growth, not cash flow. Anything below the prevailing 10-year Treasury yield (4-5% in mid-2026) is hard to justify without strong appreciation thesis.",
  },
  {
    q: "Why use a calculator instead of a spreadsheet?",
    a: "Spreadsheets break the first time you change a formula. They don't auto-fill market rent from HUD or pull live interest rates. They don't model tax savings from depreciation correctly. They don't stress-test your assumptions against ±10% rent or ±1 percentage point on rate. A purpose-built tool like TrueCap handles all of this without you having to remember formulas you only use once a quarter.",
  },
  {
    q: "Should I underwrite a property before I tour it or after?",
    a: "Before. The 60-second screen is specifically designed to gate which properties are worth your time. Touring a property takes 1-2 hours including drive time. If you tour every listing that catches your eye, you'll burn 10+ hours a week on dead-end deals. Run the 60-second pass first; only tour the ones that pass.",
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
            Every experienced real estate investor underwrites the same way:
            gather a handful of numbers, compute four ratios, run two sanity
            checks, decide. Most of them can do it in under a minute — without
            opening a spreadsheet. This post walks through exactly how, so you
            can do the same.
          </p>

          <p>
            The goal isn&apos;t to make a final buy decision in 60 seconds.
            It&apos;s to <em>triage</em>: figure out which listings are worth a
            full underwrite versus which ones should be discarded on sight.
            Done well, the 60-second screen saves you 10+ hours a week of
            chasing dead-end deals.
          </p>

          <h2 className="text-2xl sm:text-3xl">The five numbers you need</h2>
          <p>
            Before you can underwrite anything, you need five inputs. Every one
            of them is either on the listing or one Google search away.
          </p>
          <ol>
            <li>
              <strong>Purchase price.</strong> The asking price. You&apos;ll later
              run scenarios against a negotiated price too, but start with what
              the seller wants.
            </li>
            <li>
              <strong>Monthly gross rent.</strong> If the property is occupied,
              this is the lease amount. If vacant, it&apos;s your estimated
              market rent — use HUD&apos;s Fair Market Rent for the county as a
              floor, then check Zillow and Rentometer for comps. Don&apos;t trust
              the seller&apos;s number alone.
            </li>
            <li>
              <strong>Operating expenses (annualized).</strong> Property tax,
              insurance, maintenance, management, vacancy reserve, HOA, owner-
              paid utilities, CapEx reserve. As a rule of thumb when you have no
              other data: 40-50% of gross rent for a residential rental.
              Underwriting against the &ldquo;50% rule&rdquo; is a fine starting
              point on a 60-second screen.
            </li>
            <li>
              <strong>Financing terms.</strong> Down payment percentage,
              interest rate, loan term. Use the current investment-property
              rate (typically 0.5-1.0 percentage points above owner-occupied),
              25% down conventional, 30-year fixed. For cash purchases, skip
              this.
            </li>
            <li>
              <strong>Closing costs.</strong> 2-3% of purchase price is a
              reasonable estimate, including title, escrow, inspection, and
              minor cosmetic move-in costs.
            </li>
          </ol>

          <p>
            Have those five? You&apos;re ready to compute the four metrics that
            actually matter.
          </p>

          <h2 className="text-2xl sm:text-3xl">Metric 1: The 1% rule (5 seconds)</h2>
          <p>
            The 1% rule is the fastest possible screen. Divide monthly gross
            rent by the purchase price; if it&apos;s 1% or higher, the deal
            <em> probably</em> cash-flows; if it&apos;s well below 1%, the deal
            <em> probably</em> doesn&apos;t.
          </p>
          <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
            <div className="text-sm sm:text-base font-mono">
              Monthly Rent ÷ Purchase Price = should be ≥ 1%
            </div>
          </div>
          <p>
            Example: $2,500/mo rent on a $250,000 property = 1.0%. Passes.
            $1,800/mo rent on a $300,000 property = 0.6%. Fails on its face.
          </p>
          <p>
            Two caveats. First, the 1% rule is just a screen — failing it
            doesn&apos;t mean the deal is bad (high-appreciation markets often
            run 0.4-0.7% and still produce solid returns), and passing it
            doesn&apos;t mean the deal is good. Second, the rule was calibrated
            during 4-5% interest rate eras. With 30-year fixed rates above 6.5%
            in mid-2026, you arguably need more like the &ldquo;1.25% rule.&rdquo;
            Adjust your threshold to the rate environment.
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
            What counts as a &ldquo;good&rdquo; cap rate is entirely
            market-dependent. In cash-flow markets like Cleveland, Indianapolis,
            or older multifamily in Sun Belt secondary cities, 6-10% is healthy.
            In appreciation markets like coastal California or NYC, 3-5% is the
            norm — the return assumption there is price growth, not cash flow.
          </p>
          <p>
            The rule: <strong>your cap rate should comfortably exceed the
            risk-free rate.</strong> If 10-year Treasuries yield 4.5% and you&apos;re
            buying a property at a 4% cap, you&apos;re taking real-estate-level
            risk for less than Treasury return — that only makes sense if you
            believe in significant appreciation.
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
            On a typical 25%-down conventional loan in 2026, an 8-10% CoC is
            very strong, 5-7% is acceptable in most markets, and below 5%
            you&apos;re probably looking at an appreciation play, not a cash-flow
            play. Negative CoC means you&apos;re feeding the property out of pocket
            every month — sometimes intentional (strong appreciation thesis),
            usually not.
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
            Most DSCR lenders won&apos;t fund anything below 1.0 — the property
            doesn&apos;t even cover its own mortgage. 1.0-1.2 is tight (small
            buffer, hard to get rate breaks). 1.2-1.5 is bankable. 1.5+ is
            strong, and you&apos;ll qualify for better rate tiers. If your DSCR
            on a 25%-down conventional pencils above 1.25, you have meaningful
            room to negotiate or absorb a rent dip.
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
            your margin of safety is too thin. Look for deals that still hold
            up after a -10% rent shock — those are the ones you can afford to
            be wrong about.
          </p>

          <h3>Sanity check 2: Compare to the 10-year Treasury</h3>
          <p>
            The 10-year Treasury yield is the closest thing real estate has to
            a risk-free benchmark. If your projected unleveraged return (cap
            rate) is below the Treasury yield, you&apos;re explicitly taking real-
            estate-level risk for sub-risk-free reward. That only makes sense if
            you have a strong appreciation thesis OR significant tax benefits
            you&apos;re harvesting (depreciation, 1031 exchange, opportunity zone).
            Otherwise, walk.
          </p>

          <h2 className="text-2xl sm:text-3xl">Putting it together</h2>
          <p>
            The 60-second workflow:
          </p>
          <ol>
            <li>Glance at the 1% rule — pass or fail.</li>
            <li>If it passes (or is borderline), compute cap rate. Compare to your market&apos;s typical range.</li>
            <li>Compute cash-on-cash at your expected financing. Decide if the return justifies the risk.</li>
            <li>Compute DSCR. Confirm it&apos;s above 1.2 — otherwise you can&apos;t get financed.</li>
            <li>Stress-test rent and vacancy. If a -10% rent shock kills the deal, walk.</li>
            <li>Compare your cap rate to the 10-year Treasury. If below, you need a thesis beyond cash flow.</li>
          </ol>

          <p>
            Pass all six and the deal is worth a real underwrite — comping rent
            in person, pulling actual tax records, inspecting the property,
            modeling out a 10-year hold with tax strategy and exit scenarios.
            Fail any of them and you&apos;ve just saved yourself a wasted weekend.
          </p>

          <p>
            <strong>The shortcut:</strong> all four metrics + both sanity checks
            run automatically in TrueCap. Paste the address, and we auto-fill
            rent from HUD, mortgage rate from FRED, and property tax from your
            state&apos;s effective rate. You can run the 60-second screen on a
            real deal right now.
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
    </div>
  );
}
