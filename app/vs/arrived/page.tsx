/**
 * /vs/arrived — competitor comparison landing page.
 *
 * Target queries: "arrived alternative", "arrived homes review", "arrived vs fundrise", "fractional rental investing", "passive real estate investing".
 * Arrived (formerly Arrived Homes) is a fractional rental investing platform — buy shares of rental properties starting at $100. Different model than TrueCap entirely; investors evaluate both when deciding whether to own real estate directly.
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
  title: "Arrived vs TrueCap (2026): Shares vs Ownership",
  description:
    "Arrived sells shares in rental properties. TrueCap underwrites whole properties you'd buy yourself. Two very different investing models — honest comparison.",
  keywords: [
    "arrived alternative",
    "arrived homes review",
    "arrived vs fundrise",
    "fractional rental investing",
    "passive real estate investing",
  ],
  alternates: { canonical: "/vs/arrived" },
  openGraph: {
    title: "Arrived vs TrueCap (2026): Shares vs Ownership",
    description:
      "Arrived = fractional shares of rental properties. TrueCap = underwriting whole properties you own directly. Different models.",
    url: "/vs/arrived",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Arrived" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "arrived" | "tie";
type Row = { feature: string; truecap: string; arrived: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Ownership model", truecap: "Direct ownership of whole property", arrived: "Fractional shares of a property", winner: "tie" },
  { feature: "Cap rate / CoC / DSCR analysis", truecap: "Yes — full engine, free tier", arrived: "Not applicable (you don't own debt)", winner: "truecap" },
  { feature: "10-year projection", truecap: "Pro — rent + expense + appreciation", arrived: "Forward dividend + appreciation forecast", winner: "tie" },
  { feature: "Tax strategy modeling", truecap: "Pro — depreciation + interest + after-tax CF", arrived: "K-1 distributions; no direct depreciation control", winner: "truecap" },
  { feature: "Deal score + verdict", truecap: "Free — 0-100 score + plain-English verdict", arrived: "Not applicable", winner: "truecap" },
  { feature: "Minimum to start", truecap: "Down payment on a whole property (~$20-50k typical)", arrived: "$100 per share", winner: "arrived" },
  { feature: "Time commitment", truecap: "Active — you find, underwrite, close, manage (or hire PM)", arrived: "Passive — Arrived handles everything", winner: "arrived" },
  { feature: "Liquidity", truecap: "Low — property sale takes months", arrived: "Limited secondary market (Arrived's platform)", winner: "arrived" },
  { feature: "Control over property choice", truecap: "Total — you pick everything", arrived: "Curated by Arrived; you pick from their listings", winner: "truecap" },
  { feature: "Cash flow vs growth", truecap: "You design — fixed-rate mortgage, cash-flow focused", arrived: "Depends on Arrived's deals (mix of yield + appreciation)", winner: "tie" },
  { feature: "Tax benefits (depreciation, 1031)", truecap: "Direct — full Schedule E treatment", arrived: "K-1 pass-through; no 1031 from shares", winner: "truecap" },
  { feature: "Pricing / fees", truecap: "Free; Pro $29.99/mo (analysis tools)", arrived: "1% AUM + property mgmt fees baked into yield", winner: "tie" },
];

export default function VsArrivedPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Arrived vs TrueCap (2026): Shares vs Ownership",
    url: `${siteUrl}/vs/arrived`,
    description:
      "Arrived sells shares in rental properties. TrueCap underwrites whole properties you'd buy yourself. Two very different investing models — honest comparison.",
    dateModified: "2026-06-07",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/arrived" pageName="TrueCap vs Arrived" />
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
            TrueCap vs Arrived:{" "}
            <span className="text-primary">direct ownership vs fractional shares</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Arrived is a fractional rental investing platform — buy shares of single-family rentals starting at $100, with Arrived handling acquisition, financing, property management, and eventual sale. TrueCap is the underwriting calculator for investors buying rental properties directly with their own financing. Totally different ownership models — but investors deciding between active and passive real estate evaluate both.
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
                <li>You want direct ownership and control of the property.</li>
                <li>You want full depreciation + interest deduction + 1031 eligibility.</li>
                <li>You&apos;re willing to do the underwriting + sourcing work yourself.</li>
                <li>You have $20k+ in capital and want to deploy in one property at a time.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use Arrived when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You want passive exposure to rental income without doing the work.</li>
                <li>You want to start with $100, not $20k+.</li>
                <li>You&apos;re fine giving up depreciation + 1031 for simplicity.</li>
                <li>You want diversification across multiple properties without buying them.</li>
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
                    Arrived
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
                        <WinnerBadge winner={row.winner} side="arrived" />
                        <span>{row.arrived}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Arrived details based on publicly available product info as of 2026.
            See{" "}
            <a href="https://arrived.com" target="_blank" rel="noopener" className="underline">
              arrived.com
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
              <strong>If you want full control + tax benefits → direct ownership.</strong> TrueCap helps you underwrite the property; you arrange financing + take ownership.
            </li>
            <li>
              <strong>If you want passive exposure with minimal effort → Arrived.</strong> Pick properties from Arrived&apos;s marketplace; collect quarterly distributions; let them handle everything.
            </li>
            <li>
              <strong>If you want both → split the portfolio.</strong> Many investors run 1-3 direct properties (cash flow + tax benefits) AND keep some money in Arrived (diversification + passive). TrueCap helps with the direct side; Arrived handles the passive side.
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

        <ComparisonFaq competitorName="Arrived" items={ARRIVED_FAQ} />

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
          <Link href="/vs/roofstock" className="font-bold text-foreground hover:underline">TrueCap vs Roofstock</Link>
          {" · "}
          <Link href="/vs/dealcheck" className="font-bold text-foreground hover:underline">TrueCap vs DealCheck</Link>
          {" · "}
          <Link href="/vs/mashvisor" className="font-bold text-foreground hover:underline">TrueCap vs Mashvisor</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const ARRIVED_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap an Arrived alternative?",
    answer: (
      <>
        Not really — they&apos;re entirely different ownership models. Arrived sells fractional shares of single-family rentals (passive). TrueCap is the underwriting calculator for investors buying whole rental properties directly (active). The decision isn&apos;t which to use — it&apos;s which investing model fits you.
      </>
    ),
    plainTextAnswer:
      "Not really — entirely different ownership models. Arrived: fractional shares (passive). TrueCap: underwriting whole rentals you buy directly (active). The decision is which investing model fits.",
  },
  {
    question: "Arrived vs Fundrise — which one?",
    answer: (
      <>
        Fundrise is more diversified (commercial + multifamily + residential) and has been around longer. Arrived is single-family-rental-focused and has the lowest minimums ($100). For SFR exposure specifically, Arrived is the more direct play. For diversified real-estate exposure, Fundrise.
      </>
    ),
    plainTextAnswer:
      "Fundrise is more diversified (commercial + multifamily + residential) and older. Arrived is SFR-focused with $100 minimums. SFR-specific: Arrived. Diversified RE: Fundrise.",
  },
  {
    question: "Why would I buy a rental directly when I could use Arrived?",
    answer: (
      <>
        Three reasons: control (you pick the property + market), tax benefits (full depreciation, interest deduction, 1031 eligibility), and cash flow scale (a direct rental&apos;s monthly cash flow goes to you 100%, not split with other shareholders or eaten by management fees). Tradeoff: you do the underwriting + management work (or pay a PM).
      </>
    ),
    plainTextAnswer:
      "Three reasons: control (pick property + market), tax benefits (full depreciation, interest deduction, 1031 eligibility), and cash flow scale (100% to you, no shareholder split or PM fees baked in). Tradeoff: you do the work or pay a PM.",
  },
  {
    question: "Why would I use Arrived instead of buying a rental directly?",
    answer: (
      <>
        Three reasons: low minimum ($100 vs ~$20k+ for a direct down payment), zero work (no sourcing, no underwriting, no management), and diversification (split your capital across multiple properties without buying multiples). Tradeoff: you give up control, depreciation, 1031 eligibility, and some yield to Arrived&apos;s fees.
      </>
    ),
    plainTextAnswer:
      "Three reasons: low minimum ($100 vs ~$20k+ down), zero work (no sourcing/underwriting/mgmt), diversification (split capital across properties). Tradeoff: lose control, depreciation, 1031, and yield to fees.",
  },
  {
    question: "Can I use TrueCap to evaluate an Arrived property?",
    answer: (
      <>
        Not directly — Arrived shares aren&apos;t an underwriting problem in TrueCap&apos;s sense (you&apos;re not modeling cap rate, DSCR, or your own financing). TrueCap is for direct ownership where you control the inputs. For Arrived properties, evaluate them on Arrived&apos;s published projections (yield + appreciation forecast) and your own diversification goals.
      </>
    ),
    plainTextAnswer:
      "Not directly — Arrived shares aren&apos;t an underwriting problem in TrueCap&apos;s sense (no cap rate, DSCR, or your own financing). TrueCap is for direct ownership where you control inputs. Evaluate Arrived properties on their published yield + appreciation forecasts.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "arrived";
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
