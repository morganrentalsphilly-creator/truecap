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
 *
 * Layout: the calculator page template (DESIGN.md "Components"; the 1% rule
 * calculator is the reference), with the download where a calculator's
 * widget sits: beside the H1 in PageHero, on the 2px ink rule (ToolFrame),
 * its link a plain 48px button. The guide runs in a 68ch reading column
 * (ArticleBody), the FAQ is ruled rows (FaqSection; the page keeps its own
 * FAQPage node), the second download prompt follows it on a rule in the
 * same column, and the page closes once on the heavy rule (CloseSection).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { getSiteUrl } from "@/lib/site-url";
import { ToolFrame } from "@/components/tools/tool-parts";
import { ToolsConversionCta } from "@/components/marketing/tools-conversion-cta";
import { ToolEmbedInvite } from "@/components/marketing/tool-embed-invite";
import {
  ARTICLE_META,
  ARTICLE_META_LINK,
  ArticleBody,
} from "@/components/marketing/article";
import { FaqSection } from "@/components/marketing/faq-section";
import {
  ActionRow,
  CloseSection,
  PageHero,
  UnderTitleAnalyzeLink,
} from "@/components/marketing/page-parts";
import { Section, SectionHeading } from "@/components/marketing/section";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { SiteFooter } from "@/components/marketing/site-footer";
import { ToolBreadcrumbSchema } from "@/components/marketing/tool-breadcrumb-schema";
import { Header } from "@/components/investcalc/header";
import { lastmodFor } from "@/lib/seo/lastmod";
import { JsonLd } from "@/components/seo/json-ld";
import { OPEN_GRAPH_BASE } from "@/lib/seo/open-graph-base";

const DOWNLOAD_PATH = "/downloads/truecap-rental-property-analyzer.xlsx";

