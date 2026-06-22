/**
 * /vs/zillow-rent-estimate — TrueCap vs Zillow Zestimate Rent.
 *
 * Target queries: "zillow rent estimate accuracy", "zillow rent vs",
 * "zestimate alternative", "how accurate is zillow rent", "better than
 * zillow rent estimate". Significant search volume from investors who
 * suspect Zillow's rent is off but don't have a better source.
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
  title: "TrueCap vs Zillow Rent Estimate — honest comparison",
  description:
    "Zillow's Rent Zestimate is fast but often 10-25% off market. TrueCap uses HUD Fair Market Rent plus full underwriting. Honest comparison of both.",
  keywords: [
    "zillow rent estimate accuracy",
    "zillow rent vs market",
    "zestimate alternative",
    "how accurate is zillow rent estimate",
    "better than zillow rent estimate",
    "rent estimator vs zillow",
    "hud fair market rent vs zillow",
  ],
  alternates: { canonical: "/vs/zillow-rent-estimate" },
  openGraph: {
    title: "TrueCap vs Zillow Rent Estimate",
    description: "Why HUD Fair Market Rent + full underwriting beats Zillow's algorithm-only Zestimate.",
    url: "/vs/zillow-rent-estimate",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Zillow Rent Estimate" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "zillow" | "tie";
type Row = { feature: string; truecap: string; zillow: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Rent estimate source",            truecap: "HUD Fair Market Rent (federal data) + local comp adjustment",                    zillow: "Proprietary algorithm based on listing prices",                          winner: "truecap" },
  { feature: "Estimate accuracy",                truecap: "Within ~5% of asking rent in most zip codes",                                    zillow: "Often 10-25% off market — biased toward optimistic listing prices",     winner: "truecap" },
  { feature: "Useful for investor underwriting", truecap: "Yes — the rent number IS the underwrite input",                                  zillow: "Use as a sanity check; verify before trusting",                          winner: "truecap" },
  { feature: "Full deal underwrite",             truecap: "Yes — cap rate, CoC, DSCR, NCF, 10-yr projection in 60 sec",                    zillow: "No — Zillow shows rent + price only, no full underwrite",                winner: "truecap" },
  { feature: "Property tax accuracy",            truecap: "Pulls actual county appraisal district data",                                    zillow: "Often outdated; reflects last reassessment, not next bill",              winner: "truecap" },
  { feature: "Cap rate / CoC / DSCR computation",truecap: "Computed live with editable assumptions",                                        zillow: "Not in scope",                                                           winner: "truecap" },
  { feature: "Free to use",                      truecap: "Yes — unlimited free analyses",                                                  zillow: "Yes — free",                                                             winner: "tie" },
  { feature: "Mobile usable",                    truecap: "Mobile-first responsive",                                                        zillow: "Strong mobile app",                                                      winner: "tie" },
  { feature: "Listing data integration",         truecap: "Address auto-fill pulls tax + rent estimates",                                   zillow: "Full listing database — strongest in industry",                          winner: "zillow" },
  { feature: "Photo / virtual tour",             truecap: "Not in scope — TrueCap is analysis, not browsing",                              zillow: "Yes — extensive photos + tours",                                         winner: "zillow" },
  { feature: "Save deals + portfolio rollup",    truecap: "Pro — saved deals, portfolio rollup, comparison",                               zillow: "Save listings but no portfolio analysis",                                winner: "truecap" },
  { feature: "Shareable analysis URL",           truecap: "Pro — clean public URL with full underwrite",                                    zillow: "Share listing URL only",                                                 winner: "truecap" },
  { feature: "Verdict / decision support",       truecap: "Free — deal score + verdict (Strong / Decent / Marginal / Skip)",                zillow: "No analytical verdict",                                                  winner: "truecap" },
];

export default function VsZillowRentPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "TrueCap vs Zillow Rent Estimate — honest comparison",
    url: `${siteUrl}/vs/zillow-rent-estimate`,
    description: "Side-by-side comparison of TrueCap and Zillow's Rent Estimate.",
    dateModified: "2026-06-01",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <VsBreadcrumbSchema vsPath="/vs/zillow-rent-estimate" pageName="TrueCap vs Zillow Rent Estimate" />
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
            TrueCap vs Zillow Rent Estimate: <span className="text-primary">why the &quot;Zestimate Rent&quot; isn&apos;t enough for investors</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Zillow&apos;s Rent Zestimate is free, fast, and famously inaccurate for investor underwriting. The number is often 10-25% off market rent — and even when right, it&apos;s only one input. Real underwriting needs operating expenses, mortgage modeling, cap rate, DSCR, the full picture. Here&apos;s the honest comparison.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(82,72,212,0.28)] transition-transform hover:-translate-y-0.5">
              <Calculator className="size-4" />
              Try TrueCap free
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </ScrollToFormButton>
            <Link href="/pricing" className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted">
              See pricing
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">No card · No signup · Cancel anytime</p>
        </section>

        <section className="mb-12 sm:mb-16 rounded-2xl border border-amber-500/30 bg-amber-50/30 p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">Why Zillow Rent estimates are unreliable</h2>
          <p className="text-base leading-relaxed text-foreground mb-3">
            Zillow&apos;s Rent Zestimate is generated by their proprietary algorithm trained on active listings, not on closed lease prices. Three problems with that:
          </p>
          <ul className="space-y-2 text-sm sm:text-base leading-relaxed text-foreground">
            <li><strong>Listing prices ≠ actual rent paid.</strong> Landlords list aspirationally; tenants negotiate down. Zillow sees the listing, not the lease.</li>
            <li><strong>Algorithm doesn&apos;t see seasonal or local nuance.</strong> A summer rent in a college town isn&apos;t the same as winter in the same property. Zillow averages it.</li>
            <li><strong>No accountability when wrong.</strong> Investors who underwrite at Zillow&apos;s rent and find real rent 15% lower discover the gap after they&apos;ve already bought.</li>
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-foreground">
            <strong>HUD Fair Market Rent</strong> (what TrueCap uses) is federal data based on the 40th percentile of recent rentals in a zip code, updated annually. It&apos;s grounded in what tenants actually pay, not what landlords hope to charge.
          </p>
        </section>

        <section className="mb-12 sm:mb-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">TL;DR</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">Use TrueCap if</p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You&apos;re an investor underwriting a deal — the rent estimate is going into a real money decision.</li>
                <li>You want HUD-grounded rent estimates rather than algorithm-only.</li>
                <li>You need the rent number + everything else (cap rate, DSCR, cash flow, projection).</li>
                <li>You want a verdict on whether to buy, not just &quot;here&apos;s the rent.&quot;</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Use Zillow if</p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You&apos;re just casually browsing for inspiration.</li>
                <li>You&apos;re a tenant trying to gauge what rent in an area looks like.</li>
                <li>You want a quick second-opinion sanity check (with the asterisk that Zillow&apos;s rent is often optimistic).</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">Feature-by-feature</h2>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Feature</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-primary">TrueCap</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Zillow Rent Estimate</th>
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
                      <div className="flex items-start gap-2"><WinnerBadge winner={row.winner} side="zillow" /><span>{row.zillow}</span></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <ComparisonFaq competitorName="Zillow Rent Estimate" items={ZILLOW_FAQ} />

        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">Investor-grade rent estimates, free.</h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            Paste an address. TrueCap pulls HUD Fair Market Rent + county property tax + current mortgage rates, then computes the full underwrite. 60 seconds. No spreadsheet. No Zestimate guesswork.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity">
              <Calculator className="w-4 h-4" />Run a deal now
            </Link>
            <Link href="/pricing" className="inline-flex items-center gap-2 border border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground px-4 py-2.5 rounded-xl font-bold hover:bg-primary-foreground/20 transition-colors">
              See pricing<ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground leading-relaxed">
          Other comparisons:{" "}
          <Link href="/vs/rentometer" className="font-bold text-foreground hover:underline">vs Rentometer</Link>{" · "}
          <Link href="/vs/dealcheck" className="font-bold text-foreground hover:underline">vs DealCheck</Link>{" · "}
          <Link href="/vs/biggerpockets-calculator" className="font-bold text-foreground hover:underline">vs BiggerPockets</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const ZILLOW_FAQ: FaqItem[] = [
  {
    question: "Is the Zillow Rent Estimate accurate for investors?",
    answer: (
      <>
        Zillow&apos;s Rent Zestimate is calibrated for consumer
        listings — what a typical landlord would post for a typical
        property in a typical market. For an investor making a buying
        decision, it can swing 10–20% high or low because the model
        favors comparable rentals on Zillow&apos;s feed (which skews
        toward newer / managed listings). For underwriting, use a
        more conservative baseline like HUD Fair Market Rent, then
        sensitize ±10% to see if the deal still works.
      </>
    ),
    plainTextAnswer:
      "Zillow's Rent Zestimate is calibrated for consumer listings and can swing 10–20% high or low for investors because it favors newer/managed listings on Zillow's feed. For underwriting, use a conservative baseline like HUD Fair Market Rent and sensitize ±10%.",
  },
  {
    question: "What rent data does TrueCap use instead of Zillow?",
    answer: (
      <>
        TrueCap uses HUD Fair Market Rent — government-published,
        40th-percentile rent for every county in the US, broken down
        by bedroom count, refreshed annually. It&apos;s what Section 8
        vouchers use, so it&apos;s a conservative baseline that holds
        up under lender scrutiny. You can override the value if you
        have better local data.
      </>
    ),
    plainTextAnswer:
      "TrueCap uses HUD Fair Market Rent — government-published, 40th-percentile rent per US county by bedroom count, refreshed annually. It's what Section 8 vouchers use and holds up under lender scrutiny. You can override if you have better local data.",
  },
  {
    question: "Can I check rent on a specific Zillow listing in TrueCap?",
    answer: (
      <>
        Yes — paste the property address into TrueCap and you get the
        HUD baseline rent for that county + bedroom count instantly.
        The rent field is editable, so if you see a Zillow Zestimate
        you trust more for that specific listing, type it in and the
        full underwrite updates in real time.
      </>
    ),
    plainTextAnswer:
      "Yes — paste the address into TrueCap and you get the HUD baseline rent for that county + bedroom count. The rent field is editable, so override with the Zillow Zestimate if you trust it more for that specific listing.",
  },
  {
    question: "Does TrueCap give a more accurate rent estimate than Zillow?",
    answer: (
      <>
        &quot;Accurate&quot; depends on use case. For an investor
        underwrite, TrueCap&apos;s HUD-based baseline is more
        defensible because it&apos;s conservative — a deal that pencils
        at HUD will almost certainly pencil at real-world Zillow. For
        a landlord trying to set the actual listing price, Zillow may
        be more current. TrueCap is built for the former, Zillow for
        the latter.
      </>
    ),
    plainTextAnswer:
      "Depends. For investor underwriting, TrueCap's HUD-based baseline is more defensible — conservative — a deal that pencils at HUD will pencil at real Zillow rents. For setting an actual listing price, Zillow may be more current.",
  },
  {
    question: "How does TrueCap turn a rent estimate into a deal verdict?",
    answer: (
      <>
        TrueCap takes rent, expenses, financing, and tax assumptions
        and runs cap rate, cash-on-cash, DSCR, and monthly cash flow,
        then classifies the deal as Strong / Solid / Mixed / Marginal
        / Negative based on transparent thresholds. Pro adds a Deal
        Score (0–100) with subscore breakdown. Zillow stops at the
        rent number — you have to do everything downstream by hand.
      </>
    ),
    plainTextAnswer:
      "TrueCap takes rent + expenses + financing + tax assumptions and runs cap rate, CoC, DSCR, and monthly cash flow, then classifies the deal Strong/Solid/Mixed/Marginal/Negative, plus a free 0–100 Deal Score. Zillow stops at the rent number.",
  },
];

function WinnerBadge({ winner, side }: { winner: Verdict; side: "truecap" | "zillow" }) {
  if (winner === "tie") return <Minus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />;
  if (winner === side) return <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-green)]" />;
  return <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />;
}
