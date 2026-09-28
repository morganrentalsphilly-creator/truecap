/**
 * Blog post: Rental property tax deductions — the 14 deductions every
 * investor should know.
 *
 * Targets massive-volume queries:
 *   - "rental property tax deductions"
 *   - "what can you deduct on a rental property"
 *   - "rental property write offs"
 *   - "schedule e deductions"
 *   - "depreciation rental property"
 *
 * Strategy: comprehensive list-style post + worked examples + clear
 * Schedule E categorization. Pulls heavy long-tail traffic.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { BlogByline } from "@/components/marketing/blog-byline";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { RelatedContent } from "@/components/marketing/related-content";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";
import { Header } from "@/components/investcalc/header";
import { lastmodFor } from "@/lib/seo/lastmod";
import { JsonLd } from "@/components/seo/json-ld";
import { PostSources, type PostSource } from "@/components/blog/post-sources";

const SLUG = "rental-property-tax-deductions";
const TITLE =
  "Rental property tax deductions — the 14 every investor should know";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Rental property tax deductions: the top 14 (2026)";
const DESCRIPTION =
  "A practical Schedule E checklist for rental-property expenses, with worked deduction examples, eligibility limits, and links to current IRS guidance.";
const PUBLISHED_AT = "2026-05-26";
const MODIFIED_AT = lastmodFor("/blog/rental-property-tax-deductions") ?? PUBLISHED_AT;
const READING_TIME = 11;

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
    title: "IRS Publication 925 (2025), Passive Activity and At-Risk Rules",
    url: "https://www.irs.gov/publications/p925",
  },
  {
    title: "IRS Publication 946 (2025), How To Depreciate Property",
    url: "https://www.irs.gov/publications/p946",
  },
  {
    title: "IRS Publication 5653 (2-2025), Cost Segregation Audit Techniques Guide",
    url: "https://www.irs.gov/pub/irs-pdf/p5653.pdf",
  },
  {
    title: "IRS, Standard mileage rates",
    url: "https://www.irs.gov/tax-professionals/standard-mileage-rates",
  },
  {
    title: "IRS, 2025 Instructions for Schedule E (Form 1040)",
    url: "https://www.irs.gov/instructions/i1040se",
  },
  {
    title: "IRS Publication 587 (2025), Business Use of Your Home",
    url: "https://www.irs.gov/publications/p587",
  },
  {
    title: "26 U.S.C. 461, Limitation on excess business losses (461(l))",
    url: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section461&num=0&edition=prelim",
  },
  {
    title: "IRS Topic no. 409, Capital gains and losses",
    url: "https://www.irs.gov/taxtopics/tc409",
  },
  {
    title: "26 U.S.C. 1031, Exchange of real property held for productive use or investment",
    url: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section1031&num=0&edition=prelim",
  },
];

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "rental property tax deductions",
    "rental property write offs",
    "what can you deduct on a rental property",
    "schedule e deductions",
    "rental property depreciation",
    "real estate tax deductions",
    "landlord tax deductions",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    title: SERP_TITLE,
    description: DESCRIPTION,
    url: `/blog/${SLUG}`,
    type: "article",
    publishedTime: PUBLISHED_AT,
    modifiedTime: MODIFIED_AT,
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

export default function TaxDeductionsPost() {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/blog/${SLUG}`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${canonicalUrl}#article`,
    headline: TITLE,
    description: DESCRIPTION,
    datePublished: PUBLISHED_AT,
    dateModified: MODIFIED_AT,
    url: canonicalUrl,
    author: { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: "TrueCap", url: siteUrl },
    publisher: { "@id": `${siteUrl}/#organization` },
    isPartOf: { "@id": `${siteUrl}/blog#blog` },
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

  return (
    <div className="min-h-screen bg-background">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbLd} />
      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <article>
          <div className="mb-2">
            <Link
              href="/blog"
              className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground"
            >
              ← Blog
            </Link>
          </div>
          <header className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight text-balance">
              {TITLE}
            </h1>
            <p className="mt-3 text-2xs uppercase tracking-widest text-muted-foreground font-bold">
              {new Date(PUBLISHED_AT).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}{" "}
              · {READING_TIME} min read
            </p>
            <BlogByline />
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              A deduction generally reduces taxable income; it is not a
              dollar-for-dollar tax saving, and limits can defer or disallow the
              current benefit. Here are 14 common rental-property expense
              categories to review, organized around Schedule E with worked
              examples.
            </p>
          </header>

          <div className="prose prose-neutral max-w-none [&>p]:max-w-[68ch] [&>ul]:max-w-[68ch] [&>ol]:max-w-[68ch] [&>blockquote]:max-w-[68ch] [&>h2]:max-w-[68ch] [&>h3]:max-w-[68ch] text-foreground space-y-6 leading-relaxed">
            <p>
              A note before we start: eligibility depends on your facts and the
              law for the relevant tax year. The line numbers below follow the{" "}
              <a
                href="https://www.irs.gov/pub/irs-pdf/f1040se.pdf"
                className="text-primary font-semibold hover:underline"
              >
                2025 Schedule E (Form 1040)
              </a>
              . Use this as a checklist alongside current{" "}
              <a
                href="https://www.irs.gov/publications/p527"
                className="text-primary font-semibold hover:underline"
              >
                IRS Publication 527
              </a>{" "}
              and{" "}
              <a
                href="https://www.irs.gov/publications/p925"
                className="text-primary font-semibold hover:underline"
              >
                IRS Publication 925
              </a>
              , then confirm the filing treatment with a qualified tax
              professional.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              1. Mortgage interest (Schedule E line 12)
            </h2>
            <p>
              The interest allocable to rental use is{" "}
              <a
                href="https://www.irs.gov/publications/p527"
                className="text-primary font-semibold hover:underline"
              >
                generally a rental expense
              </a>
              . Principal is not a current expense, and limits can apply to
              interest depending on the facts.
            </p>
            <p>
              <strong>Illustrative example:</strong> a $300k, 30-year loan at 7%
              produces about $20,900 of interest during the first 12 payments.
              The allowable rental deduction may differ because of closing
              dates, points, mixed use, business-interest limits, or other
              adjustments. Use the lender&apos;s records and your actual
              amortization schedule. Interest is below the property&apos;s{" "}
              <Link
                href="/glossary/noi"
                className="text-primary font-semibold hover:underline"
              >
                NOI
              </Link>{" "}
              line because NOI is computed before debt service.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              2. Depreciation (Schedule E line 18)
            </h2>
            <p>
              Depreciation is a common non-cash deduction. Residential rental
              buildings are generally recovered over{" "}
              <a
                href="https://www.irs.gov/publications/p946"
                className="text-primary font-semibold hover:underline"
              >
                27.5 years under MACRS; land is not depreciable
              </a>
              . Basis allocation, placed-in-service
              timing, personal use, and first- and last-year conventions affect
              the actual deduction.
            </p>
            <p>
              <strong>Illustrative example:</strong> if a supported allocation
              assigns $400k of a $500k purchase to the residential-rental
              building, simple division by 27.5 is about $14,545 per full year
              before conventions and other adjustments. That figure is a modeled
              deduction; on its own it does not establish a current tax saving.
              Passive-activity,
              basis, at-risk, and other limits can change when or whether it
              reduces tax. The{" "}
              <Link
                href="/blog/schedule-e-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                Schedule E walkthrough
              </Link>{" "}
              explains where the deduction is reported; discuss the
              property-specific result with your adviser.
            </p>
            <p>
              <strong>Cost segregation.</strong> A defensible study may identify
              eligible components with shorter recovery periods than the
              residential building. The classification is fact-intensive, and
              the timing benefit depends on basis, acquisition and
              placed-in-service dates, bonus-depreciation eligibility,
              passive-loss limits, recapture, study cost, and the planned hold.
              There is no responsible universal property-price threshold or
              payback multiple. Compare the after-tax present value under
              adviser-reviewed scenarios and review the IRS{" "}
              <a
                href="https://www.irs.gov/pub/irs-pdf/p5653.pdf"
                className="text-primary font-semibold hover:underline"
              >
                Cost Segregation Audit Technique Guide
              </a>{" "}
              and{" "}
              <a
                href="https://www.irs.gov/publications/p946"
                className="text-primary font-semibold hover:underline"
              >
                Publication 946
              </a>
              .
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              3. Property tax (Schedule E line 16)
            </h2>
            <p>
              Annual real estate tax paid to the county;{" "}
              <a
                href="https://www.irs.gov/publications/p527"
                className="text-primary font-semibold hover:underline"
              >
                Publication 527
              </a>{" "}
              lists taxes among the expenses that can be deducted from rental
              income. Pull the figure from the county appraisal district website — do NOT rely on the seller&apos;s
              last-year number, which may have changed with reassessment.
            </p>
            <p>
              If the assessment appears inconsistent with the parcel or local
              appeal rules, review the assessor&apos;s evidence and filing
              deadline. An appeal can succeed, fail, or even expose a different
              valuation issue; do not underwrite a fixed savings amount before a
              decision is issued.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              4. Insurance (Schedule E line 9)
            </h2>
            <p>
              Landlord insurance premiums. Note: this is landlord insurance
              specifically, not homeowner&apos;s insurance — the policies are
              different and one won&apos;t protect the other use case.
            </p>
            <p>
              Mortgage-insurance treatment depends on the policy, rental use,
              accounting method, and payment period. Confirm the amount and
              timing with your tax professional rather than assuming the
              personal-residence PMI rules apply.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              5. Repairs (Schedule E line 14)
            </h2>
            <p>
              A qualifying repair may be a current expense, while an improvement{" "}
              <a
                href="https://www.irs.gov/publications/p527"
                className="text-primary font-semibold hover:underline"
              >
                generally must be capitalized
              </a>
              . The result turns on the work
              performed, the unit of property, and any applicable safe
              harbor—not merely on whether the invoice says &quot;repair.&quot;
            </p>
            <p>
              <strong>Items often reviewed as repairs:</strong> limited roof
              patching, painting between tenants, a broken window, a localized
              plumbing fix, or a small fence repair. Scope and surrounding
              projects can change the classification.
            </p>
            <p>
              <strong>Items often reviewed as improvements:</strong> a full roof
              replacement, kitchen remodel, addition, HVAC replacement, or full
              re-piping;{" "}
              <a
                href="https://www.irs.gov/publications/p527"
                className="text-primary font-semibold hover:underline"
              >
                Publication 527&apos;s table of improvement examples
              </a>{" "}
              lists similar items. Recovery periods and elections depend on the
              component and facts.
            </p>
            <p>
              The line gets fuzzy. Review material first-year work with a tax
              professional and keep invoices detailed enough to support the
              classification; the effect depends on the actual scope and cost,
              not a standard deduction range.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              6. Property management fees (Schedule E line 11)
            </h2>
            <p>
              Ordinary management fees and maintenance coordination costs
              allocable to rental operations are commonly current expenses (a
              leasing commission may instead belong on line 8, commissions).
              Capital-project fees, prepaid amounts, and mixed-use costs may
              require different treatment.
            </p>
            <p>
              Your own labor is not a cash expense. Ordinary and necessary
              tools, software, and substantiated travel used for a qualifying
              rental activity may be deductible, subject to allocation,
              capitalization, and other limits.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              7. Utilities (Schedule E line 17)
            </h2>
            <p>
              Owner-paid water, sewer, trash, gas, or electric allocable to
              rental use are commonly operating expenses. Reimbursements,
              personal use, tenant-paid amounts, and vacant or pre-service
              periods can change the reporting.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              8. Cleaning + maintenance (Schedule E line 7)
            </h2>
            <p>
              Ordinary turnover cleaning, lawn service, pest control, snow
              removal, gutter cleaning, HVAC servicing, and carpet cleaning are
              commonly current rental expenses when the applicable requirements
              are met.
            </p>
            <p>
              Do not combine maintenance and capital improvements into one
              unsupported category. A deep clean between tenants is different
              from replacing flooring, but the facts and applicable depreciation
              rules determine the treatment.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              9. Travel (Schedule E line 6)
            </h2>
            <p>
              Ordinary and necessary travel{" "}
              <a
                href="https://www.irs.gov/publications/p527"
                className="text-primary font-semibold hover:underline"
              >
                primarily to manage, conserve, or maintain a rental
              </a>{" "}
              may be deductible, subject to allocation and substantiation. The optional business mileage rate can change,
              including within a year; use the{" "}
              <a
                href="https://www.irs.gov/tax-professionals/standard-mileage-rates"
                className="text-primary font-semibold hover:underline"
              >
                IRS standard-mileage table
              </a>{" "}
              for the trip date.
            </p>
            <p>
              Trips between your home and a rental are{" "}
              <a
                href="https://www.irs.gov/publications/p527"
                className="text-primary font-semibold hover:underline"
              >
                generally nondeductible commuting
              </a>{" "}
              unless your home is your principal place of business. Subject to
              that rule, mileage <strong>can be deductible</strong> when the
              trip is to collect rent or to manage, conserve, or maintain the
              rental: for example, to inspect the property, meet a contractor
              about a repair, attend an HOA meeting, drive to Home Depot for
              repair supplies, or visit a prospective tenant. Trips for an
              improvement are recovered through the improvement.
            </p>
            <p>
              <strong>Not deductible:</strong> primary-purpose-personal trips
              where you happen to drop by the rental.
            </p>
            <p>
              Keep contemporaneous records of date, destination, business
              purpose, and distance, plus receipts when using actual expenses. A
              mileage app can help, but the record—not the brand of app—supports
              the deduction.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              10. Professional services (Schedule E line 10)
            </h2>
            <p>
              Fees for tax preparation allocable to the rental, bookkeeping,
              and qualifying legal work may be current rental expenses
              (management fees go on line 11). Acquisition costs and selling
              expenses follow
              different capitalization or sale-treatment rules; commissions are
              not automatically a current Schedule E deduction.
            </p>
            <p>
              The portion of a tax-preparation fee allocable to the rental
              activity{" "}
              <a
                href="https://www.irs.gov/publications/p527"
                className="text-primary font-semibold hover:underline"
              >
                may be deductible
              </a>
              ; personal-return work and entity-level
              fees may be reported differently.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              11. HOA fees (Schedule E line 19, other)
            </h2>
            <p>
              Ordinary HOA dues allocable to rental use are generally rental
              expenses. Schedule E has no dedicated HOA line; the{" "}
              <a
                href="https://www.irs.gov/instructions/i1040se"
                className="text-primary font-semibold hover:underline"
              >
                Schedule E instructions
              </a>{" "}
              send ordinary and necessary expenses not listed on lines 5
              through 18 to line 19. A special assessment may instead fund a
              capital improvement and{" "}
              <a
                href="https://www.irs.gov/publications/p527"
                className="text-primary font-semibold hover:underline"
              >
                require capitalization
              </a>
              . Ask what the assessment pays for before deciding how to report
              it.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              12. Advertising (Schedule E line 5)
            </h2>
            <p>
              Ordinary costs to advertise an available rental—listing fees and
              rental-listing photography, for example—are commonly current
              expenses. Acquisition marketing, capital-project media, and
              prepaid campaigns may require different treatment.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              13. Loan-origination costs (amortized)
            </h2>
            <p>
              Certain costs of obtaining a rental-property loan, including
              qualifying points, are{" "}
              <a
                href="https://www.irs.gov/instructions/i1040se"
                className="text-primary font-semibold hover:underline"
              >
                generally recovered over the loan term
              </a>{" "}
              rather than deducted entirely at closing. Other fees may be
              capitalized into basis, treated as selling costs, or follow a
              different rule. Do not assume every line in the lender&apos;s
              closing-cost total is amortized identically.
            </p>
            <p>
              Title, recording, transfer, appraisal, legal, and escrow charges
              must be classified by what they relate to. Keep the closing
              disclosure and invoices so a tax professional can allocate them
              correctly.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              14. Home office (if you qualify)
            </h2>
            <p>
              A home-office deduction may be available when a qualifying space
              is{" "}
              <a
                href="https://www.irs.gov/publications/p587"
                className="text-primary font-semibold hover:underline"
              >
                used exclusively and regularly
              </a>{" "}
              for the rental activity and the other applicable requirements are
              met. The method, allocable
              expenses, rental&apos;s status as a trade or business, and other
              facts determine the amount; there is no standard savings range.
            </p>
            <p>
              The exclusive-use test is strict: Publication 587 says an area
              used for both business and personal purposes does not meet it. A
              kitchen table you also eat at is one everyday example.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The passive activity loss rules — why your losses might not deduct
            </h2>
            <p>
              Rental activities are{" "}
              <a
                href="https://www.irs.gov/publications/p925"
                className="text-primary font-semibold hover:underline"
              >
                generally passive under federal rules
              </a>
              , even when the owner participates, unless an exception applies. Passive
              losses generally offset passive income and otherwise may carry
              forward, subject to basis, at-risk, personal-use, and other
              limitations.
            </p>
            <p>Two important exceptions:</p>
            <p>
              <strong>
                Special allowance for qualifying rental real estate.
              </strong>{" "}
              An individual who actively participates may be able to deduct{" "}
              <a
                href="https://www.irs.gov/publications/p925"
                className="text-primary font-semibold hover:underline"
              >
                up to $25,000 of qualifying loss
              </a>{" "}
              against nonpassive income, but MAGI,
              filing status, ownership, phaseout, basis, and at-risk rules
              apply. Use the current Form 8582 instructions and Publication 925
              rather than treating the maximum as automatic.
            </p>
            <p>
              <strong>Real estate professional status.</strong> Passing the{" "}
              <a
                href="https://www.irs.gov/publications/p925"
                className="text-primary font-semibold hover:underline"
              >
                more-than-half and 750-hour tests
              </a>{" "}
              is only part of the analysis. The taxpayer must also materially
              participate in the relevant rental activity or a valid grouped
              activity, and basis, at-risk,{" "}
              <a
                href="https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section461&num=0&edition=prelim"
                className="text-primary font-semibold hover:underline"
              >
                excess-business-loss
              </a>
              , and other limitations can still restrict a deduction. Status does not automatically make every rental loss
              fully deductible.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              When you sell — depreciation recapture
            </h2>
            <p>
              Depreciation{" "}
              <a
                href="https://www.irs.gov/publications/p946"
                className="text-primary font-semibold hover:underline"
              >
                allowed or allowable
              </a>{" "}
              generally reduces adjusted basis. On a taxable sale, part of the
              gain attributable to depreciation may be treated as unrecaptured
              section 1250 gain, which has a{" "}
              <a
                href="https://www.irs.gov/taxtopics/tc409"
                className="text-primary font-semibold hover:underline"
              >
                maximum federal rate of 25%
              </a>
              ; other character,
              ordering, state-tax, and limitation rules can also apply.
            </p>
            <p>
              A simplified basis-and-sale example can illustrate the concept,
              but purchase allocation, improvements, selling costs, suspended
              losses, prior use, depreciation actually allowed or allowable, and
              total gain all change the result. Have the closing statement and
              depreciation schedule modeled together before relying on sale
              proceeds.
            </p>
            <p>
              A properly executed{" "}
              <Link
                href="/blog/1031-exchange-basics"
                className="text-primary font-semibold hover:underline"
              >
                section 1031 exchange
              </Link>{" "}
              <a
                href="https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section1031&num=0&edition=prelim"
                className="text-primary font-semibold hover:underline"
              >
                may defer recognized gain
              </a>{" "}
              when strict eligibility, identification,
              timing, title, and reinvestment requirements are met. It defers
              rather than erases tax, and it is not a cure-all for every sale.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The action plan
            </h2>
            <p>
              (1) Pull last year&apos;s Schedule E and supporting records. Use
              the categories above as review prompts, not as proof that an
              unclaimed item is deductible or can be added to the current
              return.
            </p>
            <p>
              (2) If you are considering cost segregation, compare
              adviser-reviewed scenarios with and without the study. Include
              study cost, bonus-depreciation eligibility, passive-loss timing,
              recapture, expected hold, discount rate, and audit support; gross
              rent or property price alone does not determine whether it is
              worthwhile.
            </p>
            <p>
              (3) If real-estate-professional status may be relevant, ask a
              qualified tax professional to review each spouse&apos;s hours,
              contemporaneous records, material participation, grouping
              elections, and other loss limits before the return is filed.
            </p>
            <p>
              (4) Use{" "}
              <Link
                href="/"
                className="text-primary font-semibold hover:underline"
              >
                TrueCap
              </Link>{" "}
              to screen the property&apos;s pre-tax rental cash flow. It does
              not currently model tax impact, eligibility, passive-loss
              treatment, or filing position; build those scenarios with a
              qualified tax professional.
            </p>
          </div>
        </article>
        <PostSources sources={SOURCES} />
        <RelatedContent kind="blog" slug={SLUG} title={TITLE} className="mt-10" />
        <RelatedBlogPosts currentSlug={SLUG} />
      </main>
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <NewsletterSignup variant="expanded" source="blog" />
      </div>
      <BlogStickyCta />
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
