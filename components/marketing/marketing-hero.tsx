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

const TRUST_STATS = [
  { label: "To first analysis",  value: "60s",    sub: "no setup" },
  { label: "Free to use",        value: "100%",   sub: "no card required" },
  { label: "Live data",          value: "HUD+FRED", sub: "rent · rate · tax" },
  { label: "Cancel",             value: "Anytime", sub: "monthly or annual" },
];

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
        <h1 className="mx-auto max-w-3xl text-balance text-center text-3xl font-black leading-[1.05] tracking-tight text-foreground sm:text-[58px]">
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
            <span className="sm:hidden">Run a free analysis</span>
            <span className="hidden sm:inline">Run a free deal — no signup</span>
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

        {/* trust stats row */}
        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {TRUST_STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-border bg-card/60 p-3 text-center backdrop-blur sm:p-4"
            >
              <div className="text-xl font-black text-foreground sm:text-2xl">{stat.value}</div>
              <div className="mt-0.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground sm:text-[11px]">
                {stat.label}
              </div>
              <div className="mt-1 text-xs text-muted-foreground sm:text-xs">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Mock-up screenshot — pure CSS, lightweight. Hidden on
            mobile (it adds ~500px of scroll before the value props
            without earning the space on a narrow viewport — desktop
            keeps it because the screenshot does sell the product). */}
        <div className="hidden sm:block">
          <HeroProductMock />
        </div>

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

        {/* "Built for" — tight 2-link row pointing to the two persona
            landing pages. Replaces the 5-item dot-separated list that
            looked dense without providing a clickable destination. */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-sm text-muted-foreground">
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Built for
          </span>
          <Link
            href="/for-agents"
            className="font-semibold text-foreground/80 hover:text-primary hover:underline"
          >
            real estate agents
          </Link>
          <span aria-hidden className="text-muted-foreground/40">·</span>
          <Link
            href="/for-flippers"
            className="font-semibold text-foreground/80 hover:text-primary hover:underline"
          >
            fix &amp; flippers
          </Link>
          <span aria-hidden className="text-muted-foreground/40">·</span>
          <span className="font-medium text-foreground/70">buy-and-hold investors</span>
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
function HeroProductMock() {
  return (
    <div className="relative mx-auto mt-10 max-w-3xl">
      {/* card */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:p-6">
        {/* browser chrome — shorter URL pill on mobile so the full
            string fits without truncation, full URL on sm+. */}
        <div className="mb-4 flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-red-400/80" />
          <span className="size-2.5 rounded-full bg-amber-400/80" />
          <span className="size-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-3 min-w-0 truncate rounded-full bg-muted px-3 py-0.5 text-[10px] font-medium text-muted-foreground">
            <span className="sm:hidden">usetruecap.com</span>
            <span className="hidden sm:inline">usetruecap.com — 1700 W Erie · Philadelphia</span>
          </span>
        </div>

        {/* address + verdict row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="text-base font-black text-foreground sm:text-lg">1700 W Erie · Philadelphia</div>
            <div className="text-xs text-muted-foreground">Single Family · $295,000 · Built 1942</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--brand-green)] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
              Strong Buy
            </span>
            <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
              Score 84
            </span>
            <span className="rounded-full bg-[var(--brand-green)] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
              Low Risk
            </span>
          </div>
        </div>

        {/* metric tiles */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <MockTile label="Cash flow / mo" value="+$640" tone="success" />
          <MockTile label="Cap rate" value="+8.2%" tone="success" />
          <MockTile label="CoC return" value="+13.1%" tone="primary" />
          <MockTile label="DSCR" value="1.34" tone="success" sub="Bankable" />
        </div>

        {/* tiny sparkline + label */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1.5fr_1fr]">
          <div className="rounded-xl border border-border bg-background p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">10-Year cash flow</span>
              <span className="text-xs font-black text-[var(--brand-green)]">+$14,200</span>
            </div>
            <svg viewBox="0 0 200 60" className="mt-2 h-12 w-full">
              <defs>
                <linearGradient id="hero-spark" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgb(82, 72, 212)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="rgb(82, 72, 212)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 55 L 22 50 L 44 44 L 66 38 L 88 32 L 110 27 L 132 22 L 154 17 L 176 12 L 200 6"
                stroke="rgb(82, 72, 212)"
                strokeWidth="2"
                fill="none"
              />
              <path
                d="M 0 55 L 22 50 L 44 44 L 66 38 L 88 32 L 110 27 L 132 22 L 154 17 L 176 12 L 200 6 L 200 60 L 0 60 Z"
                fill="url(#hero-spark)"
              />
            </svg>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MockTile label="Tax save / yr" value="$8,420" tone="success" small />
            <MockTile label="Year 7 exit" value="$144k" tone="primary" small />
          </div>
        </div>

        {/* verdict line */}
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-3 text-xs text-foreground">
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
}: {
  label: string;
  value: string;
  tone: "success" | "primary";
  sub?: string;
  small?: boolean;
}) {
  const color =
    tone === "success" ? "text-[var(--metric-positive)]" : "text-primary";
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      {/* Label bumped from text-[9px] to text-[10px] — 9px is below
          readable mobile minimum even for ALL-CAPS labels. */}
      <div className={`text-[10px] font-bold uppercase tracking-widest text-muted-foreground ${small ? "" : "sm:text-[10px]"}`}>
        {label}
      </div>
      <div className={`mt-1 font-black tabular-nums ${color} ${small ? "text-lg" : "text-lg sm:text-xl"}`}>
        {value}
      </div>
      {sub ? <div className="text-[10px] text-muted-foreground">{sub}</div> : null}
    </div>
  );
}
