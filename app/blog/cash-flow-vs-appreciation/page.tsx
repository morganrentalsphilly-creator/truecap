/**
 * Anchor blog post #5 — "Cash flow vs appreciation: which rental
 * strategy actually wins in 2026?"
 *
 * Targets high-volume investor strategy queries:
 *   - "cash flow vs appreciation"
 *   - "real estate cash flow vs appreciation"
 *   - "should i invest for cash flow or appreciation"
 *   - "appreciation vs cash flow real estate"
 *
 * Different angle from the other 4 posts (which are mostly metric
 * explainers / financing). This is a STRATEGY post — broadens the
 * audience to include investors who haven't decided what to optimize
 * for yet.
 */

import type { Metadata } from "next";
import { Fragment, type ReactNode } from "react";
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

const SLUG = "cash-flow-vs-appreciation";
const TITLE =
  "Cash flow vs appreciation: which rental strategy actually wins in 2026?";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Cash flow vs appreciation: which wins in 2026?";
const DESCRIPTION =
  "A 10-year side-by-side of cash flow vs. appreciation that shows when each strategy wins, and how 2026 borrowing costs change the math.";
const PUBLISHED_AT = "2026-05-24";
const MODIFIED_AT = lastmodFor("/blog/cash-flow-vs-appreciation") ?? PUBLISHED_AT;
const READING_TIME_MIN = 9;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "cash flow vs appreciation",
    "real estate cash flow vs appreciation",
    "should i invest for cash flow or appreciation",
    "appreciation vs cash flow real estate",
    "cash flow investing",
    "appreciation investing",
    "rental property strategy",
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

/** Primary sources this post cites, as top-level consts so every inline
 *  href and the end-of-article Sources list name the same exact page. */
const PMMS_URL = "https://www.freddiemac.com/pmms";
/** FRED's readable series page for MORTGAGE30US (its Download button gives
 *  the weekly data the 2026 and 2018 averages are computed from). */
const MORTGAGE30US_URL = "https://fred.stlouisfed.org/series/MORTGAGE30US";
const FHFA_NATIONAL_HPI_URL = "https://fred.stlouisfed.org/series/HPIPONM226S";
const CPI_URL = "https://fred.stlouisfed.org/series/CPIAUCSL";
const FHFA_METRO_HPI_URL =
  "https://www.fhfa.gov/hpi/download/quarterly_datasets/hpi_po_metro.txt";
const IRS_PUB_527_URL = "https://www.irs.gov/publications/p527";
const IRS_FORM_8824_INSTRUCTIONS_URL = "https://www.irs.gov/instructions/i8824";

const SOURCE_LINK_CLASS = "tc-link";

