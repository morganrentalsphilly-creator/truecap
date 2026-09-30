/**
 * /for-house-hackers — persona page for owner-occupant multi-unit investors.
 *
 * House hackers are a specific, high-intent niche: typically first-time
 * investors using FHA 3.5% down on a 2-4 unit, planning to live in one
 * and rent the rest. The math is intentionally different from a pure
 * buy-and-hold (owner unit doesn't generate rent income, low down
 * payment changes leverage, FHA MIP changes carrying cost), and the
 * standard rental-analyzer often models it wrong.
 *
 * Set on the persona family's grammar (2026-09 design pass), shared with
 * /for-buy-and-hold, /for-brrrr and /for-flippers: PageHero, ruled
 * sections, then CloseSection with the audience cues on their soft rules.
 */

import type { Metadata } from "next";
import { ProductShot, RENT_BREAKDOWN_SHOT } from "@/components/marketing/product-shot";
import Link from "next/link";
import { isAgentProConfigured } from "@/lib/stripe/plan-prices";

import {
  ActionRow,
  CloseSection,
  Note,
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
  title: "For House Hackers",
  description:
    "Analyze 2-4 unit owner-occupant deals with TrueCap. FHA 3.5% down, your-unit math, rent from other units — the calculator that gets house-hack math right.",
  keywords: [
    "house hack calculator",
    "house hacking analysis",
    "fha 3.5 down rental",
    "owner-occupant multi-unit",
  ],
  alternates: { canonical: "/for-house-hackers" },
  openGraph: {
    title: "For House Hackers — TrueCap",
    description:
      "Model 2-4 unit owner-occupant deals with FHA 3.5% down. Live-in-one, rent-the-rest math done right.",
    url: "/for-house-hackers",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap for house hackers" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const USE_CASES: readonly RuledListItem[] = [
  {
    term: "Owner-occupant math, not investor math",
    detail: "Select 'Owner-occupant' propertyType. The engine knows you live in one unit (no rent), so the deal scoring uses the right break-even bands instead of investor-style cash-flow thresholds.",
  },
  {
    term: "FHA 3.5% down — modeled correctly",
    detail: "Set down payment to 3.5%, enter the lender's annual MIP in the dedicated PMI / MIP field, and select the loan-life option when it applies. Add any upfront premium to closing costs if it is not financed. The starter 'FHA 3.5% owner-occupant' template pre-fills editable screening defaults.",
  },
  {
    term: "Multi-unit revenue, your-unit subsidy",
    detail: "Multi-family mode lets you set rent for each unit individually. Mark one as your unit (zero income, full carrying cost share). See how the rented units offset your housing.",
  },
  {
    term: "Plan the later rental as a separate scenario",
    detail: "The live-in model does not switch automatically in year two. Save a separate full-rental scenario with your unit rented, then compare the assumptions explicitly.",
  },
];

// A real sequence (clone, paste, set rents, calculate, save, then the
// separate move-out scenario), so it is numbered.
const WORKFLOW_STEPS = [
  "Open Templates (Pro) and clone the 'House hack' or 'FHA 3.5% owner-occupant' starter — the defaults are already shaped for your strategy.",
  "Paste the listing address (the engine handles 2-4 unit multi-family automatically).",
  "Set per-unit rent for the units you'll rent out. Leave your-unit rent at $0.",
  "Hit Calculate — see your monthly out-of-pocket (the gap between rent collected and total carrying cost). Owner-occupant scoring uses the right break-even bands.",
  "Save the live-in underwrite as its own base decision.",
  "Create a separate full-rental scenario with your unit rented. TrueCap does not automatically switch occupancy in a future year; compare the two explicit scenarios and verify the later market rent.",
] as const;

const WHY_HOUSE_HACKERS: readonly RuledListItem[] = [
  {
    term: "Right math.",
    detail: "Owner-occupant scoring uses ±$300/mo break-even bands, not investor $1,000/mo bands. A deal scoring 60+ as an investment might score 80+ as a house hack.",
  },
  {
    term: "FHA 3.5% template ready to clone.",
    detail: "One click pre-fills the down %, MIP, term, vacancy assumption.",
  },
  {
    term: "Per-unit rent.",
    detail: "Multi-family mode lets you model each unit independently — the only way to get house-hack math right.",
  },
  {
    term: "Separate transition scenario.",
    detail: "Preserve the live-in assumptions, then model the later full-rental state as a distinct saved scenario.",
  },
];

export default function ForHouseHackersPage() {
  return (
    // The homepage shell: overflow-x-clip keeps a wide descendant from
    // scrolling the phone page sideways; each Section paints the paper.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <PageHero
          title="Live in one, rent the others. Do the math first."
          lede="TrueCap handles the math that makes house hacks unique: owner-occupant break-even bands, FHA 3.5% down, MIP, your-unit subsidy, with a separate-scenario workflow for a later move-out."
          actions={
            <ActionRow>
              {/* Deep-link into /analyze with the House Hack play pre-selected
                  (?strategy= analyzer handoff) — owner-occupant form + FHA-style
                  defaults, not a blank single-family deal. The analyzer no
                  longer lives on "/", so the seed must target /analyze. */}
              <Link
                href="/analyze?strategy=house-hack"
                prefetch={false}
                className={buttonVariants({ size: "cta" })}
              >
                Run a free house-hack analysis
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
            // set as a document: a rule, no browser chrome. The phone capture
            // at every width: the desktop one is a 1140 x 252 strip whose
            // legend falls to about 4px in a phone column and 8px in this
            // one, while the phone capture stacks the same breakdown into a
            // card that reads at both. Capped at the capture's own CSS width
            // (612 device px at 2x = 306px, 19.125rem) so the raster is never
            // stretched past its pixels. The caption link takes a 44px target
            // from padding the negative margin takes back out of the line box.
            <ProductShot
              shot={RENT_BREAKDOWN_SHOT}
              viewport="mobile"
              frame="document"
              sizes="(min-width: 338px) 306px, 100vw"
              className="max-w-[19.125rem]"
              alt="TrueCap's cash-flow breakdown for the sample deal: where each month's rent goes, from operating expenses and reserves to debt service and cash flow"
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
          <SectionHeading id="use-cases-heading">
            Why house hacks need a different analyzer
          </SectionHeading>
          <p className="mt-3 max-w-[62ch] text-pretty text-lg leading-relaxed text-muted-foreground">
            Most calculators treat every deal as pure investment. House
            hacks aren&apos;t — and the wrong math gets you to the wrong
            answer.
          </p>
          <RuledList items={USE_CASES} columns={2} className="mt-8" />
        </Section>

        <Section aria-labelledby="workflow-heading">
          <SectionHeading id="workflow-heading">The house-hack workflow</SectionHeading>
          <StepList steps={WORKFLOW_STEPS} className="mt-8" />
        </Section>

        <Section aria-labelledby="why-pick-heading">
          <SectionHeading id="why-pick-heading">Why house hackers pick TrueCap</SectionHeading>
          <RuledList items={WHY_HOUSE_HACKERS} className="mt-8 max-w-[68ch]" />
          {/* The page's one honest limit on tax allocation: a boundary, so it
              is set as a Note under the reasons rather than as one of them. */}
          <Note title="Mixed-use boundary." className="mt-8">
            TrueCap does not currently expose a tax-specific module or allocate
            basis, depreciation, or interest between personal and rental use.
            Build that calculation with a qualified tax professional.
          </Note>
        </Section>

        <Section rhythm="tight" aria-labelledby="reading-heading">
          <div className="max-w-[68ch]">
            <SectionHeading id="reading-heading">Recommended reading and tools</SectionHeading>
            <p className="mt-4 text-pretty text-lg leading-relaxed">
              Start with the deep-dive on{" "}
              <Link href="/blog/house-hacking-explained" className="tc-link">
                house hacking explained
              </Link>{" "}
              and the comparison of{" "}
              <Link href="/blog/single-family-vs-multi-family-rental" className="tc-link">
                single-family vs multi-family
              </Link>{" "}
              properties. Screen candidates fast with the free{" "}
              <Link href="/analyze?strategy=house-hack" prefetch={false} className="tc-link">
                analyzer in House Hack mode
              </Link>{" "}
              — your effective housing cost after tenant rent, in seconds.
              Once you&apos;ve picked a property, ground the
              numbers in the{" "}
              <Link href="/analyze" prefetch={false} className="tc-link">
                TrueCap analyzer
              </Link>{" "}
              — cap rate and DSCR for the rented portion — then run the year-1 screen
              with the{" "}
              <Link href="/blog/how-to-underwrite-a-rental-property-in-60-seconds" className="tc-link">
                60-second underwriting workflow
              </Link>
              .
            </p>
          </div>
        </Section>

        <CloseSection
          heading="Screen the live-in year, then preserve a separate move-out scenario."
          headingId="close-heading"
          lede="Free covers monthly out-of-pocket, cap rate, and CoC for a first-pass live-in-year screen. Pro adds saved scenarios and comparison so the later full-rental state can be modeled separately; there is no automatic year-two occupancy switch."
          actions={
            <ActionRow>
              <Link
                href="/analyze?strategy=house-hack"
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
            Evaluating a non-owner-occupied rental? See TrueCap for{" "}
            <Link href="/for-buy-and-hold" className="tc-link -my-3 inline-block py-3">
              buy-and-hold investors
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
