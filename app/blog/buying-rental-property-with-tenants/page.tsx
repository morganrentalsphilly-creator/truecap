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
import { FaqSection } from "@/components/marketing/faq-section";
import { BlogByline } from "@/components/marketing/blog-byline";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { RelatedContent } from "@/components/marketing/related-content";
import { getSiteUrl } from "@/lib/site-url";
import { Header } from "@/components/investcalc/header";
import { lastmodFor } from "@/lib/seo/lastmod";
import { JsonLd } from "@/components/seo/json-ld";
import { PostSources } from "@/components/blog/post-sources";

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
const MODIFIED_AT = lastmodFor("/blog/buying-rental-property-with-tenants") ?? PUBLISHED_AT;
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
  },
  twitter: { card: "summary_large_image" },
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
    <ArticlePage>
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={faqLd} />

      <ArticleMain>
        <article>
          <header className={ARTICLE_HEADER}>
            <h1 className={ARTICLE_TITLE}>
              {TITLE_PLAIN}
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
                month: "short",
                day: "numeric",
              })}{" "}
              · {READING_TIME} min read
            </p>
            <BlogByline />
            <UnderTitleAnalyzeLink />
            <p className={ARTICLE_LEDE}>
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

          <ArticleBody>
            <h2>
              Start with the actual tenancy and controlling local rules
            </h2>
            <p>
              Existing tenancy rights do not reduce to one nationwide rule. The
              lease, tenancy type, notices, recording, foreclosure history,
              subsidy or rent restrictions, local successor-landlord law, and
              other facts can affect which terms bind a buyer and what changes
              are permitted. Foreclosure shows how much one fact can change.
              After a foreclosure, the federal{" "}
              <a
                href="https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title12-section5220&num=0&edition=prelim"
                className="tc-link"
              >
                Protecting Tenants at Foreclosure Act
              </a>{" "}
              requires the new owner to give bona fide tenants 90 days&apos;
              notice to vacate. A tenancy counts as bona fide when the tenant
              isn&apos;t the former owner or the owner&apos;s child, spouse or
              parent, the lease was made at arm&apos;s length, and the rent
              isn&apos;t far below market (subsidized rent aside). A tenant
              whose lease was signed before the foreclosure notice can stay
              until the lease ends. The exception is a sale to a buyer who will
              live in the unit as a primary residence, and even then the tenant
              still gets the 90 days&apos; notice. Have
              qualified local counsel or a property
              professional identify those obligations before contingencies
              expire. If the financing or renovation plan requires lawful
              vacancy, state that requirement and the responsible party clearly
              in the purchase contract and closing documents.
            </p>

            <h2>
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
                className="tc-link"
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
                href="/analyze" prefetch={false}
                className="tc-link"
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
              program-specific method: Fannie Mae&apos;s{" "}
              <a
                href="https://selling-guide.fanniemae.com/sel/b3-3.1-08/rental-income"
                className="tc-link"
              >
                rental-income rules
              </a>
              , for example, let the lender use an existing lease that will
              transfer with a purchase, or the appraiser&apos;s comparable rent
              schedule (Form 1007). Obtain the accepted rent and coverage
              worksheet in writing; a lower accepted rent can move the{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                DSCR
              </Link>{" "}
              or pricing, but neither outcome is universal.
            </p>

            <h2>
              A hypothetical turnover sensitivity
            </h2>
            <p>
              Suppose the supported rent scenario is $250 above the in-place
              rent. Compare only lawful options and use verified costs. This
              hypothetical assumes one month vacant, which gives up the in-place
              rent (<strong>$1,050</strong>), make-ready paint, cleaning, and
              repairs (<strong>$2,500</strong> on a dated unit), and a leasing
              fee of half a month at the new rent (<strong>$650</strong>) — call
              it <strong>$4,200</strong> all-in. The prize is $250 a month, or
              $3,000 a year, producing an assumed payback near{" "}
              <strong>17 months</strong>. Change the verified downtime,
              make-ready, leasing cost, lawful renewal amount, tenant response,
              or hold period and the result changes. Compare those scenarios
              without assuming turnover or a staged increase is the right
              outcome; the{" "}
              <Link
                href="/blog/vacancy-rate-rental-property"
                className="tc-link"
              >
                vacancy rate guide
              </Link>{" "}
              shows how turnover timing affects a modeled year.
            </p>

            <h2>
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
                className="tc-link"
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

            <h2>
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

            <h2>
              Compare only lawful post-closing rent scenarios
            </h2>
            <p>
              Renewal, rent adjustment, negotiated vacancy, owner occupancy, and
              termination rules vary. Before communicating any option, have
              local counsel or a qualified manager confirm the lease, required
              notices, rent caps, just-cause, anti-retaliation,
              anti-discrimination (including the federal{" "}
              <a
                href="https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title42-section3604&num=0&edition=prelim"
                className="tc-link"
              >
                Fair Housing Act
              </a>
              ), subsidy, relocation-payment, and other current requirements.
              Model permitted options with verified rent,
              timing, vacancy, make-ready, legal, and payment assumptions. If
              the inherited tenant uses a{" "}
              <Link
                href="/blog/section-8-rental-property-investing"
                className="tc-link"
              >
                Section 8 voucher
              </Link>
              , obtain the administering housing authority&apos;s current
              written approval process, contract rent, tenant share, assistance
              amount, notice rules, and timing. Under HUD&apos;s{" "}
              <a
                href="https://www.hud.gov/sites/dfiles/OCHCO/documents/52641A.pdf"
                className="tc-link"
              >
                voucher tenancy addendum
              </a>
              , the owner may not raise the rent during the initial term of the
              lease; any change in the rent to owner must be reported to the
              housing authority{" "}
              <a
                href="https://www.ecfr.gov/current/title-24/subtitle-B/chapter-IX/part-982/subpart-G/section-982.308"
                className="tc-link"
              >
                at least 60 days before it takes effect
              </a>
              , and the new rent must still pass its{" "}
              <a
                href="https://www.ecfr.gov/current/title-24/subtitle-B/chapter-IX/part-982/subpart-K/section-982.507"
                className="tc-link"
              >
                rent-reasonableness test
              </a>
              . Treat an unapproved increase as neither current income nor
              certain upside.
            </p>

            <h2>
              Five mistakes buyers make with inherited tenants
            </h2>
            <ul>
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
                rights, and program exceptions are loan-specific. A VA loan, for
                example, requires the veteran to certify an intent to{" "}
                <a
                  href="https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title38-section3704&num=0&edition=prelim"
                  className="tc-link"
                >
                  move into the property personally within a reasonable time
                </a>
                . Have the
                lender and local counsel reconcile the current written
                requirements before the offer depends on them.
              </li>
            </ul>

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
            <h2>
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
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              and replace every placeholder with property-specific evidence.
              Tenancy rights, deposit rules, notices, rent restrictions, subsidy
              rules, and closing duties vary by jurisdiction and facts.
            </p>
          </ArticleBody>
        </article>
        <PostSources
          sources={[
            {
              title:
                "Protecting Tenants at Foreclosure Act, Pub. L. 111-22, sec. 702 (12 U.S.C. 5220 note)",
              url: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title12-section5220&num=0&edition=prelim",
            },
            {
              title: "Fannie Mae Selling Guide B3-3.1-08, Rental Income",
              url: "https://selling-guide.fanniemae.com/sel/b3-3.1-08/rental-income",
            },
            {
              title: "42 U.S.C. 3604, Fair Housing Act: discrimination in the sale or rental of housing",
              url: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title42-section3604&num=0&edition=prelim",
            },
            {
              title:
                "HUD Form HUD-52641-A (04/2023), Tenancy Addendum, Section 8 Tenant-Based Assistance, Housing Choice Voucher Program",
              url: "https://www.hud.gov/sites/dfiles/OCHCO/documents/52641A.pdf",
            },
            {
              title: "24 CFR 982.308, Lease and tenancy (eCFR)",
              url: "https://www.ecfr.gov/current/title-24/subtitle-B/chapter-IX/part-982/subpart-G/section-982.308",
            },
            {
              title: "24 CFR 982.507, Rent to owner: Reasonable rent (eCFR)",
              url: "https://www.ecfr.gov/current/title-24/subtitle-B/chapter-IX/part-982/subpart-K/section-982.507",
            },
            {
              title: "38 U.S.C. 3704, VA home loans: restrictions on loans (occupancy certification)",
              url: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title38-section3704&num=0&edition=prelim",
            },
          ]}
        />
        <RelatedContent kind="blog" slug={SLUG} title={TITLE_PLAIN} className="mt-10" />
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