export const metadata: Metadata = {
  title: "Free Rental Property Analysis Spreadsheet",
  description:
    "Download a free Excel rental property analysis spreadsheet with cash flow, cap rate, cash-on-cash return, DSCR, and a 10-year projection. No email needed.",
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
    ...OPEN_GRAPH_BASE,
    title: "Free Rental Property Analysis Spreadsheet | TrueCap",
    description:
      "Download a free Excel rental property analysis spreadsheet with cash flow, cap rate, cash-on-cash return, DSCR, and a 10-year projection. No email needed.",
    url: "/tools/rental-property-spreadsheet",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Rental Property Analysis Spreadsheet | TrueCap",
    description:
      "Download a free Excel rental property analysis spreadsheet with cash flow, cap rate, cash-on-cash return, DSCR, and a 10-year projection. No email needed.",
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
    a: "Three tabs. Deal Analyzer: type price, rent, financing, and expense assumptions and get monthly cash flow, NOI, cap rate, cash-on-cash return, and DSCR from live formulas; all-cash DSCR displays 'N/A — no debt service.' 10-Year Projection: rent and expenses compound at editable growth rates against a fixed mortgage payment. Quick Reference: definitions for every metric, a note on judging cap rate, cash-on-cash, cash flow and DSCR, plus the screening bands TrueCap uses to group a modeled result as Strong, Solid, Mixed, Marginal, or Negative.",
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
    a: "Use the spreadsheet when you want full control of every cell or need to work offline. Use the analyzer when you want speed: type an address and it pre-fills editable, labeled screening benchmarks, then layers on PMI modeling, 10-year cash-flow and equity projections, sensitivity, Offer Ceiling, Buy Box fit, and a Deal score.",
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
    dateModified: lastmodFor("/tools/rental-property-spreadsheet"),
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
    // relative + overflow-x-clip, as on the homepage: clips any sideways bleed
    // from a descendant without making a scroll container (sticky header ok).
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <ToolBreadcrumbSchema
        toolPath="/tools/rental-property-spreadsheet"
        toolName="Rental property spreadsheet"
      />
      <JsonLd data={spreadsheetLd} />
      <JsonLd data={faqLd} />

      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        {/* The download in the first screen, where a calculator's widget
            sits: beside the H1 from 1024px, under the lede on phones. The
            hub link is the visible half of the breadcrumb schema and sits
            under the H1, never above it. The one short analyzer link under
            the H1 is P2-80's; the page's own action is the download. */}
        <PageHero
          title="Free rental property spreadsheet"
          lede="A real Excel deal analyzer — cash flow, cap rate, cash-on-cash, DSCR, and a 10-year projection, with honest expense reserves built in. Direct download. No email gate, no signup, no “free trial.”"
          actions={<UnderTitleAnalyzeLink />}
          aside={
            // Download block — this page's "calculator above the fold"
            <ToolFrame aria-labelledby="spreadsheet-download-heading">
              <h2
                id="spreadsheet-download-heading"
                className="font-display text-balance text-h3-sm sm:text-2xl"
              >
                TrueCap Rental Property Analyzer
              </h2>
              <p className="mt-2 max-w-[52ch] text-pretty text-base leading-relaxed text-muted-foreground">
                .xlsx · 3 tabs · works in Excel, Google Sheets, Apple Numbers,
                and LibreOffice. Uses TrueCap&apos;s core buy-and-hold
                screening conventions.
              </p>
              <a
                href={DOWNLOAD_PATH}
                download
                className={cn(buttonVariants({ size: "cta" }), "mt-6 w-full sm:w-auto")}
              >
                Download the spreadsheet
              </a>
              <p className="mt-4 max-w-[52ch] text-pretty text-sm text-muted-foreground">
                No email required — the button downloads the file directly. Prefer
                Google Sheets? Upload the file to Drive and open it; every formula
                converts cleanly.
              </p>
            </ToolFrame>
          }
        >
          <p className={ARTICLE_META}>
            <IntentPrefetchLink href="/tools" className={ARTICLE_META_LINK}>
              Free tools
            </IntentPrefetchLink>
          </p>
        </PageHero>

        {/* rule="none": PageHero's bottom rule already separates the head. */}
        <Section rule="none">
          <article className="max-w-[68ch]">
            <ArticleBody>
            <h2>
              Why this spreadsheet is un-gated
            </h2>
            <p>
              Search for &ldquo;rental property spreadsheet&rdquo; and nearly
              every result makes you trade your email address for an Excel file
              — then drips marketing at you for months. We&apos;d rather you
              just have the tool. If the spreadsheet is genuinely useful, some
              of you will eventually want the faster version (
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                enter an address, the asking price and a bedroom count, and
                get the same analysis in 60 seconds
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

            <h2>What&apos;s in each tab</h2>
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
              starting assumptions the TrueCap analyzer uses. Property tax
              starts at 1.1% of the price, a placeholder to replace with the
              rate from the parcel&apos;s actual bill (annual bill ÷ price, as a
              percent). Zero the reserves out if you must, but know that&apos;s
              the underwrite you&apos;re changing, not the formula.
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
              Plain-English definitions for every metric in the workbook (cap
              rate, cash-on-cash, DSCR, NOI, the 1% rule, and each expense
              reserve), a note on judging cap rate, cash-on-cash, cash flow and
              DSCR, plus the exact screening bands TrueCap uses to group
              modeled results as Strong, Solid, Mixed, Marginal, or Negative.
              Those bands are a rule of thumb, not your Buy Box fit. It&apos;s
              the tab to hand someone who asks &ldquo;wait, what&apos;s
              DSCR?&rdquo;
            </p>

            <h2>A worked example</h2>
            <p>
              The spreadsheet ships with a worked example deal: a $250,000
              single-family rental at $2,400/mo rent, bought with 20% down at
              6.75% on a 30-year loan. With honest reserves, that
              deal produces roughly <strong>$97/mo of cash flow</strong> — not
              the $770/mo you&apos;d get by skipping vacancy, management,
              maintenance, and CapEx the way many listings do. The same workbook
              shows the split lenders care about: about $18,200 of NOI, a 7.3%
              cap rate, and a DSCR of 1.17 — positive cash flow, but below the
              ≥1.25 most lenders want. That&apos;s exactly the kind of nuance a
              one-number napkin analysis hides, and exactly what the spreadsheet
              surfaces by default.
            </p>

            <h2>
              The conventions, stated plainly
            </h2>
            <p>
              Free templates disagree wildly on where the CapEx reserve belongs,
              and the disagreement quietly changes your DSCR. This workbook
              follows the lender-standard convention — the same one used across
              TrueCap and documented in our{" "}
              <IntentPrefetchLink
                href="/methodology"
                className="tc-link"
              >
                methodology
              </IntentPrefetchLink>
              :
            </p>
            <ul>
              <li>
                <IntentPrefetchLink
                  href="/glossary/noi"
                  className="tc-link"
                >
                  NOI
                </IntentPrefetchLink>{" "}
                and{" "}
                <IntentPrefetchLink
                  href="/glossary/dscr"
                  className="tc-link"
                >
                  DSCR
                </IntentPrefetchLink>{" "}
                <strong>exclude</strong> the CapEx reserve — it&apos;s a
                below-the-line return-of-capital reserve, not an operating
                expense.
              </li>
              <li>
                <IntentPrefetchLink
                  href="/glossary/monthly-cash-flow"
                  className="tc-link"
                >
                  Cash flow
                </IntentPrefetchLink>{" "}
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

            <h2>
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
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              starts where the spreadsheet ends: type an address and it can
              pre-fill an editable HUD rent benchmark and the FRED owner-occupied rate
              benchmark. Enter a local property-tax bill or reviewed rate
              manually; then it runs the same math and adds the parts a
              spreadsheet makes painful — PMI drop-off modeling, 10-year
              projections with principal paydown and appreciation, downside
              sensitivity, Offer Ceiling, side-by-side deal comparison, and
              Buy Box fit and a Deal score. It&apos;s free
              to start, and because the conventions match, your spreadsheet
              numbers carry over exactly. For the longer version of this
              comparison, see{" "}
              <IntentPrefetchLink
                href="/vs/excel"
                className="tc-link"
              >
                TrueCap vs. Excel
              </IntentPrefetchLink>
              .
            </p>

            </ArticleBody>

            {/* The analyzer CTA where the guide hands off to TrueCap, inside
                the article, so the page closes once, on the CloseSection
                below. */}
            <ToolsConversionCta
              calculatorName="Rental property spreadsheet"
              hook="TrueCap's full analyzer uses the same core buy-and-hold conventions, starting from an address, the asking price and a bedroom count: labeled HUD rent and FRED rate benchmarks, manual local property tax, plus PMI, projections, sensitivity, and Offer Ceiling. Save your work, compare deals, and share a link."
            />

            {/* The page's FAQPage node is faqLd above, built from the same
                FAQS, so the section emits none of its own. */}
            <FaqSection
              id="spreadsheet-faq"
              variant="inline"
              heading="Frequently asked questions"
              items={FAQS}
              structuredData={false}
            />

            {/* Second download prompt after the content, in the reading
                column: a heading, one line and the same plain button. */}
            <section aria-labelledby="spreadsheet-grab-heading" className="mt-16">
              <SectionHeading id="spreadsheet-grab-heading">
                Grab the spreadsheet
              </SectionHeading>
              <p className="mt-3 max-w-[60ch] text-pretty text-lg leading-relaxed text-muted-foreground">
                Direct .xlsx download — no email, no signup. Yours to keep, copy,
                and share.
              </p>
              <a
                href={DOWNLOAD_PATH}
                download
                className={cn(buttonVariants({ size: "cta" }), "mt-6 w-full sm:w-auto")}
              >
                Download the spreadsheet
              </a>
            </section>

            {/* Backlink engine — quiet, collapsed, renders nothing if this
                tool has no embeddable widget (this page has none). See the
                component header. */}
            <ToolEmbedInvite slug="rental-property-spreadsheet" />
          </article>
        </Section>

        <CloseSection
          heading="Run the full analysis — free"
          headingId="spreadsheet-close-heading"
          lede="The spreadsheet is the manual version. TrueCap takes an address, can pre-fill editable rent and rate benchmarks, keeps property tax as a manual local input, runs the same math, and adds PMI modeling, 10-year cash-flow and equity projections, sensitivity, Offer Ceiling, and a Deal score."
          actions={
            <>
              <ul className="border-t-2 border-foreground">
                {[
                  "Cash flow, cap rate, CoC, DSCR — auto-calculated",
                  "Editable HUD rent + FRED rate benchmarks; manual local property tax",
                  "10-year projection with rent + expense growth (Pro)",
                  "Downside sensitivity and Offer Ceiling (included in your first decision, Pro after)",
                  "Deal score (0–100) with a factor breakdown",
                  "Free to start — no credit card",
                ].map((line) => (
                  <li
                    key={line}
                    className="border-b border-rule-soft py-3 text-pretty text-base"
                  >
                    {line}
                  </li>
                ))}
              </ul>
              <ActionRow className="mt-6">
                <Link
                  href="/analyze" prefetch={false}
                  className={buttonVariants({ size: "cta" })}
                >
                  Open the full TrueCap analyzer
                </Link>
              </ActionRow>
            </>
          }
        />
      </main>
      <SiteFooter />
    </div>
  );
}
