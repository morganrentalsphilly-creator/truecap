/**
 * /vs/airdna — competitor comparison landing page.
 *
 * Target queries: "airdna alternative", "airdna vs mashvisor", "airdna pricing", "airdna review", "str data tool".
 * AirDNA is short-term rental market intelligence — Airbnb/Vrbo occupancy rates, ADR, RevPAR by market and property. The gold standard for STR investors evaluating markets and properties.
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
  title: "TrueCap vs AirDNA — honest comparison",
  description:
    "AirDNA estimates STR revenue. TrueCap underwrites the full deal. Honest comparison for short-term rental investors plus how they fit together.",
  keywords: [
    "airdna alternative",
    "airdna vs mashvisor",
    "airdna pricing",
    "airdna review",
    "str data tool",
  ],
  alternates: { canonical: "/vs/airdna" },
  openGraph: {
    title: "TrueCap vs AirDNA — honest comparison",
    description:
      "AirDNA estimates STR revenue. TrueCap underwrites the full deal. Often used together by STR investors.",
    url: "/vs/airdna",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs AirDNA" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "airdna" | "tie";
type Row = { feature: string; truecap: string; airdna: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Primary purpose", truecap: "Per-deal underwriting calculator", airdna: "STR market + property revenue data", winner: "tie" },
  { feature: "Cap rate / CoC / DSCR analysis", truecap: "Yes — full engine, free tier", airdna: "Not modeled", winner: "truecap" },
  { feature: "10-year projection", truecap: "Pro — rent + expense + appreciation", airdna: "Forward STR revenue forecast", winner: "tie" },
  { feature: "Tax strategy modeling", truecap: "Pro — depreciation + interest + after-tax CF", airdna: "Not modeled", winner: "truecap" },
  { feature: "Deal score + verdict", truecap: "Free — 0-100 score + plain-English verdict", airdna: "Property-level investibility score", winner: "tie" },
  { feature: "STR revenue projection (ADR + occupancy)", truecap: "Editable input only", airdna: "Yes — best-in-class market data", winner: "airdna" },
  { feature: "Comparable STR listings nearby", truecap: "No", airdna: "Yes — Airbnb + Vrbo comp set", winner: "airdna" },
  { feature: "Long-term rent baseline", truecap: "HUD Fair Market Rent", airdna: "Not the focus", winner: "truecap" },
  { feature: "Mortgage + financing math", truecap: "Yes — PITI + DSCR + amortization", airdna: "Not included", winner: "truecap" },
  { feature: "Address auto-fill (rent/rate/tax)", truecap: "Yes — HUD + FRED + state property tax", airdna: "STR-specific data only", winner: "truecap" },
  { feature: "Free tier", truecap: "Yes — full underwriting math", airdna: "Free MarketMinder dashboard with limited data", winner: "tie" },
  { feature: "Pricing (paid tier)", truecap: "Pro $29.99/mo", airdna: "Rentalizer ~$20-40 per property; Markets subscription $50-200+/mo (as of 2026)", winner: "truecap" },
  { feature: "Shareable read-only analysis", truecap: "Pro — public URL + branding", airdna: "PDF reports on paid tier", winner: "tie" },
];

export default function VsAirdnaPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "TrueCap vs AirDNA — honest comparison",
    url: `${siteUrl}/vs/airdna`,
    description:
      "AirDNA estimates STR revenue. TrueCap underwrites the full deal. Honest comparison for short-term rental investors plus how they fit together.",
    dateModified: "2026-06-07",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/airdna" pageName="TrueCap vs AirDNA" />
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
            TrueCap vs AirDNA:{" "}
            <span className="text-primary">STR revenue data vs full underwriting</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            AirDNA is the gold standard for short-term rental market data — Airbnb / Vrbo occupancy rates, ADR, RevPAR by market and individual property. TrueCap is the underwriting calculator that turns AirDNA&apos;s revenue projections into a full deal analysis (cap rate, DSCR, cash flow, projection). AirDNA feeds the inputs; TrueCap runs the math.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0, 112, 196,0.28)] transition-transform hover:-translate-y-0.5"
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
                <li>You want a full underwriting analysis with cap rate, DSCR, cash flow.</li>
                <li>You want financing math (PITI, amortization).</li>
                <li>You want to compare LTR and STR scenarios on the same property.</li>
                <li>You want a free tier that doesn&apos;t cap analyses.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use AirDNA when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You want best-in-class STR revenue projections (ADR, occupancy, RevPAR).</li>
                <li>You&apos;re evaluating multiple STR markets and need comparable data.</li>
                <li>You want a property-level Rentalizer report from real Airbnb data.</li>
                <li>You&apos;re scaling STR investments and need market intelligence.</li>
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
            Side-by-side on every dimension that matters for a comparison-shopping investor.
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
                    AirDNA
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
                        <WinnerBadge winner={row.winner} side="airdna" />
                        <span>{row.airdna}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            AirDNA details based on publicly available product info as of 2026.
            See{" "}
            <a href="https://airdna.co" target="_blank" rel="noopener" className="underline">
              airdna.co
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* Complementary workflow */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            How STR investors use both
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
            <li>
              <strong>Pick a target STR market in AirDNA.</strong> MarketMinder — occupancy rates, ADR, seasonality, regulations.
            </li>
            <li>
              <strong>Run a Rentalizer report on the specific property.</strong> AirDNA&apos;s address-level revenue projection ($20-40 per report).
            </li>
            <li>
              <strong>Plug AirDNA&apos;s projected monthly revenue into TrueCap.</strong> Override the HUD long-term rent field with AirDNA&apos;s STR estimate (e.g. annual revenue ÷ 12, discounted for vacancy + cleaning).
            </li>
            <li>
              <strong>Run the full underwrite in TrueCap.</strong> Cap rate, DSCR, cash flow, 10-year projection, tax strategy.
            </li>
            <li>
              <strong>Save the deal + revisit later.</strong> Re-run with updated AirDNA data when market conditions shift.
            </li>
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            Want to see just the underwriting half? Try the{" "}
            <Link href="/tools/cap-rate-calculator" className="font-semibold text-primary hover:underline">
              cap rate calculator
            </Link>{" "}
            or the full{" "}
            <Link href="/" className="font-semibold text-primary hover:underline">
              TrueCap analyzer
            </Link>
            . Our guide on{" "}
            <Link href="/blog/how-to-underwrite-a-rental-property-in-60-seconds" className="font-semibold text-primary hover:underline">
              60-second underwriting
            </Link>{" "}
            walks through the workflow end-to-end.
          </p>
        </section>

        <ComparisonFaq competitorName="AirDNA" items={AIRDNA_FAQ} />

        {/* Pricing CTA */}
        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Underwrite the next deal — free.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            TrueCap free covers cap rate, CoC, DSCR, NCF, and monthly cash flow.
            Pro unlocks projections, sensitivity, tax strategy, exit scenarios,
            MAO, PDF exports, and shareable read-only deal links.
            No card to start.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              Start a 3-day free trial
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
          <Link href="/vs/mashvisor" className="font-bold text-foreground hover:underline">TrueCap vs Mashvisor</Link>
          {" · "}
          <Link href="/vs/hostfully" className="font-bold text-foreground hover:underline">TrueCap vs Hostfully</Link>
          {" · "}
          <Link href="/vs/hostaway" className="font-bold text-foreground hover:underline">TrueCap vs Hostaway</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const AIRDNA_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap an AirDNA alternative?",
    answer: (
      <>
        No — they solve different problems. AirDNA is STR market + revenue data; TrueCap is the underwriting calculator. AirDNA feeds revenue inputs; TrueCap runs the cap rate / DSCR / cash flow math on top. STR investors typically use both.
      </>
    ),
    plainTextAnswer:
      "No — AirDNA is STR market + revenue data. TrueCap is the underwriting calculator. AirDNA feeds revenue inputs; TrueCap runs cap rate / DSCR / cash flow on top. STR investors use both.",
  },
  {
    question: "AirDNA vs Mashvisor — which one for STR data?",
    answer: (
      <>
        AirDNA is more focused and considered the gold standard for STR-specific data (ADR, occupancy, RevPAR). Mashvisor covers STR too but also includes LTR data and broader market analysis. If STR is your primary strategy, AirDNA wins. If you toggle between LTR and STR, Mashvisor&apos;s broader scope wins.
      </>
    ),
    plainTextAnswer:
      "AirDNA is gold-standard for STR-specific data (ADR, occupancy, RevPAR). Mashvisor covers STR + LTR + broader market. STR-primary: AirDNA. LTR/STR toggle: Mashvisor.",
  },
  {
    question: "Does AirDNA do cap rate or DSCR calculations?",
    answer: (
      <>
        No — AirDNA gives you projected STR revenue. You&apos;d plug that revenue into a separate calculator (TrueCap, DealCheck, or your spreadsheet) to compute cap rate, DSCR, and cash flow.
      </>
    ),
    plainTextAnswer:
      "No — AirDNA gives projected STR revenue. Plug that into TrueCap, DealCheck, or your spreadsheet to compute cap rate, DSCR, cash flow.",
  },
  {
    question: "How accurate are AirDNA&apos;s revenue projections?",
    answer: (
      <>
        They&apos;re the industry standard but not perfect. AirDNA&apos;s Rentalizer reports are derived from actual Airbnb + Vrbo data, so they&apos;re tighter than guesses but still depend on the property being a good comp match in the local market. Always run sensitivity (TrueCap Pro&apos;s sensitivity grid lets you stress-test) — what happens if AirDNA&apos;s projection is 20% high?
      </>
    ),
    plainTextAnswer:
      "Industry standard but not perfect. Derived from real Airbnb + Vrbo data, but depends on comp match. Always run sensitivity (TrueCap Pro&apos;s grid stress-tests AirDNA&apos;s projection at -20% etc.).",
  },
  {
    question: "Can I use TrueCap free with AirDNA?",
    answer: (
      <>
        Yes — TrueCap&apos;s free tier covers the full underwriting math (cap rate, CoC, DSCR, cash flow). Pull AirDNA&apos;s monthly revenue projection, override TrueCap&apos;s HUD rent field with it, run the analysis. You don&apos;t need TrueCap Pro for the basic combined workflow.
      </>
    ),
    plainTextAnswer:
      "Yes. TrueCap free covers cap rate, CoC, DSCR, cash flow. Pull AirDNA&apos;s monthly revenue, override TrueCap&apos;s HUD rent field, run the analysis. Pro not required for the basic workflow.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "airdna";
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
