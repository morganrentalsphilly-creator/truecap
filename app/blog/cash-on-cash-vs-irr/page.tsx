/**
 * Blog post: Cash-on-cash vs IRR — when each one tells the truth
 *
 * Mid-funnel educational content for investors comparing return
 * metrics. Helps clarify when each metric is right and when each is
 * misleading.
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

const SLUG = "cash-on-cash-vs-irr";
const TITLE = "Cash-on-cash vs IRR: which one tells the truth?";
const DESCRIPTION =
  "Cash-on-cash and IRR answer different questions. Learn when each one is right, when each one misleads, and which to lead with on which type of deal.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = lastmodFor("/blog/cash-on-cash-vs-irr") ?? PUBLISHED_AT;
const READING_TIME = 7;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "cash on cash vs irr",
    "rental property return metrics",
    "internal rate of return real estate",
    "real estate return comparison",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `/blog/${SLUG}`,
    type: "article",
    publishedTime: PUBLISHED_AT,
    modifiedTime: MODIFIED_AT,
  },
  twitter: { card: "summary_large_image" },
};

export default function CashOnCashVsIrrPost() {
  const siteUrl = getSiteUrl();
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: TITLE,
    description: DESCRIPTION,
    datePublished: PUBLISHED_AT,
    dateModified: MODIFIED_AT,
    url: `${siteUrl}/blog/${SLUG}`,
    author: { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: "TrueCap", url: siteUrl },
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntityOfPage: `${siteUrl}/blog/${SLUG}`,
    isPartOf: { "@type": "Blog", "@id": `${siteUrl}/blog#blog` },
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
        name: TITLE,
        item: `${siteUrl}/blog/${SLUG}`,
      },
    ],
  };

  return (
    <ArticlePage>
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbLd} />
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
                month: "short",
                day: "numeric",
              })}{" "}
              · {READING_TIME} min read
            </p>
            <BlogByline />
            <UnderTitleAnalyzeLink />
            <p className={ARTICLE_LEDE}>
              Cash-on-cash and IRR are both return metrics for rental real
              estate. They answer completely different questions, and treating
              them as interchangeable can make a weak deal look stronger than it
              is.
            </p>
          </header>

          <ArticleBody>
            <h2>
              Cash-on-cash: this year&apos;s return on this year&apos;s cash
            </h2>
            <p>
              <Link
                href="/glossary/cash-on-cash-return"
                className="tc-link"
              >
                Cash-on-cash (CoC)
              </Link>{" "}
              is annual cash flow divided by total cash invested at acquisition.
              If you put $80k into a deal and it produces $7,200/yr of cash
              flow, your CoC is 9%.
            </p>
            <p>
              CoC tells you:{" "}
              <strong>
                what return am I getting on the cash sitting in this deal, right
                now, this year?
              </strong>
            </p>
            <p>
              What it does NOT include: appreciation, principal paydown,
              taxpayer-specific tax effects, or any change in rent, expenses, or
              value over time. It&apos;s a year-one snapshot, and principal
              reduction should be read from the actual amortization schedule.
            </p>

            <h2>
              IRR: the time-weighted return across the whole hold
            </h2>
            <p>
              <Link
                href="/glossary/irr"
                className="tc-link"
              >
                Internal Rate of Return (IRR)
              </Link>{" "}
              is the discount rate that makes the net present value of all the
              deal&apos;s cash flows (initial investment, every year&apos;s
              operating cash flow, sale proceeds at exit) equal to zero. Said
              more simply: it&apos;s the annualized, time-adjusted return
              implied by the modeled cash flows over the whole hold.
            </p>
            <p>
              IRR can incorporate items CoC omits: modeled rent and expense
              changes, principal paydown, a stated disposition or refinance
              scenario, and the time value of money. Its output is only as
              reliable as those cash-flow and exit assumptions.
            </p>

            <h2>
              When each one can mislead
            </h2>
            <p>
              <strong>CoC misleads when</strong> you compare deals across
              different appreciation profiles. A 9% CoC in a low-appreciation
              market and a 6% CoC in a high-appreciation market can produce
              identical 10-year IRR. If you optimize only on CoC, you
              systematically over-invest in pure cash-flow markets and miss the
              deals where compounding appreciation does the heavy lifting.
            </p>
            <p>
              <strong>IRR misleads when</strong> the appreciation assumption is
              wrong. IRR is hyper-sensitive to your exit-year sale price. A
              one-percentage-point change in annual appreciation can move a
              leveraged IRR materially; how much depends on leverage, hold
              period, and selling costs. If your
              underwriting model assumes 5%/yr appreciation in a market that
              actually does 2%/yr, your projected IRR is fantasy. Always
              stress-test IRR against a flat-appreciation scenario.
            </p>
            <p>
              <strong>
                Both answer a pre-tax property question unless a model
                explicitly includes tax assumptions.
              </strong>{" "}
              An after-tax result is taxpayer-specific: filing status, activity
              classification, basis, limitations (see the rental-loss limits in{" "}
              <a
                href="https://www.irs.gov/publications/p527"
                className="tc-link"
              >
                IRS Publication 527
              </a>
              ), holding structure, state sourcing, and disposition all matter. Keep the property-level
              metrics comparable, then have an adviser review any after-tax
              scenario.
            </p>

            <h2>
              Which metric to lead with on which deal
            </h2>
            <p>
              <strong>Pure cash-flow deals</strong> (where the return case rests
              on current cash flow, not price growth): lead with CoC, and check
              the metro&apos;s{" "}
              <a
                href="https://www.fhfa.gov/document/d/hpi/fhfa-house-price-index-report-2026q2"
                className="tc-link"
              >
                recent price history
              </a>{" "}
              before assuming appreciation is small. Recheck that the deal still
              cash-flows under your rent, vacancy, and expense stress cases.
            </p>
            <p>
              <strong>Appreciation-leaning deals</strong> (where the return case
              depends on price growth): lead with IRR — but only if
              you&apos;ve stress-tested the appreciation assumption. Don&apos;t
              commit to a deal whose entire return story is &quot;rent
              appreciates 4% and price appreciates 5% for 10 years.&quot; Both
              could happen. Neither is certain.
            </p>
            <p>
              <strong>
                <Link
                  href="/glossary/brrrr"
                  className="tc-link"
                >
                  BRRRR
                </Link>{" "}
                / value-add deals
              </strong>
              : neither metric handles BRRRR well in isolation. The whole point
              is capital recycled at refi — look at &quot;cash recovered as % of
              initial investment&quot; first, then year-1 CoC against the
              post-refi cash position, then long-term IRR. CoC alone misses the
              recycle; IRR alone smears it across the hold. (See{" "}
              <Link
                href="/blog/how-to-refinance-a-rental-property"
                className="tc-link"
              >
                how to refinance a rental property
              </Link>{" "}
              for the cash-out workflow.)
            </p>

            <h2>
              The practical workflow
            </h2>
            <p>
              On every deal: look at CoC first (is this returning enough on the
              cash I&apos;m putting in right now to justify the risk?). Then
              look at IRR (over the realistic hold period, does this compound to
              something I&apos;m happy with?). Then stress-test the IRR (does it
              still work if appreciation is 1pp lower than I assumed?).
            </p>
            <p>
              If all three pass, the deal meets the criteria you set. If CoC is
              great but
              IRR collapses on stress test, you have a pure cash-flow play and
              should treat it that way. If IRR is great but CoC is negative,
              you&apos;re betting on appreciation and need a personal balance
              sheet that can carry negative cash flow until exit. Both are valid
              bets — just be clear about which one you&apos;re making.
            </p>
            <p>
              The{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              shows cash-on-cash return. Pro adds pre-tax cash-flow and equity
              projections, sensitivity tools, and an Offer Ceiling (the highest
              price that still meets your targets) that can test a minimum
              10-year pre-tax IRR target. Build any other IRR or disposition
              case separately with explicit exit assumptions; TrueCap
              doesn&apos;t offer an integrated exit-scenario model.
            </p>
          </ArticleBody>
        </article>
        <PostSources
          sources={[
            {
              title: "IRS Publication 527 (2025), Residential Rental Property",
              url: "https://www.irs.gov/publications/p527",
            },
            {
              title: "FHFA House Price Index Report, 2026Q2 (Aug 25, 2026)",
              url: "https://www.fhfa.gov/document/d/hpi/fhfa-house-price-index-report-2026q2",
            },
          ]}
        />
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
