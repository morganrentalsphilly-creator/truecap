/**
 * Marketing hero that renders ABOVE the calculator for cold (unauth)
 * visitors. Authenticated users skip this entirely — they already know
 * what TrueCap is and want the calculator immediately.
 *
 * Layout (taste-skill redesign, Jun 2026): an ASYMMETRIC SPLIT, not a
 * centered stack. Left column carries the value prop + the primary
 * action (address input above the fold); the right column is the live,
 * computed preview card (the hero "asset"). Social proof regroups into
 * a divided trust band beneath the split — logic-grouped with rules,
 * not boxed cards. We deliberately keep the computed live card instead
 * of stock imagery: it renders REAL engine output for the sample deal,
 * so it's the most honest, on-brand asset and needs no external CDN.
 *
 * SERVER COMPONENT. The only client behavior is the tiny
 * <HeroAddressForm /> island (address field + handoff), so the rest of this
 * tree ships zero JS.
 */

import { Check, Database, Target, TrendingUp } from "lucide-react";
import Link from "next/link";
import { ProductShot, findProductShot } from "@/components/marketing/product-shot";
import { HeroAddressForm } from "@/components/marketing/hero-address-form";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";
import { calculateSampleDealOutcome } from "@/lib/sample-deal-analysis";
import { describeMaoTarget } from "@/lib/mao-targets";
import { getMarketingOfferConfig } from "@/lib/marketing-offer-config";
import { buildWhatNeedsToBeTrue } from "@/lib/decision-thresholds";

