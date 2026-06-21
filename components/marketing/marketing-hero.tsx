/**
 * Marketing hero that renders ABOVE the calculator for cold (unauth)
 * visitors. Authenticated users skip this entirely — they already know
 * what TrueCap is and want the calculator immediately.
 *
 * Conversion-focused, single-screen layout:
 *   - bold, outcome-led value prop + sub
 *   - an address input ("Analyze free") IN the hero so the core flow
 *     starts with no scroll — it hands off to the calculator below via a
 *     window event (see hero-address-form.tsx)
 *   - "Try a sample deal" + a quiet "See Pro features" link
 *   - trust line, proof strip + data-source line, live deals ticker
 *   - one outcome-specific testimonial, then the live sample result card
 *
 * No images that need an external CDN — everything is rendered in the
 * browser via CSS/SVG so it stays fast on first paint.
 *
 * SERVER COMPONENT. The client-only behavior is isolated into the tiny
 * <HeroAddressForm /> island (the address field + handoff) so the rest
 * of this big tree ships zero JS to the browser. That's a real LCP win
 * on the homepage (every paid-traffic visitor lands here first). The
 * Google Places script the island uses is already loaded by the
 * calculator on this same page, so the input adds no extra script cost.
 */

import { Check, Quote, Sparkles, TrendingUp } from "lucide-react";
import { HeroAddressForm } from "@/components/marketing/hero-address-form";
import { DealsAnalyzedTicker } from "@/components/marketing/deals-analyzed-ticker";
import { calculateAnalysis } from "@/lib/calc-analysis";
import { buildDealScoreInputFromAnalysis, computeDealScore } from "@/lib/deal-score";
import { SAMPLE_DEAL_DISPLAY, SAMPLE_DEAL_VALUES } from "@/lib/sample-deal";

// TRUST_STATS row removed (Jun 2026) — redundant with risk-reversal
// microcopy ("No card · No signup · Cancel anytime"), the eyebrow chip
// ("HUD+FRED auto-fill"), the live DealsAnalyzedTicker, and the
// animated mock card. Four trust signals competing for the same
// real estate stacked the hero too tall and one of them had to go.

// Hero feature cards removed (Jun 2026) — they repeated How-It-Works and the
// comparison table and stacked the hero too tall for a cold-traffic landing.
// The same value props live in How-It-Works + the comparison matrix below.

export function MarketingHero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-[var(--brand-blue-light)] via-background to-background">
      {/* subtle radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[480px] w-[920px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6 sm:pb-14 sm:pt-16">
        {/* Eyebrow chip — shorter copy on mobile so the full text fits
            in a 375px viewport without wrapping or pushing layout. */}
        <div className="mx-auto mb-5 flex w-fit max-w-full items-center gap-1.5 rounded-full border border-primary/20 bg-card/70 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary shadow-sm backdrop-blur sm:gap-2 sm:px-3.5 sm:text-[11px] sm:tracking-widest">
          <Sparkles className="size-3 shrink-0" />
          <span className="sm:hidden">Free analyzer · No signup</span>
          <span className="hidden sm:inline">Free rental property analyzer · No signup required</span>
        </div>

        {/* headline + sub — action/outcome-led: says exactly what the
            product tells you, and how fast. */}
        <h1 className="mx-auto max-w-3xl text-balance text-center text-3xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-[58px]">
          Know if a rental deal <span className="text-primary">cash-flows in 60 seconds.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-balance text-center text-[15px] leading-relaxed text-muted-foreground sm:text-lg">
          Enter an address and TrueCap auto-fills rent, mortgage rate, and
          property tax — then gives you cap rate, cash flow, DSCR, and a
          plain-English verdict.
        </p>

        {/* Primary action — the address input lives IN the hero so the
            core flow starts without a scroll. Hands off to the calculator
            below via a window event (see hero-address-form.tsx). */}
        <HeroAddressForm />

        {/* Trust line — "Cancel anytime" intentionally removed: it implies
            a subscription and contradicts "no signup" at the exact moment
            the visitor is deciding to click. It now lives only on /pricing,
            where a subscription is actually in play. */}
        <p className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-2 text-center text-xs text-muted-foreground">
          <Check className="size-3.5 shrink-0 text-[var(--metric-positive)]" />
          <span>Free forever · No card · No signup required</span>
        </p>

        {/* Proof strip (#5) + data-source line (#6) — answers "what
            happens after I type an address?" and "can I trust the
            numbers?" right in the decision moment, before the CTA. */}
        <div className="mx-auto mt-5 max-w-2xl space-y-1.5 text-center">
          <p className="text-xs font-medium text-foreground/80">
            Auto-fills rent, rate &amp; tax · Editable assumptions · Cap rate · CoC · DSCR · cash flow
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Uses <strong className="font-semibold text-foreground">HUD</strong> rent,{" "}
            <strong className="font-semibold text-foreground">FRED</strong> mortgage rates, and{" "}
            <strong className="font-semibold text-foreground">state</strong> tax defaults — all editable.
          </p>
        </div>

        {/* Real-data social proof — hides itself if count is low so we
            never advertise low volume. */}
        <div className="mt-5 text-center">
          <DealsAnalyzedTicker
            source="runs"
            minimum={1}
            plus
            labelSuffix="deals analyzed by investors, agents, and house hackers"
          />
        </div>

        {/* One outcome-specific testimonial (#8) — the strongest,
            revenue-tied quote sits near the CTA to support the first
            decision; the rest live in the SocialProof section below. */}
        <figure className="mx-auto mt-5 flex max-w-xl items-start justify-center gap-2 text-center">
          <Quote className="mt-0.5 size-4 shrink-0 text-primary/40" />
          <figcaption className="text-xs leading-relaxed text-muted-foreground">
            <span className="text-foreground">
              &ldquo;Closed three more deals this quarter because I could move faster.&rdquo;
            </span>{" "}
            — Jordan M., buy-and-hold investor (18 doors)
          </figcaption>
        </figure>

        {/* Mock-up screenshot — pure CSS, lightweight.
            Previously hidden on mobile to save scroll; now shown
            everywhere because the sequential reveal loop is THE
            single best thing we communicate on the home page and
            hiding it on phones (~60% of traffic) was undervaluing
            it. The card auto-shrinks fine on narrow viewports. */}
        <HeroProductMock />

      </div>
    </section>
  );
}

