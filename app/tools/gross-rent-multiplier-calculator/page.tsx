/**
 * Public SEO landing page for the GRM (Gross Rent Multiplier)
 * calculator. GRM is the fastest screening metric in commercial /
 * residential real estate — single ratio, no opex needed.
 *
 * Ranks for: "grm calculator", "gross rent multiplier", "gross rent
 * multiplier calculator", "what is a good grm", "grm vs cap rate".
 */

import type { Metadata } from "next";
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { getSiteUrl } from "@/lib/site-url";
import { GrmCalculatorWidget } from "@/components/tools/grm-calculator-widget";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";
import { ToolEmbedInvite } from "@/components/marketing/tool-embed-invite";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";
import { RelatedContent } from "@/components/marketing/related-content";
import { Header } from "@/components/investcalc/header";
import { JsonLd } from "@/components/seo/json-ld";
import { buildToolAppLd } from "@/lib/seo/tool-app-ld";
import { OPEN_GRAPH_BASE } from "@/lib/seo/open-graph-base";

export const metadata: Metadata = {
  title: "Free GRM Calculator — Gross Rent Multiplier Screen",
  description:
    "Free Gross Rent Multiplier (GRM) calculator. The fastest real-estate screen — compare deals in seconds, no operating expenses needed. And a good GRM range.",
  keywords: [
    "grm calculator",
    "gross rent multiplier",
    "gross rent multiplier calculator",
    "what is a good grm",
    "grm formula",
    "grm vs cap rate",
    "rental property screening",
  ],
  alternates: { canonical: "/tools/gross-rent-multiplier-calculator" },
  openGraph: {
    ...OPEN_GRAPH_BASE,
    title: "Free GRM Calculator — Gross Rent Multiplier Screen",
    description:
      "Compare rental deals in seconds with Gross Rent Multiplier — the fastest screening ratio in real estate.",
    url: "/tools/gross-rent-multiplier-calculator",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function GrmCalculatorPage() {
  const siteUrl = getSiteUrl();

  const appLd = buildToolAppLd(siteUrl, {
    slug: "gross-rent-multiplier-calculator",
    name: "Gross Rent Multiplier Calculator",
    description:
      "Free Gross Rent Multiplier (GRM) calculator. The fastest real-estate screen — compare deals in seconds, no operating expenses needed. And a good GRM range.",
    featureList: [
      "GRM from price ÷ annual gross rent",
      "Result graded against fixed rule-of-thumb GRM bands",
      "Fast deal screening without operating expenses",
    ],
  });

  return (
    <>
      <Header initialUser={null} initialEntitlements={null} />
      <ToolBreadcrumbSchema
        toolPath="/tools/gross-rent-multiplier-calculator"
        toolName="GRM calculator"
      />
      <JsonLd data={appLd} />

      <div className="min-h-screen bg-background">
        <main
          id="main"
          className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12"
        >
          <header className="mb-6 sm:mb-8">
            <IntentPrefetchLink
              href="/tools"
              className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground"
            >
              ← Free tools
            </IntentPrefetchLink>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 leading-tight">
              GRM Calculator
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-2 leading-relaxed">
              Gross Rent Multiplier — the 10-second screening ratio every real
              estate investor uses to triage deals before bothering with
              operating expenses.
            </p>
          </header>

          <GrmCalculatorWidget />

          <article className="prose prose-slate max-w-none [&>p]:max-w-[68ch] [&>ul]:max-w-[68ch] [&>ol]:max-w-[68ch] [&>blockquote]:max-w-[68ch] [&>h2]:max-w-[68ch] [&>h3]:max-w-[68ch] mt-10 sm:mt-12 [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground">
            <h2 className="text-2xl sm:text-3xl">
              Why every investor knows GRM
            </h2>
            <p>
              You&apos;re scrolling Zillow at 11 PM. You see 40 listings in your
              target zip code. You don&apos;t have property tax, insurance, or
              maintenance numbers for any of them. What you do have is price and
              asking rent. GRM is the ratio that lets you sort that list of 40
              into the 8 worth actually underwriting, in about 90 seconds.
              That&apos;s why it&apos;s the first metric every experienced
              investor reaches for — read{" "}
              <IntentPrefetchLink
                href="/blog/gross-rent-multiplier-explained"
                className="font-semibold text-primary hover:underline"
              >
                gross rent multiplier explained
              </IntentPrefetchLink>{" "}
              for the full primer, and pair it with the{" "}
              <IntentPrefetchLink
                href="/tools/1-percent-rule-calculator"
                className="font-semibold text-primary hover:underline"
              >
                1% rule calculator
              </IntentPrefetchLink>{" "}
              as a second fast screen.
            </p>

            <h3>The formula</h3>
            <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
              <div className="text-base sm:text-lg font-mono">
                <span className="font-bold">GRM</span> = Property Price ÷ Annual
                Gross Rent
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                where Annual Gross Rent = Monthly Rent × 12
              </div>
            </div>
            <p>
              Example: a $295,000 duplex renting for $2,950/month gross has a
              GRM of 295,000 ÷ (2,950 × 12) = 295,000 ÷ 35,400 ≈
              <strong> 8.3</strong>. That&apos;s a healthy GRM — typical
              cash-flow market territory.
            </p>

            <h2 className="text-2xl sm:text-3xl">GRM benchmarks by market</h2>
            <ul>
              <li>
                <strong>Under 6</strong> — Very strong / distressed. Verify
                everything (deferred maintenance, vacancy, title issues,
                neighborhood trajectory).
              </li>
              <li>
                <strong>6–10</strong> — Healthy cash-flow markets. Midwest, Sun
                Belt secondary markets, older multifamily.
              </li>
              <li>
                <strong>10–14</strong> — Balanced. Mix of cash flow and
                appreciation. Most U.S. markets land here.
              </li>
              <li>
                <strong>14–20</strong> — Appreciation market. Returns come from
                price growth, not cash flow. Coastal and Tier-1 metros.
              </li>
              <li>
                <strong>20+</strong> — Expensive / luxury. Minimal yield; the
                bet is almost entirely on appreciation and tax benefits.
              </li>
            </ul>

            <h2 className="text-2xl sm:text-3xl">GRM vs Cap Rate</h2>
            <p>
              Both metrics measure the same thing — how much income a property
              produces relative to its price — but they target different stages
              of the workflow. GRM uses gross rent and is purely a screening
              tool. Cap rate uses NOI (gross rent minus opex) and is closer to
              what an institutional buyer actually pays for. The two are
              mathematically linked:
            </p>
            <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
              <div className="text-sm sm:text-base font-mono">
                Cap rate ≈ (1 − Opex ratio) ÷ GRM
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                e.g. GRM 10 with 40% opex ratio ≈ 6% cap rate
              </div>
            </div>
            <p>
              Use GRM when you&apos;re shopping. Use cap rate when you&apos;re
              writing the offer. Use both together as a sanity check — a
              property with a great GRM but a terrible cap rate is hiding
              expensive operating problems (institutional water, unusually high
              tax, deferred capex).
            </p>

            <h2 className="text-2xl sm:text-3xl">Limitations of GRM</h2>
            <h3>1. It ignores operating expenses</h3>
            <p>
              Two properties with identical GRM can have wildly different real
              returns if one has $400/month in HOA fees and the other
              doesn&apos;t. GRM treats every property as if opex is identical —
              it isn&apos;t.
            </p>
            <h3>2. It ignores financing</h3>
            <p>
              GRM is an all-cash metric. It doesn&apos;t care about interest
              rates, down payment, or loan terms. Two investors looking at the
              same GRM-8 property will get totally different cash-on-cash
              returns depending on their leverage.
            </p>
            <h3>3. It ignores vacancy</h3>
            <p>
              GRM uses asking rent, not effective rent. A property with a great
              GRM in a transient neighborhood with 25% vacancy is not the deal
              it looks like. Always sanity-check market vacancy before trusting
              GRM.
            </p>
            <h3>4. It ignores condition</h3>
            <p>
              A turnkey property and a rehab project with the same price and
              same projected rent have the same GRM — but the rehab needs $40k
              of work before you collect a dollar. Pair GRM with a condition
              assessment.
            </p>
          </article>

          {/* Backlink engine — quiet, collapsed, renders nothing if this

              tool has no embeddable widget. See the component header. */}

          <ToolEmbedInvite slug="gross-rent-multiplier-calculator" />

          <ToolsConversionCta
            calculatorName="GRM calculator"
            hook="GRM is a screening tool. TrueCap's free core analyzer adds editable cap rate, cash-on-cash, model DSCR, and cash flow. Projections, sensitivity, and Offer Ceiling appear only when your evaluation or plan access includes them."
          />

          <RelatedContent kind="tool" slug="gross-rent-multiplier-calculator" title="Gross Rent Multiplier (GRM) Calculator" className="mt-10" />

        </main>
        <SiteFooter />
      </div>
    </>
  );
}
