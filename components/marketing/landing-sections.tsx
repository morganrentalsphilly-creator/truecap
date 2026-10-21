/**
 * The homepage sections below the hero, in page order (DESIGN.md "Homepage
 * structure"): the ledger opened row by row (HowTrueCapWorks), where the
 * numbers come from (DataSourcesSection), what the client receives
 * (ClientReceivesSection), the plans (PdfProUpsell), who builds it
 * (BuiltByInvestor), verified proof (SocialProof, empty until real records
 * exist), the questions (HomepageFaq) and the close (FinalCta). FaqSection
 * (defined in faq-section.tsx, re-exported here), HomepageFaq and
 * VsCompetitors are shared with other marketing pages.
 */

// NOTE: this module is intentionally a SERVER component (no "use client").
// It is mostly static marketing prose. The interactive pieces are small
// client islands (<AnalyzeCtaLink>, <HeroAddressForm>) so the static markup
// ships no hydration cost. Keep it that way: any new interactive piece should
// be its own small island, not a reason to flip this whole file to client.
import {
  PRODUCT_EVALUATION_COMPARISON_LIMIT,
  PRODUCT_EVALUATION_DAYS,
  PRODUCT_EVALUATION_DEAL_LIMIT,
} from "@/lib/product-access";
import {
  ladderCellsForFeature,
  type FeatureKey,
} from "@/lib/entitlements-catalog";
import { agentProPlanAnswers, freePlanAnswers, proPlanAnswers } from "@/components/marketing/plan-answers";
import { parsePriceLabel } from "@/components/marketing/cadence-toggle";
import { ruleFitLabel } from "@/lib/decision-contract";
// Section and plan-card links sit below the fold: they prefetch on hover or
// focus, not on scroll (see the component's doc comment).
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { Check } from "lucide-react";
import { AnalyzeCtaLink } from "@/components/marketing/analyze-cta-link";
import { HeroAddressForm } from "@/components/marketing/hero-address-form";
import { HOMEPAGE_WALKTHROUGH_ID } from "@/components/marketing/marketing-hero";
import { CoBrandPreview, type CoBrandSample } from "@/components/home/cobrand-preview";
import { PlansToggle } from "@/components/home/plans-toggle";
import { ReceiptFlow } from "@/components/home/receipt-flow";
import { StoryObserver } from "@/components/home/story-observer";
import { DisclosureMark, LedgerVerdict } from "@/components/ledger/ledger-parts";
import { formatDscr } from "@/lib/financial-presentation";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";
import type { ReactNode } from "react";
import { ClientPdfCover } from "@/components/marketing/client-pdf-cover";
import { FaqSection } from "@/components/marketing/faq-section";
import { Note } from "@/components/marketing/page-parts";
import { PAGE_CONTAINER, Section, SectionHeading } from "@/components/marketing/section";
import { OpenLedger } from "@/components/ledger/open-ledger";
import { buttonVariants } from "@/components/ui/button";
import { CLIENT_RECEIVES } from "@/lib/client-receives";
import {
  formatPublicUsd,
  PUBLIC_AGENT_PRO_ANNUAL_USD,
  PUBLIC_AGENT_PRO_MONTHLY_USD,
  PUBLIC_PRO_ANNUAL_USD,
  PUBLIC_PRO_MONTHLY_USD,
} from "@/lib/public-pricing";
import { buildSampleDealLedger, formatLedgerDollars, type SampleDealLedger } from "@/lib/sample-deal-ledger";
import { loadStripeDisplayPrice } from "@/lib/stripe/display-prices";
import { cn } from "@/lib/utils";
import { getMarketingOfferConfig } from "@/lib/marketing-offer-config";
import { VERIFIED_TESTIMONIALS, isPublicationReady } from "@/lib/proof-records";
import { JsonLd } from "@/components/seo/json-ld";
import { AGENT_FAQS } from "@/lib/agent-faqs";
import { isAgentProConfigured } from "@/lib/stripe/plan-prices";

// FaqSection lives in its own module so an article can import it without
// this file's client islands; the pages that import it from here keep working.
export { FaqSection };

// ─────────────────────────────────────────────────────── From listing to offer
/**
 * The scroll story (OVERHAUL.md §6.2, DESIGN.md "The homepage" 2): one pinned
 * sheet, built from real parts with the sample deal's figures, that changes
 * as three steps scroll past. Step 1 pastes the listing and the starting
 * values fill in with their source chips; step 2 runs the Buy Box check and
 * the binding target lights up; step 3 resolves the Offer Ceiling and the
 * send-to-client card arrives. From 1024px the sheet is sticky beside the
 * steps and StoryObserver picks the active step; on phones, and without
 * JavaScript, each step keeps its own sheet in flow. The full line items
 * stay behind "See every line": they are the proof.
 */
const STORY_STEPS = [
  {
    n: 1,
    title: "Paste the listing at the showing",
    body: "Rent fills from HUD and the rate from FRED, each labeled. Property tax stays your input, because a state average is not a parcel bill. Every assumption is yours to change.",
  },
  {
    n: 2,
    title: "Screen it against the client's Buy Box",
    body: "Cash flow, cap rate, cash-on-cash and DSCR at the asking price, a 0–100 Deal score, and whether it meets the client's targets, with the criterion it misses if it doesn't.",
  },
  {
    n: 3,
    title: "Send the Offer Ceiling, co-branded",
    body: "The highest price that still meets the client's targets, the assumptions most likely to break the deal, and a memo the client opens without an account and can rerun with their own numbers. The Offer Ceiling and the memo are included in your first complete decision; co-branding comes with Pro and Agent Pro.",
  },
] as const;

