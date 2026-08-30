/**
 * Blog post: Closing costs on an investment property — full breakdown.
 *
 * Targets queries: "closing costs investment property", "how much are
 * closing costs on a rental property", "investment property closing
 * costs breakdown", "closing costs vs down payment", "rental property
 * closing costs estimate", "what are closing costs on a rental".
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "closing-costs-investment-property";
const TITLE =
  "Closing costs on an investment property: build the property-specific stack";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Investment-property closing costs";
const DESCRIPTION =
  "Build an investment-property cash-to-close estimate from current lender, title, government, insurer, tax, and contract documents, with a hypothetical $250k example.";
const PUBLISHED_AT = "2026-06-09";
const MODIFIED_AT = "2026-08-29";
const READING_TIME = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "closing costs investment property",
    "how much are closing costs on a rental property",
    "investment property closing costs breakdown",
    "rental property closing costs estimate",
    "closing costs vs down payment",
    "what are closing costs on a rental",
    "buyer closing costs estimate",
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
    q: "How much are closing costs on an investment property?",
    a: "There is no reliable national amount or percentage for a particular closing. Build the estimate from the lender's written disclosures, title or settlement quote, current government charges, insurance quote, property-tax information, and purchase contract. Reconcile the estimate again when final documents arrive.",
  },
  {
    q: "Are closing costs higher on an investment property than a primary residence?",
    a: "They can differ because occupancy, loan program, property type, required reports, pricing, insurance, and escrow terms affect the file. Compare complete written options for the actual borrower and property; do not transfer a primary-residence estimate to an investment purchase.",
  },
  {
    q: "Can you roll closing costs into an investment property loan?",
    a: "Whether any charge can be financed, offset by a lender credit, or covered by a seller concession depends on the loan program, occupancy, loan-to-value, transaction, appraisal, contract, and current lender rules. Ask the lender to show each option's rate, fees, credits, required cash, and concession limit in writing; a credit or concession does not make the cost disappear.",
  },
  {
    q: "Are investment property closing costs tax deductible?",
    a: "Tax classification and timing depend on the actual charge, taxpayer, property use, loan purpose, transaction, accounting method, and current law. Preserve the final settlement statement and invoices, then have a qualified tax professional classify each line instead of applying one treatment to every closing cost.",
  },
  {
    q: "Do you pay closing costs on a cash purchase?",
    a: "A cash purchase removes financing charges but can still involve contract, title, settlement, legal, inspection, insurance, tax, recording, transfer, and other local items. Some diligence choices are optional and others may be required by the contract or jurisdiction. Obtain current local quotes rather than applying a national cash-purchase percentage.",
  },
];

export default function ClosingCostsPost() {
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
              Cash to close depends on a property-specific stack of lender,
              title, government, insurance, tax, contract, and prepaid items.
              This guide shows how to assemble that stack from current written
              documents and uses a hypothetical $250,000 purchase to demonstrate
              the return math. The example is not a quote or national benchmark.
            </p>
          </header>

          <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The short answer
            </h2>
            <p>
              Do not rely on a national percentage to fund a closing. Start with
              the lender&apos;s written disclosures, title or settlement quote,
              current state and local charges, insurance quote, property-tax
              information, and purchase contract. Separate fees from prepaids
              and escrows, then reconcile every line with the final documents.
            </p>
            <p>
              A cash purchase removes financing charges but does not establish a
              fixed closing-cost percentage. Title, settlement, legal,
              diligence, insurance, tax, recording, transfer, and contract items
              depend on the property and jurisdiction. Obtain current local
              quotes for the choices and requirements that apply.
            </p>
            <p>
              For return modeling, include nonrefundable transaction charges in
              cash invested and track prepaids or escrow deposits separately.
              Neither a modeled down payment nor a preliminary estimate is the
              final cash-to-close figure.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              A hypothetical $250k duplex stack
            </h2>
            <p>
              To keep the arithmetic concrete, assume a $250,000 duplex, a 25%
              down payment, a $187,500 loan, and a 30-year term at an assumed 7%
              rate. These inputs are illustrative only; minimum down payment,
              rate, eligibility, and terms vary by borrower, property, program,
              and lender.
            </p>
            <p>
              The following invented line items total $12,600. They demonstrate
              how a stack works; they are not current, typical, or
              location-based prices:
            </p>
            <ul>
              <li>
                <strong>Loan origination fee (1%):</strong> $1,875
              </li>
              <li>
                <strong>Discount points (1 point to buy down the rate):</strong>{" "}
                $1,875
              </li>
              <li>
                <strong>Appraisal + rent schedule (Form 1007):</strong> $650
              </li>
              <li>
                <strong>Credit report, flood cert, tax service:</strong> $150
              </li>
              <li>
                <strong>Lender&apos;s title insurance policy:</strong> $700
              </li>
              <li>
                <strong>Owner&apos;s title insurance policy:</strong> $1,100
              </li>
              <li>
                <strong>Title search + settlement/escrow fee:</strong> $900
              </li>
              <li>
                <strong>Recording fees:</strong> $150
              </li>
              <li>
                <strong>State/county transfer tax (~1%):</strong> $2,500
              </li>
              <li>
                <strong>Prepaid homeowners insurance (1 yr):</strong> $1,400
              </li>
              <li>
                <strong>Prepaid property tax escrow (~3 months):</strong> $900
              </li>
              <li>
                <strong>Prepaid/prorated mortgage interest:</strong> $400
              </li>
            </ul>
            <p>
              In this hypothetical, $12,600 equals about 5% of the purchase
              price. That percentage describes only the invented stack. Replace
              every line with the actual written estimate, identify whether it
              is a fee, credit, prepaid, escrow deposit, or adjustment, and keep
              a reserve for documented changes allowed before closing.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Group 1: lender charges and third-party services
            </h2>
            <p>
              <strong>Origination and lender charges.</strong> Use the amount
              and labels on the written disclosure. Compare complete same-day
              loan options, because a lower fee may be paired with a different
              rate, credit, lock, prepayment term, or eligibility rule. Ask the
              lender to explain each charge and whether it can change.
            </p>
            <p>
              <strong>Discount points and credits.</strong> Confirm whether a
              quoted point means 1% of the loan amount and whether it is a
              discount point, origination charge, or another fee. The rate
              change per point is not fixed. Compare the lender&apos;s written
              rate, APR, payment, fees, credits, lock terms, and cash to close
              at each option. A simple screen is point cost divided by monthly
              payment savings, but also model the expected loan duration and
              exit. Run the quoted scenarios through the{" "}
              <Link
                href="/tools/mortgage-payment-calculator"
                className="text-primary font-semibold hover:underline"
              >
                mortgage payment calculator
              </Link>{" "}
              and reconcile its result with the lender&apos;s payment schedule.
            </p>
            <p>
              <strong>Appraisal and reports.</strong> Ask which appraisal, rent,
              flood, tax, credit, inspection, or other reports the program
              requires, who selects the provider, and what each item costs. Do
              not assume a Form 1007 or any quoted amount applies to every loan
              or property type.
            </p>
            <p>
              <strong>Processing and other charges.</strong> Review application,
              underwriting, processing, document, and third-party charges line
              by line. Rather than labeling a charge legitimate or unnecessary
              from its name alone, ask what service it covers, whether it is
              optional or shoppable, and whether it can change or be waived.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Group 2: title, settlement, and legal items
            </h2>
            <p>
              <strong>Lender&apos;s title policy.</strong> If the lender or
              program requires one, use the written premium and coverage
              information for the actual transaction. Requirements and pricing
              depend on the lender, jurisdiction, policy, loan amount, and
              available discounts.
            </p>
            <p>
              <strong>Owner&apos;s title policy.</strong> Coverage, exclusions,
              premium, availability, and whether the item is optional vary. Ask
              a title professional or local counsel to explain the title search,
              exceptions, endorsements, and risks so you can evaluate the quote
              for this property.
            </p>
            <p>
              <strong>Search, settlement, escrow, and legal services.</strong>
              Obtain an itemized quote from the permitted or selected provider.
              The required parties, scope, ability to shop, and fee structure
              are jurisdiction- and transaction-specific.
            </p>
            <p>
              <strong>Recording charges.</strong> Verify the instruments to be
              recorded and the current charges with the settlement provider and
              appropriate local office. Do not carry an amount from another
              county or transaction into the estimate.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Group 3: government taxes, charges, and adjustments
            </h2>
            <p>
              Transfer, deed, documentary, conveyance, mortgage, recording, and
              other government charges vary by jurisdiction, instrument, price,
              financing, exemptions, and effective date. Verify the current
              calculation with the appropriate government source and settlement
              professional. The purchase contract and applicable law determine
              allocation; local custom alone is not a substitute for the signed
              terms or legal guidance.
            </p>
            <p>
              Also reconcile property-tax prorations, assessments, utilities,
              association balances, and other adjustments shown on the
              settlement statement. Ask local counsel or the closing
              professional to explain any legal obligation or allocation you do
              not understand.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Group 4: prepaids and initial escrows
            </h2>
            <p>
              Prepaids and initial escrow deposits affect cash to close but are
              different from transaction fees. Label them separately so a model
              does not count the same recurring expense twice.
            </p>
            <p>
              <strong>Insurance.</strong> Obtain the property-specific policy
              quote and the lender&apos;s evidence-of-insurance and payment
              requirements. Coverage, premium, payment schedule, deductibles,
              exclusions, and lender rules vary materially.
            </p>
            <p>
              <strong>Property-tax escrow.</strong> Use the lender&apos;s
              written initial-escrow calculation and current tax information.
              The amount depends on due dates, closing date, jurisdiction,
              exemptions, assessments, and loan terms; it is not a fixed number
              of months.
            </p>
            <p>
              <strong>Prepaid or prorated interest.</strong> Verify the dates,
              daily amount, calculation convention, and first-payment schedule
              on the lender&apos;s documents. Changing the closing date can
              affect this line and other prorations, so compare the full
              settlement statement rather than optimizing one item in isolation.
            </p>
            <p>
              Track these amounts in <em>cash to close</em>, then avoid counting
              the same insurance or tax period twice in your{" "}
              <Link
                href="/blog/rental-property-pro-forma-explained"
                className="text-primary font-semibold hover:underline"
              >
                pro forma operating expenses
              </Link>
              .
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              How the hypothetical stack changes modeled returns
            </h2>
            <p>
              A cash-on-cash calculation divides modeled annual pre-tax cash
              flow by the cash invested under the model&apos;s definition.
              Include relevant acquisition charges in that denominator and state
              clearly how refundable deposits, reserves, credits, and prepaids
              are treated.
            </p>
            <p>
              Under the invented duplex inputs, $62,500 down plus a $12,600
              closing stack equals <strong>$75,100 of modeled cash in</strong>.
              If annual pre-tax cash flow were $6,000, the modeled{" "}
              <Link
                href="/#main"
                className="text-primary font-semibold hover:underline"
              >
                cash-on-cash return
              </Link>{" "}
              would be about 8.0% using $75,100, versus about 9.6% using only
              the down payment. This comparison illustrates denominator choice;
              it is not a projected return. Read{" "}
              <Link
                href="/blog/how-to-calculate-cash-on-cash-return"
                className="text-primary font-semibold hover:underline"
              >
                how to calculate cash-on-cash return
              </Link>{" "}
              for the full formula and input checklist.
            </p>
            <p>
              Acquisition charges generally do not enter a modeled{" "}
              <Link
                href="/#main"
                className="text-primary font-semibold hover:underline"
              >
                DSCR
              </Link>{" "}
              whose stated formula compares net operating income with debt
              service, but financing choices associated with the closing can
              change debt service. Confirm the lender&apos;s own DSCR definition
              and include all relevant cash uses in the return analysis.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              How to compare the available options
            </h2>
            <p>
              <strong>Compare complete lender options.</strong> Review written
              disclosures line by line, but also compare rate, APR, payment,
              credits, lock, cash to close, reserves, prepayment terms, and
              eligibility. A fee difference alone does not identify the less
              expensive loan over the expected duration.
            </p>
            <p>
              <strong>Verify concessions.</strong> If the contract contemplates
              seller-paid costs, ask the lender and closing professional to
              confirm the allowed amount, eligible charges, appraisal effects,
              and treatment of unused credit for the actual program and file.
              Limits are not universal.
            </p>
            <p>
              <strong>Model lender credits and points.</strong> A credit may be
              paired with a different rate or other terms, while points require
              more cash at closing. Compare cumulative cost under several loan-
              duration scenarios, including a possible sale or{" "}
              <Link
                href="/blog/how-to-refinance-a-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                refinance the property
              </Link>
              . Do not assume a future refinance will be available or
              economical.
            </p>
            <p>
              <strong>Check which services are shoppable.</strong> The written
              disclosures and local rules identify which providers the buyer may
              select. Obtain comparable scopes and written quotes. If
              considering a different closing date, ask for the full revised
              cash-to-close calculation rather than assuming one line is the
              only change.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Build it into the deal, not after it
            </h2>
            <p>
              Build an estimate before committing funds, update it when lender,
              title, insurance, tax, inspection, and contract information
              arrives, and reconcile the final disclosure before signing. Keep
              the down-payment and $75,100 figures above labeled as
              hypothetical; the actual transaction documents control.
            </p>
            <p>
              Estimate your stack with the{" "}
              <Link
                href="/tools/closing-cost-calculator"
                className="text-primary font-semibold hover:underline"
              >
                closing cost calculator
              </Link>
              , then enter the property, financing, rent, expenses, and verified
              closing-cost inputs into{" "}
              <Link
                href="/"
                className="text-primary font-semibold hover:underline"
              >
                TrueCap
              </Link>{" "}
              to model cash flow, cap rate, cash-on-cash, and DSCR. TrueCap uses
              the inputs you provide; it does not retrieve or verify a lender,
              title, government, insurer, tax, or closing quote. For the rest of
              the underwriting checklist, see{" "}
              <Link
                href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
                className="text-primary font-semibold hover:underline"
              >
                how to underwrite a rental in 60 seconds
              </Link>{" "}
              and the{" "}
              <Link
                href="/blog/rental-property-pro-forma-explained"
                className="text-primary font-semibold hover:underline"
              >
                pro forma guide
              </Link>
              .
            </p>
            <p>
              This article provides general educational examples, not lending,
              legal, tax, title, insurance, or investment advice. Verify current
              requirements and amounts with the relevant lender, government
              office, licensed local professionals, and final transaction
              documents.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              FAQs
            </h2>
            {FAQS.map((f) => (
              <div key={f.q}>
                <h3 className="text-xl font-bold text-foreground mt-6 mb-2">
                  {f.q}
                </h3>
                <p>{f.a}</p>
              </div>
            ))}
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
