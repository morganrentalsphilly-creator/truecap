/**
 * Public SEO landing page for the 70% rule calculator.
 *
 * Same strategy as /tools/cap-rate-calculator (the canonical tool-page
 * pattern): working calculator above the fold, long-form content below.
 *
 * Deliberate scope split with /tools/arv-calculator: that page builds
 * ARV from sold comps (the input), THIS page is about the RULE itself —
 * when 70% works, when it lies, and how the multiplier should move
 * (the situation table mirrors the 70-percent-rule blog post). The
 * max-offer math is shared via components/tools/max-offer-math.ts so
 * the two pages can never disagree. Cross-linked both ways with the
 * ARV calculator and the blog post.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { getSiteUrl } from "@/lib/site-url";
import { SeventyPercentRuleWidget } from "@/components/tools/seventy-percent-rule-widget";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";
import { ToolEmbedInvite } from "@/components/marketing/tool-embed-invite";

import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";
export const metadata: Metadata = {
  title: "70% Rule Calculator | 70%-rule price screen",
  description:
    "Free 70% rule calculator. 70%-rule price screen = 70% of ARV minus repairs — computed live, with guidance on when the rule works and when it can mislead.",
  keywords: [
    "70 percent rule calculator",
    "70% rule calculator",
    "70 rule real estate",
    "70%-rule price screen calculator",
    "ARV minus repairs",
  ],
  alternates: { canonical: "/tools/70-percent-rule-calculator" },
  openGraph: {
    title: "70% Rule Calculator — Early Price Screen",
    description:
      "70%-rule price screen = 70% of ARV minus repairs. Compute the boundary at 60/65/70/75% and learn when 70% is the wrong screen.",
    url: "/tools/70-percent-rule-calculator",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap 70% rule calculator" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/home.jpg"],
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is the 70% rule in real estate?",
    a: "It's a rule of thumb that calculates a screening boundary at 70% of a property's projected after-repair value (ARV) minus repairs. On a property modeled at $300,000 renovated with $45,000 of work, the 70%-rule price screen is (0.70 × $300,000) − $45,000 = $165,000. The 30% held back is not all profit; buying, holding, and selling costs come first.",
  },
  {
    q: "Is the 70%-rule price screen the same as TrueCap's Offer Ceiling?",
    a: "No — they are different calculations and should not be compared. The 70%-rule price screen on this page is a rule of thumb: entered ARV × your selected multiplier, minus entered repairs. TrueCap's Offer Ceiling is a separate result from the full underwriting model: the highest price that still meets your targets, under your financing and operating assumptions. This page does not compute an Offer Ceiling.",
  },
  {
    q: "Where does the ARV number come from?",
    a: "Comparable sales of renovated homes near the subject — ideally sold within the last 3–6 months, within about half a mile, matching on beds, baths, and square footage. The common method takes the price per finished square foot of those comps times the subject's square footage. ARV is set by the market, not by how much you spend on the rehab. Our ARV calculator builds the number from your comps.",
  },
  {
    q: "Does the 70% rule work for BRRRR?",
    a: "It can be an initial screen, not a refinance rule. Cash-out LTV, eligible value, seasoning, appraisal treatment, costs, and approval vary by lender, program, borrower, and property. A 75% case is only a planning scenario and does not promise that most or all cash returns; verify the completed rental's income, expenses, coverage, appraisal downside, and written loan terms.",
  },
  {
    q: "Is the 70% rule outdated in 2026?",
    a: "It still works as a screen, but 70 was never a universal number. Higher financing costs — hard money runs roughly 9.5–13% plus points in 2026 — make holding costs a bigger drag on long rehabs, which argues for a lower multiplier on heavy projects. On cheap houses, fixed costs push you toward 60–65%; on expensive houses with light work, 72–75% can be justified. Treat 70% as the center of a range, not a law.",
  },
  {
    q: "Why is the 70%-rule price screen rounded down to $500?",
    a: "Rounding down keeps the displayed amount at or below the rule's own modeled boundary. TrueCap's Offer Ceiling uses the same convention.",
  },
];

export default function SeventyPercentRuleCalculatorPage() {
  const siteUrl = getSiteUrl();

  const webAppLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "TrueCap 70% Rule Calculator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    dateModified: "2026-07-14",
    url: `${siteUrl}/tools/70-percent-rule-calculator`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "Free online 70% rule calculator: 70%-rule price screen from ARV and repair costs, with the offer at 60/65/70/75% multipliers.",
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
    name: "70% Rule Calculator",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Real Estate Calculator",
    operatingSystem: "Web",
    description:
      "Free 70% rule calculator. 70%-rule price screen = 70% of ARV minus repairs, with the boundary shown at common multipliers.",
    url: `${siteUrl}/tools/70-percent-rule-calculator`,
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
      "70%-rule price screen from ARV + repair costs",
      "Offer ladder at 60 / 65 / 70 / 75% multipliers",
      "Down-only $500 rounding — never quotes above the ceiling",
      "Free, no signup",
    ],
  };

  return (
    <>
      <ToolBreadcrumbSchema toolPath="/tools/70-percent-rule-calculator" toolName="70% rule calculator" />
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
              70% Rule Calculator
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-2 leading-relaxed">
              An early acquisition screen: selected percentage of after-repair
              value, minus repairs. Enter ARV and the renovation estimate to
              see the 60%, 65%, 70%, and 75% boundaries.
            </p>
          </header>

          {/* Calculator — above the fold */}
          <SeventyPercentRuleWidget />

          {/* Long-form content */}
          <article className="prose prose-slate max-w-none mt-10 sm:mt-12 [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground">
            <p>
              <strong>Educational guide:</strong> The material below explains
              this early acquisition rule and its common use cases. TrueCap
              does not currently expose an integrated flip or BRRRR lifecycle
              model.
            </p>
            <h2 className="text-2xl sm:text-3xl">What is the 70% rule?</h2>
            <p>
              The 70% rule is the standard quick screen for house flips
              and BRRRR deals. It caps what you pay for a property that
              needs work:
            </p>
            <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
              <div className="text-base sm:text-lg font-mono">
                <span className="font-bold">70%-rule price screen</span> = (ARV × 70%) −
                Repair costs
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                e.g. ($300,000 ARV × 0.70) − $45,000 repairs = $165,000 70%-rule price screen
              </div>
            </div>
            <p>
              The 30% you hold back is <strong>not all profit</strong>. It
              has to cover buying costs, holding costs (financing,
              insurance, utilities, taxes while you own it), and selling
              costs first — the margin is what survives all three. That
              framing is the single most important thing to understand
              about the rule, and it&apos;s why the full worked flip
              P&amp;L in our{" "}
              <Link href="/blog/70-percent-rule-house-flipping" className="text-primary font-semibold hover:underline">70% rule deep-dive</Link>{" "}
              is worth ten minutes before your first offer.
            </p>

            <h2 className="text-2xl sm:text-3xl">
              The rule leans entirely on ARV — get that number right
            </h2>
            <p>
              Repairs you can estimate line by line. The multiplier is a
              convention. ARV — what the property sells for{" "}
              <em>after</em>{" "}the rehab — is the input the whole rule leans
              on, and the one people fudge. It comes from comparable sales
              of <strong>renovated</strong>{" "}homes near the subject:
              ideally sold in the last 3&ndash;6 months, within about half
              a mile, matching on beds, baths, and square footage. ARV is
              set by the market, not by how much you spend on the rehab.
            </p>
            <p>
              If you don&apos;t have an ARV yet, build one from your comps
              with the{" "}
              <Link href="/tools/arv-calculator" className="text-primary font-semibold hover:underline">ARV calculator</Link>{" "}
              — it computes the price-per-square-foot average, sanity-checks
              the result against the comps&apos; actual sale range, and
              runs this same max-offer math on the way out. And price the
              rehab input honestly with the{" "}
              <Link href="/tools/rehab-cost-estimator" className="text-primary font-semibold hover:underline">rehab cost estimator</Link>{" "}
              — a guessed repair number turns the rule&apos;s output into
              a guess with a decimal point.
            </p>

            <h2 className="text-2xl sm:text-3xl">
              When 70% is the wrong number
            </h2>
            <p>
              The single biggest mistake with the 70% rule is treating the
              70 as a law of physics. It stands in for a specific bundle
              of cost-and-profit assumptions, and when those assumptions
              don&apos;t hold, the multiplier should move. Fixed costs are
              the reason: commissions scale with ARV, but a title search,
              a dumpster, six months of insurance, and a permit cost about
              the same on a $130,000 house as on a $400,000 one — so on
              cheap houses those fixed costs eat a much bigger share of a
              much smaller spread.
            </p>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-sm border-collapse my-4">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-bold">Situation</th>
                    <th className="text-left py-2 px-3 font-bold">What&apos;s different</th>
                    <th className="text-right py-2 px-3 font-bold">Offer as % of ARV</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3">Low ARV (&lt; ~$150K), cheaper market</td>
                    <td className="py-2 px-3">Fixed costs are a big share of a small spread</td>
                    <td className="py-2 px-3 text-right font-mono">60&ndash;65%</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3">Typical ($200K&ndash;$400K), moderate rehab</td>
                    <td className="py-2 px-3">The rule&apos;s home turf</td>
                    <td className="py-2 px-3 text-right font-mono">70%</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3">High ARV (&gt; ~$600K), light rehab</td>
                    <td className="py-2 px-3">Fat spread; costs are a small share</td>
                    <td className="py-2 px-3 text-right font-mono">72&ndash;75%</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3">Long or heavy rehab (9+ months)</td>
                    <td className="py-2 px-3">Holding costs balloon</td>
                    <td className="py-2 px-3 text-right font-mono">drop 3&ndash;5 pts</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Red-hot seller&apos;s market</td>
                    <td className="py-2 px-3">Competition; win rate falls at 70%</td>
                    <td className="py-2 px-3 text-right font-mono">72&ndash;75%*</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              <em>
                *Higher isn&apos;t permission to overpay — it&apos;s a
                warning that a thinner margin needs a tighter rehab number
                and a faster exit.
              </em>{" "}
              None of these adjustments break the rule; they remind you
              that 70% encodes a set of numbers, and your numbers might
              differ. The calculator&apos;s multiplier ladder shows the max
              offer at 60, 65, 70, and 75% side by side so you can see
              exactly what each assumption is worth in dollars.
            </p>

            <h2 className="text-2xl sm:text-3xl">Educational context: the 70% rule and refinance plans</h2>
            <p>
              TrueCap does not currently expose an integrated BRRRR lifecycle
              model. As educational context, a BRRRR plan uses a future
              refinance rather than a sale. Maximum
              LTV, eligible value, seasoning, appraisal treatment, costs, and
              approval vary by lender, program, borrower, and property. A 75%
              refinance case is an editable scenario—not a ceiling, quote, or
              promise that capital returns.
            </p>
            <p>
              But a BRRRR has a second gate a flip doesn&apos;t: the
              finished property has to work <em>as a rental</em>. If it
              won&apos;t cash-flow at the refinanced payment, it isn&apos;t
              a BRRRR — it&apos;s a flip you accidentally kept. Model the
              full cycle with the{" "}
              <Link href="/blog/brrrr-method-explained" className="text-primary font-semibold hover:underline">BRRRR workflow guide</Link>, and
              check the rental math in the{" "}
              <Link href="/#main" className="text-primary font-semibold hover:underline">TrueCap analyzer</Link>{" "}
              — cap rate and DSCR together — before you commit.
            </p>

            <h2 className="text-2xl sm:text-3xl">
              What the rule can&apos;t tell you
            </h2>
            <p>
              The 70% rule is a screen, not underwriting. It approximates
              a rigorous backward solve — start from the resale price,
              subtract the actual buying, holding, and selling costs and
              your required profit, and whatever is left is the real
              70%-rule price screen. The rule compresses all of those costs into
              one multiplier, which is exactly why the multiplier has to
              move when your costs do. Three things it cannot see:
            </p>
            <ul>
              <li>
                <strong>Your financing.</strong>{" "}Hard money at roughly
                9.5&ndash;13% plus points makes every extra month of
                holding expensive; cash changes the math entirely.
              </li>
              <li>
                <strong>Your timeline.</strong>{" "}A six-week cosmetic rehab
                and a nine-month gut job can have the same repair budget
                and wildly different holding costs.
              </li>
              <li>
                <strong>Your exit.</strong>{" "}Sell vs. refinance-and-hold
                produce different cost stacks from the same purchase.
              </li>
            </ul>
            <p>
              When a deal passes the screen, back into the offer using a
              separate, reviewed project ledger for acquisition, renovation,
              holding, financing, and disposition costs. TrueCap&apos;s
              analyzer screens only the stabilized rental case, including
              cash flow, cap rate, cash-on-cash return, DSCR, Buy Box fit,
              and a Deal score.
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
              Go from screen to underwrite — free
            </h2>
            <p className="text-sm sm:text-base opacity-90 mb-4">
              The 70% rule is an early acquisition screen, not a defensible
              offer by itself. For a stabilized hold, TrueCap&apos;s Offer Ceiling
              is the highest price that still meets your targets, calculated
              from the assumptions shown.
            </p>
            <ul className="text-sm space-y-1.5 mb-5 opacity-90">
              {[
                "Entered-ARV × selected-multiplier screen on this page",
                "Editable rehab and acquisition-cost assumptions",
                "TrueCap's Offer Ceiling for the rental case (Pro)",
                "Cash flow, cap rate, CoC, DSCR on the keep scenario",
                "Buy Box fit, with a Deal score",
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
              Open the rental analyzer
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </section>

          {/* Footer */}
          {/* Backlink engine — quiet, collapsed, renders nothing if this
              tool has no embeddable widget. See the component header. */}
          <ToolEmbedInvite slug="70-percent-rule-calculator" />

          <ToolsConversionCta calculatorName="70% rule calculator" hook="The 70% rule is an initial screen. TrueCap's rental analyzer adds itemized costs, stabilized cash flow, and TrueCap's Offer Ceiling under your Buy Box." />

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
