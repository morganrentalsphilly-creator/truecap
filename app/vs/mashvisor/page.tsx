/**
 * /vs/mashvisor — competitor comparison landing page.
 *
 * Mashvisor positioning: market-data + heatmaps + STR-focused
 * Airbnb-rental analytics. They're strongest at the "where should I
 * invest?" question (market-level). TrueCap is strongest at the
 * "should I buy THIS property?" question (per-deal underwriting).
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
  title: "Mashvisor Alternative: Free Deal Analysis (2026)",
  description:
    "TrueCap vs Mashvisor for rental investors. Per-deal underwriting (TrueCap) vs market heatmaps + STR data (Mashvisor). Feature matrix + when each wins.",
  keywords: [
    "mashvisor alternative",
    "mashvisor vs truecap",
    "rental analysis tool comparison",
    "airbnb investment calculator",
  ],
  alternates: { canonical: "/vs/mashvisor" },
  openGraph: {
    title: "Mashvisor Alternative: Free Deal Analysis (2026)",
    description:
      "Per-deal underwriting vs market heatmaps + Airbnb data. Different jobs, different price points.",
    url: "/vs/mashvisor",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Mashvisor" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "mashvisor" | "tie";
type Row = { feature: string; truecap: string; mashvisor: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Primary job",                       truecap: "Per-deal underwriting — should I buy THIS property?",                              mashvisor: "Market research — WHERE should I invest?",                              winner: "tie" },
  { feature: "Free tier depth",                   truecap: "Full underwriting, no signup, no analysis limit",                                 mashvisor: "Limited free preview; most data requires paid plan",                    winner: "truecap" },
  { feature: "Per-deal cap rate / CoC / DSCR",    truecap: "Yes — live as you type, with inline benchmarks",                                  mashvisor: "Yes — alongside market data",                                            winner: "tie" },
  { feature: "10-year projection",                truecap: "Pro — full compounding with depreciation",                                        mashvisor: "Available",                                                              winner: "tie" },
  { feature: "Market-level heatmaps",             truecap: "No — focused on the property in front of you",                                    mashvisor: "Yes — neighborhood-level cap rate + rent heatmaps",                      winner: "mashvisor" },
  { feature: "Airbnb / STR market data",          truecap: "Long-term focus; STR-specific fields coming",                                    mashvisor: "Strong — pulls Airbnb occupancy + ADR data by ZIP",                      winner: "mashvisor" },
  { feature: "Comparable sales (comps)",          truecap: "No",                                                                              mashvisor: "Yes — included in their data layer",                                     winner: "mashvisor" },
  { feature: "Property listings discovery",       truecap: "Not the focus — start with an address you found elsewhere",                       mashvisor: "Yes — investment-property marketplace",                                  winner: "mashvisor" },
  { feature: "Tax strategy modeling",             truecap: "Pro — depreciation + interest + bracket-aware after-tax CF",                      mashvisor: "Basic tax view",                                                         winner: "truecap" },
  { feature: "Sensitivity / stress test",         truecap: "Pro — rent ±10%, vacancy ±5pp, rates ±1pp",                                       mashvisor: "Not the primary use case",                                               winner: "truecap" },
  { feature: "Max allowable offer (MAO) solver",  truecap: "Pro — works backward from target return",                                         mashvisor: "Not a primary feature",                                                  winner: "truecap" },
  { feature: "Deal score + breakdown",            truecap: "Free — 0–100 score with per-subscore explanation",                                 mashvisor: "Their own metric",                                                       winner: "tie" },
  { feature: "Free address auto-fill",            truecap: "HUD FMR + FRED + state tax — free, no signup",                                    mashvisor: "Behind paywall",                                                         winner: "truecap" },
  { feature: "Sharable read-only deal links",     truecap: "Free — read-only public link; Pro adds co-branding",                              mashvisor: "Account-gated views",                                                    winner: "truecap" },
  { feature: "PDF lender report",                 truecap: "Pro — multi-page report",                                                         mashvisor: "Available",                                                              winner: "tie" },
  { feature: "Pricing",                           truecap: "Free + monthly Pro on /pricing, no card to start",                                mashvisor: "Tiered paid plans, generally $$$ at scale",                              winner: "truecap" },
];

export default function VsMashvisorPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Mashvisor Alternative: Free Deal Analysis (2026)",
    url: `${siteUrl}/vs/mashvisor`,
    description: "Side-by-side comparison of TrueCap and Mashvisor for rental investors.",
    dateModified: "2026-06-01",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <VsBreadcrumbSchema vsPath="/vs/mashvisor" pageName="TrueCap vs Mashvisor" />
      <main id="main" className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-2">
          <Link href="/" className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground">
            ← TrueCap
          </Link>
        </div>

        <section className="mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary mb-4">
            <Sparkles className="size-3" />
            Honest comparison
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight text-balance">
            TrueCap vs Mashvisor:{" "}
            <span className="text-primary">per-deal math vs market data.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Mashvisor is built around market-level data — heatmaps, ZIP-code Airbnb
            occupancy, comps. TrueCap is built around per-deal math — should I
            actually buy this specific property? Different jobs, different price
            points. Here&apos;s when to pick which.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5">
              <Calculator className="size-4" />
              Try the TrueCap free analyzer
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </ScrollToFormButton>
            <Link href="/pricing" className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted">
              See TrueCap pricing
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            No card · No signup needed to use the analyzer · Cancel anytime
          </p>
        </section>

        <section className="mb-12 sm:mb-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">TL;DR</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">Pick TrueCap if</p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You&apos;ve found a specific property and need to decide if it pencils.</li>
                <li>You want a free tier that does the full underwriting math.</li>
                <li>You want stress-test sensitivity + tax strategy + exit modeling.</li>
                <li>You prefer transparent open-data sources (HUD, FRED, state tax) you can audit.</li>
                <li>You don&apos;t want to pay $$$/mo for market data you may not need.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Pick Mashvisor if</p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You&apos;re still deciding WHICH market to invest in (heatmaps help).</li>
                <li>You&apos;re running an STR strategy and need Airbnb occupancy data.</li>
                <li>You want comparable sales (comps) data built in.</li>
                <li>You want to browse investment-property listings.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">Feature-by-feature</h2>
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">
            Where each tool earns its keep.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Feature</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-primary">TrueCap</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mashvisor</th>
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row) => (
                  <tr key={row.feature} className="border-t border-border align-top">
                    <td className="py-3 px-3 text-sm font-semibold text-foreground">{row.feature}</td>
                    <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                      <div className="flex items-start gap-2">
                        <WinnerBadge winner={row.winner} side="truecap" />
                        <span>{row.truecap}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                      <div className="flex items-start gap-2">
                        <WinnerBadge winner={row.winner} side="mashvisor" />
                        <span>{row.mashvisor}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Mashvisor details based on publicly available product info as of 2026. See{" "}
            <a href="https://mashvisor.com" target="_blank" rel="noopener" className="underline">mashvisor.com</a>{" "}
            for their current state.
          </p>
        </section>

        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            The honest take
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-foreground">
            Mashvisor is a great tool for market research and STR-focused strategies.
            The trade-off is price (their data is expensive to license, so the
            subscription has to cover that) and depth on the per-deal math
            (heatmaps tell you which neighborhood; they don&apos;t tell you
            whether THIS specific 3-bed off Market St clears your DSCR target
            with the lender you&apos;re actually talking to).
          </p>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-foreground">
            TrueCap is built for the moment you have an address and need to
            decide. Free analyzer, no signup wall, real depth on the Pro tier.
            For long-term rentals especially, the per-deal math is what determines
            whether you&apos;re making money — the heatmaps just told you to look.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            Once the heatmap points you somewhere, the per-deal math is one address away. Start with the standalone{" "}
            <Link href="/tools/cap-rate-calculator" className="font-semibold text-primary hover:underline">cap rate calculator</Link>
            {" "}or{" "}
            <Link href="/tools/cash-on-cash-calculator" className="font-semibold text-primary hover:underline">cash-on-cash return calculator</Link>
            {" "}— same engine as the full analyzer. Our walkthrough on{" "}
            <Link href="/blog/how-to-underwrite-a-rental-property-in-60-seconds" className="font-semibold text-primary hover:underline">underwriting a rental in 60 seconds</Link>
            {" "}shows the full move from listing to verdict.
          </p>
        </section>

        <ComparisonFaq competitorName="Mashvisor" items={MASHVISOR_FAQ} />

        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Underwriting the next deal? Start free.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            TrueCap free covers cap rate, CoC, DSCR, NCF, monthly cash flow — enough to underwrite. Pro unlocks co-branded share links, PDF exports, 10-year projections, tax strategy, sensitivity grid, MAO, and the strategy analyzers. No card to start.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/pricing" className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity">
              Start a 3-day free trial
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <Link href="/" className="inline-flex items-center gap-2 border border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground px-4 py-2.5 rounded-xl font-bold hover:bg-primary-foreground/20 transition-colors">
              <Calculator className="w-4 h-4" />
              Run a deal now
            </Link>
          </div>
        </section>

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground leading-relaxed">
          Other comparisons:{" "}
          <Link href="/vs/dealcheck" className="font-bold text-foreground hover:underline">TrueCap vs DealCheck</Link>{" "}·{" "}
          <Link href="/vs/stessa" className="font-bold text-foreground hover:underline">TrueCap vs Stessa</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const MASHVISOR_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Mashvisor alternative?",
    answer: (
      <>
        Yes, but they solve different problems. Mashvisor is built for
        market discovery — heatmaps, neighborhood scoring, Airbnb
        comps. TrueCap is built for per-property underwriting — once
        you have an address, decide if the deal works. Many investors
        use both: Mashvisor to find a neighborhood, TrueCap to
        underwrite the specific listing.
      </>
    ),
    plainTextAnswer:
      "Yes, but they solve different problems. Mashvisor is built for market discovery (heatmaps, neighborhood scoring, Airbnb comps). TrueCap is built for per-property underwriting. Many investors use both: Mashvisor to find a neighborhood, TrueCap to underwrite the listing.",
  },
  {
    question: "How does TrueCap compare to Mashvisor for short-term rentals?",
    answer: (
      <>
        Mashvisor is stronger for short-term rental comparable
        research — they have Airbnb occupancy and ADR data baked in.
        TrueCap is stronger for the long-term rental underwrite. If
        STR is your primary strategy, Mashvisor + TrueCap together
        cover both halves of the job. If you&apos;re long-term buy and
        hold, TrueCap alone is enough.
      </>
    ),
    plainTextAnswer:
      "Mashvisor is stronger for short-term rental comp research (Airbnb occupancy + ADR data). TrueCap is stronger for the long-term underwrite. For STR-focused investors, use both. For long-term buy and hold, TrueCap alone is enough.",
  },
  {
    question: "Is Mashvisor or TrueCap cheaper?",
    answer: (
      <>
        TrueCap is cheaper. TrueCap Pro is $29.99/month. Mashvisor&apos;s
        plans range from ~$70/month to ~$300/month depending on
        feature access and market data depth (as of 2026). TrueCap
        doesn&apos;t carry market-data subscription costs because the
        product scope is narrower (per-deal underwriting, not
        nationwide neighborhood data).
      </>
    ),
    plainTextAnswer:
      "TrueCap is cheaper. TrueCap Pro is $29.99/month. Mashvisor's plans range from ~$70/month to ~$300/month depending on feature access (as of 2026). TrueCap's scope is narrower (per-deal underwriting, not nationwide neighborhood data).",
  },
  {
    question: "Does TrueCap have neighborhood heatmaps like Mashvisor?",
    answer: (
      <>
        No. TrueCap is explicitly not a market-discovery tool — we
        don&apos;t do heatmaps, neighborhood scoring, or
        nationwide-comparables. If you need that, use Mashvisor or
        AirDNA. TrueCap&apos;s job is to take an address you&apos;ve
        already chosen and underwrite the specific property.
      </>
    ),
    plainTextAnswer:
      "No. TrueCap is not a market-discovery tool — no heatmaps, neighborhood scoring, or nationwide comparables. Use Mashvisor or AirDNA for that. TrueCap's job is to underwrite a specific property once you have the address.",
  },
  {
    question: "Can I use TrueCap to analyze deals in any US market?",
    answer: (
      <>
        Yes. TrueCap pulls HUD Fair Market Rent (county-level), FRED
        30-year mortgage rate (national), and state-level effective
        property tax rate from authoritative public sources, so the
        address auto-fill works for any address in the US. The
        per-deal underwriting math is market-agnostic.
      </>
    ),
    plainTextAnswer:
      "Yes. TrueCap pulls HUD Fair Market Rent (county-level), FRED 30-year mortgage rate (national), and state-level effective property tax from authoritative public sources. The address auto-fill works for any US address.",
  },
];

function WinnerBadge({ winner, side }: { winner: Verdict; side: "truecap" | "mashvisor" }) {
  if (winner === "tie") return <Minus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />;
  return winner === side ? (
    <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-green)]" />
  ) : (
    <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />
  );
}