const FAQS: { q: string; a: string }[] = [
  {
    q: "Which strategy makes more money over 10 years?",
    a: "Depends on the appreciation rate. Historically (the last 30 years, about 4.6% a year nominal national appreciation, roughly 2% after inflation, per FHFA's house price index), whether appreciation-heavy deals beat cash-flow deals on total return depended on how much appreciation each market actually delivered. In high-appreciation markets (San Francisco, Boston and Seattle averaged about 5.5-6% a year over the last 30 years in FHFA's house price index), appreciation-heavy deals would have come out ahead under this post's 10-year model, though San Francisco and Seattle prices fell about 2.4% in the year to mid-2026. In flat or declining markets, cash flow wins. This post's view for 2026: a balanced market, with both cash flow AND appreciation slightly above zero, is the sweet spot.",
  },
  {
    q: "Isn't cash flow safer?",
    a: "Mostly yes. Cash-flow deals give you a buffer against vacancy, repair surprises, and rate spikes — the property is still paying for itself even when things go wrong. Appreciation plays assume you can hold through downturns; if you're forced to sell during a price dip (job loss, divorce, life event), appreciation strategies can produce real losses while cash-flow strategies usually just stop earning.",
  },
  {
    q: "What's the role of tax benefits in this comparison?",
    a: "Tax treatment can change the comparison, but it is taxpayer-specific. Depreciation, passive-activity limits, basis, at-risk rules, personal use, holding structure, and the eventual disposition all affect timing and amount. A qualifying section 1031 exchange may defer recognized gain; it does not make tax disappear. Use adviser-reviewed scenarios rather than adding a fixed tax-return premium.",
  },
  {
    q: "What about principal paydown — does that count as cash flow or appreciation?",
    a: "Neither, technically. Principal paydown increases equity as scheduled loan payments reduce principal. Its contribution depends on the actual amortization schedule, leverage, additional payments, holding period, and starting cash invested; it should be modeled from the loan terms rather than assigned a universal annual-return range.",
  },
  {
    q: "Does 2026's higher-rate environment change the answer?",
    a: "Financing cost changes leverage, but there is no single current rate, cap rate, or market-wide result. Compare a property-specific loan quote with verified NOI, and run flat, upside, and downside rent, expense, rate, and exit scenarios. Neither a cash-flow label nor an appreciation thesis is inherently safe.",
  },
  {
    q: "Can a single deal do both?",
    a: "A property can have positive current cash flow and later appreciation, but neither outcome follows from a city label. Verify property-specific income and expenses, model principal paydown from the quoted loan, and stress-test flat and downside value scenarios. Treat tax effects as a separate adviser-reviewed layer.",
  },
];

/** Sourced FAQ phrases: each links to its source where the answer renders.
 *  The answer text itself is unchanged, so the visible answer and the
 *  FAQPage JSON-LD stay identical. */
const FAQ_SOURCE_LINKS: {
  phrase: string;
  link: (text: string) => ReactNode;
}[] = [
  {
    phrase: "about 4.6% a year nominal national appreciation",
    link: (text) => (
      <a href={FHFA_NATIONAL_HPI_URL} className={SOURCE_LINK_CLASS}>
        {text}
      </a>
    ),
  },
  {
    phrase: "roughly 2% after inflation",
    link: (text) => (
      <a href={CPI_URL} className={SOURCE_LINK_CLASS}>
        {text}
      </a>
    ),
  },
  {
    phrase:
      "San Francisco, Boston and Seattle averaged about 5.5-6% a year over the last 30 years in FHFA's house price index",
    link: (text) => (
      <a href={FHFA_METRO_HPI_URL} className={SOURCE_LINK_CLASS}>
        {text}
      </a>
    ),
  },
  {
    phrase: "San Francisco and Seattle prices fell about 2.4% in the year to mid-2026",
    link: (text) => (
      <a href={FHFA_METRO_HPI_URL} className={SOURCE_LINK_CLASS}>
        {text}
      </a>
    ),
  },
  {
    phrase:
      "Depreciation, passive-activity limits, basis, at-risk rules, personal use",
    link: (text) => (
      <a href={IRS_PUB_527_URL} className={SOURCE_LINK_CLASS}>
        {text}
      </a>
    ),
  },
  {
    phrase: "A qualifying section 1031 exchange may defer recognized gain",
    link: (text) => (
      <a href={IRS_FORM_8824_INSTRUCTIONS_URL} className={SOURCE_LINK_CLASS}>
        {text}
      </a>
    ),
  },
];

// FaqAnswer links a phrase by exact substring, so an FAQ edit that drops or
// rewords a phrase would silently remove that citation. Fail the build (and
// dev) instead.
for (const { phrase } of FAQ_SOURCE_LINKS) {
  if (!FAQS.some((f) => f.a.includes(phrase))) {
    throw new Error(
      `[blog/${SLUG}] FAQ_SOURCE_LINKS phrase not found in any FAQ answer: "${phrase}"`,
    );
  }
}

