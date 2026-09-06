/**
 * Public SEO landing page for the 2% rule calculator.
 *
 * Same strategy as /tools/cap-rate-calculator (the canonical tool-page
 * pattern): working calculator above the fold, long-form content below.
 *
 * Separate URL from /tools/1-percent-rule-calculator because "2 percent
 * rule calculator" is its own SERP (same reasoning as splitting the 70%
 * rule out of the ARV calculator). Stance stays consistent with the
 * 1%-rule page's existing 2%-rule FAQ and the 1-percent-rule blog post:
 * very few US properties hit 2% in 2026, and a pass is a reason to
 * verify harder, not celebrate.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { getSiteUrl } from "@/lib/site-url";
import { TwoPercentRuleWidget } from "@/components/tools/two-percent-rule-widget";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";
import { ToolEmbedInvite } from "@/components/marketing/tool-embed-invite";

import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";
import { RelatedContent } from "@/components/marketing/related-content";
export const metadata: Metadata = {
  title: "2% Rule Calculator | Free Cash-Flow Screener",
  description:
    "Free 2% rule calculator. Check any rental's rent-to-price ratio against the 2% and 1% bars — plus why a 2% deal in 2026 deserves scrutiny, not celebration.",
  keywords: [
    "2 percent rule calculator",
    "2% rule real estate",
    "two percent rule rental property",
    "rent to price ratio calculator",
    "2 percent rule vs 1 percent rule",
    "cash flow market screening",
  ],
  alternates: { canonical: "/tools/2-percent-rule-calculator" },
  openGraph: {
    title: "2% Rule Calculator — The Strict Cash-Flow Screen",
    description:
      "Rent ÷ price against the 2% bar, live. Plus the honest take: where 2% deals still exist, and why most of them carry the risk that explains the price.",
    url: "/tools/2-percent-rule-calculator",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap 2% rule calculator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/home.jpg"],
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is the 2% rule in real estate?",
    a: "A screening rule that says monthly rent should equal at least 2% of the purchase price — a $100,000 property should rent for at least $2,000/month. It's the strict version of the 1% rule, historically used by investors targeting maximum-cash-flow markets. Like the 1% rule, it's a filter, not an analysis: no expenses, no financing, just rent over price.",
  },
  {
    q: "Do 2% rule properties still exist in 2026?",
    a: "Very few. Realistically, most US properties that hit 2% in 2026 are in distressed neighborhoods where management headaches — turnover, collections, vacancy, repairs — eat the cash flow the ratio promises. Pass any 2% deal through a deeper underwrite before celebrating. The ratio is telling you something about the neighborhood as much as about the deal.",
  },
  {
    q: "What's the difference between the 1% rule and the 2% rule?",
    a: "Same ratio, different bar. The 1% rule is the mainstream screen — a property at 1%+ is worth a full underwrite in most cash-flow markets. The 2% rule was the bar in an era of cheap Midwest housing, and today it mostly flags C/D-class properties. Practical reading in 2026: 1.0-1.5% is strong screening territory; at 2%+, ask what the ratio is telling you about risk.",
  },
  {
    q: "Why is a high rent-to-price ratio a warning sign?",
    a: "Because price reflects what buyers will pay, and rent reflects what tenants will pay. When rent is extremely high relative to price, buyers are discounting the asset — usually for reasons that show up later as expenses: deferred maintenance, difficult tenancy profiles, declining demand, or insurance and tax quirks. The same logic applies to unusually high cap rates.",
  },
  {
    q: "Does the 2% rule account for expenses or financing?",
    a: "No. It's gross rent over price — no property tax, insurance, vacancy, maintenance, or mortgage payment. Two properties at 2% can have wildly different real returns once expenses land. That's why the ratio screens and the underwrite decides: pair it with the 50% rule for a fast expense check, then run the real numbers.",
  },
  {
    q: "Should I skip every property that fails the 2% rule?",
    a: "No — in 2026 that would mean skipping nearly everything, including excellent deals. The 2% rule is a market-type indicator more than a deal filter. Use the 1% rule as the practical screen, treat 1.5%+ as exceptional, and investigate anything at 2%+ rather than assuming it's a win.",
  },
];

export default function TwoPercentRuleCalculatorPage() {
  const siteUrl = getSiteUrl();

  const webAppLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "TrueCap 2% Rule Calculator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    dateModified: "2026-07-14",
    url: `${siteUrl}/tools/2-percent-rule-calculator`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "Free online 2% rule calculator: rent-to-price ratio against the 2% and 1% screening bars, with honest context for 2026 markets.",
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
    name: "2% Rule Calculator",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Real Estate Calculator",
    operatingSystem: "Web",
    description:
      "Free 2% rule calculator. Check any rental's rent-to-price ratio against the 2% and 1% bars in seconds.",
    url: `${siteUrl}/tools/2-percent-rule-calculator`,
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
      "Rent-to-price ratio computed live",
      "Judged against both the 2% and 1% bars",
      "Honest caution on what 2%+ ratios signal",
      "Free, no signup",
    ],
  };

  return (
    <>
      <ToolBreadcrumbSchema
        toolPath="/tools/2-percent-rule-calculator"
        toolName="2% rule calculator"
      />
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
        <main
          id="main"
          className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12"
        >
          {/* H1 */}
          <header className="mb-6 sm:mb-8">
            <Link
              href="/tools"
              className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
            >
              ← TrueCap free tools
            </Link>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 leading-tight">
              2% Rule Calculator
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-2 leading-relaxed">
              The strict cash-flow screen: does monthly rent hit 2% of the
              purchase price? Type in price and rent — the ratio computes live,
              judged against both the 2% and 1% bars.
            </p>
          </header>

          {/* Calculator — above the fold */}
          <TwoPercentRuleWidget />

          {/* Long-form content */}
          <article className="prose prose-slate max-w-none mt-10 sm:mt-12 [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground">
            <h2 className="text-2xl sm:text-3xl">What is the 2% rule?</h2>
            <p>
              The 2% rule is the strict sibling of the better-known 1% rule. It
              says a rental property should generate monthly rent equal to at
              least 2% of its purchase price:
            </p>
            <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
              <div className="text-base sm:text-lg font-mono font-bold">
                Monthly rent ≥ 2% of purchase price
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                $120,000 price × 2% = $2,400/month rent required to meet it
              </div>
            </div>
            <p>
              Like the 1% rule, it&apos;s pure triage — gross rent over price,
              no expenses, no financing. Unlike the 1% rule, the bar is high
              enough in 2026 that the properties clearing it deserve suspicion
              before celebration.
            </p>

            <h2 className="text-2xl sm:text-3xl">
              Where the 2% rule came from — and what changed
            </h2>
            <p>
              The 2% rule dates from an era when workforce housing in Midwest
              cash-flow markets sold cheaply enough that $50&ndash;60k houses
              rented for $1,000&ndash;1,200/month. At those numbers the ratio
              was achievable in decent neighborhoods. A decade-plus of price
              appreciation without proportional rent growth moved the mainstream
              screening bar down to 1% — which is why the{" "}
              <Link
                href="/tools/1-percent-rule-calculator"
                className="text-primary font-semibold hover:underline"
              >
                1% rule calculator
              </Link>{" "}
              is the practical first filter today, and the{" "}
              <Link
                href="/blog/1-percent-rule-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                1% rule guide
              </Link>{" "}
              covers how to read it by market type.
            </p>
            <p>
              Realistically, very few US properties hit 2% in 2026. Most that do
              sit in distressed neighborhoods where the management reality —
              turnover, collections, vacancy, repair burden — consumes the cash
              flow the ratio promises. The ratio is telling you about the
              neighborhood as much as the deal.
            </p>

            <h2 className="text-2xl sm:text-3xl">
              How to read the ratio in 2026
            </h2>
            <ul>
              <li>
                <strong>Below 1%</strong> — either an appreciation-market
                property (where the rule isn&apos;t the point) or an overpriced
                rental. Decide which before moving on.
              </li>
              <li>
                <strong>1.0&ndash;1.5%</strong> — strong screening territory in
                cash-flow markets. Worth the full underwrite.
              </li>
              <li>
                <strong>1.5&ndash;2%</strong> — exceptional on paper. Check the
                rent comp first: above-market rent on the listing is the most
                common way a mediocre deal fakes this band.
              </li>
              <li>
                <strong>2%+</strong> — investigate the discount. What do buyers
                know that the listing doesn&apos;t say? Deferred maintenance,
                insurance problems, tax quirks, and declining demand all live
                here.
              </li>
            </ul>
            <p>
              The same logic applies to unusually high cap rates — a theme our
              guide to{" "}
              <Link
                href="/blog/what-is-a-good-cap-rate"
                className="text-primary font-semibold hover:underline"
              >
                what counts as a good cap rate
              </Link>{" "}
              covers: high yield prices in high risk. No rent-to-price band is a
              verdict; the bands are prompts for the next question.
            </p>

            <h2 className="text-2xl sm:text-3xl">
              What the 2% rule can&apos;t see
            </h2>
            <h3>Expenses</h3>
            <p>
              Gross rent over price says nothing about property tax, insurance,
              vacancy, maintenance, or management — the exact costs that are
              usually elevated in the neighborhoods where 2% ratios appear.
              Stack the{" "}
              <Link
                href="/blog/50-percent-rule-rentals"
                className="text-primary font-semibold hover:underline"
              >
                50% rule
              </Link>{" "}
              on top for a 3-second expense check: if half the rent disappears
              into operating costs, does the deal still clear your mortgage
              payment?
            </p>
            <h3>Rent durability</h3>
            <p>
              A ratio computed on the current tenant&apos;s above-market rent,
              or on an optimistic pro-forma, isn&apos;t a 2% deal — it&apos;s a
              1.4% deal wearing makeup. Verify what similar units actually lease
              for before trusting the numerator.
            </p>
            <h3>The building itself</h3>
            <p>
              Cheap buildings are cheap for reasons that arrive as CapEx: roofs,
              electrical service, plumbing stacks. A 2% ratio on a building with
              a five-figure repair backlog is a financing plan for the backlog,
              not a return.
            </p>

            <h2 className="text-2xl sm:text-3xl">From screen to underwrite</h2>
            <p>
              Rules of thumb earn a deal a closer look; they never close the
              loop. When a property clears whatever bar your market supports,
              run the real numbers: actual tax bill, real insurance quote,
              verified rent comps, and the full return stack — cash flow,{" "}
              <Link
                href="/glossary/cap-rate"
                className="text-primary font-semibold hover:underline"
              >
                cap rate
              </Link>
              , cash-on-cash, DSCR. TrueCap does that from a typed address in
              about two minutes, starting from an editable HUD rent benchmark
              while keeping property tax as a manual local input, so the
              screen&apos;s guesses get replaced, not repeated.
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
              Verify the deal behind the ratio — free
            </h2>
            <p className="text-sm sm:text-base opacity-90 mb-4">
              A 2% ratio is a prompt to investigate, and investigation means
              real numbers. TrueCap runs the full underwrite — expenses
              itemized, financing modeled, verdict in plain English — from the
              same price and rent you typed here.
            </p>
            <ul className="text-sm space-y-1.5 mb-5 opacity-90">
              {[
                "Cash flow, cap rate, CoC, DSCR — auto-calculated",
                "Editable HUD rent + FRED rate benchmarks; manual local property tax",
                "Stress-test rent and vacancy assumptions",
                "10-year projection with rent + expense growth (Pro)",
                "Buy Box fit with a Deal score",
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
          <ToolEmbedInvite slug="2-percent-rule-calculator" />

          <ToolsConversionCta
            calculatorName="2% rule calculator"
            hook="A 2% ratio is a reason to look harder, not a decision. TrueCap's full analyzer adds expenses, financing, Buy Box fit, and a Deal score. You still verify the assumptions and make the decision."
          />

          <RelatedContent kind="tool" slug="2-percent-rule-calculator" title="2% Rule Calculator" className="mt-10" />

          <footer className="mt-12 pt-8 border-t border-border text-center text-xs text-muted-foreground">
            Built with{" "}
            <Link
              href="/"
              className="font-bold text-foreground hover:underline"
            >
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
