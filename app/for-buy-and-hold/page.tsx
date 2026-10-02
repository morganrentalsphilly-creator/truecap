/**
 * /for-buy-and-hold — persona page for long-term rental investors.
 *
 * This is the largest user segment for TrueCap. Buy-and-hold investors
 * are evaluating dozens of properties per year, often comparing
 * markets and financing structures. Released Pro features such as
 * sensitivity, Offer Ceiling, 10-year cash-flow/equity projections, saved
 * comparisons, and reports support that acquisition workflow.
 *
 * Set on the persona family's grammar (2026-09 design pass), shared with
 * /for-house-hackers, /for-brrrr and /for-flippers: PageHero, ruled
 * sections, then CloseSection with the audience cues on their soft rules.
 */

import type { Metadata } from "next";
import { DECISION_SHOT, ProductShot } from "@/components/marketing/product-shot";
import Link from "next/link";
import { isAgentProConfigured } from "@/lib/stripe/plan-prices";

import {
  ActionRow,
  CloseSection,
  PageHero,
  RuledList,
  StepList,
  type RuledListItem,
} from "@/components/marketing/page-parts";
import { Section, SectionHeading } from "@/components/marketing/section";
import { buttonVariants } from "@/components/ui/button";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Header } from "@/components/investcalc/header";
// Links below the first screen prefetch on hover or keyboard focus, not on
// scroll. The hero's actions keep next/link's default; /analyze never
// prefetches. Guarded by lib/__tests__/intent-prefetch-landing.test.ts.
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";

