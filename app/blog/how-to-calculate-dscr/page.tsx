/**
 * The DSCR guide — /blog/how-to-calculate-dscr, TrueCap's one canonical page
 * on the debt service coverage ratio.
 *
 * Founder decision Q5 (2026-09-28): the three DSCR guides became this one
 * page. It absorbed /blog/what-is-a-good-dscr (benchmarks, what 1.25 means
 * for a loan) and /blog/dscr-loans-explained (how DSCR loans work, what
 * lenders check). Both slugs 308 here from next.config.mjs, and the
 * unreleased /tools/dscr-calculator 308s here from
 * lib/historical-tool-redirects.ts, so DSCR-calculator searches land here.
 *
 * Order: formula → four steps → worked example → what counts as good →
 * lender's DSCR vs yours → DSCR loans → stress test → FAQ. The visible FAQ
 * and the FAQPage JSON-LD are built from the same FAQS array.
 *
 * The worked example is TrueCap's own calculator (calculateAnalysis) run on
 * the analyzer's sample rental (lib/sample-deal.ts). This page may not import
 * the calculator (seo/config.json paths.importAllow), so SAMPLE holds its
 * rounded outputs and lib/__tests__/dscr-guide-consolidation.test.ts reruns
 * the calculator and fails when a figure here stops matching.
 *
 * Every lender threshold links the primary source it comes from (12 CFR
 * 244.17, Freddie Mac's Optigo term sheet, HUD ML 2026-01, Fannie Mae's
 * Selling Guide, Freddie Mac's LTV table). No agency sets a DSCR minimum for
 * a loan on a 1-4 unit rental, so the page says each lender sets its own
 * and states no range.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ARTICLE_HEADER,
  ARTICLE_LEDE,
  ARTICLE_META,
  ARTICLE_META_LINK,
  ARTICLE_TITLE,
  ArticleBody,
  ArticleEnd,
  ArticleMain,
  ArticlePage,
  ArticleTable,
  ToolFormula,
  UnderTitleAnalyzeLink,
} from "@/components/marketing/article";
import { BlogByline } from "@/components/marketing/blog-byline";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { FaqSection } from "@/components/marketing/faq-section";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { RelatedContent } from "@/components/marketing/related-content";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import {
  formatDscr,
  NO_DEBT_SERVICE_DSCR_LABEL,
} from "@/lib/financial-presentation";
import { getSiteUrl } from "@/lib/site-url";
import { Header } from "@/components/investcalc/header";
import { lastmodFor } from "@/lib/seo/lastmod";
import { JsonLd } from "@/components/seo/json-ld";

const SLUG = "how-to-calculate-dscr";
const TITLE =
  "How to calculate DSCR: the formula, a worked example, what counts as good, and DSCR loans";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "How to calculate DSCR (and what counts as good)";
const DESCRIPTION =
  "DSCR is NOI divided by annual debt service. The formula, a worked example, what counts as a good ratio, and how lenders and DSCR loans use it.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = lastmodFor("/blog/how-to-calculate-dscr") ?? PUBLISHED_AT;
const READING_TIME_MIN = 14;

/**
 * The worked example: calculateAnalysis(SAMPLE_DEAL_VALUES). The calculator
 * rounds each monthly expense line to the whole dollar, so every annual
 * expense line is its monthly figure × 12 (5% of $36,600 is $1,830; the
 * calculator's $153 a month gives $1,836). The stress cases change one input
 * and rerun the calculator; the break-even rents are the rents at which its
 * DSCR reaches 1.25 and 1.00, rounded to $10; the stressed price is the
 * highest price at which the "Both" stress case still reaches 1.25, rounded
 * down to $1,000. dscr-guide-consolidation.test.ts recomputes every one.
 */
const SAMPLE = {
  price: 265_000,
  downPaymentPct: 20,
  ratePct: 6.6,
  termYears: 30,
  rentMonthly: 3_050,
  grossRentAnnual: 36_600,
  vacancyMonthly: 153,
  propertyTaxMonthly: 329,
  insuranceMonthly: 110,
  maintenanceMonthly: 153,
  managementMonthly: 244,
  noiAnnual: 24_732,
  loanAmount: 212_000,
  principalInterestMonthly: 1_354,
  debtServiceAnnual: 16_247,
  capexReserveMonthly: 153,
  cashFlowMonthly: 554,
  pitiaMonthly: 1_793,
  lowRentMonthly: 2_745,
  lowRentNoiAnnual: 21_744,
  highRatePct: 7.6,
  highRateDebtServiceAnnual: 17_963,
  stressedPriceAtDscr125: 258_000,
  rentAtDscr125: 2_600,
  rentAtDscr100: 2_190,
} as const;

const usd = (amount: number) => `$${Math.round(amount).toLocaleString("en-US")}`;
const ratio = (numerator: number, debtService: number) =>
  formatDscr(numerator / debtService, debtService > 0);
const pct = (fraction: number) => `${Math.round(fraction * 100)}%`;

const BASE_DSCR = ratio(SAMPLE.noiAnnual, SAMPLE.debtServiceAnnual);
const PITIA_ANNUAL = SAMPLE.pitiaMonthly * 12;
const MAX_DEBT_SERVICE_AT_125 = SAMPLE.noiAnnual / 1.25;
// Loan size a payment supports at the sample's rate and term: the sample's
// own payment per dollar borrowed, scaled. Rounded to $1,000.
const MAX_LOAN_AT_125 =
  Math.round(
    (MAX_DEBT_SERVICE_AT_125 / SAMPLE.debtServiceAnnual) *
      SAMPLE.loanAmount /
      1_000,
  ) * 1_000;
