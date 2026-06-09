/**
 * Marketing hero that renders ABOVE the calculator for cold (unauth)
 * visitors. Authenticated users skip this entirely — they already know
 * what TrueCap is and want the calculator immediately.
 *
 * Conversion-focused, single-screen layout:
 *   - bold value prop + sub
 *   - "Run a free deal" primary CTA that scrolls to the calculator form
 *     (no signup required to use the calculator — that's the wedge)
 *   - secondary "See pricing" link
 *   - trust strip (4 stats / claims)
 *   - 3-up feature row with concrete payoffs
 *   - "Trusted by" social proof bar
 *
 * No images that need an external CDN — everything is rendered in the
 * browser via CSS/SVG so it stays fast on first paint.
 *
 * SERVER COMPONENT. The single client-only behavior — scrolling to the
 * calculator form — is isolated into the tiny <ScrollToFormButton />
 * client island below so the rest of this big tree ships zero JS to
 * the browser. That's a real LCP win on the homepage (every paid-
 * traffic visitor lands here first).
 */

import Link from "next/link";
import { ArrowRight, Calculator, FileDown, Lock, ShieldCheck, Sparkles, TrendingUp, Zap } from "lucide-react";
import { ScrollToFormButton } from "@/components/marketing/scroll-to-form-button";
import { DealsAnalyzedTicker } from "@/components/marketing/deals-analyzed-ticker";

// TRUST_STATS row removed (Jun 2026) — redundant with risk-reversal
// microcopy ("No card · No signup · Cancel anytime"), the eyebrow chip
// ("HUD+FRED auto-fill"), the live DealsAnalyzedTicker, and the
// animated mock card. Four trust signals competing for the same
// real estate stacked the hero too tall and one of them had to go.

