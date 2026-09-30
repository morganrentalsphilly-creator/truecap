/**
 * The homepage sections below the hero, in page order (DESIGN.md "Homepage
 * structure"): the ledger opened row by row (HowTrueCapWorks), where the
 * numbers come from (DataSourcesSection), what the client receives
 * (ClientReceivesSection), the plans (PdfProUpsell), who builds it
 * (BuiltByInvestor), verified proof (SocialProof, empty until real records
 * exist), the questions (HomepageFaq) and the close (FinalCta). FaqSection,
 * HomepageFaq and VsCompetitors are shared with other marketing pages.
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
import type { ReactNode } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { AnalyzeCtaLink } from "@/components/marketing/analyze-cta-link";
import { HeroAddressForm } from "@/components/marketing/hero-address-form";
import { HOMEPAGE_WALKTHROUGH_ID } from "@/components/marketing/marketing-hero";
import { PlanCard, type PlanCardAnswer } from "@/components/marketing/plan-card";
import { MEMO_SHOT, ProductShot } from "@/components/marketing/product-shot";
import { Section, SectionHeading } from "@/components/marketing/section";
import { OpenLedger } from "@/components/ledger/open-ledger";
import { DisclosureMark } from "@/components/ledger/ledger-parts";
import { buttonVariants } from "@/components/ui/button";
import { CLIENT_RECEIVES } from "@/lib/client-receives";
import {
  formatPublicUsd,
  PUBLIC_AGENT_PRO_ANNUAL_USD,
  PUBLIC_AGENT_PRO_MONTHLY_USD,
  PUBLIC_PRO_ANNUAL_USD,
  PUBLIC_PRO_MONTHLY_USD,
} from "@/lib/public-pricing";
import { buildSampleDealLedger } from "@/lib/sample-deal-ledger";
import { loadStripeDisplayPrice } from "@/lib/stripe/display-prices";
import { cn } from "@/lib/utils";
import { getMarketingOfferConfig } from "@/lib/marketing-offer-config";
import { VERIFIED_TESTIMONIALS, isPublicationReady } from "@/lib/proof-records";
import { DATA_SOURCE_FACTS, PROPERTY_TAX_FACTS } from "@/lib/product-facts";
import { JsonLd } from "@/components/seo/json-ld";
import { AGENT_FAQS } from "@/lib/agent-faqs";
import { isAgentProConfigured } from "@/lib/stripe/plan-prices";

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
 * Set as the expandable ledger (DESIGN.md "Homepage structure" 2): the hero's
 * sample deal opened row by row, with the three steps as notes against the
 * rows they explain. It replaces the three step cards and the problem block's
 * three question cards, which told the same progression a slice at a time.
 * The step copy is unchanged.
 */
const SPINE_STEPS = [
  {
    key: "analyze",
    label: "Analyze",
    title: "Paste the listing at the showing",
    body: "Area rent and a national owner-occupied mortgage-rate benchmark can fill from HUD and FRED. Property tax stays manual because a state aggregate is not a parcel bill. Switch the financing to the client's, and every assumption stays yours to review and change.",
  },
  {
    key: "decide",
    label: "Screen",
    title: "Screen it against the client's Buy Box",
    body: "Cash flow, cap rate, cash-on-cash and DSCR at the asking price, a 0–100 Deal score, and whether it meets the client's targets, with the criterion it misses if it doesn't.",
  },
  {
    key: "offer",
    label: "Ceiling",
    title: "Send the Offer Ceiling, co-branded",
    body: "The highest price that still meets the client's targets under the assumptions shown, the assumptions most likely to break the deal, and a memo the client opens without an account and can rerun with their own numbers.",
    proNote: "Included in your first complete decision",
  },
] as const;

function spineNote(step: (typeof SPINE_STEPS)[number]) {
  return {
    lead: `${step.title}.`,
    body: "proNote" in step ? `${step.body} ${step.proNote}.` : step.body,
  };
}

