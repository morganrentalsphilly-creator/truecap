/**
 * Methodology blog post for the legacy URL. Explains the secondary
 * screening-band thresholds in
 * lib/verdict.ts in plain English. Builds trust + earns
 * organic search for "is this rental a good deal" / "rental
 * property Screening Index" queries.
 *
 * IMPORTANT: the thresholds quoted in this post are pulled
 * directly from lib/verdict.ts. If verdict.ts changes (per
 * CLAUDE.md item #5 in out-of-scope), THIS POST MUST BE
 * UPDATED — drift between code and the methodology page
 * destroys trust faster than not having the page at all.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ARTICLE_HEADER,
  ARTICLE_LEDE,
  ARTICLE_META,
  ARTICLE_META_LINK,
  ARTICLE_META_NEXT,
  ARTICLE_TITLE,
  ArticleBody,
  ArticleEnd,
  ArticleMain,
  ArticlePage,
  UnderTitleAnalyzeLink,
} from "@/components/marketing/article";
import { BlogByline } from "@/components/marketing/blog-byline";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { FaqSection } from "@/components/marketing/faq-section";
import { Note } from "@/components/marketing/page-parts";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { RelatedContent } from "@/components/marketing/related-content";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";
import { Header } from "@/components/investcalc/header";
import { lastmodFor } from "@/lib/seo/lastmod";
import { JsonLd } from "@/components/seo/json-ld";

const SLUG = "how-truecap-verdict-engine-works";
const TITLE = "How TrueCap's screening bands classify a deal";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "How TrueCap's screening bands classify a deal";
const DESCRIPTION =
  "The explicit cash flow, DSCR, cash-on-cash and (for all-cash deals) cap-rate thresholds behind TrueCap's five screening bands, with the rationale for each.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = lastmodFor("/blog/how-truecap-verdict-engine-works") ?? PUBLISHED_AT;
const READING_TIME_MIN = 10;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "rental property verdict engine",
    "is this rental a good deal",
    "rental property deal score",
    "rental underwriting thresholds",
    "rental property classification",
    "good cap rate rental",
    "good dscr rental",
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

const FAQ_ITEMS = [
  {
    q: "How does TrueCap's screening classifier band a deal?",
    a: "TrueCap's screening classifier compares modeled cash flow, DSCR, and cash-on-cash return (cap rate instead of DSCR on all-cash deals) with explicit thresholds, producing Strong, Solid, Mixed, Marginal, or Negative bands. The label describes how your entered assumptions stack up against those thresholds.",
  },
  {
    q: "What cash flow does TrueCap consider 'good'?",
    a: "$400/month or more net monthly cash flow (after all operating expenses and debt service) clears the Strong threshold. $100-400/month is Solid territory. Below $100/month but still positive is Mixed. Negative cash flow drops you into Marginal (down to -$200) or Negative (worse than -$200).",
  },
  {
    q: "What DSCR contributes to TrueCap's Strong band?",
    a: "TrueCap uses 1.25 or higher as its Strong score-band threshold; 1.15-1.25 is Solid, 1.0-1.15 is Mixed, 0.9-1.0 is Marginal, and below 0.9 is Negative. Below 1.0, the modeled operating income does not cover modeled debt service. These are TrueCap heuristics, not lender rules. Lenders calculate DSCR differently and apply separate borrower, property, documentation, reserve, rate, and LTV requirements, so no TrueCap band establishes loan eligibility or approval.",
  },
  {
    q: "How does TrueCap handle all-cash purchases for DSCR?",
    a: "DSCR doesn't apply to cash purchases because there is no debt service. The screening classifier uses a cash-only path based on cash flow, cap rate, and cash-on-cash.",
  },
  {
    q: "What's the difference between Buy Box fit and the Deal score?",
    a: "Buy Box fit checks your entered assumptions against your Buy Box targets. The Deal score is a 0-100 heuristic summary of the modeled numbers, with a factor breakdown.",
  },
];

export default function HowVerdictEngineWorksPost() {
  const siteUrl = getSiteUrl();
  const url = `${siteUrl}/blog/${SLUG}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: TITLE,
    description: DESCRIPTION,
    image: [`${siteUrl}/home.jpg`],
    datePublished: PUBLISHED_AT,
    dateModified: MODIFIED_AT,
    author: { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: "TrueCap", url: siteUrl },
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "TrueCap", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${siteUrl}/blog`,
      },
      { "@type": "ListItem", position: 3, name: TITLE, item: url },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <ArticlePage>
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={faqSchema} />

      <ArticleMain>
        <article>
          <header className={ARTICLE_HEADER}>
            <h1 className={ARTICLE_TITLE}>{TITLE}</h1>
            <p className={ARTICLE_META}>
              <Link href="/blog" className={ARTICLE_META_LINK}>
                Blog
              </Link>{" "}
              · Methodology · {READING_TIME_MIN} min read
            </p>
            <p className={ARTICLE_META_NEXT}>
              Published {PUBLISHED_AT}
              {MODIFIED_AT !== PUBLISHED_AT && ` · Updated ${MODIFIED_AT}`}
            </p>
            <BlogByline />
            <UnderTitleAnalyzeLink />
            <p className={ARTICLE_LEDE}>{DESCRIPTION}</p>
          </header>

          <Note title="TL;DR">
            <p>
              TrueCap&apos;s screening classifier is a small set of explicit
              thresholds that groups modeled results into five bands:{" "}
              <strong>Strong, Solid, Mixed, Marginal, Negative</strong>. Strong
              needs{" "}
              <strong>$400+/mo cash flow, DSCR ≥ 1.25, and CoC ≥ 10%</strong>.
              Solid needs <strong>$100+/mo, DSCR ≥ 1.15, and CoC ≥ 6%</strong>.
              Negative cash flow or DSCR below 1.0 trips Marginal / Negative.
              Cash purchases get their own simpler classifier because DSCR
              doesn&apos;t apply. Everything else is Mixed. The exact thresholds
              and the rationale are below.
            </p>
          </Note>

          <ArticleBody className="mt-10 sm:mt-12">
            <h2>Why we show screening bands</h2>
            <p>
              A rental analysis spits out numbers — cap rate, cash flow, DSCR,
              cash-on-cash, IRR — and a new investor stares at them wondering if
              6.5% is good. An experienced investor may recognize common rules
              of thumb (DSCR ≥ 1.25, cap rate ≥ 7% in some contexts) but still
              needs the assumptions and target basis stated explicitly.
            </p>
            <p>
              The screening classifier groups the modeled outputs into one of
              five bands and explains which thresholds were met or missed. Buy
              Box fit is a separate check of the modeled numbers against your
              own targets, and the Deal score (0–100) is a heuristic summary of
              the modeled numbers.
            </p>
            <p>
              The classifier&apos;s thresholds live in one file,{" "}
              <code>lib/verdict.ts</code>, in the codebase that powers this
              site. This post explains them with the same numbers the
              production code uses.
            </p>

            <h2>The five tiers, in one sentence each</h2>
            <ul>
              <li>
                <strong>Strong</strong> — clears every legacy band threshold.
                This label does not direct the user to buy or offer.
              </li>
              <li>
                <strong>Solid</strong> — clears the lower legacy band thresholds
                with less modeled margin.
              </li>
              <li>
                <strong>Mixed</strong> — one or more metrics do not clear the
                higher bands; review the actual targets and assumptions.
              </li>
              <li>
                <strong>Marginal</strong> — cash flow is negative or model DSCR
                is below 1.0 within the stated range.
              </li>
              <li>
                <strong>Negative</strong> — cash flow is meaningfully negative
                or model DSCR is well below 1.0 under the entered assumptions.
              </li>
            </ul>

            <h2>The exact thresholds (financed purchase)</h2>
            <p>
              Most rental purchases use financing, so this is the primary legacy
              path. The classifier checks three metrics (cash flow, DSCR, and
              cash-on-cash) and assigns the first matching screening band.
            </p>

            <h3>Strong</h3>
            <p>All three must hold:</p>
            <ul>
              <li>
                Monthly net cash flow ≥ <strong>$400</strong>
              </li>
              <li>
                DSCR ≥ <strong>1.25</strong>
              </li>
              <li>
                Cash-on-cash ≥ <strong>10%</strong>
              </li>
            </ul>
            <p>
              These are TrueCap score-band heuristics. A $400 monthly scenario
              creates more modeled room than $100, but it does not guarantee
              coverage of a vacancy or capital event. A 1.25 modeled DSCR does
              not establish lender DSCR, eligibility, pricing, or approval.
              Compare the modeled CoC with current, like-for-like alternatives
              using the same horizon, liquidity, risk, taxes, and transaction
              costs.
            </p>

            <h3>Solid</h3>
            <p>All three must hold:</p>
            <ul>
              <li>
                Monthly net cash flow ≥ <strong>$100</strong>
              </li>
              <li>
                DSCR ≥ <strong>1.15</strong>
              </li>
              <li>
                Cash-on-cash ≥ <strong>6%</strong>
              </li>
            </ul>
            <p>
              The Solid band has limited modeled margin. A $100/month cash flow
              buffer disappears the moment vacancy ticks up or a major appliance
              breaks. 1.15 DSCR is above breakeven but leaves limited modeled
              coverage. It does not show whether a lender would accept its own
              calculated ratio or whether more equity changes eligibility. The
              6% CoC band is an internal classification, not a required return
              or market comparison.
            </p>

            <h3>Mixed</h3>
            <p>
              Anything that doesn&apos;t hit Strong or Solid but still has
              positive cash flow and DSCR ≥ 1.0 lands here. Cash flow is
              positive but maybe only by a few dollars. DSCR clears breakeven
              but tightly. CoC may be modest. The output is sensitive to the
              assumptions and should not be read as a directive.
            </p>

            <h3>Marginal</h3>
            <ul>
              <li>
                Monthly cash flow is negative but not worse than{" "}
                <strong>-$200</strong>, <em>or</em>
              </li>
              <li>
                DSCR drops between <strong>0.9 and 1.0</strong>
              </li>
            </ul>
            <p>
              Marginal means the entered case misses a cash-flow or coverage
              threshold. A different result requires evidence for a changed
              assumption—for example, a documented rent or financing term—not
              optimism about a future value.
            </p>

            <h3>Negative</h3>
            <ul>
              <li>
                Monthly cash flow worse than <strong>-$200</strong>, <em>or</em>
              </li>
              <li>
                DSCR below <strong>0.9</strong>
              </li>
            </ul>
            <p>
              Negative means the entered assumptions do not produce a positive
              operating case. Price, rent, expenses, or financing would have to
              change for the modeled cash-flow result to change; any replacement
              value should be supported by evidence.
            </p>

            <h2>The cash-purchase path</h2>
            <p>
              When the analysis says <code>monthlyPayment &lt;= 0</code> — i.e.,
              there&apos;s no financing — DSCR doesn&apos;t mean anything.
              There&apos;s no debt service to cover. The screening
              classifier detects this and switches to a simpler classifier:
            </p>
            <ul>
              <li>
                <strong>Strong</strong>: cash flow ≥ $400/mo, cap rate ≥ 7%, CoC
                ≥ 8%.
              </li>
              <li>
                <strong>Solid</strong>: cash flow ≥ $100/mo, cap rate ≥ 5%, CoC
                ≥ 5%.
              </li>
              <li>
                <strong>Mixed</strong>: positive cash flow but below Solid
                thresholds.
              </li>
              <li>
                <strong>Marginal / Negative</strong>: same negative cash flow
                cutoffs as financed (-$200 boundary).
              </li>
            </ul>
            <p>
              CoC thresholds are slightly lower than the financed path because
              cash purchases are giving up leverage — the &quot;same&quot; 8%
              CoC on cash represents a higher risk-adjusted return than 8% CoC
              on a financed deal, because there&apos;s no debt-service risk.
            </p>

            <h2>How the screening bands group each metric</h2>
            <p>
              The legacy classifier groups each metric into a band. The current
              underwriting result keeps these labels secondary to the actual
              numbers and the user&apos;s selected targets.
            </p>

            <h3>Cap rate sentences</h3>
            <ul>
              <li>
                <strong>≥ 7%</strong> — legacy upper cap-rate band.
              </li>
              <li>
                <strong>5-7%</strong> — legacy middle cap-rate band.
              </li>
              <li>
                <strong>3-5%</strong> — legacy lower cap-rate band.
              </li>
              <li>
                <strong>&lt; 3%</strong> — below the legacy cap-rate bands;
                verify rent and operating expenses.
              </li>
            </ul>

            <h3>DSCR sentences</h3>
            <ul>
              <li>
                <strong>Cash purchase</strong> — &quot;DSCR: N/A — no debt
                service. An all-cash purchase has no lender debt service to
                cover.&quot;
              </li>
              <li>
                <strong>≥ 1.25</strong> — &quot;above the 1.25 screening
                benchmark; actual lender definitions and requirements
                vary.&quot;
              </li>
              <li>
                <strong>1.0 - 1.25</strong> — &quot;above modeled debt-service
                breakeven but below the 1.25 screening benchmark; confirm the
                lender&apos;s definition and requirements.&quot;
              </li>
              <li>
                <strong>&lt; 1.0</strong> — &quot;below 1.0 — operating income
                doesn&apos;t cover debt service, so the owner subsidizes the
                property each month.&quot;
              </li>
            </ul>

            <h3>Cash-on-cash sentences</h3>
            <ul>
              <li>
                <strong>≥ 12%</strong> — legacy upper CoC band.
              </li>
              <li>
                <strong>8 - 12%</strong> — legacy high CoC band.
              </li>
              <li>
                <strong>4 - 8%</strong> — legacy middle CoC band.
              </li>
              <li>
                <strong>0 - 4%</strong> — legacy lower positive CoC band.
              </li>
              <li>
                <strong>&lt; 0%</strong> — negative modeled cash return.
              </li>
            </ul>

            <h2>
              What the screening classification <em>doesn&apos;t</em> do
            </h2>
            <p>These are deliberate scope decisions:</p>
            <ul>
              <li>
                <strong>No appreciation modeling.</strong> The classification is
                operations-only and does not predict future value. The Deal
                score&apos;s 10-year total-return factor is where TrueCap
                accounts for modeled appreciation.
              </li>
              <li>
                <strong>
                  No subjective &quot;location quality&quot; score.
                </strong>{" "}
                Some tools combine financial output with a neighborhood-vibes
                rating. We don&apos;t — location quality is what you know about
                the market, not what an algorithm tells you.
              </li>
              <li>
                <strong>No partial credit.</strong> Strong requires{" "}
                <em>all three</em> thresholds. Missing any one knocks you out of
                Strong, into Solid only if all three Solid thresholds still
                hold, otherwise lower. We thought about a weighted score (that&apos;s what the
                Deal score does), while this classifier uses explicit
                cutoffs.
              </li>
            </ul>

            <h2>How to use the screening bands</h2>
            <p>
              When you run a property through{" "}
              <Link href="/analyze" prefetch={false}>the TrueCap analyzer</Link>, start with the core
              economics and any Buy Box fit. Treat a legacy band as
              secondary context:
            </p>
            <ol>
              <li>
                <strong>Strong</strong>: the entered case clears every band
                threshold. Verify rent, tax, insurance, condition, financing,
                and the targets that matter to you before recording a decision.
              </li>
              <li>
                <strong>Solid</strong>: the entered case clears the lower band
                thresholds with less margin. Stress-test rent and vacancy, then
                compare the result with your own explicit targets.
              </li>
              <li>
                <strong>Mixed</strong>: one or more metrics miss the higher
                bands. Review the modeled result directly instead of treating
                the label as a conclusion.
              </li>
              <li>
                <strong>Marginal / Negative</strong>: the entered case misses a
                cash-flow or coverage threshold. Change assumptions only when
                you have evidence for the replacement value.
              </li>
            </ol>

            <h2>If you want the math behind the classification</h2>
            <p>
              The underlying calculations come from{" "}
              <code>lib/calc-analysis.ts</code> — the single source of truth for
              cap rate, cash-on-cash, DSCR, and monthly cash flow across the
              entire site. Same engine drives the free analyzer, the saved-deal
              PDF, the share link, the dashboard, and the OG image. If
              you&apos;ve seen the number 6.4% as the cap rate in your TrueCap
              analysis, that&apos;s the same 6.4% the screening classifier
              reads.
            </p>
            <p>
              For deeper reading on the individual metrics, our guides on{" "}
              <Link href="/blog/cap-rate-vs-cash-on-cash-vs-dscr">
                cap rate vs cash-on-cash vs DSCR
              </Link>{" "}
              and{" "}
              <Link href="/blog/what-is-a-good-cap-rate">
                what is a good cap rate
              </Link>{" "}
              go into the &quot;what number is good?&quot; question one metric
              at a time.
            </p>

          </ArticleBody>

          {/* faqSchema above is the one FAQPage node for these rows. */}
          <FaqSection
            id="faq"
            variant="inline"
            heading="FAQ"
            items={FAQ_ITEMS}
            structuredData={false}
            contact={null}
          />

          <ArticleBody className="mt-16">
            <h2>Review a real underwrite</h2>
            <p>
              TrueCap is free to try: paste an address, review every imported
              fact and starting assumption, then enter or confirm the property
              values. You&apos;ll see the core economics first, with
              Buy Box fit once your targets are set.
            </p>
          </ArticleBody>
        </article>
        <RelatedContent kind="blog" slug={SLUG} title={TITLE} className="mt-10" />
        <RelatedBlogPosts currentSlug={SLUG} limit={3} />
      </ArticleMain>
      <ArticleEnd>
        <BlogStickyCta inArticleColumn />
      </ArticleEnd>
      <SiteFooter />
      <ScrollDepthTracker />
    </ArticlePage>
  );
}
