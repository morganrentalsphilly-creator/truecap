/**
 * /vs/mashvisor-for-short-term-rentals — niche use-case comparison page (Short-term rentals cut).
 *
 * Target queries: "mashvisor short term rental", "mashvisor airbnb", "best str market tool", "airbnb investment calculator", "mashvisor alternative for str". Long-tail audience-slicing comparison.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Calculator, Check, Minus, Sparkles, X } from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { ScrollToFormButton } from "@/components/marketing/scroll-to-form-button";
import { ComparisonFaq, type FaqItem } from "@/components/marketing/comparison-faq";
import { getSiteUrl } from "@/lib/site-url";
import { VsBreadcrumbSchema } from "@/components/marketing/vs-breadcrumb-schema";

export const metadata: Metadata = {
  title: "Mashvisor vs TrueCap for STR Deals (2026)",
  description:
    "Mashvisor scores STR markets with Airbnb data. TrueCap underwrites the specific deal. Honest comparison for STR investors plus how they fit together.",
  keywords: [
    "mashvisor short term rental",
    "mashvisor airbnb",
    "best str market tool",
    "airbnb investment calculator",
    "mashvisor alternative for str",
  ],
  alternates: { canonical: "/vs/mashvisor-for-short-term-rentals" },
  openGraph: {
    title: "Mashvisor vs TrueCap for STR Deals (2026)",
    description:
      "STR-specific TrueCap vs Mashvisor: market scoring vs per-deal underwriting. Most STR investors use both.",
    url: "/vs/mashvisor-for-short-term-rentals",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Mashvisor for Short-Term Rentals — honest comparison" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "mashvisor" | "tie";
type Row = { feature: string; truecap: string; mashvisor: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Market discovery (heatmaps, scores)", truecap: "No", mashvisor: "Yes — STR + LTR by neighborhood", winner: "mashvisor" },
  { feature: "STR revenue projection (ADR + occupancy)", truecap: "Manual — plug monthly revenue into rent field", mashvisor: "Yes — automated from Airbnb data", winner: "mashvisor" },
  { feature: "Cap rate / CoC / DSCR analysis", truecap: "Yes — full engine, free tier", mashvisor: "Listing-level cap rate based on assumed inputs", winner: "truecap" },
  { feature: "Mortgage + financing math (PITI + amortization)", truecap: "Yes — full", mashvisor: "Limited", winner: "truecap" },
  { feature: "10-year projection", truecap: "Pro — rent + expense + appreciation", mashvisor: "Forward STR revenue forecast", winner: "tie" },
  { feature: "Secondary Screening Index", truecap: "Free — 0-100 triage score + factor breakdown", mashvisor: "Investibility score per property", winner: "tie" },
  { feature: "Address auto-fill (rent/rate/tax)", truecap: "Yes — HUD + FRED + state property tax", mashvisor: "STR-focused; LTR rent estimates included", winner: "tie" },
  { feature: "Free tier", truecap: "Yes — core cap rate, CoC, DSCR, and cash flow", mashvisor: "Limited free dashboard; full data paid", winner: "truecap" },
  { feature: "Pricing (paid tier)", truecap: "Paid Pro; see live pricing for current rates", mashvisor: "$70-300/mo depending on plan (as of 2026)", winner: "truecap" },
];

const NICHE_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Mashvisor alternative for STRs?",
    answer: (
      <>
        Not really — they solve different problems. Mashvisor is STR market discovery + revenue projection. TrueCap is the underwriting calculator that runs the deal math on top. Mashvisor feeds inputs; TrueCap runs cap rate / DSCR / cash flow. STR investors typically use both.
      </>
    ),
    plainTextAnswer:
      "Not really — different problems. Mashvisor is STR market discovery + revenue projection. TrueCap is the underwriting calculator. Mashvisor feeds inputs; TrueCap runs cap rate / DSCR / cash flow. STR investors use both.",
  },
  {
    question: "Mashvisor vs AirDNA — which one for STR data?",
    answer: (
      <>
        AirDNA is more STR-specific and considered the gold standard for ADR, occupancy, and RevPAR data. Mashvisor covers both LTR and STR plus broader market analysis (heatmaps, comparable sales). For STR-primary investors, AirDNA wins on data depth. For investors evaluating LTR vs STR on the same property, Mashvisor&apos;s broader scope wins.
      </>
    ),
    plainTextAnswer:
      "AirDNA is gold-standard for STR-specific data (ADR, occupancy, RevPAR). Mashvisor covers LTR + STR + broader market. STR-primary: AirDNA. LTR/STR toggle: Mashvisor.",
  },
  {
    question: "Does Mashvisor do underwriting?",
    answer: (
      <>
        Sort of — Mashvisor shows listing-level cap rate estimates based on its assumed inputs (rent, vacancy, expenses). TrueCap adds editable financing, DSCR, sensitivity, and a cash-flow and equity projection for a shortlisted property. It does not currently expose a tax-specific module.
      </>
    ),
    plainTextAnswer:
      "Mashvisor shows listing-level cap rate from assumed inputs. TrueCap adds editable financing, DSCR, sensitivity, and a cash-flow and equity projection, but no tax-specific module.",
  },
  {
    question: "Can I use TrueCap free with Mashvisor data?",
    answer: (
      <>
        Yes. TrueCap free covers cap rate, CoC, DSCR, and cash flow on every analysis. Pull Mashvisor&apos;s projected monthly STR revenue, replace TrueCap&apos;s area benchmark with it, and review every operating assumption. Pro adds a 10-year cash-flow and equity projection plus sensitivity.
      </>
    ),
    plainTextAnswer:
      "Yes. TrueCap free covers cap rate, CoC, DSCR, and cash flow. Replace the area benchmark with reviewed STR revenue and operating assumptions. Pro adds a 10-year cash-flow and equity projection plus sensitivity.",
  },
  {
    question: "Is Mashvisor&apos;s $70-300/mo worth it?",
    answer: (
      <>
        If you&apos;re actively scouting STR markets across multiple regions, yes — the data + heatmaps save dozens of hours per month. If you&apos;re a hometown STR investor with 1-2 properties in your local market, Mashvisor is overkill. TrueCap + AirDNA Rentalizer reports ($20-40 per property) are cheaper and more deal-specific.
      </>
    ),
    plainTextAnswer:
      "If actively scouting STR markets across regions: yes — data + heatmaps save dozens of hours/mo. Hometown investor with 1-2 properties: overkill. TrueCap + AirDNA Rentalizer ($20-40 per property) is cheaper + more deal-specific.",
  },
];

export default function VsMashvisorForShortTermRentalsPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Mashvisor vs TrueCap for STR Deals (2026)",
    url: `${siteUrl}/vs/mashvisor-for-short-term-rentals`,
    description: "Mashvisor scores STR markets with Airbnb data. TrueCap underwrites the specific deal. Honest comparison for STR investors plus how they fit together.",
    dateModified: "2026-06-07",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/mashvisor-for-short-term-rentals" pageName="TrueCap vs Mashvisor for Short-Term Rentals" />
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
            Short-term rentals-specific comparison
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight text-balance">
            TrueCap vs Mashvisor for Short-term rentals:{" "}
            <span className="text-primary">market scoring vs per-deal STR underwriting</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Both serve STR investors. Mashvisor is the market-discovery + revenue-projection tool (Airbnb occupancy rates, ADR by neighborhood). TrueCap turns user-reviewed revenue assumptions into a full modeled analysis (cap rate, DSCR, cash flow, projection). The user verifies the inputs and makes the investment decision.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5">
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
        </section>

        <section className="mb-12 sm:mb-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">
            TL;DR for Short-term rentals investors
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">
                Use TrueCap when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You want a full underwriting analysis with cap rate, DSCR, cash flow on a specific STR.</li>
                <li>You want financing math (PITI, amortization) and an illustrative tax-impact model.</li>
                <li>You&apos;re comparing LTR vs STR scenarios on the same property.</li>
                <li>You want a free tier that doesn&apos;t cap analyses.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use Mashvisor when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You want STR market discovery (heatmaps, neighborhood Airbnb scores).</li>
                <li>You want automated STR revenue projections from real Airbnb data.</li>
                <li>You&apos;re scouting which city or neighborhood to invest in next.</li>
                <li>You&apos;re scaling STR investments across multiple markets.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            Short-term rentals feature-by-feature
          </h2>
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">
            Where each tool wins on the Short-term rentals workflow specifically.
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
                        ) : row.winner === "mashvisor" ? (
                          <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-green)]" />
                        ) : (
                          <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />
                        )}
                        <span>{row.mashvisor}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            Once Mashvisor hands you an ADR and occupancy figure, the underwrite is on you. Our{" "}
            <Link href="/blog/short-term-rental-underwriting-playbook" className="font-semibold text-primary hover:underline">short-term rental underwriting playbook</Link>
            {" "}walks through turning revenue projections into a complete modeled underwrite, and the{" "}
            <Link href="/blog/best-short-term-rental-analysis-tool-2026" className="font-semibold text-primary hover:underline">best STR analysis tools of 2026</Link>
            {" "}rounds up where the data comes from. To put those projections through the deal math yourself, our{" "}
            <Link href="/#main" className="font-semibold text-primary hover:underline">free deal analyzer</Link>
            {" "}turns an ADR and occupancy estimate into cap rate and cash flow in one pass.
          </p>
        </section>

        <ComparisonFaq competitorName="Mashvisor (Short-term rentals)" items={NICHE_FAQ} />

        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Underwrite your next Short-term rentals deal — free.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            Free covers the standard cap rate, CoC, DSCR, cash flow, and plain
            read-only share links. Pro adds 10-year cash-flow and equity projections,
            sensitivity, Offer Ceiling, co-branding, and included
            PDFs. New one-time PDF checkout is temporarily unavailable.
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
          <Link href="/vs/mashvisor" className="font-bold text-foreground hover:underline">TrueCap vs Mashvisor</Link>
          {" · "}
          <Link href="/vs/airdna" className="font-bold text-foreground hover:underline">TrueCap vs AirDNA</Link>
          {" · "}
          <Link href="/vs/hostaway" className="font-bold text-foreground hover:underline">TrueCap vs Hostaway</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
