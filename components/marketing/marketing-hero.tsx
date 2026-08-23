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
 * <HeroAddressForm /> island (address field + handoff) and the
 * <DealsAnalyzedTicker />, so the rest of this tree ships zero JS.
 */

import { Check, Database, Sparkles, Target, TrendingUp } from "lucide-react";
import { HeroAddressForm } from "@/components/marketing/hero-address-form";
import { DealsAnalyzedTicker } from "@/components/marketing/deals-analyzed-ticker";
import { SAMPLE_DEAL_FIXTURE } from "@/lib/sample-deal";
import { calculateSampleDealOutcome } from "@/lib/sample-deal-analysis";
import { describeMaoTarget } from "@/lib/mao-targets";
import { getMarketingOfferConfig } from "@/lib/marketing-offer-config";
import { buildInputConfidence } from "@/lib/input-confidence";
import { buildWhatNeedsToBeTrue } from "@/lib/decision-thresholds";

export function MarketingHero() {
  const { homepageHeadline, newHomepagePositioningEnabled } = getMarketingOfferConfig();
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
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-14">
          {/* ── Left: value prop + the primary action ─────────────── */}
          <div className="tc-rise-in max-w-2xl">
            {/* Friction-removal eyebrow: answers cost, signup, and card
                objections before the visitor reaches the address field. */}
            <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-card/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary shadow-sm backdrop-blur">
              <Sparkles className="size-3 shrink-0" />
              <span>Free analysis · No signup · No card</span>
            </div>

            {/* Headline: 2 lines max, hierarchy by weight + accent color,
                not runaway scale. Left-aligned (anti-center bias). */}
            <h1 className="text-balance text-4xl font-extrabold leading-[1.04] tracking-tight text-foreground sm:text-5xl lg:text-[2.4rem]">
              {homepageHeadline}
            </h1>
            <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              {newHomepagePositioningEnabled
                ? "Paste a rental listing. Free shows whether it deserves attention; Pro checks it against your Buy Box, solves what must be true, and calculates the highest price that meets your selected targets."
                : "Enter any address. In 60 seconds, TrueCap shows whether the deal cash flows — and Pro solves the exact maximum offer that still hits your targets. Every assumption sourced, every assumption editable."}
            </p>

            {/* Primary action — the address input. Hands off to the
                calculator below via a window event (hero-address-form.tsx). */}
            <HeroAddressForm />

            {/* Risk-reversal line — desktop-only; on phones the eyebrow
                chip four lines up says the same thing verbatim (mobile
                density audit LAND-3). */}
            <p className="mt-3 hidden flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground sm:flex">
              <Check aria-hidden className="size-3.5 shrink-0 text-[var(--metric-positive)]" />
              <span>No signup required. No credit card. Screen deals free.</span>
            </p>
          </div>

          {/* This is an acquisition answer, not a duplicate calculator, so it
              remains useful proof on mobile as well as desktop. */}
          <div className="tc-rise-in tc-delay-2 w-full lg:justify-self-end">
            <HeroProductMock decisionPositioning={newHomepagePositioningEnabled} />
          </div>
        </div>

        {/* Trust band — proof line, data sources, live count, and one
            outcome quote, grouped beneath the split with divider rules
            instead of card boxes (Rule 4: logic-grouping over card overuse). */}
        {/* Mobile: tighter gap to the proof band — the desktop-only capability
            lines above it leave a dead zone between the CTAs and the ticker
            on phones (UX walkthrough P2-10). Desktop rhythm unchanged. */}
        <div className="tc-reveal mt-7 border-t border-border pt-5 sm:mt-14 sm:pt-8">
          <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1.5fr_1fr]">
            <div className="space-y-1.5">
              {/* Capability + sources lines are desktop-only: both restate
                  the subheadline word-for-word two viewports up; the two
                  unique proof elements (ticker + quote) carry the mobile
                  band (mobile density audit LAND-6). */}
              <p className="hidden text-xs font-medium text-foreground/80 sm:block">
                Auto-fills screening benchmarks for rent, rate &amp; tax · Editable assumptions · Cap rate · CoC · DSCR · cash flow
              </p>
              <p className="hidden text-[11px] leading-relaxed text-muted-foreground sm:block">
                Uses <strong className="font-semibold text-foreground">HUD</strong> area-rent benchmarks,{" "}
                <strong className="font-semibold text-foreground">FRED</strong> owner-occupied rate benchmarks, and{" "}
                <strong className="font-semibold text-foreground">state</strong> tax estimates, all editable.
              </p>
              <div className="pt-1">
                <DealsAnalyzedTicker
                  source="runs"
                  minimum={1}
                  plus
                  labelSuffix="analysis runs recorded on TrueCap"
                />
              </div>
            </div>
            {/* Proof that cannot drift or be overstated: the product labels
                each starting assumption as sourced, user-entered, or a smart
                default, and exposes the date/year when the source provides it.
                Customer quotes render only from the verified proof registry
                further down the page. */}
            <div className="flex items-start gap-2.5 border-t border-border pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
              <Database className="mt-0.5 size-4 shrink-0 text-primary/50" aria-hidden />
              <p className="text-xs leading-relaxed text-muted-foreground">
                <strong className="text-foreground">No black-box inputs.</strong>{" "}
                Every starting assumption is labeled with its source or as your
                input, stays editable, and carries a clear verification step.
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

