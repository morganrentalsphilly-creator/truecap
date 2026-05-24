import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { getSiteUrl } from "@/lib/site-url";
import { OnePercentRuleWidget } from "@/components/tools/one-percent-rule-widget";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";

import { SiteFooter } from "@/components/marketing/site-footer";
export const metadata: Metadata = {
  title: "1% Rule Calculator | Free Rental Property Screener | TrueCap",
  description:
    "Free 1% rule calculator for rental property. Instantly screen any deal as Pass / Fail. Plus when the 1% rule applies, when it doesn't, and what to do if a deal fails.",
  keywords: [
    "1 percent rule calculator",
    "one percent rule real estate",
    "rental property 1 percent rule",
    "1% rule calculator",
    "real estate screening rule",
  ],
  alternates: { canonical: "/tools/1-percent-rule-calculator" },
  openGraph: {
    title: "1% Rule Calculator — Free Rental Property Screener",
    description:
      "Pass / fail the 1% rule in 5 seconds. Plus plain-English guidance on when the rule applies and when it doesn't.",
    url: "/tools/1-percent-rule-calculator",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap 1% rule calculator" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/home.jpg"],
  },
};

const FAQS = [
  {
    q: "What is the 1% rule in real estate?",
    a: "The 1% rule says monthly rent should equal at least 1% of the purchase price. A $200,000 property should rent for at least $2,000/month. It's a 5-second screening filter, not a complete analysis.",
  },
  {
    q: "Is the 1% rule still relevant in 2026?",
    a: "Yes, but with context. In high-appreciation coastal markets, almost no property passes the 1% rule — and many of those are still great investments because appreciation makes up the difference. In cash-flow markets (Midwest, Sun Belt), the 1% rule is still a useful quick filter for healthy rentals.",
  },
  {
    q: "What's the difference between the 1% rule and cap rate?",
    a: "The 1% rule is gross rent over price. Cap rate is NOI (rent minus operating expenses) over price. The 1% rule is a faster screening tool; cap rate is the more accurate metric for actual underwriting. A property can pass the 1% rule but have a poor cap rate if expenses are unusually high.",
  },
  {
    q: "What about the 2% rule?",
    a: "Some investors target a 2% rule for high-cash-flow markets. Realistically, very few US properties hit 2% in 2026 — most that do are in distressed neighborhoods where management headaches eat the cash flow. Pass any 2% deal through a deeper underwrite before celebrating.",
  },
  {
    q: "If a property fails the 1% rule, should I skip it?",
    a: "Not automatically. Failing the 1% rule means: (a) it's an appreciation market where investors accept lower cash flow, or (b) the price is too high relative to rent. Decide which one applies. Buy-and-hold cash flow investors usually skip failing properties; appreciation-focused investors don't even look at the 1% rule.",
  },
  {
    q: "Does the 1% rule work for multi-family?",
    a: "Yes, just use total monthly rent across all units. A duplex priced at $250,000 with $1,400 + $1,200 rent ($2,600 total) hits 1.04% — it passes. The rule is unit-count-agnostic.",
  },
];

