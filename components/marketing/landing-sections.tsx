/**
 * Mid-page landing sections that fire BELOW the hero and ABOVE the
 * calculator. Each section is built to convert paid traffic by
 * directly addressing the highest-frequency objections:
 *
 *  - WhyNotSpreadsheet   → "I already use a spreadsheet"
 *  - HowItWorks          → "I don't know what this thing actually does"
 *  - SocialProof         → "Who else is using this?"
 *  - PreCalculatorCta    → "I want to try it but where do I click?"
 *
 * Each section anchor-scrolls to #main (the calculator) on its primary
 * CTA, so the visitor never has to hunt for where to convert.
 */

// NOTE: this module is intentionally a SERVER component (no "use client").
// It's 500+ lines of mostly-static marketing prose (objection-killers, the
// HowItWorks 3-step, social proof, pre-calc CTA). The only interactive
// behavior is the 3 "scroll to the calculator" buttons, which have been
// extracted into the <ScrollToFormButton> client island so we don't pay
// the hydration cost for all the static markup. Keep it that way - any
// new interactive piece should be its own small island, not a reason to
// flip this whole file back to client.
import {
  PRODUCT_EVALUATION_COMPARISON_LIMIT,
  PRODUCT_EVALUATION_DAYS,
  PRODUCT_EVALUATION_DEAL_LIMIT,
} from "@/lib/product-access";
import { ladderCellsForFeature, type FeatureKey } from "@/lib/entitlements-catalog";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  Clock,
  FileText,
  Gauge,
  GitCompareArrows,
  HelpCircle,
  Home,
  ListChecks,
  Percent,
  Quote,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { ScrollToFormButton } from "@/components/marketing/scroll-to-form-button";
import { PersonaSeedLink } from "@/components/marketing/persona-seed-link";
import type { HandoffStrategyKey } from "@/lib/analyzer-handoff";
import { getMarketingOfferConfig } from "@/lib/marketing-offer-config";
import { VERIFIED_TESTIMONIALS, isPublicationReady } from "@/lib/proof-records";

// ─────────────────────────────────────────────────────── How It Works
// ───────────────────────────────────────── Why not a spreadsheet
// The rows that lived here were consolidated into the merged WhyTrueCap table
// below (alongside DealCheck / BiggerPockets) and kept only as a dead `void`
// reference. Removed 2026-08-28: one row claimed tax and depreciation
// modelling as a TrueCap capability, and that output belongs to the
// tax_strategy feature which entitlements-catalog marks shipped:false. Note the
// phrase itself is not repeated here — lib/__tests__/unshipped-feature-claims
// greps this file for it, and a comment quoting the claim would trip the very
// guard that keeps it gone. Dead code that asserts
// something untrue is one careless re-render away from being a live false
// claim, so it does not get to sit here waiting.

/**
 * THE SPINE — "Analyze the deal. Know your number. Make the offer."
 *
 * Replaces three sections that each explained a slice of the same progression
 * (HowItWorks, WhyNotSpreadsheet, AcquisitionPipeline). The site kept selling
 * capabilities individually — a calculator here, an underwriting suite there,
 * deal management somewhere else — so a visitor had to assemble the story
 * themselves. One section, three steps, in the order the work actually happens.
 */
const SPINE_STEPS = [
  {
    key: "analyze",
    label: "Analyze",
    icon: Search,
    title: "Start with an address",
    body:
      "Area rent and a national owner-occupied mortgage-rate benchmark can fill from HUD and FRED. Property tax stays manual because a state aggregate is not a parcel bill. Every assumption stays yours to review and change.",
  },
  {
    key: "decide",
    label: "Decide",
    icon: Gauge,
    title: "See the real economics",
    body:
      "Cash flow, cap rate, cash-on-cash and DSCR, plus a 0-100 Screening Index and plain-English context for the modeled economics.",
  },
  {
    key: "offer",
    label: "Ceiling",
    icon: Target,
    title: "Review the Offer Ceiling",
    body:
      "TrueCap calculates the highest modeled price that still meets the selected targets under the assumptions shown. Compare that Offer Ceiling with asking, then verify the inputs before recording your decision.",
    proNote: "Included in your first complete decision",
  },
] as const;

