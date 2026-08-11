/**
 * /vs/excel — TrueCap vs Excel/Google Sheets for rental analysis.
 *
 * Target queries: "rental property excel template", "rental analysis
 * spreadsheet", "excel vs calculator", "best rental spreadsheet". Massive
 * search volume — Excel is the default tool most new investors start with.
 */

import { TRIAL_LABEL } from "@/lib/trial";
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
import { ComparisonFaq, type FaqItem } from "@/components/marketing/comparison-faq";
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
    description: "Side-by-side: speed, accuracy, mobile, sharing, what each does best.",
    url: "/vs/excel",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap vs Excel" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Verdict = "truecap" | "excel" | "tie";
type Row = { feature: string; truecap: ReactNode; excel: string; winner: Verdict };

const MATRIX: Row[] = [
  { feature: "Time to first underwrite",          truecap: "60 seconds — paste address, auto-fills everything",                      excel: "30-60 minutes — gather data, type formulas, debug",                       winner: "truecap" },
  { feature: "Auto-fill from address",            truecap: "HUD rent + FRED rate + county property tax populate live",                excel: "Manual entry — copy/paste from Zillow/county sites",                      winner: "truecap" },
  { feature: "Formula error risk",                truecap: "Engine validated; same math runs across all sessions",                    excel: "High — one cell break + you trust the wrong number",                      winner: "truecap" },
  { feature: "Mobile usable",                     truecap: "Mobile-first responsive — works at the showing on your phone",            excel: "Spreadsheet on mobile = pinch-zoom misery",                                winner: "truecap" },
  { feature: "Shareable with team / client",      truecap: "Free — read-only public link; Pro adds co-branding",                              excel: "Email a .xlsx file + hope they open it correctly",                          winner: "truecap" },
  { feature: "Live updates as you change inputs", truecap: "Instant recalc, visual indicators of impact",                             excel: "Recalc works but you have to track which cells you changed",              winner: "truecap" },
  { feature: "10-year projection visualization",  truecap: "Built-in chart, side-by-side scenarios",                                  excel: "Possible with chart wizard but takes 20+ min of setup",                    winner: "truecap" },
  { feature: "Sensitivity analysis (stress test)",truecap: "Pro — rent ±10%, vacancy ±5pp, rates ±1pp in one view",                   excel: "Possible with Data Table feature but most users don't",                    winner: "truecap" },
  { feature: "Customization to weird scenarios",  truecap: "Standard inputs cover 95%; one-off scenarios harder to model",            excel: "Fully customizable — you can model anything you can think of",            winner: "excel" },
  { feature: "Free to start",                     truecap: "Yes — unlimited free analyses, no signup",                                 excel: "Yes if you have Excel/Sheets",                                            winner: "tie" },
  { feature: "Offline use",                       truecap: "Requires internet",                                                        excel: "Works offline once file is open",                                          winner: "excel" },
  { feature: "Audit trail / version history",     truecap: "Pro saves history of saved deals",                                         excel: "Manual file naming or Google Sheets version history",                     winner: "tie" },
  { feature: "Glossary / explanation of metrics", truecap: (<>Inline tooltips + a <Link href="/glossary" className="font-semibold text-primary hover:underline">real estate glossary</Link> with full definitions per term</>),              excel: "Whatever you remember from your last research session",                    winner: "truecap" },
  { feature: "PDF export for lenders / partners", truecap: "Pro — branded multi-page report",                                          excel: "Print → PDF, manual formatting",                                          winner: "truecap" },
  { feature: "Tax strategy modeling",             truecap: "Pro — bracket-aware depreciation + after-tax CF",                          excel: "Possible if you build the formulas",                                       winner: "truecap" },
  { feature: "BRRRR / fix-and-flip analyzers",    truecap: "Built-in dedicated workflows",                                             excel: "Custom build per deal type",                                              winner: "truecap" },
  { feature: "Cost",                              truecap: "Free or $25/mo annual Pro",                                            excel: "$0 (if you have Office or Google Workspace)",                              winner: "tie" },
];

