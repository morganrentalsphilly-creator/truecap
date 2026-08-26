/**
 * /vs/biggerpockets-for-house-hacking — niche use-case comparison.
 *
 * Target queries: "biggerpockets house hacking", "house hacking
 * calculator", "biggerpockets calculator for house hacking",
 * "best house hack analysis tool". Long-tail audience slicing:
 * BiggerPockets calculator framed against TrueCap specifically for
 * house-hackers (owner-occupant 2-4 unit deals).
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Calculator,
  Check,
  Minus,
  Sparkles,
  X,
} from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ScrollToFormButton } from "@/components/marketing/scroll-to-form-button";
import { ComparisonFaq, type FaqItem } from "@/components/marketing/comparison-faq";
import { getSiteUrl } from "@/lib/site-url";
import { VsBreadcrumbSchema } from "@/components/marketing/vs-breadcrumb-schema";

export const metadata: Metadata = {
  title: "BiggerPockets vs TrueCap for House Hacking (2026)",
  description:
    "Both calculators run house-hack deals. Which one models owner-occupant unit usage, FHA financing, and 'effective rent saved' more cleanly? Honest house-hack-specific comparison.",
  keywords: [
    "biggerpockets house hacking",
    "house hacking calculator",
    "biggerpockets calculator for house hacking",
    "best house hack analysis tool",
    "truecap house hack",
    "owner occupant rental analysis",
  ],
  alternates: { canonical: "/vs/biggerpockets-for-house-hacking" },
  openGraph: {
    title: "BiggerPockets vs TrueCap for House Hacking (2026)",
    description:
      "House-hack-specific comparison: owner-occupant unit modeling, FHA financing, effective rent saved. Which calculator fits the house-hack workflow.",
    url: "/vs/biggerpockets-for-house-hacking",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs BiggerPockets for House Hacking" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "biggerpockets" | "tie";
type Row = { feature: string; truecap: string; biggerpockets: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Owner-occupant property type",            truecap: "Yes — explicit 'owner-occupant' property type with per-unit setup", biggerpockets: "Standard multifamily form; you manually adjust", winner: "truecap" },
  { feature: "Per-unit rent + status modeling",         truecap: "Yes — mark which unit YOU live in; other units' rent counted",      biggerpockets: "Manual — you adjust the rent calculation yourself", winner: "truecap" },
  { feature: "Effective 'rent saved' calculation",      truecap: "Yes — surfaces what your monthly housing cost actually is",         biggerpockets: "You compute it yourself from the spreadsheet",  winner: "truecap" },
  { feature: "FHA financing assumptions (3.5% down)",   truecap: "Yes — configurable down payment goes as low as 3.5%",               biggerpockets: "Yes — configurable",                            winner: "tie" },
  { feature: "Cap rate framing",                       truecap: "Standard property-level cap rate; no full-vs-rental-only toggle",   biggerpockets: "Standard cap rate; adjust inputs for each scenario", winner: "tie" },
  { feature: "Address auto-fill (rent/rate/tax)",       truecap: "Yes — HUD FMR per unit + FRED rate + state property tax",          biggerpockets: "Manual entry",                                  winner: "truecap" },
  { feature: "DSCR screening ratio",                    truecap: "Yes — screening output, not a lender approval model",               biggerpockets: "Available in its calculator; not lender approval", winner: "tie" },
  { feature: "Post-move-out scenario",                  truecap: "Save a separate fully rented scenario; no move-out-year switch",     biggerpockets: "Adjust and save a separate scenario",             winner: "tie" },
  { feature: "Illustrative tax impact", truecap: "General rental illustration; mixed-use allocation not modeled",     biggerpockets: "Pro — standard tax view",                       winner: "tie" },
  { feature: "Sensitivity grid (vacancy on rental units)", truecap: "Pro — rent ±10%, vacancy ±5pp on rental units only",             biggerpockets: "Manual re-runs",                                winner: "truecap" },
  { feature: "Mobile UX at the showing",                truecap: "PWA installable",                                                    biggerpockets: "Desktop-leaning calculator + separate mobile app", winner: "tie" },
  { feature: "Free tier covers house hacking",          truecap: "Yes — core owner-occupant underwriting on free tier",                biggerpockets: "Current calculator presents results as a Pro feature", winner: "truecap" },
  { feature: "Pricing",                                 truecap: "Free core; paid Pro — see live pricing",                              biggerpockets: "Calculator bundled with Pro — see live pricing", winner: "tie" },
];

const BP_HOUSE_HACK_FAQ: FaqItem[] = [
  {
    question: "Which is better for house hackers — TrueCap or BiggerPockets?",
    answer: (
      <>
        TrueCap provides a more explicit house-hack setup. The main difference is
        the explicit &quot;owner-occupant&quot; property type — you mark
        which unit you&apos;ll live in, and TrueCap automatically
        excludes that unit&apos;s &quot;rent&quot; from the income side
        of the underwriting (because you&apos;re paying yourself,
        effectively). BiggerPockets&apos; calculator treats the property
        as a generic multifamily and makes you mentally adjust the math
        for the owner-occupied unit. Both work; TrueCap is just less
        manual setup for the house-hack workflow.
      </>
    ),
    plainTextAnswer:
      "TrueCap for house-hacking specifically. The 'owner-occupant' property type auto-excludes your unit from the rent income side. BiggerPockets treats it as generic multifamily — you mentally adjust the math. Both work; TrueCap is less manual setup.",
  },
  {
    question: "Does TrueCap handle FHA 3.5%-down house hacks?",
    answer: (
      <>
        Yes — TrueCap&apos;s down payment field is configurable. Set it
        to 3.5% for FHA, 5% for conventional owner-occupant, 10-15% for
        bigger deals where you want a lower PMI burden. PITI and DSCR
        recalculate automatically. Enter the lender&apos;s annual FHA mortgage
        insurance premium in the dedicated PMI / MIP field and select the
        loan-life option when it applies. If an upfront premium is not
        financed, include that cash amount in closing costs.
      </>
    ),
    plainTextAnswer:
      "Yes — TrueCap's down payment field is configurable. Set 3.5% for FHA, enter the lender's annual premium in the dedicated PMI / MIP field, and select the loan-life option when it applies. Include any unfinanced upfront premium in closing costs.",
  },
  {
    question: "What's 'effective rent saved' and why does it matter?",
    answer: (
      <>
        When you house-hack, your monthly housing cost isn&apos;t the
        full PITI — it&apos;s the PITI minus the rent your rental units
        bring in. That gap is your &quot;effective rent saved&quot; vs
        a regular apartment lease. TrueCap surfaces this number
        explicitly so you can compare house-hacking vs renting an
        apartment using the same assumptions. BiggerPockets&apos; calculator
        requires you to compute it from the cash-flow line yourself.
      </>
    ),
    plainTextAnswer:
      "House-hack monthly cost = PITI minus rent from rental units. That gap is your 'effective rent saved' vs a regular lease. TrueCap surfaces this explicitly so you can compare house-hack vs apartment rental apples-to-apples. BiggerPockets requires manual calculation.",
  },
  {
    question: "Does the cap rate apply differently to a house hack?",
    answer: (
      <>
        Cap rate remains property-level NOI divided by purchase price.
        TrueCap does not provide a dedicated full-property versus
        rental-units-only cap-rate toggle. Model the current owner-occupied
        case, then save a separate fully rented scenario to review the
        post-move-out case.
      </>
    ),
    plainTextAnswer:
      "Cap rate remains property-level NOI divided by purchase price. TrueCap has no full-property versus rental-only cap-rate toggle. Save a separate fully rented scenario to review the post-move-out case.",
  },
  {
    question: "Is BiggerPockets Pro worth it for the calculator alone?",
    answer: (
      <>
        It depends on which membership benefits you use. BiggerPockets
        currently presents calculator results as a Pro feature, and its
        membership includes benefits beyond the calculator. TrueCap has
        free core owner-occupant underwriting and paid Pro analysis tools.
        Compare both live pricing pages and the features you actually need.
      </>
    ),
    plainTextAnswer:
      "It depends on which membership benefits you use. BiggerPockets currently presents calculator results as a Pro feature and includes benefits beyond the calculator. Compare both live pricing pages and the features you need.",
  },
  {
    question: "What changes when I model the post-move-out scenario?",
    answer: (
      <>
        When you move out of the owner-occupied unit and rent it to a
        third tenant, you&apos;re back to a standard rental underwrite —
        all units producing rent, your housing cost moves elsewhere.
        TrueCap does not have a dedicated &quot;year you move out&quot;
        switch. Save a separate fully rented multi-family scenario and
        compare it with the current owner-occupied case. Pro can compare
        saved deals side-by-side and add 10-year projections to each.
      </>
    ),
    plainTextAnswer:
      "TrueCap has no dedicated move-out-year switch. Save a separate fully rented multi-family scenario and compare it with the current owner-occupied case; Pro adds side-by-side comparison and 10-year projections.",
  },
];

export default function VsBiggerPocketsForHouseHackingPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "BiggerPockets vs TrueCap for House Hacking (2026)",
    url: `${siteUrl}/vs/biggerpockets-for-house-hacking`,
    description:
      "House-hack-specific comparison of TrueCap and BiggerPockets — owner-occupant modeling, FHA financing, effective rent saved.",
    dateModified: "2026-06-07",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/biggerpockets-for-house-hacking" pageName="TrueCap vs BiggerPockets for House Hacking" />
      <main id="main" className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-2">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
          >
            ← TrueCap
          </Link>
        </div>

        {/* Hero */}
        <section className="mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary mb-4">
            <Sparkles className="size-3" />
            House-hack-specific comparison
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight text-balance">
            TrueCap vs BiggerPockets for House Hacking:{" "}
            <span className="text-primary">which calculator handles owner-occupant deals correctly?</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Both run house-hack underwriting. This is the
            house-hacker cut: which one models owner-occupant unit
            usage cleanly, FHA 3.5%-down financing, and surfaces
            &quot;effective rent saved&quot; — the metric that
            actually decides whether the deal beats just renting an
            apartment.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5">
              <Calculator className="size-4" />
              Underwrite a house hack
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </ScrollToFormButton>
            <Link
              href="/for-house-hackers"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              For house hackers
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            No card · Free analyzer covers house-hack underwriting
          </p>
        </section>

        {/* TL;DR */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">TL;DR for house hackers</h2>
          <p className="text-sm sm:text-base leading-relaxed text-foreground">
            <strong>TrueCap</strong> wins for house-hacking
            specifically — the explicit &quot;owner-occupant&quot;
            property type auto-excludes your unit from the rent income
            side, surfaces an &quot;effective rent saved&quot; metric,
            while keeping every rent and expense input editable.
            <strong> BiggerPockets&apos;</strong> calculator treats the
            property as generic multifamily and requires you to
            mentally adjust the math for your owner-occupied unit. For
            TrueCap has a free core owner-occupant workflow, while
            BiggerPockets currently presents calculator results as a Pro
            membership feature. Compare both live pricing pages.
          </p>
        </section>

        {/* Matrix */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            House-hack feature-by-feature
          </h2>
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">
            Where each tool wins on the house-hack-specific workflow.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Feature
                  </th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-primary">
                    TrueCap
                  </th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    BiggerPockets
                  </th>
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row) => (
                  <tr key={row.feature} className="border-t border-border align-top">
                    <td className="py-3 px-3 text-sm font-semibold text-foreground">{row.feature}</td>
                    <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                      <div className="flex items-start gap-2">
                        {row.winner === "tie" ? (
                          <Minus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
                        ) : row.winner === "truecap" ? (
                          <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-green)]" />
                        ) : (
                          <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />
                        )}
                        <span>{row.truecap}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                      <div className="flex items-start gap-2">
                        {row.winner === "tie" ? (
                          <Minus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
                        ) : row.winner === "biggerpockets" ? (
                          <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-green)]" />
                        ) : (
                          <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />
                        )}
                        <span>{row.biggerpockets}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            BiggerPockets calculator details based on publicly available
            product info as of 2026. See{" "}
            <a href="https://www.biggerpockets.com/rental-property-calculator" target="_blank" rel="noopener" className="underline">
              BiggerPockets&apos; official rental calculator page
            </a>{" "}
            for their current state.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            New to running an owner-occupant deal? Our{" "}
            <Link href="/blog/house-hack-underwriting-guide" className="font-semibold text-primary hover:underline">house hack underwriting guide</Link>
            {" "}walks through counting only the rental units&apos; income. To pressure-test a single metric, the standalone{" "}
            <Link href="/tools/cap-rate-calculator" className="font-semibold text-primary hover:underline">cap rate calculator</Link>
            {" "}and{" "}
            <Link href="/tools/cash-on-cash-calculator" className="font-semibold text-primary hover:underline">cash-on-cash return calculator</Link>
            {" "}run the same engine as the full analyzer.
          </p>
        </section>

        <ComparisonFaq competitorName="BiggerPockets (House Hacking)" items={BP_HOUSE_HACK_FAQ} />

        {/* Pricing CTA */}
        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Underwrite your first house hack — free.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            TrueCap&apos;s free tier covers owner-occupant property
            types, per-unit rent + status, FHA financing, and
            effective-rent-saved math. Pro adds projections, illustrative
            tax impact, sensitivity, and side-by-side saved-deal comparison.
            Model post-move-out as a separate fully rented scenario; see live
            pricing and check trial eligibility.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              <Calculator className="w-4 h-4" />
              Run a deal — 60 seconds
            </Link>
            <Link
              href="/for-house-hackers"
              className="inline-flex items-center gap-2 border border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground px-4 py-2.5 rounded-xl font-bold hover:bg-primary-foreground/20 transition-colors"
            >
              For house hackers
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground leading-relaxed">
          Other comparisons:{" "}
          <Link href="/vs/biggerpockets-calculator" className="font-bold text-foreground hover:underline">TrueCap vs BiggerPockets</Link>
          {" · "}
          <Link href="/vs/dealcheck" className="font-bold text-foreground hover:underline">TrueCap vs DealCheck</Link>
          {" · "}
          <Link href="/vs/dealcheck-for-brrrr" className="font-bold text-foreground hover:underline">DealCheck for BRRRR</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
