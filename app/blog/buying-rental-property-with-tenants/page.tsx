/**
 * Blog post: buying a rental property with tenants in place.
 *
 * Targets queries: "buying a rental property with tenants", "buying a
 * house with tenants in it", "do I have to honor the lease when I buy
 * a rental", "inherited tenants", "estoppel certificate real estate",
 * "security deposit transfer when property sold", "raising rent after
 * buying a rental property".
 *
 * Angle: verify the actual tenancy and local successor obligations, use
 * supported in-place collections as the base case, and keep hypothetical
 * rent-gap and turnover scenarios separate from legal guidance.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "buying-rental-property-with-tenants";
const TITLE_PLAIN =
  "Buying a rental property with tenants in place: documents, obligations, and below-market rent math";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE_PLAIN.
const SERP_TITLE = "Buying a rental property with tenants";
const DESCRIPTION =
  "A due-diligence framework for a tenant-occupied purchase: verify the lease, payment history, deposits, local successor obligations, and in-place rent math.";
const PUBLISHED_AT = "2026-07-13";
const MODIFIED_AT = "2026-08-29";
const READING_TIME = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "buying a rental property with tenants",
    "buying a house with tenants in it",
    "do I have to honor the lease when I buy a rental",
    "inherited tenants",
    "estoppel certificate",
    "security deposit transfer property sale",
    "raising rent after buying a rental",
    "tenant occupied property",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    title: SERP_TITLE,
    description: DESCRIPTION,
    url: `/blog/${SLUG}`,
    type: "article",
    publishedTime: PUBLISHED_AT,
    modifiedTime: MODIFIED_AT,
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE_PLAIN }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const FAQS = [
  {
    q: "Do I have to honor the existing lease when I buy a rental property?",
    a: "Do not assume a sale cancels or preserves every tenancy term in the same way. The lease, notices, recording, foreclosure status, subsidies, local successor-landlord rules, and other facts can affect the buyer's obligations and available changes. Have local counsel or a qualified property professional review the actual tenancy before contingencies expire, and make any required vacancy a documented closing condition.",
  },
  {
    q: "What is an estoppel certificate and why do I need one?",
    a: "An estoppel or tenant-confirmation form can document the tenant's statement about rent, term, deposits, prepaid amounts, defaults, and side agreements. Its availability, required contents, enforceability, and legal effect vary by lease and jurisdiction. Ask local counsel and the title or closing team which document is appropriate, and reconcile it with the lease and payment ledger.",
  },
  {
    q: "What happens to security deposits when a rental property is sold?",
    a: "Deposit transfer, credits, account handling, interest, notices, records, and successor liability depend on state and local law plus the lease and closing documents. Reconcile every deposit across the lease, ledger, tenant confirmation, bank records, and settlement statement, then have the closing team document who transfers the funds and completes required notices.",
  },
  {
    q: "How soon can I raise the rent after buying a tenant-occupied property?",
    a: "The answer depends on the lease, tenancy type, required notices, renewal rules, rent caps, subsidy program, anti-retaliation and anti-discrimination law, emergency restrictions, and local procedure. Verify the lawful timing and amount before communicating a change. Compare any permitted renewal, turnover, or negotiated-vacancy scenario using current costs rather than treating a generic staged increase or cash-for-keys amount as advice.",
  },
];

export default function BuyingRentalWithTenantsPost() {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/blog/${SLUG}`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: TITLE_PLAIN,
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
      {
        "@type": "ListItem",
        position: 3,
        name: TITLE_PLAIN,
        item: canonicalUrl,
      },
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
              {TITLE_PLAIN}
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
              A tenant-occupied listing reads like a gift: rent from day one, no
              lease-up gap, a tenant already screened by someone else. And
              sometimes it is. But you&apos;re not just buying a building —
              you&apos;re buying into an existing legal and operating
              relationship at an in-place rent. The lease, notices, deposit
              records, payment history, subsidy documents, and local law need to
              be reviewed together. This guide separates a hypothetical rent-gap
              calculation from the transaction-specific legal and closing work.
            </p>
          </header>

          <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Start with the actual tenancy and controlling local rules
            </h2>
            <p>
              Existing tenancy rights do not reduce to one nationwide rule. The
              lease, tenancy type, notices, recording, foreclosure history,
              subsidy or rent restrictions, local successor-landlord law, and
              other facts can affect which terms bind a buyer and what changes
              are permitted. Have qualified local counsel or a property
              professional identify those obligations before contingencies
              expire. If the financing or renovation plan requires lawful
              vacancy, state that requirement and the responsible party clearly
              in the purchase contract and closing documents.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Underwrite the rent you&apos;re buying, not the rent in the ad
            </h2>
            <p>
              A listing may advertise a higher pro-forma rent than the tenant
              currently pays. Start a base case with the executed lease and
              collection history, then keep a supported market-rent scenario
              separate. For illustration, assume a{" "}
              <strong>$250,000 duplex</strong> with 25% down — a $187,500 loan
              at an entered 7% over 30 years, about <strong>$1,247</strong> a
              month in principal and interest. The in-place rents are $1,050 and
              $1,100; the hypothetical market-rent scenario uses $1,300 per side
              after following the verification process in the{" "}
              <Link
                href="/blog/how-to-estimate-rent-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                rent estimation guide
              </Link>
              . That $450 monthly difference—$5,400 per year—is a modeled{" "}
              <strong>loss-to-lease</strong> scenario, not verified upside. At
              in-place rents the property grosses $25,800 a year; assume 40% of
              gross for operating expenses (taxes, insurance, vacancy,
              maintenance, management) and NOI is about <strong>$15,480</strong>{" "}
              — a <strong>6.2% cap rate</strong> on your price. At pro-forma
              market rents, the same math says $18,720 of NOI and a 7.5% cap.
              The second case should not replace the first until lawful,
              achievable rent is supported. Run both through the{" "}
              <Link
                href="/#main"
                className="text-primary font-semibold hover:underline"
              >
                TrueCap analyzer
              </Link>{" "}
              and base the initial screen on in-place, collectible income.
            </p>
            <p>
              Under the same assumptions, debt service runs $14,964 a year, so
              in-place NOI of $15,480 leaves{" "}
              <strong>$516 a year — $43 a month</strong> — of cash flow. The
              market-rent scenario produces $3,756 per year, or about $313 per
              month. The base case uses the in-place lease and collection
              evidence; the other requires lawful notices or renewals, tenant
              decisions, property condition, and achievable rent. A lender may
              use the lease, appraisal rent, collection history, or another
              program-specific method. Obtain the accepted rent and coverage
              worksheet in writing; a lower accepted rent can move the{" "}
              <Link
                href="/#main"
                className="text-primary font-semibold hover:underline"
              >
                DSCR
              </Link>{" "}
              or pricing, but neither outcome is universal.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              A hypothetical turnover sensitivity
            </h2>
            <p>
              Suppose the supported rent scenario is $250 above the in-place
              rent. Compare only lawful options and use verified costs. This
              hypothetical assumes one month vacant at the new rent (
              <strong>$1,300</strong>), make-ready paint, cleaning, and repairs
              (<strong>$2,500</strong> on a dated unit), and a leasing fee of
              half a month (<strong>$650</strong>) — call it{" "}
              <strong>$4,450</strong> all-in. The prize is $250 a month, or
              $3,000 a year, producing an assumed payback near{" "}
              <strong>18 months</strong>. Change the verified downtime,
              make-ready, leasing cost, lawful renewal amount, tenant response,
              or hold period and the result changes. Compare those scenarios
              without assuming turnover or a staged increase is the right
              outcome; the{" "}
              <Link
                href="/blog/vacancy-rate-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                vacancy rate guide
              </Link>{" "}
              shows how turnover timing affects a modeled year.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The records to reconcile before closing
            </h2>
            <p>
              The analysis rests on the tenancy being documented accurately, so
              verify it before the applicable contingency expires. Start with
              <strong> the actual leases</strong>—every page and amendment. Read
              for the rent, the end date, renewal options the tenant controls,
              and anything unusual: a purchase option, a rent-controlled
              addendum, a co-signer.{" "}
              <strong>Second, the rent ledger and bank support</strong> showing
              what was collected and when, not just what was scheduled. The{" "}
              <Link
                href="/blog/how-to-read-a-rent-roll"
                className="text-primary font-semibold hover:underline"
              >
                rent roll guide
              </Link>{" "}
              explains the reconciliation. Also ask local counsel whether a
              tenant estoppel, confirmation, or another form is appropriate and
              enforceable. Reconcile any tenant statement about rent, term,
              deposits, prepaid amounts, defaults, concessions, and side
              agreements with the lease and seller records; do not assume one
              generic form has the same legal effect everywhere.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Closing checklist: deposits, prorations, and notices
            </h2>
            <p>
              Have the closing team document deposit funds, successor
              obligations, required accounts, rent prorations, prepaid rent,
              arrears, concessions, and required notices under the lease and
              local law. Check the lease, tenant confirmation, ledger, bank
              support, and settlement statement against one another. Any change
              in payment instructions, management contact, deposit location, or
              maintenance process should be communicated using the timing and
              form required in the jurisdiction, with fraud-resistant payment
              verification for the tenant.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Compare only lawful post-closing rent scenarios
            </h2>
            <p>
              Renewal, rent adjustment, negotiated vacancy, owner occupancy, and
              termination rules vary. Before communicating any option, have
              local counsel or a qualified manager confirm the lease, required
              notices, rent caps, just-cause, anti-retaliation,
              anti-discrimination, subsidy, relocation-payment, and other
              current requirements. Model permitted options with verified rent,
              timing, vacancy, make-ready, legal, and payment assumptions. If
              the inherited tenant uses a{" "}
              <Link
                href="/blog/section-8-rental-property-investing"
                className="text-primary font-semibold hover:underline"
              >
                Section 8 voucher
              </Link>
              , obtain the administering housing authority&apos;s current
              written approval process, contract rent, tenant share, assistance
              amount, notice rules, and timing. Treat an unapproved increase as
              neither current income nor guaranteed upside.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Five mistakes buyers make with inherited tenants
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Underwriting the pro-forma rent.</strong> The listing
                may show a higher figure than the lease and collection record.
                Use supported in-place income in the base case and keep any
                lawful future-rent scenario separate.
              </li>
              <li>
                <strong>Relying on one tenancy document.</strong> Reconcile the
                lease, amendments, ledger, bank support, deposit records, seller
                representations, and any locally appropriate tenant
                confirmation.
              </li>
              <li>
                <strong>Leaving deposit treatment implicit.</strong> Have the
                closing team document the funds, credits, records, accounts,
                notices, and successor obligations required by local law.
              </li>
              <li>
                <strong>
                  Communicating a rent change before legal review.
                </strong>{" "}
                Confirm what the lease and current local law permit, then
                compare tenant-response, vacancy, turnover, and collection
                scenarios.
              </li>
              <li>
                <strong>
                  Assuming an owner-occupant loan fits an occupied property.
                </strong>{" "}
                Occupancy intent, move-in timing, unit availability, lease
                rights, and program exceptions are loan-specific. Have the
                lender and local counsel reconcile the current written
                requirements before the offer depends on them.
              </li>
            </ul>

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
              Tenants in place are a material term of the deal. Use the lease
              and collection record for the base case, and keep any lawful
              future-rent scenario separate: the hypothetical duplex shows how
              those inputs can produce very different modeled cash flow. Verify
              the tenancy, deposits, notices, and successor obligations with the
              complete records and qualified local review before contingencies
              expire. Run the supported in-place and alternative scenarios
              through the{" "}
              <Link
                href="/"
                className="text-primary font-semibold hover:underline"
              >
                TrueCap analyzer
              </Link>{" "}
              and replace every placeholder with property-specific evidence.
              This is general education, not legal or investment advice; tenancy
              rights, deposit rules, notices, rent restrictions, subsidy rules,
              and closing duties vary by jurisdiction and facts.
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