function FaqAnswer({ answer }: { answer: string }) {
  const parts: ReactNode[] = [];
  let rest = answer;
  while (rest) {
    let next: { at: number; phrase: string; link: (text: string) => ReactNode } | null =
      null;
    for (const entry of FAQ_SOURCE_LINKS) {
      const at = rest.indexOf(entry.phrase);
      if (at >= 0 && (next === null || at < next.at)) next = { at, ...entry };
    }
    if (next === null) {
      parts.push(rest);
      break;
    }
    parts.push(rest.slice(0, next.at));
    parts.push(<Fragment key={parts.length}>{next.link(next.phrase)}</Fragment>);
    rest = rest.slice(next.at + next.phrase.length);
  }
  return <>{parts}</>;
}

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
              {DESCRIPTION}
            </p>
          </header>

          <ArticleBody>
            <p>
              Walk into any real-estate investor meetup and you&apos;ll find two
              tribes. The cash-flow people think appreciation investors are
              gamblers. The appreciation people think cash-flow investors are
              penny-pinchers leaving real wealth on the table. Both are partly
              right, and the truth is more interesting than either camp wants to
              admit.
            </p>

            <p>
              This post runs the math on both strategies over a realistic 10-year
              hold, in three different market environments, with{" "}
              <a href={PMMS_URL} className={SOURCE_LINK_CLASS}>
                2026 borrowing costs
              </a>
              . By the end you&apos;ll know which one fits your situation and
              what to actually optimize for.
            </p>

            <h2>Defining the terms</h2>
            <p>
              <strong>Cash-flow investing</strong>: buy in markets where the
              property generates positive{" "}
              <Link
                href="/glossary/monthly-cash-flow"
                className="tc-link"
              >
                monthly cash flow
              </Link>{" "}
              after every expense + the mortgage. Optimize for{" "}
              <Link
                href="/glossary/cap-rate"
                className="tc-link"
              >
                cap rate
              </Link>{" "}
              and{" "}
              <Link
                href="/glossary/dscr"
                className="tc-link"
              >
                DSCR
              </Link>
              . Typical markets: Midwest cash-flow cities like{" "}
              <Link
                href="/markets/cleveland"
                className="tc-link"
              >
                Cleveland
              </Link>{" "}
              and{" "}
              <Link
                href="/markets/indianapolis"
                className="tc-link"
              >
                Indianapolis
              </Link>
              , older Sun Belt multifamily, blue-collar suburbs. The label
              describes today&apos;s rent relative to price, not a growth
              forecast:{" "}
              <a href={FHFA_METRO_HPI_URL} className={SOURCE_LINK_CLASS}>
                FHFA&apos;s house price index has Cleveland and Indianapolis up
                about 7.7% a year over the 10 years to mid-2026
              </a>
              .
            </p>
            <p>
              <strong>Appreciation investing</strong>: buy in markets where price
              growth is fast and reliable, even if monthly cash flow is thin or
              slightly negative. Optimize for total return over 5-10 years, not
              monthly income. Typical markets: coastal Tier-1, fast-growing Sun
              Belt primary cities, supply- constrained metros.
            </p>
            <p>
              <strong>Deals don&apos;t have to be pure either</strong>. A 6% cap
              rate property with 3% appreciation has both. The real question is
              which side of the bet you weight more heavily when picking deals.
            </p>

            <h2>
              The 4 sources of rental return
            </h2>
            <p>
              Before we compare, name the components. Every rental property
              generates total return from four buckets, and the cash-flow vs
              appreciation debate often ignores two of them:
            </p>
            <ol>
              <li>
                <strong>
                  <Link
                    href="/glossary/monthly-cash-flow"
                    className="tc-link"
                  >
                    Cash flow
                  </Link>
                </strong>{" "}
                — net monthly income after all expenses + mortgage. Run any
                deal&apos;s number in the{" "}
                <Link
                  href="/analyze" prefetch={false}
                  className="tc-link"
                >
                  TrueCap analyzer
                </Link>
                .
              </li>
              <li>
                <strong>Principal paydown</strong> — the portion of scheduled debt
                service that reduces the loan balance. Its return contribution
                depends on the actual amortization schedule and cash invested.
              </li>
              <li>
                <strong>Appreciation</strong> — property value growth. Unrealized
                until you sell or refinance.
              </li>
              <li>
                <strong>
                  <Link
                    href="/glossary/tax-savings"
                    className="tc-link"
                  >
                    Tax effects
                  </Link>
                </strong>{" "}
                —{" "}
                <a href={IRS_PUB_527_URL} className={SOURCE_LINK_CLASS}>
                  taxpayer-specific deductions, limitations, and sale treatment
                </a>{" "}
                can change the timing and amount of tax. They are not a fixed
                return component. See{" "}
                <Link
                  href="/blog/rental-property-tax-deductions"
                  className="tc-link"
                >
                  rental property tax deductions
                </Link>{" "}
                for an educational overview.
              </li>
            </ol>
            <p>
              Total return = sum of all four. The cash-flow tribe usually counts
              buckets 1 and 4 and discounts 3. The appreciation tribe counts 3
              heavily and downplays 1. Both miss bucket 2 entirely.
            </p>

            <h2>
              10-year comparison: 3 markets
            </h2>
            <p>
              Same investor, same $400k purchase, 25% down, a 30-year fixed loan
              at 7% (about $1,996 a month in principal and interest), 10-year
              hold. Different cap rates and appreciation assumptions for each
              market. To keep the arithmetic checkable, rent and expenses stay
              flat for all 10 years, and closing and selling costs are left out.
              For scale, Freddie Mac&apos;s weekly 30-year fixed average was{" "}
              <a href={PMMS_URL} className={SOURCE_LINK_CLASS}>
                7.03% on Sept. 24, 2026
              </a>
              . Run your own rate and down payment through the{" "}
              <Link
                href="/tools/mortgage-payment-calculator"
                className="tc-link"
              >
                mortgage payment calculator
              </Link>{" "}
              before assuming this 7% scenario matches your loan.
            </p>
            <ArticleTable label="Data table">
              <table>
                <thead>
                  <tr>
                    <th>
                      Market type
                    </th>
                    <th>
                      Cash flow (10y)
                    </th>
                    <th>
                      Principal paydown
                    </th>
                    <th>
                      Appreciation
                    </th>
                    <th>
                      Total return on $100k cash
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>Cash-flow heavy</strong>
                      <div className="text-xs text-muted-foreground">
                        8% cap · 1% appreciation
                      </div>
                    </td>
                    <td>~$80,000</td>
                    <td>~$43,000</td>
                    <td>~$42,000</td>
                    <td>~165%</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Balanced</strong>
                      <div className="text-xs text-muted-foreground">
                        6% cap · 3% appreciation
                      </div>
                    </td>
                    <td>~$0</td>
                    <td>~$43,000</td>
                    <td>~$138,000</td>
                    <td>~181%</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>
                        Appreciation heavy
                      </strong>
                      <div className="text-xs text-muted-foreground">
                        4% cap · 5% appreciation
                      </div>
                    </td>
                    <td>~−$80,000</td>
                    <td>~$43,000</td>
                    <td>~$252,000</td>
                    <td>~215%</td>
                  </tr>
                </tbody>
              </table>
            </ArticleTable>
            <p>
              <em>
                Illustrative pre-tax scenario only. Total return is cash flow
                plus principal paydown plus appreciation, divided by the $100k
                down payment. It excludes taxpayer-specific tax effects and
                assumes the stated appreciation occurs. Actual results depend on
                property facts, loan terms, operating results, and disposition
                costs.
              </em>
            </p>

            <h2>
              What the table actually shows
            </h2>
            <p>Three takeaways most strategy debates miss:</p>

            <h3>1. Appreciation wins on paper when it happens</h3>
            <p>
              5% annual appreciation compounded over 10 years on a $400k property
              is $252k of value growth — massively more than any cash flow stream
              could match. If you genuinely believe in 5%+ appreciation for your
              market and you can stomach the negative monthly cash flow, the math
              favors appreciation — though in this table about $80k of negative
              cash flow gives back nearly a third of that $252k.
            </p>

            <h3>2. Principal paydown is huge and ignored</h3>
            <p>
              ~$43k of principal paydown over 10 years on a $300k, 30-year loan
              at 7%. That&apos;s the same across all three strategies — every
              month, your tenant builds your equity. On the balanced row,
              principal paydown is far bigger than cash flow itself. Most
              comparisons skip this entirely.
            </p>

            <h3>3. Cash flow protects the downside</h3>
            <p>
              The appreciation-heavy row has about -$80k cash flow over 10 years
              — you&apos;re feeding the property about $660 out of pocket every
              month. If life changes (job loss, market dip, forced sale), you
              don&apos;t have the same modeled cushion. Positive modeled cash flow can improve
              resilience, but it is not bulletproof: rent, vacancy, collections,
              expenses, capital work, financing, and sale proceeds can all differ
              from the scenario.
            </p>

            <h2>The 2026 plot twist</h2>
            <p>
              All of the above assumes appreciation actually happens. Historical
              periods produced{" "}
              <a href={FHFA_METRO_HPI_URL} className={SOURCE_LINK_CLASS}>
                different results by market
              </a>
              , but none establishes a future path. Current rates and
              year-over-year price changes also move continuously. Underwrite flat, upside, and
              downside appreciation cases using current local evidence rather than
              treating a national narrative as a forecast.
            </p>
            <p>
              If you&apos;re betting on appreciation in 2026, you&apos;re making
              an active forecast call. The historical national average (
              <a href={FHFA_NATIONAL_HPI_URL} className={SOURCE_LINK_CLASS}>
                about 4.6% a year over the last 30 years in FHFA&apos;s index
              </a>
              ,{" "}
              <a href={CPI_URL} className={SOURCE_LINK_CLASS}>
                roughly 2% after inflation
              </a>
              ) doesn&apos;t apply in every market — and you&apos;re paying for
              it with NEGATIVE monthly cash flow in the appreciation scenario
              above. Get the appreciation forecast wrong and the deal is a real
              loss.
            </p>
            <p>
              With 30-year mortgage rates{" "}
              <a href={MORTGAGE30US_URL} className={SOURCE_LINK_CLASS}>
                averaging about 6.4% so far in 2026 (through Sept. 24) versus about
                4.5% in 2018
              </a>{" "}
              (Freddie Mac PMMS), cash flow deserves more weight than it did
              then. Today&apos;s rent and expenses can be checked before you buy;
              appreciation is a guess.
            </p>

            <h2>Which strategy fits you</h2>
            <p>Honest answers to honest questions:</p>
            <ul>
              <li>
                <strong>How long can you hold?</strong> Appreciation plays need a
                long hold to have a fair chance of outperforming. If you might
                need to sell within a few years, favor cash flow.
              </li>
              <li>
                <strong>Can you survive a forced sale?</strong> If a job loss or
                life event would force you to liquidate during a dip, appreciation
                strategies become dangerous. Cash flow gives you the option to
                wait it out.
              </li>
              <li>
                <strong>
                  Can you carry the property without relying on a tax result?
                </strong>{" "}
                <a href={IRS_PUB_527_URL} className={SOURCE_LINK_CLASS}>
                  Tax eligibility and loss timing are taxpayer-specific
                </a>
                . Base the operating decision on verified cash obligations, then
                review tax scenarios with an adviser.
              </li>
              <li>
                <strong>What&apos;s your conviction on the market?</strong> If you
                don&apos;t have a specific reason to believe Market X will
                appreciate, don&apos;t buy there as an appreciation play. Cash
                flow markets give you a deal that works even with 0% appreciation.
              </li>
            </ul>

            <h2>The hybrid sweet spot</h2>
            <p>
              The boring-but-right answer: look for properties whose current
              operating cash flow does not depend on an optimistic exit. Model
              principal paydown from the actual loan, treat appreciation as a
              scenario rather than a promise, and keep taxpayer-specific tax
              effects outside the property-level screen.
            </p>
            <p>
              Markets to test for that balance in 2026 include{" "}
              <Link
                href="/markets/atlanta"
                className="tc-link"
              >
                Atlanta
              </Link>
              ,{" "}
              <Link
                href="/markets/charlotte"
                className="tc-link"
              >
                Charlotte
              </Link>
              , and{" "}
              <Link
                href="/markets/tampa"
                className="tc-link"
              >
                Tampa
              </Link>
              . See each market&apos;s page for HUD Fair Market Rent (FY2026)
              benchmarks and a sample underwrite, and note that{" "}
              <a href={FHFA_METRO_HPI_URL} className={SOURCE_LINK_CLASS}>
                FHFA&apos;s house price index shows all three between about 0% and
                +2% over the year to mid-2026
              </a>
              .
            </p>
            <p>
              Picking that hybrid sweet spot deal requires actually computing all
              four return components for a specific property, in a specific
              market, at your specific financing — not just anchoring on a
              strategy.
            </p>

            <p>
              TrueCap screens pre-tax operating cash flow, loan coverage, and
              Buy Box fit. Appreciation, disposition, and tax outcomes
              require separate, explicitly sourced scenarios and professional
              advice where appropriate.
            </p>

          </ArticleBody>

          {/* faqLd above is the one FAQPage node for these rows. */}
          <FaqSection
            id="faq"
            variant="inline"
            heading="FAQ"
            items={FAQS}
            renderAnswer={(item) => <FaqAnswer answer={item.a} />}
            structuredData={false}
            contact={null}
          />
        </article>
        <PostSources
          sources={[
            {
              title:
                "Freddie Mac, Primary Mortgage Market Survey (30-year fixed-rate weekly average)",
              url: "https://www.freddiemac.com/pmms",
            },
            {
              title:
                "FHFA House Price Index, purchase-only, 100 largest metro areas (2026Q2 release)",
              url: "https://www.fhfa.gov/hpi/download/quarterly_datasets/hpi_po_metro.txt",
            },
            {
              title:
                "IRS Publication 527 (2025), Residential Rental Property",
              url: "https://www.irs.gov/publications/p527",
            },
            {
              title:
                "FHFA Purchase Only House Price Index for the United States, via FRED (HPIPONM226S)",
              url: "https://fred.stlouisfed.org/series/HPIPONM226S",
            },
            {
              title:
                "BLS Consumer Price Index for All Urban Consumers, via FRED (CPIAUCSL)",
              url: "https://fred.stlouisfed.org/series/CPIAUCSL",
            },
            {
              title:
                "Freddie Mac PMMS 30-Year Fixed Rate Mortgage Average in the United States, via FRED (MORTGAGE30US)",
              url: MORTGAGE30US_URL,
            },
            {
              title:
                "IRS Instructions for Form 8824 (2025), Like-Kind Exchanges",
              url: "https://www.irs.gov/instructions/i8824",
            },
          ]}
        />
        <RelatedContent kind="blog" slug={SLUG} title={TITLE} className="mt-10" />

        <RelatedBlogPosts currentSlug={SLUG} />

        <footer className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Related:{" "}
            <Link
              href="/blog/what-is-a-good-cap-rate"
              className="tc-link"
            >
              What&apos;s a good cap rate in 2026
            </Link>{" "}
            ·{" "}
            <Link
              href="/blog/cap-rate-vs-cash-on-cash-vs-dscr"
              className="tc-link"
            >
              Cap rate vs CoC vs DSCR
            </Link>{" "}
            ·{" "}
            <Link
              href="/glossary"
              className="tc-link"
            >
              Glossary
            </Link>
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
