/**
 * Public SEO landing page for the house hacking calculator.
 *
 * Same strategy as /tools/cap-rate-calculator (the canonical tool-page
 * pattern): working calculator above the fold, then long-form content
 * targeting "house hacking calculator" + adjacent long-tail queries.
 * Interlinks the existing house-hacking cluster: /for-house-hackers,
 * the house-hacking blog posts, and /vs/biggerpockets-for-house-hacking.
 *
 * Finance copy stays consistent with the house-hack underwriting guide
 * (FHA 3.5% / conventional 5% owner-occupant, self-sufficiency test,
 * housing-cost-vs-renting benchmark) — no invented thresholds.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { getSiteUrl } from "@/lib/site-url";
import { HouseHackingCalculatorWidget } from "@/components/tools/house-hacking-calculator-widget";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";

import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";
export const metadata: Metadata = {
  title: "Free House Hacking Calculator — Live for Less",
  description:
    "Free house hacking calculator for 2-4 unit properties. See your effective monthly housing cost after tenant rent — duplex, triplex, or fourplex, with owner-occupant financing.",
  keywords: [
    "house hacking calculator",
    "house hack calculator",
    "duplex house hack calculator",
    "owner occupied multifamily calculator",
    "live for free real estate",
    "FHA house hack",
    "effective housing cost",
  ],
  alternates: { canonical: "/tools/house-hacking-calculator" },
  openGraph: {
    title: "Free House Hacking Calculator — Live for Less",
    description:
      "Live in one unit, rent the rest. See what's left of the mortgage payment after tenant rent — plus the honest after-reserves number.",
    url: "/tools/house-hacking-calculator",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap house hacking calculator" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/home.jpg"],
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is house hacking?",
    a: "Buying a 2-4 unit property (or a single-family with rentable rooms or an ADU), living in one unit, and renting the others so tenant rent covers most or all of your housing cost. The structural advantage is financing: owner-occupants qualify for 3.5% down FHA or 5% down conventional loans instead of the 20-25% down investor loans a pure rental requires.",
  },
  {
    q: "How does this calculator work?",
    a: "It computes your full monthly payment (principal, interest, property tax, and insurance), subtracts the rent from the units you don't live in, and shows what's left — your effective monthly housing cost. Your own unit counts as zero income, the same owner-occupant convention TrueCap's full analyzer uses. It also shows an after-reserves number that sets aside vacancy, maintenance, and CapEx on the rented units.",
  },
  {
    q: "Should a house hack cash flow?",
    a: "Usually not, and that's fine. The right benchmark is housing savings, not cash flow: compare your effective housing cost to what you'd pay to rent a comparable place. If renting would cost you $2,200/month and the house hack nets you out at $800/month, you're saving $1,400/month even though the property doesn't 'cash flow' the way a pure rental would. Cash flow matters at year 2, when you move out and rent your unit at market.",
  },
  {
    q: "What down payment do I need to house hack?",
    a: "As an owner-occupant, typically 3.5% down with an FHA loan or 5% down with a conventional owner-occupant loan — on 2-4 unit properties, not just single-family. Both require you to live in the property for one year after closing as your primary residence. Compare that with 20-25% down for the same building bought as a pure investment.",
  },
  {
    q: "What is the FHA self-sufficiency test?",
    a: "For 3-4 unit properties, FHA requires the property's projected rents to cover the entire PITIA payment. Many 3-4 unit FHA deals fail this test in higher-cost markets. Conventional 5% owner-occupant financing has no self-sufficiency test — sometimes 5% down conventional salvages a deal that fails at FHA's 3.5%.",
  },
  {
    q: "Does my own unit count as income?",
    a: "No. While you live there, your unit produces no rent, so the honest calculation excludes it. When you model the year-2 move-out — renting your unit at market and turning the property into a pure rental — the picture changes, which is exactly what TrueCap's full analyzer models with per-unit rents and an owner-occupant toggle.",
  },
  {
    q: "Why does the calculator add reserves back?",
    a: "Because vacancies and repairs happen even when you live next door. The headline number (PITI minus rent) is the optimistic month. The after-reserves number sets aside vacancy, maintenance, and CapEx on the rented units — the same reserve categories TrueCap's house-hack starter template uses — and it's the number to underwrite with.",
  },
];

export default function HouseHackingCalculatorPage() {
  const siteUrl = getSiteUrl();

  const webAppLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "TrueCap House Hacking Calculator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    dateModified: "2026-07-14",
    url: `${siteUrl}/tools/house-hacking-calculator`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "Free online house hacking calculator for 2-4 unit owner-occupied properties: effective monthly housing cost after tenant rent, with reserves.",
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
    name: "House Hacking Calculator",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Real Estate Calculator",
    operatingSystem: "Web",
    description:
      "Free house hacking calculator for 2-4 unit properties. See your effective monthly housing cost after tenant rent — duplex, triplex, or fourplex.",
    url: `${siteUrl}/tools/house-hacking-calculator`,
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
      "Duplex, triplex, and fourplex owner-occupant math",
      "Effective housing cost after tenant rent",
      "After-reserves number (vacancy, maintenance, CapEx)",
      "Free, no signup",
    ],
  };

  return (
    <>
      <ToolBreadcrumbSchema toolPath="/tools/house-hacking-calculator" toolName="House hacking calculator" />
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
              House Hacking Calculator
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-2 leading-relaxed">
              Live in one unit, rent the others. Type in the price, your
              financing, and the rent from the units you won&apos;t live
              in — your effective monthly housing cost computes live.
            </p>
          </header>

          {/* Calculator — above the fold */}
          <HouseHackingCalculatorWidget />

          {/* Long-form content */}
          <article className="prose prose-slate max-w-none mt-10 sm:mt-12 [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground">
            <h2 className="text-2xl sm:text-3xl">What is house hacking?</h2>
            <p>
              House hacking is buying a small multifamily property — a
              duplex, triplex, or fourplex — living in one unit, and
              renting out the rest so your tenants pay most (or all) of
              your mortgage. It&apos;s one of the highest-leverage moves in
              residential real estate for one structural reason:{" "}
              <strong>owner-occupant financing</strong>. Because you live
              there, you can buy a 2&ndash;4 unit building with 3.5% down
              (FHA) or 5% down (conventional owner-occupant) instead of the
              20&ndash;25% down an investor loan requires for the very same
              building.
            </p>
            <p>
              The result: a first property, a landlording apprenticeship,
              and a dramatically lower housing bill — all funded with a
              fraction of the cash a traditional rental takes. For the
              full strategy walkthrough, start with{" "}
              <Link href="/blog/house-hacking-explained" className="text-primary font-semibold hover:underline">house hacking explained</Link>{" "}
              or the persona page for{" "}
              <Link href="/for-house-hackers" className="text-primary font-semibold hover:underline">house hackers using TrueCap</Link>.
            </p>

            <h3>The math this calculator runs</h3>
            <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
              <div className="text-base sm:text-lg font-mono">
                <span className="font-bold">Effective housing cost</span> ={" "}
                Full payment (PITI) − Rent from the other units
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                e.g. $2,850 PITI − $1,500 unit-2 rent = live for $1,350/mo
              </div>
            </div>
            <p>
              Your own unit counts as <strong>zero income</strong>{" "}while
              you live in it — the same owner-occupant convention
              TrueCap&apos;s full analyzer applies when it excludes the
              occupied unit from rental income. That single convention is
              what separates honest house-hack math from listing-flyer
              math: a fourplex&apos;s advertised gross rent includes the
              unit you&apos;re about to take off the market.
            </p>

            <h2 className="text-2xl sm:text-3xl">
              The right benchmark: housing cost, not cash flow
            </h2>
            <p>
              A pure rental is judged on cash flow, cap rate, and
              cash-on-cash return. A house hack is different: while you
              occupy a unit, the property is producing housing first and
              income second. Judging it as a rental will talk you out of
              great deals, because most house hacks don&apos;t
              &ldquo;cash flow&rdquo; in year 1 — and don&apos;t need to.
            </p>
            <p>
              The comparison that matters is{" "}
              <strong>your effective housing cost vs. renting the
              equivalent</strong>. If a comparable one-bed rents for
              $2,200/month and your duplex nets you out at $800/month for
              the same quality of housing, the house hack is saving you
              $1,400/month — even though a spreadsheet that treats it as a
              rental would show negative cash flow. The{" "}
              <Link href="/blog/house-hack-underwriting-guide" className="text-primary font-semibold hover:underline">house-hack underwriting guide</Link>{" "}
              walks through this benchmark in detail, including the
              owner-occupant tax wrinkles worth a CPA conversation.
            </p>

            <h2 className="text-2xl sm:text-3xl">
              Financing: why 2&ndash;4 units is the sweet spot
            </h2>
            <p>
              Residential owner-occupant financing covers 1&ndash;4 unit
              properties. That means the same low-down loans that buy a
              starter home can buy a fourplex — as long as you live in one
              of the units for at least a year after closing. The two
              common routes:
            </p>
            <ul>
              <li>
                <strong>FHA, 3.5% down.</strong>{" "}The most-celebrated house
                hack vehicle. The catches: mortgage insurance for the life
                of the loan on most FHA loans (cancellable only by
                refinancing), stricter property-condition standards at
                appraisal, and — on 3&ndash;4 unit properties — the{" "}
                <em>self-sufficiency test</em>: projected rents must cover
                the entire payment. Many 3&ndash;4 unit FHA deals fail
                that test in higher-cost markets.
              </li>
              <li>
                <strong>Conventional owner-occupant, 5% down.</strong>{" "}No
                self-sufficiency test, and PMI is cancellable at 80% LTV.
                Sometimes the extra 1.5% of down payment salvages a deal
                FHA can&apos;t close.
              </li>
            </ul>
            <p>
              The calculator&apos;s default is 5% down at a conventional
              owner-occupant profile — edit the down payment to 3.5% to
              model the FHA route. Either way, run the mortgage line items
              through the{" "}
              <Link href="/tools/mortgage-payment-calculator" className="text-primary font-semibold hover:underline">mortgage payment calculator</Link>{" "}
              if you want the P&amp;I, tax, and insurance breakdown on its
              own.
            </p>

            <h2 className="text-2xl sm:text-3xl">
              Reading the result: the two numbers
            </h2>
            <h3>The headline: PITI minus rent</h3>
            <p>
              This is the &ldquo;live for $X/month&rdquo; number — what a
              perfect month looks like, with every unit occupied and
              nothing breaking. It&apos;s the right number for the
              rent-vs-hack comparison, and it&apos;s the number house-hack
              listings love to advertise.
            </p>
            <h3>The honest one: after reserves</h3>
            <p>
              Tenants move out. Water heaters fail. The after-reserves
              line sets aside vacancy, maintenance, and CapEx on the
              rented units — the same reserve categories TrueCap&apos;s
              house-hack starter template applies — so the number
              you underwrite with survives a normal year, not just a
              perfect one. No management fee is included because most
              house hackers self-manage; if you&apos;d rather not field
              the 11pm drip-faucet text from the unit next door, add one.
            </p>

            <h2 className="text-2xl sm:text-3xl">
              Common house-hacking mistakes
            </h2>
            <h3>1. Counting your own unit&apos;s &ldquo;rent&rdquo; as income</h3>
            <p>
              The gross rent on the listing includes the unit you&apos;re
              taking off the market. Underwrite only the units that will
              actually have tenants.
            </p>
            <h3>2. Judging the deal like a pure rental</h3>
            <p>
              Year-1 house hacks rarely cash flow, and that&apos;s not
              failure — the benchmark is your housing cost vs. renting.
              The cash-flow test belongs to year 2, when you move out.
            </p>
            <h3>3. Skipping reserves because &ldquo;I&apos;ll be right there&rdquo;</h3>
            <p>
              Proximity doesn&apos;t prevent vacancies or roof leaks. It
              just means you hear about them sooner.
            </p>
            <h3>4. Ignoring the year-2 transition</h3>
            <p>
              The exit plan matters as much as the entry: after the
              one-year occupancy requirement, most house hackers rent
              their unit at market and either stay put or repeat with the
              next property. Whether the building works as a{" "}
              <em>pure rental</em>{" "}at that point — cash flow, cap rate,
              DSCR — is what separates a stepping-stone from a trap. Check
              the rented-building math with the{" "}
              <Link href="/tools/cap-rate-calculator" className="text-primary font-semibold hover:underline">cap rate calculator</Link>{" "}
              and the{" "}
              <Link href="/tools/dscr-calculator" className="text-primary font-semibold hover:underline">DSCR calculator</Link>.
            </p>

            <h2 className="text-2xl sm:text-3xl">
              When you need more than a quick screen
            </h2>
            <p>
              This calculator answers the first question — &ldquo;what
              would I actually pay to live here?&rdquo; — in seconds. The
              full underwrite needs per-unit rents modeled independently,
              the year-2 move-out scenario, actual property tax and
              insurance for the address, and the tax treatment of the
              rented portion. TrueCap&apos;s analyzer handles all of that
              with a House Hack mode that applies owner-occupant defaults
              automatically; if you&apos;re weighing tools, see how it{" "}
              <Link href="/vs/biggerpockets-for-house-hacking" className="text-primary font-semibold hover:underline">compares to BiggerPockets for house hacking</Link>{" "}
              or read{" "}
              <Link href="/blog/best-rental-analysis-tool-for-house-hackers" className="text-primary font-semibold hover:underline">the best rental analysis tools for house hackers</Link>.
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
              Run the full house-hack underwrite — free
            </h2>
            <p className="text-sm sm:text-base opacity-90 mb-4">
              This page answers &ldquo;what would I pay to live
              there?&rdquo; TrueCap&apos;s House Hack mode answers the rest:
              per-unit rents, real cash flow, DSCR, the year-2 move-out
              scenario, and a plain-English verdict.
            </p>
            <ul className="text-sm space-y-1.5 mb-5 opacity-90">
              {[
                "Owner-occupant mode — your unit excluded from income automatically",
                "Per-unit rents for the duplex / triplex / fourplex math",
                "Cash flow, cap rate, CoC, DSCR — auto-calculated",
                "10-year projection for the year-2 transition (Pro)",
                "Tax treatment of the rented portion (Pro)",
                "Free to start — no credit card",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/?strategy=house-hack"
              className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              Open the analyzer in House Hack mode
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </section>

          {/* Footer */}
          <ToolsConversionCta calculatorName="House hacking calculator" hook="TrueCap's full analyzer has a House Hack mode: per-unit rents, owner-occupant math, year-2 move-out modeling, and a verdict — all from the same inputs you used here." />

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
