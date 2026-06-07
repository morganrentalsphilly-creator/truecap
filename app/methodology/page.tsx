/**
 * /methodology — exactly how TrueCap computes the numbers.
 *
 * Trust + transparency page. Experienced investors want to verify a
 * calculator's math before they trust the output. New visitors arriving
 * from paid traffic skim this for "is this real or hand-wavy?" signals.
 *
 * Different angle from the /blog (which explains real-estate CONCEPTS):
 * this explains OUR specific methodology — the formulas, the data
 * sources, the trade-offs, the things we deliberately do differently
 * than other tools. Also doubles as a SEO surface for "how is cap rate
 * calculated", "how do you compute dscr", "where does TrueCap get rent
 * data", etc.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Calculator, Database, ShieldCheck } from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How TrueCap computes cap rate, CoC, DSCR, 10-year projections, tax savings, and exit scenarios. Plus the data sources behind auto-fill (HUD, FRED, state tax).",
  keywords: [
    "truecap methodology",
    "how is cap rate calculated",
    "how to compute dscr",
    "rental property analysis methodology",
    "investment property calculation",
  ],
  alternates: { canonical: "/methodology" },
  openGraph: {
    title: "TrueCap Methodology — how we compute the numbers",
    description:
      "The exact formulas, data sources, and conventions TrueCap uses to underwrite rental properties.",
    url: "/methodology",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap methodology" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

export default function MethodologyPage() {
  const siteUrl = getSiteUrl();

  // TechArticle JSON-LD — Google's preferred schema for documentation /
  // methodology content. Distinct from regular Article so search results
  // signal "this is technical reference content".
  const ld = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "@id": `${siteUrl}/methodology#article`,
    headline: "TrueCap Methodology",
    description:
      "How TrueCap computes cap rate, cash-on-cash, DSCR, 10-year projections, tax savings, exit scenarios. Plus data sources and conventions.",
    url: `${siteUrl}/methodology`,
    datePublished: "2026-05-24",
    dateModified: "2026-06-01",
    author: { "@type": "Organization", name: "TrueCap", url: siteUrl },
    publisher: { "@id": `${siteUrl}/#organization` },
    inLanguage: "en-US",
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />

      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-8">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
          >
            ← TrueCap
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 leading-tight">
            Methodology
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mt-2 leading-relaxed">
            Every formula, every data source, every convention TrueCap
            uses to underwrite a rental deal. Read this if you want to
            verify the math before trusting the output.
          </p>
        </header>

        {/* TL;DR card — for visitors who want the gist before scrolling */}
        <div className="mb-8 rounded-2xl border-2 border-primary/20 bg-[var(--brand-blue-light)] p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="size-5 text-primary" />
            <h2 className="text-sm font-extrabold uppercase tracking-widest text-primary">
              The short version
            </h2>
          </div>
          <ul className="space-y-2 text-sm text-foreground sm:text-base">
            <li>
              <strong>Math is standard.</strong> We use the same formulas
              every CRE textbook, lender, and broker uses. No proprietary
              tricks.
            </li>
            <li>
              <strong>Data sources are public.</strong> HUD Fair Market
              Rent, FRED 30-yr fixed mortgage series, state-level
              effective property tax rates. All editable.
            </li>
            <li>
              <strong>Defaults are conservative.</strong> 5% vacancy, 8%
              maintenance, 5% CapEx reserve, 27.5-yr depreciation —
              within standard industry ranges, biased toward realism over
              optimism.
            </li>
            <li>
              <strong>You can override everything.</strong> Every
              auto-filled number is a starting point. Edit any field and
              the analysis re-computes live.
            </li>
          </ul>
        </div>

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">

          <h2 className="text-2xl sm:text-3xl">The core formulas</h2>

          <h3>Cap rate</h3>
          <div className="not-prose bg-card border border-border rounded-xl p-4 sm:p-5 my-3 text-center font-mono text-sm sm:text-base">
            Cap rate = NOI ÷ Purchase price
          </div>
          <p>
            Where NOI (Net Operating Income) = effective gross rental
            income minus operating expenses, BEFORE mortgage P&amp;I and
            income tax. Effective gross = gross rent × (1 − vacancy %).
            Operating expenses include property tax, insurance,
            maintenance, management, HOA, owner-paid utilities, and CapEx
            reserves.
          </p>
          <p>
            <strong>What we deliberately include in opex:</strong> a
            CapEx reserve (default 5% of rent). Many calculators omit
            this to inflate cap rate; we include it because the roof,
            HVAC, water heater, and flooring DO wear out, and an honest
            NOI accounts for the smoothed replacement cost.
          </p>

          <h3>Cash-on-cash return</h3>
          <div className="not-prose bg-card border border-border rounded-xl p-4 sm:p-5 my-3 text-center font-mono text-sm sm:text-base">
            CoC = Annual cash flow ÷ Total cash invested
          </div>
          <p>
            Cash flow = NOI − annual mortgage P&amp;I. Total cash
            invested = down payment + closing costs + initial repairs
            (the actual dollars out of your pocket at close, not the
            loan amount).
          </p>

          <h3>DSCR (Debt Service Coverage Ratio)</h3>
          <div className="not-prose bg-card border border-border rounded-xl p-4 sm:p-5 my-3 text-center font-mono text-sm sm:text-base">
            DSCR = Annual NOI ÷ Annual debt service
          </div>
          <p>
            Annual debt service is the principal + interest mortgage
            payment × 12. We do NOT include taxes + insurance in debt
            service (those are already in opex via NOI). For cash
            purchases the DSCR readout shows &ldquo;Cash&rdquo; instead
            of dividing by zero.
          </p>

          <h3>Mortgage payment</h3>
          <p>
            Standard fully-amortizing fixed-rate formula:
          </p>
          <div className="not-prose bg-card border border-border rounded-xl p-4 sm:p-5 my-3 text-center font-mono text-xs sm:text-sm">
            P&amp;I = L × [r(1+r)<sup>n</sup>] ÷ [(1+r)<sup>n</sup> − 1]
          </div>
          <p>
            Where L = loan amount, r = monthly interest rate (annual
            rate ÷ 12), n = total payments (loan term × 12). Same
            formula your lender uses. If you want a standalone version,
            see the{" "}
            <Link href="/tools/mortgage-payment-calculator" className="text-primary font-semibold hover:underline">
              mortgage payment calculator
            </Link>
            .
          </p>

          <h2 className="text-2xl sm:text-3xl">Where the auto-fill data comes from</h2>

          <h3>Rent — HUD Fair Market Rent</h3>
          <p>
            HUD (the U.S. Department of Housing and Urban Development)
            publishes county-level rent estimates annually for setting
            Section 8 voucher payment standards. We query the HUD API
            with your property&apos;s county + bedroom count and use the
            returned FMR as the rent default. Actual market rent in
            most areas runs slightly above FMR — treat it as a floor,
            then check Zillow / Rentometer for comps before locking in.
          </p>
          <p>
            <strong>Why HUD instead of Zillow Rent Zestimate?</strong>{" "}
            HUD is methodologically transparent, public, and free. Zillow
            doesn&apos;t publish their per-property algorithm and rate-
            limits aggressive querying. We trade off some precision for
            transparency and rate-limit headroom.
          </p>

          <h3>Mortgage rate — FRED 30-year fixed</h3>
          <p>
            The Federal Reserve Bank of St. Louis (FRED) publishes the
            weekly 30-year fixed mortgage rate series (MORTGAGE30US,
            sourced from Freddie Mac&apos;s Primary Mortgage Market
            Survey). We pull the latest week&apos;s reading and use it
            as the interest-rate default. Investment-property rates run
            typically 0.5-1.0 percentage points above this owner-
            occupied benchmark — adjust upward if you want to model
            non-owner-occupied financing more accurately.
          </p>

          <h3>Property tax — state effective rate</h3>
          <p>
            We maintain a state-by-state lookup of effective property
            tax rates (annual tax as a percentage of assessed value)
            from a curated dataset of state property tax statistics. We
            apply this rate to your purchase price. This is the most
            approximate of our three data sources — actual tax rates
            vary significantly within a state (Cook County IL vs rural
            Illinois, for example). Always confirm with the county
            assessor for the specific property.
          </p>

          <h2 className="text-2xl sm:text-3xl">10-year projection</h2>
          <p>
            We project rent, expenses, and mortgage payments year-by-
            year. Defaults:
          </p>
          <ul>
            <li><strong>Rent growth:</strong> 2.5% annually (long-term U.S. average)</li>
            <li><strong>Expense growth:</strong> 2.5% annually (matched to rent so opex ratio stays stable)</li>
            <li><strong>Mortgage:</strong> fully amortized — principal and interest portions recomputed each year</li>
            <li><strong>Appreciation:</strong> 3% annually (long-term U.S. average; varies wildly by market)</li>
          </ul>
          <p>
            All four assumptions are editable on the Pro plan. The
            10-year output shows cumulative cash flow, cumulative
            principal paydown, and ending equity year-by-year.
          </p>

          <h2 className="text-2xl sm:text-3xl">Tax strategy</h2>
          <h3>Depreciation</h3>
          <p>
            Residential rentals depreciate over 27.5 years straight-line
            (IRS schedule). We default the building portion to 85% of
            purchase price (land = 15%, non-depreciable). Annual
            depreciation = (purchase price × 0.85) ÷ 27.5. This is a
            paper deduction — it doesn&apos;t affect cash flow but
            shelters cash flow from income tax.
          </p>
          <h3>Mortgage interest deduction</h3>
          <p>
            We compute the interest portion of each year&apos;s mortgage
            payments from the amortization schedule and add it to total
            deductions.
          </p>
          <h3>Tax savings</h3>
          <p>
            Tax savings = (depreciation + mortgage interest) × your
            marginal tax rate. Default marginal rate is 24%. Override on
            the Tax Strategy panel if your bracket is different.
          </p>

          <h2 className="text-2xl sm:text-3xl">Exit scenarios</h2>
          <p>
            We model the sale of the property in years 1 through 10.
            Each year: projected sale price = current value × (1 +
            appreciation rate)<sup>years</sup>. Net sale proceeds = sale
            price − selling costs (default 6%) − remaining loan balance.
            Total profit = net proceeds + cumulative cash flow received
            during the hold − initial cash invested. This drives the
            &ldquo;best year to exit&rdquo; recommendation.
          </p>

          <h2 className="text-2xl sm:text-3xl">Edge cases we handle explicitly</h2>
          <ul>
            <li>
              <strong>Cash purchases (no loan):</strong> DSCR shows
              &ldquo;Cash&rdquo; instead of dividing by zero. Cash-on-
              cash uses total cash purchase amount as the denominator.
            </li>
            <li>
              <strong>Owner-occupant units:</strong> in house-hack
              scenarios, we allow the owner-occupied unit to have $0
              rent (which would normally fail validation) so the
              calculator correctly models the &ldquo;living for free&rdquo;
              scenario.
            </li>
            <li>
              <strong>Multi-family rent estimation:</strong> HUD FMR is
              per-unit by bedroom count, not per-property. For 2-4 unit
              properties we sum the per-unit FMR estimates.
            </li>
            <li>
              <strong>Non-US addresses:</strong> Google Places
              autocomplete is restricted to US results. Manual entry is
              still allowed but the auto-fill from HUD / FRED / state
              tax obviously doesn&apos;t fire.
            </li>
          </ul>

          <h2 className="text-2xl sm:text-3xl">What we deliberately don&apos;t do</h2>
          <ul>
            <li>
              <strong>We don&apos;t estimate rehab costs based on
              property condition</strong> — we&apos;d need an inspection
              to do that well. The{" "}
              <Link href="/tools/rehab-cost-estimator" className="text-primary font-semibold hover:underline">
                rehab cost estimator
              </Link>{" "}
              gives you sq-ft-based defaults for common work items, but
              the actual number is between you and your contractor.
            </li>
            <li>
              <strong>We don&apos;t model speculative future rent
              increases</strong> beyond the editable annual growth
              percentage. No &ldquo;assume you raise rent 15% on
              turnover&rdquo; — that&apos;s a thumb on the scale we
              don&apos;t take.
            </li>
            <li>
              <strong>We don&apos;t include landlord time as an
              expense</strong> unless you set management % &gt; 0.
              Most self-managed investors should still input 8-10%
              management to model the true cost — the day you hand it
              off to a PM, the deal economics shouldn&apos;t suddenly
              change.
            </li>
          </ul>

          <h2 className="text-2xl sm:text-3xl">Source of truth</h2>
          <p>
            The calc-analysis library is internal proprietary code. If
            you find a specific case where our output diverges from what
            you&apos;d compute by hand, email{" "}
            <a href="mailto:hello@usetruecap.com" className="text-primary font-semibold hover:underline">
              hello@usetruecap.com
            </a>{" "}
            with the inputs and we&apos;ll investigate — methodology bugs
            are the most important kind of bug to us.
          </p>

          <h2 className="text-2xl sm:text-3xl">Try it</h2>
          <p>
            Best way to verify the methodology is to run a deal you
            already understand. Enter the inputs, see what TrueCap
            outputs, compare to your own math.
          </p>

          <div className="not-prose mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold hover:opacity-95 transition-opacity"
            >
              <Calculator className="w-4 h-4" />
              Open the analyzer
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link
              href="/tools"
              className="inline-flex items-center gap-2 bg-card border border-border text-foreground px-5 py-3 rounded-xl font-bold hover:bg-muted transition-colors"
            >
              <Database className="w-4 h-4" />
              Browse standalone calculators
            </Link>
            <Link
              href="/glossary"
              className="inline-flex items-center gap-2 bg-card border border-border text-foreground px-5 py-3 rounded-xl font-bold hover:bg-muted transition-colors"
            >
              Glossary
            </Link>
          </div>
        </article>

        <footer className="mt-12 pt-8 border-t border-border text-sm text-muted-foreground leading-relaxed">
          Last updated: May 24, 2026. We update this page whenever the
          methodology materially changes — track shipments at{" "}
          <Link href="/changelog" className="font-bold text-foreground hover:underline">
            /changelog
          </Link>
          .
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
