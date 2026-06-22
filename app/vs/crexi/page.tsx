/**
 * /vs/crexi — competitor comparison landing page.
 *
 * Target queries: "crexi alternative", "crexi vs loopnet", "crexi pricing", "crexi review", "commercial real estate marketplace".
 * Crexi is a commercial real estate marketplace + intelligence platform — the LoopNet alternative for CRE listings, comps, and analytics. Different category than TrueCap (we're SFR/multifamily-focused) but investors evaluating CRE consider both.
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
  title: "TrueCap vs Crexi — residential underwriting vs commercial marketplace",
  description:
    "Crexi is the commercial real-estate marketplace + intelligence platform. TrueCap is residential rental underwriting. Different asset classes — honest comparison.",
  keywords: [
    "crexi alternative",
    "crexi vs loopnet",
    "crexi pricing",
    "crexi review",
    "commercial real estate marketplace",
  ],
  alternates: { canonical: "/vs/crexi" },
  openGraph: {
    title: "TrueCap vs Crexi — residential underwriting vs commercial marketplace",
    description:
      "Crexi is the commercial RE marketplace (LoopNet alternative). TrueCap is residential underwriting. Different asset classes.",
    url: "/vs/crexi",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Crexi" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "crexi" | "tie";
type Row = { feature: string; truecap: string; crexi: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Primary asset class", truecap: "Residential (SFR, small multifamily, owner-occupant)", crexi: "Commercial (office, retail, industrial, large multifamily)", winner: "tie" },
  { feature: "Lifecycle stage", truecap: "Per-deal underwriting calculator", crexi: "Marketplace + intelligence", winner: "tie" },
  { feature: "Cap rate / CoC / DSCR analysis", truecap: "Yes — full engine for residential", crexi: "Listing-level cap rate; no per-deal calc engine", winner: "truecap" },
  { feature: "10-year projection", truecap: "Pro — residential rent + expense + appreciation", crexi: "Not modeled", winner: "truecap" },
  { feature: "Address auto-fill (rent/rate/tax)", truecap: "Yes — HUD + FRED + state property tax (residential)", crexi: "Listing-pulled CRE data", winner: "truecap" },
  { feature: "CRE listings (office, retail, industrial)", truecap: "No — residential focus", crexi: "Yes — 500k+ active CRE listings", winner: "crexi" },
  { feature: "CRE sale + lease comps", truecap: "No", crexi: "Yes — national CRE comp database", winner: "crexi" },
  { feature: "Broker tools (offer management)", truecap: "No", crexi: "Yes — built for CRE brokers", winner: "crexi" },
  { feature: "Tenant info (CRE)", truecap: "Not applicable", crexi: "Yes — public-record tenant data", winner: "crexi" },
  { feature: "Tax strategy modeling (residential)", truecap: "Pro — depreciation + interest + after-tax CF", crexi: "Not the focus", winner: "truecap" },
  { feature: "Free tier", truecap: "Yes — full residential underwriting", crexi: "Free to browse listings; paid for intelligence", winner: "tie" },
  { feature: "Pricing (entry tier)", truecap: "Free; Pro $20/mo", crexi: "Free for buyers/browsers; Intelligence ~$100+/mo", winner: "tie" },
];

export default function VsCrexiPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "TrueCap vs Crexi — honest comparison",
    url: `${siteUrl}/vs/crexi`,
    description:
      "Crexi is the commercial real-estate marketplace + intelligence platform. TrueCap is residential rental underwriting. Different asset classes — honest comparison.",
    dateModified: "2026-06-07",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/crexi" pageName="TrueCap vs Crexi" />
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
            TrueCap vs Crexi:{" "}
            <span className="text-primary">residential underwriting vs commercial marketplace</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Crexi is a commercial real-estate marketplace + intelligence platform — the modern LoopNet alternative for CRE listings, sale comps, lease data, and broker tools. TrueCap is a residential rental underwriting calculator — single-family, small multifamily, owner-occupant. Different asset classes. Investors who do both residential and commercial may use Crexi for sourcing CRE deals and TrueCap for residential.
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
                <li>You&apos;re underwriting residential rentals (SFR, 2-4 unit multifamily, owner-occupant).</li>
                <li>You want cap rate, CoC, DSCR, cash flow on a specific residential address.</li>
                <li>You want financing math + tax strategy modeling.</li>
                <li>You&apos;re not evaluating commercial deals.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use Crexi when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You&apos;re sourcing commercial real estate (office, retail, industrial, large multifamily).</li>
                <li>You need a CRE listings marketplace + comp database.</li>
                <li>You&apos;re a CRE broker managing listings, offers, and tenants.</li>
                <li>You&apos;re evaluating commercial deals where Crexi&apos;s data is the comp source.</li>
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
                    Crexi
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
                        <WinnerBadge winner={row.winner} side="crexi" />
                        <span>{row.crexi}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Crexi details based on publicly available product info as of 2026.
            See{" "}
            <a href="https://crexi.com" target="_blank" rel="noopener" className="underline">
              crexi.com
            </a>{" "}
            for their current state.
          </p>
        </section>

        {/* Complementary workflow */}
        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            When investors use both
          </h2>
          <ol className="space-y-2.5 text-sm sm:text-base leading-relaxed text-foreground list-decimal pl-5">
            <li>
              <strong>If you do both residential and CRE.</strong> TrueCap underwrites your residential deals; Crexi sources and provides comps for your CRE deals.
            </li>
            <li>
              <strong>For CRE underwriting specifically.</strong> Crexi shows you the deal + market comps; you&apos;d run the CRE underwrite in a dedicated CRE calculator (Argus, CrowdStreet&apos;s tools, or a CRE spreadsheet model).
            </li>
            <li>
              <strong>If you&apos;re purely residential.</strong> TrueCap is enough; Crexi is overkill — the residential MLS or Roofstock-style platforms are a better fit.
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

        <ComparisonFaq competitorName="Crexi" items={CREXI_FAQ} />

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
          <Link href="/vs/roofstock" className="font-bold text-foreground hover:underline">TrueCap vs Roofstock</Link>
          {" · "}
          <Link href="/vs/mashvisor" className="font-bold text-foreground hover:underline">TrueCap vs Mashvisor</Link>
          {" · "}
          <Link href="/vs/propstream" className="font-bold text-foreground hover:underline">TrueCap vs PropStream</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const CREXI_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap a Crexi alternative?",
    answer: (
      <>
        No — different asset classes. Crexi is commercial real estate (office, retail, industrial, large multifamily). TrueCap is residential (single-family, small multifamily, owner-occupant). The two don&apos;t overlap meaningfully.
      </>
    ),
    plainTextAnswer:
      "No — different asset classes. Crexi is commercial RE. TrueCap is residential (SFR, small multifamily, owner-occupant). The two don&apos;t overlap meaningfully.",
  },
  {
    question: "Crexi vs LoopNet — which one?",
    answer: (
      <>
        Both are major CRE marketplaces. Crexi is newer, has more modern UX, and is increasingly the broker-preferred platform. LoopNet (owned by CoStar) has deeper historical listings + integration with CoStar&apos;s broader data. For active buyers, Crexi tends to be faster to search; for institutional research, LoopNet + CoStar is the deeper data source.
      </>
    ),
    plainTextAnswer:
      "Both major CRE marketplaces. Crexi is newer with modern UX + broker-preferred. LoopNet (CoStar-owned) has deeper history + CoStar data integration. Active buyers: Crexi. Institutional research: LoopNet.",
  },
  {
    question: "Does TrueCap support commercial real estate?",
    answer: (
      <>
        Not really — we&apos;re built for residential underwriting (SFR, 2-4 unit, owner-occupant). Commercial deals (office, retail, industrial) have entirely different cash-flow math, lease structures, and metrics (NOI multiples, vacancy by tenant type, TI / LC allowances). For CRE underwriting use Argus, RealNex, or a dedicated CRE spreadsheet.
      </>
    ),
    plainTextAnswer:
      "Not really — residential only (SFR, 2-4 unit, owner-occupant). CRE has different math, lease structures, metrics (NOI multiples, vacancy by tenant, TI/LC). For CRE underwriting use Argus, RealNex, or a CRE spreadsheet.",
  },
  {
    question: "Is Crexi free?",
    answer: (
      <>
        Free for buyers to browse listings and basic search. Paid for advanced intelligence features (sale comps, lease data, broker tools, advanced analytics) — typically $100+ per month depending on tier.
      </>
    ),
    plainTextAnswer:
      "Free for buyers to browse + basic search. Paid for advanced intelligence (sale comps, lease data, broker tools, analytics) — typically $100+/mo.",
  },
  {
    question: "Can I use TrueCap for small multifamily commercial deals?",
    answer: (
      <>
        Yes — TrueCap supports residential multifamily up to about 4 units. The owner-occupant property type also handles small multifamily configurations. For 5+ unit multifamily that&apos;s classified as commercial financing, the math gets different (commercial loans + DSCR underwriting standards) and you&apos;d want a dedicated multifamily calculator.
      </>
    ),
    plainTextAnswer:
      "Yes for 2-4 units (residential MF). The owner-occupant property type handles small MF. For 5+ unit commercial-financed MF, math differs (commercial loans + DSCR standards) — use a dedicated MF calculator.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "row" | "truecap" | "crexi";
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