export function HowTrueCapWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 border-t border-border bg-card/40">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-10 text-center sm:mb-12">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">The decision gap</p>
          <h2 className="mt-2 text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            The problem isn&apos;t calculating the deal. It&apos;s deciding{" "}
            <span className="text-primary">what to do next.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-[60ch] text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
            Should you pursue it? What price makes it work? What happens if the
            assumptions change? TrueCap connects those questions in one workflow.
          </p>
        </div>
        <ol className="tc-reveal relative grid gap-10 sm:grid-cols-3 sm:gap-8">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-6 hidden border-t border-dashed border-border sm:block"
          />
          {SPINE_STEPS.map((step) => (
            <li key={step.key} className="relative flex gap-4 sm:block">
              <span className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-card text-primary shadow-sm">
                <step.icon className="size-5" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-primary sm:mt-4 sm:block">
                  {step.label}
                </span>
                <h3 className="mt-1 text-lg font-bold tracking-tight text-foreground">{step.title}</h3>
                <p className="mt-1.5 max-w-[42ch] text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                {"proNote" in step && step.proNote ? (
                  <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-[var(--brand-orange)]/30 bg-[var(--brand-orange)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--brand-orange-text)]">
                    {step.proNote}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-10 text-center">
          <ScrollToFormButton className="group inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_10px_24px_rgba(0,112,196,0.28)] hover:-translate-y-0.5 transition-transform">
            Analyze a property free
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </ScrollToFormButton>
          <p className="mt-2 text-xs text-muted-foreground">Free · no card · no signup</p>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────── The expensive mistake
/**
 * Problem block (2026-08 offer rollout): dollar-denominates the stake the
 * whole product exists to protect — overpaying on the asset — before the
 * page starts explaining features. The arithmetic is deliberately simple
 * and checkable (3% × $250,000 = $7,500), mirroring the /pricing
 * avoided-mistake block so the two surfaces can't drift apart in spirit.
 */
export function ProblemBlock() {
  return (
    <section className="border-t border-border bg-card/40">
      <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-20">
        <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
          The expensive mistake
        </p>
        <h2 className="mt-2 text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Nobody loses money on the spreadsheet.{" "}
          <span className="text-primary">They lose it at the offer.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-[58ch] text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
          Overpaying by even 3% on a $250,000 rental is $7,500 gone before you
          collect a dollar of rent — and negative cash flow compounds it every
          month after. The protection isn&apos;t more metrics; it&apos;s knowing
          the target-dependent Offer Ceiling before you negotiate. That&apos;s the number
          TrueCap computes from the assumptions shown.
        </p>
      </div>
    </section>
  );
}

// ───────────────────────────────────────── The decision-system offer
const OFFER_MODULES = [
  [Clock, "60-Second Underwriter", "Turn an address into a reviewable first-pass underwrite without rebuilding a spreadsheet."],
  [ShieldCheck, "Target Profiles", "Save reviewed criteria and evaluate each opportunity against the same user-defined rules."],
  [Target, "Offer Ceiling", "Calculate the highest modeled price that still meets your return targets under the assumptions shown."],
  [Activity, "Downside Stress Test", "See how lower rent, higher vacancy, price, and rate changes affect the decision."],
  [GitCompareArrows, "Deal Comparison", "Put saved opportunities side by side to review their modeled tradeoffs consistently."],
  [BarChart3, "Long-Term Wealth View", "Model cash flow, debt paydown, and equity over a 10-year holding period."],
  [ListChecks, "Acquisition Pipeline", "Move saved deals from research to offer, under contract, closed, or passed."],
  [FileText, "Lender & Partner Reports", "Package the underwrite for lenders, partners, clients, or internal review."],
] as const;

export function OfferEngineSection() {
  const { proOfferName } = getMarketingOfferConfig();
  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="max-w-3xl">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">{proOfferName}</p>
          <h2 className="mt-2 text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Focused first-pass rental <span className="text-primary">underwriting.</span>
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Free shows the core economics. Pro adds reusable assumptions,
            explicit target pricing, comparison, deeper scenarios, and durable reports.
          </p>
        </div>

        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {OFFER_MODULES.map(([Icon, name, outcome]) => {
            const featured = name === "Offer Ceiling";
            return (
              <article
                key={name}
                className={featured
                  ? "rounded-2xl border-2 border-primary/35 bg-[var(--brand-blue-light)] p-5 sm:col-span-2"
                  : "rounded-2xl border border-border bg-card p-5"}
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 font-extrabold text-foreground">{name}</h3>
                <p className={`mt-1.5 text-sm leading-relaxed ${featured ? "text-foreground/80" : "text-muted-foreground"}`}>{outcome}</p>
                {featured ? (
                  <p className="mt-4 border-t border-primary/20 pt-3 text-xs font-semibold text-[var(--brand-blue-text)]">
                    Review the highest modeled price that still clears the targets you explicitly adopted.
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Everything you get</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Buy Box Builder", "Set the cash flow, CoC, DSCR, cap rate, price, strategy, property type, and market criteria that matter."],
              ["Due Diligence Checklist", "Keep property-specific verification tasks and supporting documents with the saved deal."],
              ["Offer Prep Report", "Package the asking price, decision, assumptions, projections, and downside analysis for review."],
              ["Financing Scenarios", "Compare mortgage structures and reuse saved assumptions without changing the base deal."],
            ].map(([title, body]) => (
              <div key={title}>
                <h3 className="text-sm font-bold text-foreground">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Closing ask. The page has made its case by here; this is the one job left —
 * send them back to the address field they scrolled past.
 */
export function FinalCta() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-20">
        <h2 className="text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Put in an address. Understand the deal.{" "}
          <span className="text-primary">Review the Offer Ceiling.</span>
        </h2>
        <p className="mx-auto mt-3 max-w-[52ch] text-balance text-sm leading-relaxed text-muted-foreground">
          Your first complete decision includes cash flow, cap rate, CoC, DSCR,
          rule-fit context, the Offer Ceiling, downside checks, and next steps—no
          account or card required.
        </p>
        <ScrollToFormButton analyticsSource="final_cta" className="group mt-6 inline-flex h-12 items-center gap-1.5 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] hover:-translate-y-0.5 transition-transform">
          Analyze a property free
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </ScrollToFormButton>
      </div>
    </section>
  );
}

export function SocialProof() {
  const proof = VERIFIED_TESTIMONIALS.filter((record) => isPublicationReady(record, "homepage"));
  // Usage proof, sourced assumptions, the computed sample, and the working
  // analyzer remain on the page. Customer quotes do not render until the
  // evidence + approval fields in lib/proof-records.ts are complete.
  if (proof.length === 0) return null;
  // Feature the most detailed quote; stack the rest beside it. Auto-picks
  // the longest quote so this stays correct if the array is reordered.
  const featured = proof.reduce((a, b) => (b.quote.length > a.quote.length ? b : a));
  const rest = proof.filter((p) => p !== featured);
  return (
    <section className="border-t border-border bg-card/40">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-10 text-center sm:mb-12">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Used by real investors</p>
          <h2 className="mt-2 text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Built for people who actually close deals.
          </h2>
        </div>
        <div className="tc-reveal grid gap-4 sm:gap-5 lg:grid-cols-5">
          {/* Featured quote - the most detailed, given the most room. */}
          <figure className="flex flex-col rounded-2xl border border-border bg-card p-7 sm:p-8 lg:col-span-3">
            <Quote className="size-7 text-primary/30" />
            <blockquote className="mt-4 flex-1 text-lg leading-relaxed text-foreground sm:text-xl">
              &ldquo;{featured.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-5 border-t border-border pt-4 text-sm">
              <div className="font-bold text-foreground">{featured.customerName}</div>
              <div className="mt-0.5 font-semibold text-muted-foreground">
                {featured.customerType}{featured.portfolioSize ? ` · ${featured.portfolioSize}` : ""}
              </div>
            </figcaption>
          </figure>
          {/* Supporting quotes - stacked beside the feature. */}
          <div className="grid gap-4 sm:gap-5 lg:col-span-2">
            {rest.map((p) => (
              <figure
                key={p.id}
                className="flex h-full flex-col rounded-2xl border border-border bg-card p-6"
              >
                <Quote className="size-5 text-primary/30" />
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-foreground">
                  &ldquo;{p.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-4 border-t border-border pt-3 text-xs">
                  <div className="font-bold text-foreground">{p.customerName}</div>
                  <div className="mt-0.5 font-semibold text-muted-foreground">
                    {p.customerType}{p.portfolioSize ? ` · ${p.portfolioSize}` : ""}
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
        <div className="mt-6 text-center">
          <Link
            href="/reviews"
            className="text-sm font-bold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
          >
            See verified proof &amp; methodology →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────── Vs competitors (consolidated)
/**
 * Single "Why TrueCap" comparison matrix covering BOTH the spreadsheet
 * objection and the DealCheck / BiggerPockets objection. Previously
 * there were two separate tables back-to-back; design critique flagged
 * that as "two walls of we're better" fighting for the same attention.
 * Consolidated here:
 *   - Spreadsheet column: where it falls down (text annotations)
 *   - DealCheck / BiggerPockets columns: feature parity vs gaps
 *   - TrueCap column: branded, primary, highlighted
 *
 * Rows ordered by descending discriminator value - start with the
 * differences that matter most (free tier depth, address auto-fill),
 * end with the price/pricing line so the reader leaves with cost
 * context. The "highlight" flag bolds rows where TrueCap is uniquely
 * differentiated against ALL three alternatives.
 */
const WORKFLOW_COMPARISONS = [
  {
    name: "Spreadsheet",
    thesis: "You build the model.",
    bestFor: "Full control over formulas, layouts, and one-off deal structures.",
    tradeoff: "You own the setup, data entry, formula maintenance, and interpretation.",
  },
  {
    name: "Traditional analysis software",
    thesis: "It calculates the deal.",
    bestFor: "Mature calculators, listing imports, mobile apps, and established workflows.",
    tradeoff: "The user may still need more setup and interpretation before choosing a next step.",
  },
  {
    name: "TrueCap",
    thesis: "It turns the deal into a decision.",
    bestFor: "An address-first screen connected to Buy Box, Offer Ceiling, downside, and presentation.",
    tradeoff: "It is intentionally opinionated and is a first-pass decision tool, not a replacement for due diligence.",
  },
] as const;

// ───────────────────────────────────────── Press / "As featured in"
export function VsCompetitors() {
  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-10 text-center sm:mb-12">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
            Why TrueCap
          </p>
          <h2 className="mt-2 text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Choose the workflow that fits how you invest.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            These tools overlap. The meaningful difference is how they move you
            from a listing to a decision—not whether one can win every feature row.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {WORKFLOW_COMPARISONS.map((item) => (
            <article
              key={item.name}
              className={`rounded-2xl border p-6 ${
                item.name === "TrueCap"
                  ? "border-primary/35 bg-primary/[0.04]"
                  : "border-border bg-card"
              }`}
            >
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {item.name}
              </p>
              <h3 className="mt-2 text-xl font-extrabold tracking-tight text-foreground">
                {item.thesis}
              </h3>
              <dl className="mt-5 space-y-4 text-sm leading-relaxed">
                <div>
                  <dt className="font-bold text-foreground">Best when</dt>
                  <dd className="mt-1 text-muted-foreground">{item.bestFor}</dd>
                </div>
                <div>
                  <dt className="font-bold text-foreground">Tradeoff</dt>
                  <dd className="mt-1 text-muted-foreground">{item.tradeoff}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h3 className="text-lg font-extrabold text-foreground">A deliberately fair comparison</h3>
          <div className="mt-4 grid gap-6 text-sm leading-relaxed md:grid-cols-2">
            <div>
              <p className="font-bold text-foreground">DealCheck may fit better if you want</p>
              <ul className="mt-2 space-y-1.5 text-muted-foreground">
                <li>Native iOS and Android apps.</li>
                <li>Established listing-import and property-comparison workflows.</li>
                <li>Its Offer Calculator and custom purchase-criteria workflow.</li>
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                Verify on DealCheck&apos;s official{" "}
                <a className="underline hover:text-foreground" href="https://dealcheck.io/pricing/" target="_blank" rel="noopener noreferrer">pricing</a>,{" "}
                <a className="underline hover:text-foreground" href="https://help.dealcheck.io/en/articles/2047630-using-the-offer-calculator-to-calculate-offers-to-sellers" target="_blank" rel="noopener noreferrer">Offer Calculator</a>, and{" "}
                <a className="underline hover:text-foreground" href="https://help.dealcheck.io/en/articles/2259844-screening-properties-with-custom-investment-criteria" target="_blank" rel="noopener noreferrer">criteria</a> pages.
              </p>
            </div>
            <div>
              <p className="font-bold text-foreground">TrueCap may fit better if you want</p>
              <ul className="mt-2 space-y-1.5 text-muted-foreground">
                <li>A no-signup, address-first screen with editable sourced assumptions.</li>
                <li>Rule-fit context tied to your Buy Box.</li>
                <li>Offer Ceiling, downside, and a decision-review package in one sequence.</li>
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                BiggerPockets may fit better for its community and education ecosystem;
                see its official{" "}
                <a className="underline hover:text-foreground" href="https://www.biggerpockets.com/rental-property-calculator" target="_blank" rel="noopener noreferrer">Rental Property Calculator</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
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
    a: "Most free calculators stop at metrics. TrueCap's first complete decision also shows selected-rule fit, a target-backed Offer Ceiling, downside checks, and next steps. The Offer Ceiling is the highest modeled price that still meets the selected targets under the assumptions shown; it is not advice or an appraisal.",
  },
  {
    q: "What does the auto-fill provide?",
    a: "Rent starts from a HUD area benchmark (ZIP-level when available, otherwise an FMR area), not a property-specific rent comp. The rate starts from FRED's national owner-occupied 30-year benchmark, not an investor lender quote. Property tax is not auto-filled from the retired static state table: enter a local annual bill or reviewed rate. Until then, the model labels its generic 1.1% tax assumption as a preliminary fallback. Replace every screening assumption with property-specific evidence before recording or acting on an investment decision.",
  },
  {
    // The guarantee sentence is appended dynamically in HomepageFaq so the
    // kill switch silences it together with every other refund promise.
    q: "Why does Pro cost more than other rental calculators?",
    a: "Pro adds a repeatable decision-review layer: a target-backed Offer Ceiling, Buy Box rule-fit checks, downside stress tests, comparisons, and reports. The outputs remain estimates based on the assumptions shown and require independent verification.",
  },
  {
    q: "Is TrueCap really free?",
    a: `Yes. Your first complete decision needs no account or card. Create an account to start a ${PRODUCT_EVALUATION_DAYS}-day, no-card evaluation covering up to ${PRODUCT_EVALUATION_DEAL_LIMIT} deals and ${PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison. Investor Pro is for repeating the verified workflow, saving and revisiting deals, comparisons, reports, and reusable Buy Box assumptions.`,
  },
  {
    q: "Do I need a credit card?",
    a: `No. The first complete decision needs no signup or card. Creating an account starts a ${PRODUCT_EVALUATION_DAYS}-day product evaluation with no payment method and no automatic subscription.`,
  },
  {
    q: "Can I edit the assumptions?",
    a: "Yes - every number is editable. TrueCap pre-fills rent, rate, tax, and expense defaults so you get an instant first pass, then you can change financing, expenses, and growth assumptions under “Improve accuracy” and rerun in a click.",
  },
  {
    q: "When should I upgrade to Pro?",
    a: "Upgrade when you want to repeat the decision workflow after the product evaluation: revisit saved deals, compare opportunities, reuse Buy Box assumptions, and produce reports. Monthly Pro can be cancelled anytime.",
  },
  {
    q: "How does the product evaluation work?",
    a: `Create an account to evaluate the product for ${PRODUCT_EVALUATION_DAYS} days, up to ${PRODUCT_EVALUATION_DEAL_LIMIT} completed deals and ${PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison. No card is collected, nothing auto-renews, and checkout clearly shows the amount due before a paid subscription begins.`,
  },
  {
    q: "Why are some advanced strategy modules unavailable?",
    a: "TrueCap keeps specialist strategy, tax, and modeled-sale outputs behind release gates until their formulas, disclosures, regression tests, and presentation meet the same standard as the core buy-and-hold workflow. Standalone tools remain educational first-pass calculators, not acquisition decisions.",
  },
  {
    q: "Is this financial advice?",
    a: "No. TrueCap applies documented, deterministic formulas to your inputs and labeled screening benchmarks. Every assumption is editable, every output is an estimate, and the decision is yours. It is a calculator, not a financial advisor.",
  },
];

export function HomepageFaq({ structuredData = true }: { structuredData?: boolean } = {}) {
  const faqs = HOMEPAGE_FAQS;
  return (
    <>
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="mb-10 text-center sm:mb-12">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary">
              <HelpCircle className="size-3" />
              Common questions
            </p>
            <h2 className="mt-2 text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              The questions every investor asks first.
            </h2>
          </div>
          <div className="divide-y divide-border rounded-2xl border border-border bg-card shadow-sm">
            {faqs.map((faq) => (
              <details key={faq.q} className="group px-5 py-4 sm:px-6 sm:py-5">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="text-left font-semibold text-foreground">{faq.q}</span>
                  <span
                    aria-hidden
                    className="text-2xl font-light text-muted-foreground transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Still have a question?{" "}
            <a
              href="mailto:hello@usetruecap.com"
              className="inline-flex min-h-11 items-center rounded px-1 font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Email us
            </a>
            .
          </p>
        </div>
      </section>
      {/* Only one URL should claim this exact FAQ block in structured data. */}
      {structuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqs.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            }),
          }}
        />
      ) : null}
    </>
  );
}

// ───────────────────────────────────────── Final pre-calculator CTA
// ───────────────────────────────────────── Data sources / accuracy
/**
 * #6 - investors care deeply about where the numbers come from. This
 * section names the primary source behind each auto-filled field and
 * hammers the "everything is editable" point, so the auto-fill reads as
 * a credible starting baseline rather than a black box. Kept tight (3
 * cards) so it reinforces the hero's data-source line without repeating
 * the How-It-Works step.
 */
const DATA_SOURCES: { icon: typeof Home; label: string; source: string; body: string }[] = [
  {
    icon: Home,
    label: "Rent",
    source: "HUD Fair Market Rent",
    body: "Pulled for the property's county or ZIP and bedroom count where available—a starting benchmark to compare with local rent comps.",
  },
  {
    icon: Percent,
    label: "Mortgage rate",
    source: "FRED 30-year fixed",
    body: "The latest available national series value, with its date shown. Replace it with an actual lender quote before deciding.",
  },
  {
    icon: Building2,
    label: "Property tax",
    source: "State effective rate",
    body: "Your state's typical effective rate, applied to the purchase price you enter.",
  },
];

export function DataSourcesSection() {
  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-10 text-center sm:mb-12">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Built on real data</p>
          <h2 className="mt-2 text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Visible sources. <span className="text-primary">Editable assumptions.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            TrueCap labels each auto-filled value with its source and keeps every
            assumption editable. Start fast, then replace benchmarks with verified
            property facts, local comps, and lender terms.
          </p>
        </div>
        {/* Divided list - one surface with internal rules (Rule 4)
            instead of three boxed cards. Each row pairs a field with the
            primary source behind it. */}
        <div className="tc-reveal mx-auto max-w-3xl divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {DATA_SOURCES.map((s) => (
            <div key={s.label} className="flex items-start gap-4 p-5 sm:gap-5 sm:p-6">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="size-5" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <h3 className="text-base font-bold text-foreground">{s.source}</h3>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Fast starting point. Transparent assumptions. Final control stays with you.
        </p>
      </div>
    </section>
  );
}

// ───────────────────────────────────────── PDF / Pro upsell
/**
 * #7 - a low-friction paid path for non-subscribers, surfaced AFTER the
 * calculator (i.e. after the visitor has felt the value). New one-time
 * report checkout is temporarily disabled;
 * we deliberately do NOT hardcode the Pro monthly price here - it's loaded
 * live from Stripe on /pricing, and duplicating it risks drift.
 */
// Honest value ladder - what each path actually unlocks. Mirrors the
// entitlements bag (lib/entitlements.ts).
// Pro's monthly price is deliberately NOT printed here (it's loaded live
// from Stripe on /pricing); the Pro card below links out so the two can
// never drift. "true" → included, "false" → not, string → a qualifier.
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
    { label: "Complete decision workflow", key: null, cells: ["1 decision", true, true] },
    { label: "Cap rate · CoC · DSCR · cash flow", key: "cash_flow" },
    { label: "0-100 Screening Index + modeled context", key: "deal_score" },
    {
      label: "Decision memo/report",
      key: "pdf_export",
    },
    { label: "Offer Ceiling + Deal Doctor thresholds", key: "mao" },
    { label: "Save & revisit deals", key: "save_deal" },
    { label: "Compare deals side-by-side", key: "compare_deals" },
    { label: "Buy Box: selected-rule fit on every deal", key: "buy_box" },
    { label: "10-year cash-flow projection", key: "projections" },
    { label: "Downside sensitivity checks", key: "sensitivity" },
  ] as { label: string; key: FeatureKey | null; cells?: (boolean | string)[] }[]
).map(({ label, key, cells }) => {
  const fullCells = cells ?? ladderCellsForFeature(key!);
  return { label, cells: [fullCells[0], fullCells[2]] };
});


export function PdfProUpsell() {
  const { proOfferName } = getMarketingOfferConfig();
  const ladderHeaders = ["Free", proOfferName] as const;
  return (
    <section className="border-t border-border bg-card/40">
      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-8 text-center sm:mb-10">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">What you get</p>
          <h2 className="mt-2 text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Analyze free. Use <span className="text-primary">{proOfferName}</span>{" "}
            to solve the Offer Ceiling that fits your targets—deal after deal.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
            Start with a 60-second screen, then use Pro to review four things:
            selected-rule fit, Offer Ceiling,
            what could break, and how to document the decision.
          </p>
        </div>

        {/* Value ladder - answers "what exactly do I get free?" at a glance,
            so the visitor isn't guessing where the line is. */}
        <div
          role="region"
          aria-label="Free and Pro comparison"
          className="mb-8 overflow-hidden rounded-2xl border border-border bg-card shadow-sm sm:mb-10"
        >
          <table className="w-full table-fixed text-xs sm:text-sm">
            <colgroup>
              <col className="w-1/2" />
              <col className="w-1/4" />
              <col className="w-1/4" />
            </colgroup>
            <caption className="sr-only">
              Features included with Free and Pro
            </caption>
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-2 py-3 text-left font-bold text-muted-foreground sm:px-6">
                  <span className="sr-only">Feature</span>
                </th>
                {ladderHeaders.map((h, i) => (
                  <th
                    key={h}
                    className={
                      i === 1
                        ? "px-1 py-3 text-center font-extrabold text-primary sm:px-6"
                        : "px-1 py-3 text-center font-bold text-foreground sm:px-6"
                    }
                  >
                    {h}
                    <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {LADDER_SUBHEADERS[i]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LADDER_ROWS.map((row, ri) => (
                <tr key={row.label} className={ri % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                  <td className="px-2 py-3 font-medium text-foreground sm:px-6">{row.label}</td>
                  {row.cells.map((cell, ci) => (
                    <td key={`${row.label}-${ci}`} className="px-1 py-3 text-center sm:px-6">
                      {/* sr-only labels so the matrix is legible to screen
                          readers / crawlers, not a wall of blank cells. */}
                      {cell === true ? (
                        <>
                          <Check
                            aria-hidden
                            className={
                              ci === 1
                                ? "mx-auto size-4 text-[var(--metric-positive)]"
                                : "mx-auto size-4 text-[var(--metric-positive)]/80"
                            }
                          />
                          <span className="sr-only">Included</span>
                        </>
                      ) : cell === false ? (
                        <>
                          <X aria-hidden className="mx-auto size-4 text-muted-foreground/40" />
                          <span className="sr-only">Not included</span>
                        </>
                      ) : (
                        <span
                          className={
                            ci === 1
                              ? "text-xs font-semibold text-primary"
                              : "text-xs font-medium text-foreground"
                          }
                        >
                          {cell}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mx-auto max-w-xl">
          <div className="flex flex-col rounded-2xl border-2 border-primary/30 bg-card p-6 shadow-[0_16px_40px_rgba(0,112,196,0.10)]">
            <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles aria-hidden className="size-5" />
            </div>
            <span className="w-fit rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--brand-blue-text)]">
              {proOfferName}
            </span>
            <h3 className="mt-2 text-lg font-bold text-foreground">One address. Four acquisition answers.</h3>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
              Get your Buy Box rule-fit result, Offer Ceiling, downside stress test, and a
              decision-review report—then compare, save, and move selected deals
              through your acquisition workflow.
            </p>
            <div className="mt-5">
              <Link
                href="/pricing"
                className="group inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_10px_24px_rgba(0,112,196,0.28)] hover:-translate-y-0.5 transition-transform"
              >
                See Pro pricing
                <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Create an account for a {PRODUCT_EVALUATION_DAYS}-day evaluation covering up to {PRODUCT_EVALUATION_DEAL_LIMIT} deals and {PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison. No card and no automatic subscription.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Retired placement retained as a no-op for import compatibility. */
export function NeverOverpayGuarantee() {
  return null;
}

// ───────────────────────────────────────── Personas
/**
 * #9 - the homepage leads with ONE universal action (analyze a rental).
 * Persona cards live LOWER, after intent is captured, so they help a
 * visitor self-identify without diluting the single above-the-fold CTA.
 */
const PERSONAS: {
  icon: typeof Home;
  title: string;
  body: string;
  seed?: { href: string; label: string; strategy: HandoffStrategyKey };
  /** Segmented path (2026-08 rollout): the persona's dedicated page. */
  pagePath?: { href: string; label: string };
}[] = [
  {
    icon: TrendingUp,
    title: "For investors",
    body: "Screen buy-and-hold assumptions with cash flow, cap rate, CoC, DSCR, a 10-year view, and selected-rule fit against your Buy Box.",
    // Deep-link with the Buy & Hold play pre-selected (analyzer handoff
    // ?strategy=) so long-term-rental defaults are already applied.
    seed: { href: "/?strategy=buy-hold#main", label: "Start a buy-and-hold analysis", strategy: "buy-hold" },
    pagePath: { href: "/for-buy-and-hold", label: "The buy-and-hold workflow" },
  },
  {
    icon: Users,
    title: "For agents",
    body: "Share a labeled screening analysis or Pro report for review with investor clients and lenders; it is not an appraisal or approval.",
    // Agent Pro is unreleased. Keep this persona limited to the released
    // analyzer/share workflow and do not link to the gated sales page.
  },
  {
    icon: Home,
    title: "For house hackers",
    body: "Model owner-occupied units and see what's left of your mortgage payment after rent.",
    // Deep-link with the House Hack play pre-selected (analyzer handoff
    // ?strategy=, upgraded from ?type=) — same owner-occupant form, now with
    // FHA-style starter assumptions applied too.
    seed: { href: "/?strategy=house-hack#main", label: "Start a house-hack analysis", strategy: "house-hack" },
    pagePath: { href: "/for-house-hackers", label: "The house-hack workflow" },
  },
];

export function Personas() {
  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-10 text-center sm:mb-12">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Who it&apos;s for</p>
          <h2 className="mt-2 text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            One tool, whatever you&apos;re underwriting.
          </h2>
        </div>
        {/* Bento - asymmetric tiles (lead persona featured large, the
            other two stacked) instead of three equal cards. */}
        <div className="tc-reveal grid gap-4 sm:gap-5 lg:grid-cols-2">
          {PERSONAS.map((p, i) => (
            <div
              key={p.title}
              className={`group flex flex-col rounded-2xl border border-border bg-card p-6 transition-transform hover:-translate-y-0.5 sm:p-7 ${
                i === 0 ? "lg:col-span-2 lg:items-center lg:p-9 lg:text-center" : ""
              }`}
            >
              <div
                className={`mb-4 flex items-center justify-center rounded-xl bg-primary/10 text-primary ${
                  i === 0 ? "size-14" : "size-11"
                }`}
              >
                <p.icon className={i === 0 ? "size-7" : "size-5"} strokeWidth={2} />
              </div>
              <h3 className={`font-bold tracking-tight text-foreground ${i === 0 ? "text-2xl" : "text-lg"}`}>
                {p.title}
              </h3>
              <p className={`mt-2 leading-relaxed text-muted-foreground ${i === 0 ? "max-w-md text-base lg:mx-auto" : "text-sm"}`}>
                {p.body}
              </p>
              {p.seed ? (
                // Client component: same-page soft navs need the strategy
                // delivered by event, not just the URL param — see the
                // component's doc comment.
                <PersonaSeedLink href={p.seed.href} label={p.seed.label} strategy={p.seed.strategy} />
              ) : null}
              {p.pagePath ? (
                <Link
                  href={p.pagePath.href}
                  className={`mt-2 inline-flex min-h-11 items-center gap-1 rounded text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${i === 0 ? "lg:justify-center" : ""}`}
                >
                  {p.pagePath.label} <ArrowRight className="size-3.5" />
                </Link>
              ) : null}
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <ScrollToFormButton className="group inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_10px_24px_rgba(0,112,196,0.28)] hover:-translate-y-0.5 transition-transform">
            Analyze a property free
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </ScrollToFormButton>
        </div>
      </div>
    </section>
  );
}
