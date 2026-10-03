/**
 * Blog post: How to read Schedule E for a rental property.
 *
 * Targets queries: "schedule e rental property", "how to fill out
 * schedule e", "schedule e explained", "schedule e line by line",
 * "rental property tax form", "schedule e depreciation", "schedule e
 * loss limit".
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
  UnderTitleAnalyzeLink,
} from "@/components/marketing/article";
import { BlogByline } from "@/components/marketing/blog-byline";
import { FaqSection } from "@/components/marketing/faq-section";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { RelatedContent } from "@/components/marketing/related-content";
import { getSiteUrl } from "@/lib/site-url";
import { Header } from "@/components/investcalc/header";
import { lastmodFor } from "@/lib/seo/lastmod";
import { JsonLd } from "@/components/seo/json-ld";
import { PostSources, type PostSource } from "@/components/blog/post-sources";

const SLUG = "schedule-e-rental-property";
const TITLE = "Schedule E for rental property: a line-by-line walkthrough";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Schedule E for rental property, line by line";
const DESCRIPTION =
  "A Schedule E walkthrough with a hypothetical rental example, recordkeeping prompts, and questions to check against current IRS guidance and your return.";
const PUBLISHED_AT = "2026-06-12";
const MODIFIED_AT = lastmodFor("/blog/schedule-e-rental-property") ?? PUBLISHED_AT;
const READING_TIME = 10;

// Every source the body links, in order of first use (F3 founder rule:
// every number and rule links to a primary source).
const SOURCES: PostSource[] = [
  {
    title: "Schedule E (Form 1040) 2025, Supplemental Income and Loss",
    url: "https://www.irs.gov/pub/irs-pdf/f1040se.pdf",
  },
  {
    title: "IRS Publication 527 (2025), Residential Rental Property",
    url: "https://www.irs.gov/publications/p527",
  },
  {
    title: "IRS, 2025 Instructions for Schedule E (Form 1040)",
    url: "https://www.irs.gov/instructions/i1040se",
  },
  {
    title: "26 U.S.C. 164, Taxes (164(b)(6))",
    url: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section164&num=0&edition=prelim",
  },
  {
    title: "IRS Publication 946 (2025), How To Depreciate Property",
    url: "https://www.irs.gov/publications/p946",
  },
  {
    title: "26 U.S.C. 1031, Exchange of real property held for productive use or investment",
    url: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section1031&num=0&edition=prelim",
  },
  {
    title: "IRS Publication 925 (2025), Passive Activity and At-Risk Rules",
    url: "https://www.irs.gov/publications/p925",
  },
  {
    title: "26 U.S.C. 469, Passive activity losses and credits limited (469(g))",
    url: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section469&num=0&edition=prelim",
  },
];

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "schedule e rental property",
    "how to fill out schedule e",
    "schedule e explained",
    "schedule e line by line",
    "schedule e depreciation",
    "schedule e loss limit",
    "rental property tax form",
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
  twitter: { card: "summary_large_image" },
};

const FAQS = [
  {
    q: "Can my rental show a loss on Schedule E if it has positive cash flow?",
    a: "It can. Taxable rental income and cash flow use different conventions. Depreciation may be a non-cash deduction, while loan principal is generally not a current rental expense. The actual result depends on supported basis, placed-in-service timing, personal use, financing, and other return items; reconcile the property ledger with the current form instructions and a qualified tax professional.",
  },
  {
    q: "How much rental loss can I deduct on Schedule E?",
    a: "There is no universal currently deductible amount. Passive-activity, active-participation, material-participation, basis, at-risk, personal-use, income, disposition, and other rules can limit or defer a loss. Use the rules and thresholds for the applicable tax year, and have any carryforward and disposition treatment reviewed before relying on it.",
  },
  {
    q: "Does mortgage principal go on Schedule E?",
    a: "Loan principal is generally not a current rental expense. Interest allocable to rental use may be deductible subject to the applicable rules and limitations. Reconcile lender records, the amortization schedule, mixed-use allocation, points, and other adjustments rather than treating the full payment or a Form 1098 total as the final tax answer.",
  },
  {
    q: "Should I skip depreciation to avoid recapture when I sell?",
    a: "Do not choose a filing position from a generic article. Allowed-or-allowable depreciation can affect adjusted basis even when a deduction was missed, while the correction method and sale treatment depend on the records and facts. Have a qualified tax professional reconstruct the schedule and determine whether an amended return, accounting-method procedure, or another treatment applies.",
  },
  {
    q: "What's the difference between a repair and an improvement on Schedule E?",
    a: "A qualifying repair may be currently deductible, while an improvement generally must be capitalized and recovered under the applicable rules. The result turns on the unit of property, scope of work, surrounding projects, elections, and facts—not the invoice label or a universal dollar cutoff. Keep detailed invoices and confirm material work under current guidance.",
  },
];

export default function ScheduleEPost() {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/blog/${SLUG}`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: TITLE,
    description: DESCRIPTION,
    datePublished: PUBLISHED_AT,
    dateModified: MODIFIED_AT,
    url: canonicalUrl,
    author: { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: "TrueCap", url: siteUrl },
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntityOfPage: canonicalUrl,
    image: [`${siteUrl}/home.jpg`],
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
            <h1 className={ARTICLE_TITLE}>{TITLE}</h1>
            <p className={ARTICLE_META}>
              <Link href="/blog" className={ARTICLE_META_LINK}>
                Blog
              </Link>{" "}
              ·{" "}
              {/* A date-only PUBLISHED_AT is UTC midnight: format it in UTC, as /blog does, or a render west of UTC shows the day before. */}
              {new Date(PUBLISHED_AT).toLocaleDateString("en-US", {
                timeZone: "UTC",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}{" "}
              · {READING_TIME} min read
            </p>
            <BlogByline />
            <UnderTitleAnalyzeLink />
            <p className={ARTICLE_LEDE}>
              Schedule E and a property cash-flow statement use different
              conventions. This walkthrough uses one simplified hypothetical to
              show the reconciliation, then identifies the records and
              taxpayer-specific rules that need current professional review.
            </p>
          </header>

          <ArticleBody>
            <h2>What Schedule E measures (and what it doesn&apos;t)</h2>
            <p>
              <a
                href="https://www.irs.gov/pub/irs-pdf/f1040se.pdf"
                className="tc-link"
              >
                Schedule E (Form 1040)
              </a>
              , Part I, reports income and expenses from rental real estate. The
              line numbers in this walkthrough follow the 2025 form. Form layout
              and filing treatment can change,
              and services, ownership, mixed use, entity structure, and other
              facts can affect which forms and taxes apply. Use the current form
              and instructions for the tax year instead of treating this page as
              a filing template.
            </p>
            <p>
              The critical mental shift: Schedule E measures{" "}
              <strong>taxable income</strong>, which is neither your cash flow
              nor your NOI. Depreciation may create a non-cash deduction;{" "}
              <a
                href="https://www.irs.gov/publications/p527"
                className="tc-link"
              >
                loan principal is generally not a current expense
              </a>
              ; and capitalized work
              is recovered under the applicable schedule rather than simply when
              paid. Financing reviews can also use tax-return information, but
              the documents and calculations depend on the loan program;{" "}
              <Link
                href="/blog/how-to-calculate-dscr#dscr-loans"
                className="tc-link"
              >
                DSCR loans
              </Link>{" "}
              may use property coverage as a primary ratio, while documentation
              and borrower review still vary.
            </p>

            <h2>The top of the form: property type and fair rental days</h2>
            <p>
              Before the money lines, the 2025 form asks for the property
              address, a property-type code, and two day
              counts: <strong>fair rental days</strong> and{" "}
              <strong>personal use days</strong>. Acquisition date, availability
              for rent, below-market use, personal use, and owner occupancy can
              all affect the reported day counts and expense allocation.
              House-hack and mixed-use allocations are fact-specific; confirm
              the{" "}
              <a
                href="https://www.irs.gov/instructions/i1040se"
                className="tc-link"
              >
                current personal-use thresholds and allocation method
              </a>{" "}
              before filing.
            </p>

            <h2>Line 3: rents received</h2>
            <p>
              This line generally starts with rental income under the
              taxpayer&apos;s accounting method. Prepaid rent, retained
              deposits, tenant-paid expenses, concessions, and uncollected rent
              can be treated differently depending on the facts. Reconcile the
              lease, ledger, bank records, and deposit accounting with the
              current instructions rather than copying scheduled rent.
            </p>

            <h2>Lines 5–19: the expense lines that do the work</h2>
            <p>
              The 2025 form separates expenses into multiple categories.
              Common entries to reconcile include:
            </p>
            <ul>
              <li>
                <strong>Line 7 — cleaning and maintenance:</strong> turnover
                cleans, lawn care, snow removal, gutter cleaning.
              </li>
              <li>
                <strong>Line 9 — insurance:</strong> the landlord policy
                premium, plus umbrella coverage allocated to the property.
              </li>
              <li>
                <strong>Line 11 — management fees:</strong> the property
                manager&apos;s fees for managing the property (a leasing
                commission may instead belong on line 8, commissions).
              </li>
              <li>
                <strong>Line 12 — mortgage interest:</strong> supported interest
                allocable to rental use, subject to the applicable limitations
                and adjustments. Reconcile lender records rather than copying
                the full payment.
              </li>
              <li>
                <strong>Line 14 — repairs:</strong> fixes that keep the property
                in an{" "}
                <a
                  href="https://www.irs.gov/instructions/i1040se"
                  className="tc-link"
                >
                  ordinarily efficient operating condition
                </a>
                , subject to the{" "}
                <a
                  href="https://www.irs.gov/publications/p527"
                  className="tc-link"
                >
                  capitalization rules
                </a>{" "}
                and the actual scope of work.
              </li>
              <li>
                <strong>Line 16 — taxes:</strong> property taxes. Note these are
                generally reported as rental expenses when allocable to the
                rental activity. Personal-use allocation and other limitations
                can apply; do not treat the{" "}
                <a
                  href="https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section164&num=0&edition=prelim"
                  className="tc-link"
                >
                  personal-itemized SALT cap
                </a>{" "}
                as the rule that decides Schedule E treatment.
              </li>
              <li>
                <strong>Line 18 — depreciation:</strong> the line that changes
                everything. It gets its own section.
              </li>
            </ul>
            <p>
              The rest — advertising (line 5), auto and travel (line 6),
              commissions (line 8), legal and professional fees (line 10),
              supplies (line 15), utilities (line 17), and the &quot;other&quot;
              catch-all on line 19 require the same ordinary-and-necessary,
              allocation, capitalization, and recordkeeping review. A broader
              checklist is in{" "}
              <Link
                href="/blog/rental-property-tax-deductions"
                className="tc-link"
              >
                rental property tax deductions
              </Link>
              .
            </p>

            <h2>Line 18: depreciation, the non-cash line that drives the result</h2>
            <p>
              Residential rental buildings are generally recovered under{" "}
              <a
                href="https://www.irs.gov/publications/p946"
                className="tc-link"
              >
                MACRS, while land is not depreciable
              </a>
              . Supported basis, land allocation,
              capitalized transaction costs, improvements, property class,
              placed-in-service timing, and conventions all affect the schedule;
              see the general closing-cost discussion in{" "}
              <Link
                href="/blog/closing-costs-investment-property"
                className="tc-link"
              >
                the closing-cost breakdown
              </Link>{" "}
              and have the supported allocation and recovery period reviewed. An
              assessor allocation can be evidence, but it is not a universal tax
              allocation or a safe percentage to copy.
            </p>
            <p>
              For the simplified illustration below, assume a supported $200,000
              building basis and the{" "}
              <a
                href="https://www.irs.gov/publications/p946"
                className="tc-link"
              >
                27.5-year recovery period IRS Publication 946 gives residential rental property
              </a>
              . Simple division
              produces <strong>$7,273</strong> ($200,000 ÷ 27.5). That&apos;s
              $606 a month of modeled non-cash deduction before applicable
              conventions, limitations, and adjustments. Depreciation also
              changes adjusted basis and can affect the amount and character of
              gain on a later disposition. A qualifying{" "}
              <Link
                href="/blog/1031-exchange-basics"
                className="tc-link"
              >
                1031 exchange
              </Link>{" "}
              <a
                href="https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section1031&num=0&edition=prelim"
                className="tc-link"
              >
                may postpone recognition in some circumstances
              </a>
              , but does not ensure full deferral or eliminate the need to model
              the exit.
            </p>

            <h2>A complete worked example: the $250K rental</h2>
            <p>
              This hypothetical assumes a $250,000 purchase, $2,100 monthly
              rent, a $187,500 loan at an entered 7% over 30 years, $200,000 of
              supported building basis, and the simplified expense inputs below.
              It is arithmetic for explaining the reconciliation—not a filing
              position, current loan quote, or expected property result:
            </p>
            <ul>
              <li>
                <strong>Line 3 — rents received:</strong> $25,200
              </li>
              <li>
                <strong>Line 9 — insurance:</strong> $1,400
              </li>
              <li>
                <strong>Line 11 — management fees (8%):</strong> $2,016
              </li>
              <li>
                <strong>Line 12 — mortgage interest:</strong> $13,064
              </li>
              <li>
                <strong>Line 14 — repairs:</strong> $1,800
              </li>
              <li>
                <strong>Line 16 — property taxes:</strong> $3,000
              </li>
              <li>
                <strong>Line 18 — depreciation:</strong> $7,273
              </li>
              <li>
                <strong>Line 19 — other (HOA, software, bank fees):</strong>{" "}
                $350
              </li>
              <li>
                <strong>Line 20 — total expenses:</strong> $28,903
              </li>
              <li>
                <strong>Line 21 — income or (loss):</strong>{" "}
                <strong>($3,703)</strong>
              </li>
            </ul>
            <p>
              Under the stated assumptions, cash operating expenses were $8,566
              (everything except interest and depreciation), so NOI is $16,634.
              Debt service was $14,969. Modeled cash flow:{" "}
              <strong>+$1,665 for the year, about +$139/month</strong>, with a
              DSCR of 1.11. The modeled tax column shows a $3,703 loss before
              taxpayer-specific limitations. The arithmetic bridge is cash flow
              ($1,665) plus{" "}
              <Link
                href="/glossary/principal-paydown"
                className="tc-link"
              >
                principal paydown
              </Link>{" "}
              ($1,905, cash out but not deductible) minus depreciation
              ($7,273, deductible but not cash) equals the $3,703 modeled
              loss. Sanity-check the pre-tax operating
              side in the{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              and review the reporting distinctions in the{" "}
              <Link
                href="/blog/rental-property-tax-deductions"
                className="tc-link"
              >
                rental-property tax-deduction guide
              </Link>
              . Your actual tax effect depends on taxpayer-specific eligibility,
              limitations, and other return items.
            </p>

            <h2>Line 22: can you actually use the loss?</h2>
            <p>
              A loss on line 21 doesn&apos;t automatically reduce your taxes.
              Rental activities are commonly{" "}
              <a
                href="https://www.irs.gov/publications/p925"
                className="tc-link"
              >
                subject to passive-activity rules
              </a>
              , and any active-participation allowance depends on the applicable
              tax-year thresholds, ownership, participation, filing status,
              modified income, and other limitations. Material participation,
              basis, at-risk rules, personal use, and grouping can require
              separate analysis.
            </p>
            <p>
              In one taxpayer&apos;s return the hypothetical loss might be
              usable currently; in another it might be limited or carried
              forward. Real-estate-professional status{" "}
              <a
                href="https://www.irs.gov/publications/p925"
                className="tc-link"
              >
                does not by itself make every rental loss non-passive
              </a>
              : the applicable qualification,
              material-participation, grouping, basis, at-risk, and other tests
              still matter. A later disposition can affect carryforwards, but
              full release is not automatic for every transfer or sale.
            </p>

            <h2>Where the number goes from here</h2>
            <p>
              The allowed amount flows through the current return under the
              applicable instructions. Services, entity structure, activity
              classification, and other facts can also{" "}
              <a
                href="https://www.irs.gov/instructions/i1040se"
                className="tc-link"
              >
                change employment-tax and reporting treatment
              </a>
              , so do not assume every rental dollar receives
              the same treatment. Keep the depreciation schedule, carryforward
              records, and support for income and expenses; those records are
              needed to review later-year deductions and disposition treatment.
            </p>

            <h2>Four reconciliation risks</h2>
            <p>
              <strong>Treating a project label as its tax result.</strong> A
              whole-building-system replacement can differ from a localized
              repair, but the unit of property, scope, elections, and
              surrounding work control. Review the general distinction in the{" "}
              <Link
                href="/blog/capex-maintenance-reserves-rental-property"
                className="tc-link"
              >
                capex and reserves guide
              </Link>
              , then confirm material work from invoices and current guidance. A
              seller&apos;s Schedule E is not a substitute for inspection,
              invoices, permits, or a capital plan.
            </p>
            <p>
              <strong>
                Using the full mortgage payment as a current expense.
              </strong>{" "}
              In the hypothetical, total principal and interest differs from the
              modeled interest component. Reconcile the actual loan schedule and
              applicable interest limitations rather than deducting the payment
              total.
            </p>
            <p>
              <strong>Ignoring missed depreciation.</strong>{" "}
              <a
                href="https://www.irs.gov/publications/p946"
                className="tc-link"
              >
                Allowed-or-allowable amounts
              </a>{" "}
              can affect adjusted basis even when a deduction was not claimed. A qualified professional should
              determine the correction procedure and model the disposition; do
              not assume one form or result fits every history.
            </p>
            <p>
              <strong>Losing track of carryforwards.</strong> A qualifying{" "}
              <a
                href="https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section469&num=0&edition=prelim"
                className="tc-link"
              >
                fully taxable disposition of an entire interest to an unrelated party
              </a>{" "}
              can have different consequences from a partial, related-party,
              installment, gifted, or deferred transaction. Preserve the records
              and have the specific disposition reviewed before treating a
              carryforward as released.
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

          <ArticleBody className="mt-16">
            <h2>Read the form before you buy the property</h2>
            <p>
              Professional review is particularly important around the
              repair-vs-improvement boundary, passive losses, and dispositions.
              The structure of Schedule E is exactly why after-tax return and
              cash-on-cash return diverge, and why two investors in different
              tax brackets can correctly disagree about the same deal. The{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              screens pre-tax rental cash flow but does not currently expose a
              tax-specific module. Build the Schedule E and loss-usability
              scenario with a qualified professional. Related reading:{" "}
              <Link
                href="/blog/rental-property-tax-deductions"
                className="tc-link"
              >
                the 14 rental tax deductions
              </Link>
              ,{" "}
              <Link
                href="/blog/1031-exchange-basics"
                className="tc-link"
              >
                1031 exchange basics
              </Link>
              , and{" "}
              <Link
                href="/blog/cash-on-cash-vs-irr"
                className="tc-link"
              >
                cash-on-cash vs IRR
              </Link>
              .
            </p>
          </ArticleBody>
        </article>
        <PostSources sources={SOURCES} />
        <RelatedContent kind="blog" slug={SLUG} title={TITLE} className="mt-10" />
        <RelatedBlogPosts currentSlug={SLUG} />
      </ArticleMain>
      <ArticleEnd>
        <BlogStickyCta inArticleColumn />
      </ArticleEnd>
      <SiteFooter />
      <ScrollDepthTracker />
    </ArticlePage>
  );
}