export function HowTrueCapWorks() {
  const ledger = buildSampleDealLedger();
  const [analyze, screen, ceiling] = SPINE_STEPS;
  return (
    <Section id={HOMEPAGE_WALKTHROUGH_ID} rhythm="open" aria-labelledby="how-it-works-heading">
      <SectionHeading id="how-it-works-heading">
        From listing to offer in three steps.
      </SectionHeading>
      {ledger ? (
        <div className="mt-8 sm:mt-12">
          <OpenLedger
            ledger={ledger}
            notes={{
              price: spineNote(analyze),
              buyBox: spineNote(screen),
              ceiling: spineNote(ceiling),
            }}
          />
        </div>
      ) : (
        // The sample deal failed to compute: the steps still read in order.
        <ol className="mt-8 border-t-2 border-foreground">
          {SPINE_STEPS.map((step) => (
            <li key={step.key} className="border-b border-border py-5">
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="mt-1 max-w-[62ch] leading-relaxed text-muted-foreground">
                {spineNote(step).body}
              </p>
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

// ───────────────────────────────────────── Retired: the module grid
// OfferEngineSection (eight feature tiles) and Personas (three persona cards)
// were unmounted before the 2026-09 design pass and deleted in it. Dead
// sections that describe features are a live claim waiting to be re-rendered
// (see the note at the top of this file), and both were built from the icon
// tiles and card grids DESIGN.md retires.

/**
 * Founder/trust block (2026-09 positioning pass). Facts come from /about only:
 * one rental investor in Philadelphia, built for their own underwriting. The
 * founder is described, never named (their request, 2026-09-07) — no name,
 * photo, portfolio size, returns, or customer counts belong here.
 */
export function BuiltByInvestor() {
  return (
    <Section rhythm="tight" data-homepage-block="built-by-investor">
      <div className="max-w-[68ch]">
        <SectionHeading>
          Built by a rental investor. Now built for the agents who serve them, too.
        </SectionHeading>
        <p className="mt-4 text-lg leading-relaxed">
          TrueCap is built by one person, a rental investor in Philadelphia. It
          started as a way to answer one practical question before every
          offer: what price actually makes this property work? The same
          analyzer now serves agents who screen and present deals for investor
          clients. The defaults lean conservative, every assumption is
          editable, and every formula is published.
        </p>
        <p className="mt-3 flex flex-wrap gap-x-6 text-base">
          <Link href="/about" className="tc-link inline-flex min-h-11 items-center">
            About TrueCap
          </Link>
          <Link href="/methodology" className="tc-link inline-flex min-h-11 items-center">
            Read the methodology
          </IntentPrefetchLink>
        </p>
      </div>
    </Section>
  );
}

/**
 * Closing ask. The page has made its case by here; the one job left is the
 * address field again (DESIGN.md "Homepage structure" 8), not a button that
 * scrolls back up to it.
 */
export function FinalCta() {
  return (
    // The hero's grid: the case on the left, the field on the right, where
    // the ledger stood at the top of the page.
    <Section rule="heavy" aria-labelledby="final-cta-heading">
      <div className="grid gap-x-16 gap-y-2 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-end">
        <div>
          <SectionHeading id="final-cta-heading">
            Paste the listing. Send the deal that already pencils.
          </SectionHeading>
          <p className="mt-4 max-w-[56ch] text-lg leading-relaxed text-muted-foreground">
            Your first complete decision includes cash flow, cap rate, CoC, DSCR,
            Buy Box fit, the Offer Ceiling, downside checks, and next
            steps. No account or card required.
          </p>
        </div>
        <div>
          <HeroAddressForm placement="close" className="max-w-none lg:mt-0" />
          <p className="mt-4 border-t border-rule-soft pt-2.5 text-base">
            Buying for your own portfolio?{" "}
            <Link href="/for-investors" className="tc-link -my-3 inline-block py-3">
              See TrueCap for investors
            </Link>
          </p>
        </div>
      </div>
    </Section>
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
        <figure className="border-t-2 border-foreground pt-5 lg:col-span-3">
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
        <Link href="/reviews" className="tc-link inline-flex min-h-11 items-center font-medium">
          See verified proof &amp; methodology
        </Link>
      </p>
    </Section>
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

// ───────────────────────────────────────── Press / "As featured in"
export function VsCompetitors() {
  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-10 text-center sm:mb-12">
          <h2 className="mt-2 text-balance text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Choose the workflow that fits how you invest.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            These tools overlap. The meaningful difference is how they move you
            from a listing to a decision—not whether one can win every feature
            row.
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
              <p className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">
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
                  <dd className="mt-1 text-muted-foreground">
                    {item.tradeoff}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h3 className="text-lg font-extrabold text-foreground">
            A deliberately fair comparison
          </h3>
          <div className="mt-4 grid gap-6 text-sm leading-relaxed md:grid-cols-2">
            <div>
              <p className="font-bold text-foreground">
                DealCheck may fit better if you want
              </p>
              <ul className="mt-2 space-y-1.5 text-muted-foreground">
                <li>Native iOS and Android apps.</li>
                <li>
                  Established listing-import and property-comparison workflows.
                </li>
                <li>
                  Its Offer Calculator and custom purchase-criteria workflow.
                </li>
                <li>A branded PDF report on every plan, including free.</li>
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                Verify on DealCheck&apos;s official{" "}
                <a
                  className="underline hover:text-foreground"
                  href="https://dealcheck.io/pricing/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  pricing
                </a>
                ,{" "}
                <a
                  className="underline hover:text-foreground"
                  href="https://help.dealcheck.io/en/articles/2047630-using-the-offer-calculator-to-calculate-offers-to-sellers"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Offer Calculator
                </a>
                , and{" "}
                <a
                  className="underline hover:text-foreground"
                  href="https://help.dealcheck.io/en/articles/2259844-screening-properties-with-custom-investment-criteria"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  criteria
                </a>{" "}
                pages.
              </p>
            </div>
            <div>
              <p className="font-bold text-foreground">
                TrueCap may fit better if you want
              </p>
              <ul className="mt-2 space-y-1.5 text-muted-foreground">
                <li>
                  A no-signup, address-first screen with editable sourced
                  assumptions.
                </li>
                <li>Buy Box fit on every deal.</li>
                <li>
                  Offer Ceiling, downside, and a decision-review package in one
                  sequence.
                </li>
                <li>
                  Screening for investor clients: a Buy Box per client,
                  client-report links that open without an account, and a
                  co-branded decision memo.
                </li>
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                BiggerPockets may fit better for its community and education
                ecosystem; see its official{" "}
                <a
                  className="underline hover:text-foreground"
                  href="https://www.biggerpockets.com/rental-property-calculator"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Rental Property Calculator
                </a>
                .
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
    a: "Most free calculators stop at metrics. Your first TrueCap decision also shows Buy Box fit, the Offer Ceiling (the highest price that still meets your targets), downside checks, and next steps.",
  },
  {
    q: "What does the auto-fill provide?",
    a: "Rent starts from a HUD area benchmark (ZIP-level when available, otherwise an FMR area), not a property-specific rent comp. The rate starts from FRED's national 30-year benchmark, not an investor lender quote. Property tax is a local number: enter the annual bill or a reviewed rate. Until you do, the model labels its 1.1% tax assumption as a default to replace. Swap every starting assumption for property-specific evidence before you act on a decision.",
  },
  {
    q: "Is TrueCap really free?",
    a: `Yes. Your first complete decision needs no account or card. Create an account for a ${PRODUCT_EVALUATION_DAYS}-day free trial with no card: up to ${PRODUCT_EVALUATION_DEAL_LIMIT} Pro deals and ${PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison. Pro is for knowing what to offer on every deal: Buy Box fit, the Offer Ceiling, downside checks, comparisons, and reports.`,
  },
  {
    q: "Do I need a credit card?",
    a: `No. The first complete decision needs no signup or card. Creating an account starts a ${PRODUCT_EVALUATION_DAYS}-day free trial with no payment method and no automatic subscription.`,
  },
  {
    q: "Can I edit the assumptions?",
    a: "Yes. Every number is editable. TrueCap starts rent and rate from labeled HUD and FRED benchmarks, keeps property tax as your local input, and marks every default so you can replace it. Change financing, expenses, and growth under “Improve accuracy,” then rerun.",
  },
  {
    q: "When should I upgrade to Pro?",
    a: "Upgrade when you want the Offer Ceiling and downside checks on every deal after the free trial, plus saved deals you can edit, comparisons, your Buy Box, and reports. Monthly Pro can be cancelled anytime.",
  },
  {
    q: "How does the free trial work?",
    a: `Create an account and you get ${PRODUCT_EVALUATION_DAYS} days, up to ${PRODUCT_EVALUATION_DEAL_LIMIT} completed Pro deals and ${PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison. No card is collected, nothing auto-renews, and checkout shows the amount before a paid subscription begins.`,
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
      {audience === "both" ? (
        <>
          <FaqSection
            heading="The questions agents ask first."
            items={AGENT_FAQS}
            structuredData={false}
          />
          <FaqSection
            heading="…and the ones investors ask."
            items={HOMEPAGE_FAQS}
            structuredData={false}
            compact
          />
        </>
      ) : null}
      {audience === "investors" ? (
        <FaqSection
          heading="The questions investors ask first."
          items={HOMEPAGE_FAQS}
          structuredData={false}
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

/**
 * One FAQ block, any audience (DESIGN.md "Components": FAQ). A ruled list of
 * native <details> rows: no JS, every row reachable by keyboard, answers
 * capped at 64ch. HomepageFaq and the /for-agents objection section render
 * through it so the markup, the a11y pattern and the optional FAQPage JSON-LD
 * stay identical. Only one URL should claim a given FAQ set in structured
 * data (structuredData=false on the copies).
 */
export function FaqSection({
  heading,
  intro,
  items,
  structuredData = true,
  id,
  compact = false,
  layout = "stack",
  contact: contactOverride,
}: {
  heading: string;
  intro?: string;
  items: readonly { q: string; a: string }[];
  structuredData?: boolean;
  id?: string;
  /** Stacked directly under another FaqSection: no top rule, no top space. */
  compact?: boolean;
  /** "split": the heading beside the list from 1024px (the homepage). */
  layout?: "stack" | "split";
  /** Replaces the default contact line; null drops it. */
  contact?: ReactNode;
}) {
  const headingId = id ? `${id}-heading` : undefined;
  const contact = contactOverride !== undefined ? contactOverride : (
    <p className="mt-4 text-base text-muted-foreground">
      Still have a question?{" "}
      <a href="mailto:hello@usetruecap.com" className="tc-link inline-flex min-h-11 items-center">
        Email us
      </a>
      .
    </p>
  );
  return (
    <>
      <Section
        id={id}
        rule={compact ? "none" : "rule"}
        containerClassName={compact ? "pt-0 sm:pt-0" : undefined}
        aria-labelledby={headingId}
      >
        <div
          className={
            layout === "split"
              ? "grid gap-x-16 gap-y-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
              : "max-w-3xl"
          }
        >
          <div>
            <SectionHeading id={headingId}>{heading}</SectionHeading>
            {intro ? (
              <p className="mt-3 max-w-[60ch] text-lg leading-relaxed text-muted-foreground">
                {intro}
              </p>
            ) : null}
            {layout === "split" ? contact : null}
          </div>
          <div className={layout === "split" ? "border-t-2 border-foreground" : "mt-8 border-t-2 border-foreground"}>
            {items.map((faq) => (
              <details key={faq.q} className="group border-b border-border">
                <summary className="flex min-h-12 cursor-pointer list-none items-start justify-between gap-4 py-4 [&::-webkit-details-marker]:hidden">
                  <span className="text-lg font-semibold">{faq.q}</span>
                  <DisclosureMark className="mt-1.5" />
                </summary>
                <p className="max-w-[64ch] pb-5 text-base leading-relaxed text-muted-foreground">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
          {layout === "split" ? null : contact}
        </div>
      </Section>
      {/* Only one URL should claim this exact FAQ block in structured data. */}
      {structuredData ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: items.map((f) => ({
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

// ───────────────────────────────────────── Final pre-calculator CTA
// ───────────────────────────────────────── Data sources / accuracy
/**
 * Where the numbers come from, set as a source table in FRED's grammar
 * (DESIGN.md "Components"): each row gives the starting value's name, where it
 * comes from and on what basis, and what to replace it with. It answers the
 * question a client asks about any number, and the rows read from
 * lib/product-facts.ts so the claims cannot drift from the product.
 */
const DATA_SOURCES: {
  label: string;
  /** Where the starting value comes from, in lib/product-facts.ts's words. */
  source: string;
  /** Rendered as the row's flag: the default the model uses until replaced. */
  flag?: string;
  replace: string;
}[] = [
  {
    label: "Rent",
    source: `${DATA_SOURCE_FACTS.rent}.`,
    replace: "Local rent comps",
  },
  {
    label: "Mortgage rate",
    source: `${DATA_SOURCE_FACTS.mortgageRate}, with its date shown.`,
    replace: "An investor lender quote, before deciding",
  },
  {
    label: "Property tax",
    source: `Your input. ${PROPERTY_TAX_FACTS.notAutoFilled}`,
    flag: PROPERTY_TAX_FACTS.blankFieldBehavior,
    replace: "A local annual bill or reviewed effective rate",
  },
];

const SOURCE_TABLE_GRID =
  "grid gap-x-8 gap-y-1 sm:grid-cols-[9rem_minmax(0,1fr)] lg:grid-cols-[11rem_minmax(0,1fr)_16rem]";

export function DataSourcesSection() {
  return (
    <Section rhythm="tight" aria-labelledby="data-sources-heading">
      <div className="max-w-3xl">
        <SectionHeading id="data-sources-heading">
          Visible sources. Editable assumptions.
        </SectionHeading>
        <p className="mt-3 max-w-[62ch] text-lg leading-relaxed text-muted-foreground">
          TrueCap labels sourced benchmarks and manual fallbacks, and keeps
          every assumption editable. Start fast, then replace starting values
          with verified property facts, local comps, and lender terms.
        </p>
      </div>
      <div className="mt-8 border-t-2 border-foreground">
        <div
          aria-hidden
          className={cn(
            SOURCE_TABLE_GRID,
            "hidden border-b border-border py-2.5 text-sm font-semibold text-muted-foreground sm:grid",
          )}
        >
          <span>Starting value</span>
          <span>Source</span>
          <span className="hidden lg:block">Replace it with</span>
        </div>
        <dl>
          {DATA_SOURCES.map((s) => (
            <div key={s.label} className={cn(SOURCE_TABLE_GRID, "border-b border-rule-soft py-4")}>
              <dt className="font-semibold">{s.label}</dt>
              <dd className="min-w-0 text-base leading-relaxed">
                {s.source}
                {s.flag ? (
                  // Flagged in ink at 600: orange means a miss and
                  // nothing else (DESIGN.md color).
                  <span className="mt-1 block font-semibold">{s.flag}</span>
                ) : null}
              </dd>
              <dd className="text-base leading-relaxed sm:col-start-2 lg:col-start-auto">
                <span className="lg:sr-only">Replace it with: </span>
                {s.replace}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="mt-5 max-w-[68ch] text-sm text-muted-foreground">
        Fast starting point. Transparent assumptions. Final control stays with
        you. This is what you show a client who asks where a number came from.
      </p>
    </Section>
  );
}

// ───────────────────────────────────────── What the client receives
/**
 * What the agent's client receives (DESIGN.md "Homepage structure" 4): the
 * real memo screenshot shown as a document, with the co-branding facts
 * beside it. The facts are the /for-agents list (lib/client-receives.ts).
 */
export function ClientReceivesSection() {
  return (
    <Section id="what-your-client-receives" aria-labelledby="client-receives-heading">
      <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div>
          <SectionHeading id="client-receives-heading">What your client receives</SectionHeading>
          <p className="mt-3 max-w-[60ch] text-lg leading-relaxed text-muted-foreground">
            No account on their side, nothing hidden on yours. Branding is set
            up once in your profile and applies to every link and report.
          </p>
          <dl className="mt-8 border-t-2 border-foreground">
            {CLIENT_RECEIVES.map((item) => (
              <div key={item.key} className="border-b border-rule-soft py-4">
                <dt className="text-lg font-semibold">{item.title}</dt>
                <dd className="mt-1 max-w-[64ch] text-base leading-relaxed text-muted-foreground">
                  {item.body}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <ProductShot
          shot={MEMO_SHOT}
          frame="document"
          sizes="(min-width: 1024px) 480px, 100vw"
          alt="TrueCap's written decision memo for the sample deal: the decision, the Offer Ceiling with its targets, the labeled assumptions, and what to verify next"
          caption={
            <>
              The decision memo, generated from the free sample deal.{" "}
              <Link href="/sample-decision-memo" className="tc-link font-medium">
                Read the full sample memo
              </Link>
            </>
          }
          className="lg:pt-2"
        />
      </div>
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

/** A tier's cell from the catalog: the free column is index 0, Pro index 2. */
function freeCell(key: FeatureKey) {
  return ladderCellsForFeature(key)[0];
}
function proCell(key: FeatureKey) {
  return ladderCellsForFeature(key)[2];
}

/**
 * The plans (DESIGN.md "Homepage structure" 5): Free, Pro and, where the
 * deployment sells it, Agent Pro as the page's only cards, then the Free/Pro
 * ladder under them. Amounts come from the Stripe display price with the
 * public catalog as the documented fallback (the /for-agents pattern), and
 * what each tier includes comes from lib/entitlements-catalog.
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

  const freeSaves = freeCell("save_deal");
  const proCompares = proCell("compare_deals");
  const freeAnswers: PlanCardAnswer[] = [
    {
      term: "Your first decision",
      detail:
        "Complete: cash flow, cap rate, CoC, DSCR, Buy Box fit, the Offer Ceiling, downside checks, and next steps.",
    },
    ...(freeCell("cash_flow") === true && freeCell("deal_score") === true
      ? [{ term: "Every deal after that", detail: "Cash flow, cap rate, CoC, DSCR, and the 0–100 Deal score." }]
      : []),
    ...(typeof freeSaves === "string" ? [{ term: "Saved deals", detail: `${freeSaves}.` }] : []),
  ];
  const proAnswers: PlanCardAnswer[] = [
    ...(proCell("buy_box") === true
      ? [{ term: "Does it meet my criteria?", detail: "Buy Box fit on every deal." }]
      : []),
    ...(proCell("mao") === true
      ? [{ term: "What is my Offer Ceiling?", detail: "The highest price that still meets your targets, on every deal." }]
      : []),
    ...(proCell("sensitivity") === true
      ? [{ term: "What could make it fail?", detail: "Downside sensitivity checks." }]
      : []),
    {
      term: "Can I defend the analysis?",
      detail:
        typeof proCompares === "string"
          ? `The decision memo, and deals side by side (${proCompares.toLowerCase()}).`
          : "The decision memo.",
    },
  ];
  // One filled action in the row: the free analysis, the page's primary CTA.
  // The paid plans link out with the secondary button (DESIGN.md "Buttons").
  const cta = buttonVariants({ size: "cta", className: "w-full" });
  const ctaSecondary = buttonVariants({
    size: "cta",
    variant: "outline",
    className: "w-full",
  });

  return (
    <Section aria-labelledby="plans-heading">
      <div className="max-w-3xl">
        <SectionHeading id="plans-heading">
          Free screens the deal.{" "}
          {proOfferName} tells you what
          to offer.
        </SectionHeading>
        <p className="mt-3 max-w-[62ch] text-lg leading-relaxed text-muted-foreground">
          Free shows the economics before you spend more time on a property.{" "}
          {proOfferName} answers four questions on every deal: does it meet
          my criteria, what is my Offer Ceiling, what could make it fail, and
          can I defend the analysis?
          {agentProConfigured
            ? " Agent Pro answers them per client, with a roster."
            : ""}
        </p>
      </div>

      <div
        className={cn(
          "mt-10 grid gap-4 sm:gap-5",
          agentProConfigured ? "md:grid-cols-3" : "md:grid-cols-2 lg:max-w-4xl",
        )}
      >
        <PlanCard
          name="Free"
          audience="See the economics before you spend more time on a property."
          price="$0"
          priceNote="No account or card required."
          answers={freeAnswers}
          action={
            <AnalyzeCtaLink analyticsSource="plans_free" className={cta}>
              Analyze a deal free
            </AnalyzeCtaLink>
          }
        />
        <PlanCard
          name={proOfferName}
          audience="Know what to offer on every deal."
          price={price.proMonthly}
          period="/mo"
          priceNote={<>or {price.proAnnual}&nbsp;a&nbsp;year</>}
          answers={proAnswers}
          action={
            <Link href="/pricing" className={ctaSecondary}>
              See Pro pricing
            </Link>
          }
          footnote={
            <>
              Create an account for a {PRODUCT_EVALUATION_DAYS}-day free trial:
              up to {PRODUCT_EVALUATION_DEAL_LIMIT} Pro deals and{" "}
              {PRODUCT_EVALUATION_COMPARISON_LIMIT} comparison. No card and no
              automatic subscription.
            </>
          }
        />
        {agentProConfigured ? (
          <PlanCard
            data-homepage-agent-pro=""
            name="Agent Pro"
            audience="Win investor clients."
            price={price.agentMonthly}
            period="/mo"
            priceNote={<>or {price.agentAnnual}&nbsp;a&nbsp;year</>}
            answers={[
              { term: "A Buy Box per client", detail: "Up to 100 clients on your roster." },
              {
                term: "Deals screened to their targets",
                detail: "Assign a deal to a client and it is screened against their Buy Box, not yours.",
              },
              { term: "A co-branded memo", detail: "Your client opens it without an account." },
            ]}
            action={
              <Link href="/for-agents" className={ctaSecondary}>
                See TrueCap for agents
              </Link>
            }
          />
        ) : null}
      </div>

      {/* The ladder under the cards: what exactly each tier includes, from
          the catalog, so no visitor guesses where the line is. */}
      <div
        role="region"
        aria-label="Free and Pro comparison"
        className={cn(
          "mt-12 border-t-2 border-foreground",
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
              <th scope="col" className="py-2.5 pr-2 text-left">
                <span className="sr-only">Feature</span>
              </th>
              {ladderHeaders.map((h, i) => (
                <th key={h} scope="col" className="px-1 py-2.5 text-center font-semibold">
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
