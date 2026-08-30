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
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "schedule-e-rental-property";
const TITLE = "Schedule E for rental property: a line-by-line walkthrough";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Schedule E for rental property, line by line";
const DESCRIPTION =
  "A general Schedule E walkthrough with a hypothetical rental example, recordkeeping prompts, and questions to verify against current IRS guidance and your tax return.";
const PUBLISHED_AT = "2026-06-12";
const MODIFIED_AT = "2026-08-29";
const READING_TIME = 10;

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
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
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
    author: { "@type": "Person", name: "Morgan Page", url: siteUrl },
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
              Schedule E and a property cash-flow statement use different
              conventions. This walkthrough uses one simplified hypothetical to
              show the reconciliation, then identifies the records and
              taxpayer-specific rules that need current professional review.
            </p>
          </header>

          <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              What Schedule E measures (and what it doesn&apos;t)
            </h2>
            <p>
              Schedule E (Form 1040), Part I, reports income and expenses from
              rental real estate. Form layout and filing treatment can change,
              and services, ownership, mixed use, entity structure, and other
              facts can affect which forms and taxes apply. Use the current form
              and instructions for the tax year instead of treating this page as
              a filing template.
            </p>
            <p>
              The critical mental shift: Schedule E measures{" "}
              <strong>taxable income</strong>, which is neither your cash flow
              nor your NOI. Depreciation may create a non-cash deduction; loan
              principal is generally not a current expense; and capitalized work
              is recovered under the applicable schedule rather than simply when
              paid. Financing reviews can also use tax-return information, but
              the documents and calculations depend on the loan program;{" "}
              <Link
                href="/blog/dscr-loans-explained"
                className="text-primary font-semibold hover:underline"
              >
                DSCR loans
              </Link>{" "}
              may use property coverage as a primary ratio, while documentation
              and borrower review still vary.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The top of the form: property type and fair rental days
            </h2>
            <p>
              Before the money lines, the form version underlying this example
              asks for the property address, a property-type code, and two day
              counts: <strong>fair rental days</strong> and{" "}
              <strong>personal use days</strong>. Acquisition date, availability
              for rent, below-market use, personal use, and owner occupancy can
              all affect the reported day counts and expense allocation.
              House-hack and mixed-use allocations are fact-specific; confirm
              the current thresholds and allocation method before filing.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Line 3: rents received
            </h2>
            <p>
              This line generally starts with rental income under the
              taxpayer&apos;s accounting method. Prepaid rent, retained
              deposits, tenant-paid expenses, concessions, and uncollected rent
              can be treated differently depending on the facts. Reconcile the
              lease, ledger, bank records, and deposit accounting with the
              current instructions rather than copying scheduled rent.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Lines 5–19: the expense lines that do the work
            </h2>
            <p>
              The current form separates expenses into multiple categories.
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
                manager&apos;s percentage plus leasing and renewal fees.
              </li>
              <li>
                <strong>Line 12 — mortgage interest:</strong> supported interest
                allocable to rental use, subject to the applicable limitations
                and adjustments. Reconcile lender records rather than copying
                the full payment.
              </li>
              <li>
                <strong>Line 14 — repairs:</strong> fixes that keep the property
                in its current condition, subject to the capitalization rules
                and the actual scope of work.
              </li>
              <li>
                <strong>Line 16 — taxes:</strong> property taxes. Note these are
                generally reported as rental expenses when allocable to the
                rental activity. Personal-use allocation and other limitations
                can apply; do not treat the personal-itemized SALT cap as the
                rule that decides Schedule E treatment.
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
                className="text-primary font-semibold hover:underline"
              >
                rental property tax deductions
              </Link>
              .
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Line 18: depreciation, the non-cash line that drives the result
            </h2>
            <p>
              Residential rental buildings are generally recovered under MACRS,
              while land is not depreciable. Supported basis, land allocation,
              capitalized transaction costs, improvements, property class,
              placed-in-service timing, and conventions all affect the schedule;
              see the general closing-cost discussion in{" "}
              <Link
                href="/blog/closing-costs-investment-property"
                className="text-primary font-semibold hover:underline"
              >
                the closing-cost breakdown
              </Link>{" "}
              and have the supported allocation and recovery period reviewed. An
              assessor allocation can be evidence, but it is not a universal tax
              allocation or a safe percentage to copy.
            </p>
            <p>
              For the simplified illustration below, assume a supported $200,000
              building basis and a 27.5-year recovery period. Simple division
              produces <strong>$7,273</strong> ($200,000 ÷ 27.5). That&apos;s
              $606 a month of modeled non-cash deduction before applicable
              conventions, limitations, and adjustments. Depreciation also
              changes adjusted basis and can affect the amount and character of
              gain on a later disposition. A qualifying{" "}
              <Link
                href="/blog/1031-exchange-basics"
                className="text-primary font-semibold hover:underline"
              >
                1031 exchange
              </Link>{" "}
              may postpone recognition in some circumstances, but does not
              guarantee full deferral or eliminate the need to model the exit.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              A complete worked example: the $250K rental
            </h2>
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
              ($1,665) plus principal paydown ($1,905, cash out but not
              deductible) minus depreciation ($7,273, deductible but not cash)
              equals the $3,703 modeled loss. Sanity-check the pre-tax operating
              side in the{" "}
              <Link
                href="/#main"
                className="text-primary font-semibold hover:underline"
              >
                TrueCap analyzer
              </Link>{" "}
              and review the reporting distinctions in the{" "}
              <Link
                href="/blog/rental-property-tax-deductions"
                className="text-primary font-semibold hover:underline"
              >
                rental-property tax-deduction guide
              </Link>
              . Your actual tax effect depends on taxpayer-specific eligibility,
              limitations, and other return items.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Line 22: can you actually use the loss?
            </h2>
            <p>
              A loss on line 21 doesn&apos;t automatically reduce your taxes.
              Rental activities are commonly subject to passive-activity rules,
              and any active-participation allowance depends on the applicable
              tax-year thresholds, ownership, participation, filing status,
              modified income, and other limitations. Material participation,
              basis, at-risk rules, personal use, and grouping can require
              separate analysis.
            </p>
            <p>
              In one taxpayer&apos;s return the hypothetical loss might be
              usable currently; in another it might be limited or carried
              forward. Real-estate-professional status does not by itself make
              every rental loss non-passive: the applicable qualification,
              material-participation, grouping, basis, at-risk, and other tests
              still matter. A later disposition can affect carryforwards, but
              full release is not automatic for every transfer or sale.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Where the number goes from here
            </h2>
            <p>
              The allowed amount flows through the current return under the
              applicable instructions. Services, entity structure, activity
              classification, and other facts can also change employment-tax and
              reporting treatment, so do not assume every rental dollar receives
              the same treatment. Keep the depreciation schedule, carryforward
              records, and support for income and expenses; those records are
              needed to review later-year deductions and disposition treatment.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Four reconciliation risks
            </h2>
            <p>
              <strong>Treating a project label as its tax result.</strong> A
              whole-building-system replacement can differ from a localized
              repair, but the unit of property, scope, elections, and
              surrounding work control. Review the general distinction in the{" "}
              <Link
                href="/blog/capex-maintenance-reserves-rental-property"
                className="text-primary font-semibold hover:underline"
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
              Allowed-or-allowable amounts can affect adjusted basis even when a
              deduction was not claimed. A qualified professional should
              determine the correction procedure and model the disposition; do
              not assume one form or result fits every history.
            </p>
            <p>
              <strong>Losing track of carryforwards.</strong> A qualifying fully
              taxable disposition of an entire interest to an unrelated party
              can have different consequences from a partial, related-party,
              installment, gifted, or deferred transaction. Preserve the records
              and have the specific disposition reviewed before treating a
              carryforward as released.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              FAQ
            </h2>
            {FAQS.map((f) => (
              <div key={f.q}>
                <h3 className="text-xl font-bold text-foreground mt-6 mb-2">
                  {f.q}
                </h3>
                <p>{f.a}</p>
              </div>
            ))}

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Read the form before you buy the property
            </h2>
            <p>
              This is general education, not a filing position or tax advice.
              Professional review is particularly important around the
              repair-vs-improvement boundary, passive losses, and dispositions.
              The structure of Schedule E is exactly why after-tax return and
              cash-on-cash return diverge, and why two investors in different
              tax brackets can correctly disagree about the same deal. The{" "}
              <Link
                href="/"
                className="text-primary font-semibold hover:underline"
              >
                TrueCap analyzer
              </Link>{" "}
              screens pre-tax rental cash flow but does not currently expose a
              tax-specific module. Build the Schedule E and loss-usability
              scenario with a qualified professional. Related reading:{" "}
              <Link
                href="/blog/rental-property-tax-deductions"
                className="text-primary font-semibold hover:underline"
              >
                the 14 rental tax deductions
              </Link>
              ,{" "}
              <Link
                href="/blog/1031-exchange-basics"
                className="text-primary font-semibold hover:underline"
              >
                1031 exchange basics
              </Link>
              , and{" "}
              <Link
                href="/blog/cash-on-cash-vs-irr"
                className="text-primary font-semibold hover:underline"
              >
                cash-on-cash vs IRR
              </Link>
              .
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
