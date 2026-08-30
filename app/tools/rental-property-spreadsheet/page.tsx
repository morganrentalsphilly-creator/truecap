/**
 * Public SEO landing page for the free downloadable rental property
 * spreadsheet — the un-gated answer to a SERP the incumbents lock
 * behind email forms.
 *
 * Strategy mirrors /tools/cap-rate-calculator, with one deliberate
 * difference: there is no calculator widget and no calculator-registry
 * entry. The "tool" is a real .xlsx at
 * public/downloads/truecap-rental-property-analyzer.xlsx, offered as a
 * direct download — no email, no signup. Long-form content (~1,200
 * words) targets "rental property spreadsheet" / "rental property
 * excel template" + adjacent long-tail keywords, and the page doubles
 * as the link-safe asset for forum/Reddit answers where a SaaS link
 * would be modded out.
 *
 * Core screening conventions in the spreadsheet match the released
 * buy-and-hold workflow: NOI/DSCR exclude the CapEx reserve, cash flow
 * includes it, and P&I uses PMT. The workbook is intentionally narrower
 * than the web analyzer and its scope is disclosed on the page and in-file.
 *
 * NOTE for sitemap/nav: because this page has no calculator-registry
 * entry, it is listed manually in app/sitemap.ts and linked manually
 * from the site footer. If the file is regenerated, keep the defaults
 * in sync with lib/investcalc-schema.ts defaultValues.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check, Download, FileSpreadsheet } from "lucide-react";
import { getSiteUrl } from "@/lib/site-url";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";
import { ToolEmbedInvite } from "@/components/marketing/tool-embed-invite";

import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";

const DOWNLOAD_PATH = "/downloads/truecap-rental-property-analyzer.xlsx";

export const metadata: Metadata = {
  title: "Free Rental Property Analysis Spreadsheet",
  description:
    "Download a free Excel rental property analysis spreadsheet with cash flow, cap rate, cash-on-cash return, DSCR, and a 10-year projection. No email required.",
  keywords: [
    "rental property spreadsheet",
    "rental property excel template",
    "rental property analysis spreadsheet",
    "free rental property spreadsheet",
    "rental property calculator excel",
    "real estate investment spreadsheet",
    "rental cash flow spreadsheet",
  ],
  alternates: { canonical: "/tools/rental-property-spreadsheet" },
  openGraph: {
    title: "Free Rental Property Analysis Spreadsheet | TrueCap",
    description:
      "Download a free Excel rental property analysis spreadsheet with cash flow, cap rate, cash-on-cash return, DSCR, and a 10-year projection. No email required.",
    url: "/tools/rental-property-spreadsheet",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap free rental property spreadsheet",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Rental Property Analysis Spreadsheet | TrueCap",
    description:
      "Download a free Excel rental property analysis spreadsheet with cash flow, cap rate, cash-on-cash return, DSCR, and a 10-year projection. No email required.",
    images: ["/home.jpg"],
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "Is the spreadsheet really free — no email required?",
    a: "Yes. The download button links straight to the .xlsx file. There's no email form, no signup, no trial, and nothing inside the file expires or locks. It's a plain Excel workbook you keep forever, share with partners, and edit however you like.",
  },
  {
    q: "Does it work in Google Sheets?",
    a: "Yes. Upload the .xlsx to Google Drive and open it with Google Sheets (or in Sheets use File → Import → Upload). Every formula in the workbook — PMT for the mortgage payment, plus plain arithmetic for NOI, cap rate, cash-on-cash, and DSCR — is standard and converts cleanly. It also opens in Apple Numbers and LibreOffice.",
  },
  {
    q: "What's actually in the spreadsheet?",
    a: "Three tabs. Deal Analyzer: type price, rent, financing, and expense assumptions and get monthly cash flow, NOI, cap rate, cash-on-cash return, and DSCR from live formulas; all-cash DSCR displays 'N/A — no debt service.' 10-Year Projection: rent and expenses compound at editable growth rates against a fixed mortgage payment. Quick Reference: definitions and screening benchmarks for every metric, plus the bands TrueCap uses for selected-rule fit.",
  },
  {
    q: "Why do NOI and DSCR exclude the CapEx reserve?",
    a: "The workbook follows the lender-standard convention, the same one the TrueCap analyzer uses: NOI and DSCR exclude the CapEx reserve, because CapEx is a below-the-line return-of-capital reserve rather than an operating expense — but cash flow still subtracts it, because the roof fund is real money leaving your account. Many free templates mix these up, which quietly overstates DSCR or understates cash flow.",
  },
  {
    q: "What does the 10-year projection assume?",
    a: "By default, rent and operating expenses each grow 2.5% per year (both editable) while the principal-and-interest payment stays fixed. It's deliberately simple: PMI changes, principal paydown, and appreciation are not modeled in the spreadsheet. The TrueCap analyzer adds a scheduled loan balance and a 10-year cash-flow and equity planning view; it does not currently expose a tax-specific module.",
  },
  {
    q: "Spreadsheet or the TrueCap analyzer — which should I use?",
    a: "Use the spreadsheet when you want full control of every cell or need to work offline. Use the analyzer when you want speed: type an address and it pre-fills editable, labeled screening benchmarks, then layers on PMI modeling, 10-year cash-flow and equity projections, sensitivity, Offer Ceiling, selected-rule fit, and a secondary Screening Index. Neither output is lender approval or investment advice.",
  },
  {
    q: "Can I share or modify the file?",
    a: "Yes — it's yours. Copy it per deal, add tabs, change assumptions, send it to your agent or lender. If you find the copy-a-file-per-deal workflow getting old, that's the exact problem the TrueCap analyzer exists to solve: saved deals, side-by-side compare, and share links instead of email attachments.",
  },
];

export default function RentalPropertySpreadsheetPage() {
  const siteUrl = getSiteUrl();

  const spreadsheetLd = {
    "@context": "https://schema.org",
    "@type": "SpreadsheetDigitalDocument",
    name: "TrueCap Rental Property Analyzer (Excel spreadsheet)",
    url: `${siteUrl}/tools/rental-property-spreadsheet`,
    encodingFormat:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    isAccessibleForFree: true,
    dateModified: "2026-08-27",
    description:
      "Free rental property analysis spreadsheet: monthly cash flow, NOI, cap rate, cash-on-cash, DSCR, 10-year projection, and a metric quick-reference. Direct download, no email gate.",
    publisher: {
      "@type": "Organization",
      name: "TrueCap",
      url: "https://usetruecap.com",
    },
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <ToolBreadcrumbSchema
        toolPath="/tools/rental-property-spreadsheet"
        toolName="Rental property spreadsheet"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(spreadsheetLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <div className="min-h-screen bg-background">
        <main
          id="main"
          className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12"
        >
          {/* H1 */}
          <header className="mb-6 sm:mb-8">
            <Link
              href="/tools"
              className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
            >
              ← TrueCap free tools
            </Link>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 leading-tight">
              Free Rental Property Spreadsheet
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-2 leading-relaxed">
              A real Excel deal analyzer — cash flow, cap rate, cash-on-cash,
              DSCR, and a 10-year projection, with honest expense reserves built
              in. Direct download. No email gate, no signup, no &ldquo;free
              trial.&rdquo;
            </p>
          </header>

          {/* Download card — this page's "calculator above the fold" */}
          <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
              <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <FileSpreadsheet className="h-7 w-7 text-primary" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl font-extrabold text-foreground">
                  TrueCap Rental Property Analyzer
                </h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  .xlsx · 3 tabs · works in Excel, Google Sheets, Apple Numbers,
                  and LibreOffice. Uses TrueCap&apos;s core buy-and-hold
                  screening conventions.
                </p>
              </div>
              <a
                href={DOWNLOAD_PATH}
                download
                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity shrink-0"
              >
                <Download className="w-4 h-4" aria-hidden />
                Download the spreadsheet
              </a>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              No email required — the button downloads the file directly. Prefer
              Google Sheets? Upload the file to Drive and open it; every formula
              converts cleanly.
            </p>
          </section>

          {/* Long-form content */}
          <article className="prose prose-slate max-w-none mt-10 sm:mt-12 [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground">
            <h2 className="text-2xl sm:text-3xl">
              Why this spreadsheet is un-gated
            </h2>
            <p>
              Search for &ldquo;rental property spreadsheet&rdquo; and nearly
              every result makes you trade your email address for an Excel file
              — then drips marketing at you for months. We&apos;d rather you
              just have the tool. If the spreadsheet is genuinely useful, some
              of you will eventually want the faster version (
              <Link
                href="/"
                className="text-primary font-semibold hover:underline"
              >
                type an address, get the same analysis in 60 seconds
              </Link>
              ), and the rest of you got a good spreadsheet for free.
              That&apos;s the whole model.
            </p>
            <p>
              It&apos;s also not a teaser. The workbook is a transparent,
              formula-driven buy-and-hold screen with its limits disclosed
              in-file. The web analyzer adds broader inputs and workflows; it
              does not make this workbook&apos;s model more complete than it is.
            </p>

            <h2 className="text-2xl sm:text-3xl">What&apos;s in each tab</h2>
            <h3>Tab 1 — Deal Analyzer</h3>
            <p>
              The core underwrite on one screen. You edit the inputs — purchase
              price, down payment, interest rate, loan term, monthly rent, and
              the full expense set (property tax, insurance, vacancy,
              management, maintenance, CapEx, HOA, utilities) — and live
              formulas compute:
            </p>
            <ul>
              <li>
                <strong>Monthly and annual cash flow</strong> — rent minus every
                operating expense minus the mortgage payment (P&amp;I via the
                standard PMT formula), including PMI when the down payment is
                under 20%.
              </li>
              <li>
                <strong>NOI and cap rate</strong> — the unleveraged view of the
                property, for comparing deals regardless of financing.
              </li>
              <li>
                <strong>Cash-on-cash return</strong> — annual cash flow against
                the actual cash you bring (down payment plus closing costs).
              </li>
              <li>
                <strong>DSCR</strong> — the coverage ratio lenders underwrite to
                for financed deals. An all-cash purchase renders
                <strong> N/A — no debt service</strong> instead of a false zero.
              </li>
            </ul>
            <p>
              The defaults are honest, not optimistic: 5% vacancy, 8%
              management, 10% maintenance, and a 5% CapEx reserve — the same
              starting assumptions the TrueCap analyzer uses. Zero them out if
              you must, but know that&apos;s the underwrite you&apos;re
              changing, not the formula.
            </p>

            <h3>Tab 2 — 10-Year Projection</h3>
            <p>
              Year-by-year rent, operating expenses, NOI, debt service, and
              cumulative cash flow, with rent and expenses each compounding at
              an editable growth rate (2.5% per year by default) against a fixed
              mortgage payment. It answers the question a single-month snapshot
              can&apos;t: does this deal get better or worse as it ages?
            </p>

            <h3>Tab 3 — Quick Reference</h3>
            <p>
              Plain-English definitions and &ldquo;what&apos;s a good
              number&rdquo; benchmarks for every metric in the workbook — cap
              rate, cash-on-cash, DSCR, NOI, the 1% rule, and each expense
              reserve — plus the exact bands TrueCap&apos;s selected-rule
              classifier uses to group modeled results as Strong, Solid, Mixed,
              Marginal, or Negative. It&apos;s the tab to hand someone who asks
              &ldquo;wait, what&apos;s DSCR?&rdquo;
            </p>

            <h2 className="text-2xl sm:text-3xl">A worked example</h2>
            <p>
              The spreadsheet ships pre-filled with the same example deal we
              underwrite in the{" "}
              <Link
                href="/#main"
                className="text-primary font-semibold hover:underline"
              >
                TrueCap analyzer
              </Link>
              : a $250,000 single-family rental at $2,400/mo rent, bought with
              20% down at 6.75% on a 30-year loan. With honest reserves, that
              deal produces roughly <strong>$97/mo of cash flow</strong> — not
              the $770/mo you&apos;d get by skipping vacancy, management,
              maintenance, and CapEx the way many listings do. The same workbook
              shows the split lenders care about: about $18,200 of NOI, a 7.3%
              cap rate, and a DSCR of 1.17 — positive cash flow, but below the
              ≥1.25 most lenders want. That&apos;s exactly the kind of nuance a
              one-number napkin analysis hides, and exactly what the spreadsheet
              surfaces by default.
            </p>

            <h2 className="text-2xl sm:text-3xl">
              The conventions, stated plainly
            </h2>
            <p>
              Free templates disagree wildly on where the CapEx reserve belongs,
              and the disagreement quietly changes your DSCR. This workbook
              follows the lender-standard convention — the same one used across
              TrueCap and documented in our{" "}
              <Link
                href="/methodology"
                className="text-primary font-semibold hover:underline"
              >
                methodology
              </Link>
              :
            </p>
            <ul>
              <li>
                <Link
                  href="/glossary/noi"
                  className="text-primary font-semibold hover:underline"
                >
                  NOI
                </Link>{" "}
                and{" "}
                <Link
                  href="/glossary/dscr"
                  className="text-primary font-semibold hover:underline"
                >
                  DSCR
                </Link>{" "}
                <strong>exclude</strong> the CapEx reserve — it&apos;s a
                below-the-line return-of-capital reserve, not an operating
                expense.
              </li>
              <li>
                <Link
                  href="/glossary/monthly-cash-flow"
                  className="text-primary font-semibold hover:underline"
                >
                  Cash flow
                </Link>{" "}
                <strong>includes</strong> the CapEx reserve — the roof fund is
                real money leaving your account every month.
              </li>
              <li>
                PMI applies on financed deals under 20% down and reduces cash
                flow, but it is not part of the debt service used for DSCR.
              </li>
            </ul>
            <p>
              Every cell that embodies one of these choices says so in its
              label, so you never have to reverse-engineer the formula bar to
              know what you&apos;re looking at.
            </p>

            <h2 className="text-2xl sm:text-3xl">
              Or skip the spreadsheet — type an address instead
            </h2>
            <p>
              Here&apos;s the honest trade-off. A spreadsheet gives you total
              control, works offline, and produces a file you can email to a
              lender. What it can&apos;t do is fill itself in: you still hunt
              down market rent, the county tax rate, and current interest rates
              for every deal, and you maintain a copy per property.
            </p>
            <p>
              The{" "}
              <Link
                href="/"
                className="text-primary font-semibold hover:underline"
              >
                TrueCap analyzer
              </Link>{" "}
              starts where the spreadsheet ends: type an address and it can
              pre-fill editable HUD area rent and the FRED owner-occupied rate
              benchmark. Enter a local property-tax bill or reviewed rate
              manually; then it runs the same math and adds the parts a
              spreadsheet makes painful — PMI drop-off modeling, 10-year
              projections with principal paydown and appreciation, downside
              sensitivity, Offer Ceiling, side-by-side deal comparison, and
              selected-rule fit and a secondary Screening Index. It&apos;s free
              to start, and because the conventions match, your spreadsheet
              numbers carry over exactly. For the longer version of this
              comparison, see{" "}
              <Link
                href="/vs/excel"
                className="text-primary font-semibold hover:underline"
              >
                TrueCap vs. Excel
              </Link>
              .
            </p>

            <h2 className="text-2xl sm:text-3xl">Frequently asked questions</h2>
            <div className="not-prose space-y-4">
              {FAQS.map((f) => (
                <details
                  key={f.q}
                  className="bg-card border border-border rounded-lg p-4 group"
                >
                  <summary className="font-semibold text-foreground cursor-pointer list-none flex items-start justify-between gap-3">
                    <span>{f.q}</span>
                    <span className="text-muted-foreground text-xl leading-none group-open:rotate-45 transition-transform">
                      +
                    </span>
                  </summary>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </article>

          {/* Second download prompt after the content */}
          <section className="mt-10 sm:mt-12 rounded-2xl border border-border bg-card p-6 sm:p-8 text-center">
            <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mb-2">
              Grab the spreadsheet
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-5">
              Direct .xlsx download — no email, no signup. Yours to keep, copy,
              and share.
            </p>
            <a
              href={DOWNLOAD_PATH}
              download
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              <Download className="w-4 h-4" aria-hidden />
              Download the spreadsheet
            </a>
          </section>

          {/* CTA */}
          <section className="mt-10 sm:mt-12 rounded-2xl bg-primary text-primary-foreground p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-extrabold mb-2">
              Run the full analysis — free
            </h2>
            <p className="text-sm sm:text-base opacity-90 mb-4">
              The spreadsheet is the manual version. TrueCap takes an address,
              can pre-fill editable rent and rate benchmarks, keeps property tax
              as a manual local input, runs the same math, and adds PMI
              modeling, 10-year cash-flow and equity projections, sensitivity,
              Offer Ceiling, and a secondary Screening Index.
            </p>
            <ul className="text-sm space-y-1.5 mb-5 opacity-90">
              {[
                "Cash flow, cap rate, CoC, DSCR — auto-calculated",
                "Editable HUD rent + FRED rate benchmarks; manual local property tax",
                "10-year projection with rent + expense growth (Pro)",
                "Downside sensitivity and Offer Ceiling (Pro)",
                "Screening Index with a factor breakdown for triage",
                "Free to start — no credit card",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              Open the full TrueCap analyzer
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </section>

          {/* Footer */}
          {/* Backlink engine — quiet, collapsed, renders nothing if this
              tool has no embeddable widget. See the component header. */}
          <ToolEmbedInvite slug="rental-property-spreadsheet" />

          <ToolsConversionCta
            calculatorName="Rental property spreadsheet"
            hook="TrueCap's full analyzer uses the same core buy-and-hold conventions from an address—labeled HUD rent and FRED rate benchmarks, manual local property tax, plus PMI, released projections, sensitivity, and Offer Ceiling. Save your work, compare deals, and share a link."
          />

          <footer className="mt-12 pt-8 border-t border-border text-center text-xs text-muted-foreground">
            Built with{" "}
            <Link
              href="/"
              className="font-bold text-foreground hover:underline"
            >
              TrueCap
            </Link>{" "}
            — transparent, editable rental analysis, free to start.
          </footer>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
