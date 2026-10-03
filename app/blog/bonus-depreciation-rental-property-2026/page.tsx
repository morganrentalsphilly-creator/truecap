/**
 * Strategy blog post — Bonus depreciation on rental property in 2026.
 *
 * Targets high-intent queries:
 *   - "bonus depreciation 2026"
 *   - "rental property bonus depreciation"
 *   - "cost segregation 2026"
 *   - "str loophole tax"
 *   - "real estate professional status"
 *   - "rental property depreciation"
 *   - "cost seg study cost"
 *   - "passive losses rental real estate"
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
import { Note } from "@/components/marketing/page-parts";
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

const SLUG = "bonus-depreciation-rental-property-2026";
const TITLE =
  "Bonus depreciation on rental property in 2026: the restored 100% deduction and what qualifies";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Bonus depreciation on rental property in 2026";
const DESCRIPTION =
  "The 2026 bonus depreciation rate is 100% for eligible property acquired and placed in service after January 19, 2025. Learn what rental assets qualify.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = lastmodFor("/blog/bonus-depreciation-rental-property-2026") ?? PUBLISHED_AT;
const FACT_CHECKED_AT = "2026-08-15";
const READING_TIME_MIN = 10;

const IRS_BONUS_GUIDANCE =
  "https://www.irs.gov/newsroom/treasury-irs-issue-guidance-on-the-additional-first-year-depreciation-deduction-amended-as-part-of-the-one-big-beautiful-bill";
const IRS_PUBLICATION_946 = "https://www.irs.gov/publications/p946";
const IRS_PUBLICATION_925 = "https://www.irs.gov/publications/p925";
const IRS_PUBLICATION_544 = "https://www.irs.gov/publications/p544";
const IRS_PUBLICATION_527 = "https://www.irs.gov/publications/p527";
const IRS_NOTICE_2026_11 = "https://www.irs.gov/pub/irs-drop/n-26-11.pdf";
const USC_26_469 =
  "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section469&num=0&edition=prelim";

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "bonus depreciation 2026",
    "rental property bonus depreciation",
    "cost segregation 2026",
    "str loophole tax",
    "real estate professional status",
    "rental property depreciation",
    "cost seg study cost",
    "passive losses rental real estate",
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
    q: "What is bonus depreciation in plain English?",
    a: "Bonus depreciation is an additional first-year deduction for eligible property. The restored rate is 100% for qualifying property acquired and placed in service after January 19, 2025. A residential rental building itself generally has a 27.5-year recovery period and does not qualify, but certain properly classified shorter-life components may qualify.",
  },
  {
    q: "Is bonus depreciation gone in 2026?",
    a: "No. Current IRS guidance applies a permanent 100% bonus-depreciation rate to eligible property acquired and placed in service after January 19, 2025. Property acquired before January 20, 2025 can remain subject to the earlier phase-down rules, so contract, acquisition, and placed-in-service dates matter.",
  },
  {
    q: "What is a cost segregation study and is it worth it in 2026?",
    a: "A cost segregation study documents whether parts of a building should be classified separately from the 27.5- or 39-year structure. Properly classified 5-, 7-, or 15-year property can fall within the recovery-period test for bonus depreciation. Whether a study is worthwhile depends on the supported allocation, timing, tax rate, passive-loss limits, future sale plans, and study cost; there is no universal property-price threshold.",
  },
  {
    q: "Can short-term-rental losses offset non-passive income?",
    a: "Sometimes, but not because every short-term rental is automatically non-passive. IRS Publication 925 has exceptions to the rental-activity definition, including an average customer-use period of seven days or less, and separate material-participation tests. The facts, participation records, grouping, and other limitations determine treatment. A tax professional should evaluate the complete return.",
  },
  {
    q: "What is real estate professional status (REPS)?",
    a: "For the passive-activity rules, a qualifying taxpayer must perform more than half of their personal services and more than 750 hours in real-property trades or businesses in which they materially participate. Qualifying does not by itself make every rental loss non-passive; material participation, activity grouping, basis, at-risk, and other limits can still matter.",
  },
  {
    q: "What records support material participation?",
    a: "Keep reasonable, credible records of the work performed and time spent, such as calendars, appointment books, or narrative summaries supported by contemporaneous documents. The relevant test and the taxpayer's facts determine what must be shown. Do not rely on an unsupported after-the-fact estimate.",
  },
  {
    q: "What happens to depreciation when I sell?",
    a: "Depreciation reduces adjusted basis and can change the character and amount of gain on sale. Different rules can apply to the building and to shorter-life property reclassified by a cost segregation study, including section 1245 recapture and unrecaptured section 1250 gain. Model the exit with a tax professional instead of assuming one flat 25% rate.",
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
            <h1 className={ARTICLE_TITLE}>{TITLE}</h1>
            <p className={ARTICLE_META}>
              <Link href="/blog" className={ARTICLE_META_LINK}>
                Blog
              </Link>{" "}
              ·{" "}
              Published{" "}
              {new Date(PUBLISHED_AT).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              · materially updated{" "}
              {new Date(MODIFIED_AT).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              · {READING_TIME_MIN} min read
            </p>
            <BlogByline />
            <p className="mt-2 text-sm text-muted-foreground">
              IRS sources verified {FACT_CHECKED_AT}
            </p>
            <UnderTitleAnalyzeLink />
            <p className={ARTICLE_LEDE}>
              Current IRS guidance{" "}
              <a
                href={IRS_BONUS_GUIDANCE}
                className="tc-link"
              >
                restored 100% bonus depreciation
              </a>{" "}
              for eligible property acquired and placed in service after January
              19, 2025. The
              building itself usually does not qualify; certain shorter-life
              components can. Dates, classification, and loss limitations all
              matter.
            </p>
          </header>

          <ArticleBody>
          <p>
            The 2026 federal bonus-depreciation rate is{" "}
            <a
              href={IRS_PUBLICATION_946}
              className="tc-link"
            >
              <strong>100%</strong> for eligible property acquired and placed in
              service after January 19, 2025
            </a>
            . That is a material change from the prior phase-down
            schedule. It does not mean an investor can deduct the full purchase
            price of a rental building.
          </p>
          <p>
            Every strategy here has real eligibility tests and audit risk. Run
            anything you&apos;re considering past a CPA who works with real
            estate investors before you act on it.
          </p>

          <Note className="not-prose my-8">
            <strong>Source verification:</strong> factual rules on this page
            were checked on {FACT_CHECKED_AT} against current IRS guidance and
            Publications 946, 925, and 544. This is educational information, not
            individualized tax advice.
          </Note>

          <h2>
            What changed: 100% was restored
          </h2>
          <p>
            The earlier law was phasing bonus depreciation down. New legislation
            changed that rule, and the IRS now says the additional first-year
            deduction is permanently 100% for eligible property acquired and
            placed in service after January 19, 2025. See the IRS
            <a
              href={IRS_BONUS_GUIDANCE}
              className="tc-link"
            >
              {" "}
              implementation guidance
            </a>
            .
          </p>
          <p>The date boundary is essential:</p>
          <ArticleTable label="Data table" stickyFirstColumn={false}>
            <table className="[&_td:last-child]:whitespace-nowrap [&_td:last-child]:text-right [&_th:last-child]:text-right">
              <thead>
                <tr>
                  <th>
                    Property timing
                  </th>
                  <th>
                    General federal rule
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Acquired before Jan. 20, 2025</td>
                  <td>
                    <a
                      href={IRS_PUBLICATION_946}
                      className="tc-link"
                    >
                      Prior phase-down rules
                    </a>{" "}
                    can still apply
                  </td>
                </tr>
                <tr>
                  <td className="font-semibold text-foreground">
                    Acquired and placed in service after Jan. 19, 2025
                  </td>
                  <td className="font-semibold text-foreground">
                    100% for eligible property
                  </td>
                </tr>
              </tbody>
            </table>
          </ArticleTable>
          <p>
            Acquisition can involve{" "}
            <a
              href={IRS_NOTICE_2026_11}
              className="tc-link"
            >
              binding-contract and related rules
            </a>
            , and &ldquo;placed in service&rdquo; generally means{" "}
            <a
              href={IRS_PUBLICATION_946}
              className="tc-link"
            >
              ready and available for its assigned use
            </a>
            —not simply purchased. Have a qualified tax
            adviser resolve borderline dates.
          </p>

          <h2>
            How depreciation works (and why bonus matters)
          </h2>
          <p>
            Residential rental buildings{" "}
            <a
              href={IRS_PUBLICATION_527}
              className="tc-link"
            >
              depreciate straight-line over <strong>27.5 years</strong>
            </a>
            . A full straight-line year on a $400K
            residential-building basis is about $14,545 before placed-in-service
            conventions; the first-year amount and the amount left in the
            building class can differ. Bonus depreciation{" "}
            <a
              href={IRS_PUBLICATION_946}
              className="tc-link"
            >
              does not apply to the 27.5-year building shell itself
            </a>
            .
          </p>
          <p>
            What it changes is the treatment of shorter-life property embedded
            in the building. If the entire $400K basis is reported in the
            residential-rental-building class, it stays on the 27.5-year
            schedule. A supportable component classification—often documented
            through a cost segregation study—might instead break it down as:
          </p>
          <ul>
            <li>
              <strong>$280K</strong> — 27.5-year structure (shell, framing,
              roof, plumbing).
            </li>
            <li>
              <strong>$60K</strong> —{" "}
              <a
                href={IRS_PUBLICATION_527}
                className="tc-link"
              >
                15-year land improvements
              </a>{" "}
              (driveway, fencing, depreciable shrubbery).
            </li>
            <li>
              <strong>$60K</strong> —{" "}
              <a
                href={IRS_PUBLICATION_527}
                className="tc-link"
              >
                5-year personal property
              </a>{" "}
              (appliances, carpeting, furniture).
            </li>
          </ul>
          <p>
            If the $120K classification is supportable and every eligibility
            rule is met, the restored 100% rate could produce up to a
            <strong> $120K additional first-year deduction</strong>. The $280K
            building shell remains on its applicable recovery schedule. This is
            an illustration, not a default allocation or tax result.
          </p>

          <h3>What generally qualifies</h3>
          <p>
            <a
              href={IRS_PUBLICATION_946}
              className="tc-link"
            >
              IRS Publication 946
            </a>{" "}
            describes qualified property as including depreciable tangible
            property under MACRS with a recovery period of 20 years or less,
            certain computer software, and several other statutory categories.
            Eligible used property can qualify, subject to acquisition rules.
            Land is not depreciable, and a residential rental building&apos;s
            27.5-year recovery period generally puts the building itself outside
            the 20-year test.
          </p>

          <h2>Strategy 1: Cost segregation</h2>
          <p>
            A cost segregation study analyzes whether parts of a property should
            be classified separately from the building. A sound study documents
            the facts, legal classification, and allocation method; it does not
            make an otherwise ineligible asset qualify.
          </p>
          <p>Evaluate the economics with these inputs:</p>
          <ul>
            <li>
              <strong>Supported allocation:</strong> how much basis can actually
              be classified into eligible shorter-life property.
            </li>
            <li>
              <strong>Timing:</strong> whether acquisition and placed-in-service
              dates satisfy the restored rule.
            </li>
            <li>
              <strong>Ability to use the deduction:</strong> basis, at-risk,
              passive-activity, and excess-business-loss rules can limit the
              current benefit.
            </li>
            <li>
              <strong>Exit cost:</strong> accelerated deductions reduce basis
              and can increase taxable gain or recapture later.
            </li>
            <li>
              <strong>Professional cost:</strong> study, return preparation, and
              possible{" "}
              <a
                href={IRS_PUBLICATION_946}
                className="tc-link"
              >
                Form 3115
              </a>{" "}
              work for property already in service.
            </li>
          </ul>
          <p>
            There is no reliable universal price threshold. Compare the present
            value of tax timing after all limitations and exit effects with the
            cost of obtaining and defending the classification.
          </p>

          <h2>
            Strategy 2: Short-term-rental activity rules
          </h2>
          <p>
            Most rental real estate is{" "}
            <a
              href={IRS_PUBLICATION_925}
              className="tc-link"
            >
              &ldquo;passive activity&rdquo; under IRC §469
            </a>
            . Passive losses can only offset passive income unless an
            exception and the other applicable rules are satisfied. An unused
            loss may be suspended rather than produce a current cash benefit.
          </p>
          <p>
            Short stays can be treated differently for the passive-activity
            rules.{" "}
            <a
              href={IRS_PUBLICATION_925}
              className="tc-link"
            >
              IRS Publication 925
            </a>{" "}
            lists circumstances in which an activity is not treated as a rental
            activity, including when the average period of customer use is seven
            days or less. That is only the first step. The taxpayer must also
            satisfy a material-participation test for non-passive treatment.
          </p>
          <ul>
            <li>
              One test is{" "}
              <a
                href={IRS_PUBLICATION_925}
                className="tc-link"
              >
                more than 500 hours
              </a>{" "}
              of participation.
            </li>
            <li>
              Another is{" "}
              <a
                href={IRS_PUBLICATION_925}
                className="tc-link"
              >
                more than 100 hours
              </a>{" "}
              and at least as much participation as any other individual.
            </li>
            <li>Other tests and aggregation rules may apply to the facts.</li>
          </ul>
          <p>
            Keep records that identify the work and time involved. Do not assume
            a booking platform&apos;s stay length or a large deduction alone
            proves non-passive treatment, and do not market the rule as an
            automatic way to erase salary income.
          </p>

          <h2>
            Strategy 3: Real estate professional status (REPS)
          </h2>
          <p>
            Real-estate-professional status changes how rental activities are
            analyzed under the passive-activity rules. It does not automatically
            turn every rental loss into a currently deductible non-passive loss.
          </p>
          <p>
            Eligibility — you must meet <strong>both</strong>:
          </p>
          <ul>
            <li>
              <strong>50% test:</strong>{" "}
              <a
                href={IRS_PUBLICATION_925}
                className="tc-link"
              >
                more than half your total personal services
              </a>{" "}
              in trades or businesses during the year are performed in real
              property trades or businesses you materially participate in.
            </li>
            <li>
              <strong>750-hour test:</strong>{" "}
              <a
                href={IRS_PUBLICATION_925}
                className="tc-link"
              >
                more than 750 hours/year
              </a>{" "}
              in those real property trades or businesses.
            </li>
          </ul>
          <p>
            The taxpayer must also materially participate in the rental activity
            or activities under the applicable grouping rules. Basis, at-risk,
            and other deduction limitations remain separate tests.
          </p>
          <p>Common audit failures:</p>
          <ul>
            <li>
              Records that do not credibly substantiate the work performed and
              time spent.
            </li>
            <li>
              A job title or license alone does not establish the hours or
              material participation required.
            </li>
            <li>
              Married filing jointly —{" "}
              <a
                href={USC_26_469}
                className="tc-link"
              >
                only ONE spouse needs to meet the test
              </a>
              , but that spouse must individually meet both 50% and 750-hour
              real-estate-professional tests. Spousal participation can be
              treated differently when applying the separate
              material-participation rules.
            </li>
          </ul>

          <h2>
            Depreciation recapture — the back end
          </h2>
          <p>
            Accelerated depreciation is not evaluated in isolation. It reduces
            adjusted basis, which can increase gain when the asset is sold. The
            building and reclassified shorter-life assets can be subject to
            different gain-character and recapture rules.
          </p>
          <p>
            <a
              href={IRS_PUBLICATION_544}
              className="tc-link"
            >
              IRS Publication 544
            </a>{" "}
            explains dispositions and recapture. In a cost-segregated property,
            some personal-property gain may be ordinary income under section
            1245, while unrecaptured section 1250 gain can apply to depreciable
            real property. A single &ldquo;25% recapture rate&rdquo; does not
            accurately model every component.
          </p>
          <p>Plan the exit before claiming the deduction:</p>
          <ul>
            <li>
              <strong>1031 exchange.</strong> Roll the gain into a qualifying{" "}
              <a
                href={IRS_PUBLICATION_544}
                className="tc-link"
              >
                like-kind replacement property
              </a>
              . Eligibility, timing, boot, and
              reclassified assets require transaction-specific review.{" "}
              <Link
                href="/blog/1031-exchange-basics"
                className="tc-link"
              >
                Read the 1031 overview
              </Link>
              .
            </li>
            <li>
              <strong>Taxable sale.</strong> Model adjusted basis and the
              character of gain for each asset class, not just the headline sale
              price.
            </li>
            <li>
              <strong>Estate planning.</strong> Basis rules depend on how
              property is owned and transferred; get individualized advice
              rather than assuming a particular result.
            </li>
          </ul>

          <h2>Bottom-line decision tree</h2>
          <p>For property placed in service in 2026:</p>
          <ol>
            <li>Confirm the acquisition and placed-in-service dates.</li>
            <li>
              Separate nondepreciable land and the 27.5-year building from any
              shorter-life assets using supportable allocations.
            </li>
            <li>
              Confirm each asset meets the qualified-property and used-property
              rules in Publication 946.
            </li>
            <li>
              Estimate the deduction, then apply basis, at-risk,
              passive-activity, and other limitations.
            </li>
            <li>
              Model later disposition and recapture before deciding whether
              acceleration improves the full investment outcome.
            </li>
            <li>
              Have a real-estate tax professional review the classifications,
              dates, elections, and return reporting.
            </li>
          </ol>

          <p className="text-sm text-muted-foreground mt-6">
            Related reading:{" "}
            <Link
              href="/blog/rental-property-tax-deductions"
              className="tc-link"
            >
              Rental property tax deductions
            </Link>
            ,{" "}
            <Link
              href="/blog/1031-exchange-basics"
              className="tc-link"
            >
              1031 exchange basics
            </Link>
            ,{" "}
            <Link
              href="/blog/short-term-rental-underwriting-playbook"
              className="tc-link"
            >
              STR underwriting playbook
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
        <PostSources
          sources={[
            {
              title: "IRS news release IR-2026-06 (Jan. 14, 2026), guidance on the additional first-year depreciation deduction",
              url: "https://www.irs.gov/newsroom/treasury-irs-issue-guidance-on-the-additional-first-year-depreciation-deduction-amended-as-part-of-the-one-big-beautiful-bill",
            },
            {
              title: "IRS Publication 946 (2025), How To Depreciate Property",
              url: "https://www.irs.gov/publications/p946",
            },
            {
              title: "IRS Notice 2026-11, additional first-year depreciation deduction",
              url: "https://www.irs.gov/pub/irs-drop/n-26-11.pdf",
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
              title: "26 U.S.C. 469, Passive activity losses and credits limited",
              url: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title26-section469&num=0&edition=prelim",
            },
            {
              title: "IRS Publication 544 (2025), Sales and Other Dispositions of Assets",
              url: "https://www.irs.gov/publications/p544",
            },
          ]}
        />
        <RelatedContent kind="blog" slug={SLUG} title={TITLE} className="mt-10" />

        <RelatedBlogPosts currentSlug={SLUG} />

        <footer className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            This article is educational. TrueCap&apos;s analyzer models
            property cash flow, financing, and Pro pre-tax cash-flow/equity
            projections. It does not compute depreciation deductions, after-tax
            cash flow, recapture, or exit-tax outcomes; use a qualified tax
            professional for taxpayer-specific analysis.
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
