/**
 * /vs/dealcheck — competitor comparison landing page.
 *
 * Target query: "DealCheck alternative", "DealCheck vs ...", "free
 * DealCheck", "DealCheck pricing". Extreme commercial-intent organic
 * search — the visitor has already evaluated one tool and is
 * comparison-shopping. Honest matrix wins more than puffery.
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
  title: "TrueCap vs DealCheck — honest comparison",
  description:
    "Honest TrueCap vs DealCheck for rental analysis: pricing, free tier depth, features, mobile, sharing — what each does best and when to pick which.",
  keywords: [
    "dealcheck alternative",
    "dealcheck vs truecap",
    "truecap vs dealcheck",
    "rental analysis tool comparison",
    "best rental property calculator",
  ],
  alternates: { canonical: "/vs/dealcheck" },
  openGraph: {
    title: "TrueCap vs DealCheck — honest comparison",
    description:
      "Side-by-side feature matrix. Pricing, free tier, mobile, sharing, depth — what each tool is built for.",
    url: "/vs/dealcheck",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs DealCheck" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "dealcheck" | "tie";
type Row = { feature: string; truecap: string; dealcheck: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Free tier depth",                   truecap: "Full underwriting (cap rate, CoC, DSCR, NCF, monthly cash flow) — no signup",        dealcheck: "Free Starter capped at 15 saved properties; signup required",          winner: "truecap" },
  { feature: "Address auto-fill",                 truecap: "HUD rent + FRED rate + state property tax, live",                                    dealcheck: "Property auto-import from listing sites",                              winner: "tie" },
  { feature: "10-year projection",                truecap: "Pro — full rent + expense + appreciation compounding",                              dealcheck: "Built-in; one of the strongest views",                                 winner: "dealcheck" },
  { feature: "Tax strategy modeling",             truecap: "Pro — depreciation, interest deduction, after-tax CF, bracket-aware",               dealcheck: "Basic tax view",                                                       winner: "truecap" },
  { feature: "Exit scenarios",                    truecap: "Pro — sell-at-year-N modeling with equity + IRR",                                   dealcheck: "Available",                                                            winner: "tie" },
  { feature: "Sensitivity grid (stress test)",    truecap: "Pro — rent ±10%, vacancy ±5pp, rates ±1pp in one view",                              dealcheck: "Not a primary feature",                                                winner: "truecap" },
  { feature: "Max allowable offer (MAO) solver",  truecap: "Pro — works backward from target return",                                           dealcheck: "Available",                                                            winner: "tie" },
  { feature: "BRRRR analyzer",                    truecap: "Yes — capital-recovered focus + ARV-driven refi math",                              dealcheck: "Yes — long-standing BRRRR support",                                    winner: "tie" },
  { feature: "Fix-and-flip analyzer",             truecap: "Yes — ARV, holding cost, profit modeling",                                          dealcheck: "Yes",                                                                  winner: "tie" },
  { feature: "Shareable read-only deal links",    truecap: "Pro — clean public URL with metrics + branding",                                    dealcheck: "Available in some tiers",                                              winner: "tie" },
  { feature: "PDF report export",                 truecap: "Pro — multi-page lender-ready report",                                              dealcheck: "Yes — long-standing PDF feature",                                      winner: "tie" },
  { feature: "Mobile-first UX",                   truecap: "Designed mobile-first — works great at the showing",                                dealcheck: "Has mobile apps (iOS + Android)",                                      winner: "dealcheck" },
  { feature: "Saved deal portfolio rollup",       truecap: "Yes — total CF, weighted cap rate across saved deals",                              dealcheck: "List view; no portfolio aggregate",                                    winner: "truecap" },
  { feature: "Cash flow waterfall visualization", truecap: "Yes — see where every rent dollar goes",                                            dealcheck: "Standard line-item breakdown",                                         winner: "truecap" },
  { feature: "Deal score + plain-English verdict", truecap: "Free — 0-100 score with subscore breakdown + explanation",                          dealcheck: "Color-coded indicators",                                               winner: "truecap" },
  { feature: "Open data sources cited",           truecap: "HUD FMR + FRED + state tax — every assumption traceable",                           dealcheck: "Listing-import + custom data",                                         winner: "truecap" },
  { feature: "Pricing transparency",              truecap: "Free + monthly Pro on /pricing, no card to start",                                  dealcheck: "Tiered plans (free Starter / Plus $10 / Pro $20)",                              winner: "tie" },
  { feature: "Native iOS/Android apps",           truecap: "PWA — installable to home screen, no app-store delay",                              dealcheck: "Native apps",                                                          winner: "dealcheck" },
];

export default function VsDealCheckPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "TrueCap vs DealCheck — honest comparison",
    url: `${siteUrl}/vs/dealcheck`,
    description:
      "Side-by-side comparison of TrueCap and DealCheck for rental property underwriting.",
    dateModified: "2026-06-01",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/dealcheck" pageName="TrueCap vs DealCheck" />
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
            Honest comparison
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight text-balance">
            TrueCap vs DealCheck:{" "}
            <span className="text-primary">which rental analyzer fits you?</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            DealCheck has been a great option for investors for years. We built
            TrueCap because we wanted some things DealCheck doesn&apos;t do — and
            because we believe the free tier should be honestly useful, not a
            trial wall. Here&apos;s the honest comparison so you can pick the
            right tool for your style.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(82,72,212,0.28)] transition-transform hover:-translate-y-0.5"
            >
              <Calculator className="size-4" />
              Try the TrueCap free analyzer
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </ScrollToFormButton>
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              See TrueCap pricing
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            No card · No signup needed to use the analyzer · Cancel anytime
          </p>
        </section>

        {/* TL;DR */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">
            TL;DR
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">
                Pick TrueCap if
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You want a fully usable free tier with no analysis limits.</li>
                <li>Your free analyses should feel like the real product, not a teaser.</li>
                <li>You want explicit benchmarks (&quot;Above 8% — top quartile&quot;) inline with each metric.</li>
                <li>You want a portfolio rollup across saved deals.</li>
                <li>You want a deal score with a plain-English breakdown.</li>
                <li>You prefer transparent open-data sources (HUD, FRED, state tax) you can audit.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Pick DealCheck if
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You want native iOS + Android apps (TrueCap is PWA-only today).</li>
                <li>You&apos;re heavily invested in listing-import workflows.</li>
                <li>You already have a paid DealCheck plan and the muscle memory.</li>
                <li>You want a tool with a longer track record in the BRRRR community.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Matrix */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            Feature-by-feature
          </h2>
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">
            Where we have one, where they have one, where it&apos;s a wash.
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
                    DealCheck
                  </th>
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row) => (
                  <tr key={row.feature} className="border-t border-border align-top">
                    <td className="py-3 px-3 text-sm font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <WinnerBadge winner={row.winner} side="row" />
                        {row.feature}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                      <div className="flex items-start gap-2">
                        <WinnerBadge winner={row.winner} side="truecap" />
                        <span>{row.truecap}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                      <div className="flex items-start gap-2">
                        <WinnerBadge winner={row.winner} side="dealcheck" />
                        <span>{row.dealcheck}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Pricing, plan limits, and exact feature availability change.
            DealCheck details based on publicly available product info as of 2026.
            See <a href="https://dealcheck.io" target="_blank" rel="noopener" className="underline">dealcheck.io</a>{" "}
            for their current state.
          </p>
        </section>

        {/* When to switch */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            When investors actually switch to TrueCap
          </h2>
          <ul className="space-y-2 text-sm sm:text-base leading-relaxed text-foreground">
            <li><strong>&quot;I want the free tier to actually be useful.&quot;</strong> TrueCap&apos;s free analyzer is the full thing — cap rate, CoC, DSCR, NCF, address auto-fill, every operating expense, all of it. No signup wall, no analysis count limit. Pro adds power (sensitivity, exit scenarios, tax strategy, share links, PDFs) but the underwriting itself is free.</li>
            <li><strong>&quot;I want benchmarks inline, not in a separate doc.&quot;</strong> Every metric tile shows you what tier you&apos;re in (&quot;Above 8% — top quartile&quot;) without leaving the analysis. Pulls from the same engine that drives the score.</li>
            <li><strong>&quot;I run a portfolio.&quot;</strong> Saved deals get a rollup header (total cash flow / weighted cap rate / weighted CoC) — feels like running a book, not a notebook.</li>
            <li><strong>&quot;I want to understand the score, not just trust it.&quot;</strong> Click &quot;Why this score?&quot; on any analysis and see the contribution from each subscore plus what would move the number.</li>
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            Prefer to kick the tires on a single metric first? Try the
            standalone{" "}
            <Link href="/tools/cap-rate-calculator" className="font-semibold text-primary hover:underline">
              cap rate calculator
            </Link>
            ,{" "}
            <Link href="/tools/dscr-calculator" className="font-semibold text-primary hover:underline">
              DSCR calculator
            </Link>
            , or{" "}
            <Link href="/tools/brrrr-calculator" className="font-semibold text-primary hover:underline">
              BRRRR calculator
            </Link>{" "}
            — same engine as the full analyzer, narrower scope. For the
            workflow itself, our guide on{" "}
            <Link href="/blog/how-to-underwrite-a-rental-property-in-60-seconds" className="font-semibold text-primary hover:underline">
              60-second underwriting
            </Link>{" "}
            shows exactly how a TrueCap user moves from listing to verdict.
          </p>
        </section>

        <ComparisonFaq competitorName="DealCheck" items={DEALCHECK_FAQ} />

        {/* Pricing CTA */}
        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Try TrueCap free — see if it fits your workflow.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            Free covers cash-flow analysis (cap rate, CoC, DSCR, NCF) — enough to underwrite. Pro unlocks share links, PDF exports, 10-year projections, tax strategy, sensitivity, MAO, and the strategy analyzers. No card to start. Cancel anytime.
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
              href="/"
              className="inline-flex items-center gap-2 border border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground px-4 py-2.5 rounded-xl font-bold hover:bg-primary-foreground/20 transition-colors"
            >
              <Calculator className="w-4 h-4" />
              Run a deal now
            </Link>
          </div>
        </section>

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground leading-relaxed">
          Other comparisons:{" "}
          <Link href="/vs/stessa" className="font-bold text-foreground hover:underline">
            TrueCap vs Stessa
          </Link>{" "}
          ·{" "}
          <Link href="/vs/mashvisor" className="font-bold text-foreground hover:underline">
            TrueCap vs Mashvisor
          </Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const DEALCHECK_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a free alternative to DealCheck?",
    answer: (
      <>
        Yes. TrueCap&apos;s free tier gives you a complete underwrite — cap
        rate, cash-on-cash, DSCR, monthly cash flow, NOI — with no signup
        required and no monthly limit on analyses. DealCheck&apos;s free
        tier requires signup and caps you at 15 saved properties at a
        time. If you only need to run numbers on individual listings,
        the free tier of TrueCap covers the same job DealCheck Plus
        would.
      </>
    ),
    plainTextAnswer:
      "Yes. TrueCap's free tier covers cap rate, cash-on-cash, DSCR, monthly cash flow, and NOI with no signup and no monthly limit. DealCheck's free tier requires signup and caps saved properties at 15 at a time.",
  },
  {
    question: "How much does TrueCap cost compared to DealCheck?",
    answer: (
      <>
        TrueCap Pro is $29.99/month or $200/year on the annual plan
        (~$25/mo). DealCheck&apos;s Plus tier is $10/month and Pro is
        $20/month (as of June 2026) — but those tiers mostly raise
        saved-property caps. TrueCap&apos;s single tier is about analysis
        depth: share links, PDF export, tax strategy, exit scenarios,
        sensitivity, and MAO all included — no
        &quot;upgrade for X&quot; gating.
      </>
    ),
    plainTextAnswer:
      "TrueCap Pro is $29.99/month (or $300/year annual, ~$25/mo). DealCheck Plus is $10/month and Pro $20/month (as of June 2026), but those tiers mostly raise saved-property caps. TrueCap's single tier includes share links, PDF export, tax strategy, exit scenarios, sensitivity, and MAO.",
  },
  {
    question: "Which tool is better for new investors?",
    answer: (
      <>
        TrueCap. The 60-second underwrite flow plus a plain-English
        verdict (Strong / Solid / Mixed / Marginal / Negative) is built
        for someone learning to read a deal, not someone already fluent
        in commercial real-estate math. DealCheck is more powerful once
        you know what every input means, but new investors often spend
        their first session staring at a form trying to figure out which
        fields matter. TrueCap pre-fills HUD rent + FRED rate + state
        property tax from the address, so a first-time user can get a
        real underwrite without knowing the right numbers to type.
      </>
    ),
    plainTextAnswer:
      "TrueCap. The 60-second underwrite flow with a plain-English verdict (Strong/Solid/Mixed/Marginal/Negative) is designed for someone learning to read a deal. TrueCap also pre-fills HUD rent, FRED rate, and state property tax from the address so first-time users get a real underwrite without knowing what to type.",
  },
  {
    question: "Does TrueCap have a mobile app like DealCheck?",
    answer: (
      <>
        TrueCap is a Progressive Web App (PWA) — you install it from the
        browser to your home screen and it works offline-ish, like a
        native app, without going through the App Store. DealCheck has
        true native iOS and Android apps, which is the right call if
        you&apos;re heavy on mobile-first workflows like walking
        properties and analyzing on the spot. Both work on phones; the
        difference is delivery mechanism.
      </>
    ),
    plainTextAnswer:
      "TrueCap is a PWA — install from the browser to your home screen, works like a native app without the App Store. DealCheck has true native iOS and Android apps. Both work on phones; the difference is delivery mechanism.",
  },
  {
    question: "Can I import properties from Zillow or Redfin with TrueCap?",
    answer: (
      <>
        Not directly via a listing scrape — TrueCap uses authoritative
        data sources (HUD Fair Market Rent, FRED 30-year mortgage rate,
        state-level property tax rates) to pre-fill your form when you
        paste an address. DealCheck&apos;s property-import-from-listing
        is faster for adjusting comparable rent, but TrueCap&apos;s
        approach gives you defensible numbers when a lender asks where
        the rent estimate came from.
      </>
    ),
    plainTextAnswer:
      "Not via listing scrape. TrueCap pre-fills the form from authoritative sources (HUD Fair Market Rent, FRED 30-year mortgage rate, state property tax). DealCheck imports directly from listing sites. TrueCap's approach gives defensible numbers for lenders.",
  },
  {
    question: "When should I pick DealCheck over TrueCap?",
    answer: (
      <>
        Pick DealCheck if you&apos;re primarily mobile-first walking
        many properties a day, you want a native app, and listing-site
        property import is your top workflow. Pick TrueCap if you want
        the deepest free tier on the market, plain-English verdicts,
        tax-strategy modeling, sensitivity analysis, MAO,
        portfolio rollup across saved deals, and shareable read-only
        deal links — all in a single Pro tier without per-feature
        upcharges.
      </>
    ),
    plainTextAnswer:
      "Pick DealCheck if you're mobile-first, want a native app, and listing-import is your top workflow. Pick TrueCap if you want the deepest free tier, plain-English verdicts, tax modeling, sensitivity, MAO, portfolio rollup, and share links — all in one Pro tier.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "dealcheck";
}) {
  if (side === "row") return null;
  if (winner === "tie") {
    return side === "truecap" ? (
      <Minus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
    ) : (
      <Minus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
    );
  }
  if (winner === "truecap" && side === "truecap") {
    return <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-green)]" />;
  }
  if (winner === "dealcheck" && side === "dealcheck") {
    return <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-green)]" />;
  }
  if (winner === "truecap" && side === "dealcheck") {
    return <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />;
  }
  if (winner === "dealcheck" && side === "truecap") {
    return <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />;
  }
  return null;
}
