/**
 * /vs/bricked — competitor comparison landing page.
 *
 * Target queries: "bricked ai alternative", "bricked ai review",
 * "bricked ai pricing", "bricked vs", "ai real estate underwriting".
 * Bricked (bricked.ai) is an AI comps + repair-estimate + ARV tool
 * aimed at flippers, wholesalers, and acquisition teams ($49-199/mo,
 * metered per comp). It does VALUATION; TrueCap does RETURNS. The
 * honest framing — "what it's worth vs what it earns" — is also the
 * one that wins, because their tool genuinely has no cash-flow layer.
 * First-mover note: as of June 2026 Bricked has no comparison content
 * of their own; owning "bricked alternative" early frames the matchup.
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
  title: "TrueCap vs Bricked AI — honest comparison",
  description:
    "Bricked tells flippers what a house is worth — AI comps, ARV, repair costs. TrueCap tells investors what a rental will earn — cash flow, DSCR, taxes, exit. Honest side-by-side.",
  keywords: [
    "bricked ai alternative",
    "bricked ai review",
    "bricked ai pricing",
    "bricked vs truecap",
    "ai real estate underwriting",
    "ai rental property calculator",
  ],
  alternates: { canonical: "/vs/bricked" },
  openGraph: {
    title: "TrueCap vs Bricked AI — honest comparison",
    description:
      "Bricked: AI comps, ARV, repair costs for flippers. TrueCap: cash flow, DSCR, taxes for rental investors. Honest comparison.",
    url: "/vs/bricked",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Bricked AI" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "bricked" | "tie";
type Row = { feature: string; truecap: string; bricked: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Primary purpose", truecap: "Rental returns calculator — is this a good investment?", bricked: "AI valuation — what's it worth, what do repairs cost?", winner: "tie" },
  { feature: "Built for", truecap: "Buy-and-hold investors, house-hackers, agents", bricked: "Flippers, wholesalers, acquisition teams", winner: "tie" },
  { feature: "Cash flow / cap rate / CoC / DSCR", truecap: "Yes — full engine, free tier", bricked: "Not modeled", winner: "truecap" },
  { feature: "10-year projection + exit scenarios", truecap: "Pro — rent/expense growth, best year to sell", bricked: "Not modeled", winner: "truecap" },
  { feature: "Tax strategy (depreciation, after-tax CF)", truecap: "Pro — bracket-aware modeling", bricked: "Not modeled", winner: "truecap" },
  { feature: "Financing math (PITI, amortization, DSCR)", truecap: "Yes — full loan modeling", bricked: "Not included", winner: "truecap" },
  { feature: "Comps + ARV / market value", truecap: "Purchase price is user input — no AVM", bricked: "Yes — AI-selected comps from MLS + county data, ARV + CMV", winner: "bricked" },
  { feature: "Repair cost estimates", truecap: "Rehab estimator with sq-ft-based defaults", bricked: "Itemized, ZIP-localized material + labor costs", winner: "bricked" },
  { feature: "Photo-based condition scoring", truecap: "No", bricked: "Yes — renovated vs as-is detection", winner: "bricked" },
  { feature: "Rent data", truecap: "HUD ZIP-level Small Area FMR auto-fill", bricked: "Not the focus", winner: "truecap" },
  { feature: "AI deal Q&A on your numbers", truecap: "Yes — grounded in the computed analysis", bricked: "AI picks comps; no investment Q&A", winner: "truecap" },
  { feature: "Try without signup", truecap: "Yes — full analysis, no account", bricked: "No — account + 3-day trial", winner: "truecap" },
  { feature: "Free tier", truecap: "Yes — unlimited core underwriting", bricked: "No — trial only", winner: "truecap" },
  { feature: "Entry pricing", truecap: "Free; Pro $20/mo unlimited; $5 one-time PDF", bricked: "$49/mo for 100 comps, metered up to $199/mo (as of June 2026)", winner: "truecap" },
  { feature: "Lender-ready PDF + share links", truecap: "Pro — multi-page report + read-only links", bricked: "Not the focus", winner: "truecap" },
  { feature: "API access", truecap: "No", bricked: "Yes — Growth tier and up", winner: "bricked" },
];

export default function VsBrickedPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "TrueCap vs Bricked AI — honest comparison",
    url: `${siteUrl}/vs/bricked`,
    description:
      "Bricked tells flippers what a house is worth — AI comps, ARV, repair costs. TrueCap tells investors what a rental will earn — cash flow, DSCR, taxes, exit.",
    dateModified: "2026-06-12",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/bricked" pageName="TrueCap vs Bricked AI" />
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
            TrueCap vs Bricked:{" "}
            <span className="text-primary">what it&apos;s worth vs what it earns</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Bricked is an AI valuation tool — it finds comps, estimates repairs, and
            prices cash offers for flippers and wholesalers working at volume. TrueCap
            is a returns calculator — it tells a rental investor what a property will
            actually earn: cash flow, DSCR, taxes, and the best year to sell. Both say
            &quot;underwrite in seconds.&quot; They mean different things by it.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(82,72,212,0.28)] transition-transform hover:-translate-y-0.5"
            >
              <Calculator className="size-4" />
              Run a deal — 60 seconds
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
            No card · No signup · Cancel anytime
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
                Use TrueCap when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You&apos;re deciding whether a rental deserves your down payment.</li>
                <li>You want cash flow, DSCR, cap rate, and CoC — with financing math baked in.</li>
                <li>You want 10-year projections, tax strategy, and exit timing on every deal.</li>
                <li>You analyze a few deals a month and don&apos;t want a $49+ metered plan.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use Bricked when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You make cash offers at volume and need ARV from comps, fast.</li>
                <li>You want itemized repair estimates grounded in local costs.</li>
                <li>You need photo-based renovated-vs-as-is comp filtering.</li>
                <li>You&apos;re a wholesaling / acquisitions team with comp budgets.</li>
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
            Side-by-side on every dimension that matters — including the ones where
            Bricked is genuinely ahead.
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
                    Bricked
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
                        <WinnerBadge winner={row.winner} side="bricked" />
                        <span>{row.bricked}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Bricked details based on publicly available product info, verified June 2026.
            See{" "}
            <a href="https://bricked.ai" target="_blank" rel="noopener" className="underline">
              bricked.ai
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* Complementary workflow */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            How TrueCap + Bricked fit together (BRRRR &amp; flip-to-hold)
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
            <li>
              <strong>Get ARV and repair costs from Bricked.</strong> Their comps and
              localized repair estimates answer the valuation question.
            </li>
            <li>
              <strong>Plug both numbers into TrueCap&apos;s BRRRR analyzer.</strong>{" "}
              ARV drives the cash-out refi math; the repair figure feeds your all-in cost.
            </li>
            <li>
              <strong>TrueCap answers the question Bricked can&apos;t:</strong> after the
              refi, does this property cash-flow? What&apos;s the DSCR a lender sees? How
              much capital comes back out?
            </li>
            <li>
              <strong>Stress-test before you commit.</strong> TrueCap&apos;s sensitivity
              grid varies ARV ±10% — the single biggest BRRRR risk — in one view.
            </li>
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            Holding instead of flipping? Start with the{" "}
            <Link href="/" className="font-semibold text-primary hover:underline">
              free TrueCap analyzer
            </Link>{" "}
            or the{" "}
            <Link href="/tools/brrrr-calculator" className="font-semibold text-primary hover:underline">
              BRRRR calculator
            </Link>
            .
          </p>
        </section>

        <ComparisonFaq competitorName="Bricked" items={BRICKED_FAQ} />

        {/* Pricing CTA */}
        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Find out what the deal actually earns — free.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            TrueCap free covers cap rate, CoC, DSCR, and monthly cash flow with no
            account and no analysis cap. Pro adds projections, tax strategy, exit
            scenarios, BRRRR + flip analyzers, deal score, and lender-ready PDFs —
            $20/mo flat, never metered.
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
          <Link href="/vs/dealcheck" className="font-bold text-foreground hover:underline">TrueCap vs DealCheck</Link>
          {" · "}
          <Link href="/vs/propstream" className="font-bold text-foreground hover:underline">TrueCap vs PropStream</Link>
          {" · "}
          <Link href="/vs/mashvisor" className="font-bold text-foreground hover:underline">TrueCap vs Mashvisor</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const BRICKED_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Bricked alternative?",
    answer: (
      <>
        For rental investors, yes — for wholesalers, not really. Bricked is an AI
        valuation tool: comps, ARV, and repair estimates for people making cash
        offers at volume. TrueCap is a returns calculator: cash flow, DSCR, cap
        rate, 10-year projections, and tax strategy for people deciding whether to
        own a rental. If you searched &quot;Bricked alternative&quot; because you
        wanted to know whether a property is a good <em>investment</em>, TrueCap is
        the tool for that question — and it&apos;s free to start.
      </>
    ),
    plainTextAnswer:
      "For rental investors yes; for wholesalers not really. Bricked is AI valuation (comps, ARV, repairs) for volume cash offers. TrueCap is a returns calculator (cash flow, DSCR, projections, tax) for deciding whether to own a rental. Free to start.",
  },
  {
    question: "Does Bricked calculate cash flow or DSCR?",
    answer: (
      <>
        No. Bricked produces comps, ARV/market value, repair estimates, and an
        offer price. It does not model rental income, operating expenses,
        financing, DSCR, cap rate, cash-on-cash, taxes, or long-term projections —
        the entire question of what the property earns as a rental is out of its
        scope. That&apos;s the half TrueCap covers.
      </>
    ),
    plainTextAnswer:
      "No. Bricked produces comps, ARV, repair estimates, and an offer price. It doesn't model rental income, expenses, financing, DSCR, cap rate, taxes, or projections — that's the half TrueCap covers.",
  },
  {
    question: "How does Bricked's pricing compare to TrueCap's?",
    answer: (
      <>
        Bricked starts at $49/month for 100 comps, rising to $199/month for 500
        (metered, with a 3-day trial and no free tier) — priced for acquisition
        teams running volume. TrueCap&apos;s core analyzer is free with no analysis
        cap and no account required; Pro is $20/month flat with everything
        unlimited, and there&apos;s a $5 one-time option for a single lender-ready
        PDF. For a solo investor analyzing a few deals a month, the pricing models
        aren&apos;t really comparable.
      </>
    ),
    plainTextAnswer:
      "Bricked: $49/mo for 100 comps up to $199/mo for 500, metered, 3-day trial, no free tier. TrueCap: free unlimited core, Pro $20/mo flat, $5 one-time PDF. Different models for different volumes.",
  },
  {
    question: "Are Bricked's repair estimates better than TrueCap's rehab estimator?",
    answer: (
      <>
        For precision, likely yes — Bricked aggregates local material and labor
        pricing by ZIP to produce itemized estimates, while TrueCap&apos;s rehab
        estimator uses square-footage-based defaults you adjust yourself.
        TrueCap&apos;s estimator is built for a quick budget inside a hold
        analysis, not contractor-grade scoping. If repair precision drives your
        deals (heavy rehabs, flips at volume), Bricked&apos;s approach is stronger;
        plug its number into TrueCap to see what the deal earns after the rehab.
      </>
    ),
    plainTextAnswer:
      "For precision, likely yes — Bricked uses ZIP-localized material + labor costs; TrueCap's rehab estimator uses sq-ft defaults for quick budgeting inside a hold analysis. Use Bricked's number in TrueCap to see what the deal earns after rehab.",
  },
  {
    question: "I'm a fix-and-flipper — which should I use?",
    answer: (
      <>
        If you flip at volume, Bricked&apos;s comps + repair engine fits your
        acquisition workflow. If you flip occasionally — or you&apos;re deciding
        between flipping and holding — TrueCap Pro&apos;s fix-and-flip analyzer
        (net profit, annualized ROI, break-even ARV) plus the BRRRR analyzer covers
        the math at $20/month, and the hold analysis tells you whether keeping it
        as a rental beats selling. Many investors use both: Bricked for the offer,
        TrueCap for the hold decision.
      </>
    ),
    plainTextAnswer:
      "Volume flippers: Bricked fits the acquisition workflow. Occasional flippers or flip-vs-hold deciders: TrueCap Pro's flip + BRRRR analyzers at $20/mo, plus hold analysis. Many use both: Bricked for the offer, TrueCap for the hold decision.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "bricked";
}) {
  if (side === "row") return null;
  if (winner === "tie") {
    return <Minus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />;
  }
  if (winner === side) {
    return <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-green)]" />;
  }
  return <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />;
}