export default function VsExcelPage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Excel vs TrueCap for Rental Analysis (2026)",
    url: `${siteUrl}/vs/excel`,
    description: "Side-by-side comparison of TrueCap and Excel/Google Sheets for rental analysis.",
    dateModified: "2026-06-01",
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <VsBreadcrumbSchema vsPath="/vs/excel" pageName="TrueCap vs Excel" />
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
            TrueCap vs Excel: <span className="text-primary">when is a spreadsheet still the right tool?</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Most investors start with an Excel template — usually a BiggerPockets template, sometimes one they built themselves. We built TrueCap because spreadsheets break, take forever, and don&apos;t survive contact with a real deal at a showing. But Excel still wins in certain cases.
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
          <p className="mt-3 text-xs text-muted-foreground">No card · No signup · Cancel anytime</p>
        </section>

        <section className="mb-12 sm:mb-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-3">TL;DR</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">Pick TrueCap if</p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You want to underwrite 5+ deals/week without losing your evening to spreadsheet maintenance.</li>
                <li>You need a tool that works on your phone at a showing.</li>
                <li>You share analyses with partners / lenders / clients.</li>
                <li>You don&apos;t want to debug formulas — you want validated math.</li>
                <li>You want auto-fill from address (HUD rent, FRED rate, county tax).</li>
                <li>You want PDF reports without manual print-to-PDF formatting.</li>
              </ul>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Stick with Excel if</p>
              <ul className="space-y-1.5 text-sm leading-relaxed text-foreground">
                <li>You analyze fewer than 5 deals/year and have a working template.</li>
                <li>You have a highly customized model (waterfalls, complex partnership splits, exotic financing).</li>
                <li>You need offline use.</li>
                <li>You&apos;re a financial analyst by training — Excel is muscle memory.</li>
                <li>You require complete data privacy (everything stays on your machine).</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">Feature-by-feature</h2>
          <p className="text-base text-muted-foreground mb-6 leading-relaxed">Where each wins, where it&apos;s a wash.</p>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Feature</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-primary">TrueCap</th>
                  <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Excel / Sheets</th>
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
                      <div className="flex items-start gap-2"><WinnerBadge winner={row.winner} side="excel" /><span>{row.excel}</span></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-12 sm:mb-16 rounded-2xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--brand-green)] mb-3">When investors actually switch from Excel</h2>
          <ul className="space-y-2 text-sm sm:text-base leading-relaxed text-foreground">
            <li><strong>&quot;I&apos;m analyzing 3+ deals per week.&quot;</strong> At that pace, the per-deal time savings from TrueCap (29 min/deal vs 60 sec) saves you 12+ hours a month. Pro pays for itself in week one.</li>
            <li><strong>&quot;I shared my spreadsheet with a partner and they broke it.&quot;</strong> Classic. Spreadsheets are fragile. TrueCap saved deals get a clean shareable URL — partners see the analysis, can&apos;t accidentally break the formula.</li>
            <li><strong>&quot;I lost a deal because I couldn&apos;t pull up numbers at the showing.&quot;</strong> Mobile is where deals are made now. Excel on mobile is unusable; TrueCap works in your pocket.</li>
            <li><strong>&quot;I realized I&apos;d been using the wrong cap rate formula for 6 months.&quot;</strong> This happens. Engine-based tools validate the math once; spreadsheet errors compound across every deal until you find them.</li>
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-foreground">
            Want to sanity-check one formula before you trust a whole sheet? Run the standalone{" "}
            <Link href="/tools/cap-rate-calculator" className="font-semibold text-primary hover:underline">cap rate calculator</Link>
            {" "}or{" "}
            <Link href="/tools/dscr-calculator" className="font-semibold text-primary hover:underline">DSCR calculator</Link>
            {" "}— same validated engine as the full analyzer. And if you&apos;re building the income statement by hand, our guide to a{" "}
            <Link href="/blog/rental-property-pro-forma-explained" className="font-semibold text-primary hover:underline">rental property pro forma</Link>
            {" "}walks through every line a spreadsheet should have.
          </p>
        </section>

        <ComparisonFaq competitorName="Excel" items={EXCEL_FAQ} />

        <section className="mb-12 sm:mb-16 rounded-2xl bg-primary p-6 sm:p-8 text-primary-foreground">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">Try TrueCap free.</h2>
          <p className="text-sm sm:text-base opacity-90 mb-5 max-w-2xl">
            Underwrite your next deal in 60 seconds. If you still prefer Excel after that, no harm done — keep your spreadsheet. But most investors who try TrueCap once stop opening their template.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity">
              <Calculator className="w-4 h-4" />Run a deal now
            </Link>
            <Link href="/pricing" className="inline-flex items-center gap-2 border border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground px-4 py-2.5 rounded-xl font-bold hover:bg-primary-foreground/20 transition-colors">
              Start a {TRIAL_LABEL}<ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        <footer className="border-t border-border pt-6 text-sm text-muted-foreground leading-relaxed">
          Other comparisons:{" "}
          <Link href="/vs/dealcheck" className="font-bold text-foreground hover:underline">vs DealCheck</Link>{" · "}
          <Link href="/vs/biggerpockets-calculator" className="font-bold text-foreground hover:underline">vs BiggerPockets</Link>{" · "}
          <Link href="/vs/stessa" className="font-bold text-foreground hover:underline">vs Stessa</Link>
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
        For most investors, yes — TrueCap removes the three big risks
        spreadsheets carry: formula errors, broken sharing, and bad
        mobile UX. A calc engine validates the math once and reuses it
        on every deal. Spreadsheets compound errors silently across
        deals until you find them. That said, if you have a specific
        workflow Excel handles better (heavy custom acquisition
        modeling, joint-venture splits), keep your sheet for that and
        use TrueCap for the standard underwrite.
      </>
    ),
    plainTextAnswer:
      "Yes — TrueCap removes Excel's three big risks: formula errors, broken sharing, and bad mobile UX. The calc engine is validated once and reused on every deal. Spreadsheets compound errors silently. Keep Excel for heavy custom modeling; use TrueCap for the standard underwrite.",
  },
  {
    question: "Why is a spreadsheet risky for underwriting rental deals?",
    answer: (
      <>
        Three reasons. First, formula errors — a wrong cap rate
        formula compounds across every deal you analyze with that
        sheet, sometimes for months. Second, version drift — partners,
        agents, and lenders all get slightly different copies and
        accidentally overwrite formulas. Third, mobile is unusable —
        the moment you&apos;re at a showing trying to run numbers on
        your phone, the spreadsheet is dead weight.
      </>
    ),
    plainTextAnswer:
      "Three reasons: formula errors that compound silently across deals; version drift when partners/agents/lenders overwrite formulas in shared copies; and mobile is unusable for live underwriting at showings.",
  },
  {
    question: "Can I import my Excel rental template into TrueCap?",
    answer: (
      <>
        Not directly — TrueCap uses a structured form so the inputs
        match the engine. But the metrics that matter (price, rent,
        rate, term, vacancy, mgmt %, tax, insurance) take about 60
        seconds to type in, and the address auto-fill via HUD + FRED +
        state property tax handles the &quot;what number do I use?&quot;
        problem for you. Most spreadsheet users end up faster on
        TrueCap after the first 3–4 deals.
      </>
    ),
    plainTextAnswer:
      "Not directly — TrueCap uses a structured form. Inputs take about 60 seconds to type in, and address auto-fill (HUD rent, FRED rate, state property tax) handles the 'what number do I use?' problem. Most spreadsheet users are faster on TrueCap after 3–4 deals.",
  },
  {
    question: "Does TrueCap handle BRRRR and fix-and-flip like my spreadsheet does?",
    answer: (
      <>
        Yes — TrueCap has dedicated BRRRR and fix-and-flip analyzers
        with their own input forms, ARV-driven refi math, holding cost
        modeling, and profit/cash-out summaries. The Pro tier also
        includes a sensitivity grid (rent ±10%, vacancy ±5pp, rate
        ±1pp) and a max allowable offer solver — both extremely
        annoying to maintain in a spreadsheet.
      </>
    ),
    plainTextAnswer:
      "Yes — TrueCap has dedicated BRRRR and fix-and-flip analyzers with ARV-driven refi math, holding cost modeling, and profit/cash-out summaries. Pro also includes a sensitivity grid and max allowable offer solver — both annoying to maintain in Excel.",
  },
  {
    question: "What if I still want to use Excel after trying TrueCap?",
    answer: (
      <>
        Totally fine. Most TrueCap users keep one Excel template for
        edge cases — partnership splits, syndication waterfalls, custom
        debt structures the underwriting engine doesn&apos;t model. You
        can also export TrueCap analyses as PDF if you need a polished
        summary to share with a lender or partner while keeping the
        spreadsheet as your back-of-house model.
      </>
    ),
    plainTextAnswer:
      "Fine. Most TrueCap users keep one Excel template for edge cases like partnership splits, syndication waterfalls, or custom debt structures. TrueCap analyses also export to PDF for sharing with lenders or partners.",
  },
];

function WinnerBadge({ winner, side }: { winner: Verdict; side: "truecap" | "excel" }) {
  if (winner === "tie") return <Minus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />;
  if (winner === side) return <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--brand-green)]" />;
  return <X className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />;
}
