/**
 * /vs/dealcheck-for-short-term-rentals — niche use-case comparison page (Short-term rentals cut).
 *
 * Target queries: "dealcheck short term rental", "dealcheck airbnb calculator", "best str calculator", "short term rental analysis tool", "airbnb deal analyzer". Long-tail audience-slicing comparison.
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
  title: "DealCheck vs TrueCap for STR Deals (2026)",
  description:
    "Both calculators can model STRs. Compare seasonal ADR, occupancy, AirDNA-input workflows, and the limits of each tool's tax modeling.",
  keywords: [
    "dealcheck short term rental",
    "dealcheck airbnb calculator",
    "best str calculator",
    "short term rental analysis tool",
    "airbnb deal analyzer",
  ],
  alternates: { canonical: "/vs/dealcheck-for-short-term-rentals" },
  openGraph: {
    title: "DealCheck vs TrueCap for STR Deals (2026)",
    description:
      "STR-specific TrueCap vs DealCheck: ADR + occupancy modeling, AirDNA-input workflow, and tax-model limitations.",
    url: "/vs/dealcheck-for-short-term-rentals",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs DealCheck for Short-Term Rentals — honest comparison" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "dealcheck" | "tie";
type Row = { feature: string; truecap: string; dealcheck: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "LTR + STR scenario comparison", truecap: "Save separate scenarios; side-by-side comparison is Pro", dealcheck: "Duplicate the deal and compare, subject to plan caps", winner: "tie" },
  { feature: "ADR + occupancy input model", truecap: "Editable rent field — plug AirDNA monthly projection", dealcheck: "Editable rent field — same approach", winner: "tie" },
  { feature: "Seasonal occupancy curve modeling", truecap: "Single blended ADR + occupancy; compare manual scenarios", dealcheck: "Annualized only", winner: "tie" },
  { feature: "AirDNA / Mashvisor data integration", truecap: "Manual — paste AirDNA's projected monthly revenue into rent field", dealcheck: "Same approach", winner: "tie" },
  { feature: "Bonus depreciation / STR tax eligibility", truecap: "Not determined — review with a CPA", dealcheck: "Standard tax view", winner: "tie" },
  { feature: "Cost-segregation component modeling", truecap: "Not modeled", dealcheck: "Manual", winner: "tie" },
  { feature: "Editable property-management rate", truecap: "Yes — adjustable management %", dealcheck: "Yes", winner: "tie" },
  { feature: "Higher utilities + cleaning fees", truecap: "Yes — utilities + maintenance fields handle the STR overhead", dealcheck: "Yes", winner: "tie" },
  { feature: "Mobile UX", truecap: "PWA installable", dealcheck: "Native iOS + Android", winner: "dealcheck" },
  { feature: "Free tier covers STR underwriting", truecap: "Yes — core cap rate / CoC / DSCR / cash flow", dealcheck: "Yes — Rental Cash Flow for Airbnbs is included on Starter", winner: "tie" },
];

const NICHE_FAQ: FaqItem[] = [
  {
    question: "Which is better for short-term rentals — TrueCap or DealCheck?",
    answer: (
      <>
        Both work. TrueCap models a blended ADR + occupancy input; model separate seasonal cases as saved scenarios, with side-by-side comparison on Pro. DealCheck Starter includes its Rental Cash Flow for Airbnbs calculator and professional reports, subject to published caps. Neither calculator determines STR-loophole eligibility; model cost segregation and bonus depreciation with a qualified tax professional.
      </>
    ),
    plainTextAnswer:
      "Both work. TrueCap uses blended ADR and occupancy inputs; seasonal cases require separate saved scenarios and Pro for side-by-side comparison. DealCheck Starter includes its Airbnb rental calculator and professional reports, subject to caps. Neither determines STR-loophole eligibility.",
  },
  {
    question: "Can TrueCap model AirDNA revenue projections?",
    answer: (
      <>
        Yes — every input in TrueCap is editable. Pull AirDNA&apos;s projected monthly revenue (annual ÷ 12, discounted for vacancy + cleaning + STR opex), plug it into the rent field, run the full cap rate / DSCR / cash flow analysis. Same approach works in DealCheck.
      </>
    ),
    plainTextAnswer:
      "Yes — every input editable. Pull AirDNA&apos;s projected monthly revenue (annual ÷ 12, discounted for vacancy + cleaning + STR opex), plug into rent field. Same approach in DealCheck.",
  },
  {
    question: "Does TrueCap support the STR tax loophole?",
    answer: (
      <>
        Not as a tax-eligibility or cost-segregation engine. TrueCap&apos;s Illustrative Tax Impact view models rental income, entered operating expenses, straight-line depreciation, and optional mortgage interest at the marginal rate you enter. It does not determine material participation or REPS, classify cost-segregation components, or calculate bonus depreciation. Use a CPA&apos;s model for those items.
      </>
    ),
    plainTextAnswer:
      "No — TrueCap does not determine STR-loophole eligibility or model cost-segregation components and bonus depreciation. Its Illustrative Tax Impact view models rental income, entered expenses, straight-line depreciation, and optional mortgage interest at an entered marginal rate. Use a CPA for tax-specific modeling.",
  },
  {
    question: "What management rate should I use for STR analysis?",
    answer: (
      <>
        Use a current quote for the property and service scope. STR management fees vary by market, channel coverage, guest communication, cleaning coordination, and included services. If you self-manage, still model software, labor, and coordination costs. TrueCap&apos;s management field is editable.
      </>
    ),
    plainTextAnswer:
      "Use a current property-specific quote. STR management fees vary by market and service scope. If self-managing, still model software, labor, and coordination costs. TrueCap's management field is editable.",
  },
  {
    question: "Can I run LTR and STR scenarios on the same property?",
    answer: (
      <>
        Yes. Save one scenario with the editable HUD long-term-rent benchmark and another with your independently verified STR revenue assumption. Pro can compare saved deals side-by-side. Review cap rate, cash flow, DSCR, expenses, and sensitivity together rather than treating one metric as the answer.
      </>
    ),
    plainTextAnswer:
      "Yes. Save separate LTR and STR scenarios using independently verified inputs. Pro can compare saved deals side-by-side. Review returns, expenses, financing, and sensitivity together.",
  },
];

export default function VsDealcheckForShortTermRentalsPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "DealCheck vs TrueCap for STR Deals (2026)",
    url: `${siteUrl}/vs/dealcheck-for-short-term-rentals`,
    description: "Both calculators can model STRs. Compare seasonal ADR, occupancy, AirDNA-input workflows, and the limits of each tool's tax modeling.",
    dateModified: "2026-06-07",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/dealcheck-for-short-term-rentals" pageName="TrueCap vs DealCheck for Short-Term Rentals" />
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
            TrueCap vs DealCheck for Short-term rentals:{" "}
            <span className="text-primary">which supports the underwriting workflow better?</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Both calculators were built for long-term rentals first. Both let you model short-term rentals with projected revenue inputs. This comparison covers seasonal ADR + occupancy, AirDNA-input workflow, and where tax-specific work must move to a CPA model.
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
                <li>You&apos;re underwriting a property as a potential STR.</li>
                <li>You want to compare LTR vs STR scenarios side-by-side.</li>
                <li>You want rental cash flow and a clearly labeled illustrative tax view.</li>
                <li>You want a free tier that covers basic STR underwriting.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Use DealCheck when
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You manage many STRs on mobile at properties.</li>
                <li>You&apos;re already a DealCheck Plus or Pro subscriber.</li>
                <li>You prefer DealCheck&apos;s listing-import workflow for STR sourcing.</li>
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
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">DealCheck</th>
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
                        ) : row.winner === "dealcheck" ? (
                          <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-green)]" />
                        ) : (
                          <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />
                        )}
                        <span>{row.dealcheck}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            DealCheck publishes Rental Cash Flow for Airbnbs and professional reports on
            Starter, subject to plan limits. See{" "}
            <a href="https://dealcheck.io/pricing/" target="_blank" rel="noopener" className="underline">
              DealCheck&apos;s official pricing page
            </a>{" "}
            for current terms.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            Whichever calculator you land on, the STR underwrite is the same job. Our{" "}
            <Link href="/blog/short-term-rental-underwriting-playbook" className="font-semibold text-primary hover:underline">short-term rental underwriting playbook</Link>
            {" "}breaks down seasonal revenue into a defensible analysis, and our roundup of the{" "}
            <Link href="/blog/best-short-term-rental-analysis-tool-2026" className="font-semibold text-primary hover:underline">best short-term rental analysis tools for 2026</Link>
            {" "}covers where the ADR and occupancy data should come from. For a quick single-metric check, the standalone{" "}
            <Link href="/tools/cap-rate-calculator" className="font-semibold text-primary hover:underline">cap rate calculator</Link>
            {" "}runs the same engine.
          </p>
        </section>

        <ComparisonFaq competitorName="DealCheck (Short-term rentals)" items={NICHE_FAQ} />

        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Underwrite your next Short-term rentals deal — free.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            Free covers the standard cap rate, CoC, DSCR, and cash flow. Pro adds
            projections, sensitivity, illustrative tax impact, modeled exit comparisons, MAO,
            and included PDFs. A one-time PDF option is also available for one deal; see live
            pricing for current terms.
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
          <Link href="/vs/dealcheck" className="font-bold text-foreground hover:underline">TrueCap vs DealCheck</Link>
          {" · "}
          <Link href="/vs/hostaway" className="font-bold text-foreground hover:underline">TrueCap vs Hostaway</Link>
          {" · "}
          <Link href="/vs/airdna" className="font-bold text-foreground hover:underline">TrueCap vs AirDNA</Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