export const metadata: Metadata = {
  title: "For Buy-and-Hold Investors",
  description:
    "Underwrite stabilized rentals for cash flow and equity. Review cap rate, CoC, DSCR, sensitivity, Offer Ceiling, and 10-year planning projections.",
  keywords: [
    "buy and hold calculator",
    "rental property analyzer",
    "long-term rental analysis",
    "cash flow + appreciation",
  ],
  alternates: { canonical: "/for-buy-and-hold" },
  openGraph: {
    title: "For Buy-and-Hold Investors — TrueCap",
    description:
      "A source-labeled screen for cap rate, CoC, DSCR, sensitivity, Offer Ceiling, and 10-year cash-flow and equity projections.",
    url: "/for-buy-and-hold",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap for buy-and-hold investors",
      },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const USE_CASES: readonly RuledListItem[] = [
  {
    term: "Triage listings with a consistent first pass",
    detail: "For a supported address and asking price, review editable cap rate, cash-on-cash, and DSCR assumptions. The result is a preliminary screen, not a finding that a property pencils.",
  },
  {
    term: "See year-1 vs year-10 in one view",
    detail: "The Pro planning view carries editable rent growth, expense growth, appreciation, and financing assumptions through 10 years. It compares scenarios; it does not forecast a winner.",
  },
  {
    term: "Track cash flow and equity over time",
    detail: "The 10-year planning view carries editable rent and expense growth through the hold while scheduled debt paydown changes equity. It is a scenario, not a forecast.",
  },
  {
    term: "Stress-test before you offer",
    detail: "The Pro sensitivity grid shows how modeled metrics respond when rent moves ±10%, vacancy moves ±5pp, and rates move ±1pp. It does not determine that a deal pencils or recommend an offer.",
  },
];

// A real sequence (paste, adjust, calculate, project, stress-test, save), so
// it is numbered.
const WORKFLOW_STEPS = [
  "Paste the listing address. HUD area rent and the FRED owner-occupied mortgage-rate benchmark can pre-fill; enter a local property-tax bill or reviewed rate manually.",
  "Adjust the financing (down %, term, rate) to match the offer you're considering.",
  "Run the analysis: cap rate, CoC, DSCR, monthly cash flow appear in 1 second.",
  "Pro: open the 10-year planning projection to review cash flow and equity under the entered growth assumptions.",
  "Pro: stress-test in the Sensitivity grid before you write the offer.",
  "Save the deal. The portfolio rollup in My Deals shows your aggregate cash flow across everything you're considering.",
] as const;

const OVER_A_SPREADSHEET: readonly RuledListItem[] = [
  {
    term: "Multi-year assumptions stay visible.",
    detail: "See rent growth, expense growth, debt paydown, cash flow, and equity in one reproducible planning view.",
  },
  {
    term: "Scenario boundaries stay explicit.",
    detail: "The projection is not a market forecast, appraisal, sale model, or tax-return calculation.",
  },
  {
    term: "Sensitivity is built in.",
    detail: "Hard to do thoroughly in a spreadsheet — trivial here.",
  },
  {
    term: "Portfolio view.",
    detail: "Save 10 deals, see total cash flow + weighted cap rate across the book.",
  },
  {
    term: "Traceable screening defaults.",
    detail: "HUD rent and FRED rate benchmarks show their sources; property tax stays a manual local input. Replace every first-pass value with property-specific evidence before offering.",
  },
];

export default function ForBuyAndHoldPage() {
  return (
    // The homepage shell: overflow-x-clip keeps a wide descendant from
    // scrolling the phone page sideways; each Section paints the paper.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <PageHero
          title="The numbers that decide whether to hold — in one screen."
          lede="Screen cap rate, cash-on-cash, DSCR, and cash flow free. Pro adds Offer Ceiling, sensitivity, and 10-year cash-flow and equity projections using labeled, editable starting data."
          actions={
            <ActionRow>
              {/* Deep-link into /analyze with the Buy & Hold play pre-selected
                  (?strategy= analyzer handoff) — long-term-rental assumption
                  defaults applied from the first keystroke. The analyzer no
                  longer lives on "/", so the seed must target /analyze. */}
              <Link
                href="/analyze?strategy=buy-hold"
                prefetch={false}
                className={buttonVariants({ size: "cta" })}
              >
                Run a free analysis
              </Link>
              <Link
                href="/pricing"
                className={buttonVariants({ size: "cta", variant: "outline" })}
              >
                See Pro pricing
              </Link>
            </ActionRow>
          }
          note="Free screen: no card or signup"
          aside={
            // Real product screenshot from the free sample deal (Phase 4),
            // set as a document: a rule, no browser chrome. It is the hero's
            // aside on the 5/7 grid, as on /for-investors, so the first
            // screen pairs the claim with the output: across the container
            // it left the hero's right half empty and set a raster taller
            // than the window. `sizes` follows the 7/12 column (about 555px
            // at 1095, 653px from 1280); the image stays lazy. The caption
            // link takes a 44px target from padding the negative margin
            // takes back out of the line box (the cue-line technique).
            <ProductShot
              shot={DECISION_SHOT}
              frame="document"
              sizes="(min-width: 1280px) 660px, (min-width: 1024px) 52vw, 100vw"
              alt="TrueCap's decision view for the sample buy-and-hold deal: the Offer Ceiling beside the asking price, cash flow after reserves, DSCR, and the best next step"
              caption={
                <>
                  Real output from the free sample deal.{" "}
                  <Link
                    href="/analyze?sample=1"
                    prefetch={false}
                    className="tc-link -my-3 inline-block py-3 font-medium"
                  >
                    Run the sample yourself
                  </Link>
                </>
              }
            />
          }
        />

        <Section id="use-cases" aria-labelledby="use-cases-heading">
          <SectionHeading id="use-cases-heading">Built for the hold strategy</SectionHeading>
          <p className="mt-3 max-w-[62ch] text-pretty text-lg leading-relaxed text-muted-foreground">
            Four jobs serious rental investors do over and over — faster, easier
            to audit, and more consistent.
          </p>
          <RuledList items={USE_CASES} columns={2} className="mt-8" />
        </Section>

        {/* The heading left and the ruled list right, on the homepage FAQ's
            5/7 grid, so these two sections fill the container like the hero
            and the close. Below 1024px the grid is one column and gap-y-8
            keeps the heading-to-list space. From 1024px the step list drops
            its 68ch cap so its rules end where the next list's do. */}
        <Section aria-labelledby="workflow-heading">
          <div className="grid gap-x-16 gap-y-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <SectionHeading id="workflow-heading">
              How a buy-and-hold investor uses TrueCap
            </SectionHeading>
            <StepList steps={WORKFLOW_STEPS} className="lg:max-w-none" />
          </div>
        </Section>

        <Section aria-labelledby="spreadsheet-heading">
          <div className="grid gap-x-16 gap-y-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <SectionHeading id="spreadsheet-heading">
              Why long-term investors pick TrueCap over a spreadsheet
            </SectionHeading>
            <RuledList items={OVER_A_SPREADSHEET} />
          </div>
        </Section>

        {/* Recommended reading + tools */}
        <Section rhythm="tight" aria-labelledby="reading-heading">
          <div className="max-w-[68ch]">
            <SectionHeading id="reading-heading">
              Recommended reading for buy-and-hold investors
            </SectionHeading>
            <p className="mt-4 text-pretty text-lg leading-relaxed">
              The handful of guides and calculators long-term investors return to
              most often: the{" "}
              <IntentPrefetchLink
                href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
                className="tc-link"
              >
                60-second underwriting workflow
              </IntentPrefetchLink>
              , the deep-dive on{" "}
              <IntentPrefetchLink
                href="/blog/cap-rate-vs-cash-on-cash-vs-dscr"
                className="tc-link"
              >
                cap rate vs cash-on-cash vs DSCR
              </IntentPrefetchLink>
              , the breakdown of{" "}
              <IntentPrefetchLink
                href="/blog/rental-property-tax-deductions"
                className="tc-link"
              >
                every deductible expense
              </IntentPrefetchLink>
              , and the{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              for quick listing triage — cap rate, cash-on-cash, and DSCR from one
              address.
            </p>
          </div>
        </Section>

        {/* whitespace-nowrap holds the compounds a line would otherwise split
            at their hyphen or dash ("stress- / tests", "10- / year",
            "first- / pass"); the text is unchanged. */}
        <CloseSection
          heading={
            <>
              Free screens the purchase. Pro solves and{" "}
              <span className="whitespace-nowrap">stress-tests</span> the offer
              and hold.
            </>
          }
          headingId="close-heading"
          lede={
            <>
              Free gives you cap rate, CoC, DSCR, monthly cash flow, the{" "}
              <span className="whitespace-nowrap">0–100</span> Deal score, and
              read-only share links for a{" "}
              <span className="whitespace-nowrap">first-pass</span> screen. Pro
              adds <span className="whitespace-nowrap">10-year</span> cash-flow
              and equity projections, sensitivity, Offer Ceiling, saved-deal
              comparison, PDF exports, and co-branded share links.
            </>
          }
          actions={
            <ActionRow>
              <Link
                href="/analyze?strategy=buy-hold"
                prefetch={false}
                className={buttonVariants({ size: "cta" })}
              >
                Try the free analyzer
              </Link>
              <IntentPrefetchLink
                href="/pricing"
                className={buttonVariants({ size: "cta", variant: "outline" })}
              >
                See Pro pricing
              </IntentPrefetchLink>
            </ActionRow>
          }
        >
          {/* Cross-link only to a released persona workflow. The tap target
              is 44px from padding the negative margin takes back out of the
              line box (the homepage's cue line). */}
          <p className="mt-4 border-t border-rule-soft pt-2.5 text-base">
            Also evaluating an owner-occupied rental? See TrueCap for{" "}
            <IntentPrefetchLink href="/for-house-hackers" className="tc-link -my-3 inline-block py-3">
              house hackers
            </IntentPrefetchLink>
            .
          </p>
          {/* Agent-first pass (2026-09): the agent persona page, only where Agent
              Pro is sold (its route redirects otherwise — see site-footer.tsx). */}
          {isAgentProConfigured() ? (
            <p className="mt-4 border-t border-rule-soft pt-2.5 text-base">
              Are you an agent working with investor clients?{" "}
              <IntentPrefetchLink href="/for-agents" className="tc-link -my-3 inline-block py-3">
                See TrueCap for agents
              </IntentPrefetchLink>
            </p>
          ) : null}
        </CloseSection>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