/** A row of the story's sheet: a label, a figure and its source chip. */
function SheetRow({ label, value, chip, tone }: { label: string; value: ReactNode; chip?: string; tone?: "flag" }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-rule-soft py-2 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">
        <span className="font-figure font-semibold text-foreground">{value}</span>
        {chip ? (
          <span
            className={cn(
              "ml-2 font-mono text-xs leading-4",
              tone === "flag" ? "text-highlight-text" : "text-muted-foreground",
            )}
          >
            {chip}
          </span>
        ) : null}
      </span>
    </div>
  );
}

/**
 * The story's three frames. The pinned panel renders all three (CSS shows
 * the active one); each step's inline frame, below 1024px and without
 * JavaScript, renders `only` its own, so a phone sees one frame per step.
 */
function StoryFrames({ ledger, only }: { ledger: SampleDealLedger; only?: 1 | 2 | 3 }) {
  const values = SAMPLE_DEAL_FIXTURE.values;
  const frameClass = "rounded-lg bg-card p-4 shadow-lg sm:p-5";
  const caption = "flex justify-between gap-3 border-b border-border pb-2 font-mono text-xs text-muted-foreground";
  const shortfall = ledger.cashFlowShortfall;
  const show = (n: 1 | 2 | 3) => only == null || only === n;
  return (
    <>
      {show(1) ? (
        <div data-story-frame="1" className={frameClass}>
          <p className={caption}>
            <span>Step 1 · the listing</span>
            <span>{ledger.title}</span>
          </p>
          <div className="mt-2">
            <SheetRow label="Asking price" value={formatLedgerDollars(ledger.askingPrice)} chip="Your input" />
            <SheetRow label="Rent" value={`${formatLedgerDollars(values.monthlyRent ?? 0)}/mo`} chip="HUD FMR" />
            <SheetRow label="Mortgage rate" value={`${values.interestRate}%`} chip="FRED rate" />
            <SheetRow label="Property tax" value={`${values.propertyTaxPct}% of price`} chip="Your input" tone="flag" />
            <SheetRow label="Down payment" value={`${values.downPaymentPct}%`} chip="TrueCap default" />
          </div>
        </div>
      ) : null}
      {show(2) ? (
        <div data-story-frame="2" className={frameClass}>
          <p className={caption}>
            <span>Step 2 · the Buy Box</span>
            <span>at asking</span>
          </p>
          <div className="mt-2">
            <div className="flex items-baseline justify-between gap-3 border-b border-rule-soft py-2 text-sm">
              <span>
                Cash flow after reserves
                <span className="block text-xs text-muted-foreground">Target ≥ {formatLedgerDollars(ledger.target.monthlyCashFlow ?? 0)}/mo · binding</span>
              </span>
              <span className="text-right">
                <span className="font-figure font-semibold">{formatLedgerDollars(ledger.cashFlowMonthly.asking)}/mo</span>
                <span className="block text-xs font-semibold text-highlight-text">
                  {shortfall != null ? `Misses by ${formatLedgerDollars(shortfall)}` : "Meets"}
                </span>
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-2 text-sm">
              <span>
                DSCR
                <span className="block text-xs text-muted-foreground">Target ≥ {ledger.target.dscr}</span>
              </span>
              <span className="text-right">
                <span className="font-figure font-semibold">{formatDscr(ledger.dscr.asking, true)}</span>
                <span className="block text-xs font-semibold text-positive">Meets</span>
              </span>
            </div>
            <p className="mt-2 border-t border-border pt-2 text-sm">
              Meets the Buy Box at asking:{" "}
              <LedgerVerdict pass={ledger.meetsTargets.asking}>{ledger.meetsTargets.asking ? "Yes" : "No"}</LedgerVerdict>
            </p>
          </div>
        </div>
      ) : null}
      {show(3) ? (
        <div data-story-frame="3" className={frameClass}>
          <p className={caption}>
            <span>Step 3 · the Offer Ceiling</span>
            <span>send to client</span>
          </p>
          <div className="mt-3 flex items-baseline justify-between gap-3">
            <span className="font-display text-lg">Offer Ceiling</span>
            <span className="highlight-stroke font-display font-figure text-key-sm">{formatLedgerDollars(ledger.offerCeiling)}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {ledger.belowAsking > 0 ? `${formatLedgerDollars(ledger.belowAsking)} below asking.` : "Asking clears the targets."}{" "}
            Meets the Buy Box: <LedgerVerdict pass={ledger.meetsTargets.ceiling}>{ledger.meetsTargets.ceiling ? "Yes" : "No"}</LedgerVerdict>.
          </p>
          <div className="mt-3 border-t border-border pt-3 text-sm">
            <p className="font-semibold">Send to client</p>
            <p className="text-muted-foreground">A share link that opens without an account, and the decision memo, co-branded with Pro.</p>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function HowTrueCapWorks() {
  const ledger = buildSampleDealLedger();
  const [analyze, screen, ceiling] = STORY_STEPS;
  const notes = {
    price: { lead: `${analyze.title}.`, body: analyze.body },
    buyBox: { lead: `${screen.title}.`, body: screen.body },
    ceiling: { lead: `${ceiling.title}.`, body: ceiling.body },
  };
  return (
    <Section id={HOMEPAGE_WALKTHROUGH_ID} rhythm="open" aria-labelledby="how-it-works-heading" data-story-root="">
      <SectionHeading id="how-it-works-heading">From listing to offer in three steps.</SectionHeading>
      {ledger ? (
        <StoryObserver rootId={HOMEPAGE_WALKTHROUGH_ID}>
          <div className="mt-8 grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start xl:gap-x-16">
            <ol className="grid gap-10 lg:gap-0">
              {STORY_STEPS.map((step) => (
                <li key={step.n} data-story-step={step.n} className="grid gap-4 lg:min-h-[20rem] lg:py-8">
                  <div className="flex gap-4">
                    <span aria-hidden className="mt-1 w-8 shrink-0 font-figure text-sm font-semibold text-muted-foreground">
                      {step.n}
                    </span>
                    <div>
                      <h3 className="font-display text-h3-sm sm:text-2xl">{step.title}</h3>
                      <p className="mt-2 max-w-[56ch] text-pretty text-base leading-relaxed text-muted-foreground">{step.body}</p>
                    </div>
                  </div>
                  {/* The step's own sheet (this step's frame only), in flow
                      below 1024px and without JavaScript. */}
                  <div className="lg:hidden" data-story-inline-frame={step.n}>
                    <StoryFrames ledger={ledger} only={step.n} />
                  </div>
                </li>
              ))}
            </ol>
            {/* The pinned sheet from 1024px: the three frames stack and the active one shows (globals.css). */}
            <div className="hidden lg:sticky lg:top-24 lg:grid" aria-hidden data-story-panel="">
              <StoryFrames ledger={ledger} />
            </div>
          </div>
          <details className="tc-accordion group mt-10 border-t border-border">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 text-base font-semibold [&::-webkit-details-marker]:hidden">
              See every line
              <DisclosureMark />
            </summary>
            <div className="pb-4">
              <OpenLedger ledger={ledger} notes={notes} />
            </div>
          </details>
        </StoryObserver>
      ) : (
        // The sample deal failed to compute: the steps still read in order.
        <ol className="mt-8 border-t border-foreground">
          {STORY_STEPS.map((step) => (
            <li key={step.n} className="border-b border-border py-5">
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="mt-1 max-w-[62ch] leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3">
        <AnalyzeCtaLink analyticsSource="how_it_works" className={buttonVariants({ size: "cta" })}>
          Analyze a deal free
        </AnalyzeCtaLink>
        <p className="text-sm text-muted-foreground">Free · no card · no signup</p>
      </div>
    </Section>
  );
}

/**
 * Founder/trust block (2026-09 positioning pass), condensed in the 2026-10
 * overhaul. Facts come from /about only: one rental investor in Philadelphia,
 * built for their own underwriting. The founder is described, never named
 * (their request, 2026-09-07): no name, photo, portfolio size, returns, or
 * customer counts belong here.
 */
export function BuiltByInvestor() {
  return (
    <Section rhythm="tight" data-homepage-block="built-by-investor">
      <div className="max-w-[68ch]">
        <SectionHeading>
          Built by a rental investor. Now built for the agents who serve them, too.
        </SectionHeading>
        <p className="mt-4 text-lg leading-relaxed">
          TrueCap is built by one person, a rental investor in Philadelphia, to
          answer one question before every offer: what price makes this
          property work? The defaults lean conservative, every assumption is
          editable, and the core formulas are published.
        </p>
        <p className="mt-3 flex flex-wrap gap-x-6 text-base">
          <IntentPrefetchLink href="/about" className="tc-link inline-flex min-h-11 items-center">
            About TrueCap
          </IntentPrefetchLink>
          <IntentPrefetchLink href="/methodology" className="tc-link inline-flex min-h-11 items-center">
            Read the methodology
          </IntentPrefetchLink>
        </p>
      </div>
    </Section>
  );
}

/**
 * Closing ask on the navy band (DESIGN.md "The homepage" 6): the sheet
 * inverted, the address field again, not a button that scrolls back up.
 */
export function FinalCta() {
  return (
    <section className="bg-navy-grid text-navy-foreground" aria-labelledby="final-cta-heading">
      <div className={cn(PAGE_CONTAINER, "grid gap-x-12 gap-y-6 py-18 sm:py-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end xl:gap-x-16")}>
        <div>
          <h2 id="final-cta-heading" className="font-display text-balance text-section-sm text-white sm:text-section">
            Paste the listing. Send the deal that already pencils.
          </h2>
          <p className="mt-4 max-w-[56ch] text-pretty text-lg leading-relaxed text-navy-muted">
            Your first complete decision includes cash flow, cap rate, CoC, DSCR,
            Buy Box fit, the Offer Ceiling, downside checks, and next
            steps. No account or card required.
          </p>
        </div>
        <div>
          <HeroAddressForm placement="close" tone="dark" className="max-w-none lg:mt-0" />
          <p className="mt-4 border-t border-navy-line pt-2.5 text-base text-navy-muted">
            Buying for your own portfolio?{" "}
            <IntentPrefetchLink href="/for-investors" className="-my-3 inline-block py-3 text-white underline underline-offset-[3px]">
              See TrueCap for investors
            </IntentPrefetchLink>
          </p>
        </div>
      </div>
    </section>
  );
}

export function SocialProof() {
  const proof = VERIFIED_TESTIMONIALS.filter((record) =>
    isPublicationReady(record, "homepage"),
  );
  // Usage proof, sourced assumptions, the computed sample, and the working
  // analyzer remain on the page. Customer quotes do not render until the
  // evidence + approval fields in lib/proof-records.ts are complete.
  if (proof.length === 0) return null;
  // Feature the most detailed quote; stack the rest beside it. Auto-picks
  // the longest quote so this stays correct if the array is reordered.
  const featured = proof.reduce((a, b) =>
    b.quote.length > a.quote.length ? b : a,
  );
  const rest = proof.filter((p) => p !== featured);
  return (
    <Section aria-labelledby="social-proof-heading">
      <SectionHeading id="social-proof-heading">
        Built for people who actually close deals.
      </SectionHeading>
      <div className="mt-8 grid gap-x-12 gap-y-8 lg:grid-cols-5">
        {/* The most detailed quote gets the most room; the rest sit beside it. */}
        <figure className="border-t border-foreground pt-5 lg:col-span-3">
          <blockquote className="text-xl leading-relaxed sm:text-2xl">
            &ldquo;{featured.quote}&rdquo;
          </blockquote>
          <figcaption className="mt-4 text-sm">
            <span className="font-semibold">{featured.customerName}</span>
            <span className="block text-muted-foreground">
              {featured.customerType}
              {featured.portfolioSize ? ` · ${featured.portfolioSize}` : ""}
            </span>
          </figcaption>
        </figure>
        <div className="grid content-start gap-8 lg:col-span-2">
          {rest.map((p) => (
            <figure key={p.id} className="border-t border-border pt-5">
              <blockquote className="text-base leading-relaxed">&ldquo;{p.quote}&rdquo;</blockquote>
              <figcaption className="mt-3 text-sm">
                <span className="font-semibold">{p.customerName}</span>
                <span className="block text-muted-foreground">
                  {p.customerType}
                  {p.portfolioSize ? ` · ${p.portfolioSize}` : ""}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
      <p className="mt-8 text-base">
        <IntentPrefetchLink href="/reviews" className="tc-link inline-flex min-h-11 items-center font-medium">
          See verified proof &amp; methodology
        </IntentPrefetchLink>
      </p>
    </Section>
  );
}

// ───────────────────────────────────────── Why TrueCap: the workflow comparison
/**
 * The /why-truecap comparison (that page is its only caller; its hero carries
 * the H1 and the lede). Three workflows set as ruled columns under one heavy
 * rule, each with its name as the heading, the thesis under it and a ruled
 * definition list (PlanCard's grammar without the card). No column is
 * emphasised: blue means "act here" (DESIGN.md color), and the block argues
 * it is a fair comparison. From 1024px the columns share their rows
 * (subgrid), so "Best when" and "Tradeoff" line up across them. The heavy
 * rule opens the block once at every width; stacked on a phone, each later
 * column opens on the 1px section rule, so the phone shows one heavy rule per
 * block, as the desktop grid does.
 *
 * Then "A deliberately fair comparison", its own section under its own H2
 * (it answers the H1's "vs DealCheck & BiggerPockets", so it is not a fourth
 * column name): when DealCheck fits better and when TrueCap does, two lists
 * that share their rows from 768px (subgrid, like the columns above), so
 * their rules line up; then BiggerPockets on its own line under both, not as
 * fine print in TrueCap's column. Each claim links the competitor's own page
 * as its source. The claims stay as written; the links are their
 * substantiation.
 */
const WORKFLOW_COMPARISONS = [
  {
    name: "Spreadsheet",
    thesis: "You build the model.",
    bestFor:
      "Full control over formulas, layouts, and one-off deal structures.",
    tradeoff:
      "You own the setup, data entry, formula maintenance, and interpretation.",
  },
  {
    name: "Traditional analysis software",
    thesis: "It calculates the deal.",
    bestFor:
      "Mature calculators, listing imports, mobile apps, and established workflows.",
    tradeoff:
      "The user may still need more setup and interpretation before choosing a next step.",
  },
  {
    name: "TrueCap",
    thesis: "It turns the deal into a decision.",
    bestFor:
      "An address-first screen connected to Buy Box, Offer Ceiling, downside, and presentation.",
    tradeoff:
      "It is intentionally opinionated and is a first-pass decision tool, not a replacement for due diligence.",
  },
] as const;

export function VsCompetitors() {
  return (
    <>
      {/* No top rule: the page hero's bottom rule already sits above it. */}
      <Section rule="none" aria-labelledby="why-truecap-workflows-heading">
        <SectionHeading id="why-truecap-workflows-heading" className="max-w-3xl">
          Choose the workflow that fits how you invest.
        </SectionHeading>
        <div className="mt-8 grid gap-y-10 border-t border-foreground lg:grid-cols-3 lg:gap-x-12 lg:gap-y-0">
          {WORKFLOW_COMPARISONS.map((item) => (
            <article
              key={item.name}
              className="min-w-0 max-w-[68ch] border-t border-border pt-5 first:border-t-0 lg:row-span-4 lg:grid lg:max-w-none lg:grid-rows-subgrid lg:border-t-0"
            >
              <h3 className="font-display text-balance text-h3-sm sm:text-2xl">
                {item.name}
              </h3>
              <p className="mt-1 text-pretty text-lg font-semibold">{item.thesis}</p>
              <dl className="mt-4 border-t border-border text-base lg:row-span-2 lg:grid lg:grid-rows-subgrid">
                <div className="border-b border-rule-soft py-2.5">
                  <dt className="font-semibold">Best when</dt>
                  <dd className="mt-0.5 text-pretty leading-relaxed text-muted-foreground">
                    {item.bestFor}
                  </dd>
                </div>
                <div className="border-b border-rule-soft py-2.5">
                  <dt className="font-semibold">Tradeoff</dt>
                  <dd className="mt-0.5 text-pretty leading-relaxed text-muted-foreground">
                    {item.tradeoff}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </Section>
      <Section aria-labelledby="why-truecap-fair-heading">
        <SectionHeading id="why-truecap-fair-heading" className="max-w-3xl">
          A deliberately fair comparison
        </SectionHeading>
        {/* From 768px each column spans six shared rows (its name, four
            items, its source line) and each list four of them, so row N has
            one height in both lists and their rules meet. */}
        <div className="mt-8 grid gap-x-12 gap-y-10 border-t border-foreground md:grid-cols-2 md:gap-y-0">
          <div className="min-w-0 pt-4 md:row-span-6 md:grid md:grid-rows-subgrid">
            <h3 className="text-balance text-lg font-semibold">
              DealCheck may fit better if you want
            </h3>
            <ul className="mt-3 border-t border-border text-base leading-relaxed md:row-span-4 md:grid md:grid-rows-subgrid">
              <li className="border-b border-rule-soft py-2.5">
                Native iOS and Android apps.
              </li>
              <li className="border-b border-rule-soft py-2.5">
                Established listing-import and property-comparison workflows.
              </li>
              <li className="border-b border-rule-soft py-2.5">
                Its Offer Calculator and custom purchase-criteria workflow.
              </li>
              {/* The shared DealCheck sentence (dealcheck.io/pricing as
                  rendered 2026-10-01: "Property Reports with Custom
                  Branding" is unavailable on Starter and Plus). */}
              <li className="border-b border-rule-soft py-2.5">
                PDF reports. Every DealCheck plan exports a PDF report;
                putting your own name and logo on it needs DealCheck Pro.
              </li>
            </ul>
            <p className="mt-3 max-w-[64ch] text-pretty text-sm leading-relaxed text-muted-foreground">
              Verify on DealCheck&apos;s official{" "}
              <a
                className="tc-link"
                href="https://dealcheck.io/pricing/"
                target="_blank"
                rel="noopener noreferrer"
              >
                pricing
              </a>
              ,{" "}
              <a
                className="tc-link"
                href="https://help.dealcheck.io/en/articles/2047630-using-the-offer-calculator-to-calculate-offers-to-sellers"
                target="_blank"
                rel="noopener noreferrer"
              >
                Offer Calculator
              </a>
              , and{" "}
              <a
                className="tc-link"
                href="https://help.dealcheck.io/en/articles/2259844-screening-properties-with-custom-investment-criteria"
                target="_blank"
                rel="noopener noreferrer"
              >
                criteria
              </a>{" "}
              pages.
            </p>
          </div>
          <div className="min-w-0 border-t border-border pt-4 md:row-span-6 md:grid md:grid-rows-subgrid md:border-t-0">
            <h3 className="text-balance text-lg font-semibold">
              TrueCap may fit better if you want
            </h3>
            <ul className="mt-3 border-t border-border text-base leading-relaxed md:row-span-4 md:grid md:grid-rows-subgrid">
              <li className="border-b border-rule-soft py-2.5">
                A no-signup, address-first screen with editable sourced
                assumptions.
              </li>
              <li className="border-b border-rule-soft py-2.5">
                Buy Box fit on every deal.
              </li>
              <li className="border-b border-rule-soft py-2.5">
                Offer Ceiling, downside, and a decision-review package in one
                sequence.
              </li>
              <li className="border-b border-rule-soft py-2.5">
                Screening for investor clients: Buy Boxes you assign to
                clients (up to 12 per account), client-report links that open
                without an account, and a co-branded decision memo.
              </li>
            </ul>
          </div>
        </div>
        <Note className="mt-10">
          BiggerPockets may fit better for its community and education
          ecosystem; see its official{" "}
          <a
            className="tc-link"
            href="https://www.biggerpockets.com/rental-property-calculator"
            target="_blank"
            rel="noopener noreferrer"
          >
            Rental Property Calculator
          </a>
          .
        </Note>
      </Section>
    </>
  );
}

// ───────────────────────────────────────── FAQ
/**
 * Homepage FAQ - handles the most common cold-paid-traffic objections
 * and outputs FAQPage JSON-LD for Google rich results (the expandable
 * Q&A snippets that show under the listing). Materially boosts CTR
 * from organic AND paid for the keywords we rank for.
 */
// Objection-ordered (2026-08 rollout): the free-calculator objection first,
// data accuracy second, price third — then logistics. These are the three
// questions that actually decide whether a cold visitor converts.
const HOMEPAGE_FAQS: { q: string; a: string }[] = [
  {
    q: "Why not just use a free calculator?",
    a: "Most free calculators stop at metrics. Your first TrueCap decision also shows Buy Box fit, the Offer Ceiling (the highest price that still meets your targets), downside checks, and next steps.",
  },
  {
    q: "What does the auto-fill provide?",
    a: "Rent starts from a HUD benchmark (ZIP-level when available, otherwise the HUD Fair Market Rent area; when an address has no county match, a statewide HUD figure, labeled as such), not a property-specific rent comp. The rate starts from FRED's national 30-year benchmark, not an investor lender quote. Property tax is a local number: enter the annual bill or a reviewed rate. Until you do, the model labels its 1.1% tax assumption as a default to replace. Swap every starting assumption for property-specific evidence before you act on a decision.",
  },
  {
    q: "Is TrueCap really free?",
    a: `Yes. Your first complete decision needs no account or card. Create an account for a ${PRODUCT_EVALUATION_DAYS}-day free trial with no card: ${PRODUCT_EVALUATION_DEAL_LIMIT} Pro analyses and ${PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison. A rerun with changed inputs counts as a new analysis. Pro is for knowing what to offer on every deal: Buy Box fit, the Offer Ceiling, downside checks, comparisons, and reports.`,
  },
  {
    q: "Do I need a credit card?",
    a: `No. The first complete decision needs no signup or card. Creating an account starts a ${PRODUCT_EVALUATION_DAYS}-day free trial with no payment method and no automatic subscription.`,
  },
  {
    q: "Can I edit the assumptions?",
    a: "Yes. Every number is editable. TrueCap starts rent and rate from labeled HUD and FRED benchmarks, keeps property tax as your local input, and marks every default so you can replace it. Change financing, expenses, and growth under “Review assumptions,” then rerun.",
  },
  {
    q: "When should I upgrade to Pro?",
    a: "Upgrade when you want the Offer Ceiling and downside checks on every deal after the free trial, plus saved deals you can edit, comparisons, your Buy Box, and reports. Monthly Pro can be cancelled anytime.",
  },
  {
    q: "How does the free trial work?",
    a: `Create an account and you get ${PRODUCT_EVALUATION_DAYS} days, ${PRODUCT_EVALUATION_DEAL_LIMIT} Pro analyses and ${PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison. A rerun with changed inputs counts as a new analysis. No card is collected, nothing auto-renews, and checkout shows the amount before a paid subscription begins.`,
  },
  {
    q: "Is this financial advice?",
    a: "No. TrueCap applies documented formulas to your inputs and labeled benchmarks. Every assumption is editable, every output is an estimate, and the decision is yours.",
  },
];

/**
 * The homepage's eight (DESIGN.md "Homepage structure" 7): the agent
 * questions that no section above already answers, plus the price question.
 * Every other question stays on /for-agents or /for-investors.
 */
export const HOMEPAGE_AGENT_FAQ_QUESTIONS = [
  "My investor clients run their own numbers. Why would I need this?",
  "Am I giving investment advice?",
  "Do my clients need a TrueCap account to view what I send?",
  "What does the client see? Is it my branding or TrueCap's?",
  "Can I keep different criteria for different investor clients?",
  "Does it work on my phone at a showing?",
  "My brokerage already gives me tools.",
] as const;
export const HOMEPAGE_INVESTOR_FAQ_QUESTIONS = ["Is TrueCap really free?"] as const;

function pickFaqs(
  source: readonly { q: string; a: string }[],
  questions: readonly string[],
): { q: string; a: string }[] {
  // A renamed question drops out rather than breaking the static page;
  // homepage-faq.test.ts fails on it instead.
  return questions.flatMap((q) => source.filter((faq) => faq.q === q));
}

/** The questions HomepageFaq shows for an audience, in order. */
export function homepageFaqItems(
  audience: "home" | "both" | "investors",
): { q: string; a: string }[] {
  if (audience === "home") {
    return [
      ...pickFaqs(AGENT_FAQS, HOMEPAGE_AGENT_FAQ_QUESTIONS),
      ...pickFaqs(HOMEPAGE_FAQS, HOMEPAGE_INVESTOR_FAQ_QUESTIONS),
    ];
  }
  return audience === "both" ? [...AGENT_FAQS, ...HOMEPAGE_FAQS] : [...HOMEPAGE_FAQS];
}

export function HomepageFaq({
  structuredData = true,
  audience = "both",
}: {
  structuredData?: boolean;
  /**
   * "home" (the homepage): the curated eight under one heading.
   * "both" (/why-truecap): the agent set, then the investor set.
   * "investors" (/for-investors): the investor set alone.
   * Whatever shows, ONE FAQPage node carries exactly the visible questions:
   * Google requires FAQ markup to mirror the visible FAQ, and
   * lib/__tests__/structured-data-f4.test.tsx enforces it per page.
   */
  audience?: "home" | "both" | "investors";
} = {}) {
  const allItems = homepageFaqItems(audience);
  return (
    <>
      {audience === "home" ? (
        <FaqSection
          id="questions"
          heading="The questions agents ask first."
          items={allItems}
          structuredData={false}
          layout="split"
        />
      ) : null}
      {/* Every audience sets its lists on the homepage's split: the heading
          beside the list from 1024px, so the rules run the container's width
          like every other section's instead of stopping at max-w-3xl. */}
      {audience === "both" ? (
        <>
          {/* Two lists, one contact line: it closes the second. */}
          <FaqSection
            id="agent-questions"
            heading="The questions agents ask first."
            items={AGENT_FAQS}
            structuredData={false}
            contact={null}
            layout="split"
          />
          <FaqSection
            id="investor-questions"
            heading="…and the ones investors ask."
            items={HOMEPAGE_FAQS}
            structuredData={false}
            compact
            layout="split"
          />
        </>
      ) : null}
      {audience === "investors" ? (
        <FaqSection
          id="investor-questions"
          heading="The questions investors ask first."
          items={HOMEPAGE_FAQS}
          structuredData={false}
          layout="split"
        />
      ) : null}
      {/* Only one URL should claim a given FAQ block in structured data. */}
      {structuredData ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: allItems.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }}
        />
      ) : null}
    </>
  );
}
// ───────────────────────────────────────── Every number has a receipt
/**
 * Where the numbers come from (OVERHAUL.md §6.3): the sources drawn as a flow
 * into the result (components/home/receipt-flow.tsx). Each node is read from
 * lib/product-facts.ts so the claims cannot drift from the product, and each
 * opens its source, its basis and what to replace it with.
 */
export function DataSourcesSection() {
  const ledger = buildSampleDealLedger();
  return (
    <Section rhythm="tight" aria-labelledby="data-sources-heading">
      <div className="max-w-3xl">
        <SectionHeading id="data-sources-heading">Every number has a receipt.</SectionHeading>
        <p className="mt-3 max-w-[62ch] text-lg leading-relaxed text-muted-foreground">
          HUD sets the rent benchmark, FRED sets the rate, you set the property
          tax. Each is labeled, each flows into the result, and each is yours to
          replace with verified property facts, local comps and lender terms.
        </p>
      </div>
      {ledger ? (
        <div className="mt-8">
          <ReceiptFlow ledger={ledger} />
        </div>
      ) : null}
    </Section>
  );
}

// ───────────────────────────────────────── Make it yours
/**
 * The co-branding preview (OVERHAUL.md §6.4): the visitor types a name and
 * picks a color, and a mock share page and PDF cover recolor live
 * (components/home/cobrand-preview.tsx), composed from the real parts with
 * the sample deal's own figures (the ledger, lib/sample-deal-ledger.ts, and
 * the product's verdict label, lib/decision-contract.ts). What the client
 * receives, exactly (lib/client-receives.ts) and page 1 of the real PDF
 * report (ClientPdfCover, shared with /for-agents) sit behind one
 * disclosure: the facts stay on the page and the section keeps its weight.
 */
export function ClientReceivesSection() {
  const ledger = buildSampleDealLedger();
  const dscrTarget = ledger?.target.dscr ?? null;
  const sample: CoBrandSample | null = ledger
    ? {
        title: ledger.title,
        verdict: ruleFitLabel(ledger.meetsTargets.asking ? "meets_selected_rules" : "does_not_meet_selected_rules"),
        offerCeiling: formatLedgerDollars(ledger.offerCeiling),
        gap:
          ledger.belowAsking > 0
            ? `Asking price is ${formatLedgerDollars(ledger.belowAsking)} above the ceiling.`
            : "Asking price clears the targets.",
        chips: [
          ...(ledger.target.monthlyCashFlow != null
            ? [
                {
                  label: `Cash flow ≥ ${formatLedgerDollars(ledger.target.monthlyCashFlow)}/mo`,
                  state:
                    ledger.cashFlowShortfall != null ? `Misses by ${formatLedgerDollars(ledger.cashFlowShortfall)}` : "Meets",
                  pass: ledger.cashFlowShortfall == null,
                },
              ]
            : []),
          ...(dscrTarget != null
            ? [
                {
                  label: `DSCR ≥ ${dscrTarget}`,
                  state: ledger.dscr.asking >= dscrTarget ? "Meets" : "Misses",
                  pass: ledger.dscr.asking >= dscrTarget,
                },
              ]
            : []),
        ],
        coverMeta: SAMPLE_DEAL_FIXTURE.display.subtitle,
      }
    : null;
  return (
    <Section id="what-your-client-receives" aria-labelledby="client-receives-heading">
      <div className="max-w-3xl">
        <SectionHeading id="client-receives-heading">Make it yours.</SectionHeading>
        <p className="mt-3 max-w-[60ch] text-lg leading-relaxed text-muted-foreground">
          Type a name and pick a color: this is what your client opens, with no
          account on their side and nothing hidden on yours. Branding is set up
          once in Settings and applies to every link and report.
        </p>
      </div>
      {sample ? <CoBrandPreview sample={sample} className="mt-8" /> : null}
      <details className="tc-accordion group mt-10 border-t border-border">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 text-base font-semibold [&::-webkit-details-marker]:hidden">
          What your client receives, exactly
          <DisclosureMark />
        </summary>
        <div className="grid gap-x-16 gap-y-10 pb-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <dl className="border-t border-border">
            {CLIENT_RECEIVES.map((item) => (
              <div key={item.key} className="border-b border-rule-soft py-4">
                <dt className="text-lg font-semibold">{item.title}</dt>
                <dd className="mt-1 max-w-[64ch] text-base leading-relaxed text-muted-foreground">{item.body}</dd>
              </div>
            ))}
          </dl>
          <ClientPdfCover className="lg:pt-2" />
        </div>
      </details>
    </Section>
  );
}

// ───────────────────────────────────────── Plans
// Honest value ladder - what each path actually unlocks. Mirrors the
// entitlements bag (lib/entitlements.ts). New one-time report checkout is
// temporarily disabled. "true" → included, "false" → not, string → a
// qualifier.
const LADDER_SUBHEADERS = ["First decision", "Paid plan"] as const;
/**
 * The Free / Pro ladder. Historical one-time Pack checkout is disabled.
 *
 * The LABEL is marketing copy and lives here. The three TIER CELLS are derived
 * from lib/entitlements-catalog — never hand-typed — because hand-typing them
 * is exactly how this table came to claim Free couldn't save deals (it can:
 * five), contradicting /pricing at the moment someone decides to pay. Change what a
 * tier includes in the catalog and every surface follows.
 *
 * `key: null` marks a row that is a policy statement rather than an
 * entitlement flag, so there is nothing in the catalog to derive it from.
 */
const LADDER_ROWS: { label: string; cells: (boolean | string)[] }[] = (
  [
    {
      label: "Complete decision workflow",
      key: null,
      cells: ["1 decision", true, true],
    },
    { label: "Cap rate · CoC · DSCR · cash flow", key: "cash_flow" },
    { label: "0–100 Deal score + context", key: "deal_score" },
    {
      label: "Decision memo/report",
      key: "pdf_export",
    },
    { label: "Offer Ceiling + Buy Box targets", key: "mao" },
    { label: "Save & revisit deals", key: "save_deal" },
    { label: "Compare deals side-by-side", key: "compare_deals" },
    { label: "Buy Box fit on every deal", key: "buy_box" },
    { label: "10-year cash-flow projection", key: "projections" },
    { label: "Downside sensitivity checks", key: "sensitivity" },
  ] as { label: string; key: FeatureKey | null; cells?: (boolean | string)[] }[]
).map(({ label, key, cells }) => {
  const fullCells = cells ?? ladderCellsForFeature(key!);
  return { label, cells: [fullCells[0], fullCells[2]] };
});

/**
 * The plans (DESIGN.md "Homepage structure" 5): Free, Pro and, where the
 * deployment sells it, Agent Pro as the page's only cards, then the Free/Pro
 * ladder under them. Amounts come from the Stripe display price with the
 * public catalog as the documented fallback (the /for-agents pattern), and
 * what each tier includes comes from lib/entitlements-catalog through
 * components/marketing/plan-answers.ts, the rows /pricing's cards read too.
 */
export async function PdfProUpsell() {
  const { proOfferName } = getMarketingOfferConfig();
  const ladderHeaders = ["Free", proOfferName] as const;
  // Agent Pro is deployment-configured; its card and link render only where
  // the tier is sold (the persona route redirects otherwise).
  const agentProConfigured = isAgentProConfigured();
  const [proMonthly, proAnnual, agentMonthly, agentAnnual] = await Promise.all([
    loadStripeDisplayPrice("pro_monthly"),
    loadStripeDisplayPrice("pro_annual"),
    agentProConfigured ? loadStripeDisplayPrice("agent_pro_monthly") : Promise.resolve(null),
    agentProConfigured ? loadStripeDisplayPrice("agent_pro_annual") : Promise.resolve(null),
  ]);
  const price = {
    proMonthly: proMonthly?.amountLabel ?? formatPublicUsd(PUBLIC_PRO_MONTHLY_USD),
    proAnnual: proAnnual?.amountLabel ?? formatPublicUsd(PUBLIC_PRO_ANNUAL_USD),
    agentMonthly: agentMonthly?.amountLabel ?? formatPublicUsd(PUBLIC_AGENT_PRO_MONTHLY_USD),
    agentAnnual: agentAnnual?.amountLabel ?? formatPublicUsd(PUBLIC_AGENT_PRO_ANNUAL_USD),
  };

  // One filled action in the row: the free analysis, the page's primary CTA.
  // The paid plans link out with the secondary button (DESIGN.md "Buttons").
  const cta = buttonVariants({ size: "cta", className: "w-full" });
  const ctaSecondary = buttonVariants({
    size: "cta",
    variant: "outline",
    className: "w-full",
  });
  const prices = {
    pro: {
      monthly: parsePriceLabel(proMonthly?.amountLabel) ?? PUBLIC_PRO_MONTHLY_USD,
      annual: parsePriceLabel(proAnnual?.amountLabel) ?? PUBLIC_PRO_ANNUAL_USD,
      monthlyLabel: price.proMonthly,
      annualLabel: price.proAnnual,
    },
    agentPro: {
      monthly: parsePriceLabel(agentMonthly?.amountLabel) ?? PUBLIC_AGENT_PRO_MONTHLY_USD,
      annual: parsePriceLabel(agentAnnual?.amountLabel) ?? PUBLIC_AGENT_PRO_ANNUAL_USD,
      monthlyLabel: price.agentMonthly,
      annualLabel: price.agentAnnual,
    },
  };

  return (
    <Section aria-labelledby="plans-heading">
      <div className="max-w-3xl">
        <SectionHeading id="plans-heading">
          Free screens the deal.{" "}
          {proOfferName} tells you what
          to offer.
        </SectionHeading>
        {/* The Pro card lists its four questions; the paragraph says only
            how the tiers divide the work. */}
        <p className="mt-3 max-w-[62ch] text-lg leading-relaxed text-muted-foreground">
          Free shows the economics before you spend more time on a property.{" "}
          {proOfferName} answers four questions on every deal.
          {agentProConfigured
            ? " Agent Pro answers them per client, with a roster."
            : ""}
        </p>
      </div>

      {/* The toggle and the cards (components/home/plans-toggle.tsx): the
          figures roll between cadences; every answer and action is set here. */}
      <PlansToggle
        freeCard={{
          audience: "See the economics before you spend more time on a property.",
          priceNote: "No account or card required.",
          answers: freePlanAnswers(),
          action: (
            <AnalyzeCtaLink analyticsSource="plans_free" className={cta}>
              Analyze a deal free
            </AnalyzeCtaLink>
          ),
        }}
        proCard={{
          name: proOfferName,
          audience: "Know what to offer on every deal.",
          answers: proPlanAnswers(),
          prices: prices.pro,
          action: (
            <IntentPrefetchLink href="/pricing" className={ctaSecondary}>
              See Pro pricing
            </IntentPrefetchLink>
          ),
          footnote: (
            <>
              Create an account for a {PRODUCT_EVALUATION_DAYS}-day free trial:{" "}
              {PRODUCT_EVALUATION_DEAL_LIMIT} Pro analyses and{" "}
              {PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison. A rerun with
              changed inputs counts as a new analysis. No card and no automatic
              subscription.
            </>
          ),
        }}
        agentProCard={
          agentProConfigured
            ? {
                rootProps: { "data-homepage-agent-pro": "" },
                audience: "Win investor clients.",
                prices: prices.agentPro,
                // Only what Agent Pro adds, with the caps the code enforces
                // (plan-answers.ts: 100 clients, 12 Buy Boxes per account).
                // Co-branding is Pro too, so it is the note, not a row.
                answers: agentProPlanAnswers(),
                note: (
                  <>
                    Plus everything in {proOfferName}, including co-branded share
                    pages and PDFs.
                  </>
                ),
                action: (
                  <IntentPrefetchLink href="/for-agents" className={ctaSecondary}>
                    See TrueCap for agents
                  </IntentPrefetchLink>
                ),
              }
            : null
        }
      />

      {/* The ladder under the cards: what exactly each tier includes, from
          the catalog, so no visitor guesses where the line is. */}
      <div
        role="region"
        aria-label="Free and Pro comparison"
        className={cn(
          "mt-12 border-t border-foreground",
          // It compares Free and Pro, so it spans exactly the first two
          // cards: two thirds of the row less half a gap (gap-5 = 1.25rem).
          agentProConfigured
            ? "md:w-[calc((100%-2.5rem)*2/3+1.25rem)]"
            : "max-w-4xl",
        )}
      >
        <table className="w-full table-fixed border-collapse text-sm [overflow-wrap:anywhere] sm:text-base">
          <colgroup>
            <col className="w-1/2" />
            <col className="w-1/4" />
            <col className="w-1/4" />
          </colgroup>
          <caption className="sr-only">
            Features included with Free and Pro
          </caption>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="sticky top-[4.5rem] bg-background py-2.5 pr-2 text-left">
                <span className="sr-only">Feature</span>
              </th>
              {ladderHeaders.map((h, i) => (
                <th key={h} scope="col" className="sticky top-[4.5rem] bg-background px-1 py-2.5 text-center font-semibold">
                  {h}
                  <span className="block text-sm font-normal text-muted-foreground">
                    {LADDER_SUBHEADERS[i]}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LADDER_ROWS.map((row) => (
              <tr key={row.label} className="border-b border-rule-soft">
                <th scope="row" className="py-2.5 pr-2 text-left font-normal">
                  {row.label}
                </th>
                {row.cells.map((cell, ci) => (
                  <td key={`${row.label}-${ci}`} className="px-1 py-2.5 text-center">
                    {/* sr-only labels so the matrix is legible to screen
                        readers / crawlers, not a wall of blank cells. */}
                    {cell === true ? (
                      <>
                        <Check aria-hidden className="mx-auto size-4 text-foreground" />
                        <span className="sr-only">Included</span>
                      </>
                    ) : cell === false ? (
                      <>
                        <span aria-hidden className="text-muted-foreground">–</span>
                        <span className="sr-only">Not included</span>
                      </>
                    ) : (
                      <span className="text-sm">{cell}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/** Retired placement retained as a no-op for import compatibility. */
export function NeverOverpayGuarantee() {
  return null;
}
