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
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { AuthorBio } from "@/components/marketing/author-bio";
import { BlogByline } from "@/components/marketing/blog-byline";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { ProductShot } from "@/components/marketing/product-shot";
import { SiteFooter } from "@/components/marketing/site-footer";
import { RelatedContent } from "@/components/marketing/related-content";
import { AnalyzeCtaLink } from "@/components/marketing/analyze-cta-link";
import {
  ComparisonFaq,
  type FaqItem,
} from "@/components/marketing/comparison-faq";
import { ActionRow, CloseSection } from "@/components/marketing/page-parts";
import { Section, SectionHeading } from "@/components/marketing/section";
import {
  VS_ACTIONS,
  VS_H1,
  VS_INTRO,
  VS_LEDE,
  VS_LINK_ROW,
  VS_NOTE,
  VS_PROSE,
  VS_SOURCES,
  VS_TLDR_GRID,
  VS_TLDR_LABEL,
  VS_TLDR_LIST,
  VsHero,
  VsMatrixTable,
} from "@/components/marketing/vs-page";
import { getSiteUrl } from "@/lib/site-url";
import { VsBreadcrumbSchema } from "@/components/marketing/vs-breadcrumb-schema";
import { buttonVariants } from "@/components/ui/button";
import { ScrollX } from "@/components/ui/scroll-x";
import { Header } from "@/components/investcalc/header";
import { lastmodFor } from "@/lib/seo/lastmod";
import { JsonLd } from "@/components/seo/json-ld";

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
  },
  twitter: { card: "summary_large_image" },
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
    excel: "Recalculates instantly; change tracking depends on the workbook",
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
    excel: "Possible with a Data Table or a scenario sheet you build",
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
    excel:
      "Desktop Excel works on local files; Google Sheets needs offline access turned on",
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
        <IntentPrefetchLink
          href="/glossary"
          className="tc-link"
        >
          real estate glossary
        </IntentPrefetchLink>{" "}
        with full definitions per term
      </>
    ),
    excel: "None built in; add your own notes or links",
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
    dateModified: lastmodFor("/vs/excel"),
    publisher: { "@id": `${siteUrl}/#organization` },
  };

  return (
    // relative + overflow-x-clip, as on the homepage and the /vs hub: no
    // descendant can make the phone page scroll sideways.
    <div className="relative overflow-x-clip">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={structuredData} />
      <VsBreadcrumbSchema vsPath="/vs/excel" pageName="TrueCap vs Excel" />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <VsHero>
          <h1 className={VS_H1}>
            TrueCap vs Excel:{" "}
            when is a spreadsheet still the right tool?
          </h1>
          <BlogByline />
          <p className={VS_LEDE}>
            You may already underwrite in an Excel or Google Sheets template.
            TrueCap offers a structured, mobile-friendly workflow with
            consistent calculations and editable screening benchmarks. A
            well-built, reviewed spreadsheet can still be the right tool for
            custom models.
          </p>
          <ActionRow className={VS_ACTIONS}>
            <AnalyzeCtaLink analyticsSource="vs_hero" className={buttonVariants({ size: "cta" })}>
              Try TrueCap free
            </AnalyzeCtaLink>
            <Link
              href="/pricing"
              className={buttonVariants({ variant: "outline", size: "cta" })}
            >
              See pricing
            </Link>
          </ActionRow>
          <p className={VS_NOTE}>
            Free analyzer: no card or signup
          </p>
        </VsHero>

        {/* Real product screenshot from the free sample deal, set as a
            document (no fake browser frame). */}
        <Section rule="none" rhythm="tight" aria-label="What the decision looks like">
          <ProductShot
            shot="verdict"
            frame="document"
            priority
            sizes="(min-width: 768px) 768px, 100vw"
            className="max-w-3xl"
            alt="TrueCap's decision view for the sample deal: the Offer Ceiling beside the asking price, cash flow after reserves, and DSCR"
            caption={<>Real output from the free sample deal. <Link href="/analyze?sample=1" prefetch={false} className="tc-link">Run it yourself</Link></>}
          />
        </Section>

        <Section rhythm="tight" aria-labelledby="vs-tldr-heading">
          <SectionHeading id="vs-tldr-heading">
            TL;DR
          </SectionHeading>
          <div className={VS_TLDR_GRID}>
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Pick TrueCap if
              </h3>
              <ul className={VS_TLDR_LIST}>
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
            <div className="min-w-0">
              <h3 className={VS_TLDR_LABEL}>
                Stick with Excel if
              </h3>
              <ul className={VS_TLDR_LIST}>
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
        </Section>

        <Section aria-labelledby="vs-matrix-heading">
          <SectionHeading id="vs-matrix-heading">
            Feature-by-feature
          </SectionHeading>
          <p className={VS_INTRO}>
            Where each wins, where it&apos;s a wash.
          </p>
          <ScrollX label="Comparison table" className="mt-8 max-w-5xl">
            <VsMatrixTable
              head={["Feature", "TrueCap", "Excel / Sheets"]}
              rows={MATRIX.map((row) => ({
                label: row.feature,
                truecap: row.truecap,
                competitor: row.excel,
                winner: row.winner === "excel" ? "competitor" : row.winner,
              }))}
            />
          </ScrollX>
          <p className={VS_SOURCES}>
            Excel details were checked against Microsoft&apos;s support pages
            for{" "}
            <a
              href="https://support.microsoft.com/en-us/office/calculate-multiple-results-by-using-a-data-table-e95e2487-6ca6-4413-ad12-77542a5ea50b"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              data tables
            </a>
            ,{" "}
            <a
              href="https://support.microsoft.com/en-us/office/view-previous-versions-of-office-files-5c1e076f-a9c9-41b8-8ace-f77b9642e2c2"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              version history
            </a>{" "}
            and{" "}
            <a
              href="https://support.microsoft.com/en-us/office/save-or-convert-to-pdf-or-xps-in-office-desktop-apps-d85416c5-7d77-4fd6-a216-6f4bf7c7c110"
              target="_blank"
              rel="noopener"
              className="tc-link"
            >
              PDF export
            </a>{" "}
            in October 2026. Google Sheets differs in places; check
            Google&apos;s own help pages.
          </p>
        </Section>

        <Section aria-labelledby="vs-fit-heading">
          <SectionHeading id="vs-fit-heading">
            When a structured workflow may fit better
          </SectionHeading>
          <div className={VS_PROSE}>
            <ul>
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
            <p>
              Want to sanity-check one formula before you trust a whole sheet?
              Check your payment row against the{" "}
              <IntentPrefetchLink
                href="/tools/mortgage-payment-calculator"
                className="tc-link"
              >
                mortgage payment calculator
              </IntentPrefetchLink>
              , then read your sheet&apos;s cap rate and coverage ratio back
              against the worked examples in{" "}
              <IntentPrefetchLink
                href="/blog/how-to-calculate-cap-rate"
                className="tc-link"
              >
                how to calculate cap rate
              </IntentPrefetchLink>{" "}
              and{" "}
              <IntentPrefetchLink
                href="/blog/how-to-calculate-dscr"
                className="tc-link"
              >
                how to calculate DSCR
              </IntentPrefetchLink>
              . When you want those numbers produced from an address instead of
              typed in, the{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                full TrueCap analyzer
              </Link>{" "}
              computes them on one documented engine. And if you&apos;re building
              the income statement by hand, our guide to a{" "}
              <IntentPrefetchLink
                href="/blog/rental-property-pro-forma-explained"
                className="tc-link"
              >
                rental property pro forma
              </IntentPrefetchLink>{" "}
              walks through every line a spreadsheet should have.
            </p>
          </div>
        </Section>

        <ComparisonFaq
          competitorName="Excel"
          items={EXCEL_FAQ}
          reviewedDate="October 2026"
        />

        <CloseSection
          headingId="vs-close-heading"
          heading={<>Try TrueCap free.</>}
          lede={
            <>
              Try the structured workflow with one property, review every
              assumption, and keep Excel for any custom modeling that TrueCap does
              not support.
            </>
          }
          actions={
            <ActionRow>
              <Link
                href="/analyze" prefetch={false}
                className={buttonVariants({ size: "cta" })}
              >
                Run a deal now
              </Link>
              <IntentPrefetchLink
                href="/pricing"
                className={buttonVariants({ variant: "outline", size: "cta" })}
              >
                See Pro pricing
              </IntentPrefetchLink>
            </ActionRow>
          }
        />

        <Section rule="none" rhythm="tight">
          <div className="max-w-5xl">
            <RelatedContent kind="vs" slug="excel" />
            <AuthorBio />

            <footer className="mt-10 border-t border-border pt-6">
              <p className="text-lg font-semibold">Other comparisons:</p>
              <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
                <li>
                  <IntentPrefetchLink
                    href="/vs/dealcheck"
                    className={VS_LINK_ROW}
                  >
                    vs DealCheck
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/biggerpockets-calculator"
                    className={VS_LINK_ROW}
                  >
                    vs BiggerPockets
                  </IntentPrefetchLink>
                </li>
                <li>
                  <IntentPrefetchLink
                    href="/vs/stessa"
                    className={VS_LINK_ROW}
                  >
                    vs Stessa
                  </IntentPrefetchLink>
                </li>
              </ul>
            </footer>
          </div>
        </Section>
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
  },
  {
    question:
      "Does TrueCap handle BRRRR and fix-and-flip like my spreadsheet does?",
    answer: (
      <>
        Not currently. TrueCap&apos;s rehab, ARV, and rental calculators cover
        individual inputs, but TrueCap has no BRRRR or fix-and-flip model. Keep
        a reviewed spreadsheet or use another tool for dated contributions,
        renovation financing, refinance or sale proceeds, and project-level
        returns.
      </>
    ),
  },
  {
    question: "What if I still want to use Excel after trying TrueCap?",
    answer: (
      <>
        That can be the right choice. Keep a reviewed Excel template for edge
        cases such as partnership splits, syndication waterfalls, or custom debt
        structures the underwriting engine doesn&apos;t model. TrueCap
        includes PDF reports with Pro for sharing a review snapshot while
        keeping the spreadsheet as the custom back-office model.
      </>
    ),
  },
];

