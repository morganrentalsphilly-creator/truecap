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
import { TRIAL_DAYS, TRIAL_LABEL } from "@/lib/trial";
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
import { GuaranteeViewTracker } from "@/components/analytics/guarantee-view-tracker";

// ─────────────────────────────────────────────────────── How It Works
// ───────────────────────────────────────── Why not a spreadsheet
// NOTE: rows are now consolidated into the merged WhyTrueCap table below
// (alongside DealCheck / BiggerPockets). Kept exported as a no-op for
// any external referrers; remove next time we touch this file.
const COMPARISON_ROWS: { label: string; spreadsheet: string | false; truecap: string | true }[] = [
  { label: "Time to first answer",     spreadsheet: "2-4 hours",       truecap: "60 seconds" },
  { label: "Auto-fill rent + rate",    spreadsheet: false,             truecap: true },
  { label: "Cap rate · CoC · DSCR",    spreadsheet: "If you built it", truecap: true },
  { label: "10-year projection",       spreadsheet: "Tab 4, probably broken", truecap: true },
  { label: "Tax / depreciation math",  spreadsheet: "Tab 5, definitely broken", truecap: true },
  { label: "Sensitivity (what-ifs)",   spreadsheet: false,             truecap: true },
  { label: "Mobile / at the showing",  spreadsheet: false,             truecap: true },
  { label: "Share with lender",        spreadsheet: "Email the .xlsx", truecap: "1-click PDF link" },
  { label: "Compare 4 deals",          spreadsheet: "Copy/paste hell", truecap: "Side-by-side" },
];
// Reference to satisfy TS unused-var linting if it ever flips on.
void COMPARISON_ROWS;

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
      "Rent, mortgage rate and property tax auto-fill from HUD, FRED and your state's rates. Financing, vacancy and every expense stay yours to change — nothing is hidden or hard-coded.",
  },
  {
    key: "decide",
    label: "Decide",
    icon: Gauge,
    title: "See the real economics",
    body:
      "Cash flow, cap rate, cash-on-cash and DSCR, plus a 0-100 Deal Score and a plain-English verdict that says what the numbers mean, not just what they are.",
  },
  {
    key: "offer",
    label: "Offer",
    icon: Target,
    title: "Know your number",
    body:
      "TrueCap reverse-solves the highest price that still hits your targets. Don't buy at $325,000 because it's listed there. Offer $283,000 because that's where the deal works.",
    // The section this replaced disclosed that the max-offer solver is Pro.
    // Dropping that made the homepage sell a paid feature as the free product.
    proNote: "The max-offer solver is part of Pro",
  },
] as const;

