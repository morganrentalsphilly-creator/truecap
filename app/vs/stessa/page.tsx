/**
 * /vs/stessa — competitor comparison landing page.
 *
 * Stessa positioning: free rental property accounting/bookkeeping +
 * portfolio dashboards. They're strongest AFTER you own the property
 * (track income, expenses, generate Schedule E). TrueCap is strongest
 * BEFORE — underwriting the deal so you don't overpay. Most serious
 * investors end up using both, but the searcher is asking us which.
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
  title: "Stessa vs TrueCap (2026): Books vs Deal Analysis",
  description:
    "TrueCap vs Stessa for rental investors. Underwriting math (TrueCap) vs portfolio bookkeeping (Stessa). Honest feature matrix + when to pick each.",
  keywords: [
    "stessa alternative",
    "stessa vs truecap",
    "rental property bookkeeping vs analysis",
    "underwriting tool vs portfolio tracker",
  ],
  alternates: { canonical: "/vs/stessa" },
  openGraph: {
    title: "Stessa vs TrueCap (2026): Books vs Deal Analysis",
    description:
      "Underwriting tool vs portfolio bookkeeping tool. Different jobs — when to pick each.",
    url: "/vs/stessa",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Stessa" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "stessa" | "tie";
type Row = { feature: string; truecap: string; stessa: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Primary job",                       truecap: "Underwrite a deal before you buy",                                                  stessa: "Track income/expenses after you own",                                     winner: "tie" },
  { feature: "Pre-purchase analysis",             truecap: "Full analyzer — cap rate, CoC, DSCR, NCF, 10-yr, tax, exit, sensitivity",            stessa: "Limited — has a basic rental calculator",                                 winner: "truecap" },
  { feature: "Post-purchase bookkeeping",         truecap: "Not a focus",                                                                       stessa: "Yes — bank-connected income/expense tracking, Schedule E ready",          winner: "stessa" },
  { feature: "Free tier",                         truecap: "Free analyzer with no signup",                                                     stessa: "Free bookkeeping (their core product is free)",                           winner: "tie" },
  { feature: "10-year projection (pre-purchase)", truecap: "Pro — rent + expense + appreciation compounding modeled",                          stessa: "Not the primary use case",                                                winner: "truecap" },
  { feature: "Illustrative tax impact",           truecap: "Pro — depreciation + interest deduction + modeled after-tax CF",                    stessa: "Year-end Schedule E reports for filed taxes",                             winner: "tie" },
  { feature: "Bank account connections",          truecap: "No",                                                                                stessa: "Yes — Plaid integrations to pull transactions",                           winner: "stessa" },
  { feature: "Sensitivity / stress test",         truecap: "Pro — rent ±10%, vacancy ±5pp, rates ±1pp",                                         stessa: "No",                                                                      winner: "truecap" },
  { feature: "Address auto-fill (rent/rate/tax)", truecap: "HUD FMR + FRED + state tax dataset",                                               stessa: "Not the primary use case",                                                winner: "truecap" },
  { feature: "BRRRR + fix-and-flip analyzers",    truecap: "Yes",                                                                              stessa: "No — not a value-add tool",                                                winner: "truecap" },
  { feature: "Portfolio rollup",                  truecap: "Across saved deals (pre-purchase)",                                                stessa: "Across owned properties (post-purchase) — their strongest view",          winner: "stessa" },
  { feature: "Document storage",                  truecap: "No",                                                                               stessa: "Yes — leases, receipts, statements",                                      winner: "stessa" },
  { feature: "Rent collection",                   truecap: "No",                                                                               stessa: "Yes — built-in rent collection in some plans",                            winner: "stessa" },
  { feature: "Shareable deal links",              truecap: "Free — read-only public link; Pro adds co-branding",                               stessa: "Not the primary use case",                                                winner: "truecap" },
  { feature: "PDF lender report",                 truecap: "Pro — multi-page report for loan officer",                                          stessa: "Year-end accounting reports (different purpose)",                         winner: "tie" },
];

export default function VsStessaPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Stessa vs TrueCap (2026): Books vs Deal Analysis",
    url: `${siteUrl}/vs/stessa`,
    description: "Side-by-side comparison of TrueCap and Stessa for rental investors.",
    dateModified: "2026-06-01",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/stessa" pageName="TrueCap vs Stessa" />
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
            TrueCap vs Stessa:{" "}
            <span className="text-primary">underwriting vs bookkeeping.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Most serious rental investors end up using both — they solve
            different problems. TrueCap helps you decide which deal to buy
            (underwriting). Stessa helps you run the deals you already own
            (bookkeeping + Schedule E). Here&apos;s when to pick which.
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
            Free analyzer: no card or signup
          </p>
        </section>

        <section className="mb-12 sm:mb-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">TL;DR</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">Pick TrueCap if</p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You&apos;re evaluating new deals to potentially buy.</li>
                <li>You need cap rate, CoC, DSCR, 10-year projections, tax modeling, exit scenarios.</li>
                <li>You want stress-test sensitivity (rent / vacancy / rate moves).</li>
                <li>You want a Pro PDF report to share with a lender.</li>
                <li>You want BRRRR or fix-and-flip strategy modeling.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Pick Stessa if</p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You already own rental properties and need to track them.</li>
                <li>You want bank-connected automatic transaction tracking.</li>
                <li>You need Schedule E ready for tax filing.</li>
                <li>You want document storage (leases, receipts).</li>
                <li>You want built-in rent collection.</li>
              </ul>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Honest take:</strong> these aren&apos;t
            competing products — they&apos;re complementary. Use TrueCap to underwrite,
            Stessa to operate. The only reason this comparison exists is search-intent
            confusion (&quot;rental property tool&quot;), not real overlap.
          </p>
        </section>

        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            Feature-by-feature
          </h2>
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">
            Note: green check ≠ &quot;better&quot; — it means &quot;this is what the tool is built for.&quot;
          </p>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Feature</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-primary">TrueCap</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Stessa</th>
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
                        <WinnerBadge winner={row.winner} side="stessa" />
                        <span>{row.stessa}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Stessa details based on publicly available product info as of 2026. See{" "}
            <a href="https://stessa.com" target="_blank" rel="noopener" className="underline">stessa.com</a>{" "}
            for their current state.
          </p>
        </section>

        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            The actual recommendation
          </h2>
          <p className="text-sm sm:text-base leading-relaxed text-foreground">
            If you&apos;re shopping for properties: use TrueCap. Free analyzer, no
            signup, full cap rate / CoC / DSCR / projections.
          </p>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-foreground">
            If you own properties and want to track ops: use Stessa. Their core
            bookkeeping product is free and tightly built for landlords.
          </p>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-foreground">
            If you do both: use both. They don&apos;t step on each other.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            For acquisition specifically, the highest-leverage TrueCap pages
            are the{" "}
            <Link href="/tools/cap-rate-calculator" className="font-semibold text-primary hover:underline">
              cap rate calculator
            </Link>
            , the{" "}
            <Link href="/tools/dscr-calculator" className="font-semibold text-primary hover:underline">
              DSCR calculator
            </Link>
            , and the longer-form guides on{" "}
            <Link href="/blog/how-to-underwrite-a-rental-property-in-60-seconds" className="font-semibold text-primary hover:underline">
              60-second underwriting
            </Link>{" "}
            and{" "}
            <Link href="/blog/rental-property-tax-deductions" className="font-semibold text-primary hover:underline">
              rental property tax deductions
            </Link>{" "}
            (the operations side that overlaps with what Stessa tracks).
          </p>
        </section>

        <ComparisonFaq competitorName="Stessa" items={STESSA_FAQ} />

        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Underwriting the next deal? Start free.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            TrueCap free covers cap rate, CoC, DSCR, NCF, monthly cash flow — enough to underwrite. Pro unlocks co-branded share links, PDF exports, 10-year projections, illustrative tax impact, sensitivity grid, MAO, and the strategy analyzers. No card to start.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/pricing" className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity">
              See Pro pricing
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
          <Link href="/vs/mashvisor" className="font-bold text-foreground hover:underline">TrueCap vs Mashvisor</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const STESSA_FAQ: FaqItem[] = [
  {
    question: "Is Stessa the same kind of tool as TrueCap?",
    answer: (
      <>
        No. Stessa is a rental-property accounting + operations
        platform — bank-feed reconciliation, expense categorization,
        tax-ready P&amp;L, document storage for leases. TrueCap is a
        pre-purchase underwriting calculator — should I buy this deal?
        Most serious investors end up using both: TrueCap to decide
        whether to buy, Stessa to operate the property after closing.
      </>
    ),
    plainTextAnswer:
      "No. Stessa is a rental-property accounting + operations platform (bank feeds, expense categorization, tax-ready P&L, document storage). TrueCap is a pre-purchase underwriting calculator. Most serious investors use both — TrueCap to decide, Stessa to operate.",
  },
  {
    question: "Should I use Stessa or TrueCap?",
    answer: (
      <>
        Use TrueCap before you buy the property — to underwrite the
        deal, model 10-year returns, run sensitivity, and decide if
        the numbers work. Use Stessa after closing — to track actual
        income and expenses, reconcile bank feeds, store leases, and
        generate Schedule E reports at tax time. They&apos;re
        complementary, not competing.
      </>
    ),
    plainTextAnswer:
      "Use TrueCap before you buy — underwrite, model 10-year returns, run sensitivity. Use Stessa after closing — track income/expenses, reconcile bank feeds, store leases, generate Schedule E. Complementary, not competing.",
  },
  {
    question: "Is Stessa free?",
    answer: (
      <>
        Stessa&apos;s base tier is free for accounting + bank-feed
        tracking on unlimited properties. Their paid tier (Stessa Pro,
        ~$12/month) adds advanced reporting, document organization,
        and rent collection features. TrueCap free covers the
        underwriting math; TrueCap Pro ($29.99/month) adds projections,
        illustrative tax impact, sensitivity, and MAO. So free Stessa
        + free TrueCap covers a lot of the workflow already.
      </>
    ),
    plainTextAnswer:
      "Stessa's base tier is free for accounting + bank feeds on unlimited properties. Stessa Pro is ~$12/month. TrueCap free covers underwriting math; TrueCap Pro is $29.99/month for projections, tax, sensitivity, and MAO.",
  },
  {
    question: "Does TrueCap track expenses like Stessa?",
    answer: (
      <>
        No, and intentionally so. TrueCap models projected expenses
        for underwriting (taxes, insurance, vacancy, mgmt %,
        maintenance, capex reserves) but doesn&apos;t connect to your
        bank to track actuals. That&apos;s Stessa&apos;s job. Building
        a second accounting product into TrueCap would dilute the
        underwriting focus.
      </>
    ),
    plainTextAnswer:
      "No — by design. TrueCap models projected expenses for underwriting (taxes, insurance, vacancy, mgmt, maintenance, capex) but doesn't connect to your bank to track actuals. That's Stessa's job.",
  },
  {
    question: "Can I share a TrueCap analysis with my accountant?",
    answer: (
      <>
        Yes — every TrueCap user can generate a public read-only share
        link for free; Pro adds a full multi-page PDF report and
        optional custom co-branding on the link. Both formats include
        the projection, Illustrative Tax Impact view, and deal score, which gives
        your accountant what they need to validate the after-tax cash
        flow assumptions before you buy.
      </>
    ),
    plainTextAnswer:
      "Yes — read-only share links are free for everyone; Pro adds a multi-page PDF and optional co-branding. Both include the projection and Illustrative Tax Impact view so your accountant can review the after-tax assumptions.",
  },
];

function WinnerBadge({ winner, side }: { winner: Verdict; side: "truecap" | "stessa" }) {
  if (winner === "tie") {
    return <Minus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />;
  }
  const isWinner = winner === side;
  return isWinner ? (
    <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-green)]" />
  ) : (
    <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />
  );
}