export default function OnePercentRulePage() {
  const siteUrl = getSiteUrl();
  const webAppLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "TrueCap 1% Rule Calculator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: `${siteUrl}/tools/1-percent-rule-calculator`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
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
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <div className="min-h-screen bg-background">
        <main id="main" className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <header className="mb-6 sm:mb-8">
            <Link href="/tools" className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground">
              ← TrueCap free tools
            </Link>
            <h1 className="text-3xl sm:text-4xl font-black text-foreground mt-2 leading-tight">
              1% Rule Calculator
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-2 leading-relaxed">
              The 5-second filter for whether a rental property is worth a
              deeper underwrite. Pass means run the full analysis; fail
              means either an appreciation market or an overpriced deal.
            </p>
          </header>

          <OnePercentRuleWidget />

          <article className="prose prose-slate max-w-none mt-10 sm:mt-12 [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-black [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground">
            <h2 className="text-2xl sm:text-3xl">What is the 1% rule?</h2>
            <p>
              The 1% rule is a back-of-the-envelope screening filter
              investors use to decide whether a rental property deserves a
              full underwrite. The rule:
            </p>
            <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
              <div className="text-base sm:text-lg font-mono font-bold">
                Monthly rent ≥ 1% of purchase price
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                $200,000 price × 1% = $2,000/month rent required to pass
              </div>
            </div>
            <p>
              That&apos;s it. No expenses, no financing, no projection — just
              a 5-second sanity check.
            </p>

            <h2 className="text-2xl sm:text-3xl">Why investors use it</h2>
            <p>
              The 1% rule exists because new investors look at <em>too many</em>{" "}
              properties. Reading every listing in detail is slow. A quick
              gross-rent-to-price filter cuts the universe of properties down
              to the ones likely to cash-flow, which is where the time
              investment in full underwriting pays off.
            </p>
            <p>
              Veteran investors who know their market well often skip the
              rule entirely — they can eyeball whether a property &ldquo;feels
              right.&rdquo; New investors and out-of-market buyers benefit
              from the discipline.
            </p>

            <h2 className="text-2xl sm:text-3xl">When the 1% rule works</h2>
            <ul>
              <li>
                <strong>Cash-flow markets.</strong> Midwest cities (Cleveland,
                Detroit, Memphis), Sun Belt suburbs, and rural areas where
                prices are low enough that the math works.
              </li>
              <li>
                <strong>Buy-and-hold investors.</strong> If your strategy
                depends on monthly cash flow rather than appreciation, you
                need rent that significantly exceeds expenses.
              </li>
              <li>
                <strong>Triage when looking at many properties.</strong> A
                weekend of scrolling listings is exhausting; the 1% rule
                makes the scroll productive.
              </li>
            </ul>

            <h2 className="text-2xl sm:text-3xl">When the 1% rule misleads</h2>
            <ul>
              <li>
                <strong>Coastal / Tier-1 markets.</strong> Almost nothing in
                SF, NYC, Seattle, or Boston passes the 1% rule. That
                doesn&apos;t mean the deals are bad — it means cash flow
                isn&apos;t the goal in those markets. Investors accept lower
                rent-to-price ratios in exchange for higher long-term
                appreciation.
              </li>
              <li>
                <strong>Properties with unusual expenses.</strong> A high-HOA
                condo, a property with $20k annual property taxes, or a
                house needing $60k of rehab can pass the 1% rule and still
                be a money-loser.
              </li>
              <li>
                <strong>Properties with above-market rent.</strong> If the
                current tenant is paying more than what a new lease would
                fetch, the 1% rule overstates the real return. Confirm
                rents are sustainable.
              </li>
            </ul>

            <h2 className="text-2xl sm:text-3xl">After the 1% rule: what to check</h2>
            <p>
              A property that passes the 1% rule has earned a closer look.
              Next steps:
            </p>
            <ol>
              <li>Pull the actual property tax bill (not estimate)</li>
              <li>Get an insurance quote from a real broker</li>
              <li>Walk the comps — what do similar units actually rent for?</li>
              <li>Get a rough rehab estimate if the property needs work</li>
              <li>Run the full underwrite — cap rate, CoC, DSCR, cash flow</li>
            </ol>
            <p>
              TrueCap handles steps 4 and 5 in about four minutes once you
              have the inputs.
            </p>

            <h2 className="text-2xl sm:text-3xl">Frequently asked questions</h2>
            <div className="space-y-4">
              {FAQS.map((f) => (
                <details key={f.q} className="bg-card border border-border rounded-lg p-4 group">
                  <summary className="font-semibold text-foreground cursor-pointer list-none flex items-start justify-between gap-3">
                    <span>{f.q}</span>
                    <span className="text-muted-foreground text-xl leading-none group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-3">{f.a}</p>
                </details>
              ))}
            </div>
          </article>

          <section className="mt-10 sm:mt-12 rounded-2xl bg-primary text-primary-foreground p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-black mb-2">Take the deal past the 1% rule</h2>
            <p className="text-sm sm:text-base opacity-90 mb-4">
              Passing the 1% rule earns a deal a closer look. TrueCap runs
              the full underwrite — cap rate, CoC, DSCR, cash flow, 10-year
              projections, tax savings, and exit scenarios — in about four
              minutes, free to start.
            </p>
            <ul className="text-sm space-y-1.5 mb-5 opacity-90">
              {[
                "Cap rate + CoC + DSCR + monthly cash flow",
                "10-year projection with rent growth",
                "Depreciation tax savings model",
                "Sell / refi / hold exit comparison",
                "BRRRR + fix-and-flip calculators included",
                "Free to start",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <Link href="/" className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity">
              Open the full TrueCap analyzer
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </section>

          <ToolsConversionCta calculatorName="1% rule calculator" hook="The 1% rule is a 5-second screener. When you want a real underwrite — DSCR, cap rate, projections, tax — open the full TrueCap analyzer. It's free." />

          <footer className="mt-12 pt-8 border-t border-border text-center text-xs text-muted-foreground">
            Built with{" "}
            <Link href="/" className="font-bold text-foreground hover:underline">TrueCap</Link>{" "}
            — institutional-grade rental analysis, free to start.
          </footer>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
