/**
 * Public SEO landing page for the 50% rule calculator.
 *
 * Same strategy as /tools/cap-rate-calculator (the canonical tool-page
 * pattern): working calculator above the fold, long-form content below.
 *
 * Content stays consistent with the 50-percent-rule-rentals blog post
 * (the canonical honest take): the rule is a triage tool calibrated for
 * a specific archetype — pre-2010 Midwest workforce SFR — and it lies
 * in Texas (property tax), Florida (insurance), pre-1940 housing stock
 * (CapEx), STRs, and high-HOA condos. Separate URL from the 1% and 2%
 * rule pages because each rule is its own SERP.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { getSiteUrl } from "@/lib/site-url";
import { FiftyPercentRuleWidget } from "@/components/tools/fifty-percent-rule-widget";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";
import { ToolEmbedInvite } from "@/components/marketing/tool-embed-invite";

import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";
export const metadata: Metadata = {
  title: "50% Rule Calculator | Free Rental Expense Triage",
  description:
    "Free 50% rule calculator. Estimate rental operating expenses, NOI, and cash flow in 3 seconds — plus where the rule is accurate and the five markets where it lies.",
  keywords: [
    "50 percent rule calculator",
    "50% rule real estate",
    "50 rule rental property",
    "rental property expense ratio",
    "rental operating expenses estimate",
    "quick rental cash flow estimate",
  ],
  alternates: { canonical: "/tools/50-percent-rule-calculator" },
  openGraph: {
    title: "50% Rule Calculator — 3-Second Rental Expense Triage",
    description:
      "Operating expenses ≈ half of gross rent. Run the triage live, with an adjustable expense ratio for the markets where 50% is wrong.",
    url: "/tools/50-percent-rule-calculator",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap 50% rule calculator" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/home.jpg"],
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is the 50% rule in real estate?",
    a: "A rule of thumb that says a rental property's operating expenses — everything except the mortgage payment — typically run about 50% of gross rent over time. So estimated NOI ≈ rent × 50%, and estimated cash flow is what's left after your principal-and-interest payment. It's a 3-second triage tool for deciding whether a listing deserves a real underwrite.",
  },
  {
    q: "What counts as operating expenses in the 50% rule?",
    a: "The rule's bundle lumps together property tax, insurance, vacancy, maintenance, CapEx reserves, property management, and miscellaneous costs — everything except debt service (your mortgage payment). That's why you subtract only principal and interest after applying the rule, not tax and insurance again.",
  },
  {
    q: "Is the 50% rule accurate?",
    a: "For a specific archetype, yes: stabilized single-family rentals in moderate-tax, moderate-insurance markets — classic Midwest workforce housing. Across a portfolio of that profile, expenses genuinely converge near half of gross rent over multi-year averages. Outside that profile, the rule can miss badly in either direction.",
  },
  {
    q: "Where does the 50% rule fail?",
    a: "Five common failure modes: high property-tax states (Texas new-construction suburbs can run 2.5-3.2% effective tax — expenses land at 60-65% of rent), high-insurance markets (post-2022 Florida), pre-1940 housing stock (real-world CapEx runs 10-15% of rent, not 5-8%), short-term rentals (operating costs hit 60-75% of revenue), and high-HOA condos (a $400/month HOA is already 22% of a $1,800 rent). In those cases raise the expense ratio to 55-65% — or skip the guess and use real numbers.",
  },
  {
    q: "Is the 50% rule's NOI the same as a formal NOI?",
    a: "Not exactly. The rule's expense bundle includes the CapEx reserve; the formal NOI convention used by lenders (and by TrueCap's full analyzer) excludes CapEx as a below-the-line reserve. For a 3-second screen the difference doesn't matter; for a real underwrite it does — which is one more reason the rule is a filter, not a verdict.",
  },
  {
    q: "What's the difference between the 50% rule and the 1% rule?",
    a: "They screen different things. The 1% rule checks whether the rent is big enough relative to the price (income screen). The 50% rule checks whether the rent survives expenses and the mortgage (expense screen). They stack well: a property that passes the 1% rule and still shows positive cash flow under the 50% rule is a strong candidate for a full underwrite.",
  },
];

export default function FiftyPercentRuleCalculatorPage() {
  const siteUrl = getSiteUrl();

  const webAppLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "TrueCap 50% Rule Calculator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    dateModified: "2026-07-14",
    url: `${siteUrl}/tools/50-percent-rule-calculator`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "Free online 50% rule calculator: estimated operating expenses, NOI, and cash flow from gross rent, with an adjustable expense ratio.",
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
    name: "50% Rule Calculator",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Real Estate Calculator",
    operatingSystem: "Web",
    description:
      "Free 50% rule calculator. Estimate rental operating expenses, NOI, and cash flow in 3 seconds — with an adjustable expense ratio for the markets where 50% is wrong.",
    url: `${siteUrl}/tools/50-percent-rule-calculator`,
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
      "Estimated expenses + NOI + cash flow from gross rent",
      "Adjustable expense ratio (50-65%) for hard markets",
      "Instant positive / negative triage",
      "Free, no signup",
    ],
  };

  return (
    <>
      <ToolBreadcrumbSchema toolPath="/tools/50-percent-rule-calculator" toolName="50% rule calculator" />
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
              50% Rule Calculator
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-2 leading-relaxed">
              The 3-second expense triage: operating expenses run about
              half of gross rent, and cash flow is what survives the
              mortgage payment. Type in rent and your P&amp;I — the
              estimate computes live.
            </p>
          </header>

          {/* Calculator — above the fold */}
          <FiftyPercentRuleWidget />

          {/* Long-form content */}
          <article className="prose prose-slate max-w-none mt-10 sm:mt-12 [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground">
            <h2 className="text-2xl sm:text-3xl">What is the 50% rule?</h2>
            <p>
              The 50% rule is shorthand for estimating a rental
              property&apos;s operating expenses without itemizing a single
              one. The claim: over time, everything except the mortgage —
              property tax, insurance, vacancy, maintenance, CapEx
              reserves, management — averages out to roughly{" "}
              <strong>half of gross rent</strong>. That gives you a
              three-line triage:
            </p>
            <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
              <div className="text-base sm:text-lg font-mono">
                <span className="font-bold">Estimated NOI</span> = Gross rent × 50%
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Estimated cash flow = NOI − mortgage payment (P&amp;I)
              </div>
            </div>
            <p>
              On a $1,900/month rental with a $1,150 P&amp;I payment:
              expenses ≈ $950, NOI ≈ $950, cash flow ≈ −$200/month. Three
              seconds, no spreadsheet — and in this example, a useful
              early warning. For the full honest take on the rule, see{" "}
              <Link href="/blog/50-percent-rule-rentals" className="text-primary font-semibold hover:underline">is the 50% rule still useful in 2026?</Link>
            </p>

            <h2 className="text-2xl sm:text-3xl">Where the rule is genuinely accurate</h2>
            <p>
              The 50% rule was calibrated on a specific archetype:
              stabilized single-family rentals in moderate-tax,
              moderate-insurance markets — classic Midwest workforce
              housing with conventional financing and long-term tenants.
              For that profile, it&apos;s surprisingly good: across a
              portfolio and multi-year averages, vacancy + maintenance +
              CapEx + management + tax + insurance really does converge
              near half of gross rent. If that&apos;s your market, trust
              the rule for triage.
            </p>

            <h2 className="text-2xl sm:text-3xl">The five places the 50% rule lies</h2>
            <h3>1. High property-tax states</h3>
            <p>
              Texas effective property tax can hit 2.5&ndash;3.2% in
              new-construction MUD suburbs. On a $300k property renting
              for $2,400/month, tax alone is $7,500&ndash;9,600/year —
              already 25&ndash;33% of gross rent before a single repair.
              Real expense ratios land at 60&ndash;65%, and deals that
              look great at 50% actually break even.
            </p>
            <h3>2. High-insurance markets</h3>
            <p>
              Post-2022 Florida insurance runs $2,500&ndash;4,500/year
              inland and $6&ndash;12k+ coastal. The rule was calibrated
              for $1&ndash;2k annual premiums; Florida routinely triples
              that share of rent.
            </p>
            <h3>3. Pre-1940 housing stock</h3>
            <p>
              The rule assumes a ~5&ndash;8% CapEx reserve. Century-old
              housing in Cleveland, Philadelphia, or Detroit routinely
              consumes 10&ndash;15% in real-world CapEx — roofs,
              electrical service, plumbing, foundations. Underwrite older
              buildings at a 55&ndash;60% expense ratio.
            </p>
            <h3>4. Short-term rentals</h3>
            <p>
              STRs run 60&ndash;75% of gross revenue in operating costs
              (per-turnover cleaning, higher insurance, 15&ndash;25%
              management, turnover maintenance). The 50% rule simply
              doesn&apos;t apply — use STR-specific underwriting.
            </p>
            <h3>5. High-HOA condos</h3>
            <p>
              A $400/month HOA on a $1,800/month rental is 22% of gross
              rent before anything else. Add the normal expense stack and
              you&apos;re well past half. The widget&apos;s adjustable
              expense ratio exists for exactly these cases — but past
              60%, stop adjusting the guess and get the real numbers.
            </p>

            <h2 className="text-2xl sm:text-3xl">
              How the 50% rule fits with the other screens
            </h2>
            <p>
              Rules of thumb stack. The{" "}
              <Link href="/tools/1-percent-rule-calculator" className="text-primary font-semibold hover:underline">1% rule</Link>{" "}
              checks the income side — is the rent big enough relative to
              the price? The 50% rule checks the expense side — does the
              rent survive operating costs and the mortgage? A listing
              that clears both in under a minute has earned the full
              underwrite; the stricter{" "}
              <Link href="/tools/2-percent-rule-calculator" className="text-primary font-semibold hover:underline">2% rule</Link>{" "}
              is the cash-flow-market variant of the income screen. From
              there, replace the guesses with line items: the{" "}
              <Link href="/tools/rental-cash-flow-calculator" className="text-primary font-semibold hover:underline">rental cash flow calculator</Link>{" "}
              itemizes every expense the 50% bundle compresses, and the{" "}
              <Link href="/tools/noi-calculator" className="text-primary font-semibold hover:underline">NOI calculator</Link>{" "}
              walks the formal NOI (which, unlike the rule&apos;s bundle,
              excludes the CapEx reserve — the convention lenders use).
            </p>

            <h2 className="text-2xl sm:text-3xl">Use it to filter, never to commit</h2>
            <p>
              The 50% rule&apos;s job is to filter out the bottom 80% of
              listings so your full underwrites go to the top 20%. It is
              not a decision tool: it can&apos;t see this property&apos;s
              actual tax bill, this market&apos;s insurance reality, or
              this building&apos;s CapEx backlog. When a deal clears the
              triage, run the address through TrueCap — the analyzer
              auto-fills state property tax, a HUD rent benchmark, and the
              current mortgage rate, then computes cash flow, cap rate,
              CoC, and DSCR from real expense lines. Five seconds for the
              rule, about two minutes for the real number.
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
              Replace the guess with real numbers — free
            </h2>
            <p className="text-sm sm:text-base opacity-90 mb-4">
              The 50% rule compresses eight expense lines into one guess.
              TrueCap expands them back out — actual state property tax,
              HUD rent benchmark, current rate — and gives the deal a
              selected-rule fit and a secondary Screening Index.
            </p>
            <ul className="text-sm space-y-1.5 mb-5 opacity-90">
              {[
                "Every expense line itemized — tax, insurance, vacancy, CapEx, management",
                "Cash flow, cap rate, CoC, DSCR — auto-calculated",
                "State property tax + HUD rent auto-filled from the address",
                "10-year projection with rent + expense growth (Pro)",
                "Selected-rule fit with a secondary Screening Index",
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
          <ToolEmbedInvite slug="50-percent-rule-calculator" />

          <ToolsConversionCta calculatorName="50% rule calculator" hook="The 50% rule is a 3-second triage. TrueCap's full analyzer replaces the guess with real expense lines — tax, insurance, vacancy, CapEx — and a verdict. It's free." />

          <footer className="mt-12 pt-8 border-t border-border text-center text-xs text-muted-foreground">
            Built with{" "}
            <Link href="/" className="font-bold text-foreground hover:underline">
              TrueCap
            </Link>{" "}
            — transparent, editable rental analysis, free to start.
          </footer>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
