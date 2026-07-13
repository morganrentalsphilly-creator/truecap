/**
 * /vs/fundrise — competitor comparison landing page.
 *
 * Target queries: "fundrise alternative", "fundrise vs arrived", "fundrise review", "fundrise pricing", "passive real estate investing".
 * Fundrise is a non-traded REIT / fractional real-estate investing platform — diversified across commercial, multifamily, residential. Direct competitor to Arrived. Investors evaluate it vs direct ownership.
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
  title: "TrueCap vs Fundrise — direct ownership vs REIT shares",
  description:
    "Fundrise is a non-traded REIT for passive real estate exposure. TrueCap underwrites whole properties you'd buy yourself. Two very different investing models.",
  keywords: [
    "fundrise alternative",
    "fundrise vs arrived",
    "fundrise review",
    "fundrise pricing",
    "passive real estate investing",
  ],
  alternates: { canonical: "/vs/fundrise" },
  openGraph: {
    title: "TrueCap vs Fundrise — direct ownership vs REIT shares",
    description:
      "Fundrise = non-traded REIT shares (passive). TrueCap = underwriting whole properties you own directly. Different models.",
    url: "/vs/fundrise",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Fundrise" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "fundrise" | "tie";
type Row = { feature: string; truecap: string; fundrise: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Ownership model", truecap: "Direct ownership of whole property", fundrise: "Shares in diversified REIT funds", winner: "tie" },
  { feature: "Cap rate / CoC / DSCR analysis", truecap: "Yes — full engine, free tier", fundrise: "Not applicable (no individual property)", winner: "truecap" },
  { feature: "10-year projection", truecap: "Pro — per-property rent + expense + appreciation", fundrise: "Fund-level forward returns (historical 8-12%)", winner: "tie" },
  { feature: "Tax strategy modeling", truecap: "Pro — depreciation + interest + after-tax CF + 1031", fundrise: "K-1 / 1099 distributions; some depreciation pass-through", winner: "truecap" },
  { feature: "Deal score + verdict", truecap: "Free — 0-100 score + plain-English verdict", fundrise: "Not applicable", winner: "truecap" },
  { feature: "Minimum to start", truecap: "Down payment on a whole property (~$20-50k)", fundrise: "$10 (Starter), $1k+ for higher tiers", winner: "fundrise" },
  { feature: "Time commitment", truecap: "Active — you source, underwrite, close, manage (or hire)", fundrise: "Passive — Fundrise allocates capital", winner: "fundrise" },
  { feature: "Liquidity", truecap: "Low — sale takes months", fundrise: "Limited — quarterly redemption windows with potential gates", winner: "fundrise" },
  { feature: "Diversification", truecap: "One property at a time", fundrise: "Across many properties + asset types", winner: "fundrise" },
  { feature: "Control over property choice", truecap: "Total", fundrise: "None — Fundrise picks deals", winner: "truecap" },
  { feature: "Tax benefits", truecap: "Full depreciation + interest + 1031", fundrise: "Some depreciation pass-through (K-1 funds); no 1031 from shares", winner: "truecap" },
  { feature: "Cash flow model", truecap: "You design — fixed-rate mortgage, your CF goes to you", fundrise: "Quarterly distributions from fund returns", winner: "tie" },
  { feature: "Pricing / fees", truecap: "Free; Pro $29.99/mo (analysis tools only)", fundrise: "0.15% advisory + 0.85% fund management (1% all-in, plus expense ratios)", winner: "tie" },
  { feature: "Free tier (for analysis)", truecap: "Yes — full underwriting math", fundrise: "Not applicable", winner: "truecap" },
];

export default function VsFundrisePage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "TrueCap vs Fundrise — honest comparison",
    url: `${siteUrl}/vs/fundrise`,
    description:
      "Fundrise is a non-traded REIT for passive real estate exposure. TrueCap underwrites whole properties you'd buy yourself. Two very different investing models.",
    dateModified: "2026-06-07",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/fundrise" pageName="TrueCap vs Fundrise" />
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
            TrueCap vs Fundrise:{" "}
            <span className="text-primary">direct ownership vs REIT shares</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Fundrise is one of the most popular non-traded REITs — pool your money with thousands of other investors into diversified real estate funds (commercial + multifamily + residential). TrueCap is the underwriting calculator for investors buying rental properties directly with their own financing. Completely different investing models — but investors deciding between active and passive real estate evaluate both.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5"
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
                <li>You want direct control of the property and the financing.</li>
                <li>You want full depreciation + interest deduction + 1031 eligibility.</li>
                <li>You have $20k+ to deploy in one property at a time.</li>
                <li>You&apos;re willing to do the underwriting + management work yourself.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use Fundrise when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You want passive real estate exposure with zero work.</li>
                <li>You want diversification across asset classes (commercial + multifamily + residential).</li>
                <li>You only have $10-1k to start, not $20k+.</li>
                <li>You&apos;re fine giving up depreciation control and 1031 for simplicity.</li>
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
                    Fundrise
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
                        <WinnerBadge winner={row.winner} side="fundrise" />
                        <span>{row.fundrise}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Fundrise details based on publicly available product info as of 2026.
            See{" "}
            <a href="https://fundrise.com" target="_blank" rel="noopener" className="underline">
              fundrise.com
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* Complementary workflow */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            When to use which (or both)
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
            <li>
              <strong>If you want full control + tax benefits → direct ownership.</strong> TrueCap helps you underwrite; you arrange financing + take title.
            </li>
            <li>
              <strong>If you want passive exposure with low minimums → Fundrise.</strong> Pick a Fundrise plan, set a recurring contribution, collect quarterly distributions.
            </li>
            <li>
              <strong>If you want both → split the portfolio.</strong> Most diversified investors keep 1-3 direct rentals (cash flow + tax) AND some money in Fundrise (diversification + passive). TrueCap helps with the direct side.
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

        <ComparisonFaq competitorName="Fundrise" items={FUNDRISE_FAQ} />

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
          <Link href="/vs/arrived" className="font-bold text-foreground hover:underline">TrueCap vs Arrived</Link>
          {" · "}
          <Link href="/vs/roofstock" className="font-bold text-foreground hover:underline">TrueCap vs Roofstock</Link>
          {" · "}
          <Link href="/vs/mashvisor" className="font-bold text-foreground hover:underline">TrueCap vs Mashvisor</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const FUNDRISE_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Fundrise alternative?",
    answer: (
      <>
        Not really — completely different investing models. Fundrise sells shares in diversified non-traded REITs (passive). TrueCap is the underwriting calculator for investors buying rentals directly (active). The decision isn&apos;t which to use — it&apos;s which investing model fits you.
      </>
    ),
    plainTextAnswer:
      "Not really — different investing models. Fundrise sells REIT shares (passive). TrueCap underwrites whole rentals you buy directly (active). The decision is which model fits you.",
  },
  {
    question: "Fundrise vs Arrived — which one?",
    answer: (
      <>
        Both are passive real estate platforms but with different scopes. Arrived focuses on single-family rentals at the property level (you buy shares of specific houses, $100 minimum). Fundrise is more diversified across commercial + multifamily + residential at the fund level ($10 minimum). For SFR exposure: Arrived. For diversified RE exposure: Fundrise.
      </>
    ),
    plainTextAnswer:
      "Both passive RE. Arrived: SFR at property level, $100 min, you pick houses. Fundrise: diversified across CRE/multifamily/residential at fund level, $10 min. SFR: Arrived. Diversified: Fundrise.",
  },
  {
    question: "Is Fundrise really passive?",
    answer: (
      <>
        Yes — Fundrise handles everything (acquisition, financing, management, distributions). You contribute capital + collect quarterly distributions. The tradeoff is you give up control over individual property decisions and pay ~1% in fees plus underlying expense ratios.
      </>
    ),
    plainTextAnswer:
      "Yes — Fundrise handles acquisition, financing, management, distributions. You contribute capital + collect quarterly distributions. Tradeoff: no control over property decisions + ~1% fees + expense ratios.",
  },
  {
    question: "Why would I buy a rental directly when I could just put money in Fundrise?",
    answer: (
      <>
        Three reasons: control (you pick the property + financing), tax benefits (full depreciation, interest deduction, 1031 eligibility — Fundrise&apos;s pass-through is limited), and cash-flow scale (100% of a direct rental&apos;s cash flow goes to you, not split across fund LPs or eaten by management fees). Tradeoff: real work or paying a PM.
      </>
    ),
    plainTextAnswer:
      "Three reasons: control over property + financing, tax benefits (full depreciation + 1031 vs Fundrise&apos;s limited pass-through), cash-flow scale (100% to you vs split + fees). Tradeoff: work or PM.",
  },
  {
    question: "Can I use Fundrise&apos;s projected returns in TrueCap?",
    answer: (
      <>
        Not directly — TrueCap models per-property metrics (cap rate, DSCR, cash flow), not REIT fund returns. Fundrise&apos;s historical 8-12% blended returns aren&apos;t comparable to a direct rental&apos;s cash-on-cash because the leverage, tax treatment, and cash-flow timing are different. Evaluate each on its own terms.
      </>
    ),
    plainTextAnswer:
      "Not directly — TrueCap models per-property metrics; Fundrise gives fund returns. Their 8-12% blended isn&apos;t comparable to direct CoC because leverage, taxes, and cash-flow timing differ. Evaluate each on its own terms.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "fundrise";
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