// The same solve on the "Both" stress case (rent 10% lower, rate a point
// higher), where 1.25 does bind: the loan its NOI supports at 1.25 and the
// down payment that leaves.
const STRESSED_DSCR = ratio(SAMPLE.lowRentNoiAnnual, SAMPLE.highRateDebtServiceAnnual);
const STRESSED_MAX_DEBT_SERVICE_AT_125 = SAMPLE.lowRentNoiAnnual / 1.25;
const STRESSED_MAX_LOAN_AT_125 =
  Math.round(
    (STRESSED_MAX_DEBT_SERVICE_AT_125 / SAMPLE.highRateDebtServiceAnnual) *
      SAMPLE.loanAmount /
      1_000,
  ) * 1_000;
const STRESSED_DOWN_AT_125 = SAMPLE.price - STRESSED_MAX_LOAN_AT_125;
const FANNIE_NET_RENT = 0.75 * SAMPLE.rentMonthly - SAMPLE.pitiaMonthly;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "how to calculate dscr",
    "dscr formula",
    "debt service coverage ratio formula",
    "dscr calculator",
    "what is a good dscr",
    "is 1.25 dscr good",
    "dscr ratio example",
    "dscr loan",
    "what is a dscr loan",
    "dscr loan requirements",
    "dscr vs conventional loan",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    title: SERP_TITLE,
    description: DESCRIPTION,
    url: `/blog/${SLUG}`,
    type: "article",
    publishedTime: PUBLISHED_AT,
    modifiedTime: MODIFIED_AT,
  },
  twitter: {
    card: "summary_large_image",
    title: SERP_TITLE,
    description: DESCRIPTION,
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What's the DSCR formula?",
    a: "DSCR = annual NOI ÷ annual debt service. NOI is gross rent minus vacancy and operating expenses (taxes, insurance, maintenance, management), before the mortgage. Annual debt service is the monthly principal-and-interest payment × 12; some DSCR programs use PITIA (principal, interest, taxes, insurance and association dues) instead. A DSCR of 1.25 means NOI is 1.25 times the debt service: $30,000 of NOI against $24,000 of annual payments.",
  },
  {
    q: "What is a good DSCR for a rental property?",
    a: "1.25 or higher is a common lender benchmark — the property's net operating income covers its annual debt payments 1.25 times over, leaving a 25% cushion. From 1.15 to 1.25 there's some cushion, but less than that benchmark; from 1.0 to 1.15 the property covers its debt with little room; below 1.0 its NOI doesn't cover its own mortgage payments. The 1.25 figure comes from multifamily lending standards; a lender on a house or a duplex sets its own minimum.",
  },
  {
    q: "Is a DSCR of 1.0 good?",
    a: "No — 1.0 is break-even, not good. At exactly 1.0, NOI equals debt service, so one vacant month, one furnace repair, or one insurance premium increase pushes the property into negative cash flow. Treat 1.0-1.15 as a yellow zone: acceptable only with a specific plan to raise rents or refinance, never as a steady state.",
  },
  {
    q: "What DSCR do lenders require?",
    a: "There is no market-wide minimum. Each lender or program sets its own minimum coverage threshold, and some programs allow lower coverage with different leverage, reserves, pricing, or property restrictions. Freddie Mac's Optigo multifamily loans and the federal risk-retention rule for multifamily loans use 1.25, and HUD's 221(d)(4) program uses 1.15, or 1.11 for its middle-income option. Ask for the current written formula, minimum, accepted rent evidence, leverage, pricing and reserve rules.",
  },
  {
    q: "How is the lender's DSCR different from mine?",
    a: "Some DSCR loan programs divide gross monthly rent by PITIA (principal, interest, taxes, insurance, association dues); ask your lender for its written formula. Your operating DSCR divides NOI (rent minus vacancy, maintenance, management and the other operating costs) by debt service. Lenders can also differ on the rent they accept, lease treatment, vacancy or management adjustments and rounding, so the lender's result can be higher or lower than yours. Compute both.",
  },
  {
    q: "What happens if my DSCR is right at the lender's minimum?",
    a: "You're at risk: appraised rent coming in 5% below your number can tip you below the minimum. Don't lock a rate or pay non-refundable fees until you've confirmed the appraised rent on the appraiser's Single-Family Comparable Rent Schedule (Form 1007), and ask how the lender rounds: 0.996 is below 1.00 even when it displays as 1.00.",
  },
  {
    q: "Can DSCR be negative?",
    a: "Yes, when NOI is negative: the property loses money before the mortgage is paid. TrueCap shows that negative ratio rather than a zero. Re-check the rent, vacancy and operating-expense inputs, treat the result as a serious coverage warning, and ask the lender how its own formula treats the property.",
  },
  {
    q: "What is the DSCR on a cash purchase?",
    a: `Undefined — with no loan there's no debt service, so the ratio has no denominator. TrueCap reports DSCR as ${NO_DEBT_SERVICE_DSCR_LABEL} on cash deals rather than showing a misleading number. For a cash purchase, judge the deal on cap rate and cash-on-cash return instead.`,
  },
  {
    q: "Can a DSCR be too high?",
    a: "Not from a coverage standpoint: a 2.0 DSCR is very safe against the debt. But a high ratio produced by a large down payment means more of your cash sits in the property. Whether that lowers your cash-on-cash return depends on leverage: when the loan costs more each year than the property yields (negative leverage), more equity raises cash-on-cash; when it costs less, more equity lowers it.",
  },
  {
    q: "What is a DSCR loan?",
    a: "A DSCR (Debt Service Coverage Ratio) loan is generally a business-purpose, non-QM investment-property loan that uses the property's rental coverage as a primary qualifying metric instead of personal DTI. Clearing a program's DSCR threshold is only one condition: lenders can still review credit, liquidity and reserves, borrower or guarantor background, entity documents, property eligibility, appraisal, insurance, and other program requirements.",
  },
  {
    q: "Do DSCR loans need a down payment?",
    a: "Yes. Purchase programs require borrower equity, and each lender's matrix sets its own maximum LTV. The actual maximum can be lower based on DSCR, credit, property type, loan purpose, experience, or market. A quoted LTV is a program limit, not a promise that the file will close at that leverage.",
  },
  {
    q: "What do DSCR loans cost?",
    a: "There is no single DSCR rate. Quotes can change daily and vary with credit, LTV, DSCR, property type, occupancy, loan size, reserves, points, prepayment terms, and lender. DSCR pricing can differ from comparable conventional financing, and only same-day written quotes with matching fees and prepayment terms support a useful comparison.",
  },
  {
    q: "When should I use a DSCR loan instead of a conventional loan?",
    a: "A DSCR loan can be worth comparing when income-based conventional underwriting is a constraint, the borrower wants an eligible entity structure, or a lender's property-coverage approach better fits the transaction. Compare it with conventional and portfolio options using total cost, recourse, reserves, prepayment terms, documentation, and exit plan—not the note rate alone.",
  },
  {
    q: "What documentation do DSCR loans require?",
    a: "Requirements vary by lender, program, state, borrower, and property. Many DSCR programs do not use tax returns, W-2s, or pay stubs to calculate personal DTI, but a lender may still request income or business documents for compliance, exceptions, guarantor review, ability-to-repay questions, or another condition. Expect identity and entity documents, credit authorization, asset and reserve evidence, appraisal or rent support, insurance, title, and transaction documents, then confirm the lender's checklist in writing.",
  },
  {
    q: "Can I use a DSCR loan for a short-term rental (Airbnb)?",
    a: "Some programs allow short-term-rental properties, but eligibility and income methodology vary. A lender may use long-term market rent, documented operating history, or a specialized appraisal method, and it may impose different leverage, reserves, licensing, management, or market restrictions. Confirm the exact income evidence and property-use rules before relying on projected STR revenue.",
  },
];