/**
 * Static product preview — fast-loading CSS/SVG mockup of a finished
 * deal. Mirrors the per-deal OG card aesthetic so the brand looks
 * coherent across surfaces.
 */
/**
 * Animation styles inlined into the component because the same
 * keyframes defined in globals.css weren't reaching the browser in
 * production (Morgan reported nothing animating at all, including
 * the LIVE dot). Inlining via a server-rendered <style> tag bypasses
 * the entire Tailwind v4 / PostCSS pipeline — the rules ship in the
 * HTML payload verbatim.
 *
 * Defines:
 *   - .tc-hero-pulse-dot — 1.5s blink for the LIVE indicator.
 *   - .tc-hero-step-1 .. .tc-hero-step-6 — 5s sequential reveal loop
 *     (address → tile 1 → tile 2 → tile 3 → pills → verdict line),
 *     each on the same 5s clock with a different fade-in offset.
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
  // COMPUTED, not hard-coded (Jun 2026 mobile audit): the card renders
  // the REAL engine output for the REAL sample deal the "Try a sample
  // deal" button loads. A previous version hard-coded numbers that the
  // engine contradicted the moment a visitor clicked the demo —
  // "Strong Buy · Score 84" on the card, "Risky · Score 20" in the
  // analysis. Sharing lib/sample-deal.ts + computing here makes that
  // divergence impossible. This is a server component, so this math
  // runs at build/ISR time — zero client cost.
  const result = calculateAnalysis(SAMPLE_DEAL_VALUES);
  const score = computeDealScore(buildDealScoreInputFromAnalysis(SAMPLE_DEAL_VALUES, result));
  const cf = Math.round(result.netCashFlow);
  const cfLabel = `${cf >= 0 ? "+" : "-"}$${Math.abs(cf).toLocaleString("en-US")}`;
  const capLabel = `${result.capRate.toFixed(1)}%`;
  const dscrLabel = result.dscr.toFixed(2);
  const dscrClears = result.dscr >= 1.25;

  return (
    <div className="relative mx-auto mt-10 max-w-3xl">
      {/* Inline keyframes — see HERO_ANIM_CSS comment above. */}
      <style dangerouslySetInnerHTML={{ __html: HERO_ANIM_CSS }} />

      {/* card */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:p-6">
        {/* browser chrome — shorter URL pill on mobile so the full
            string fits without truncation, full URL on sm+. A small
            LIVE indicator on the right communicates that the analyzer
            is *running*, not a static screenshot.

            The LIVE dot uses BOTH our custom tc-hero-pulse-dot AND
            Tailwind's built-in animate-pulse as a belt-and-suspenders
            fallback: if our inlined keyframes ever break, animate-pulse
            still gives the user some movement. */}
        <div className="mb-4 flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-red-400/80" />
          <span className="size-2.5 rounded-full bg-amber-400/80" />
          <span className="size-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-3 min-w-0 flex-1 truncate rounded-full bg-muted px-3 py-0.5 text-[10px] font-medium text-muted-foreground">
            <span className="sm:hidden">usetruecap.com</span>
            <span className="hidden sm:inline">usetruecap.com — {SAMPLE_DEAL_DISPLAY.shortAddress}</span>
          </span>
          <span
            aria-label="Live demo"
            className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--brand-green)]/30 bg-[var(--brand-green-light)] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-[var(--brand-green)]"
          >
            <span className="tc-hero-pulse-dot animate-pulse size-1.5 rounded-full bg-[var(--brand-green)]" />
            Live
          </span>
        </div>

        {/* address + verdict row.
            Mobile: stack vertically — address on top with full width
            (so 'Philadelphia' doesn't wrap onto 3 lines), then the
            verdict pills on a second row. Desktop: original side-by-
            side layout. The address still gets step-1 and the pills
            cluster step-5 of the sequential reveal animation. */}
        <div className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
          <div className="tc-hero-step-1 min-w-0 sm:flex-1">
            <div className="text-base font-extrabold text-foreground sm:text-lg">{SAMPLE_DEAL_DISPLAY.shortAddress}</div>
            <div className="text-xs text-muted-foreground">{SAMPLE_DEAL_DISPLAY.subtitle}</div>
          </div>
          <div className="tc-hero-step-5 flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="rounded-full bg-[var(--brand-green)] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white sm:px-2.5 sm:py-1 sm:text-[10px]">
              {score.recommendation}
            </span>
            <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white sm:px-2.5 sm:py-1 sm:text-[10px]">
              Score {Math.round(score.score)}
            </span>
            <span className="rounded-full bg-[var(--brand-green)] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white sm:px-2.5 sm:py-1 sm:text-[10px]">
              {score.riskLevel}
            </span>
          </div>
        </div>

        {/* Metric tiles — trimmed from 7 metrics (4 main + 3 secondary +
            sparkline) to 3 cleanest. Previously the card showed cash flow,
            cap rate, CoC, DSCR, 10-yr CF + sparkline, tax save/yr, and
            year-7 exit — that's the calculator's full output, doing the
            tool's job before the visitor types anything. Now: the verdict
            badge does the headline work, and three tiles answer the three
            questions every investor asks first — "does it cash flow?",
            "what's the unleveraged return?", and "will the lender like
            this?". */}
        {/* Metric tiles — sequential reveal steps 2 → 3 → 4 (cash flow,
            cap rate, DSCR). Each tile carries its own step class so
            the 3 tiles populate left-to-right after the address. */}
        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          {/* Mobile-friendly labels: "Cash flow / mo" was wrapping onto
              two lines at narrow viewports, making that tile taller
              than the other two. Shortened to "Cash flow" — the
              monthly unit is implied by the dollar sign + product
              context. Desktop keeps the longer label via the
              responsive prop below. */}
          {/* Live engine output — see the computed values at the top of
              HeroProductMock. These can never disagree with what the
              "Try a sample deal" button produces. */}
          <MockTile label="Cash flow" value={cfLabel} tone="success" stepClass="tc-hero-step-2" />
          <MockTile label="Cap rate" value={capLabel} tone="success" stepClass="tc-hero-step-3" />
          <MockTile label="DSCR" value={dscrLabel} tone="success" sub={dscrClears ? "Bankable" : "Tight"} stepClass="tc-hero-step-4" />
        </div>

        {/* Verdict line — final step 6, reveals last after tiles + pills.
            ONE concise sentence (no mobile/desktop split): a single clean
            line reads better on screen AND to crawlers/AI/SEO than two
            variants that concatenate in the raw HTML. */}
        <div className="tc-hero-step-6 mt-4 flex items-start gap-2 rounded-xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-3 text-xs text-foreground">
          <TrendingUp className="mt-0.5 size-4 shrink-0 text-[var(--brand-green)]" />
          <span>
            <strong>1700 W Erie: strong fundamentals.</strong>{" "}
            {cfLabel}/mo cash flow, {capLabel} cap, DSCR {dscrLabel}
            {dscrClears
              ? " — clears the typical ≥1.25 lender bar. Worth a deeper underwrite."
              : " — below the typical ≥1.25 lender bar; stress-test before offering."}
          </span>
        </div>
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
   * Used by the marketing hero mock card so the three tiles populate
   * left-to-right after the address. No-op when prefers-reduced-motion
   * is set (handled in globals.css media query).
   */
  stepClass?: string;
}) {
  const color =
    tone === "success" ? "text-[var(--metric-positive)]" : "text-primary";
  return (
    <div
      className={`rounded-xl border border-border bg-background p-3 ${stepClass ?? ""}`}
    >
      {/* Label bumped from text-[9px] to text-[10px] — 9px is below
          readable mobile minimum even for ALL-CAPS labels. */}
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
