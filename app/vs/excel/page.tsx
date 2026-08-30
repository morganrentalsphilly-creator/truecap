/**
 * /vs/excel — TrueCap vs Excel/Google Sheets for rental analysis.
 *
 * Target queries: "rental property excel template", "rental analysis
 * spreadsheet", "excel vs calculator", "best rental spreadsheet". Massive
 * search volume — Excel is the default tool most new investors start with.
 */

import type { Metadata } from "next";
import type { ReactNode } from "react";
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
import {
  ComparisonFaq,
  type FaqItem,
} from "@/components/marketing/comparison-faq";
import { getSiteUrl } from "@/lib/site-url";
import { VsBreadcrumbSchema } from "@/components/marketing/vs-breadcrumb-schema";

export const metadata: Metadata = {
  title: "Excel vs TrueCap for Rental Analysis (2026)",
  description:
    "Honest comparison of TrueCap vs Excel/Google Sheets for rental property analysis. Speed, accuracy, mobile, sharing — and when a spreadsheet still wins.",
  keywords: [
    "rental property excel template",
    "rental analysis spreadsheet",
    "excel vs rental calculator",
    "best rental property spreadsheet",
    "google sheets rental analysis",
    "rental property excel vs calculator",
  ],
  alternates: { canonical: "/vs/excel" },
  openGraph: {
    title: "Excel vs TrueCap for Rental Analysis (2026)",
    description:
      "Side-by-side: speed, accuracy, mobile, sharing, what each does best.",
    url: "/vs/excel",
    type: "website",
    images: [
      { url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Excel" },
    ],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "excel" | "tie";
type Row = {
  feature: string;
  truecap: ReactNode;
  excel: string;
  winner: Verdict;
};

const MATRIX: Row[] = [
  {
    feature: "Time to first underwrite",
    truecap: "Address-first form with editable benchmark defaults",
    excel: "Depends on template setup and the evidence already gathered",
    winner: "truecap",
  },
  {
    feature: "Starting values from address",
    truecap: "Editable HUD rent and FRED rate benchmarks; manual property tax",
    excel: "Manual entry or a custom data integration",
    winner: "truecap",
  },
  {
    feature: "Formula consistency",
    truecap: "One documented calculation engine; inputs still require review",
    excel: "Depends on the template, formulas, protections, and review process",
    winner: "tie",
  },
  {
    feature: "Mobile usable",
    truecap: "Mobile-first responsive web app",
    excel: "Mobile apps available; complex sheets may require more navigation",
    winner: "truecap",
  },
  {
    feature: "Shareable with team / client",
    truecap: "Free read-only public link; Pro adds co-branding",
    excel: "Share a workbook or controlled cloud-sheet link",
    winner: "tie",
  },
  {
    feature: "Live updates as you change inputs",
    truecap: "Instant recalc, visual indicators of impact",
    excel: "Recalc works but you have to track which cells you changed",
    winner: "truecap",
  },
  {
    feature: "10-year projection visualization",
    truecap: "Pro built-in chart; Pro also compares up to four saved deals",
    excel:
      "Available when the workbook is built for projections and comparison",
    winner: "truecap",
  },
  {
    feature: "Sensitivity analysis (stress test)",
    truecap: "Pro — rent ±10%, vacancy ±5pp, rates ±1pp in one view",
    excel: "Possible with Data Table feature but most users don't",
    winner: "truecap",
  },
  {
    feature: "Customization to unusual scenarios",
    truecap: "Structured inputs; unsupported scenarios may need another model",
    excel:
      "Highly customizable when the author can build and review the formulas",
    winner: "excel",
  },
  {
    feature: "Free to start",
    truecap: "Yes — unlimited free analyses, no signup",
    excel: "Yes if you have Excel/Sheets",
    winner: "tie",
  },
  {
    feature: "Offline use",
    truecap: "Requires internet",
    excel: "Works offline once file is open",
    winner: "excel",
  },
  {
    feature: "Audit trail / version history",
    truecap: "No per-deal revision history; Pro can edit saved deals",
    excel:
      "Cloud sheets may provide version history; local files need a process",
    winner: "excel",
  },
  {
    feature: "Glossary / explanation of metrics",
    truecap: (
      <>
        Inline tooltips + a{" "}
        <Link
          href="/glossary"
          className="font-semibold text-primary hover:underline"
        >
          real estate glossary
        </Link>{" "}
        with full definitions per term
      </>
    ),
    excel: "Whatever you remember from your last research session",
    winner: "truecap",
  },
  {
    feature: "PDF export for review",
    truecap: "Included with Pro",
    excel: "Print or export to PDF with workbook-defined formatting",
    winner: "truecap",
  },
  {
    feature: "Cost",
    truecap: "Free core and paid Pro — see live pricing",
    excel: "$0 if already licensed; otherwise plan-dependent",
    winner: "tie",
  },
];

export default function VsExcelPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Excel vs TrueCap for Rental Analysis (2026)",
    url: `${siteUrl}/vs/excel`,
    description:
      "Side-by-side comparison of TrueCap and Excel/Google Sheets for rental analysis.",
    dateModified: "2026-06-01",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <VsBreadcrumbSchema vsPath="/vs/excel" pageName="TrueCap vs Excel" />
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
            Honest comparison
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight text-balance">
            TrueCap vs Excel:{" "}
            <span className="text-primary">
              when is a spreadsheet still the right tool?
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Many investors start with an Excel or Google Sheets template.
            TrueCap offers a structured, mobile-friendly workflow with
            consistent calculations and editable screening benchmarks. A
            well-built, reviewed spreadsheet can still be the right tool for
            custom models.
          </p>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <ScrollToFormButton className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_12px_28px_rgba(0,112,196,0.28)] transition-transform hover:-translate-y-0.5">
              <Calculator className="size-4" />
              Try TrueCap free
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </ScrollToFormButton>
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground hover:bg-muted"
            >
              See pricing
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Free analyzer: no card or signup
          </p>
        </section>

        <section className="mb-12 sm:mb-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">
            TL;DR
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">
                Pick TrueCap if
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>
                  You want to underwrite 5+ deals/week without losing your
                  evening to spreadsheet maintenance.
                </li>
                <li>You need a tool that works on your phone at a showing.</li>
                <li>You share analyses with partners / lenders / clients.</li>
                <li>
                  You want one documented calculation engine instead of
                  maintaining formulas.
                </li>
                <li>
                  You want address-first HUD rent and FRED rate benchmarks with
                  a manual local tax input.
                </li>
                <li>
                  You want PDF reports without manual print-to-PDF formatting.
                </li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Stick with Excel if
              </p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>
                  You analyze fewer than 5 deals/year and have a working
                  template.
                </li>
                <li>
                  You have a highly customized model (waterfalls, complex
                  partnership splits, exotic financing).
                </li>
                <li>You need offline use.</li>
                <li>
                  You&apos;re a financial analyst by training — Excel is muscle
                  memory.
                </li>
                <li>
                  You require complete data privacy (everything stays on your
                  machine).
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            Feature-by-feature
          </h2>
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">
            Where each wins, where it&apos;s a wash.
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
                    Excel / Sheets
                  </th>
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row) => (
                  <tr
                    key={row.feature}
                    className="border-t border-border align-top"
                  >
                    <td className="py-3 px-3 text-sm font-semibold text-foreground">
                      {row.feature}
                    </td>
                    <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                      <div className="flex items-start gap-2">
                        <WinnerBadge winner={row.winner} side="truecap" />
                        <span>{row.truecap}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                      <div className="flex items-start gap-2">
                        <WinnerBadge winner={row.winner} side="excel" />
                        <span>{row.excel}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">
            When a structured workflow may fit better
          </h2>
          <ul className="space-y-2 text-sm sm:text-base leading-relaxed text-foreground">
            <li>
              <strong>You repeat the same underwriting workflow.</strong>{" "}
              Structured inputs can reduce template maintenance while preserving
              editable assumptions.
            </li>
            <li>
              <strong>You share results without sharing formulas.</strong>{" "}
              TrueCap&apos;s free read-only link separates review access from
              model editing.
            </li>
            <li>
              <strong>You work from a phone.</strong> The responsive interface
              is designed for smaller screens; spreadsheet usability depends on
              the workbook.
            </li>
            <li>
              <strong>You want one calculation definition.</strong> TrueCap
              applies the same documented engine each time, while a spreadsheet
              remains as reliable as its formulas, inputs, and review process.
            </li>
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            Want to sanity-check one formula before you trust a whole sheet?
            Check your payment row against the released{" "}
            <Link
              href="/tools/mortgage-payment-calculator"
              className="font-semibold text-primary hover:underline"
            >
              mortgage payment calculator
            </Link>
            , then read your sheet&apos;s cap rate and coverage ratio back
            against the worked examples in{" "}
            <Link
              href="/blog/how-to-calculate-cap-rate"
              className="font-semibold text-primary hover:underline"
            >
              how to calculate cap rate
            </Link>{" "}
            and{" "}
            <Link
              href="/blog/how-to-calculate-dscr"
              className="font-semibold text-primary hover:underline"
            >
              how to calculate DSCR
            </Link>
            . When you want those numbers produced from an address instead of
            typed in, the{" "}
            <Link
              href="/"
              className="font-semibold text-primary hover:underline"
            >
              full TrueCap analyzer
            </Link>{" "}
            computes them on one documented engine. And if you&apos;re building
            the income statement by hand, our guide to a{" "}
            <Link
              href="/blog/rental-property-pro-forma-explained"
              className="font-semibold text-primary hover:underline"
            >
              rental property pro forma
            </Link>{" "}
            walks through every line a spreadsheet should have.
          </p>
        </section>

        <ComparisonFaq competitorName="Excel" items={EXCEL_FAQ} />

        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            Try TrueCap free.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            Try the structured workflow with one property, review every
            assumption, and keep Excel for any custom modeling that TrueCap does
            not support.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              <Calculator className="w-4 h-4" />
              Run a deal now
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 border border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground px-4 py-2.5 rounded-xl font-bold hover:bg-primary-foreground/20 transition-colors"
            >
              See Pro pricing
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground leading-relaxed">
          Other comparisons:{" "}
          <Link
            href="/vs/dealcheck"
            className="font-bold text-foreground hover:underline"
          >
            vs DealCheck
          </Link>
          {" · "}
          <Link
            href="/vs/biggerpockets-calculator"
            className="font-bold text-foreground hover:underline"
          >
            vs BiggerPockets
          </Link>
          {" · "}
          <Link
            href="/vs/stessa"
            className="font-bold text-foreground hover:underline"
          >
            vs Stessa
          </Link>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}

const EXCEL_FAQ: FaqItem[] = [
  {
    question: "Is TrueCap better than an Excel rental analysis template?",
    answer: (
      <>
        It depends on the workflow. TrueCap provides structured inputs, a
        documented calculation engine, read-only sharing, and a
        mobile-responsive interface. A reviewed spreadsheet can be more flexible
        for custom acquisition models, partnership waterfalls, or financing
        structures TrueCap does not support.
      </>
    ),
    plainTextAnswer:
      "It depends. TrueCap provides structured inputs, one documented calculation engine, read-only sharing, and a mobile-responsive interface. A reviewed spreadsheet can be more flexible for custom models TrueCap does not support.",
  },
  {
    question: "Why is a spreadsheet risky for underwriting rental deals?",
    answer: (
      <>
        A spreadsheet requires its own controls. Review formulas and named
        ranges, protect calculation cells, document assumptions, manage
        versions, and test the workbook after changes. Mobile usability also
        depends on the workbook&apos;s complexity and layout.
      </>
    ),
    plainTextAnswer:
      "A spreadsheet requires controls: review formulas, protect calculation cells, document assumptions, manage versions, and test after changes. Mobile usability depends on workbook complexity and layout.",
  },
  {
    question: "Can I import my Excel rental template into TrueCap?",
    answer: (
      <>
        Not directly — TrueCap uses a structured form so the inputs match the
        engine. Enter price, rent, financing, vacancy, management, tax, and
        insurance in the structured form. Address lookup supplies editable HUD
        rent and FRED rate screening benchmarks; property tax stays manual.
        Replace them with property-specific evidence.
      </>
    ),
    plainTextAnswer:
      "Not directly. TrueCap uses a structured form and supplies editable HUD rent and FRED rate screening benchmarks while keeping property tax manual. Replace all starting assumptions with property-specific evidence.",
  },
  {
    question:
      "Does TrueCap handle BRRRR and fix-and-flip like my spreadsheet does?",
    answer: (
      <>
        Not currently. TrueCap&apos;s released rehab, ARV, and rental tools can
        support individual inputs, but the integrated BRRRR and fix-and-flip
        lifecycle models are disabled. Keep a reviewed spreadsheet or use
        another released product for dated contributions, renovation financing,
        refinance or sale proceeds, and project-level returns.
      </>
    ),
    plainTextAnswer:
      "Not currently. TrueCap offers separate rehab, ARV, and stabilized-rental tools, but its integrated BRRRR and fix-and-flip lifecycle models are disabled. Use a reviewed spreadsheet or another released product for the complete project ledger.",
  },
  {
    question: "What if I still want to use Excel after trying TrueCap?",
    answer: (
      <>
        That can be the right choice. Keep a reviewed Excel template for edge
        cases such as partnership splits, syndication waterfalls, or custom debt
        structures the underwriting engine doesn&apos;t model. You TrueCap
        includes PDF reports with Pro for sharing a review snapshot while
        keeping the spreadsheet as the custom back-office model.
      </>
    ),
    plainTextAnswer:
      "That can be the right choice for edge cases such as partnership splits, syndication waterfalls, or custom debt. TrueCap includes PDFs with Pro for sharing a review snapshot.",
  },
];

function WinnerBadge({
  winner,
  side,
}: {
  winner: Verdict;
  side: "truecap" | "excel";
}) {
  if (winner === "tie")
    return (
      <Minus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
    );
  if (winner === side)
    return (
      <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-green)]" />
    );
  return <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />;
}