function HeroProductMock({ decisionPositioning }: { decisionPositioning: boolean }) {
  // COMPUTED, not hard-coded: the card renders the REAL engine output for
  // the REAL sample deal the "View a sample report" button loads. Sharing
  // lib/sample-deal.ts + computing here makes card/analysis divergence
  // impossible. Server component, so this runs at build/ISR time — zero
  // client cost.
  const { analysis: result, dealScore: score, maxOffer } = calculateSampleDealOutcome();
  const cf = Math.round(result.netCashFlow);
  const cfLabel = `${cf >= 0 ? "+" : "-"}$${Math.abs(cf).toLocaleString("en-US")}`;
  const capLabel = `${result.capRate.toFixed(1)}%`;
  // Clearly labeled example targets, solved by the same deterministic MAO
  // engine used in the product. The target is intentionally above the
  // sample's list-price cash flow so the card demonstrates the decision.
  const targetCashFlow = SAMPLE_DEAL_FIXTURE.maoTarget.monthlyCashFlow ?? 0;
  const targetLabel = describeMaoTarget(SAMPLE_DEAL_FIXTURE.maoTarget);
  const maxOfferLabel = maxOffer
    ? `$${maxOffer.maxPrice.toLocaleString("en-US")}`
    : "Not reachable";
  const listPrice = Number(SAMPLE_DEAL_FIXTURE.values.purchasePrice);
  const gap = maxOffer ? listPrice - maxOffer.maxPrice : null;
  const sampleConfidence = buildInputConfidence({
    values: SAMPLE_DEAL_FIXTURE.values,
    touchedFields: new Set(Object.keys(SAMPLE_DEAL_FIXTURE.values)),
  });
  const target = { monthlyCashFlow: targetCashFlow, dscr: 1.25 };
  const decisionThresholds = buildWhatNeedsToBeTrue(SAMPLE_DEAL_FIXTURE.values, target);
  const askingClears = decisionThresholds?.targetAlreadyMet ?? false;
  const requiredRent = decisionThresholds?.requiredRent ?? null;
  const maxRate = decisionThresholds?.maxInterestRate ?? null;

  return (
    <div className="relative mx-auto w-full max-w-lg">
      {/* Inline keyframes — see HERO_ANIM_CSS comment above. */}
      <style dangerouslySetInnerHTML={{ __html: HERO_ANIM_CSS }} />

      {/* card */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:p-6">
        {/* browser chrome + a small LIVE indicator communicating that the
            analyzer is running, not a static screenshot. */}
        <div className="mb-4 flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-red-400/80" />
          <span className="size-2.5 rounded-full bg-amber-400/80" />
          <span className="size-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-3 min-w-0 flex-1 truncate rounded-full bg-muted px-3 py-0.5 text-[10px] font-medium text-muted-foreground">
            <span className="sm:hidden">usetruecap.com</span>
            <span className="hidden sm:inline">usetruecap.com / {SAMPLE_DEAL_FIXTURE.display.shortAddress}</span>
          </span>
          <span
            aria-label="Example analysis"
            className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--brand-green)]/30 bg-[var(--brand-green-light)] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-[var(--brand-green)]"
          >
            <span aria-hidden className="tc-hero-pulse-dot animate-pulse size-1.5 rounded-full bg-[var(--brand-green)]" />
            Example
          </span>
        </div>

        {/* address + verdict row. */}
        <div className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
          <div className="tc-hero-step-1 min-w-0 sm:flex-1">
            <div className="text-base font-extrabold text-foreground sm:text-lg">{SAMPLE_DEAL_FIXTURE.display.shortAddress}</div>
            <div className="text-xs text-muted-foreground">{SAMPLE_DEAL_FIXTURE.display.subtitle}</div>
          </div>
          <div className="tc-hero-step-5 flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white sm:px-2.5 sm:py-1 sm:text-[10px] ${
                askingClears ? "bg-[var(--brand-green)]" : "bg-[var(--brand-orange)]"
              }`}
            >
              {askingClears ? "Pursue at this price" : "Pass at this price"}
            </span>
            <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white sm:px-2.5 sm:py-1 sm:text-[10px]">
              Strong fundamentals · Score {Math.round(score.score)}/100
            </span>
            <span className="rounded-full bg-[var(--brand-green)] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white sm:px-2.5 sm:py-1 sm:text-[10px]">
              {score.riskLevel}
            </span>
          </div>
        </div>

        {/* Acquisition answer first; supporting metrics stay subordinate. */}
        <div className="tc-hero-step-2 mt-4 rounded-xl border-2 border-primary/30 bg-[var(--brand-blue-light)] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-primary">
                <Target aria-hidden className="size-3.5" /> TrueCap Max Offer
              </div>
              <div className="mt-1 font-mono text-3xl font-extrabold tabular-nums tracking-tight text-primary">
                {maxOfferLabel}
              </div>
              {gap != null && gap > 0 ? (
                <div className="mt-0.5 text-xs font-semibold text-muted-foreground">
                  ${gap.toLocaleString("en-US")} below the ${listPrice.toLocaleString("en-US")} list price
                </div>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">Price ceiling for {targetLabel}.</p>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                Calculated from your selected targets. This is not a recommended offer.
              </p>
            </div>
            <span className="rounded-full bg-[var(--brand-green)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">
              Example targets
            </span>
          </div>
        </div>

        {decisionPositioning ? (
          <>
            <div className="mt-3 grid grid-cols-1 gap-2 min-[360px]:grid-cols-3 sm:gap-3">
              {/* Was "Pass"/"Miss" — "Pass" here meant it CLEARS, while the
                  verdict pill above uses the deal-score vocabulary. */}
              <MockTile label="At asking" value={askingClears ? "Clears" : "Miss"} tone={askingClears ? "success" : "primary"} sub={`${cfLabel}/mo`} stepClass="tc-hero-step-3" />
              <MockTile label="Input confidence" value={`${sampleConfidence.score}%`} tone="primary" sub="readiness, not probability" stepClass="tc-hero-step-4" />
              <MockTile label="Before offering" value={`${sampleConfidence.offerReadyRemaining.length}`} tone="primary" sub="inputs to verify" stepClass="tc-hero-step-5" />
            </div>
            {!askingClears ? (
              <div className="tc-hero-step-6 mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-foreground">
                <strong>What needs to be true:</strong>{" "}
                {decisionThresholds?.maxPrice.thresholdValue != null
                  ? `price ≤ $${Math.round(decisionThresholds.maxPrice.thresholdValue).toLocaleString("en-US")}`
                  : "review the asking price"}
                {requiredRent?.status === "change_required" && requiredRent.thresholdValue != null
                  ? ` or rent ≥ $${Math.round(requiredRent.thresholdValue).toLocaleString("en-US")}/mo`
                  : ""}
                {maxRate?.status === "change_required" && maxRate.thresholdValue != null
                  ? ` or rate ≤ ${maxRate.thresholdValue.toFixed(2)}%`
                  : ""}
                .
              </div>
            ) : null}
          </>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-2 min-[360px]:grid-cols-3 sm:gap-3">
            <MockTile label="Target cash flow" value={`$${targetCashFlow}`} tone="primary" sub="per month" stepClass="tc-hero-step-3" />
            <MockTile label="DSCR at max" value={maxOffer ? maxOffer.achieved.dscr.toFixed(2) : "—"} tone="success" sub="target ≥ 1.25" stepClass="tc-hero-step-4" />
            <MockTile label="At list" value={cfLabel} tone="success" sub={`${capLabel} cap`} stepClass="tc-hero-step-5" />
          </div>
        )}

        {/* Verdict line — final step 6, one concise sentence. */}
        <div className={`${decisionPositioning ? "" : "tc-hero-step-6"} mt-4 flex items-start gap-2 rounded-xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-3 text-xs text-foreground`}>
          <TrendingUp aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--brand-green)]" />
          <span>
            <strong>Decision:</strong>{" "}
            {maxOffer && gap != null && gap > 0
              ? `Works at ${maxOfferLabel}. At list, it misses the example $${targetCashFlow}/mo cash-flow target.`
              : "The list price clears the example targets. Stress-test the assumptions before offering."}
          </span>
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
          Example analysis using editable sample inputs. Estimates are not an appraisal or investment guarantee.
        </p>
      </div>
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
      <div className={`text-[10px] font-bold uppercase tracking-widest text-muted-foreground ${small ? "" : "sm:text-[10px]"}`}>
        {label}
      </div>
      <div className={`mt-1 font-extrabold tabular-nums ${color} ${small ? "text-lg" : "text-lg sm:text-xl"}`}>
        {value}
      </div>
      {sub ? <div className="text-[10px] text-muted-foreground">{sub}</div> : null}
    </div>
  );
}