export function HowTrueCapWorks() {
  return (
    <section className="border-t border-border bg-card/40">
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
                  <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-[var(--brand-orange)]/30 bg-[var(--brand-orange)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--brand-orange)]">
                    {step.proNote}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-10 text-center">
          <ScrollToFormButton className="group inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_10px_24px_rgba(0,112,196,0.28)] hover:-translate-y-0.5 transition-transform">
            Analyze a property
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </ScrollToFormButton>
          <p className="mt-2 text-xs text-muted-foreground">Free · no card · no signup</p>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────── The decision-system offer
const OFFER_MODULES = [
  [Clock, "60-Second Underwriter", "Turn an address into a reviewable first-pass underwrite without rebuilding a spreadsheet."],
  [ShieldCheck, "Buy Box Autopilot", "Define what a good deal means to you and screen each opportunity against those criteria."],
  [Target, "Max Offer Engine", "Reverse-solve the highest price that still clears your return targets."],
  [Activity, "Downside Stress Test", "See how lower rent, higher vacancy, price, and rate changes affect the decision."],
  [GitCompareArrows, "Deal Comparison", "Put saved opportunities side by side so the best use of capital is easier to see."],
  [BarChart3, "Long-Term Wealth View", "Model cash flow, debt paydown, equity, tax effects, and exit scenarios over time."],
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
            The complete rental acquisition <span className="text-primary">decision system.</span>
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Free screens the opportunity. Pro connects the screening math to
            the decisions that follow: pursue, renegotiate, compare, report, or pass.
          </p>
        </div>

        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {OFFER_MODULES.map(([Icon, name, outcome]) => {
            const featured = name === "Max Offer Engine";
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
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{outcome}</p>
                {featured ? (
                  <p className="mt-4 border-t border-primary/20 pt-3 text-xs font-semibold text-primary">
                    The central Pro decision: know your number before you make the offer.
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
          <span className="text-primary">Know what to offer.</span>
        </h2>
        <p className="mx-auto mt-3 max-w-[52ch] text-balance text-sm leading-relaxed text-muted-foreground">
          Cash flow, cap rate, CoC, DSCR and your Deal Score are free, with no account
          needed. Projections, tax, exit scenarios and the max-offer solver are Pro.
        </p>
        <ScrollToFormButton analyticsSource="final_cta" className="group mt-6 inline-flex h-12 items-center gap-1.5 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] hover:-translate-y-0.5 transition-transform">
          Analyze a Deal Free
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
    bestFor: "An address-first screen connected to Buy Box, Max Offer, downside, and presentation.",
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
                <li>An opinionated verdict tied to your Buy Box.</li>
                <li>Max Offer, downside, and an offer-ready decision package in one sequence.</li>
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
const HOMEPAGE_FAQS: { q: string; a: string }[] = [
  {
    q: "Is TrueCap really free?",
    // Free CAN save (up to 5 deals) — what Pro actually adds on the saved-deal
    // axis is editing saved deals, unlimited saves, and compare. A previous
    // version claimed saving itself was a Pro add-on, contradicting the
    // pricing card's Free save-up-to-5 bullet and the runtime gate
    // (pricing-copy-guards.test.ts locks this).
    a: "Yes. The cash-flow analyzer - cap rate, CoC, DSCR, monthly cash flow, address auto-fill, the 0-100 Deal Score, and a plain-English verdict - is free forever and unlimited. No card required. Free even saves up to 5 deals. Pro adds editing + unlimited saved deals, compare deals, lender-ready PDFs, a personal buy box (your criteria, checked on every deal), and the advanced modules (BRRRR + Fix-and-Flip, Sensitivity, 10-year projections, tax strategy, exit scenarios).",
  },
  {
    q: "Do I need a credit card?",
    a: "No. The free analyzer needs zero signup and zero card - type an address and go. You only create an account if you want to save deals or unlock Pro.",
  },
  {
    q: "How accurate is the auto-fill?",
    a: "Rent comes from HUD Fair Market Rent for the county, the mortgage rate from the current FRED 30-year fixed series, and property tax from your state's effective rate. These are sensible market defaults, not absolutes - every field is editable, so override anything with your own numbers.",
  },
  {
    q: "Can I edit the assumptions?",
    a: "Yes - every number is editable. TrueCap pre-fills rent, rate, tax, and expense defaults so you get an instant first pass, then you can change financing, expenses, and growth assumptions under “Improve accuracy” and rerun in a click.",
  },
  {
    q: "What do I get with a Single-Deal Underwrite?",
    a: "A complete one-property decision report: deterministic Max Offer, Deal Doctor rent/rate thresholds, assumptions, verdict, cash flow, cap rate, DSCR, downside scenario, 10-year projection, tax strategy, exit scenarios, and Deal Score. No account or subscription.",
  },
  {
    q: "When should I upgrade to Pro?",
    a: "Use Free to screen unlimited deals. Use a Single-Deal Underwrite when you need Max Offer and the complete decision report for one property without a subscription. Upgrade to Pro for an interactive Max Offer workflow, Buy Box screening, downside testing, unlimited saves, comparisons, reusable assumptions, branded reports, and unlimited exports. Pro is month-to-month - cancel anytime.",
  },
  {
    q: "How does the Pro trial work?",
    a: `Stripe collects a card at checkout. Eligible first-time subscribers get full Pro access for ${TRIAL_DAYS} days. Subscription billing starts after the trial unless you cancel first. Returning subscribers start paid access immediately and are not eligible for another free trial.`,
  },
  {
    q: "Does this work for BRRRR or fix-and-flip deals?",
    a: "Yes. Pro includes the BRRRR analyzer (cash-out refi math, post-refi cash flow, infinite-return alerts), the Fix-and-Flip analyzer (net profit, ROI, annualized ROI, break-even ARV), and the Rehab Cost Estimator (sq-ft-based defaults for every common work item).",
  },
  {
    q: "Is this financial advice?",
    a: "No. TrueCap surfaces the math you'd compute yourself - accurate formulas and market-data defaults - but every assumption is editable and the decision is yours. It's a calculator, not a financial advisor.",
  },
];

export function HomepageFaq() {
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
            {HOMEPAGE_FAQS.map((faq) => (
              <details key={faq.q} className="group px-5 py-4 sm:px-6 sm:py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
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
              className="font-semibold text-primary hover:underline"
            >
              Email us
            </a>
            .
          </p>
        </div>
      </section>
      {/* JSON-LD for rich-result FAQ snippets in Google. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: HOMEPAGE_FAQS.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
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
 * calculator (i.e. after the visitor has felt the value). The $5 one-time
 * PDF is a real, fully-automated product (see app/actions/one-time-pdf.ts);
 * we deliberately do NOT hardcode the Pro monthly price here - it's loaded
 * live from Stripe on /pricing, and duplicating it risks drift.
 */
// Honest value ladder - what each path actually unlocks. Mirrors the
// entitlements bag (lib/entitlements.ts) + the $5 one-time PDF product.
// Pro's monthly price is deliberately NOT printed here (it's loaded live
// from Stripe on /pricing); the Pro card below links out so the two can
// never drift. "true" → included, "false" → not, string → a qualifier.
const LADDER_SUBHEADERS = ["Free forever", "One-time", TRIAL_LABEL] as const;
/**
 * The Free / $5 / Pro ladder.
 *
 * The LABEL is marketing copy and lives here. The three TIER CELLS are derived
 * from lib/entitlements-catalog — never hand-typed — because hand-typing them
 * is exactly how this table came to claim Free couldn't save deals (it can:
 * five) and that the $5 PDF omitted projections (it doesn't), each
 * contradicting /pricing at the moment someone decides to pay. Change what a
 * tier includes in the catalog and every surface follows.
 *
 * `key: null` marks a row that is a policy statement rather than an
 * entitlement flag, so there is nothing in the catalog to derive it from.
 */
const LADDER_ROWS: { label: string; cells: (boolean | string)[] }[] = (
  [
    { label: "Analyze unlimited deals", key: null, cells: [true, true, true] },
    { label: "Cap rate · CoC · DSCR · cash flow", key: "cash_flow" },
    { label: "0-100 Deal Score + plain-English verdict", key: "deal_score" },
    { label: "Lender-ready PDF export", key: "pdf_export" },
    { label: "Max Offer + Deal Doctor thresholds", key: "mao" },
    { label: "Save & revisit deals", key: "save_deal" },
    { label: "Compare deals side-by-side", key: "compare_deals" },
    { label: "Buy box: personal pass/fail on every deal", key: "buy_box" },
    { label: "10-year projections · tax · exit", key: "projections" },
    { label: "BRRRR · fix & flip · sensitivity", key: "strategies" },
  ] as { label: string; key: FeatureKey | null; cells?: (boolean | string)[] }[]
).map(({ label, key, cells }) => ({
  label,
  cells: cells ?? ladderCellsForFeature(key!),
}));


export function PdfProUpsell() {
  const { proOfferName, singleDeal } = getMarketingOfferConfig();
  const ladderHeaders = ["Free", `${singleDeal.priceLabel} Single Deal`, proOfferName] as const;
  return (
    <section className="border-t border-border bg-card/40">
      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-8 text-center sm:mb-10">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">What you get</p>
          <h2 className="mt-2 text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Analyze free. Unlock one complete deal for{" "}
            <span className="text-primary">{singleDeal.priceLabel}</span>. Use{" "}
            <span className="text-primary">{proOfferName}</span> to know exactly what to offer—every time.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
            Start with a 60-second screen. Unlock a complete Single-Deal Underwrite
            once, or use Pro to turn every address into four answers: pursue or pass,
            what to offer, what could break, and how to present the decision.
          </p>
        </div>

        {/* Value ladder - answers "what exactly do I get free?" at a glance,
            so the visitor isn't guessing where the line is. */}
        <p className="mb-2 text-center text-xs font-medium text-muted-foreground sm:hidden">
          Swipe to compare all three →
        </p>
        <div className="mb-8 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm sm:mb-10">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-bold text-muted-foreground sm:px-6">
                  <span className="sr-only">Feature</span>
                </th>
                {ladderHeaders.map((h, i) => (
                  <th
                    key={h}
                    className={
                      i === 2
                        ? "px-4 py-3 text-center font-extrabold text-primary sm:px-6"
                        : "px-4 py-3 text-center font-bold text-foreground sm:px-6"
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
                  <td className="px-4 py-3 font-medium text-foreground sm:px-6">{row.label}</td>
                  {row.cells.map((cell, ci) => (
                    <td key={`${row.label}-${ci}`} className="px-4 py-3 text-center sm:px-6">
                      {/* sr-only labels so the matrix is legible to screen
                          readers / crawlers, not a wall of blank cells. */}
                      {cell === true ? (
                        <>
                          <Check
                            aria-hidden
                            className={
                              ci === 2
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
                            ci === 2
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

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
          {/* One complete deal without a subscription. */}
          <div className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-[var(--brand-green)]/10 text-[var(--brand-green)]">
              <FileText className="size-5" />
            </div>
            <span className="w-fit rounded-full bg-[var(--brand-green)]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--brand-green)]">
              One-time · {singleDeal.priceLabel}
            </span>
            <h3 className="mt-2 text-lg font-bold text-foreground">Single-Deal Underwrite</h3>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
              Get the complete decision package for one property: Max Offer,
              Deal Doctor thresholds, assumptions, verdict, downside scenario,
              long-term projection, tax view, exit scenarios, and a polished
              report. No subscription.
            </p>
            <div className="mt-5">
              <ScrollToFormButton className="group inline-flex h-11 items-center gap-1.5 rounded-xl border border-border bg-background px-5 text-sm font-bold text-foreground hover:bg-muted">
                Analyze a property
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </ScrollToFormButton>
            </div>
          </div>

          {/* Pro */}
          <div className="flex flex-col rounded-2xl border-2 border-primary/30 bg-card p-6 shadow-[0_16px_40px_rgba(0,112,196,0.10)]">
            <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </div>
            <span className="w-fit rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
              {proOfferName}
            </span>
            <h3 className="mt-2 text-lg font-bold text-foreground">One address. Four acquisition answers.</h3>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
              Get your Buy Box verdict, Max Offer, downside stress test, and an
              offer-ready report—then compare, save, and move the strongest deals
              through your acquisition workflow.
            </p>
            <div className="mt-5">
              <Link
                href="/pricing"
                className="group inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_10px_24px_rgba(0,112,196,0.28)] hover:-translate-y-0.5 transition-transform"
              >
                Start {TRIAL_DAYS}-Day Pro Trial
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Eligible first-time subscribers get full Pro access. Card required
                at checkout; cancel before the trial ends to avoid a subscription charge.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Operationally gated risk reversal. It renders only after the business
 * enables the flag and can support the refund workflow. It guarantees
 * satisfaction with time saved, never an investment result.
 */
export function FiveDealGuarantee() {
  const { fiveDealGuaranteeEnabled } = getMarketingOfferConfig();
  if (!fiveDealGuaranteeEnabled) return null;

  return (
    <section className="border-t border-border bg-background">
      <GuaranteeViewTracker />
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="rounded-3xl border-2 border-[var(--brand-green)]/30 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-card text-[var(--brand-green)]">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--brand-green)]">Risk reversal</p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">The 5-Deal Guarantee</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Use TrueCap Pro to underwrite five real properties during your
                first 30 paid days. If you do not believe it saved you more
                time than the subscription cost, contact us and we will refund
                your first month.
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                This is a software-satisfaction guarantee, not a guarantee of
                returns, cash flow, appreciation, financing, or deal success.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
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
}[] = [
  {
    icon: TrendingUp,
    title: "For investors",
    body: "Underwrite buy-and-hold deals in seconds - cash flow, cap rate, CoC, DSCR, a 10-year view, and a pass/fail against your own buy box.",
    // Deep-link with the Buy & Hold play pre-selected (analyzer handoff
    // ?strategy=) so long-term-rental defaults are already applied.
    seed: { href: "/?strategy=buy-hold#main", label: "Start a buy-and-hold analysis", strategy: "buy-hold" },
  },
  {
    icon: Users,
    title: "For agents",
    body: "Hand clients a defensible analysis at the showing, with a shareable link or lender-ready PDF.",
    // No seed: agents run whatever their client is buying — no single play
    // (or property type) fits, so the plain analyzer is the right landing.
  },
  {
    icon: Home,
    title: "For house hackers",
    body: "Model owner-occupied units and see what's left of your mortgage payment after rent.",
    // Deep-link with the House Hack play pre-selected (analyzer handoff
    // ?strategy=, upgraded from ?type=) — same owner-occupant form, now with
    // FHA-style starter assumptions applied too.
    seed: { href: "/?strategy=house-hack#main", label: "Start a house-hack analysis", strategy: "house-hack" },
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
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <ScrollToFormButton className="group inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_10px_24px_rgba(0,112,196,0.28)] hover:-translate-y-0.5 transition-transform">
            Analyze a deal free
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </ScrollToFormButton>
        </div>
      </div>
    </section>
  );
}
