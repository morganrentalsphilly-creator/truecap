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

import { Check, Quote, Sparkles, Target, TrendingUp } from "lucide-react";
import { HeroAddressForm } from "@/components/marketing/hero-address-form";
import { DealsAnalyzedTicker } from "@/components/marketing/deals-analyzed-ticker";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { buildDealScoreInputFromAnalysis, computeDealScore, recommendationLabel } from "@/lib/deal-score";
import { SAMPLE_DEAL_DISPLAY, SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";
import { calculateMaxAllowableOffer } from "@/lib/max-allowable-offer";
import { getMarketingOfferConfig } from "@/lib/marketing-offer-config";

export function MarketingHero() {
  const { homepageHeadline } = getMarketingOfferConfig();
  return (
    <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-[var(--brand-blue-light)] via-background to-background">
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
            {/* Risk-reversal eyebrow — value chip, not a version label. */}
            <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-card/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary shadow-sm backdrop-blur">
              <Sparkles className="size-3 shrink-0" />
              <span>TrueCap · Rental Deal Decision Engine</span>
            </div>

            {/* Headline: 2 lines max, hierarchy by weight + accent color,
                not runaway scale. Left-aligned (anti-center bias). */}
            <h1 className="text-balance text-4xl font-extrabold leading-[1.04] tracking-tight text-foreground sm:text-5xl lg:text-[2.4rem]">
              {homepageHeadline}
            </h1>
            <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Paste an address and TrueCap pulls the key assumptions, checks
              the property against your Buy Box, stress-tests the downside,
              and calculates the highest price you can pay while still hitting
              your investment targets.
            </p>

            {/* Primary action — the address input. Hands off to the
                calculator below via a window event (hero-address-form.tsx). */}
            <HeroAddressForm />

            {/* Risk-reversal line — desktop-only; on phones the eyebrow
                chip four lines up says the same thing verbatim (mobile
                density audit LAND-3). */}
            <p className="mt-3 hidden flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground sm:flex">
              <Check className="size-3.5 shrink-0 text-[var(--metric-positive)]" />
              <span>No credit card required. Screen deals free. Upgrade when you&apos;re ready to act.</span>
            </p>
          </div>

          {/* This is an acquisition answer, not a duplicate calculator, so it
              remains useful proof on mobile as well as desktop. */}
          <div className="tc-rise-in tc-delay-2 w-full lg:justify-self-end">
            <HeroProductMock />
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
                Auto-fills rent, rate &amp; tax · Editable assumptions · Cap rate · CoC · DSCR · cash flow
              </p>
              <p className="hidden text-[11px] leading-relaxed text-muted-foreground sm:block">
                Uses <strong className="font-semibold text-foreground">HUD</strong> rent,{" "}
                <strong className="font-semibold text-foreground">FRED</strong> mortgage rates, and{" "}
                <strong className="font-semibold text-foreground">state</strong> tax defaults, all editable.
              </p>
              <div className="pt-1">
                <DealsAnalyzedTicker
                  source="runs"
                  minimum={1}
                  plus
                  labelSuffix="deals analyzed by investors, agents, and house hackers"
                />
              </div>
            </div>
            {/* One outcome-specific quote — the strongest, revenue-tied
                proof sits near the CTA; the rest live in SocialProof below. */}
            <figure className="flex items-start gap-2.5 border-t border-border pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
              <Quote className="mt-0.5 size-4 shrink-0 text-primary/40" />
              <figcaption className="text-xs leading-relaxed text-muted-foreground">
                <span className="text-foreground">
                  &ldquo;Closed three more deals this quarter because I could move faster.&rdquo;
                </span>
                <span className="mt-1 block font-semibold text-foreground/70">
                  Jordan M., buy-and-hold investor (18 doors)
                </span>
              </figcaption>
            </figure>
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
 *   - .tc-hero-step-1 .. .tc-hero-step-6 — 5s sequential reveal loop
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
  12%, 94%  { opacity: 1; transform: translateY(0); }
  100%      { opacity: 0; transform: translateY(6px); }
}
@keyframes tc-hero-step-2 {
  0%, 12%   { opacity: 0; transform: translateY(6px); }
  20%, 94%  { opacity: 1; transform: translateY(0); }
  100%      { opacity: 0; transform: translateY(6px); }
}
@keyframes tc-hero-step-3 {
  0%, 20%   { opacity: 0; transform: translateY(6px); }
  28%, 94%  { opacity: 1; transform: translateY(0); }
  100%      { opacity: 0; transform: translateY(6px); }
}
@keyframes tc-hero-step-4 {
  0%, 28%   { opacity: 0; transform: translateY(6px); }
  36%, 94%  { opacity: 1; transform: translateY(0); }
  100%      { opacity: 0; transform: translateY(6px); }
}
@keyframes tc-hero-step-5 {
  0%, 36%   { opacity: 0; transform: translateY(6px); }
  44%, 94%  { opacity: 1; transform: translateY(0); }
  100%      { opacity: 0; transform: translateY(6px); }
}
@keyframes tc-hero-step-6 {
  0%, 44%   { opacity: 0; transform: translateY(6px); }
  52%, 94%  { opacity: 1; transform: translateY(0); }
  100%      { opacity: 0; transform: translateY(6px); }
}
.tc-hero-pulse-dot { animation: tc-hero-pulse-dot 1.5s ease-in-out infinite; }
.tc-hero-step-1 { animation: tc-hero-step-1 5s ease-in-out infinite; }
.tc-hero-step-2 { animation: tc-hero-step-2 5s ease-in-out infinite; }
.tc-hero-step-3 { animation: tc-hero-step-3 5s ease-in-out infinite; }
.tc-hero-step-4 { animation: tc-hero-step-4 5s ease-in-out infinite; }
.tc-hero-step-5 { animation: tc-hero-step-5 5s ease-in-out infinite; }
.tc-hero-step-6 { animation: tc-hero-step-6 5s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .tc-hero-pulse-dot,
  .tc-hero-step-1, .tc-hero-step-2, .tc-hero-step-3,
  .tc-hero-step-4, .tc-hero-step-5, .tc-hero-step-6 {
    animation: none;
  }
}
`;

function HeroProductMock() {
  // COMPUTED, not hard-coded: the card renders the REAL engine output for
  // the REAL sample deal the "View a sample report" button loads. Sharing
  // lib/sample-deal.ts + computing here makes card/analysis divergence
  // impossible. Server component, so this runs at build/ISR time — zero
  // client cost.
  const result = calculateAnalysis(SAMPLE_DEAL_VALUES);
  const score = computeDealScore(buildDealScoreInputFromAnalysis(SAMPLE_DEAL_VALUES, result));
  const cf = Math.round(result.netCashFlow);
  const cfLabel = `${cf >= 0 ? "+" : "-"}$${Math.abs(cf).toLocaleString("en-US")}`;
  const capLabel = `${result.capRate.toFixed(1)}%`;
  // Clearly labeled example targets, solved by the same deterministic MAO
  // engine used in the product. The target is intentionally above the
  // sample's list-price cash flow so the card demonstrates the decision.
  const targetCashFlow = 750;
  const maxOffer = calculateMaxAllowableOffer(SAMPLE_DEAL_VALUES, {
    monthlyCashFlow: targetCashFlow,
    dscr: 1.25,
  });
  const maxOfferLabel = maxOffer
    ? `$${maxOffer.maxPrice.toLocaleString("en-US")}`
    : "Not reachable";
  const listPrice = Number(SAMPLE_DEAL_VALUES.purchasePrice);
  const gap = maxOffer ? listPrice - maxOffer.maxPrice : null;

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
            <span className="hidden sm:inline">usetruecap.com / {SAMPLE_DEAL_DISPLAY.shortAddress}</span>
          </span>
          <span
            aria-label="Example analysis"
            className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--brand-green)]/30 bg-[var(--brand-green-light)] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-[var(--brand-green)]"
          >
            <span className="tc-hero-pulse-dot animate-pulse size-1.5 rounded-full bg-[var(--brand-green)]" />
            Example
          </span>
        </div>

        {/* address + verdict row. */}
        <div className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
          <div className="tc-hero-step-1 min-w-0 sm:flex-1">
            <div className="text-base font-extrabold text-foreground sm:text-lg">{SAMPLE_DEAL_DISPLAY.shortAddress}</div>
            <div className="text-xs text-muted-foreground">{SAMPLE_DEAL_DISPLAY.subtitle}</div>
          </div>
          <div className="tc-hero-step-5 flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="rounded-full bg-[var(--brand-green)] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white sm:px-2.5 sm:py-1 sm:text-[10px]">
              {recommendationLabel(score.recommendation)}
            </span>
            <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white sm:px-2.5 sm:py-1 sm:text-[10px]">
              Deal Score {Math.round(score.score)}
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
                <Target className="size-3.5" /> TrueCap Max Offer
              </div>
              <div className="mt-1 font-mono text-3xl font-extrabold tabular-nums tracking-tight text-primary">
                {maxOfferLabel}
              </div>
              {gap != null && gap > 0 ? (
                <div className="mt-0.5 text-xs font-semibold text-muted-foreground">
                  ${gap.toLocaleString("en-US")} below the ${listPrice.toLocaleString("en-US")} list price
                </div>
              ) : null}
            </div>
            <span className="rounded-full bg-[var(--brand-green)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">
              Example targets
            </span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
          <MockTile label="Target cash flow" value={`$${targetCashFlow}`} tone="primary" sub="per month" stepClass="tc-hero-step-3" />
          <MockTile label="DSCR at max" value={maxOffer ? maxOffer.achieved.dscr.toFixed(2) : "—"} tone="success" sub="target ≥ 1.25" stepClass="tc-hero-step-4" />
          <MockTile label="At list" value={cfLabel} tone="success" sub={`${capLabel} cap`} stepClass="tc-hero-step-5" />
        </div>

        {/* Verdict line — final step 6, one concise sentence. */}
        <div className="tc-hero-step-6 mt-4 flex items-start gap-2 rounded-xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-3 text-xs text-foreground">
          <TrendingUp className="mt-0.5 size-4 shrink-0 text-[var(--brand-green)]" />
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
      className={`rounded-xl border border-border bg-background p-3 ${stepClass ?? ""}`}
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