const FEATURES = [
  {
    icon: Zap,
    title: "Save 2+ hours per deal",
    body: "Stop rebuilding the same spreadsheet. Address auto-fill, 10+ metrics, projections, tax math — all live as you type.",
  },
  {
    icon: ShieldCheck,
    title: "Catch the bad assumptions",
    body: "Sensitivity grid stress-tests rent ±10%, vacancy ±5pp, rates ±1pp. See if the deal still pencils before you offer.",
  },
  {
    icon: FileDown,
    title: "Send lender-ready PDFs",
    body: "One-click multi-page report with verdict, 10-yr projection, tax strategy, exit scenarios — branded and ready for your lender.",
  },
];

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
            in a 375px viewport without wrapping or pushing layout. The
            uppercase + tracking-widest combo eats horizontal space fast;
            keep the long, value-rich copy for desktop where there's room. */}
        <div className="mx-auto mb-5 flex w-fit max-w-full items-center gap-1.5 rounded-full border border-primary/20 bg-card/70 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary shadow-sm backdrop-blur sm:gap-2 sm:px-3.5 sm:text-[11px] sm:tracking-widest">
          <Sparkles className="size-3 shrink-0" />
          <span className="sm:hidden">New · Address auto-fill</span>
          <span className="hidden sm:inline">New — auto-fill rent + rate from any address</span>
        </div>

        {/* headline + sub */}
        <h1 className="mx-auto max-w-3xl text-balance text-center text-3xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-[58px]">
          Stop losing deals to <span className="text-primary">bad math.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-balance text-center text-[15px] leading-relaxed text-muted-foreground sm:text-lg">
          Underwrite a rental deal in <strong className="text-foreground">60 seconds</strong> — cap rate, cash-on-cash,
          DSCR, 10-year projection, tax savings, exit scenarios. Every number you need to make a
          defensible offer, without the spreadsheet.
        </p>

        {/* CTAs — primary stretches full-width on mobile (better tap-
            target, no chance of being cut off), inline-sized on sm+. */}
        <div className="mx-auto mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <ScrollToFormButton
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(82,72,212,0.28)] transition-transform hover:-translate-y-0.5"
          >
            <Calculator className="size-4" />
            {/* Standardized CTA copy used across every primary surface on
                the homepage. Consistency matters for A/B test signal and
                brand recall — previous mix of 6 phrasings ("Run a free
                analysis", "Try it now — free", etc.) split funnel data. */}
            Run a deal — 60 seconds
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </ScrollToFormButton>
          <Link
            href="/pricing"
            className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
          >
            See pricing
          </Link>
        </div>
        {/* Risk-reversal microcopy — shorter on mobile so it stays on
            one or two lines instead of wrapping into a paragraph block. */}
        <p className="mt-3 flex items-center justify-center gap-1.5 text-balance px-2 text-center text-xs text-muted-foreground">
          <Lock className="size-3 shrink-0" />
          <span className="sm:hidden">No card · No signup · Cancel anytime</span>
          <span className="hidden sm:inline">
            No credit card · No signup needed to use the calculator · Cancel anytime
          </span>
        </p>

        {/* Real-data social proof — hides itself if count < 25 so we
            never advertise low volume. Sits right under the CTA so it
            lands in the "is this real?" decision moment instead of being
            in a separate stripe below the hero. */}
        <div className="mt-5 text-center">
          <DealsAnalyzedTicker window="7d" />
        </div>

        {/* Mock-up screenshot — pure CSS, lightweight.
            Previously hidden on mobile to save scroll; now shown
            everywhere because the sequential reveal loop is THE
            single best thing we communicate on the home page and
            hiding it on phones (~60% of traffic) was undervaluing
            it. The card auto-shrinks fine on narrow viewports. */}
        <HeroProductMock />

        {/* 3-up features */}
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </div>
              <div className="text-base font-bold text-foreground">{f.title}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>

        {/* "Built for" — promoted from inline body text to a proper
            5-button row. These are audience self-selection links and
            high-converting destinations for paid traffic; burying them as
            inline links was undervaluing their role. Expanded from 3 to
            5 to surface house-hackers and BRRRR operators (both already
            had persona landing pages but were hidden in the footer
            nav). */}
        <div className="mt-12 text-center">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Built for
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {[
              { href: "/for-buy-and-hold", label: "Buy-and-hold" },
              { href: "/for-house-hackers", label: "House hackers" },
              { href: "/for-brrrr", label: "BRRRR operators" },
              { href: "/for-flippers", label: "Fix & flippers" },
              { href: "/for-agents", label: "Agents" },
            ].map((persona) => (
              <Link
                key={persona.href}
                href={persona.href}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 text-sm font-semibold text-foreground/85 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary sm:h-11 sm:px-4"
              >
                {persona.label}
              </Link>
            ))}
          </div>
        </div>
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
            <span className="hidden sm:inline">usetruecap.com — 1700 W Erie · Philadelphia</span>
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
            Sequential reveal: the address is step 1 (appears first
            after the rebuild), the verdict-pill cluster is step 5
            (appears after the 3 metric tiles have populated). The
            `flex-1 min-w-0` on the address wrapper keeps the pills
            from collapsing to the left when the address is mid-fade. */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="tc-hero-step-1 min-w-0 flex-1">
            <div className="text-base font-extrabold text-foreground sm:text-lg">1700 W Erie · Philadelphia</div>
            <div className="text-xs text-muted-foreground">Single Family · $295,000 · Built 1942</div>
          </div>
          <div className="tc-hero-step-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--brand-green)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">
              Strong Buy
            </span>
            <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">
              Score 84
            </span>
            <span className="rounded-full bg-[var(--brand-green)] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">
              Low Risk
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
          <MockTile label="Cash flow / mo" value="+$640" tone="success" stepClass="tc-hero-step-2" />
          <MockTile label="Cap rate" value="8.2%" tone="success" stepClass="tc-hero-step-3" />
          <MockTile label="DSCR" value="1.34" tone="success" sub="Bankable" stepClass="tc-hero-step-4" />
        </div>

        {/* Verdict line — final step 6, reveals last after tiles + pills. */}
        <div className="tc-hero-step-6 mt-4 flex items-start gap-2 rounded-xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-3 text-xs text-foreground">
          <TrendingUp className="mt-0.5 size-4 shrink-0 text-[var(--brand-green)]" />
          <span>
            <strong>1700 W Erie: solid fundamentals.</strong> Cash flow $640/mo, cap 8.2%, DSCR 1.34
            clears the typical ≥1.25 lender threshold. Worth a deeper underwrite.
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
