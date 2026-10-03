/**
 * Strategy blog post — Hard money vs DSCR loan comparison.
 *
 * Targets high-intent queries:
 *   - "hard money vs dscr"
 *   - "dscr vs hard money"
 *   - "hard money loan vs dscr loan"
 *   - "which loan for brrrr"
 *   - "fix and flip loan"
 *   - "rental property loan options"
 *   - "non-qm investor loans"
 *   - "bridge loan vs dscr"
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
  UnderTitleAnalyzeLink,
} from "@/components/marketing/article";
import { BlogByline } from "@/components/marketing/blog-byline";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { FaqSection } from "@/components/marketing/faq-section";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { RelatedContent } from "@/components/marketing/related-content";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";
import { Header } from "@/components/investcalc/header";
import { lastmodFor } from "@/lib/seo/lastmod";
import { JsonLd } from "@/components/seo/json-ld";
import { PostSources } from "@/components/blog/post-sources";

const SLUG = "hard-money-vs-dscr-loan";
const TITLE =
  "Hard money vs DSCR: which loan product is right for your next deal in 2026";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Hard money vs DSCR loan: which to use in 2026";
const DESCRIPTION =
  "Hard money and DSCR loans solve different investor-financing problems. Compare how each is structured through an illustrative BRRRR sequence.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = lastmodFor("/blog/hard-money-vs-dscr-loan") ?? PUBLISHED_AT;
const READING_TIME_MIN = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "hard money vs dscr",
    "dscr vs hard money",
    "hard money loan vs dscr loan",
    "which loan for brrrr",
    "fix and flip loan",
    "rental property loan options",
    "non-qm investor loans",
    "bridge loan vs dscr",
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
    q: "What's the core difference between hard money and DSCR?",
    a: "Time horizon and underwriting emphasis. Hard-money programs often use shorter bridge terms and emphasize collateral, rehab scope, experience, and exit risk. Many DSCR programs are designed for stabilized rentals and emphasize property coverage alongside borrower, credit, reserve, appraisal, insurance, and entity requirements. Neither label determines approval or terms; compare the current written program guides for your file.",
  },
  {
    q: "Which loan should I use for a BRRRR deal?",
    a: "A bridge-to-rental sequence is one possible BRRRR structure, not a guaranteed exit. Ask prospective acquisition and refinance lenders for current written terms covering property condition, rent evidence, appraisal, seasoning, reserves, borrower and entity requirements, fees, and maturity. Model a delayed or unavailable refinance before closing.",
  },
  {
    q: "Which is more expensive?",
    a: "Neither product has one universal price. A bridge quote may carry a higher short-term rate, points, draw fees, minimum-interest provisions, and extension fees; a DSCR quote may carry long-term interest, points, and a prepayment charge. Compare lender worksheets over the period you expect to hold each loan. The dollar examples below are illustrations, not current market quotes.",
  },
  {
    q: "Can I use a DSCR loan as my exit on a fix-and-flip?",
    a: "Potentially, if the property will be held as a qualifying rental and the file satisfies a specific DSCR program. A planned sale may conflict with program purpose or make points and any prepayment charge uneconomic. Ask the lender to confirm occupancy, property-condition, prepayment, and exit-plan rules in writing before treating a DSCR refinance as an exit.",
  },
  {
    q: "How fast can each one close?",
    a: "There is no universal closing timeline. Some bridge lenders are built for faster execution, while a DSCR file may require appraisal, title, insurance, lease or rent evidence, and additional underwriting. Ask each lender for a file-specific estimate, required-document list, appraisal timing, and conditions that could delay closing; do not make the contract deadline depend on an advertised turnaround.",
  },
  {
    q: "What credit score do I need for each?",
    a: "There is no single minimum for either category. Credit floors and pricing tiers vary by lender, leverage, property, experience, reserves, recourse, and other borrower factors; even collateral-focused bridge programs may review credit and guarantors. Have lenders run your actual profile and return written terms rather than relying on a generic score threshold.",
  },
  {
    q: "Should I ever use hard money for a long-term hold?",
    a: "Short-term bridge debt can be a poor long-term hold structure because carrying, maturity, and extension risk can compound. If you plan to refinance after rehab, obtain current written exit assumptions from prospective lenders and stress-test a delayed, smaller, or unavailable refinance. A preliminary quote or modeled DSCR does not guarantee the later appraisal, rent treatment, loan amount, or approval.",
  },
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
              Hard money and DSCR loans solve different problems. Hard money is
              short-term capital for a deal you&apos;ll rehab and exit; DSCR is
              long-term capital for a rental you&apos;ll hold. A mismatched
              structure can add material carrying cost, fees, and delay.
              Here&apos;s how to compare current written options.
            </p>
          </header>

          <ArticleBody>
            <p>
              Conventional financing may not fit a particular investor deal
              because of property condition, borrower documentation, entity,
              timing, or program limits. Bridge and DSCR products address
              different constraints, and a mismatched structure can add material
              interest, fees, maturity risk, or prepayment cost.
            </p>
            <p>
              Hard money and DSCR aren&apos;t interchangeable alternatives. Some
              investors use a bridge loan to
              acquire and rehab, then pursue DSCR or another long-term refinance
              after stabilization; that exit remains conditional. This post walks
              through how each works, when each makes sense, and the
              BRRRR-specific sequencing that ties them together.
            </p>

            <h2>What hard money actually is</h2>
            <p>
              Hard money is short-term, asset-collateralized capital. The lender
              may be a private fund or individual placing substantial weight on
              the <em>deal</em>, while still reviewing borrower, guarantor,
              experience, liquidity, and compliance factors. A file may include:
            </p>
            <ul>
              <li>
                <strong>Purchase price</strong> and <strong>ARV</strong>
                (after-repair value, the value of the property post-rehab).
              </li>
              <li>
                <strong>Rehab budget</strong> and your contractor&apos;s scope.
              </li>
              <li>
                <strong>Exit plan</strong> — flip-and-sell or refi-and-hold — with
                a credible timeline.
              </li>
              <li>
                <strong>Your experience</strong> — how many similar deals
                you&apos;ve completed.
              </li>
            </ul>
            <p>
              Illustrative bridge assumptions used in the worked example below —
              not current market terms or an approval promise:
            </p>
            <ul>
              <li>
                <strong>Modeled rate:</strong> 11% interest-only.
              </li>
              <li>
                <strong>Modeled origination:</strong> 2 points.
              </li>
              <li>
                <strong>Modeled term:</strong> 12 months.
              </li>
              <li>
                <strong>Modeled advance:</strong> 75% of purchase price.
              </li>
              <li>
                <strong>Rehab funding:</strong> assumed borrower-funded here;
                actual draw, inspection, reimbursement, and holdback rules vary.
              </li>
            </ul>
            <p>
              Verify rate, points, leverage definitions, required cash, draw
              mechanics, fees, extension rights, recourse, and maturity in a
              current written lender quote.
            </p>

            <h2>What DSCR actually is</h2>
            <p>
              <Link
                href="/blog/how-to-calculate-dscr"
                className="tc-link"
              >
                DSCR
              </Link>{" "}
              (Debt Service Coverage Ratio) loans are long-term,
              cash-flow-underwritten investment property mortgages. The
              property&apos;s rental coverage is the primary ratio under many
              programs, rather than{" "}
              <Link
                href="/glossary/debt-to-income"
                className="tc-link"
              >
                personal DTI
              </Link>
              . The lender still reviews credit,
              reserves, borrower or guarantor documents, appraisal, insurance, and
              program eligibility; requirements vary.
            </p>
            <p>Common structures to verify in a current written quote:</p>
            <ul>
              <li>
                <strong>Rate and points:</strong> quote-specific; compare them
                against a conventional quote for the same property.
              </li>
              <li>
                <strong>Term:</strong> long-term amortization is common, but fixed
                and adjustable structures vary.
              </li>
              <li>
                <strong>LTV and equity:</strong> matrix-specific; compare the
                lender&apos;s purchase and cash-out limits (for conventional
                investor loans, for example,{" "}
                <a href="https://sf.freddiemac.com/general/maximum-ltv-tltv-htltv-ratio-requirements-for-conforming-and-super-conforming-mortgages" className="tc-link">
                  Freddie Mac caps a one-unit investment purchase at 85% LTV and a
                  cash-out refinance at 75%
                </a>
                ).
              </li>
              <li>
                <strong>DSCR minimum:</strong> defined by the program&apos;s rent
                and payment methodology.
              </li>
              <li>
                <strong>Prepayment penalty:</strong> may apply and must be
                reviewed for amount, duration, exceptions, and state eligibility.
              </li>
            </ul>

            <h2>Side-by-side comparison</h2>
            <ArticleTable label="Data table">
              <table>
                <thead>
                  <tr>
                    <th>
                      Dimension
                    </th>
                    <th>
                      Hard money
                    </th>
                    <th>
                      DSCR loan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-muted-foreground">Purpose</td>
                    <td>Short-term capital for acquire + rehab</td>
                    <td>Long-term capital for stabilized rental</td>
                  </tr>
                  <tr>
                    <td className="text-muted-foreground">Term</td>
                    <td>Often shorter bridge maturity; quote-specific</td>
                    <td>
                      Longer amortizing structures may be available;
                      program-specific
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted-foreground">Rate</td>
                    <td>Quote-specific; generally priced for short-term risk</td>
                    <td>Quote-specific; compare with a conventional quote</td>
                  </tr>
                  <tr>
                    <td className="text-muted-foreground">Points / fees</td>
                    <td>Quote-specific; compare all lender and draw fees</td>
                    <td>Quote-specific; compare points and prepayment terms</td>
                  </tr>
                  <tr>
                    <td className="text-muted-foreground">Speed to close</td>
                    <td>File, appraisal/title, and lender-specific</td>
                    <td>File, appraisal/title, and lender-specific</td>
                  </tr>
                  <tr>
                    <td className="text-muted-foreground">
                      What&apos;s underwritten
                    </td>
                    <td>Deal + rehab + exit + your experience</td>
                    <td>Property DSCR + your credit + reserves</td>
                  </tr>
                  <tr>
                    <td className="text-muted-foreground">Leverage</td>
                    <td>Purchase-price, cost, and ARV definitions vary</td>
                    <td>Purchase/cash-out matrices and DSCR sizing vary</td>
                  </tr>
                  <tr>
                    <td className="text-muted-foreground">
                      Prepay / minimum interest
                    </td>
                    <td>Review minimum-interest and extension provisions</td>
                    <td>
                      Review charge, duration, exceptions, and state eligibility
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted-foreground">Credit</td>
                    <td>Program and pricing tier-specific</td>
                    <td>Program and pricing tier-specific</td>
                  </tr>
                  <tr>
                    <td className="text-muted-foreground">Income docs</td>
                    <td>
                      Program-specific; borrower and business documents may apply
                    </td>
                    <td>Personal DTI often not primary; requirements vary</td>
                  </tr>
                  <tr>
                    <td className="text-muted-foreground">Entity title</td>
                    <td>Often permitted with program conditions</td>
                    <td>
                      Often permitted with program conditions and guaranties
                    </td>
                  </tr>
                </tbody>
              </table>
            </ArticleTable>

            <h2>
              The BRRRR sequencing playbook
            </h2>
            <p>
              BRRRR (Buy, Rehab, Rent, Refinance, Repeat) is the use case where
              these two products work together. A common sequence:
            </p>
            <ol>
              <li>
                <strong>Acquire</strong> with hard money. The property is
                distressed and may not satisfy a particular conventional or DSCR
                program&apos;s current property-condition or rent-readiness rules.
              </li>
              <li>
                <strong>Rehab</strong> on the modeled timeline. If the bridge
                includes rehab funds, follow its written draw and inspection
                process.
              </li>
              <li>
                <strong>Rent</strong> the property at market rate. Document the
                lease and rent evidence a prospective refinance program requires.
              </li>
              <li>
                <strong>Pursue a refinance</strong> after stabilization. A new
                appraisal, eligible rent, DSCR, borrower review, seasoning, and
                program matrix determine whether a DSCR or other long-term loan
                closes and how much cash, if any, comes back.
              </li>
              <li>
                <strong>Repeat</strong> with the recycled capital.
              </li>
            </ol>

            <p>
              Illustrative worked example, not a quote, appraisal, or approval:
              $150K purchase, $50K rehab, $250K assumed ARV.
            </p>
            <ul>
              <li>
                <strong>Hard money acquisition:</strong> 75% of $150K = $112.5K
                loan. You bring $37.5K + closing + rehab $50K = ~$92K cash in.
              </li>
              <li>
                <strong>Rehab 4 months:</strong> ~$4.1K interest ($112.5K × 11% ×
                4/12) + 2 points origination ($2.25K) = ~$6.4K total cost.
              </li>
              <li>
                <strong>Refi to DSCR:</strong> 75% of $250K ARV = $187.5K new
                loan. Pays off $112.5K hard money + closing costs ~$5K = $70K
                modeled cash back, if that appraisal, leverage, and approval are
                actually available.
              </li>
              <li>
                <strong>Net cash trapped after refi:</strong> $92K in − $70K out =
                $22K trapped, or about $26K if you also pay the ~$4.1K of bridge
                interest out of pocket. The scenario then models the property on a long-term
                DSCR loan.
              </li>
            </ul>
            <p>
              A DSCR acquisition may not fit when the property is not rent-ready
              or lacks acceptable rent evidence; program rules vary. Keeping
              short-maturity bridge debt for a long hold can also create serious
              carrying and extension risk. Verify both the acquisition and exit
              with lenders before closing.
            </p>

            <h2>
              The fix-and-flip case (compare bridge options)
            </h2>
            <p>
              If you&apos;re rehabbing to sell, a bridge loan is one possible
              acquisition structure and the planned sale proceeds would repay it.
              The actual financing stack, maturity, extension rights, and payoff
              conditions remain lender- and deal-specific.
            </p>
            <p>
              A DSCR refinance may be a poor match for a near-term sale. Program
              purpose, property condition, points, and any prepayment charge can
              overwhelm modeled savings; have the lender confirm those terms and
              the intended exit in writing.
            </p>

            <h2>
              The hold case (compare long-term options)
            </h2>
            <p>
              If you&apos;re buying a rent-ready property for a long-term hold,
              compare bridge debt with longer-term options before paying for a
              short-term structure. Possibilities include:
            </p>
            <ul>
              <li>
                <strong>Conventional</strong> if the current program&apos;s
                borrower, financed-property, DTI, documentation, property, and
                occupancy rules fit the file.
              </li>
              <li>
                <strong>DSCR</strong> as another program-specific option when
                property coverage is the primary ratio; borrower, credit, reserve,
                appraisal, entity, and other rules still apply.
              </li>
            </ul>

            <h2>The dangerous middle case</h2>
            <p>
              The case to watch for: buying a property that&apos;s habitable now
              but needs $20-40K of value-add rehab over 6-12 months. You could buy
              it conventionally and rehab from cash flow, you could buy it with
              hard money and refi after rehab, or you could try to do both (buy
              conventionally, then HELOC or cash-out refi for rehab).
            </p>
            <p>
              The trap: investors buy these with hard money &ldquo;to be
              safe&rdquo; and then discover their post-rehab ARV doesn&apos;t
              support a DSCR refi at the LTV they need. Now they&apos;re stuck
              carrying expensive short-term debt while they figure it out. Before
              using hard money, model the refi exit first — if the ARV, rent, and
              DSCR don&apos;t support the refi you need, the planned exit does not
              work at the leverage actually offered.
            </p>

            <p className="text-sm text-muted-foreground mt-6">
              Related reading:{" "}
              <Link
                href="/blog/brrrr-method-explained"
                className="tc-link"
              >
                BRRRR method explained
              </Link>
              ,{" "}
              <Link
                href="/blog/how-to-refinance-a-rental-property"
                className="tc-link"
              >
                How to refinance a rental property
              </Link>
              .
            </p>

            <p className="text-sm text-muted-foreground">
              General educational information, not a loan quote or approval.
              Rates, credit, leverage, appraisal, DSCR, reserves, documentation,
              seasoning, recourse, and timing vary by lender and file. Verify
              current written terms with both the acquisition and exit lenders.
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
        <PostSources
          sources={[
            {
              title:
                "Freddie Mac Single-Family, Maximum LTV/TLTV/HTLTV Ratio Requirements for Conforming and Super Conforming Mortgages",
              url: "https://sf.freddiemac.com/general/maximum-ltv-tltv-htltv-ratio-requirements-for-conforming-and-super-conforming-mortgages",
            },
          ]}
        />
        <RelatedContent kind="blog" slug={SLUG} title={TITLE} className="mt-10" />

        <RelatedBlogPosts currentSlug={SLUG} />

        <footer className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Picking the right loan product changes whether a deal pencils.
            TrueCap models DSCR live and compares financing scenarios side by
            side (your current terms, more down, a 15-year term, and a
            DSCR-style rate) so you can see which structure actually makes the
            numbers work.
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
