/**
 * Public SEO landing page for the ARV calculator (after-repair value +
 * the 70% rule max offer) — the head-term tool for the flip/BRRRR
 * acquisition cluster.
 *
 * Strategy mirrors /tools/cap-rate-calculator: the working calculator is
 * above the fold so visitors can do what they came for, then long-form
 * content (~1,800 words) earns the page authority for "ARV calculator"
 * + adjacent long-tail keywords. Schema.org WebApplication + FAQPage
 * markup helps Google surface the calculator as a tool and the FAQ as a
 * rich result.
 *
 * Numbers in the copy are the SAME worked example as the
 * how-to-calculate-arv and 70-percent-rule-house-flipping blog posts
 * ($255k ARV / $45k rehab / $133,500 max offer / $191,250 refi loan) —
 * internal consistency beats novelty, and the widget's default comps are
 * the first three comps from that example.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { getSiteUrl } from "@/lib/site-url";
import { ArvCalculatorWidget } from "@/components/tools/arv-calculator-widget";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";
import { ToolEmbedInvite } from "@/components/marketing/tool-embed-invite";

import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";
export const metadata: Metadata = {
  title: "ARV Calculator | After-Repair Value + 70% Rule Max Offer",
  description:
    "Free ARV calculator. Estimate after-repair value from renovated comps ($/sq ft method) and get the 70%-rule max offer for a flip or BRRRR — plus when the rule lies.",
  keywords: [
    "ARV calculator",
    "after repair value calculator",
    "ARV real estate",
    "70 percent rule calculator",
    "maximum allowable offer calculator",
    "how to calculate ARV",
    "ARV formula",
    "house flipping calculator",
  ],
  alternates: { canonical: "/tools/arv-calculator" },
  openGraph: {
    title: "ARV Calculator — After-Repair Value + 70% Rule",
    description:
      "Estimate ARV from renovated comps and get the 70%-rule max offer in seconds — with the comps-method sanity checks appraisers use and honest guidance on when 70% is the wrong number.",
    url: "/tools/arv-calculator",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap ARV calculator" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/home.jpg"],
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is ARV in real estate?",
    a: "ARV (after-repair value) is what the property would sell for — or appraise at — once the rehab is complete. It's the most important, and most mis-estimated, input in any BRRRR or flip: the max offer keys off it, the refinance loan is sized as a percentage of it, and the flip profit is whatever's left of it after costs. It is a forecast of an appraisal, not a formula, which is why it comes from renovated comparable sales rather than from your rehab budget.",
  },
  {
    q: "How do you calculate ARV?",
    a: "Pull 3–6 recently sold comps that are already renovated to the level you're planning — ideally sold in the last 3–6 months, within about half a mile, and within roughly 20% of your square footage. Compute each comp's price per square foot, adjust for meaningful differences (beds, baths, garage, condition), then multiply the average $/sq ft by your property's finished square footage. Finally, sanity-check that the answer sits inside the range the comps actually sold in — this calculator runs that check automatically.",
  },
  {
    q: "What is the 70% rule?",
    a: "A rule of thumb that caps your purchase offer at 70% of ARV minus the cost of repairs. On a house that will be worth $300,000 renovated and needs $45,000 of work, the maximum offer is (0.70 × $300,000) − $45,000 = $165,000. The 30% you hold back isn't all profit — it covers buying, holding, and selling costs first, and whatever is left is your margin.",
  },
  {
    q: "Is ARV just the purchase price plus the rehab budget?",
    a: "No — that's the single most common ARV mistake. Spending $45,000 on a renovation doesn't add $45,000 of value; it might add $70,000 in a neighborhood that rewards renovated product, or $25,000 in one already priced near its ceiling. The market decides what the finished house is worth, not your invoices, which is why ARV comes from renovated comps and nothing else.",
  },
  {
    q: "Can I use a Zestimate or online estimate as my ARV?",
    a: "No. Automated estimates price the property in its current condition and blend renovated and unrenovated sales indiscriminately — which is exactly the distinction ARV exists to capture. Use online tools to find candidate comps quickly, then do the renovated-only, adjusted comp work yourself, or ask an investor-friendly agent to pull MLS comps.",
  },
  {
    q: "Does the 70% rule work for BRRRR?",
    a: "It can be an initial screen, not a refinance rule. Cash-out LTV, eligible value, seasoning, appraisal treatment, costs, and approval vary by lender, program, borrower, and property. A 75% case is only a planning scenario and does not promise that most or all cash returns; verify the completed rental's income, expenses, coverage, appraisal downside, and written loan terms.",
  },
  {
    q: "When is 70% the wrong number?",
    a: "Whenever the costs the 70 encodes don't match your deal. On cheap houses (ARV under roughly $150k), fixed costs eat a big share of a small spread — use 60–65%. On long or heavy rehabs, holding costs balloon — drop the multiplier 3–5 points. On expensive houses with light work, 72–75% can be justified. Treat 70% as the center of a range and adjust the multiplier in this calculator to match your actual costs.",
  },
];

export default function ArvCalculatorPage() {
  const siteUrl = getSiteUrl();

  const webAppLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "TrueCap ARV Calculator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    dateModified: "2026-07-14",
    url: `${siteUrl}/tools/arv-calculator`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "Free online calculator for after-repair value (ARV) from renovated comps, with the 70%-rule maximum offer and the 75%-LTV BRRRR refinance line.",
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
    name: "ARV Calculator",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Real Estate Calculator",
    operatingSystem: "Web",
    description:
      "Free ARV calculator. Estimate after-repair value from renovated comps ($/sq ft method) and get the 70%-rule max offer for a flip or BRRRR — plus when the rule lies.",
    url: `${siteUrl}/tools/arv-calculator`,
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
      "ARV from up to 3 renovated comps ($/sq ft method)",
      "70%-rule max offer with an adjustable multiplier",
      "Comps-range sanity check on the estimate",
      "75% LTV BRRRR refinance loan line",
      "Free, no signup",
    ],
  };

  return (
    <>
      <ToolBreadcrumbSchema toolPath="/tools/arv-calculator" toolName="ARV calculator" />
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
              ARV Calculator (After-Repair Value + 70% Rule)
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-2 leading-relaxed">
              The number every flip and BRRRR is built on — what the property
              will sell for, or appraise at, once the renovation is done.
              Enter up to three renovated sold comps and your square footage;
              the ARV, the 70%-rule max offer, and the 75%-LTV refinance line
              compute live.
            </p>
          </header>

          {/* Calculator — above the fold */}
          <ArvCalculatorWidget />

          {/* Long-form content */}
          <article className="prose prose-slate max-w-none mt-10 sm:mt-12 [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground">
            <h2 className="text-2xl sm:text-3xl">What is ARV?</h2>
            <p>
              ARV — <em>after-repair value</em> — is what the property would
              sell for once the rehab is complete: the price a fully renovated
              version of your house would trade for today, in that
              neighborhood, to a normal buyer with normal financing. It is the
              most important, and most mis-estimated, input in any flip or
              BRRRR. Two things follow from the definition. First, ARV is{" "}
              <strong>not</strong> purchase price plus rehab budget — the
              market decides what a finished house is worth, not your
              invoices. Second, ARV is a <strong>forecast of an appraisal</strong>:
              on a refinance, a licensed appraiser will pull renovated
              comparable sales and reconcile them to a value, and your job is
              to run the same play before you commit money to the deal.
            </p>

            <h3>The formula</h3>
            <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
              <div className="text-base sm:text-lg font-mono">
                <span className="font-bold">ARV</span> ≈ average renovated-comp
                $/sq ft × subject finished sq ft
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                e.g. $182.44/sq ft × 1,400 sq ft ≈ $255,000 ARV
              </div>
            </div>
            <p>
              That one-liner is the last step of the process, not the process
              itself. The accuracy lives in which comps you select and how you
              adjust them — which is why this calculator asks for the comps,
              not for a guess.
            </p>

            <h2 className="text-2xl sm:text-3xl">The comps method, step by step</h2>
            <p>
              The method is the same one the appraiser will use after your
              rehab, run in advance:
            </p>
            <ul>
              <li>
                <strong>Pull renovated sales only.</strong>{" "}Closed sales within
                roughly half a mile, sold in the last 3–6 months, same property
                type, within about 20% of your square footage — and renovated
                to the condition you&apos;re delivering. A dated sale tells you
                what the house is worth <em>now</em>, which is a different
                question.
              </li>
              <li>
                <strong>Demand at least three comps, prefer five.</strong> With
                fewer than three true comps, widen the radius or time window
                before you loosen the renovated-condition filter.
              </li>
              <li>
                <strong>Compute price per square foot</strong> for each comp
                (the calculator does this for you).
              </li>
              <li>
                <strong>Adjust for real differences</strong>{" "}— beds, baths,
                garage, lot, condition. Adjust the comp&apos;s sale price toward
                your subject before entering it: if a comp has one fewer bath
                than your finished product and second baths are worth ~$7,500
                in your market, add that to the comp&apos;s price first.
              </li>
              <li>
                <strong>Reconcile and sanity-check.</strong>{" "}Average the $/sq
                ft, multiply by your finished square footage, and confirm the
                result sits inside the range the comps actually sold in. An
                ARV above every comp&apos;s actual sale price should make you
                deeply suspicious — the calculator flags this automatically.
              </li>
            </ul>
            <p>
              The full walk-through — including the adjustment discipline and
              what to do when comps are thin — is in our guide on{" "}
              <Link href="/blog/how-to-calculate-arv" className="text-primary font-semibold hover:underline">how to calculate ARV</Link>.
            </p>

            <h2 className="text-2xl sm:text-3xl">A worked example</h2>
            <p>
              Take the deal from that guide: a dated 3-bed, 2-bath
              single-family, 1,400 finished square feet, needing roughly
              $45,000 of work to reach the neighborhood&apos;s renovated
              standard. The four best renovated comps:
            </p>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-sm border-collapse my-4">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-bold">Comp</th>
                    <th className="text-right py-2 px-3 font-bold">Sq ft</th>
                    <th className="text-right py-2 px-3 font-bold">Sale price</th>
                    <th className="text-right py-2 px-3 font-bold">$/sq ft</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3">A — 0.3 mi, sold 6 wks ago</td>
                    <td className="py-2 px-3 text-right font-mono">1,450</td>
                    <td className="py-2 px-3 text-right font-mono">$262,000</td>
                    <td className="py-2 px-3 text-right font-mono">$180.69</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3">B — 0.4 mi, sold 2 mo ago</td>
                    <td className="py-2 px-3 text-right font-mono">1,350</td>
                    <td className="py-2 px-3 text-right font-mono">$248,500</td>
                    <td className="py-2 px-3 text-right font-mono">$184.07</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3">C — 0.2 mi, sold 3 mo ago</td>
                    <td className="py-2 px-3 text-right font-mono">1,500</td>
                    <td className="py-2 px-3 text-right font-mono">$270,000</td>
                    <td className="py-2 px-3 text-right font-mono">$180.00</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">D — 0.5 mi, sold 5 wks ago</td>
                    <td className="py-2 px-3 text-right font-mono">1,380</td>
                    <td className="py-2 px-3 text-right font-mono">$255,300</td>
                    <td className="py-2 px-3 text-right font-mono">$185.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              The four comps average <strong>$182.44 per square foot</strong>.
              Applied to 1,400 finished square feet: 1,400 × $182.44 ≈
              $255,400 — round conservatively and call the ARV{" "}
              <strong>$255,000</strong>, a number that sits comfortably inside
              the comps&apos; $248,500–$270,000 sale range. The calculator
              above is preloaded with the first three of those comps and lands
              at ≈$254,200 — within half a percent of the four-comp answer.
              That stability across comp subsets is exactly what a healthy comp
              set looks like; when dropping one comp swings your ARV by
              $10,000 or more, the set is too thin to trust, and the fix is
              better comps, not bigger adjustments.
            </p>

            <h2 className="text-2xl sm:text-3xl">
              The 70% rule: turning ARV into a max offer
            </h2>
            <p>
              ARV&apos;s first job is setting the most you can pay and still
              leave room to profit — the maximum allowable offer:
            </p>
            <div className="bg-card border border-border rounded-xl p-5 sm:p-6 my-4 text-center">
              <div className="text-base sm:text-lg font-mono">
                <span className="font-bold">Max offer</span> = (ARV × 0.70) −
                Repair costs
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                e.g. (0.70 × $255,000) − $45,000 = $133,500
              </div>
            </div>
            <p>
              The 30% you hold back isn&apos;t profit — it&apos;s profit{" "}
              <em>plus</em>{" "}every cost the formula doesn&apos;t name: buying
              costs on the purchase, holding costs for every month you own it,
              and selling costs that land on the higher finished value, not on
              your bargain purchase price. On a typical deal those three eat
              roughly 12–14% of ARV and your profit is the remaining 16–17%.
              The full ledger — where every dollar of the spread goes on a
              real flip — is worked through in our{" "}
              <Link href="/blog/70-percent-rule-house-flipping" className="text-primary font-semibold hover:underline">70% rule deep-dive</Link>.
              Already have an ARV and just want the rule? The dedicated{" "}
              <Link href="/tools/70-percent-rule-calculator" className="text-primary font-semibold hover:underline">70% rule calculator</Link>{" "}
              runs the same max-offer math with the offer at 60, 65, 70,
              and 75% side by side.
            </p>

            <h3>When the 70% rule lies</h3>
            <p>
              The single biggest mistake with the rule is treating the 70 as a
              law of physics. It encodes a specific bundle of cost-and-profit
              assumptions, and when those don&apos;t hold, the multiplier
              should move:
            </p>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-sm border-collapse my-4">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-bold">Situation</th>
                    <th className="text-left py-2 px-3 font-bold">Why it breaks</th>
                    <th className="text-right py-2 px-3 font-bold">Multiplier</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3">Cheap houses (ARV &lt; ~$150k)</td>
                    <td className="py-2 px-3">Fixed costs are a big share of a small spread</td>
                    <td className="py-2 px-3 text-right font-mono">60–65%</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3">Typical deal ($200k–$400k)</td>
                    <td className="py-2 px-3">The rule&apos;s home turf</td>
                    <td className="py-2 px-3 text-right font-mono">70%</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="py-2 px-3">Long or heavy rehab (9+ months)</td>
                    <td className="py-2 px-3">Holding costs balloon</td>
                    <td className="py-2 px-3 text-right font-mono">drop 3–5 pts</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Expensive house, light rehab</td>
                    <td className="py-2 px-3">Fat spread; costs are a small share</td>
                    <td className="py-2 px-3 text-right font-mono">72–75%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              That&apos;s why the multiplier in this calculator is an input,
              not a constant. And it&apos;s why the rule is a screen, not
              underwriting: use it to decide which listings are worth an hour,
              then solve the offer backward from your real costs and required
              profit before you sign. The other input matters just as much —
              build the repair number line by line with the{" "}
              <Link href="/tools/rehab-cost-estimator" className="text-primary font-semibold hover:underline">rehab cost estimator</Link>{" "}
              rather than guessing a round number, and add a 10–25%
              contingency for what demolition reveals.
            </p>

            <h2 className="text-2xl sm:text-3xl">The BRRRR tie-in: the 75% refinance</h2>
            <p>
              Buy-and-hold investors use the same ARV with a different
              destination. On a{" "}
              <Link href="/blog/brrrr-method-explained" className="text-primary font-semibold hover:underline">BRRRR</Link>,
              you refinance the finished rental instead of selling it, and a
              cash-out refinance limit on a single-family investment property
              depends on the lender, program, borrower, property, seasoning,
              eligible value basis, and appraisal. The calculator&apos;s
              &ldquo;75% LTV refi loan&rdquo; line is an editable scenario assumption,
              not a quote or approval. On the worked deal: negotiate to $150,000, spend the
              $45,000 rehab, carry $8,000 of closing and holding costs —
              $203,000 all-in. A 75% refinance against the $255,000 appraisal
              produces a $191,250 loan; net of about $4,000 in refi costs you
              recover $187,250, leaving just $15,750 of your cash in a
              stabilized rental. The roughly five-point gap between the 70%
              you paid and the 75% you can refinance is the room the
              transaction costs need — model the whole cycle in the{" "}
              <Link href="/tools/brrrr-calculator" className="text-primary font-semibold hover:underline">BRRRR calculator</Link>.
            </p>
            <p>
              One caution before you count on that refinance: the appraisal is
              independent, and its supported value can differ materially from
              an investor&apos;s ARV. In this illustration, a 10% miss more than doubles the cash
              trapped in this BRRRR and cuts the equivalent flip&apos;s profit
              by roughly three quarters — which is why disciplined investors
              underwrite at their comp-supported number and confirm the deal
              still works 5–10% below it.
            </p>

            <h2 className="text-2xl sm:text-3xl">Mistakes that sink ARV estimates</h2>
            <h3>1. Comping against unrenovated sales</h3>
            <p>
              Mixing dated sales into the set drags the $/sq ft down — or
              worse, tempts you to &ldquo;adjust up&rdquo; by guesswork.
              Renovated comps only; that&apos;s the entire point of the
              exercise.
            </p>
            <h3>2. Using list prices instead of closed sales</h3>
            <p>
              Anyone can ask anything. Only closed prices are evidence, and in
              a softening market even 6-month-old closings can be stale.
            </p>
            <h3>3. Ignoring the neighborhood ceiling</h3>
            <p>
              If the nicest renovated homes on the street top out around
              $310,000, no kitchen you install makes yours worth $340,000.
              You cannot renovate a house above what the block supports.
            </p>
            <h3>4. Letting the deal set the ARV</h3>
            <p>
              If you catch yourself hunting for one more comp to justify the
              price that makes the deal work, stop — the comps are supposed to
              discipline the offer, not the other way around.
            </p>

            <h2 className="text-2xl sm:text-3xl">When to use this calculator</h2>
            <p>
              Use it the moment a distressed listing catches your eye: three
              comps and a square footage produce the two numbers that decide
              whether the deal deserves another hour — the ARV and the max
              offer. When a property clears the screen and the endgame is a
              rental, run the stabilized numbers through the full TrueCap
              analyzer — its Max Offer card solves the rental version of this
              question (the highest price that still hits your target cap
              rate, cash-on-cash, and DSCR), alongside cash flow, 10-year
              projections, and a plain-English verdict. None of this is
              investment advice; verify comps, rehab scope, and lender terms
              on any specific deal.
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
              ARV and the 70% rule get you to a defensible offer. TrueCap
              takes it from there: the rehab, the refinance, the stabilized
              cash flow, cap rate, cash-on-cash, DSCR, 10-year projections,
              and a Deal Score — all from the same inputs.
            </p>
            <ul className="text-sm space-y-1.5 mb-5 opacity-90">
              {[
                "Max Offer solver — highest price that hits your target metrics",
                "BRRRR + fix-and-flip strategy cards on every deal",
                "Cash flow, cap rate, CoC, DSCR — auto-calculated",
                "10-year projection with rent + expense growth (Pro)",
                "Sell / refi / hold exit comparison (Pro)",
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
          <ToolEmbedInvite slug="arv-calculator" />

          <ToolsConversionCta calculatorName="ARV calculator" hook="TrueCap's full analyzer takes the max offer further — rehab budget, BRRRR refinance, fix-and-flip profit, cash flow, and a Max Offer solver for rentals — all on the same deal. Save your work, compare deals, share a link." />

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
