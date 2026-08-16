/**
 * /vs/rentometer — TrueCap vs Rentometer comparison.
 *
 * Target queries: "rentometer alternative", "rentometer vs", "free
 * rentometer", "rent estimator tool". Rentometer is specifically a
 * rent-estimation tool — TrueCap is a full underwriter that also
 * estimates rent. Different scope; reposition accordingly.
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
  title: "Rentometer vs TrueCap (2026): Rent vs Full Deal",
  description:
    "Rentometer estimates rent. TrueCap underwrites the full deal — including the rent. Honest comparison: when each tool fits, and what TrueCap adds.",
  keywords: [
    "rentometer alternative",
    "rentometer vs truecap",
    "truecap vs rentometer",
    "rent estimator tool",
    "rent comparison tool",
    "free rentometer",
    "rental property rent estimator",
  ],
  alternates: { canonical: "/vs/rentometer" },
  openGraph: {
    title: "Rentometer vs TrueCap (2026): Rent vs Full Deal",
    description: "Rentometer estimates rent. TrueCap estimates rent + everything else needed to underwrite a deal.",
    url: "/vs/rentometer",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Rentometer" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "rentometer" | "tie";
type Row = { feature: string; truecap: string; rentometer: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Rent estimate from address",      truecap: "HUD Fair Market Rent + comp-driven estimate",                            rentometer: "Comp-driven rent estimate (their core product)",                  winner: "rentometer" },
  { feature: "Comp data depth",                  truecap: "Pulls from HUD + market comps",                                          rentometer: "Deep comp database — their core moat",                            winner: "rentometer" },
  { feature: "Full deal underwrite",             truecap: "Yes — cap rate, CoC, DSCR, NCF, 10-yr projection in 60 sec",            rentometer: "No — rent estimation only",                                       winner: "truecap" },
  { feature: "Operating expense modeling",       truecap: "Auto-fills property tax + insurance + maintenance + management",         rentometer: "Not in scope",                                                    winner: "truecap" },
  { feature: "Mortgage / financing analysis",    truecap: "Full mortgage modeling with current FRED rates",                         rentometer: "Not in scope",                                                    winner: "truecap" },
  { feature: "Cap rate / CoC / DSCR",            truecap: "All three computed live",                                                rentometer: "Not in scope",                                                    winner: "truecap" },
  { feature: "10-year projection",               truecap: "Pro — rent + expense + appreciation compounding",                        rentometer: "Not in scope",                                                    winner: "truecap" },
  { feature: "Free use limit",                   truecap: "Unlimited",                                                              rentometer: "Limited free; Pro $29-49/mo",                                     winner: "truecap" },
  { feature: "Verdict / decision support",       truecap: "Free — deal score + verdict (Strong / Decent / Marginal / Skip)",         rentometer: "Rent comp only — you make the decision",                          winner: "truecap" },
  { feature: "Branded PDF report",               truecap: "Pro — multi-page lender-facing report",                                   rentometer: "PDF of rent comp data",                                           winner: "tie" },
  { feature: "Use case",                          truecap: "Full investor underwriting workflow",                                    rentometer: "Quick rent comp lookup",                                          winner: "tie" },
  { feature: "Pricing — Pro tier",                truecap: "$25/mo annual",                                                       rentometer: "$29-49/mo depending on plan",                                     winner: "truecap" },
];

export default function VsRentometerPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Rentometer vs TrueCap (2026): Rent vs Full Deal",
    url: `${siteUrl}/vs/rentometer`,
    description: "Side-by-side comparison of TrueCap and Rentometer.",
    dateModified: "2026-06-01",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <VsBreadcrumbSchema vsPath="/vs/rentometer" pageName="TrueCap vs Rentometer" />
      <main id="main" className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-2">
          <Link href="/" className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground">← TrueCap</Link>
        </div>

        <section className="mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary mb-4">
            <Sparkles className="size-3" />
            Honest comparison
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight text-balance">
            TrueCap vs Rentometer: <span className="text-primary">different tools, different jobs</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Rentometer is a rent estimator — it tells you what a property should rent for based on local comps. TrueCap is a full rental underwriter that also estimates rent, plus everything else you need to decide whether to buy. They&apos;re not the same product; here&apos;s when each one wins.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5">
              <Calculator className="size-4" />
              Try TrueCap free
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </ScrollToFormButton>
            <Link href="/pricing" className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted">
              See pricing
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Free analyzer: no card or signup</p>
        </section>

        <section className="mb-12 sm:mb-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">TL;DR</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">Pick TrueCap if</p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You want a FULL deal underwrite — cap rate, CoC, DSCR, NCF, 10-yr projection.</li>
                <li>You want to decide whether to buy, not just what rent to charge.</li>
                <li>You want operating expense + mortgage + tax modeling included.</li>
                <li>You want a verdict (Strong / Decent / Skip) on each property.</li>
                <li>You want unlimited free analyses.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Use Rentometer if</p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You ONLY need a quick rent comp — and already have a deal model elsewhere.</li>
                <li>You&apos;re a property manager checking comp prices for a rent renewal.</li>
                <li>You need deeper comp data beyond HUD&apos;s Fair Market Rent.</li>
                <li>You want a quick second-opinion rent estimate alongside your other tools.</li>
              </ul>
            </div>
          </div>
          <p className="mt-4 text-xs italic text-muted-foreground">
            Honest take: they&apos;re complementary. Many investors use Rentometer for rent comp and TrueCap for the full deal underwrite. That&apos;s fine.
          </p>
        </section>

        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">Feature-by-feature</h2>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Feature</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-primary">TrueCap</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rentometer</th>
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row) => (
                  <tr key={row.feature} className="border-t border-border align-top">
                    <td className="py-3 px-3 text-sm font-semibold text-foreground">{row.feature}</td>
                    <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                      <div className="flex items-start gap-2"><WinnerBadge winner={row.winner} side="truecap" /><span>{row.truecap}</span></div>
                    </td>
                    <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                      <div className="flex items-start gap-2"><WinnerBadge winner={row.winner} side="rentometer" /><span>{row.rentometer}</span></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            A rent number only matters once it flows into returns. Drop your Rentometer comp into the standalone{" "}
            <Link href="/tools/cash-on-cash-calculator" className="font-semibold text-primary hover:underline">cash-on-cash return calculator</Link>
            {" "}or{" "}
            <Link href="/tools/cap-rate-calculator" className="font-semibold text-primary hover:underline">cap rate calculator</Link>
            {" "}to see what that rent actually earns. For the full income statement behind those metrics, our{" "}
            <Link href="/blog/rental-property-pro-forma-explained" className="font-semibold text-primary hover:underline">rental property pro forma guide</Link>
            {" "}lays out every line.
          </p>
        </section>

        <ComparisonFaq competitorName="Rentometer" items={RENTOMETER_FAQ} />

        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">Get the full underwrite, free.</h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            If you&apos;ve been using Rentometer for rent and a spreadsheet for everything else, TrueCap collapses both into one workflow. Try a deal in 60 seconds.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity">
              <Calculator className="w-4 h-4" />Run a deal now
            </Link>
            <Link href="/pricing" className="inline-flex items-center gap-2 border border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground px-4 py-2.5 rounded-xl font-bold hover:bg-primary-foreground/20 transition-colors">
              See Pro pricing<ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground leading-relaxed">
          Other comparisons:{" "}
          <Link href="/vs/dealcheck" className="font-bold text-foreground hover:underline">vs DealCheck</Link>{" · "}
          <Link href="/vs/biggerpockets-calculator" className="font-bold text-foreground hover:underline">vs BiggerPockets</Link>{" · "}
          <Link href="/vs/excel" className="font-bold text-foreground hover:underline">vs Excel</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const RENTOMETER_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap an alternative to Rentometer?",
    answer: (
      <>
        Not exactly — they solve different problems. Rentometer
        specializes in rent estimates pulled from rental-listing comps.
        TrueCap is a full underwriting calculator that uses HUD Fair
        Market Rent as a rent baseline and runs all the downstream
        math (cap rate, CoC, DSCR, cash flow). If you want a tight
        rent estimate from active listings, Rentometer is still
        useful. If you want a complete underwrite from one address,
        TrueCap is enough on its own.
      </>
    ),
    plainTextAnswer:
      "They solve different problems. Rentometer specializes in rent estimates from rental-listing comps. TrueCap is a full underwriting calculator using HUD Fair Market Rent as the rent baseline plus all downstream math (cap rate, CoC, DSCR, cash flow).",
  },
  {
    question: "Does TrueCap give me a rent estimate like Rentometer?",
    answer: (
      <>
        Yes — TrueCap pre-fills rent using HUD&apos;s Fair Market Rent
        (county-level, broken down by bedroom count). It&apos;s an
        authoritative baseline rather than a comp-driven estimate, so
        you get something defensible to show a lender. For tight
        neighborhood-level comps in hot markets, Rentometer is still
        the more granular tool.
      </>
    ),
    plainTextAnswer:
      "Yes — TrueCap pre-fills rent using HUD Fair Market Rent (county-level by bedroom count). It's an authoritative baseline rather than a comp-driven estimate. For tight neighborhood-level comps, Rentometer is still more granular.",
  },
  {
    question: "What's the difference between HUD FMR and Rentometer?",
    answer: (
      <>
        HUD Fair Market Rent is a government-published 40th-percentile
        rent for every county in the US, refreshed annually. It&apos;s
        what Section 8 vouchers use. Rentometer aggregates current
        rental listings and shows you a comp range. HUD is more
        conservative and defensible; Rentometer is more current and
        granular. Many investors use both: HUD for the underwrite,
        Rentometer for the listing-price decision.
      </>
    ),
    plainTextAnswer:
      "HUD Fair Market Rent is a government-published 40th-percentile rent per county, refreshed annually — what Section 8 vouchers use. Rentometer aggregates current rental listings. HUD is more conservative and defensible; Rentometer is more current and granular.",
  },
  {
    question: "Can I use Rentometer's rent in TrueCap?",
    answer: (
      <>
        Yes — every input in TrueCap is editable. If you trust
        Rentometer&apos;s comp for a specific neighborhood, type that
        number into the rent field and the rest of the analysis
        updates instantly. TrueCap pre-fills the HUD figure as a
        starting point, not a hard requirement.
      </>
    ),
    plainTextAnswer:
      "Yes — every input in TrueCap is editable. If you trust Rentometer's comp, type that number into the rent field and the analysis updates instantly. TrueCap pre-fills HUD FMR as a starting point, not a requirement.",
  },
  {
    question: "Do I need both Rentometer and TrueCap?",
    answer: (
      <>
        Most investors don&apos;t. TrueCap&apos;s HUD baseline is
        accurate enough for the underwriting decision in most markets.
        Where Rentometer earns its keep: hot markets where current
        listings significantly exceed FMR (you want the upside in your
        projection) or sub-market neighborhoods where county-level FMR
        is too coarse. Otherwise TrueCap alone covers the full job.
      </>
    ),
    plainTextAnswer:
      "Most don't. TrueCap's HUD baseline is accurate enough in most markets. Rentometer earns its keep in hot markets where listings exceed FMR or sub-markets where county-level FMR is too coarse. Otherwise TrueCap covers the full job.",
  },
];

function WinnerBadge({ winner, side }: { winner: Verdict; side: "truecap" | "rentometer" }) {
  if (winner === "tie") return <Minus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />;
  if (winner === side) return <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-green)]" />;
  return <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />;
}
