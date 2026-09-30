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
// Below-the-fold cross-links prefetch on hover or keyboard focus, not on
// scroll; hero and primary CTA links keep the default (see the component).
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
  "Hit Calculate — cap rate, CoC, DSCR, monthly cash flow appear in 1 second.",
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
        />

        {/* Real product screenshot from the free sample deal (Phase 4), set
            as a document: a rule, no browser chrome. It spans the container
            under the hero, not the hero's 7/12 aside: the capture is 1232 CSS
            px wide, so the aside (about 555px at 1095) set its text near 7px,
            while the container keeps it at 80-96% of its own size. The
            caption link takes a 44px target from padding the negative margin
            takes back out of the line box (the cue-line technique). */}
        <Section rule="none" rhythm="tight" aria-label="What the decision looks like">
          <ProductShot
            shot={DECISION_SHOT}
            frame="document"
            sizes="(min-width: 1280px) 1184px, 100vw"
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
        </Section>

        <Section id="use-cases" aria-labelledby="use-cases-heading">
          <SectionHeading id="use-cases-heading">Built for the hold strategy</SectionHeading>
          <p className="mt-3 max-w-[62ch] text-pretty text-lg leading-relaxed text-muted-foreground">
            Four jobs serious rental investors do over and over — faster, easier
            to audit, and more consistent.
          </p>
          <RuledList items={USE_CASES} columns={2} className="mt-8" />
        </Section>

        <Section aria-labelledby="workflow-heading">
          <SectionHeading id="workflow-heading">
            How a buy-and-hold investor uses TrueCap
          </SectionHeading>
          <StepList steps={WORKFLOW_STEPS} className="mt-8" />
        </Section>

        <Section aria-labelledby="spreadsheet-heading">
          <SectionHeading id="spreadsheet-heading">
            Why long-term investors pick TrueCap over a spreadsheet
          </SectionHeading>
          <RuledList items={OVER_A_SPREADSHEET} className="mt-8 max-w-[68ch]" />
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
              <Link
                href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
                className="tc-link"
              >
                60-second underwriting workflow
              </Link>
              , the deep-dive on{" "}
              <Link
                href="/blog/cap-rate-vs-cash-on-cash-vs-dscr"
                className="tc-link"
              >
                cap rate vs cash-on-cash vs DSCR
              </Link>
              , the breakdown of{" "}
              <Link
                href="/blog/rental-property-tax-deductions"
                className="tc-link"
              >
                every deductible expense
              </Link>
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

        <CloseSection
          heading="Free screens the purchase. Pro solves and stress-tests the offer and hold."
          headingId="close-heading"
          lede="Free gives you cap rate, CoC, DSCR, monthly cash flow, the 0–100 Deal score, and read-only share links for a first-pass screen. Pro adds 10-year cash-flow and equity projections, sensitivity, Offer Ceiling, saved-deal comparison, PDF exports, and co-branded share links."
          actions={
            <ActionRow>
              <Link
                href="/analyze?strategy=buy-hold"
                prefetch={false}
                className={buttonVariants({ size: "cta" })}
              >
                Try the free analyzer
              </Link>
              <Link
                href="/pricing"
                className={buttonVariants({ size: "cta", variant: "outline" })}
              >
                See Pro pricing
              </Link>
            </ActionRow>
          }
        >
          {/* Cross-link only to a released persona workflow. The tap target
              is 44px from padding the negative margin takes back out of the
              line box (the homepage's cue line). */}
          <p className="mt-4 border-t border-rule-soft pt-2.5 text-base">
            Also evaluating an owner-occupied rental? See TrueCap for{" "}
            <Link href="/for-house-hackers" className="tc-link -my-3 inline-block py-3">
              house hackers
            </Link>
            .
          </p>
          {/* Agent-first pass (2026-09): the agent persona page, only where Agent
              Pro is sold (its route redirects otherwise — see site-footer.tsx). */}
          {isAgentProConfigured() ? (
            <p className="mt-4 border-t border-rule-soft pt-2.5 text-base">
              Are you an agent working with investor clients?{" "}
              <Link href="/for-agents" className="tc-link -my-3 inline-block py-3">
                See TrueCap for agents
              </Link>
            </p>
          ) : null}
        </CloseSection>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
