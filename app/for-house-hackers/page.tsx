/**
 * /for-house-hackers — persona page for owner-occupant multi-unit investors.
 *
 * House hackers are a specific, high-intent niche: typically first-time
 * investors using FHA 3.5% down on a 2-4 unit, planning to live in one
 * and rent the rest. The math is intentionally different from a pure
 * buy-and-hold (owner unit doesn't generate rent income, low down
 * payment changes leverage, FHA MIP changes carrying cost), and the
 * standard rental-analyzer often models it wrong.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Calculator,
  Home,
  Key,
  LineChart,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = {
  title: "For House Hackers",
  description:
    "Analyze 2-4 unit owner-occupant deals with TrueCap. FHA 3.5% down, your-unit math, rent from other units — the calculator that gets house-hack math right.",
  keywords: [
    "house hack calculator",
    "house hacking analysis",
    "fha 3.5 down rental",
    "owner-occupant multi-unit",
  ],
  alternates: { canonical: "/for-house-hackers" },
  openGraph: {
    title: "For House Hackers — TrueCap",
    description:
      "Model 2-4 unit owner-occupant deals with FHA 3.5% down. Live-in-one, rent-the-rest math done right.",
    url: "/for-house-hackers",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap for house hackers" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const USE_CASES: { icon: typeof Calculator; title: string; body: string }[] = [
  {
    icon: Home,
    title: "Owner-occupant math, not investor math",
    body: "Select 'Owner-occupant' propertyType. The engine knows you live in one unit (no rent), so the deal scoring uses the right break-even bands instead of investor-style cash-flow thresholds.",
  },
  {
    icon: Key,
    title: "FHA 3.5% down — modeled correctly",
    body: "Set down payment to 3.5%, enter the lender's annual MIP in the dedicated PMI / MIP field, and select the loan-life option when it applies. Add any upfront premium to closing costs if it is not financed. The starter 'FHA 3.5% owner-occupant' template pre-fills editable screening defaults.",
  },
  {
    icon: Users,
    title: "Multi-unit revenue, your-unit subsidy",
    body: "Multi-family mode lets you set rent for each unit individually. Mark one as your unit (zero income, full carrying cost share). See how the rented units offset your housing.",
  },
  {
    icon: LineChart,
    title: "Plan the later rental as a separate scenario",
    body: "The live-in model does not switch automatically in year two. Save a separate full-rental scenario with your unit rented, then compare the assumptions explicitly.",
  },
];

export default function ForHouseHackersPage() {
  return (
    <div className="min-h-screen bg-background">
      <main id="main" className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-2">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
          >
            ← TrueCap
          </Link>
        </div>

        <section className="mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary mb-4">
            <Sparkles className="size-3" />
            For house hackers
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight text-balance">
            Live in one, rent the others.{" "}
            <span className="text-primary">Do the math first.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            TrueCap handles the math that makes house hacks unique:
            owner-occupant break-even bands, FHA 3.5% down, MIP, your-unit
            subsidy, with a separate-scenario workflow for a later move-out.
          </p>

          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {/* Deep-link into the analyzer with the House Hack play pre-
                selected (?strategy= analyzer handoff) — owner-occupant form
                + FHA-style defaults, not a blank single-family deal. */}
            <Link
              href="/?strategy=house-hack#main"
              prefetch={false}
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5"
            >
              <Calculator className="size-4" />
              Run a free house-hack analysis
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              See Pro pricing
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Free screen: no card or signup
          </p>
        </section>

        <section id="use-cases" className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            Why house hacks need a different analyzer
          </h2>
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">
            Most calculators treat every deal as pure investment. House
            hacks aren&apos;t — and the wrong math gets you to the wrong
            answer.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {USE_CASES.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm"
              >
                <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-foreground">
                  {title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            The house-hack workflow
          </h2>
          <ol className="mt-4 space-y-3">
            {[
              "Open Templates (Pro) and clone the 'House hack' or 'FHA 3.5% owner-occupant' starter — the defaults are already shaped for your strategy.",
              "Paste the listing address (the engine handles 2-4 unit multi-family automatically).",
              "Set per-unit rent for the units you'll rent out. Leave your-unit rent at $0.",
              "Hit Calculate — see your monthly out-of-pocket (the gap between rent collected and total carrying cost). Owner-occupant scoring uses the right break-even bands.",
              "Save the live-in underwrite as its own base decision.",
              "Create a separate full-rental scenario with your unit rented. TrueCap does not automatically switch occupancy in a future year; compare the two explicit scenarios and verify the later market rent.",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-extrabold tabular-nums">
                  {i + 1}
                </span>
                <span className="text-sm sm:text-base leading-relaxed text-foreground">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="size-5 text-[var(--brand-green)]" />
            <h2 className="text-sm font-extrabold uppercase tracking-widest text-[var(--brand-green)]">
              Why house hackers pick TrueCap
            </h2>
          </div>
          <ul className="space-y-2 text-sm sm:text-base text-foreground">
            <li><strong>Right math.</strong> Owner-occupant scoring uses ±$300/mo break-even bands, not investor $1,000/mo bands. A deal scoring 60+ as an investment might score 80+ as a house hack.</li>
            <li><strong>FHA 3.5% template ready to clone.</strong> One click pre-fills the down %, MIP, term, vacancy assumption.</li>
            <li><strong>Per-unit rent.</strong> Multi-family mode lets you model each unit independently — the only way to get house-hack math right.</li>
            <li><strong>Separate transition scenario.</strong> Preserve the live-in assumptions, then model the later full-rental state as a distinct saved scenario.</li>
            <li><strong>Mixed-use boundary.</strong> TrueCap does not currently expose a tax-specific module or allocate basis, depreciation, or interest between personal and rental use. Build that calculation with a qualified tax professional.</li>
          </ul>
        </section>

        <section className="mb-12 sm:mb-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-lg sm:text-xl font-extrabold text-foreground mb-3">
            Recommended reading and tools
          </h2>
          <p className="text-sm leading-relaxed text-foreground">
            Start with the deep-dive on{" "}
            <Link href="/blog/house-hacking-explained" className="text-primary font-semibold hover:underline">
              house hacking explained
            </Link>{" "}
            and the comparison of{" "}
            <Link href="/blog/single-family-vs-multi-family-rental" className="text-primary font-semibold hover:underline">
              single-family vs multi-family
            </Link>{" "}
            properties. Screen candidates fast with the free{" "}
            <Link href="/?strategy=house-hack#main" className="text-primary font-semibold hover:underline">
              house hacking calculator
            </Link>{" "}
            — your effective housing cost after tenant rent, in seconds.
            Once you&apos;ve picked a property, ground the
            numbers with the{" "}
            <Link href="/#main" className="text-primary font-semibold hover:underline">
              cap rate
            </Link>{" "}
            and{" "}
            <Link href="/#main" className="text-primary font-semibold hover:underline">
              DSCR
            </Link>{" "}
            calculators for the rented portion, then run the year-1 screen
            with the{" "}
            <Link href="/blog/how-to-underwrite-a-rental-property-in-60-seconds" className="text-primary font-semibold hover:underline">
              60-second underwriting workflow
            </Link>
            .
          </p>
        </section>

        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Screen the live-in year, then preserve a separate move-out scenario.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            Free covers monthly out-of-pocket, cap rate, and CoC for a first-pass live-in-year screen. Pro adds saved scenarios and comparison so the later full-rental state can be modeled separately; there is no automatic year-two occupancy switch.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              See Pro pricing
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link
              href="/?strategy=house-hack#main"
              prefetch={false}
              className="inline-flex items-center gap-2 border border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground px-4 py-2.5 rounded-xl font-bold hover:bg-primary-foreground/20 transition-colors"
            >
              <Calculator className="w-4 h-4" />
              Try the free analyzer
            </Link>
          </div>
        </section>

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground leading-relaxed">
          Evaluating a non-owner-occupied rental? See TrueCap for{" "}
          <Link href="/for-buy-and-hold" className="font-bold text-foreground hover:underline">
            buy-and-hold investors
          </Link>
          .
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
