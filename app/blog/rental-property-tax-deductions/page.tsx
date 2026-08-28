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
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

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
const MODIFIED_AT = "2026-08-15";
const READING_TIME = 11;

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

const FAQS = [
  {
    q: "What's the most valuable rental property tax deduction?",
    a: "Depreciation is often one of the largest deductions, but there is no universal 'most valuable' deduction. For an illustrative $400,000 residential-rental building basis (excluding land), straight-line depreciation before first- and last-year conventions is roughly $14,500 per full year. That is a deduction, not a promised cash saving: passive-activity, basis, at-risk, personal-use, and other limits can defer or reduce the current tax effect, and depreciation affects the tax calculation when the property is sold.",
  },
  {
    q: "Can I deduct my mortgage payment?",
    a: "The interest allocable to rental use is generally a rental expense; principal is not. The allowable amount can depend on mixed personal use, business-interest limitations, prepaid interest, and other facts. Form 1098 is a useful record when one is issued, but it does not by itself decide how every amount is reported on Schedule E.",
  },
  {
    q: "What about repairs vs improvements?",
    a: "A qualifying repair may be currently deductible, while an improvement generally must be capitalized and recovered over time. The classification is based on the facts and applicable capitalization rules, including whether work improves a unit of property or qualifies for a safe harbor. Labels such as 'repair' on an invoice do not decide the result.",
  },
  {
    q: "Can I deduct travel to my rental property?",
    a: "Ordinary and necessary travel whose primary purpose is managing, conserving, or maintaining a rental may be deductible, subject to allocation and recordkeeping rules. Travel primarily for improvements is generally recovered through the improvement rather than deducted as current travel. Keep contemporaneous records and use the IRS standard-mileage page for the rate that applies to the trip date.",
  },
  {
    q: "What's a 'real estate professional' status and why does it matter?",
    a: "The IRS real-estate-professional tests generally require more than half of the taxpayer's personal services and more than 750 hours in qualifying real-property trades or businesses. Meeting those tests does not automatically make every rental loss currently deductible: material participation, activity grouping, basis, at-risk, passive-loss, and other limits can still apply. Review the facts with a qualified tax professional.",
  },
  {
    q: "Should I use a CPA or do my own rental property taxes?",
    a: "Complexity matters more than property count. Consider professional advice when you have mixed personal and rental use, multiple owners or entities, passive losses, a cost-segregation study, a like-kind exchange, a change in use, or a sale. Fees and results vary; no adviser can responsibly promise that their fee will produce a fixed multiple of tax savings.",
  },
];

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
    author: { "@type": "Person", name: "Morgan Page", url: siteUrl },
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
        item: `${siteUrl}/`,
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
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <article>
          <div className="mb-2">
            <Link
              href="/blog"
              className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
            >
              ← Blog
            </Link>
          </div>
          <header className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight text-balance">
              {TITLE}
            </h1>
            <p className="mt-3 text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
              {new Date(PUBLISHED_AT).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}{" "}
              · {READING_TIME} min read
            </p>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              A deduction generally reduces taxable income; it is not a
              dollar-for-dollar tax saving, and limits can defer or disallow the
              current benefit. Here are 14 common rental-property expense
              categories to review, organized around Schedule E with worked
              examples.
            </p>
          </header>

          <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
            <p>
              A note before we start: this is general education, not tax advice.
              Eligibility depends on your facts and the law for the relevant tax
              year. Use this as a checklist alongside current{" "}
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
              The interest allocable to rental use is generally a rental
              expense. Principal is not a current expense, and limits can apply
              to interest depending on the facts.
            </p>
            <p>
              <strong>Illustrative example:</strong> a $300k, 30-year loan at 7%
              produces about $20,800 of interest during the first 12 payments.
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
              buildings are generally recovered over 27.5 years under MACRS;
              land is not depreciable. Basis allocation, placed-in-service
              timing, personal use, and first- and last-year conventions affect
              the actual deduction.
            </p>
            <p>
              <strong>Illustrative example:</strong> if a supported allocation
              assigns $400k of a $500k purchase to the residential-rental
              building, simple division by 27.5 is about $14,545 per full year
              before conventions and other adjustments. That figure is a modeled
              deduction, not a guaranteed current tax saving. Passive-activity,
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
                href="https://www.irs.gov/businesses/small-businesses-self-employed/audit-techniques-guides-atgs"
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
              Annual real estate tax paid to the county. Pull it from the county
              appraisal district website — do NOT rely on the seller&apos;s
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
              A qualifying repair may be a current expense, while an improvement
              generally must be capitalized. The result turns on the work
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
              re-piping. Recovery periods and elections depend on the component
              and facts.
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
              Ordinary management fees, leasing fees, and maintenance
              coordination costs allocable to rental operations are commonly
              current expenses. Capital-project fees, prepaid amounts, and
              mixed-use costs may require different treatment.
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
              Ordinary and necessary travel primarily to manage, conserve, or
              maintain a rental may be deductible, subject to allocation and
              substantiation. The optional business mileage rate can change,
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
              <strong>Deductible:</strong> mileage to inspect the property, meet
              a contractor, attend an HOA meeting, drive to Home Depot for
              repair supplies, visit a prospective tenant.
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
              10. Professional services (Schedule E line 11)
            </h2>
            <p>
              Fees for tax preparation allocable to the rental, bookkeeping,
              property management, and qualifying legal work may be current
              rental expenses. Acquisition costs and selling expenses follow
              different capitalization or sale-treatment rules; commissions are
              not automatically a current Schedule E deduction.
            </p>
            <p>
              The portion of a tax-preparation fee allocable to the rental
              activity may be deductible; personal-return work and entity-level
              fees may be reported differently.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              11. HOA fees (Schedule E line 14)
            </h2>
            <p>
              Ordinary HOA dues allocable to rental use are generally rental
              expenses. A special assessment may instead fund a capital
              improvement and require capitalization. Ask what the assessment
              pays for before deciding how to report it.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              12. Advertising (Schedule E line 4)
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
              qualifying points, are generally recovered over the loan term
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
              is used exclusively and regularly for the rental activity and the
              other applicable requirements are met. The method, allocable
              expenses, rental&apos;s status as a trade or business, and other
              facts determine the amount; there is no standard savings range.
            </p>
            <p>
              The exclusive-and-regular-use test is strict. The IRS doesn&apos;t
              accept &quot;I sometimes work from the kitchen table.&quot; Use a
              dedicated home office only.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The passive activity loss rules — why your losses might not deduct
            </h2>
            <p>
              Rental activities are generally passive under federal rules, even
              when the owner participates, unless an exception applies. Passive
              losses generally offset passive income and otherwise may carry
              forward, subject to basis, at-risk, personal-use, and other
              limitations.
            </p>
            <p>Two important exceptions:</p>
            <p>
              <strong>
                Special allowance for qualifying rental real estate.
              </strong>{" "}
              An individual who actively participates may be able to deduct up
              to $25,000 of qualifying loss against nonpassive income, but MAGI,
              filing status, ownership, phaseout, basis, and at-risk rules
              apply. Use the current Form 8582 instructions and Publication 925
              rather than treating the maximum as automatic.
            </p>
            <p>
              <strong>Real estate professional status.</strong> Passing the
              more-than-half and 750-hour tests is only part of the analysis.
              The taxpayer must also materially participate in the relevant
              rental activity or a valid grouped activity, and basis, at-risk,
              excess-business-loss, and other limitations can still restrict a
              deduction. Status does not automatically make every rental loss
              fully deductible.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              When you sell — depreciation recapture
            </h2>
            <p>
              Depreciation allowed or allowable generally reduces adjusted
              basis. On a taxable sale, part of the gain attributable to
              depreciation may be treated as unrecaptured section 1250 gain,
              which has a maximum federal rate of 25%; other character,
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
              may defer recognized gain when strict eligibility, identification,
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
              </Link>
              &apos;s tax-impact output as an illustrative scenario. It does not
              determine eligibility, passive-loss treatment, filing position, or
              the advice a tax professional would give for your return.
            </p>
          </div>
        </article>
      </main>
      <RelatedBlogPosts currentSlug={SLUG} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <NewsletterSignup variant="expanded" source="blog" />
      </div>
      <BlogStickyCta />
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
