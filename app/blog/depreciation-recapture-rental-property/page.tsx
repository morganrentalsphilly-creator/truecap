/**
 * Blog post: Depreciation recapture on rental property.
 *
 * Targets queries: "depreciation recapture rental property", "how is
 * depreciation recaptured when you sell", "unrecaptured section 1250
 * gain", "depreciation recapture tax rate", "rental property
 * depreciation recapture calculation", "avoid depreciation recapture".
 *
 * Companion to schedule-e-rental-property (the hold-side deduction) and
 * 1031-exchange-basics (the deferral vehicle). This post owns the
 * sell-side: what recapture is, how it's computed, and how to soften it.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { RelatedContent } from "@/components/marketing/related-content";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "depreciation-recapture-rental-property";
const TITLE =
  "Depreciation recapture on rental property: what to review before a sale";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Rental-property depreciation recapture";
const DESCRIPTION =
  "A hypothetical rental-sale example: how adjusted basis, gain character, transaction structure, and taxpayer facts can affect depreciation-related tax.";
const PUBLISHED_AT = "2026-06-14";
const MODIFIED_AT = "2026-08-29";
const READING_TIME = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "depreciation recapture rental property",
    "depreciation recapture tax rate",
    "unrecaptured section 1250 gain",
    "how is depreciation recaptured when you sell",
    "rental property depreciation recapture calculation",
    "avoid depreciation recapture",
    "depreciation recapture 25 percent",
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
    q: "What is the depreciation recapture tax rate on rental property?",
    a: "There is no single rate that can be applied safely from a headline. The amount and character of gain can depend on adjusted basis, depreciation method, asset classification, selling costs, other gain and loss, income, and current federal and state law. A building and shorter-life components may receive different treatment. Have the complete depreciation schedule and proposed sale modeled by a qualified tax professional.",
  },
  {
    q: "Do I have to pay depreciation recapture if I never claimed depreciation?",
    a: "Allowed-or-allowable depreciation can affect adjusted basis even when deductions were missed. The correction method and disposition treatment depend on the filing history and facts; do not assume a current-year catch-up or a particular form is available. Have a qualified professional reconstruct the schedule before the sale.",
  },
  {
    q: "Does a 1031 exchange eliminate depreciation recapture?",
    a: "A qualifying like-kind exchange may postpone recognition of some gain, but cash, debt relief, other property, basis, eligibility, related-party rules, deadlines, and the rest of the transaction can create current tax. It does not guarantee full deferral or a permanently tax-free result. Model the exchange and replacement basis with qualified advisers before the transfer.",
  },
  {
    q: "Can the home-sale exclusion shelter recapture if I move into my rental?",
    a: "Converting a rental to a residence does not make every part of a later gain excludable. Depreciation adjustments, periods of nonqualified use, ownership and use tests, filing status, and current law can all matter. Obtain a property- and taxpayer-specific calculation before relying on a home-sale exclusion.",
  },
  {
    q: "Is depreciation recapture taxed as ordinary income or capital gains?",
    a: "Different portions of a sale can have different character. Unrecaptured Section 1250 gain, Section 1245 recapture, other long-term gain, net-investment-income tax, state tax, and offsetting items may each require separate calculations. Do not infer the answer from the building label or marginal bracket alone.",
  },
];

export default function DepreciationRecapturePost() {
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
    author: { "@type": "Person", "@id": `${siteUrl}/about#morgan`, name: "Morgan Page", url: `${siteUrl}/about` },
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
              Depreciation can reduce taxable rental income and adjusted basis.
              A later sale can then produce multiple categories of gain with
              different federal and state treatment. The worked example below is
              arithmetic under stated assumptions—not a tax estimate for a real
              property or taxpayer.
            </p>
          </header>

          <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              What depreciation recapture actually is
            </h2>
            <p>
              Residential rental buildings are generally recovered under the
              applicable depreciation rules, while land is not depreciable.
              Supported basis, classification, placed-in-service timing,
              conventions, personal use, and limitations affect the deduction.
              As a simplified illustration, dividing a supported $200,000
              building basis by an assumed 27.5-year period produces about{" "}
              <strong>$7,273 per full year</strong> before those adjustments.
              That modeled non-cash expense helps explain why cash flow and{" "}
              <Link
                href="/blog/schedule-e-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                Schedule E
              </Link>{" "}
              income can differ.
            </p>
            <p>
              Depreciation generally reduces adjusted basis. That can increase
              the gain measured on a later disposition, but the amount and
              character still depend on the full depreciation schedule,
              improvements, selling costs, asset classes, transaction structure,
              and taxpayer facts. Treat &quot;recapture&quot; as a prompt for a
              complete sale calculation, not a flat surcharge.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Records that drive the calculation
            </h2>
            <p>
              A preliminary calculation starts with several records, but the tax
              result requires more than three figures:
            </p>
            <ul>
              <li>
                <strong>Opening basis records</strong> — purchase documents,
                settlement charges, allocations, and later capitalized work.
                General categories are discussed in the{" "}
                <Link
                  href="/blog/closing-costs-investment-property"
                  className="text-primary font-semibold hover:underline"
                >
                  closing-cost breakdown
                </Link>
                ), but a tax professional should classify the actual lines.
              </li>
              <li>
                <strong>Accumulated depreciation</strong> — the supported
                depreciation history, including allowed-or-allowable
                adjustments. Reconcile the return history, asset ledger, and
                preparer&apos;s depreciation schedule.
              </li>
              <li>
                <strong>Adjusted basis</strong> — a supported basis calculation
                that accounts for depreciation allowed or allowable and other
                applicable adjustments.
              </li>
            </ul>
            <p>
              Amount realized, adjusted basis, liabilities, transaction costs,
              suspended items, and the structure of the disposition all need to
              be reconciled before character and tax are determined.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Why the gain may have more than one character
            </h2>
            <p>
              A sale can include unrecaptured Section 1250 gain, Section 1245
              recapture, other long-term gain, or other character depending on
              the assets and depreciation history. The applicable rates and
              ordering also depend on current law, income, other return items,
              and the transaction. A two-bucket shortcut is useful for a
              hypothetical, but it is not a filing calculation.
            </p>
            <p>
              That is why multiplying a headline gain by one assumed rate can be
              misleading. Reconcile the asset schedule and have each component
              characterized before deciding what a sale would cost after tax.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              A simplified worked example: the $250K rental sold for $360K
            </h2>
            <p>
              Assume, solely for illustration, a <strong>$250,000</strong>
              purchase with a supported $50,000 land allocation and $200,000
              building allocation. The example uses a 27.5-year straight-line
              schedule, producing $200,000 ÷ 27.5 ={" "}
              <strong>$7,273 a year</strong>. The illustration uses ten full
              annual amounts for clean arithmetic and does not attempt a
              placed-in-service or disposition convention, so accumulated
              depreciation is about <strong>$72,727</strong>. Ten years later
              you sell for <strong>$360,000</strong> and pay{" "}
              <strong>$25,000</strong> in agent commission and closing costs.
              The simplified worksheet, before taxpayer-specific adjustments:
            </p>
            <ul>
              <li>
                <strong>Original cost basis:</strong> $250,000
              </li>
              <li>
                <strong>Accumulated depreciation (10 yrs):</strong> −$72,727
              </li>
              <li>
                <strong>Adjusted basis:</strong> $177,273
              </li>
              <li>
                <strong>Sale price:</strong> $360,000
              </li>
              <li>
                <strong>Less selling costs:</strong> −$25,000
              </li>
              <li>
                <strong>Amount realized:</strong> $335,000
              </li>
              <li>
                <strong>Total gain</strong> ($335,000 − $177,273):{" "}
                <strong>$157,727</strong>
              </li>
              <li>
                <strong>
                  Modeled §1250 component (assumed equal to depreciation):
                </strong>{" "}
                $72,727, assigned a 25% rate only for this sensitivity
              </li>
              <li>
                <strong>Remaining modeled gain:</strong> $85,000, assigned a 15%
                rate only for this illustration
              </li>
            </ul>
            <p>
              Notice the appreciation bucket is exactly <strong>$85,000</strong>{" "}
              — your $335,000 net sale price minus your $250,000 original cost.
              For sensitivity only, applying an assumed 25% rate to the $72,727
              component produces <strong>$18,182</strong>, and applying an
              assumed 15% rate to $85,000 produces <strong>$12,750</strong>. The
              $30,932 sum is not a federal tax forecast: actual character,
              rates, losses, deductions, filing status, and other return items
              can change it materially.
            </p>
            <p>
              Additional federal, state, or local taxes may apply depending on
              filing status, income, gain character, deductions, activity,
              exceptions, and current law. Review the holding-period records
              described in the{" "}
              <Link
                href="/blog/rental-property-tax-deductions"
                className="text-primary font-semibold hover:underline"
              >
                rental-property tax guide
              </Link>{" "}
              and have a qualified adviser model the sale before you sign a
              listing agreement, not after.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Do not treat 25% as a universal sale-tax rate
            </h2>
            <p>
              The worked example uses 25% as a sensitivity assumption for one
              modeled component. It is not a rate quote or a substitute for the
              current unrecaptured-Section-1250 worksheet. Taxable income,
              filing status, other gain and loss, asset classification, and
              current law determine the actual result.
            </p>
            <p>
              Likewise, comparing an assumed deduction-year marginal rate with
              an assumed sale-year rate does not establish a permanent
              arbitrage. Deduction usability, timing, recapture character,
              netting, future law, and the time value of money all belong in the
              analysis.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              &quot;Allowed or allowable&quot;: you can&apos;t skip your way out
            </h2>
            <p>
              Allowed-or-allowable depreciation can reduce adjusted basis even
              when the return history is incomplete. If prior-year depreciation
              was missed or misclassified, the proper correction may depend on
              how many years are affected, the accounting method, and other
              facts. Have a qualified professional determine whether an amended
              return, accounting-method procedure, or another treatment applies
              before filing or selling.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Cost segregation raises the stakes — and changes the rate
            </h2>
            <p>
              Cost-segregation and accelerated-depreciation decisions can change
              both timing and the character of a later disposition.{" "}
              <Link
                href="/blog/bonus-depreciation-rental-property-2026"
                className="text-primary font-semibold hover:underline"
              >
                Bonus depreciation and cost segregation
              </Link>{" "}
              may classify supported components separately from the building.
              Some components can receive Section 1245 treatment rather than the
              building&apos;s treatment. Classification, depreciation method,
              gain, income, and current law determine the actual result; do not
              assign an ordinary rate or recapture amount from a generic
              example.
            </p>
            <p>
              That does not make a study good or bad by default. Compare the
              supported current benefit, deduction limitations, study cost,
              holding period, disposition scenarios, and future tax exposure
              with qualified advisers before accelerating deductions.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Five disposition issues to model before choosing a structure
            </h2>
            <p>
              <strong>1. A possible 1031 exchange.</strong> A qualifying
              exchange may postpone recognition of some gain, but property
              eligibility, deadlines, basis, liabilities, cash or other property
              received, related parties, and transaction costs all matter. Put
              the exchange team and written plan in place before the transfer;
              the mechanics and limitations are in{" "}
              <Link
                href="/blog/1031-exchange-basics"
                className="text-primary font-semibold hover:underline"
              >
                1031 exchange basics
              </Link>
              .
            </p>
            <p>
              <strong>2. A possible installment sale.</strong> Payment timing
              may change when some gain is recognized, while recapture,
              interest, security, default, servicing, and state-law issues can
              receive different treatment. Have tax and legal advisers model the
              exact note and asset schedule before offering seller financing.
            </p>
            <p>
              <strong>3. Passive-loss carryforwards.</strong> A qualifying fully
              taxable disposition of an entire interest to an unrelated party
              can affect suspended losses differently from a partial,
              related-party, installment, gifted, or deferred transaction.
              Reconcile the carryforward schedule and proposed structure before
              assuming any amount releases or offsets gain.
            </p>
            <p>
              <strong>4. Tax-year timing.</strong> Income, other gains and
              losses, filing status, net-investment-income-tax exposure,
              estimated-tax obligations, and future law can change the result.
              Compare more than one supported timing scenario rather than
              assuming a low-income year produces a specific rate.
            </p>
            <p>
              <strong>5. Estate and gift planning.</strong> Basis at death or
              after a gift depends on ownership, valuation, prior transfers,
              estate and gift rules, state law, and the law then in effect. Do
              not market holding until death as a guaranteed basis reset,
              recapture erasure, or zero-tax strategy; coordinate the property,
              entity, debt, and estate plan with qualified advisers.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Underwrite the exit, not just the entry
            </h2>
            <p>
              Disposition tax can change an after-tax return. A modeled pre-tax{" "}
              <Link
                href="/analyze"
                className="text-primary font-semibold hover:underline"
              >
                return on investment
              </Link>{" "}
              does not establish what a taxpayer keeps after a sale or exchange.
              Read the holding-period deductions together with supported taxable
              sale, exchange, installment, and downside scenarios. For the
              deduction side, see{" "}
              <Link
                href="/blog/rental-property-tax-deductions"
                className="text-primary font-semibold hover:underline"
              >
                the 14 rental tax deductions
              </Link>
              , and for how it all lands on the return each April,{" "}
              <Link
                href="/blog/schedule-e-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                the Schedule E walkthrough
              </Link>
              .
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
              The bottom line
            </h2>
            <p>
              This is general education, not tax, legal, or estate advice.
              Depreciation can reduce adjusted basis, but a sale requires the
              complete basis, character, limitation, and transaction analysis.
              Build alternative disposition scenarios with qualified advisers
              before listing or transferring the property. The{" "}
              <Link
                href="/"
                className="text-primary font-semibold hover:underline"
              >
                TrueCap analyzer
              </Link>{" "}
              can screen the property&apos;s pre-tax rental cash flow, but it
              does not currently expose a sale-tax or exit module. Build the
              disposition scenario with a qualified tax adviser before listing.
            </p>
          </div>
        </article>
        <RelatedContent kind="blog" slug={SLUG} title={TITLE} className="mt-10" />
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