const ON_THIS_PAGE: { href: string; label: string }[] = [
  { href: "#formula", label: "The formula" },
  { href: "#four-steps", label: "The four steps" },
  { href: "#worked-example", label: "Worked example" },
  { href: "#good-dscr", label: "What is a good DSCR?" },
  { href: "#lender-dscr", label: "Your DSCR vs the lender's" },
  { href: "#dscr-loans", label: "DSCR loans" },
  { href: "#stress-test", label: "Stress-test it" },
  { href: "#faq", label: "FAQ" },
];

export default function BlogPost() {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/blog/${SLUG}`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${canonicalUrl}#article`,
    headline: TITLE,
    description: DESCRIPTION,
    datePublished: PUBLISHED_AT,
    dateModified: MODIFIED_AT,
    author: { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: "TrueCap", url: siteUrl },
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntityOfPage: canonicalUrl,
    image: [`${siteUrl}/home.jpg`],
    inLanguage: "en-US",
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "TrueCap",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${siteUrl}/blog`,
      },
      { "@type": "ListItem", position: 3, name: TITLE, item: canonicalUrl },
    ],
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
    <ArticlePage>
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={faqLd} />

      <ArticleMain>
        <article>
          <header className={ARTICLE_HEADER}>
            <h1 className={ARTICLE_TITLE}>
              {TITLE}
            </h1>
            <p className={ARTICLE_META}>
              <Link href="/blog" className={ARTICLE_META_LINK}>
                Blog
              </Link>{" "}
              ·{" "}
              {/* A date-only PUBLISHED_AT is UTC midnight: format it in UTC, as /blog does, or a render west of UTC shows the day before. */}
              {new Date(PUBLISHED_AT).toLocaleDateString("en-US", {
                timeZone: "UTC",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              · {READING_TIME_MIN} min read
            </p>
            <BlogByline />
            <UnderTitleAnalyzeLink />
            <p className={ARTICLE_LEDE}>
              DSCR = NOI ÷ annual debt service. It tells you whether a
              rental&apos;s operating income covers its loan payments, and
              it&apos;s the ratio a DSCR loan qualifies on. This guide works one
              property through the formula with TrueCap&apos;s calculator, shows
              where the common 1.25 floor comes from, and explains how DSCR loans
              work, including why a lender&apos;s DSCR can come out higher or
              lower than yours.
            </p>
            <nav aria-label="On this page" className="mt-6">
              <p className="text-sm text-muted-foreground">
                On this page
              </p>
              <ul className="flex flex-wrap gap-x-4 text-sm">
                {ON_THIS_PAGE.map((item) => (
                  <li key={item.href}>
                    <a href={item.href} className="tc-link inline-flex min-h-11 items-center">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </header>

          <ArticleBody>
            <h2 id="formula">
              The DSCR formula
            </h2>
            <ToolFormula
              formula={
                <>
                  DSCR = Annual NOI ÷ Annual debt
                  service
                </>
              }
              example={
                <>
                  NOI = gross rent − vacancy − operating expenses (before the
                  mortgage)
                </>
              }
            />
            <p>
              <Link href="/glossary/dscr" className="tc-link">
                DSCR
              </Link>{" "}
              (debt service coverage ratio) compares what a property earns from
              operations with what its loan costs. At 1.00,{" "}
              <Link href="/glossary/noi" className="tc-link">
                net operating income
              </Link>{" "}
              exactly covers the payments. At 1.25, NOI is 25% more than the debt
              service. Below 1.00, the property doesn&apos;t earn its own
              mortgage and the difference comes out of your pocket.
            </p>
            <p>
              Two edge cases. With no loan there&apos;s no debt service and no
              denominator, so DSCR on a cash purchase is undefined: TrueCap shows
              it as {NO_DEBT_SERVICE_DSCR_LABEL}. And when NOI is negative, DSCR
              is negative too: a financed deal that loses money before the
              mortgage shows a negative ratio, not zero.
            </p>

            <h2 id="four-steps">
              How to calculate DSCR in four steps
            </h2>

            <h3>Step 1: Compute NOI</h3>
            <p>
              Start with a year of scheduled rent. Subtract a{" "}
              <Link href="/glossary/vacancy" className="tc-link">
                vacancy
              </Link>{" "}
              allowance, then the operating expenses: property taxes, insurance,
              maintenance, management, utilities you pay and HOA dues. Leave the
              mortgage out. TrueCap keeps the{" "}
              <Link href="/glossary/capex" className="tc-link">
                CapEx
              </Link>{" "}
              reserve below the NOI line: it lowers your cash flow but not NOI or
              DSCR. Whichever convention you use, use it every time. The full
              walkthrough is in{" "}
              <Link href="/blog/how-to-calculate-noi-rental-property" className="tc-link">
                how to calculate NOI
              </Link>
              .
            </p>

            <h3>Step 2: Compute annual debt service</h3>
            <p>
              Monthly principal and interest × 12. Some DSCR programs use PITIA
              instead: principal, interest, taxes, insurance and association dues
              (Fannie Mae&apos;s Selling Guide{" "}
              <a
                href="https://selling-guide.fanniemae.com/sel/b3-6-03/monthly-housing-expense-subject-property"
                className="tc-link"
              >
                lists every component
              </a>
              ). A larger denominator gives a lower ratio, so ask which one the
              lender uses before you run the numbers. TrueCap&apos;s{" "}
              <Link href="/tools/mortgage-payment-calculator" className="tc-link">
                mortgage payment calculator
              </Link>{" "}
              shows the monthly principal and interest on its own line, next to
              taxes and insurance.
            </p>

            <h3>Step 3: Divide</h3>
            <p>
              NOI ÷ annual debt service = DSCR. Round to two decimals, and ask the
              lender how it rounds: 0.996 is below 1.00 even when it displays as
              1.00.
            </p>

            <h3>Step 4: Compare with the written program</h3>
            <p>
              Get the lender&apos;s formula, minimum ratio, accepted rent evidence
              and leverage limits in writing.
            </p>

            <h2 id="worked-example">
              Worked example: TrueCap&apos;s sample rental
            </h2>
            <p>
              These figures come from TrueCap&apos;s calculator, run on{" "}
              <Link href="/analyze?sample=1" prefetch={false} className="tc-link">
                the sample rental the analyzer loads
              </Link>
              , where you can change any input: a {usd(SAMPLE.price)}{" "}
              single-family house renting for{" "}
              {usd(SAMPLE.rentMonthly)} a month, bought with{" "}
              {SAMPLE.downPaymentPct}% down and a {SAMPLE.termYears}-year loan at{" "}
              {SAMPLE.ratePct}%. The tax and insurance rates are the sample&apos;s
              assumptions; on a real deal, use the property&apos;s own tax bill
              and quote. The calculator rounds each monthly expense to the dollar,
              so each annual line below is its monthly figure × 12.
            </p>
            <ul>
              <li>
                Gross rent: {usd(SAMPLE.rentMonthly)} × 12 ={" "}
                <strong>{usd(SAMPLE.grossRentAnnual)}</strong>
              </li>
              <li>
                Vacancy (5% of rent, {usd(SAMPLE.vacancyMonthly)} a month): −
                {usd(SAMPLE.vacancyMonthly * 12)}
              </li>
              <li>
                Property taxes (1.49% of price, {usd(SAMPLE.propertyTaxMonthly)} a
                month): −{usd(SAMPLE.propertyTaxMonthly * 12)}
              </li>
              <li>
                Insurance (0.5% of price, {usd(SAMPLE.insuranceMonthly)} a month):
                −{usd(SAMPLE.insuranceMonthly * 12)}
              </li>
              <li>
                Maintenance (5% of rent, {usd(SAMPLE.maintenanceMonthly)} a
                month): −{usd(SAMPLE.maintenanceMonthly * 12)}
              </li>
              <li>
                Management (8% of rent, {usd(SAMPLE.managementMonthly)} a month):
                −{usd(SAMPLE.managementMonthly * 12)}
              </li>
              <li>
                <strong>NOI: {usd(SAMPLE.noiAnnual)}</strong>
              </li>
              <li>
                Loan: {usd(SAMPLE.loanAmount)} at {SAMPLE.ratePct}% for{" "}
                {SAMPLE.termYears} years = {usd(SAMPLE.principalInterestMonthly)}{" "}
                a month principal and interest
              </li>
              <li>
                <strong>
                  Annual debt service: {usd(SAMPLE.debtServiceAnnual)}
                </strong>
              </li>
            </ul>
            <ToolFormula
              formula={
                <>
                  DSCR = {usd(SAMPLE.noiAnnual)} ÷ {usd(SAMPLE.debtServiceAnnual)} ={" "}
                  <strong>{BASE_DSCR}</strong>
                </>
              }
            />
            <p>
              The property earns about ${BASE_DSCR} of NOI for every $1.00 of loan
              payment. The sample also sets aside a 5% CapEx reserve (
              {usd(SAMPLE.capexReserveMonthly)} a month). Because that sits below
              NOI, it lowers the cash flow (about {usd(SAMPLE.cashFlowMonthly)} a
              month here) but not the DSCR.
            </p>

            <h3>Solve it backwards: what 1.25 allows</h3>
            <p>
              Divide NOI by a target ratio to get the most debt service it
              supports: {usd(SAMPLE.noiAnnual)} ÷ 1.25 ={" "}
              {usd(MAX_DEBT_SERVICE_AT_125)} a year (
              {usd(MAX_DEBT_SERVICE_AT_125 / 12)} a month). At {SAMPLE.ratePct}%
              over {SAMPLE.termYears} years that pays for a loan of about{" "}
              {usd(MAX_LOAN_AT_125)}, {pct(MAX_LOAN_AT_125 / SAMPLE.price)} of the
              price. So on this property the ratio isn&apos;t what limits the loan;
              the maximum{" "}
              <Link href="/glossary/ltv" className="tc-link">
                loan-to-value
              </Link>{" "}
              is. Each DSCR lender&apos;s matrix sets its own; for a conventional
              one-unit investment purchase, Freddie Mac&apos;s cap is{" "}
              <a
                href="https://sf.freddiemac.com/general/maximum-ltv-tltv-htltv-ratio-requirements-for-conforming-and-super-conforming-mortgages"
                className="tc-link"
              >
                85%
              </a>
              .
            </p>
            <p>
              On a thinner deal the ratio binds. Take the harshest case from the
              stress test below: rent 10% lower ({usd(SAMPLE.lowRentMonthly)}) and
              a rate a point higher ({SAMPLE.highRatePct}%). NOI falls to{" "}
              {usd(SAMPLE.lowRentNoiAnnual)} against{" "}
              {usd(SAMPLE.highRateDebtServiceAnnual)} of debt service, a DSCR of{" "}
              {STRESSED_DSCR}. At 1.25 the debt service can be at most{" "}
              {usd(SAMPLE.lowRentNoiAnnual)} ÷ 1.25 ={" "}
              {usd(STRESSED_MAX_DEBT_SERVICE_AT_125)} a year, a loan of about{" "}
              {usd(STRESSED_MAX_LOAN_AT_125)}. That takes about{" "}
              {usd(STRESSED_DOWN_AT_125)} down ({pct(STRESSED_DOWN_AT_125 / SAMPLE.price)}
              ) instead of {usd((SAMPLE.price * SAMPLE.downPaymentPct) / 100)}. Or
              keep {SAMPLE.downPaymentPct}% down and pay less: the calculator
              reaches 1.25 at a price of about{" "}
              {usd(SAMPLE.stressedPriceAtDscr125)},{" "}
              {usd(SAMPLE.price - SAMPLE.stressedPriceAtDscr125)} under the{" "}
              {usd(SAMPLE.price)} in the example.
            </p>
            <p>
              TrueCap Pro&apos;s Offer Ceiling runs the price version for you: the
              highest price that still meets your targets, including a DSCR you
              set.
            </p>

            <h2 id="good-dscr">
              What is a good DSCR?
            </h2>
            <p>
              Above 1.00, NOI covers the debt under your formula. How far above is
              your cushion against a vacant month, a repair or a tax increase. As
              a lender screen, 1.25 shows up in two published multifamily
              standards, and HUD goes lower:
            </p>
            <ul>
              <li>
                Freddie Mac&apos;s{" "}
                <a
                  href="https://mf.freddiemac.com/docs/product/fixed_rate.pdf"
                  className="tc-link"
                >
                  Optigo fixed-rate multifamily term sheet
                </a>{" "}
                sets a 1.25x minimum amortizing DCR for every loan term, and notes
                that adjustments may be made depending on the property, product
                and market.
              </li>
              <li>
                The federal risk-retention rule,{" "}
                <a
                  href="https://www.govinfo.gov/content/pkg/CFR-2025-title12-vol4/pdf/CFR-2025-title12-vol4-sec244-17.pdf"
                  className="tc-link"
                >
                  12 CFR 244.17
                </a>
                , requires a DSC ratio of 1.25 or greater for a multifamily loan
                (five or more dwelling units) to count as a qualifying loan, 1.5
                for a leased commercial property and 1.7 for other commercial real
                estate.
              </li>
              <li>
                HUD&apos;s 221(d)(4) program goes lower:{" "}
                <a
                  href="https://www.hud.gov/sites/dfiles/hudclips/documents/2026-01hsgml.pdf"
                  className="tc-link"
                >
                  Mortgagee Letter 2026-01
                </a>{" "}
                lists 1.15 for market-rate projects and 1.11 for its middle-income
                option.
              </li>
            </ul>
            <p>
              All three are multifamily and commercial standards. For a house or
              a duplex, Fannie Mae&apos;s Selling Guide counts the rent as a net
              dollar figure rather than a coverage ratio (see below), and each
              DSCR lender or program sets its own minimum coverage threshold.
              Some programs allow lower coverage with different leverage,
              reserves, pricing, or property restrictions.
            </p>
            <ArticleTable label="Data table">
              <table>
                <thead>
                  <tr>
                    <th>
                      DSCR
                    </th>
                    <th>
                      What it tells you
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="font-mono whitespace-nowrap">Below 1.00</td>
                    <td className="text-muted-foreground">
                      NOI doesn&apos;t cover the loan payments under this formula;
                      you cover the gap.
                    </td>
                  </tr>
                  <tr>
                    <td className="font-mono whitespace-nowrap">1.00 – 1.15</td>
                    <td className="text-muted-foreground">
                      Covers the debt with little room. Treat it as a yellow zone:
                      acceptable only with a specific plan to raise rents or
                      refinance.
                    </td>
                  </tr>
                  <tr>
                    <td className="font-mono whitespace-nowrap">1.15 – 1.25</td>
                    <td className="text-muted-foreground">
                      Some cushion, but under the 1.25 floor of the multifamily
                      standards above.
                    </td>
                  </tr>
                  <tr>
                    <td className="font-mono whitespace-nowrap">1.25 – 1.50</td>
                    <td className="text-muted-foreground">
                      At or above that common floor. Stress-test it before you
                      rely on it.
                    </td>
                  </tr>
                  <tr>
                    <td className="font-mono whitespace-nowrap">Above 1.50</td>
                    <td className="text-muted-foreground">
                      A wide cushion (the sample is {BASE_DSCR}). Check whether a
                      large down payment is what produces it.
                    </td>
                  </tr>
                </tbody>
              </table>
            </ArticleTable>

            <h3>Where you buy changes how hard 1.25 is</h3>
            <p>
              At the same price, rate and down payment, more NOI per dollar of
              price means a higher DSCR. Rent against price is a rough market
              proxy. HUD&apos;s housing market analyses put the average apartment
              rent at $1,125 a month against an average existing-home price of
              $265,000 in the{" "}
              <a
                href="https://www.huduser.gov/portal/publications/pdf/MemphisTN-MS-AR-CHMA-24.pdf"
                className="tc-link"
              >
                Memphis area
              </a>{" "}
              (about 0.42% of price per month, as of June 1, 2024), and $1,572
              against $594,800 in the{" "}
              <a
                href="https://www.huduser.gov/portal/publications/pdf/PhoenixMesaChandlerAZ-CHMA-25.pdf"
                className="tc-link"
              >
                Phoenix area
              </a>{" "}
              (about 0.26%, as of January 1, 2025). Apartment rents set against
              all home sales aren&apos;t any one property&apos;s yield, but the gap
              shows why the same 1.25 takes more equity in some metros. See the{" "}
              <Link href="/markets/memphis" className="tc-link">
                Memphis
              </Link>{" "}
              and{" "}
              <Link href="/markets/phoenix" className="tc-link">
                Phoenix
              </Link>{" "}
              rental market data for HUD&apos;s Fair Market Rents there.
            </p>

            <h3>When a DSCR under 1.25 can still work</h3>
            <ul>
              <li>
                <strong>A rent path you can document.</strong> Tenants below
                market with leases ending soon. Underwrite the turnover cost and
                the timeline, not just the new rent.
              </li>
              <li>
                <strong>A value-add you control.</strong> BRRRR and rehab deals
                are judged on the stabilized DSCR. Be honest about which number
                the lender will see at refinance (
                <Link href="/blog/brrrr-method-explained" className="tc-link">
                  the BRRRR method
                </Link>{" "}
                walks through it).
              </li>
              <li>
                <strong>A house hack.</strong> If you&apos;ll live in one unit,
                measure the deal against the rent you pay now, not against a
                DSCR.
              </li>
            </ul>
            <p>
              Hope isn&apos;t on the list. A 1.05 with no plan pays its mortgage
              only when nothing goes wrong.
            </p>

            <h2 id="lender-dscr">
              Your DSCR vs the lender&apos;s DSCR
            </h2>
            <p>
              Your DSCR and a lender&apos;s can come out higher or lower than each
              other, because the formula and the accepted rent can differ. Three
              versions on the same sample rental:
            </p>
            <ul>
              <li>
                <strong>Your operating DSCR, NOI ÷ principal and interest:</strong>{" "}
                {BASE_DSCR}.
              </li>
              <li>
                <strong>Rent ÷ PITIA:</strong> {usd(SAMPLE.rentMonthly)} ÷{" "}
                {usd(SAMPLE.pitiaMonthly)} = {ratio(SAMPLE.rentMonthly, SAMPLE.pitiaMonthly)}
                . PITIA here is {usd(SAMPLE.principalInterestMonthly)} of principal
                and interest, {usd(SAMPLE.propertyTaxMonthly)} of taxes and{" "}
                {usd(SAMPLE.insuranceMonthly)} of insurance.
              </li>
              <li>
                <strong>NOI ÷ PITIA:</strong>{" "}
                {ratio(SAMPLE.noiAnnual, PITIA_ANNUAL)}. This one counts taxes and
                insurance twice, because NOI has already paid them. If a lender
                quotes it, ask whether its numerator is gross rent or NOI.
              </li>
            </ul>
            <p>
              Some DSCR programs compare rent to PITIA rather than using the
              investor&apos;s NOI-based ratio. Ask the lender for its written
              formula and rebuild it next to your own number, not instead of it: a
              rent-to-PITIA ratio leaves out vacancy, maintenance and management,
              so the lender&apos;s{" "}
              {ratio(SAMPLE.rentMonthly, SAMPLE.pitiaMonthly)} can pass a property
              whose operating DSCR is thin. The lender is underwriting its own
              downside, not your return.
            </p>
            <p>
              Conventional loans count a rental differently again. On a purchase,
              Fannie Mae&apos;s Selling Guide{" "}
              <a
                href="https://selling-guide.fanniemae.com/sel/b3-3.8-02/rental-income-subject-property"
                className="tc-link"
              >
                takes 75% of gross rent and subtracts PITIA
              </a>
              : a net dollar figure that feeds your debt-to-income ratio, not a
              coverage ratio. On the sample that&apos;s 75% ×{" "}
              {usd(SAMPLE.rentMonthly)} − {usd(SAMPLE.pitiaMonthly)} = about{" "}
              {usd(FANNIE_NET_RENT)} a month.
            </p>
            <p>
              The rent can differ too. A lender may take it from the appraisal
              rather than your lease or estimate; Fannie Mae&apos;s form for a
              single-family rental is the{" "}
              <a
                href="https://selling-guide.fanniemae.com/sel/b3-3.1-08/rental-income"
                className="tc-link"
              >
                Single-Family Comparable Rent Schedule (Form 1007)
              </a>
              . Before you lock a rate or pay non-refundable fees, ask which rent
              the lender will use, whether a signed lease or the appraiser&apos;s
              figure wins, and how it handles a request to reconsider the value if
              the appraised rent comes in low.
            </p>

            <h2 id="dscr-loans">
              DSCR loans: how lenders use the ratio
            </h2>
            <p>
              A DSCR loan is an investor loan that qualifies mainly on the
              property&apos;s coverage ratio instead of your personal{" "}
              <Link href="/glossary/debt-to-income" className="tc-link">
                debt-to-income ratio
              </Link>
              . The legal backdrop:{" "}
              <a
                href="https://www.consumerfinance.gov/rules-policy/regulations/1026/interp-3/"
                className="tc-link"
              >
                Regulation Z
              </a>{" "}
              treats credit to buy, improve or maintain a rental property you
              don&apos;t occupy as business-purpose credit, outside its consumer
              rules, including the ability-to-repay and qualified-mortgage
              requirements. That&apos;s why you&apos;ll see DSCR loans called
              non-QM. (A property you&apos;ll live in for more than 14 days in the
              coming year counts as owner-occupied, and different rules apply.)
            </p>

            <h3>How it differs from a conventional investment loan</h3>
            <p>
              Fannie Mae and Freddie Mac loans qualify you, not the property:
            </p>
            <ul>
              <li>
                <strong>Income.</strong> Documented income and a debt-to-income
                ratio: Fannie Mae&apos;s maximum is{" "}
                <a
                  href="https://selling-guide.fanniemae.com/sel/b3-6-02/debt-income-ratios"
                  className="tc-link"
                >
                  50% for loans run through Desktop Underwriter
                </a>
                , and lower for manual underwriting.
              </li>
              <li>
                <strong>Credit.</strong> Fannie Mae sets{" "}
                <a
                  href="https://selling-guide.fanniemae.com/sel/b3-5.1-01/general-requirements-credit-scores"
                  className="tc-link"
                >
                  no minimum credit score for loans run through Desktop
                  Underwriter
                </a>
                ; a manually underwritten loan needs 620 for a fixed rate or 640
                for an ARM.
              </li>
              <li>
                <strong>Borrower.</strong> Fannie Mae buys loans made to{" "}
                <a
                  href="https://selling-guide.fanniemae.com/sel/b2-2-01/general-borrower-eligibility-requirements"
                  className="tc-link"
                >
                  borrowers who are natural persons
                </a>
                , with narrow exceptions for certain trusts, so a loan to your LLC
                is outside the program.
              </li>
              <li>
                <strong>Portfolio.</strong> Fannie Mae allows{" "}
                <a
                  href="https://selling-guide.fanniemae.com/sel/b2-2-03/multiple-financed-properties-same-borrower"
                  className="tc-link"
                >
                  up to 10 financed properties
                </a>{" "}
                for a second-home or investment loan run through Desktop
                Underwriter.
              </li>
              <li>
                <strong>Leverage.</strong>{" "}
                <a
                  href="https://sf.freddiemac.com/general/maximum-ltv-tltv-htltv-ratio-requirements-for-conforming-and-super-conforming-mortgages"
                  className="tc-link"
                >
                  Freddie Mac allows up to 85% LTV
                </a>{" "}
                on a one-unit investment purchase and 75% on 2–4 units, and 75%
                and 70% on a cash-out refinance.
              </li>
            </ul>
            <p>
              A DSCR program swaps the income test for the property test. Each
              lender sets the rest in its own matrix.
            </p>

            <h3>Who compares DSCR loans</h3>
            <p>
              These are reasons to get a DSCR quote, not proof it&apos;s the
              right or cheapest loan.
            </p>
            <ul>
              <li>
                <strong>Self-employed with paper losses.</strong> Depreciation and
                business deductions lower taxable income (depreciation is a rental
                deduction under{" "}
                <a href="https://www.irs.gov/publications/p527" className="tc-link">
                  IRS Publication 527
                </a>
                ). Conventional programs apply their own income rules; a DSCR
                program may not use tax returns to calculate DTI.
              </li>
              <li>
                <strong>At the financed-property limit.</strong> Past the agency
                cap, alternatives include DSCR, bank portfolio and commercial
                loans; compare them on total cost.
              </li>
              <li>
                <strong>Buying in an LLC.</strong> Some DSCR and portfolio
                programs may permit eligible entities; ask whether a personal
                guaranty and specific vesting documents are required. Choose the
                entity with legal and tax advice first (
                <Link href="/blog/rental-property-llc" className="tc-link">
                  rental property LLCs
                </Link>{" "}
                covers the trade-offs).
              </li>
              <li>
                <strong>Strong property, tight personal DTI.</strong> A
                property-coverage program can remove personal DTI as the main
                ratio, but not credit, liquidity, identity or guarantor review.
              </li>
            </ul>

            <h3>What lenders check</h3>
            <p>
              Requirements vary by lender, program, state, borrower, and
              property, and each lender sets its own in a written matrix or term
              sheet. Expect it to cover:
            </p>
            <ul>
              <li>
                <strong>Minimum DSCR and the formula behind it.</strong>
              </li>
              <li>
                <strong>Down payment.</strong> Purchase programs require borrower
                equity. The matrix&apos;s maximum LTV can drop for a lower DSCR,
                lower credit, a cash-out or the property type.
              </li>
              <li>
                <strong>Credit and reserves.</strong> Score, credit history and
                the cash reserves the matrix requires.
              </li>
              <li>
                <strong>Documents.</strong> Identity and entity documents, credit
                authorization, asset statements, the appraisal and rent support,
                insurance and title. Many programs don&apos;t use tax returns or
                W-2s to calculate DTI, but a lender can still ask for them.
              </li>
              <li>
                <strong>Property and use.</strong> Unit count, condo or rural
                status and short-term-rental use can change the matrix or rule the
                property out.
              </li>
            </ul>
            <p>
              A DSCR above the program minimum satisfies one condition;{" "}
              it does not guarantee approval.
            </p>

            <h3>What DSCR loans cost</h3>
            <p>
              Pricing is quote-specific and can move daily. DSCR loans can be
              priced differently from comparable conventional investment-property
              loans, and a rate-only comparison is incomplete. Compare same-day
              written quotes for the same loan amount, with points, lender fees,
              reserves, amortization, recourse and any prepayment penalty
              included. Stronger coverage, better credit and lower leverage can
              improve pricing under a particular matrix.
            </p>
            <ArticleTable label="Data table">
              <table>
                <thead>
                  <tr>
                    <th>
                      Feature
                    </th>
                    <th>
                      DSCR loan
                    </th>
                    <th>
                      Conventional investment loan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-muted-foreground">Qualifies on</td>
                    <td>The property&apos;s coverage ratio, as the program defines it</td>
                    <td>Your documented income and DTI (Fannie Mae: up to 50% through Desktop Underwriter)</td>
                  </tr>
                  <tr>
                    <td className="text-muted-foreground">Borrower</td>
                    <td>Some programs permit entities; ask about guaranties</td>
                    <td>Natural persons (Fannie Mae)</td>
                  </tr>
                  <tr>
                    <td className="text-muted-foreground">Portfolio limit</td>
                    <td>No agency cap; lender exposure limits can apply</td>
                    <td>Up to 10 financed properties (Fannie Mae, Desktop Underwriter)</td>
                  </tr>
                  <tr>
                    <td className="text-muted-foreground">Credit score</td>
                    <td>Matrix-specific</td>
                    <td>No minimum through Desktop Underwriter; 620 fixed-rate or 640 ARM if manually underwritten (Fannie Mae)</td>
                  </tr>
                  <tr>
                    <td className="text-muted-foreground">Maximum LTV</td>
                    <td>Matrix-specific</td>
                    <td>85% for a one-unit purchase, 75% for 2–4 units (Freddie Mac)</td>
                  </tr>
                  <tr>
                    <td className="text-muted-foreground">Rate and fees</td>
                    <td>Quote-specific</td>
                    <td>Quote-specific</td>
                  </tr>
                </tbody>
              </table>
            </ArticleTable>
            <p className="text-xs text-muted-foreground">
              The conventional column cites Fannie Mae&apos;s Selling Guide and
              Freddie Mac&apos;s LTV table, linked above. DSCR matrices are each
              lender&apos;s own.
            </p>
            <p>
              Using a DSCR loan to refinance out of short-term money? See{" "}
              <Link href="/blog/hard-money-vs-dscr-loan" className="tc-link">
                hard money vs a DSCR loan
              </Link>{" "}
              and{" "}
              <Link href="/blog/how-to-refinance-a-rental-property" className="tc-link">
                refinancing a rental property
              </Link>{" "}
              for the post-refi DSCR math.
            </p>

            <h2 id="stress-test">
              Stress-test your DSCR before you apply
            </h2>
            <p>
              One ratio is one set of assumptions. On the sample rental,
              TrueCap&apos;s calculator gives:
            </p>
            <ul>
              <li>
                <strong>Base case:</strong> {BASE_DSCR}
              </li>
              <li>
                <strong>Rent 10% lower ({usd(SAMPLE.lowRentMonthly)}):</strong>{" "}
                {ratio(SAMPLE.lowRentNoiAnnual, SAMPLE.debtServiceAnnual)}
              </li>
              <li>
                <strong>Rate 1 point higher ({SAMPLE.highRatePct}%):</strong>{" "}
                {ratio(SAMPLE.noiAnnual, SAMPLE.highRateDebtServiceAnnual)}
              </li>
              <li>
                <strong>Both:</strong>{" "}
                {ratio(SAMPLE.lowRentNoiAnnual, SAMPLE.highRateDebtServiceAnnual)}
                , under 1.25
              </li>
            </ul>
            <p>
              The rent can fall to about {usd(SAMPLE.rentAtDscr125)} a month,{" "}
              {pct(1 - SAMPLE.rentAtDscr125 / SAMPLE.rentMonthly)} under the{" "}
              {usd(SAMPLE.rentMonthly)} assumed, before DSCR drops below 1.25, and
              to about {usd(SAMPLE.rentAtDscr100)} before NOI stops covering the
              payment. If every scenario clears the lender&apos;s written minimum
              with room left, you have a cushion. If only the base case does, a
              lower appraised rent or a higher rate at lock can push the ratio
              under the minimum.
            </p>
            <p>
              Check the tax line too. In some states (California under
              Proposition 13, for example), a sale{" "}
              <a
                href="https://www2.census.gov/govs/pubs/2010pubs/govsrr2010-06.pdf"
                className="tc-link"
              >
                resets the assessed value to the purchase price
              </a>
              , so underwrite the tax bill at your price, not the seller&apos;s.{" "}
              <Link href="/blog/property-tax-reassessment-rental-property" className="tc-link">
                Property tax reassessment
              </Link>{" "}
              covers how to estimate it.
            </p>
            <p>
              In the{" "}
              <Link href="/analyze" prefetch={false} className="tc-link">
                free TrueCap analyzer
              </Link>
              , change the rent or the rate and run it again; the DSCR sits next
              to cash flow, cap rate and cash-on-cash. TrueCap Pro&apos;s
              sensitivity grid runs the rent, vacancy and rate combinations at
              once.
            </p>

            <p className="text-sm text-muted-foreground mt-6">
              Related reading:{" "}
              <Link href="/blog/cap-rate-vs-cash-on-cash-vs-dscr" className="tc-link">
                Cap rate vs cash-on-cash vs DSCR
              </Link>
              ,{" "}
              <Link href="/blog/piti-explained-rental-property" className="tc-link">
                PITI explained
              </Link>
              ,{" "}
              <Link href="/blog/negative-leverage-real-estate" className="tc-link">
                Negative leverage
              </Link>
              .
            </p>

          </ArticleBody>

          {/* faqLd above is the one FAQPage node for these rows. */}
          <FaqSection
            id="faq"
            variant="inline"
            heading="FAQ"
            items={FAQS}
            structuredData={false}
            contact={null}
          />
        </article>
        <RelatedContent kind="blog" slug={SLUG} title={TITLE} className="mt-10" />

        <RelatedBlogPosts currentSlug={SLUG} />

        <footer className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            TrueCap computes DSCR on the principal-and-interest basis, next to
            cash flow, cap rate and cash-on-cash, with every assumption labeled
            and editable.
          </p>
        </footer>
      </ArticleMain>
      <ArticleEnd>
        <BlogStickyCta inArticleColumn />
      </ArticleEnd>
      <SiteFooter />
      <ScrollDepthTracker />
    </ArticlePage>
  );
}