export function MarketingHero() {
  const { homepageHeadline, newHomepagePositioningEnabled } =
    getMarketingOfferConfig();
  return (
    <section className="truecap-marketing-shell relative overflow-hidden border-b border-border bg-gradient-to-b from-[var(--brand-blue-light)] via-background to-background">
      {/* Soft ambient accent behind the preview — a single tinted blob,
          no neon glow. Sits to the right so the composition reads
          asymmetric rather than a centered halo. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-[-12%] -z-10 h-[460px] w-[680px] rounded-full bg-primary/10 blur-3xl"
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        {/* Asymmetric split: conversion copy left, live preview right.
            Collapses to a single column below lg — mobile gets the copy
            + form first, then the preview. */}
         <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-14">
          {/* ── Left: value prop + the primary action ─────────────── */}
          <div className="tc-rise-in max-w-2xl">
            {/* Friction-removal eyebrow: answers cost, signup, and card
                objections before the visitor reaches the address field. */}
            <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-card/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary shadow-sm backdrop-blur">
              <Target className="size-3 shrink-0" />
              <span>Rental property underwriting</span>
            </div>

            {/* Headline: 2 lines max, hierarchy by weight + accent color,
                not runaway scale. Left-aligned (anti-center bias). */}
            <h1 className="text-balance text-4xl font-extrabold leading-[1.04] tracking-tight text-foreground sm:text-5xl lg:text-[2.4rem]">
              {homepageHeadline}
            </h1>
            <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              {newHomepagePositioningEnabled
                ? "Paste a listing. TrueCap shows the cash flow, DSCR, and the highest price that still hits your targets — with every assumption labeled and editable."
                : "Enter an address for a first-pass screen with labeled, editable assumptions. Pro adds the Offer Ceiling: the highest price that still meets your targets."}
            </p>

            {/* Primary action — the address input. Hands off to the
                calculator below via a window event (hero-address-form.tsx). */}
            <HeroAddressForm />

            {/* Keep the full risk reversal next to the primary action at every
                viewport. Mobile paid traffic must not have to infer account or
                card requirements from a generic eyebrow. */}
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <Check
                aria-hidden
                className="size-3.5 shrink-0 text-[var(--metric-positive)]"
              />
              <span>Free. No account. Your first full decision is included.</span>
            </p>
          </div>

          {/* This is an acquisition answer, not a duplicate calculator, so it
              remains useful proof on mobile as well as desktop. */}
          <div className="tc-rise-in tc-delay-2 min-w-0 w-full lg:justify-self-end">
            <HeroProductShot
              decisionPositioning={newHomepagePositioningEnabled}
            />
          </div>
        </div>

        {/* Trust band — data-source disclosure grouped beneath the split with divider rules
            instead of card boxes (Rule 4: logic-grouping over card overuse). */}
        {/* Keep the disclosure adjacent to the product proof on mobile and desktop. */}
        <div className="tc-reveal mt-7 border-t border-border pt-5 sm:mt-14 sm:pt-8">
          <div className="mx-auto max-w-3xl">
            {/* Proof that cannot drift or be overstated: the product labels
                each starting assumption as sourced, user-entered, or a smart
                default, and exposes the date/year when the source provides it.
                Customer quotes render only from the verified proof registry
                further down the page. */}
            <div className="flex items-start gap-2.5">
              <Database
                className="mt-0.5 size-4 shrink-0 text-primary/50"
                aria-hidden
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                <strong className="text-foreground">
                  No black-box inputs.
                </strong>{" "}
                Every assumption is labeled with its source — HUD FMR, FRED
                rate, TrueCap default, or your input — and stays editable.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Static product preview — fast-loading CSS mockup of a finished deal.
 * Mirrors the per-deal OG card aesthetic so the brand looks coherent
 * across surfaces.
 *
 * Animation styles inlined into the component because the same keyframes
 * defined in globals.css weren't reaching the browser in production
 * (Morgan reported nothing animating at all, including the LIVE dot).
 * Inlining via a server-rendered <style> tag bypasses the Tailwind v4 /
 * PostCSS pipeline — the rules ship in the HTML payload verbatim.
 *
 * Defines:
 *   - .tc-hero-pulse-dot — 1.5s blink for the LIVE indicator.
 *   - .tc-hero-step-1 .. .tc-hero-step-6 — one sequential reveal
 *     (address → tile 1 → tile 2 → tile 3 → pills → verdict line).
 *
 * Honors prefers-reduced-motion to disable for a11y compliance.
 */
const HERO_ANIM_CSS = `
@keyframes tc-hero-pulse-dot {
  0%, 100% { opacity: 0.4; transform: scale(0.85); }
  50%      { opacity: 1;   transform: scale(1);    }
}
@keyframes tc-hero-step-1 {
  0%, 4%    { opacity: 0; transform: translateY(6px); }
  12%, 100% { opacity: 1; transform: translateY(0); }
}
@keyframes tc-hero-step-2 {
  0%, 12%   { opacity: 0; transform: translateY(6px); }
  20%, 100% { opacity: 1; transform: translateY(0); }
}
@keyframes tc-hero-step-3 {
  0%, 20%   { opacity: 0; transform: translateY(6px); }
  28%, 100% { opacity: 1; transform: translateY(0); }
}
@keyframes tc-hero-step-4 {
  0%, 28%   { opacity: 0; transform: translateY(6px); }
  36%, 100% { opacity: 1; transform: translateY(0); }
}
@keyframes tc-hero-step-5 {
  0%, 36%   { opacity: 0; transform: translateY(6px); }
  44%, 100% { opacity: 1; transform: translateY(0); }
}
@keyframes tc-hero-step-6 {
  0%, 44%   { opacity: 0; transform: translateY(6px); }
  52%, 100% { opacity: 1; transform: translateY(0); }
}
.tc-hero-pulse-dot { animation: tc-hero-pulse-dot 1.5s ease-in-out infinite; }
.tc-hero-step-1 { animation: tc-hero-step-1 3s ease-out both; }
.tc-hero-step-2 { animation: tc-hero-step-2 3s ease-out both; }
.tc-hero-step-3 { animation: tc-hero-step-3 3s ease-out both; }
.tc-hero-step-4 { animation: tc-hero-step-4 3s ease-out both; }
.tc-hero-step-5 { animation: tc-hero-step-5 3s ease-out both; }
.tc-hero-step-6 { animation: tc-hero-step-6 3s ease-out both; }
@media (prefers-reduced-motion: reduce) {
  .tc-hero-pulse-dot,
  .tc-hero-step-1, .tc-hero-step-2, .tc-hero-step-3,
  .tc-hero-step-4, .tc-hero-step-5, .tc-hero-step-6 {
    animation: none;
  }
}
`;

/**
 * The hero visual: the REAL verdict screenshot from the no-account sample
 * flow (scripts/capture-screenshots.ts), preloaded because it is the LCP
 * element. Falls back to the computed card only when the pipeline has not
 * produced the shot yet — never a placeholder image.
 */
function HeroProductShot({ decisionPositioning }: { decisionPositioning: boolean }) {
  const shot = findProductShot("verdict", "desktop");
  if (!shot) return <HeroProductMock decisionPositioning={decisionPositioning} />;
  const { maxOffer } = calculateSampleDealOutcome();
  const listPrice = SAMPLE_DEAL_FIXTURE.values.purchasePrice;
  const gap = maxOffer ? Math.max(0, listPrice - maxOffer.maxPrice) : null;
  const alt = maxOffer
    ? `TrueCap's decision view for the sample deal: an Offer Ceiling of $${maxOffer.maxPrice.toLocaleString("en-US")} against a $${listPrice.toLocaleString("en-US")} asking price${gap ? ` ($${gap.toLocaleString("en-US")} above the ceiling)` : ""}, with cash flow after reserves, DSCR, the best next step, and the fastest paths to meet the targets`
    : "TrueCap's decision view for the sample deal: the Offer Ceiling beside the asking price, cash flow after reserves, and DSCR";
  return (
    <div data-hero-product-shot="">
      <ProductShot
        shot="verdict"
        viewport="desktop"
        alt={alt}
        priority
        sizes="(min-width: 1024px) 480px, 100vw"
      />
      <p className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>Real output from the free sample deal.</span>
        <Link
          href="/analyze?sample=1"
          className="inline-flex min-h-11 items-center font-semibold text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Live sample →
        </Link>
      </p>
    </div>
  );
}

function HeroProductMock({
  decisionPositioning,
}: {
  decisionPositioning: boolean;
}) {
  // COMPUTED, not hard-coded: the card renders the REAL engine output for
  // the REAL sample deal the "View a sample report" button loads. Sharing
  // lib/sample-deal.ts + computing here makes card/analysis divergence
  // impossible. Server component, so this runs at build/ISR time — zero
  // client cost.
  const {
    analysis: result,
    maxOffer,
  } = calculateSampleDealOutcome();
  const cf = Math.round(result.netCashFlow);
  const cfLabel = `${cf >= 0 ? "+" : "-"}$${Math.abs(cf).toLocaleString("en-US")}`;
  const capLabel = `${result.capRate.toFixed(1)}%`;
  // Clearly labeled example targets, solved by the same deterministic Offer Ceiling
  // engine used in the product. The target is intentionally above the
  // sample's list-price cash flow so the card demonstrates the decision.
  const targetCashFlow = SAMPLE_DEAL_FIXTURE.maoTarget.monthlyCashFlow ?? 0;
  const targetLabel = describeMaoTarget(SAMPLE_DEAL_FIXTURE.maoTarget);
  const maxOfferLabel = maxOffer
    ? `$${maxOffer.maxPrice.toLocaleString("en-US")}`
    : "Not reachable";
  const listPrice = Number(SAMPLE_DEAL_FIXTURE.values.purchasePrice);
  const gap = maxOffer ? listPrice - maxOffer.maxPrice : null;
  const target = { monthlyCashFlow: targetCashFlow, dscr: 1.25 };
  const decisionThresholds = buildWhatNeedsToBeTrue(
    SAMPLE_DEAL_FIXTURE.values,
    target,
  );
  const askingClears = decisionThresholds?.targetAlreadyMet ?? false;
  const requiredRent = decisionThresholds?.requiredRent ?? null;
  const maxRate = decisionThresholds?.maxInterestRate ?? null;
  const viabilityPaths = [
    decisionThresholds?.maxPrice.thresholdValue != null
      ? `Price ≤ $${Math.round(decisionThresholds.maxPrice.thresholdValue).toLocaleString("en-US")}`
      : "Review the asking price",
    requiredRent?.status === "change_required" &&
    requiredRent.thresholdValue != null
      ? `Rent ≥ $${Math.round(requiredRent.thresholdValue).toLocaleString("en-US")}/mo`
      : null,
    maxRate?.status === "change_required" && maxRate.thresholdValue != null
      ? `Rate ≤ ${maxRate.thresholdValue.toFixed(2)}%`
      : null,
  ].filter((path): path is string => path !== null);

  return (
    <div className="relative mx-auto min-w-0 w-full max-w-lg">
      {/* Inline keyframes — see HERO_ANIM_CSS comment above. */}
      <style dangerouslySetInnerHTML={{ __html: HERO_ANIM_CSS }} />

      {/* card */}
      <article
        aria-label="Illustrative sample analysis"
        data-hero-sample-card=""
         className="w-full min-w-0 max-w-full rounded-2xl border border-border bg-card p-4 shadow-[0_24px_70px_rgba(15,23,42,0.10)] max-[250px]:p-3 sm:p-6"
      >
        {/* browser chrome + a small LIVE indicator communicating that the
            analyzer is running, not a static screenshot. */}
        <div className="mb-4 flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-red-400/80" />
          <span className="size-2.5 rounded-full bg-amber-400/80" />
          <span className="size-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-3 min-w-0 flex-1 truncate rounded-full bg-muted px-3 py-0.5 text-[10px] font-medium text-muted-foreground">
            <span className="sm:hidden">usetruecap.com</span>
            <span className="hidden sm:inline">
              usetruecap.com / {SAMPLE_DEAL_FIXTURE.display.shortAddress}
            </span>
          </span>
          <span
            aria-label="Example analysis"
            className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--brand-green)]/30 bg-[var(--brand-green-light)] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-[var(--brand-green)]"
          >
            <span
              aria-hidden
              className="tc-hero-pulse-dot animate-pulse size-1.5 rounded-full bg-[var(--brand-green)]"
            />
            Example
          </span>
        </div>

        {/* Keep identity and outcome in separate rows. The card is capped at
            32rem even on wide screens, so viewport breakpoints cannot safely
            infer its available inline size. The old sm:flex row collapsed the
            property name to ~25px between 640–1023px and at common zoom levels. */}
        <div
          data-hero-sample-summary=""
          className="border-b border-border pb-4"
        >
          <div data-hero-sample-property="" className="tc-hero-step-1 min-w-0">
            <div className="text-pretty text-base font-extrabold leading-snug text-foreground sm:text-lg">
              {SAMPLE_DEAL_FIXTURE.display.shortAddress}
            </div>
            <div className="mt-0.5 break-words text-xs leading-relaxed text-muted-foreground">
              {SAMPLE_DEAL_FIXTURE.display.subtitle}
            </div>
          </div>
           <div
             data-hero-sample-status=""
             className="tc-hero-step-5 mt-3 min-w-0"
           >
            <span
              className={`min-w-0 rounded-lg border px-3 py-2 text-xs font-bold leading-snug ${
                askingClears
                  ? "border-[var(--brand-green)]/30 bg-[var(--brand-green-light)] text-[var(--brand-green)]"
                  : "border-[var(--brand-orange)]/30 bg-[var(--brand-orange-light)] text-[var(--brand-orange-text)]"
              }`}
            >
               {askingClears
                 ? "Asking price clears the sample targets"
                 : gap != null && gap > 0
                   ? `Asking price is $${gap.toLocaleString("en-US")} above the ceiling`
                   : "Asking price is above the ceiling"}
             </span>
           </div>
        </div>

        {/* Acquisition answer first; supporting metrics stay subordinate. */}
        <div
          data-hero-sample-offer=""
          className="tc-hero-step-2 mt-4 min-w-0 rounded-xl border-2 border-primary/30 bg-[var(--brand-blue-light)] p-3 min-[320px]:p-4"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-[var(--brand-blue-text)]">
            <Target aria-hidden className="size-3.5" /> Offer Ceiling
          </div>
          <div className="mt-1 break-words font-mono text-2xl font-extrabold tabular-nums tracking-tight text-primary min-[320px]:text-3xl">
            {maxOfferLabel}
          </div>
          {gap != null && gap > 0 ? (
            <div className="mt-0.5 text-xs font-semibold text-foreground/80">
              ${gap.toLocaleString("en-US")} below the $
              {listPrice.toLocaleString("en-US")} list price
            </div>
          ) : null}
           <p className="mt-1 text-xs text-foreground/80">
             Sample targets · {targetLabel}.
           </p>
           <p className="mt-1 text-[10px] leading-relaxed text-foreground/80">
             The highest price that still clears these targets.
           </p>
        </div>

        {decisionPositioning ? (
          !askingClears ? (
            <div className="tc-hero-step-3 mt-3 min-w-0 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-foreground">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-primary">
                What would make this sample work
              </p>
              <p className="mt-1 break-words font-semibold leading-relaxed">
                {viabilityPaths.join(" · ")}
              </p>
            </div>
          ) : null
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-2 min-[360px]:grid-cols-3 sm:gap-3">
            <MockTile
              label="Target cash flow"
              value={`$${targetCashFlow}`}
              tone="primary"
              sub="per month"
              stepClass="tc-hero-step-3"
            />
            <MockTile
              label="DSCR at max"
              value={maxOffer ? maxOffer.achieved.dscr.toFixed(2) : "—"}
              tone="success"
              sub="target ≥ 1.25"
              stepClass="tc-hero-step-4"
            />
            <MockTile
              label="At list"
              value={cfLabel}
              tone="success"
              sub={`${capLabel} cap`}
              stepClass="tc-hero-step-5"
            />
          </div>
        )}

        {/* Verdict line — final step 6, one concise sentence. */}
        {!decisionPositioning ? (
          <div className="tc-hero-step-6 mt-4 flex items-start gap-2 rounded-xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-3 text-xs text-foreground">
            <TrendingUp
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-[var(--brand-green)]"
            />
            <span>
              <strong>Buy Box fit:</strong>{" "}
              {maxOffer && gap != null && gap > 0
                ? `Asking is $${gap.toLocaleString("en-US")} above the ${maxOfferLabel} Offer Ceiling, so it misses the sample targets.`
                : "The asking price meets the sample targets under the assumptions shown."}
            </span>
          </div>
        ) : null}
        <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
          Illustrative analysis using editable sample inputs. Estimates are not
          an appraisal or investment guarantee.
        </p>
      </article>
      {/* edge fade */}
      <div className="pointer-events-none absolute inset-x-0 -bottom-6 h-12 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}

function MockTile({
  label,
  value,
  tone,
  sub,
  small,
  stepClass,
}: {
  label: string;
  value: string;
  tone: "success" | "primary";
  sub?: string;
  small?: boolean;
  /**
   * Optional sequential-reveal animation class (`tc-hero-step-N`).
   * No-op when prefers-reduced-motion is set (handled in HERO_ANIM_CSS).
   */
  stepClass?: string;
}) {
  const color =
    tone === "success" ? "text-[var(--metric-positive)]" : "text-primary";
  return (
    <div
      className={`min-w-0 rounded-xl border border-border bg-background p-3 ${stepClass ?? ""}`}
    >
      <div
        className={`text-[10px] font-bold uppercase tracking-widest text-muted-foreground ${small ? "" : "sm:text-[10px]"}`}
      >
        {label}
      </div>
      <div
        className={`mt-1 font-extrabold tabular-nums ${color} ${small ? "text-lg" : "text-lg sm:text-xl"}`}
      >
        {value}
      </div>
      {sub ? (
        <div className="text-[10px] text-muted-foreground">{sub}</div>
      ) : null}
    </div>
  );
}
