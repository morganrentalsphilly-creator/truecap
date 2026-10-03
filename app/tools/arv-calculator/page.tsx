/**
 * Public SEO landing page for the ARV calculator (after-repair value +
 * the 70%-rule price screen) — the head-term tool for the flip/BRRRR
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
 * ($255k ARV / $45k rehab / $133,500 70%-rule price screen / $191,250 refi loan) —
 * internal consistency beats novelty, and the widget's default comps are
 * the first three comps from that example.
 *
 * Layout: the calculator page template (DESIGN.md "Components"; the 1% rule
 * calculator is the reference). The widget sits beside the H1 in PageHero,
 * the guide runs in a 68ch reading column (ArticleBody) with the formulas on
 * rules (ToolFormula) and the two tables as ruled tables (ArticleTable), the
 * FAQ is ruled rows (FaqSection; the page keeps its own FAQPage node), and
 * the page closes once on the heavy rule (CloseSection).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { getSiteUrl } from "@/lib/site-url";
import { ArvCalculatorWidget } from "@/components/tools/arv-calculator-widget";
import { ToolFormula } from "@/components/tools/tool-parts";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";
import { ToolEmbedInvite } from "@/components/marketing/tool-embed-invite";
import {
  ARTICLE_META,
  ARTICLE_META_LINK,
  ArticleBody,
  ArticleTable,
} from "@/components/marketing/article";
import { FaqSection } from "@/components/marketing/faq-section";
import {
  ActionRow,
  CloseSection,
  PageHero,
  UnderTitleAnalyzeLink,
} from "@/components/marketing/page-parts";
import { Section } from "@/components/marketing/section";
import { LedgerFigure } from "@/components/ledger/ledger-parts";
import { buttonVariants } from "@/components/ui/button";

import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";
import { RelatedContent } from "@/components/marketing/related-content";
import { Header } from "@/components/investcalc/header";
import { JsonLd } from "@/components/seo/json-ld";
import { buildToolAppLd } from "@/lib/seo/tool-app-ld";
import { OPEN_GRAPH_BASE } from "@/lib/seo/open-graph-base";
export const metadata: Metadata = {
  title: "ARV Calculator | ARV + 70%-Rule Price Screen",
  description:
    "Free ARV calculator. Estimate after-repair value from entered renovated comps and calculate an early 70%-rule price screen, with clear limitations.",
  keywords: [
    "ARV calculator",
    "after repair value calculator",
    "ARV real estate",
    "70 percent rule calculator",
    "70%-rule price screen calculator",
    "how to calculate ARV",
    "ARV formula",
  ],
  alternates: { canonical: "/tools/arv-calculator" },
  openGraph: {
    ...OPEN_GRAPH_BASE,
    title: "ARV Calculator — After-Repair Value + 70% Rule",
    description:
      "Estimate ARV from renovated comps and calculate a 70%-rule price screen — with comps-method checks and guidance on when 70% is the wrong screen.",
    url: "/tools/arv-calculator",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is ARV in real estate?",
    a: "ARV (after-repair value) is what the property might sell for — or appraise at — once the rehab is complete. It is a critical, frequently mis-estimated input in a BRRRR or flip: the 70%-rule price screen keys off it, the refinance loan may be sized as a percentage of it, and modeled flip profit is whatever remains after costs. ARV is a forecast, not an appraisal or guarantee, so it should be supported by renovated comparable sales rather than inferred from the rehab budget.",
  },
  {
    q: "How do you calculate ARV?",
    a: "Pull 3–6 recently sold comps that are already renovated to the level you're planning — ideally sold in the last 3–6 months, within about half a mile, and within roughly 20% of your square footage. Compute each comp's price per square foot, adjust for meaningful differences (beds, baths, garage, condition), then multiply the average $/sq ft by your property's finished square footage. Finally, sanity-check that the answer sits inside the range the comps actually sold in — this calculator runs that check automatically.",
  },
  {
    q: "What is the 70% rule?",
    a: "A rule of thumb that calculates a screening boundary at 70% of ARV minus repairs. On a property modeled at a $300,000 renovated value with $45,000 of work, the 70%-rule price screen is (0.70 × $300,000) − $45,000 = $165,000. The 30% held back is not all profit; it covers buying, holding, and selling costs first.",
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


  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const appLd = buildToolAppLd(siteUrl, {
    slug: "arv-calculator",
    name: "ARV Calculator",
    description:
      "Free ARV calculator. Estimate after-repair value from entered renovated comps and calculate an early 70%-rule price screen.",
    featureList: [
      "ARV from up to 3 renovated comps ($/sq ft method)",
      "70%-rule price screen with an adjustable multiplier",
      "Comps-range sanity check on the estimate",
      "Free, no signup",
    ],
  });

  return (
    // relative + overflow-x-clip, as on the homepage: clips any sideways bleed
    // from a descendant without making a scroll container (sticky header ok).
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <ToolBreadcrumbSchema toolPath="/tools/arv-calculator" toolName="ARV calculator" />
      <JsonLd data={faqLd} />
      <JsonLd data={appLd} />

      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        {/* The calculator in the first screen: from 1024px the widget sits
            beside the H1. The hub link is the visible half of the breadcrumb
            schema and sits under the H1, never above it. The hero's action
            is the one short analyzer link under the H1 (P2-80). */}
        <PageHero
          title="ARV calculator (after-repair value + 70% rule)"
          lede="Estimate what a property may sell for or appraise at after a renovation. Enter up to three renovated sold comps and the subject's finished square footage to calculate an ARV and an early 70%-rule price screen."
          actions={<UnderTitleAnalyzeLink />}
          aside={<ArvCalculatorWidget />}
        >
          <p className={ARTICLE_META}>
            <IntentPrefetchLink href="/tools" className={ARTICLE_META_LINK}>
              Free tools
            </IntentPrefetchLink>
          </p>
        </PageHero>

        {/* rule="none": PageHero's bottom rule already separates the head. */}
        <Section rule="none">
          <article className="max-w-[68ch]">
            <ArticleBody>
            <p>
              <strong>Educational guide:</strong> The material below explains
              how practitioners use ARV and the 70% rule. TrueCap does not
              currently expose an integrated renovation, flip, or BRRRR
              lifecycle model.
            </p>
            <h2>What is ARV?</h2>
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
            <ToolFormula
              formula="ARV ≈ average renovated-comp $/sq ft × subject finished sq ft"
              example="e.g. $182.44/sq ft × 1,400 sq ft ≈ $255,000 ARV"
            />
            <p>
              That one-liner is the last step of the process, not the process
              itself. The accuracy lives in which comps you select and how you
              adjust them — which is why this calculator asks for the comps,
              not for a guess.
            </p>

            <h2>The comps method, step by step</h2>
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
              <IntentPrefetchLink href="/blog/how-to-calculate-arv" className="tc-link">how to calculate ARV</IntentPrefetchLink>.
            </p>

            <h2>A worked example</h2>
            <p>
              Take the deal from that guide: a dated 3-bed, 2-bath
              single-family, 1,400 finished square feet, needing roughly
              $45,000 of work to reach the neighborhood&apos;s renovated
              standard. The four best renovated comps:
            </p>
            <ArticleTable label="Results table" stickyFirstColumn={false}>
              <table>
                <thead>
                  <tr>
                    <th>Comp</th>
                    <th className="text-right">Sq ft</th>
                    <th className="text-right">Sale price</th>
                    <th className="text-right">$/sq ft</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>A — 0.3 mi, sold 6 wks ago</td>
                    <td className="text-right"><LedgerFigure>1,450</LedgerFigure></td>
                    <td className="text-right"><LedgerFigure>$262,000</LedgerFigure></td>
                    <td className="text-right"><LedgerFigure>$180.69</LedgerFigure></td>
                  </tr>
                  <tr>
                    <td>B — 0.4 mi, sold 2 mo ago</td>
                    <td className="text-right"><LedgerFigure>1,350</LedgerFigure></td>
                    <td className="text-right"><LedgerFigure>$248,500</LedgerFigure></td>
                    <td className="text-right"><LedgerFigure>$184.07</LedgerFigure></td>
                  </tr>
                  <tr>
                    <td>C — 0.2 mi, sold 3 mo ago</td>
                    <td className="text-right"><LedgerFigure>1,500</LedgerFigure></td>
                    <td className="text-right"><LedgerFigure>$270,000</LedgerFigure></td>
                    <td className="text-right"><LedgerFigure>$180.00</LedgerFigure></td>
                  </tr>
                  <tr>
                    <td>D — 0.5 mi, sold 5 wks ago</td>
                    <td className="text-right"><LedgerFigure>1,380</LedgerFigure></td>
                    <td className="text-right"><LedgerFigure>$255,300</LedgerFigure></td>
                    <td className="text-right"><LedgerFigure>$185.00</LedgerFigure></td>
                  </tr>
                </tbody>
              </table>
            </ArticleTable>
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

            <h2>
              The 70% rule: turning ARV into a 70%-rule price screen
            </h2>
            <p>
              ARV&apos;s first job is setting the most you can pay and still
              leave room to profit — the 70%-rule price screen:
            </p>
            <ToolFormula
              formula="70%-rule price screen = (ARV × 0.70) − Repair costs"
              example="e.g. (0.70 × $255,000) − $45,000 = $133,500"
            />
            <p>
              The 30% you hold back isn&apos;t profit — it&apos;s profit{" "}
              <em>plus</em>{" "}every cost the formula doesn&apos;t name: buying
              costs on the purchase, holding costs for every month you own it,
              and selling costs that land on the higher finished value, not on
              your bargain purchase price. On a typical deal those three eat
              roughly 12–14% of ARV and your profit is the remaining 16–17%.
              The full ledger — where every dollar of the spread goes on a
              real flip — is worked through in our{" "}
              <IntentPrefetchLink href="/blog/70-percent-rule-house-flipping" className="tc-link">70% rule deep-dive</IntentPrefetchLink>.
              Already have an ARV and just want the rule? The dedicated{" "}
              <IntentPrefetchLink href="/tools/70-percent-rule-calculator" className="tc-link">70% rule calculator</IntentPrefetchLink>{" "}
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
            <ArticleTable label="Results table" stickyFirstColumn={false}>
              <table>
                <thead>
                  <tr>
                    <th>Situation</th>
                    <th>Why it breaks</th>
                    <th className="text-right">Multiplier</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Cheap houses (ARV &lt; ~$150k)</td>
                    <td>Fixed costs are a big share of a small spread</td>
                    <td className="text-right"><LedgerFigure>60–65%</LedgerFigure></td>
                  </tr>
                  <tr>
                    <td>Typical deal ($200k–$400k)</td>
                    <td>The rule&apos;s home turf</td>
                    <td className="text-right"><LedgerFigure>70%</LedgerFigure></td>
                  </tr>
                  <tr>
                    <td>Long or heavy rehab (9+ months)</td>
                    <td>Holding costs balloon</td>
                    <td className="text-right"><LedgerFigure>drop 3–5 pts</LedgerFigure></td>
                  </tr>
                  <tr>
                    <td>Expensive house, light rehab</td>
                    <td>Fat spread; costs are a small share</td>
                    <td className="text-right"><LedgerFigure>72–75%</LedgerFigure></td>
                  </tr>
                </tbody>
              </table>
            </ArticleTable>
            <p>
              That&apos;s why the multiplier in this calculator is an input,
              not a constant. And it&apos;s why the rule is a screen, not
              underwriting: use it to decide which listings are worth an hour,
              then solve the offer backward from your real costs and required
              profit before you sign. The other input matters just as much —
              build the repair number line by line with the{" "}
              <IntentPrefetchLink href="/tools/rehab-cost-estimator" className="tc-link">rehab cost estimator</IntentPrefetchLink>{" "}
              rather than guessing a round number, and add a 10–25%
              contingency for what demolition reveals.
            </p>

            <h2>Educational context: ARV and a future refinance</h2>
            <p>
              TrueCap&apos;s ARV calculator stops at the comp-based ARV
              and 70%-rule screen; it does not model a renovation-to-refinance
              lifecycle. As educational context, buy-and-hold investors may use
              the same ARV with a different destination. On a{" "}
              <IntentPrefetchLink href="/blog/brrrr-method-explained" className="tc-link">BRRRR</IntentPrefetchLink>,
              you refinance the finished rental instead of selling it, and a
              cash-out refinance limit on a single-family investment property
              depends on the lender, program, borrower, property, seasoning,
              eligible value basis, and appraisal. A 75% LTV case is only an
              educational scenario assumption, not a quote or approval. On the
              worked example: negotiate to $150,000, spend the
              $45,000 rehab, carry $8,000 of closing and holding costs —
              $203,000 all-in. A 75% refinance against the $255,000 appraisal
              produces a $191,250 loan; net of about $4,000 in refi costs you
              recover $187,250, leaving just $15,750 of your cash in a
              stabilized rental. The roughly five-point gap between the 70%
              you paid and the 75% you can refinance is the room the
              transaction costs may need — review the full list of inputs in the{" "}
              <IntentPrefetchLink href="/blog/brrrr-method-explained" className="tc-link">BRRRR workflow guide</IntentPrefetchLink>.
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

            <h2>Mistakes that sink ARV estimates</h2>
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

            <h2>When to use this calculator</h2>
            <p>
              Use it the moment a distressed listing catches your eye: three
              comps and a square footage produce the two numbers that decide
              whether the deal deserves another hour — the ARV and the max
              offer. When a property clears the screen and the endgame is a
              rental, run the stabilized numbers through the full analyzer —
              TrueCap&apos;s Offer Ceiling card solves the rental version of this
              question (the highest price that still hits your target cap
              rate, cash-on-cash, and DSCR), alongside cash flow, 10-year
              projections, Buy Box fit, and a Deal score. Verify comps, rehab
              scope, and lender terms on any specific deal.
            </p>

            </ArticleBody>

            {/* The analyzer CTA where the guide hands off to TrueCap, inside
                the article, so the page closes once, on the CloseSection
                below. */}
            <ToolsConversionCta calculatorName="ARV calculator" hook="Use ARV as one reviewed input, keep the renovation and project timeline in a separate ledger, and use the rental analyzer for stabilized cash flow and TrueCap's Offer Ceiling." />

            {/* The page's FAQPage node is faqLd above, built from the same
                FAQS, so the section emits none of its own. */}
            <FaqSection
              id="arv-faq"
              variant="inline"
              heading="Frequently asked questions"
              items={FAQS}
              structuredData={false}
            />
          </article>
        </Section>

        <CloseSection
          heading="Continue with the rental screen — free"
          headingId="arv-close-heading"
          lede={
            <>
              ARV and the 70% rule are early screens, not a defensible offer by
              themselves. Use separate reviewed rehab and project ledgers for a
              flip or BRRRR; TrueCap&apos;s core analyzer can screen the
              stabilized rental cash flow, cap rate, CoC, and DSCR.
            </>
          }
          actions={
            <>
              <ul className="border-t-2 border-foreground">
                {[
                  "TrueCap's Offer Ceiling — the highest price that still meets your targets",
                  "Separate rehab and stabilized-rental tools",
                  "Cash flow, cap rate, CoC, DSCR — auto-calculated",
                  "10-year projection with rent + expense growth (Pro)",
                  "Downside sensitivity and TrueCap's Offer Ceiling (included in your first decision, Pro after)",
                  "Free to start — no credit card",
                ].map((line) => (
                  <li
                    key={line}
                    className="border-b border-rule-soft py-3 text-pretty text-base"
                  >
                    {line}
                  </li>
                ))}
              </ul>
              <ActionRow className="mt-6">
                <Link
                  href="/analyze" prefetch={false}
                  className={buttonVariants({ size: "cta" })}
                >
                  Open the rental analyzer
                </Link>
              </ActionRow>
            </>
          }
        />

        {/* The tail shares the reading column. Each block spaces itself from
            the one above (mt-12); the first one, directly under the close,
            takes the close's own bottom space instead. */}
        <Section rule="none" rhythm="tight" containerClassName="pt-0 sm:pt-0">
          <div className="max-w-[68ch] [&>*:first-child]:mt-0">
            {/* Backlink engine — quiet, collapsed, renders nothing if this
                tool has no embeddable widget. See the component header. */}
            <ToolEmbedInvite slug="arv-calculator" />

            <RelatedContent kind="tool" slug="arv-calculator" title="ARV Calculator (After-Repair Value + 70% Rule)" className="mt-12" />
          </div>
        </Section>
      </main>
      <SiteFooter />
    </div>
  );
}
