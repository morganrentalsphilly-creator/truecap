/**
 * Public SEO landing page for the rental property cash flow calculator —
 * the highest-volume head-term tool query in the niche and the metric the
 * whole TrueCap analyzer is built around.
 *
 * Strategy mirrors /tools/cap-rate-calculator: the working calculator is
 * above the fold so visitors can do what they came for, then long-form
 * content (~1,800 words) earns the page authority for "rental property
 * cash flow calculator" + adjacent long-tail keywords. Schema.org
 * WebApplication + FAQPage markup helps Google surface the calculator as
 * a tool and the FAQ as a rich result.
 *
 * Math conventions in the copy match lib/calc-analysis.ts exactly:
 * NOI/DSCR exclude the CapEx reserve, cash flow includes it, and the
 * worked example below uses the widget's default inputs so the article
 * and the live calculator always agree to the dollar.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { getSiteUrl } from "@/lib/site-url";
import { RentalCashFlowCalculatorWidget } from "@/components/tools/rental-cash-flow-calculator-widget";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";
import { ToolEmbedInvite } from "@/components/marketing/tool-embed-invite";

import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";
export const metadata: Metadata = {
  title: "Rental Property Cash Flow Calculator | Free Monthly Cash Flow Tool",
  description:
    "Free rental property cash flow calculator. Get monthly cash flow after every operating expense and the mortgage — with the NOI and debt-service split lenders look at.",
  keywords: [
    "rental property cash flow calculator",
    "cash flow calculator real estate",
    "rental cash flow calculator",
    "how to calculate cash flow on a rental property",
    "monthly cash flow rental property",
    "positive cash flow rental",
    "rental property calculator",
  ],
  alternates: { canonical: "/tools/rental-cash-flow-calculator" },
  openGraph: {
    title: "Rental Property Cash Flow Calculator — Free Tool",
    description:
      "Calculate monthly rental cash flow in seconds — price, rent, financing, and the full expense set — plus plain-English guidance on what counts as good cash flow.",
    url: "/tools/rental-cash-flow-calculator",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap rental property cash flow calculator" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/home.jpg"],
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do you calculate cash flow on a rental property?",
    a: "Cash flow equals rent minus operating expenses minus the mortgage payment. Start with monthly rent, subtract every operating cost — property tax, insurance, vacancy reserve, management, maintenance, CapEx reserve, plus HOA and owner-paid utilities if they apply — then subtract the monthly principal-and-interest payment. What's left is the cash that actually lands in your account each month.",
  },
  {
    q: "What is good monthly cash flow for a rental property?",
    a: "It depends on the deal size and how conservative your expense assumptions are. As a reference point, TrueCap's verdict engine weighs $400+/mo (paired with DSCR of at least 1.25 and cash-on-cash of at least 10%) as strong fundamentals, and $100+/mo as solid. Anything between $0 and $100/mo is break-even territory — one vacancy or repair wipes out the year. The number only means something if the expense reserves behind it are honest.",
  },
  {
    q: "Does cash flow include the mortgage payment?",
    a: "Yes — that's the defining difference between cash flow and NOI. Net Operating Income stops before debt service, so it describes the property. Cash flow subtracts the mortgage payment too, so it describes your deal — the same property produces different cash flow for a 20%-down buyer and an all-cash buyer.",
  },
  {
    q: "What's the difference between cash flow and NOI?",
    a: "NOI is gross rent minus operating expenses, before debt service and income tax. Cash flow keeps going: it subtracts the mortgage payment (and the CapEx reserve). TrueCap follows the lender-standard convention: NOI and DSCR exclude the CapEx reserve, because CapEx is a below-the-line return-of-capital reserve rather than an operating expense — but cash flow still subtracts it, because the roof fund is real money leaving your account.",
  },
  {
    q: "Should I still budget for vacancy and maintenance if the property is new or I self-manage?",
    a: "Yes. Vacancy reserves typically run 5–8% of rent and maintenance 5–10% even on well-kept properties — tenants still move out and water heaters still fail. If you self-manage you can set management to 0%, but be honest that you're paying yourself with your own time. A calculator that skips these reserves produces a cash flow number the property will never actually deliver.",
  },
  {
    q: "Is negative cash flow ever acceptable?",
    a: "Only as a deliberate, eyes-open appreciation bet in a market you have a specific reason to believe in — and only if you can comfortably feed the property every month without a forced sale risk. Negative cash flow removes your margin for error: a vacancy, a rate adjustment, or a repair bill compounds an already-losing month. Most 2026 underwriting weighs cash flow more heavily than boom-era underwriting did, precisely because appreciation is a forecast while cash flow is observable.",
  },
  {
    q: "Why does my lender's DSCR look different from my cash flow?",
    a: "DSCR is NOI divided by debt service — it excludes the CapEx reserve and doesn't care about your down payment beyond how it sizes the loan. A deal can have positive cash flow but a DSCR below the 1.25 most lenders want, or vice versa. This calculator shows both so you can see the deal the way you'll experience it (cash flow) and the way a lender will underwrite it (DSCR).",
  },
];

export default function RentalCashFlowCalculatorPage() {
  const siteUrl = getSiteUrl();

  const webAppLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "TrueCap Rental Property Cash Flow Calculator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    dateModified: "2026-07-14",
    url: `${siteUrl}/tools/rental-cash-flow-calculator`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "Free online calculator for rental property monthly cash flow, with the full operating-expense set and the NOI / debt-service split.",
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
    name: "Rental Property Cash Flow Calculator",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Real Estate Calculator",
    operatingSystem: "Web",
    description:
      "Free rental property cash flow calculator. Get monthly cash flow after every operating expense and the mortgage — with the NOI and debt-service split lenders look at.",
    url: `${siteUrl}/tools/rental-cash-flow-calculator`,
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
      "Monthly cash flow from price, rent, financing + full expense set",
      "NOI and debt-service split with live DSCR",
      "Vacancy, management, maintenance, CapEx reserves built in",
      "Free, no signup",
    ],
  };

  return (
    <>
      <ToolBreadcrumbSchema toolPath="/tools/rental-cash-flow-calculator" toolName="Rental cash flow calculator" />
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
              Rental Property Cash Flow Calculator
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-2 leading-relaxed">
              The number that actually lands in your account each month —
              after every operating expense, every reserve, and the
              mortgage. Type in price, rent, and financing; the cash flow
              (and the NOI / debt-service split behind it) computes live.
            </p>
          </header>

          {/* Calculator — above the fold */}
          <RentalCashFlowCalculatorWidget />

          {/* Long-form content */}
          <article className="prose prose-slate max-w-none mt-10 sm:mt-12 [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground">
            <h2 className="text-2xl sm:text-3xl">What is rental property cash flow?</h2>
            <p>
              Cash flow is rent minus operating expenses minus the mortgage
              payment — the cash that lands in your account each month.
              It&apos;s the most intuitive number in rental investing and
              also the most commonly faked: listings, back-of-napkin math,
              and optimistic spreadsheets routinely skip the expenses that
              turn a &ldquo;$500/mo winner&rdquo; into a break-even deal.
              This calculator includes all of them by default.
            </p>

            <h3>The formula</h3>
            <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
              <div className="text-base sm:text-lg font-mono">
                <span className="font-bold">Cash flow</span> = Rent −
                Operating Expenses − Mortgage Payment
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                e.g. $2,400 rent − $1,005 expenses − $1,297 mortgage ≈ $97/mo
              </div>
            </div>
            <p>
              Two of those three terms are where deals are won or lost.
              Rent is usually knowable. The mortgage payment is exact math.
              But &ldquo;operating expenses&rdquo; is a bundle of eight or
              more line items — and every one you skip inflates the answer.
            </p>

            <h2 className="text-2xl sm:text-3xl">The full walkthrough, line by line</h2>
            <p>
              Here&apos;s the calculator&apos;s default example worked out
              by hand — a $250,000 single-family rental at $2,400/mo rent,
              bought with 20% down at 6.75% on a 30-year loan:
            </p>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-sm border-collapse my-4">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-bold">Line item</th>
                    <th className="text-left py-2 px-3 font-bold">Assumption</th>
                    <th className="text-right py-2 px-3 font-bold">Monthly</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3 font-semibold">Rent</td>
                    <td className="py-2 px-3">Market rent</td>
                    <td className="py-2 px-3 text-right font-mono">+$2,400</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3">Property tax</td>
                    <td className="py-2 px-3">1.1% of price / yr</td>
                    <td className="py-2 px-3 text-right font-mono">−$229</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3">Insurance</td>
                    <td className="py-2 px-3">0.5% of price / yr</td>
                    <td className="py-2 px-3 text-right font-mono">−$104</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3">Vacancy reserve</td>
                    <td className="py-2 px-3">5% of rent</td>
                    <td className="py-2 px-3 text-right font-mono">−$120</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3">Management</td>
                    <td className="py-2 px-3">8% of rent</td>
                    <td className="py-2 px-3 text-right font-mono">−$192</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3">Maintenance reserve</td>
                    <td className="py-2 px-3">10% of rent</td>
                    <td className="py-2 px-3 text-right font-mono">−$240</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3">CapEx reserve</td>
                    <td className="py-2 px-3">5% of rent</td>
                    <td className="py-2 px-3 text-right font-mono">−$120</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3">Mortgage (P&amp;I)</td>
                    <td className="py-2 px-3">$200k loan · 6.75% · 30yr</td>
                    <td className="py-2 px-3 text-right font-mono">−$1,297</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold">Monthly cash flow</td>
                    <td className="py-2 px-3"></td>
                    <td className="py-2 px-3 text-right font-mono font-bold">≈ $97</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Notice what the honest version of this deal looks like:
              roughly $97/mo, not the $770/mo you&apos;d get by computing
              &ldquo;rent minus tax, insurance, and mortgage&rdquo; the way
              many listings do. That gap — about $670 of reserves —
              isn&apos;t pessimism. It&apos;s the vacancy month, the water
              heater, and the property manager that every rental eventually
              pays for, averaged into a monthly number.
            </p>
            <p>
              The assumptions also show how sensitive the answer is. Drop
              the maintenance reserve to 5% for a newer build and cash flow
              roughly doubles to ~$217/mo. Self-manage and it jumps another
              $192. That&apos;s why serious investors argue about expense
              assumptions, not formulas — the formula is trivial, the
              assumptions are the underwrite.
            </p>

            <h3>The NOI / debt-service split</h3>
            <p>
              Under the headline number, the calculator shows the split
              lenders care about. <Link href="/glossary/noi" className="text-primary font-semibold hover:underline">Net Operating Income</Link>{" "}
              is rent minus operating expenses, <em>before</em> the
              mortgage — $1,515/mo in the example above.{" "}
              <Link href="/glossary/dscr" className="text-primary font-semibold hover:underline">DSCR</Link>{" "}
              divides that NOI by the debt service: $1,515 ÷ $1,297 = 1.17.
              Lenders typically want ≥1.25 for investment loans, so this
              deal cash-flows for you but sits below the threshold many
              lenders underwrite to — exactly the kind of nuance a single
              cash-flow number hides.
            </p>
            <p>
              One convention worth knowing: following the lender-standard
              definition, NOI and DSCR here <strong>exclude</strong>{" "}
              the CapEx reserve (it&apos;s a return-of-capital reserve, not an
              operating expense), while cash flow still subtracts it. The
              full TrueCap analyzer uses the same convention, so the numbers
              you see here carry over exactly.
            </p>

            <h2 className="text-2xl sm:text-3xl">What&apos;s good monthly cash flow?</h2>
            <p>
              There&apos;s no universal magic number — $300/mo means
              something different on a $120k door in Cleveland than on a
              $600k door in Phoenix. But the bands TrueCap&apos;s own
              verdict engine uses are a useful reference:
            </p>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-sm border-collapse my-4">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-bold">Monthly cash flow</th>
                    <th className="text-left py-2 px-3 font-bold">Read</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3 font-mono">$400+</td>
                    <td className="py-2 px-3">Strong — when DSCR ≥ 1.25 and cash-on-cash ≥ 10% agree</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3 font-mono">$100–$400</td>
                    <td className="py-2 px-3">Solid — real cushion, worth the full underwrite</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3 font-mono">$0–$100</td>
                    <td className="py-2 px-3">Break-even territory — one repair erases the year</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3 font-mono">$0 to −$200</td>
                    <td className="py-2 px-3">Marginal — you subsidize the property monthly</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-mono">Below −$200</td>
                    <td className="py-2 px-3">Negative — the numbers don&apos;t support a buy-and-hold thesis as entered</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Two caveats. First, cash flow scales with deal size — judge
              it alongside{" "}
              <Link href="/glossary/cash-on-cash-return" className="text-primary font-semibold hover:underline">cash-on-cash return</Link>{" "}
              (most buy-and-hold investors target 8–12%) so a big deal
              can&apos;t hide a weak return behind a big-looking dollar
              figure. Second, a strong cash-flow number built on thin
              reserves is fiction. $400/mo with 0% vacancy and 0%
              maintenance is worse than $150/mo with honest assumptions.
            </p>

            <h2 className="text-2xl sm:text-3xl">The costs beginners forget</h2>
            <h3>1. CapEx — the roof fund</h3>
            <p>
              Capital expenditures are the big-ticket items that don&apos;t
              show up monthly but absolutely show up: roof, HVAC, water
              heater, flooring. A common reserve is 5–10% of rent,
              more for older properties. Skipping CapEx is the single most
              common way spreadsheets overstate cash flow — our guide to{" "}
              <Link href="/blog/capex-maintenance-reserves-rental-property" className="text-primary font-semibold hover:underline">CapEx and maintenance reserves</Link>{" "}
              breaks down realistic numbers by property age.
            </p>
            <h3>2. Vacancy — rent you don&apos;t collect</h3>
            <p>
              No property rents 12 months a year forever. A 5–8% vacancy
              reserve models roughly 2–4 weeks of vacancy per year plus
              collection loss. In high-turnover neighborhoods or
              college towns, use more.
            </p>
            <h3>3. Turns — the cost between tenants</h3>
            <p>
              Every move-out costs money: paint, cleaning, small repairs,
              re-leasing fees, and the vacant weeks while it happens. Turns
              land across your vacancy and maintenance reserves — which is
              exactly why zeroing those lines out because &ldquo;the tenant
              is great&rdquo; eventually produces a very bad quarter.
            </p>
            <h3>4. PMI on low-down-payment loans</h3>
            <p>
              Under 20% down, most conventional loans add monthly mortgage
              insurance on top of P&amp;I. This calculator flags it; the
              full analyzer models it automatically, including when it
              drops off as the loan amortizes.
            </p>

            <h2 className="text-2xl sm:text-3xl">
              Cash flow vs. cap rate vs. cash-on-cash
            </h2>
            <p>
              These three metrics answer different questions, and serious
              investors read them together:
            </p>
            <ul>
              <li>
                <strong>Cash flow</strong> — What lands in my account each
                month? Absolute dollars; includes financing.
              </li>
              <li>
                <strong>Cap rate</strong> — How does the property perform
                as an asset, ignoring financing? Best for comparing
                properties. Run it with the{" "}
                <Link href="/tools/cap-rate-calculator" className="text-primary font-semibold hover:underline">cap rate calculator</Link>.
              </li>
              <li>
                <strong>Cash-on-cash return</strong> — How hard is my
                invested cash working, as a percentage? Best for comparing
                against other uses of your money. Run it with the{" "}
                <Link href="/tools/cash-on-cash-calculator" className="text-primary font-semibold hover:underline">cash-on-cash calculator</Link>.
              </li>
            </ul>
            <p>
              Cash flow is the one that pays your bills — but it&apos;s
              also the one that says nothing about scale. The percentage
              metrics keep it honest, and{" "}
              <Link href="/tools/dscr-calculator" className="text-primary font-semibold hover:underline">DSCR</Link>{" "}
              tells you whether a lender will fund the deal at all. For how
              the whole family of metrics fits together on a real deal, see{" "}
              <Link href="/blog/cap-rate-vs-cash-on-cash-vs-dscr" className="text-primary font-semibold hover:underline">cap rate vs cash-on-cash vs DSCR</Link>{" "}
              and the strategy-level view in{" "}
              <Link href="/blog/cash-flow-vs-appreciation" className="text-primary font-semibold hover:underline">cash flow vs appreciation</Link>.
            </p>

            <h2 className="text-2xl sm:text-3xl">When to use this calculator</h2>
            <p>
              Use it the moment a listing catches your eye. Cash flow with
              honest reserves is the fastest way to sort &ldquo;worth a
              real underwrite&rdquo; from &ldquo;pass&rdquo; — faster and
              more accurate than the{" "}
              <Link href="/blog/50-percent-rule-rentals" className="text-primary font-semibold hover:underline">50% rule</Link>{" "}
              once you have real numbers for tax and insurance.
            </p>
            <p>
              When a deal survives this screen, run the full analysis at
              TrueCap — the analyzer starts from the same inputs, adds
              PMI, closing costs, and after-tax effects, and layers on cap
              rate, cash-on-cash, DSCR, 10-year projections, illustrative tax impact,
              exit scenarios, and a plain-English verdict.
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
              Monthly cash flow is the screen, not the underwrite. TrueCap
              takes the same inputs and adds PMI, closing costs, cap rate,
              cash-on-cash, DSCR, 10-year projections, tax savings, exit
              scenarios, and a Deal Score.
            </p>
            <ul className="text-sm space-y-1.5 mb-5 opacity-90">
              {[
                "Cash flow, cap rate, CoC, DSCR — auto-calculated",
                "State property tax + market rent auto-filled from the address",
                "10-year projection with rent + expense growth (Pro)",
                "Depreciation modeling and after-tax cash flow (Pro)",
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
          {/* Backlink engine — quiet, collapsed, renders nothing if this
              tool has no embeddable widget. See the component header. */}
          <ToolEmbedInvite slug="rental-cash-flow-calculator" />

          <ToolsConversionCta calculatorName="Rental cash flow calculator" hook="TrueCap's full analyzer runs the same cash-flow math plus cap rate, cash-on-cash, DSCR, PMI, 10-year projections, tax savings, and exit scenarios — all on the same deal. Save your work, compare deals, share a link." />

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
