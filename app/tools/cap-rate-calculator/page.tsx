/**
 * Public SEO landing page for the cap rate calculator.
 *
 * Strategy: the working calculator is above the fold so visitors can do
 * what they came for, then long-form content (~1,800 words) earns the
 * page authority on Google for "cap rate calculator" + adjacent
 * long-tail keywords. Schema.org WebApplication + FAQPage markup helps
 * Google surface the calculator as a tool and the FAQ as a rich result.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { getSiteUrl } from "@/lib/site-url";
import { CapRateCalculatorWidget } from "@/components/tools/cap-rate-calculator-widget";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";

import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";
export const metadata: Metadata = {
  title: "Cap Rate Calculator | Free Rental Property Calculator",
  description:
    "Free cap rate calculator for rental property analysis. Calculate capitalization rate in seconds, plus learn what counts as a good cap rate by market type.",
  keywords: [
    "cap rate calculator",
    "capitalization rate calculator",
    "rental property cap rate",
    "how to calculate cap rate",
    "what is a good cap rate",
    "real estate cap rate",
    "NOI calculator",
  ],
  alternates: { canonical: "/tools/cap-rate-calculator" },
  openGraph: {
    title: "Cap Rate Calculator — Free Rental Property Tool",
    description:
      "Calculate cap rate in seconds. Includes plain-English guidance on what counts as a good cap rate, how to compute NOI, and common investor mistakes.",
    url: "/tools/cap-rate-calculator",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap cap rate calculator" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/home.jpg"],
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is cap rate?",
    a: "Cap rate (capitalization rate) is the unleveraged annual return a property generates as a percentage of its purchase price. It equals Net Operating Income divided by property value. Because it ignores financing, it's the cleanest way to compare two properties' raw earning power, regardless of how each buyer might finance the deal.",
  },
  {
    q: "What's a good cap rate for a rental property?",
    a: "It depends on the market. In Tier 1 / coastal markets like San Francisco, Seattle, and New York, cap rates often sit between 4–6% because investors expect appreciation. In stable Midwestern and Southern markets, 6–8% is healthy. Cash-flow-heavy markets and lower-cost cities can push 8–10%. Anything above 10% should be verified — a high cap rate often signals either great cash flow or hidden risk (deferred maintenance, problem area, optimistic rents).",
  },
  {
    q: "What's the difference between cap rate and cash-on-cash return?",
    a: "Cap rate ignores financing. It tells you how the property performs as an asset, regardless of how it's bought. Cash-on-cash return divides your annual cash flow (after debt service) by the actual cash you put in (down payment + closing costs). It tells you how hard your money is working. Both matter — cap rate for comparing properties, cash-on-cash for comparing your investment to alternatives.",
  },
  {
    q: "Does cap rate include the mortgage payment?",
    a: "No. That's the defining feature of cap rate. Net Operating Income excludes principal and interest, so cap rate measures the property's economics independent of how it's financed. This is also why cap rate doesn't change when interest rates move — only NOI and market value do.",
  },
  {
    q: "How do I calculate NOI?",
    a: "Start with annual gross rental income, then subtract all operating expenses: property tax, insurance, HOA, utilities (if owner-paid), management, vacancy reserves, maintenance reserves, and CapEx reserves. Do not subtract mortgage payment, depreciation, or income tax. The result is NOI.",
  },
  {
    q: "Is a higher cap rate always better?",
    a: "No. Higher cap rates price in higher risk. A 12% cap rate in a stable suburban market might signal an underestimated capex backlog, rents above market, or a neighborhood with declining demand. Always cross-check with rent comps, recent capex history, and local vacancy data before celebrating a high cap rate.",
  },
  {
    q: "Why do experienced investors care so much about cap rate?",
    a: "It's the apples-to-apples comparison metric. Two properties at $300k each — one at 5% cap, one at 8% cap — are not equivalent investments even if their gross rent is the same. Cap rate makes the difference visible. It's also the metric commercial lenders quote when comparing properties for refinance and appraisal.",
  },
];

export default function CapRateCalculatorPage() {
  const siteUrl = getSiteUrl();

  const webAppLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "TrueCap Cap Rate Calculator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    dateModified: "2026-06-01",
    url: `${siteUrl}/tools/cap-rate-calculator`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "Free online calculator for rental property capitalization rate (cap rate), with built-in NOI breakdown and market-context benchmarks.",
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

  const softwareAppLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Cap Rate Calculator",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Real Estate Calculator",
    operatingSystem: "Web",
    description:
      "Free cap rate calculator for rental property analysis. Calculate capitalization rate in seconds, plus learn what counts as a good cap rate by market type.",
    url: `${siteUrl}/tools/cap-rate-calculator`,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    publisher: {
      "@type": "Organization",
      name: "TrueCap",
      url: "https://usetruecap.com",
    },
    featureList: [
      "Calculate cap rate from purchase price + NOI",
      "Adjust for vacancy + operating expenses",
      "Compare to market benchmarks",
      "Free, no signup",
    ],
  };

  return (
    <>
      <ToolBreadcrumbSchema toolPath="/tools/cap-rate-calculator" toolName="Cap rate calculator" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppLd) }}
      />

      <div className="min-h-screen bg-background">
        <main id="main" className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* H1 */}
          <header className="mb-6 sm:mb-8">
            <Link
              href="/tools"
              className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
            >
              ← TrueCap free tools
            </Link>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 leading-tight">
              Cap Rate Calculator
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-2 leading-relaxed">
              The cleanest single-number measure of a rental property&apos;s
              return — independent of how you finance the deal. Type in
              price, rent, and your operating expense assumption; the cap
              rate computes live.
            </p>
          </header>

          {/* Calculator — above the fold */}
          <CapRateCalculatorWidget />

          {/* Long-form content */}
          <article className="prose prose-slate max-w-none mt-10 sm:mt-12 [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground">
            <h2 className="text-2xl sm:text-3xl">What is cap rate?</h2>
            <p>
              Cap rate (short for <em>capitalization rate</em>) is the
              unleveraged return a property generates as a percentage of its
              purchase price. It strips out financing entirely so you can
              compare two properties on equal footing — regardless of whether
              one buyer plans to put 25% down at 7% and another plans to pay
              cash.
            </p>

            <h3>The formula</h3>
            <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
              <div className="text-base sm:text-lg font-mono">
                <span className="font-bold">Cap rate</span> = Net Operating
                Income (NOI) ÷ Property Value
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                e.g. $20,000 NOI ÷ $250,000 price = 8.0% cap rate
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl">How to compute NOI</h2>
            <p>
              Net Operating Income is the annual cash the property generates
              from rent <em>before</em> debt service and <em>before</em>{" "}
              income tax. The formula:
            </p>
            <p className="font-mono bg-card border border-border rounded-md p-3 text-sm sm:text-base">
              NOI = Annual rent − Annual operating expenses
            </p>
            <p>Operating expenses include:</p>
            <ul>
              <li>Property taxes</li>
              <li>Insurance</li>
              <li>HOA fees (if any)</li>
              <li>Owner-paid utilities</li>
              <li>Property management fees</li>
              <li>Maintenance reserve (commonly 5–10% of rent)</li>
              <li>Vacancy reserve (commonly 5–8% of rent)</li>
              <li>Capital expenditure reserve (commonly 5–10% of rent)</li>
            </ul>
            <p>
              They <strong>do not</strong> include mortgage principal or
              interest, depreciation, or income taxes — those affect your
              personal returns, not the property&apos;s operating economics.
              If you want to walk through NOI on its own, the{" "}
              <Link href="/tools/noi-calculator" className="text-primary font-semibold hover:underline">NOI calculator</Link>{" "}
              breaks every expense line out step by step, and the{" "}
              <Link href="/glossary/noi" className="text-primary font-semibold hover:underline">NOI glossary entry</Link>{" "}
              covers the edge cases (CapEx, vacancy, management) most newer
              investors miss.
            </p>

            <h2 className="text-2xl sm:text-3xl">What&apos;s a good cap rate?</h2>
            <p>
              Cap rate isn&apos;t good or bad in isolation — it&apos;s good
              or bad relative to your market and risk tolerance. The general
              benchmarks:
            </p>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-sm border-collapse my-4">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-bold">Range</th>
                    <th className="text-left py-2 px-3 font-bold">Profile</th>
                    <th className="text-left py-2 px-3 font-bold">Typical markets</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3 font-mono">4–6%</td>
                    <td className="py-2 px-3">Appreciation play, low cash flow</td>
                    <td className="py-2 px-3">SF, LA, Seattle, NYC, Boston</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3 font-mono">6–8%</td>
                    <td className="py-2 px-3">Healthy cash flow, stable demand</td>
                    <td className="py-2 px-3">Most Midwest + Sun Belt suburbs</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3 font-mono">8–10%</td>
                    <td className="py-2 px-3">Cash-flow-heavy, less appreciation</td>
                    <td className="py-2 px-3">Cleveland, Memphis, Birmingham</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-mono">10%+</td>
                    <td className="py-2 px-3">High risk — verify carefully</td>
                    <td className="py-2 px-3">Distressed neighborhoods, C-class assets</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              A great cap rate in San Francisco might be 5%. A great cap rate
              in Memphis might be 9%. Use the metric for{" "}
              <em>comparison</em> within a market, not as a universal scoring
              system. For the full benchmark walk-through, see our guide on{" "}
              <Link href="/blog/what-is-a-good-cap-rate" className="text-primary font-semibold hover:underline">what counts as a good cap rate in 2026</Link>.
            </p>

            <h2 className="text-2xl sm:text-3xl">
              Cap rate vs. cash-on-cash return vs. ROI
            </h2>
            <p>
              These three metrics answer different questions, and serious
              investors use all of them:
            </p>
            <ul>
              <li>
                <strong>Cap rate</strong> — How well does the property
                perform as an asset? Ignores financing.
              </li>
              <li>
                <strong>Cash-on-cash return</strong> — How hard is the cash
                I actually invested working? Includes the effect of leverage.
              </li>
              <li>
                <strong>Total ROI / IRR</strong> — Including appreciation,
                tax benefits, and principal paydown, what&apos;s the full
                annualized return across the hold period?
              </li>
            </ul>
            <p>
              Cap rate is the only one of the three that&apos;s independent
              of <em>you</em> as the buyer. Two buyers can produce wildly
              different cash-on-cash returns on the same property by changing
              the down payment, but the cap rate stays the same. The{" "}
              <Link href="/blog/cap-rate-vs-cash-on-cash-vs-dscr" className="text-primary font-semibold hover:underline">cap rate vs cash-on-cash vs DSCR deep-dive</Link>{" "}
              shows how all three numbers move together on a real deal — and
              you can run the leveraged side with the{" "}
              <Link href="/tools/cash-on-cash-calculator" className="text-primary font-semibold hover:underline">cash-on-cash calculator</Link>{" "}
              or the{" "}
              <Link href="/tools/dscr-calculator" className="text-primary font-semibold hover:underline">DSCR calculator</Link>.
            </p>

            <h2 className="text-2xl sm:text-3xl">
              Common mistakes investors make with cap rate
            </h2>
            <h3>1. Using gross rent instead of NOI</h3>
            <p>
              Plenty of online listings advertise &ldquo;9% cap rate&rdquo;
              using gross rent over price. That&apos;s not the cap rate —
              that&apos;s the gross rent multiplier inverted. Real cap rate
              subtracts operating expenses first. Always recompute.
            </p>
            <h3>2. Forgetting vacancy and CapEx reserves</h3>
            <p>
              A property doesn&apos;t actually generate 100% of its asking
              rent. Vacancies happen. Roofs need replacing. The cap rate that
              ignores 5–10% vacancy and 5–10% CapEx reserves is a fiction.
            </p>
            <h3>3. Comparing across markets</h3>
            <p>
              An 8% cap rate doesn&apos;t mean the same thing in Cleveland
              and Phoenix. Compare within markets, not across them.
            </p>
            <h3>4. Ignoring asset class</h3>
            <p>
              A-class properties in the same zip code trade at lower cap
              rates than C-class properties. The difference is risk and
              vacancy exposure, not opportunity.
            </p>

            <h2 className="text-2xl sm:text-3xl">When to use this calculator</h2>
            <p>
              Cap rate is the first filter on any deal. Investors who
              underwrite well will run cap rate on every property they
              consider — often within 60 seconds of seeing the listing — and
              only proceed to a full analysis on the ones that clear their
              hurdle. This calculator gives you that 60-second answer.
            </p>
            <p>
              When you&apos;re ready to go deeper — cash-on-cash, DSCR,
              monthly cash flow, 10-year projections, tax strategy, exit
              scenarios, and a deal score — you can run the full analysis
              free at TrueCap.
            </p>

            <h2 className="text-2xl sm:text-3xl">Frequently asked questions</h2>
            <div className="not-prose space-y-4">
              {FAQS.map((f) => (
                <details
                  key={f.q}
                  className="bg-card border border-border rounded-lg p-4 group"
                >
                  <summary className="font-semibold text-foreground cursor-pointer list-none flex items-start justify-between gap-3">
                    <span>{f.q}</span>
                    <span className="text-muted-foreground text-xl leading-none group-open:rotate-45 transition-transform">
                      +
                    </span>
                  </summary>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </article>

          {/* CTA */}
          <section className="mt-10 sm:mt-12 rounded-2xl bg-primary text-primary-foreground p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-extrabold mb-2">
              Run the full analysis — free
            </h2>
            <p className="text-sm sm:text-base opacity-90 mb-4">
              Cap rate is a great filter, but real underwriting needs cash
              flow, cash-on-cash, DSCR, 10-year projections, tax savings,
              exit scenarios, and a Deal Score. TrueCap does all of it from
              the same property inputs you used here.
            </p>
            <ul className="text-sm space-y-1.5 mb-5 opacity-90">
              {[
                "Cash flow, cap rate, CoC, DSCR — auto-calculated",
                "10-year projection with rent + expense growth (Pro)",
                "Depreciation modeling and tax savings (Pro)",
                "Sell / refi / hold exit comparison (Pro)",
                "Deal Score with thresholds across 4 dimensions",
                "Free to start — no credit card",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              Open the full TrueCap analyzer
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </section>

          {/* Footer */}
          <ToolsConversionCta calculatorName="Cap rate calculator" hook="TrueCap's full analyzer runs cap rate plus cash-on-cash, DSCR, 10-year projection, tax savings, and exit scenarios — all on the same deal. Save your work, compare deals, share a link." />

          <footer className="mt-12 pt-8 border-t border-border text-center text-xs text-muted-foreground">
            Built with{" "}
            <Link href="/" className="font-bold text-foreground hover:underline">
              TrueCap
            </Link>{" "}
            — institutional-grade rental analysis, free to start.
          </footer>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
