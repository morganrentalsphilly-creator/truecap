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
import { VERDICT_DISPLAY } from "@/lib/verdict-display";
import {
  TRUECAP_DEAL_SCORE_METHODOLOGY_VERSION,
  TRUECAP_UNDERWRITING_STANDARD_NAME,
  TRUECAP_UNDERWRITING_STANDARD_VERSION,
  UNDERWRITING_STANDARD_RELEASE_NOTES,
} from "@/lib/underwriting-methodology";
import { TEN_YEAR_PROJECTION_SNAPSHOT_VERSION } from "@/lib/ten-year-projections";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How TrueCap computes cap rate, CoC, DSCR, the target-dependent Offer Ceiling, Screening Index, projections, illustrative tax impact, and exit scenarios.",
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
      "How TrueCap computes cap rate, cash-on-cash, DSCR, the target-dependent Offer Ceiling, Screening Index, projections, illustrative tax impact, and modeled exit scenarios.",
    url: `${siteUrl}/methodology`,
    datePublished: "2026-05-24",
    dateModified: "2026-08-25",
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
          <p className="mt-3 inline-flex rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
            {TRUECAP_UNDERWRITING_STANDARD_NAME} v{TRUECAP_UNDERWRITING_STANDARD_VERSION}
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
              <strong>Math is published and versioned.</strong> We use common
              rental-underwriting formulas and state our conventions where
              lenders or investors may differ. No hidden score arithmetic.
            </li>
            <li>
              <strong>Benchmarks are labeled as benchmarks.</strong> HUD Fair
              Market Rent, the FRED 30-year owner-occupied mortgage series,
              and state-level effective tax rates are starting points, not
              property-specific comps, lender quotes, or parcel bills.
            </li>
            <li>
              <strong>Defaults are visible starting assumptions.</strong> 5%
              vacancy, 10% maintenance, 8% management, 5% CapEx reserve,
              and 27.5-year residential depreciation. They are not facts
              about a property and must be replaced when better evidence is
              available.
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
            maintenance, management, HOA, and owner-paid utilities. The
            vacancy allowance is shown above NOI as a reduction to scheduled
            income. The CapEx reserve is shown below NOI.
          </p>
          <p>
            <strong>Other income:</strong> Standard v1.1 does not have a
            separate laundry, parking, pet, or utility-income line. Do not
            bury those amounts inside rent without documenting the choice in
            your own records.
          </p>
          <p>
            <strong>How we handle CapEx:</strong> the default 5% reserve does
            not reduce lender-style NOI, cap rate, or DSCR. It does reduce
            before-tax cash flow and cash-on-cash return because roofs, HVAC,
            water heaters, and flooring still consume real investor cash.
          </p>

          <h3>Cash-on-cash return</h3>
          <div className="not-prose bg-card border border-border rounded-xl p-4 sm:p-5 my-3 text-center font-mono text-sm sm:text-base">
            CoC = Annual cash flow ÷ Total cash invested
          </div>
          <p>
            Cash flow = NOI − CapEx reserve − annual mortgage P&amp;I −
            estimated PMI/MIP. Total cash invested = down payment + closing
            costs + entered rehab + entered short-term-rental furnishing or
            startup costs (the actual dollars out of your pocket, not the
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
            rate ÷ 12), n = total payments (loan term × 12). Lender-specific
            rounding and non-standard payment structures can differ. If you
            want a standalone version, see the{" "}
            <Link href="/tools/mortgage-payment-calculator" className="text-primary font-semibold hover:underline">
              mortgage payment calculator
            </Link>
            .
          </p>

          <h2 className="text-2xl sm:text-3xl">Decision thresholds and Offer Ceiling</h2>
          <h3>Screening Index (Balanced)</h3>
          <p>
            Current Screening Index method: v{TRUECAP_DEAL_SCORE_METHODOLOGY_VERSION}.
            This secondary score is versioned independently from the
            TrueCap Underwriting Standard v{TRUECAP_UNDERWRITING_STANDARD_VERSION}
            financial formulas; changing the score method does not change the
            cash-flow result.
          </p>
          <div className="not-prose bg-card border border-border rounded-xl p-4 sm:p-5 my-3 text-center font-mono text-xs sm:text-sm">
            Score = round(clamp(component points + risk penalty, 0, 100))
          </div>
          <p>
            For investment properties, the default Balanced score combines five
            tiered components: monthly cash flow (up to 22 points), cash-on-cash
            return (20), cap rate (16), DSCR (17), and projected 10-year
            annualized total return (25). Owner-occupant deals replace the
            cash-flow component with a 0/25/30-point house-hack scale, so their
            component sum can exceed 100 before the final clamp. A risk modifier
            for vacancy, negative cash flow, property age, reserve assumptions,
            and property-tax burden can subtract at most 30 points. If Year Built
            is missing, a conservative age-uncertainty modifier applies instead
            of treating the property as new construction. If modeled initial cash
            is zero, cash-on-cash is not applicable and its stored compatibility
            sentinel is not scored. The remaining applicable components are
            renormalized to the 100-point scale. The result is
            rounded to a whole number and clamped from 0 to 100.
          </p>
          <p>
            The projected-return component uses pre-tax operating cash flow,
            appreciation, and loan paydown through a modeled year-10 sale, net
            selling costs and the exit engine&apos;s federal capital-gain and
            depreciation-recapture defaults. It excludes the separate
            illustrative annual personal-tax benefit from the Screening Index.
          </p>
          <p>
            {/* Derived from lib/verdict-display so the published methodology
                can never state wording the product has moved past. The
                THRESHOLDS (75/55/35/18) are unchanged. */}
            Recommendation bands are 75+ {VERDICT_DISPLAY["Strong Buy"].label},
            55–74 {VERDICT_DISPLAY.Buy.label}, 35–54 {VERDICT_DISPLAY.Neutral.label},
            18–34 {VERDICT_DISPLAY.Risky.label}, and below 18{" "}
            {VERDICT_DISPLAY.Avoid.label.toLowerCase()}. Cash purchases get
            full DSCR-component credit because there is no debt service.
            Owner-occupant deals use a separate near-break-even cash-flow rule.
            A Balanced or Appreciation score may be held at 40 when a
            non-owner-occupant deal has more than 8% modeled annualized 10-year
            return and non-negative before-tax cash flow; that floor is
            never used by the Cash Flow lens. The score is a deterministic
            screening model, not a probability of profit, appraisal, or lending
            decision, evidence-readiness measure, Buy Box result, or investment advice.
          </p>
          <p>
            Saved financial outputs retain their top-level Underwriting Standard
            version, while new saved results also record the Screening Index
            method version. Historical scores without that submodel field remain
            frozen and are labeled as recorded rather than silently recalculated.
          </p>

          <p>
            Offer Ceiling is not a recommended offer, price prediction, or appraisal. TrueCap runs
            the complete underwriting engine repeatedly and finds the highest
            tested purchase price that still clears every selected return or
            Buy Box threshold. The displayed Offer Ceiling is rounded
            <strong> down</strong> to a $500 step and rechecked at that exact
            displayed value, so rounding cannot move the answer onto the
            failing side of the threshold.
          </p>
          <p>
            Required rent is rounded up to the next whole dollar; a maximum
            affordable interest rate is rounded down to 0.01 percentage
            point. Closing-cost-reduction language appears only when the modeled cash
            constraint supports it and still requires lender/program
            confirmation. Each solver changes one input at a time and holds
            the rest fixed.
          </p>

          <h2 className="text-2xl sm:text-3xl">BRRRR and fix-and-flip models</h2>
          <p>
            The BRRRR view models acquisition cash, rehab and carrying costs,
            then a refinance loan equal to entered ARV × entered refinance
            LTV. Net refinance cash subtracts the modeled original-loan payoff
            and refinance closing costs; a shortfall increases cash left in
            the deal instead of disappearing. ARV, timing, lender terms, and
            post-refinance rent remain user assumptions.
          </p>
          <p>
            The fix-and-flip view calculates modeled profit as ARV minus the
            purchase price, acquisition closing costs, rehab, carrying costs,
            and selling costs. It excludes income tax and assumes financing
            interest is included in the entered monthly carrying cost. Its
            annualized ROI is a simple hold-period annualization, not IRR.
          </p>

          <h2 className="text-2xl sm:text-3xl">Where the auto-fill data comes from</h2>

          <h3>Rent benchmark — HUD Fair Market Rent</h3>
          <p>
            HUD (the U.S. Department of Housing and Urban Development)
            publishes county-level rent estimates annually for setting
            Section 8 voucher payment standards. We query the HUD API
            with your property&apos;s county or ZIP + bedroom count and use the
            returned FMR as an editable benchmark. FMR is a program-market
            statistic, not a comp for this property. Actual achievable rent
            can be above or below it; verify with recent, comparable local
            leases before making an offer.
          </p>
          <p>
            <strong>Why HUD instead of Zillow Rent Zestimate?</strong>{" "}
            HUD is methodologically transparent, public, and free. Zillow
            doesn&apos;t publish their per-property algorithm and rate-
            limits aggressive querying. We trade off some precision for
            transparency and rate-limit headroom. That tradeoff is why the
            result labels HUD as a market benchmark rather than a verified
            property rent.
          </p>

          <h3>Mortgage benchmark — FRED 30-year fixed</h3>
          <p>
            The Federal Reserve Bank of St. Louis (FRED) publishes the
            weekly 30-year fixed mortgage rate series (MORTGAGE30US,
            sourced from Freddie Mac&apos;s Primary Mortgage Market
            Survey). We pull the latest week&apos;s reading and use it
            as the editable interest-rate benchmark. This series represents
            owner-occupied conforming mortgages; it is not an investor loan
            quote and does not know your points, credit profile, property,
            lender fees, or debt-service-coverage product. Replace it with a
            current lender quote before treating a deal as offer ready.
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
            <li><strong>Rent growth:</strong> 2.5% annual planning assumption, not a forecast</li>
            <li><strong>Expense growth:</strong> 2.5% annual planning assumption, editable independently</li>
            <li><strong>Mortgage:</strong> fully amortized — principal and interest portions recomputed each year</li>
            <li><strong>PMI / MIP:</strong> method v{TEN_YEAR_PROJECTION_SNAPSHOT_VERSION} checks the scheduled opening balance monthly; cancellable coverage stops at the modeled 80% LTV threshold, while loan-life coverage continues through payoff</li>
            <li><strong>Appreciation:</strong> 3% annual scenario assumption, not an appraisal or forecast</li>
          </ul>
          <p>
            All four assumptions are editable on the Pro plan. The
            10-year output shows cumulative cash flow, cumulative
            principal paydown, and ending equity year-by-year.
          </p>

          <h2 className="text-2xl sm:text-3xl">Illustrative tax impact</h2>
          <h3>Depreciation</h3>
          <p>
            Residential rentals depreciate over 27.5 years straight-line
            (IRS schedule). We default the building portion to 85% of
            purchase price (land = 15%, non-depreciable). Annual
            depreciation = (purchase price × 0.85) ÷ 27.5. This is a
            paper deduction — it doesn&apos;t affect before-tax cash flow. Its
            actual availability and value depend on basis allocation,
            placed-in-service timing, passive-loss rules, participation,
            income, entity structure, and your tax professional&apos;s advice.
          </p>
          <h3>Mortgage interest deduction</h3>
          <p>
            We compute the interest portion of each year&apos;s mortgage
            payments from the amortization schedule and add it to total
            deductions.
          </p>
          <h3>Estimated tax effect</h3>
          <p>
            Taxable rental income = rental income − deductible operating
            expenses − eligible mortgage interest − straight-line
            depreciation. We multiply the signed taxable amount by the
            entered marginal rate (24% default): a loss produces an
            illustrative benefit and positive taxable income produces an
            illustrative liability. TrueCap does not assume every paper loss
            can offset other income. This is planning math, not tax advice.
          </p>

          <h2 className="text-2xl sm:text-3xl">Exit scenarios</h2>
          <p>
            We model the sale of the property in years 1 through 10.
            Each year: projected sale price = current value × (1 +
            appreciation rate)<sup>years</sup>. Net sale proceeds = sale
            price − selling costs (default 6%) − remaining loan balance.
            Total profit = net proceeds + cumulative cash flow + cumulative
            illustrative tax effect − initial cash invested − estimated exit
            tax. The optimizer compares hold years under the assumptions you
            entered; it does not predict the best future sale date. A 1031
            exchange, primary-residence exclusion, local taxes, improvements,
            and your actual bracket can materially change the result.
          </p>

          {/* id anchor: the founding-pricing banner deep-links here as the
              verifiable proof behind "Methodology v1.0". */}
          <h2 id="version-history" className="scroll-mt-24 text-2xl sm:text-3xl">Methodology version history</h2>
          <ul>
            {UNDERWRITING_STANDARD_RELEASE_NOTES.map((release) => (
              <li key={release.revision}>
                <strong>v{release.version} · {release.effectiveDate}:</strong>{" "}
                {release.summary}
              </li>
            ))}
          </ul>

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
          Last updated: August 25, 2026. We update this page whenever the
          methodology materially changes.
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
