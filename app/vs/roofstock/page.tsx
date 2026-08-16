/**
 * /vs/roofstock — competitor comparison landing page.
 *
 * Target queries: "Roofstock alternative", "Roofstock vs ...",
 * "Roofstock fees", "Roofstock analyzer", "is Roofstock worth it".
 * Roofstock is a marketplace for single-family turnkey rentals — they
 * brokerage the deal. TrueCap is the underwriting layer you'd use to
 * decide whether a Roofstock listing actually pencils.
 *
 * Positioning angle: don't fight Roofstock — frame TrueCap as the
 * independent due-diligence tool you bring to any deal, including
 * Roofstock listings. The pro-formas on Roofstock listings are
 * marketing collateral; TrueCap is the second opinion.
 */

import { TRIAL_LABEL } from "@/lib/trial";
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
  title: "Roofstock vs TrueCap (2026): Verify the Numbers",
  description:
    "TrueCap is the independent underwrite for any Roofstock listing — cap rate, cash flow, DSCR, projection from one address. When to use each tool.",
  keywords: [
    "roofstock alternative",
    "roofstock vs truecap",
    "roofstock analyzer",
    "roofstock fees",
    "is roofstock worth it",
    "turnkey rental analyzer",
  ],
  alternates: { canonical: "/vs/roofstock" },
  openGraph: {
    title: "Roofstock vs TrueCap (2026): Verify the Numbers",
    description:
      "Roofstock sells the property. TrueCap underwrites it. The independent second opinion on any turnkey listing.",
    url: "/vs/roofstock",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Roofstock" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "roofstock" | "tie";
type Row = { feature: string; truecap: string; roofstock: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Primary purpose",                   truecap: "Per-deal underwriting calculator",                                       roofstock: "Marketplace + brokerage for turnkey SFR",                          winner: "tie" },
  { feature: "Cost to use",                       truecap: "Free to underwrite; Pro $29.99/mo for projections + co-branded share + PDF",          roofstock: "Free to browse; 0.5% buyer fee at close (typically $1k–$3k)",      winner: "truecap" },
  { feature: "Independent underwriting",           truecap: "Yes — our engine, your assumptions",                                     roofstock: "Listing pro-formas authored by the seller / Roofstock",            winner: "truecap" },
  { feature: "Cap rate / CoC / DSCR",              truecap: "All standard, plus benchmarks per metric",                                roofstock: "Cap rate + cash flow on listing card",                              winner: "truecap" },
  { feature: "Editable assumptions",               truecap: "Every input — vacancy, mgmt %, capex, taxes, etc.",                      roofstock: "Limited override of listing pro-forma",                             winner: "truecap" },
  { feature: "10-year projection",                  truecap: "Pro — rent growth, expense growth, appreciation, equity compounding",   roofstock: "Static pro-forma year-one only",                                    winner: "truecap" },
  { feature: "Illustrative tax impact",             truecap: "Pro — depreciation, interest deduction, modeled after-tax CF",           roofstock: "Not modeled",                                                       winner: "truecap" },
  { feature: "Exit scenarios",                      truecap: "Pro — sell-at-year-N with equity + IRR",                                  roofstock: "Not modeled",                                                       winner: "truecap" },
  { feature: "Sensitivity grid (stress test)",      truecap: "Pro — rent ±10%, vacancy ±5pp, rate ±1pp",                                roofstock: "Not modeled",                                                       winner: "truecap" },
  { feature: "Deal score with breakdown",           truecap: "Free — 0-100 with subscore drill-down",                                    roofstock: "Curated 'Neighborhood Rating' (qualitative)",                       winner: "truecap" },
  { feature: "Open data sources cited",             truecap: "HUD FMR + FRED rate + state tax — auditable",                              roofstock: "Internal estimates",                                                winner: "truecap" },
  { feature: "Actually buys you a property",        truecap: "No — you bring your own deal",                                            roofstock: "Yes — full marketplace + escrow + brokerage",                       winner: "roofstock" },
  { feature: "Listing inventory",                   truecap: "None — analyze anything by address",                                      roofstock: "Curated SFR inventory, primarily turnkey",                          winner: "roofstock" },
  { feature: "Property management connection",      truecap: "Not included",                                                            roofstock: "Pre-vetted PM partners for most markets",                           winner: "roofstock" },
  { feature: "Works on any property",                truecap: "Yes — any US address, any condition, any strategy",                       roofstock: "Only Roofstock-listed properties",                                  winner: "truecap" },
  { feature: "Shareable read-only deal link",       truecap: "Free — read-only public link; Pro adds co-branding",                                    roofstock: "Listing URL (their pro-forma, not yours)",                          winner: "truecap" },
  { feature: "PDF report export",                    truecap: "Pro — lender-facing multi-page report",                                    roofstock: "PDF of listing pro-forma",                                          winner: "truecap" },
  { feature: "Mobile-first UX",                      truecap: "PWA — install to home screen",                                            roofstock: "Mobile-friendly web app",                                           winner: "tie" },
];

export default function VsRoofstockPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Roofstock vs TrueCap (2026): Verify the Numbers",
    url: `${siteUrl}/vs/roofstock`,
    description:
      "Side-by-side comparison of TrueCap (underwriting calculator) and Roofstock (turnkey rental marketplace).",
    dateModified: "2026-06-07",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/roofstock" pageName="TrueCap vs Roofstock" />
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
            TrueCap vs Roofstock:{" "}
            <span className="text-primary">marketplace vs independent underwrite</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Roofstock is a marketplace — they list, broker, and pre-curate
            turnkey single-family rentals. TrueCap is a calculator — we
            don&apos;t sell you a property, we help you decide if the one
            you&apos;re looking at actually pencils. The two tools complement
            each other, but if you&apos;re asking <em>&quot;is this Roofstock
            deal real?&quot;</em>, you want TrueCap as the second opinion.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5"
            >
              <Calculator className="size-4" />
              Underwrite a Roofstock listing
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
            No card · No signup needed · Cancel anytime
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
                <li>You want an independent underwrite of a Roofstock listing.</li>
                <li>You want to compare a Roofstock deal to a non-Roofstock deal head-to-head.</li>
                <li>The listing pro-forma assumes optimistic vacancy / mgmt / capex and you want to sensitize.</li>
                <li>You want a 10-year projection with exit scenarios, not a year-one snapshot.</li>
                <li>You want a deal score with a transparent breakdown.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use Roofstock when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You want a curated inventory of turnkey SFRs in markets you don&apos;t live in.</li>
                <li>You need a brokerage + escrow + PM partner in one place.</li>
                <li>You&apos;re scaling beyond your home market and don&apos;t want to source individually.</li>
                <li>You value the &quot;Roofstock-certified&quot; inspection + lease validation.</li>
              </ul>
            </div>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-foreground">
            The honest take: most serious Roofstock buyers use TrueCap (or
            something like it) to pressure-test the listing pro-forma before
            committing. The marketplace pro-forma is marketing collateral —
            optimistic on rent, conservative on capex, missing a real
            sensitivity. That&apos;s the gap we fill.
          </p>
        </section>

        {/* Matrix */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            Feature-by-feature
          </h2>
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">
            Roofstock is built for the buy-the-deal stage. TrueCap is built
            for the decide-if-it&apos;s-a-deal stage.
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
                    Roofstock
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
                        <WinnerBadge winner={row.winner} side="roofstock" />
                        <span>{row.roofstock}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Roofstock details based on publicly available product info as of
            2026. See{" "}
            <a href="https://www.roofstock.com" target="_blank" rel="noopener" className="underline">
              roofstock.com
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* The pressure-test angle */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            How to pressure-test a Roofstock listing in TrueCap
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
            <li>
              <strong>Copy the listing address into the TrueCap analyzer.</strong>{" "}
              HUD FMR pre-fills the rent, FRED pre-fills the current 30-year
              rate, state property tax pre-fills the tax line. That&apos;s
              your honest baseline before the listing&apos;s own assumptions
              touch it.
            </li>
            <li>
              <strong>Replace the rent with the listing&apos;s pro-forma rent.</strong>{" "}
              Compare to HUD FMR for that county + bedroom count. If
              listing rent is more than ~10% above FMR, that&apos;s your
              first warning sign.
            </li>
            <li>
              <strong>Set vacancy to 8% (not 5%) and management to 10%.</strong>{" "}
              Turnkey listings often understate both. Real-world long-term
              vacancy for out-of-state SFR runs closer to 8% once you factor
              in turnover.
            </li>
            <li>
              <strong>Run the sensitivity grid (Pro).</strong> If the deal
              breaks at rent −5% or rate +0.5pp, that&apos;s not a
              cash-flowing rental, that&apos;s a speculation on rate cuts.
            </li>
            <li>
              <strong>Check the deal score.</strong> Below 60 is a
              decline. 60-75 is &quot;maybe if you love the location.&quot;
              Above 75 is a real deal.
            </li>
          </ol>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            Want to do this in a single calculator? Try the{" "}
            <Link href="/tools/cap-rate-calculator" className="font-semibold text-primary hover:underline">
              cap rate calculator
            </Link>{" "}
            or{" "}
            <Link href="/tools/cash-on-cash-calculator" className="font-semibold text-primary hover:underline">
              cash-on-cash calculator
            </Link>
            . For the full workflow, our guide on{" "}
            <Link href="/blog/how-to-underwrite-a-rental-property-in-60-seconds" className="font-semibold text-primary hover:underline">
              60-second underwriting
            </Link>{" "}
            walks through exactly the steps above.
          </p>
        </section>

        <ComparisonFaq competitorName="Roofstock" items={ROOFSTOCK_FAQ} />

        {/* Pricing CTA */}
        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Pressure-test your next Roofstock deal — free.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            Free covers the underwrite. Pro unlocks 10-year projections,
            sensitivity, illustrative tax impact, modeled exit comparisons, PDF
            exports, and co-branded share links. No card to start.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              Start a {TRIAL_LABEL}
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
          <Link href="/vs/dealcheck" className="font-bold text-foreground hover:underline">
            TrueCap vs DealCheck
          </Link>{" "}
          ·{" "}
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

const ROOFSTOCK_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Roofstock alternative?",
    answer: (
      <>
        Not directly — they solve different problems. Roofstock is a
        marketplace that lists and brokers turnkey single-family rentals.
        TrueCap is a calculator that underwrites any property you point
        it at. Most experienced Roofstock buyers use TrueCap as the
        independent second opinion on listing pro-formas before
        committing.
      </>
    ),
    plainTextAnswer:
      "Not directly — they solve different problems. Roofstock is a marketplace that lists and brokers turnkey SFR. TrueCap is a calculator that underwrites any property. Experienced Roofstock buyers use TrueCap as the independent second opinion on listing pro-formas.",
  },
  {
    question: "Are Roofstock listings actually good deals?",
    answer: (
      <>
        Sometimes — but the pro-formas on listing cards are marketing
        material. They tend to assume optimistic rent, conservative
        vacancy (often 5% on out-of-state turnkey), light capex reserves,
        and don&apos;t sensitize for rate changes. Run any listing
        through TrueCap with realistic assumptions (8% vacancy, 10%
        management, 8% capex reserves) and you&apos;ll filter the real
        deals from the marketing.
      </>
    ),
    plainTextAnswer:
      "Sometimes — listing pro-formas are marketing material. They assume optimistic rent, often 5% vacancy on out-of-state turnkey, light capex reserves, and don't sensitize for rate changes. Run through TrueCap with realistic assumptions (8% vacancy, 10% mgmt, 8% capex) to filter real deals from marketing.",
  },
  {
    question: "What is Roofstock's fee compared to using TrueCap?",
    answer: (
      <>
        Roofstock charges a 0.5% buyer marketplace fee at close — on a
        $200k property that&apos;s ~$1,000. TrueCap is free to
        underwrite and $29.99/month for Pro features. They&apos;re not
        substitutes — Roofstock&apos;s fee buys you a brokered
        transaction, TrueCap&apos;s subscription gives you the
        analytical tooling to decide which transactions are worth doing.
      </>
    ),
    plainTextAnswer:
      "Roofstock charges 0.5% buyer marketplace fee at close (~$1,000 on a $200k property). TrueCap is free to underwrite, $29.99/month for Pro. Not substitutes — Roofstock fee buys you a brokered transaction, TrueCap subscription gives you the analytical tools.",
  },
  {
    question: "Can TrueCap analyze any Roofstock listing?",
    answer: (
      <>
        Yes — just take the property address from the Roofstock listing
        and paste it into the TrueCap analyzer. The HUD baseline rent,
        FRED rate, and state property tax pre-fill automatically. You
        can then override any input with the listing&apos;s assumptions
        to compare side-by-side.
      </>
    ),
    plainTextAnswer:
      "Yes — paste the address from any Roofstock listing into TrueCap. HUD rent, FRED rate, and state property tax pre-fill automatically. Override inputs with the listing's assumptions to compare side-by-side.",
  },
  {
    question: "Should I trust the Roofstock pro-forma cap rate?",
    answer: (
      <>
        Trust but verify. Roofstock&apos;s cap rate is mathematically
        correct given their assumptions, but those assumptions are
        optimized for the listing&apos;s appeal. Specifically check:
        their vacancy assumption (often 5% — should be 8%+ for
        out-of-state SFR), management (often 8% — most realistic PMs
        charge 10% plus a leasing fee), and capex reserves (often
        understated). TrueCap lets you override all three and see how
        the cap rate moves.
      </>
    ),
    plainTextAnswer:
      "Trust but verify. Roofstock's cap rate is math-correct given their assumptions, but those assumptions are optimized for listing appeal. Check vacancy (often 5%, should be 8%+ out-of-state), mgmt (often 8%, realistic is 10% + leasing fee), and capex reserves (often understated).",
  },
  {
    question: "When should I skip Roofstock and find deals elsewhere?",
    answer: (
      <>
        Skip Roofstock if you live in a market with enough deal flow
        that you can source locally — you&apos;ll usually find better
        margins without the 0.5% buyer fee. Skip it if the Roofstock
        inventory in your target market is thin (it&apos;s strong in
        some Midwest + Southeast markets, weaker elsewhere). Use
        Roofstock if you&apos;re scaling beyond markets where you have
        boots on the ground — the brokered + PM-included workflow is
        their real value-add.
      </>
    ),
    plainTextAnswer:
      "Skip Roofstock if local sourcing works for you — better margins without the 0.5% fee. Skip if inventory in your target market is thin (strongest in Midwest/Southeast). Use it when scaling beyond your home market — brokered + PM-included is the value-add.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "roofstock";
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
