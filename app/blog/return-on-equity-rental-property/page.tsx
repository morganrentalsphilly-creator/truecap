/**
 * Blog post: return on equity (ROE) for a rental property, and the
 * "lazy equity" decision it drives (refinance / 1031 / sell).
 *
 * Targets queries: "return on equity rental property", "ROE real
 * estate", "lazy equity", "return on equity vs cash on cash",
 * "how to calculate return on equity real estate", "when to refinance
 * rental to buy another", "is my equity working".
 *
 * Distinct from every existing post: cash-on-cash (fixed cost basis),
 * cap rate (unlevered, on price), DSCR (coverage). ROE puts today's
 * market equity in the denominator and watches it decay as leverage
 * falls — the mechanism most "lazy equity" articles assert but never show.
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
  ToolFormula,
  UnderTitleAnalyzeLink,
} from "@/components/marketing/article";
import { BlogByline } from "@/components/marketing/blog-byline";
import { FaqSection } from "@/components/marketing/faq-section";
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

const SLUG = "return-on-equity-rental-property";
const TITLE =
  "Return on equity (ROE) on a rental property: the lazy-equity test (2026)";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Return on equity (ROE) on a rental property";
const DESCRIPTION =
  "Return on equity is what the equity trapped in a rental earns today, not the cash you put in. The formula, a 10-year decay example, and the refi test.";
const PUBLISHED_AT = "2026-07-01";
const MODIFIED_AT = lastmodFor("/blog/return-on-equity-rental-property") ?? PUBLISHED_AT;
const READING_TIME = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "return on equity rental property",
    "ROE real estate",
    "lazy equity",
    "return on equity vs cash on cash",
    "how to calculate return on equity real estate",
    "when to refinance rental to buy another",
    "return on equity formula real estate",
    "is my equity working rental",
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
    q: "What is return on equity (ROE) on a rental property?",
    a: "Return on equity is your total annual return divided by the equity you currently have in the property. Total return usually counts three things: pre-tax cash flow, the principal you pay down on the mortgage that year, and appreciation. Equity is today's market value minus today's loan balance — not the cash you originally invested. So ROE answers 'what is the money currently locked in this property earning me right now?' rather than 'what did my original down payment earn?'",
  },
  {
    q: "How is return on equity different from cash-on-cash return?",
    a: "They share a numerator idea but use completely different denominators. Cash-on-cash return divides a year's cash flow by the cash you originally invested — a fixed number anchored to the day you bought. Return on equity divides the year's total return (cash flow plus paydown plus appreciation) by your equity today, a denominator that grows every year as you pay down the loan and the property appreciates. Early on the two are close because your equity roughly equals your cash in. Ten years later your cash-on-cash still measures against your original down payment while your ROE measures against a much larger equity base — which is why ROE falls over time even as the dollars grow.",
  },
  {
    q: "Why does return on equity decline over time?",
    a: "Because equity compounds faster than the return does. The biggest driver is leverage: early on your equity is a thin slice of the property's value, so a 3% gain on the whole asset is a large percentage return on that slice. As you pay down the loan and the property appreciates, your equity becomes a bigger share of value, and that same 3% appreciation is spread over more equity — so the appreciation component of ROE falls toward the raw appreciation rate. Strip appreciation out and ROE is roughly flat; include it and ROE drifts down as your leverage falls.",
  },
  {
    q: "What is a good return on equity for a rental?",
    a: "There's no standard threshold, because the right benchmark is your opportunity cost — what the same equity could earn if you moved it. Compare the equity's current return, both total and cash-only, with what the same dollars could earn elsewhere. The test is comparison, not an absolute: if a fresh deal or a redeployment would earn meaningfully more on the same dollars, your current equity is getting lazy.",
  },
  {
    q: "Should I refinance or sell just because ROE dropped?",
    a: "Not automatically. A falling ROE flags that your equity may be underworked, but pulling it out has real costs. A cash-out refinance resets your entire loan to today's rate, so trading a 4% legacy mortgage for a 7% one can cost more than the lazy equity was costing you. Appreciation is also a paper assumption, not a promise — an ROE that leans mostly on projected appreciation is softer than one built on cash flow and paydown. Treat ROE as the metric that starts the refinance-versus-hold conversation, then run the actual after-cost numbers before you move.",
  },
];

export default function ReturnOnEquityPost() {
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
    author: { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: "TrueCap", url: siteUrl },
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntityOfPage: canonicalUrl,
    image: [`${siteUrl}/home.jpg`],
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "TrueCap", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
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
              It&apos;s easy to track the return on the cash you put in the day
              you bought and never revisit it. But a rental you have owned for
              years isn&apos;t financed by that old down payment anymore — it is
              financed by the equity sitting in it <em>today</em>, which has
              quietly grown into a much larger number. Return on equity asks the
              question cash-on-cash stops answering: what is that trapped equity
              actually earning right now? It is the metric behind every
              &quot;should I refinance and buy another?&quot; decision, and in a
              2026 market of high prices and mortgage rates near 7% (Freddie
              Mac&apos;s 30-year fixed average was{" "}
              <a
                href="https://www.freddiemac.com/pmms"
                className="tc-link"
              >
                7.03% on Sept. 24, 2026
              </a>
              ), it is where a lot of paper-rich portfolios turn out to be
              cash-poor.
            </p>
          </header>

          <ArticleBody>
            <h2>The formula</h2>
            <p>
              Return on equity divides the total return a property throws off in
              a year by the equity you have in it at the start of that year:
            </p>
            <ToolFormula formula="ROE = (Cash flow + Principal paydown + Appreciation) ÷ Current equity" />
            <p>
              Two of those pieces are easy to miss.{" "}
              <strong>Principal paydown</strong> is the slice of each mortgage
              payment that goes to principal rather than interest — real return,
              because it is your loan balance shrinking, not the bank&apos;s.{" "}
              <strong>Appreciation</strong> is the year&apos;s change in market
              value. And the denominator is the part people get wrong:{" "}
              <strong>current equity is today&apos;s market value minus
              today&apos;s loan balance</strong> — not the down payment you wrote
              years ago. That distinction is the entire point of the metric. Your
              original cash is spent and gone; the relevant question is what the
              equity you could pull out or redeploy <em>today</em> is earning if
              you leave it where it is.
            </p>
            <p>
              You will see two flavors. <strong>Total ROE</strong> includes
              appreciation. <strong>Hard ROE</strong> counts only cash flow plus
              paydown — the return you can bank without selling or betting on the
              market. Conservative investors watch the hard number; the two
              together tell you how much of your return is real and how much is a
              forecast.
            </p>

            <h2>ROE vs cash-on-cash: same idea, different denominator</h2>
            <p>
              This is the confusion worth clearing first, because the two metrics
              look almost identical in year one and then diverge completely.{" "}
              <Link
                href="/blog/how-to-calculate-cash-on-cash-return"
                className="tc-link"
              >
                Cash-on-cash return
              </Link>{" "}
              divides a year&apos;s cash flow by the cash you originally invested
              — a denominator frozen on closing day. Return on equity divides the
              year&apos;s <em>total</em> return by your equity <em>today</em> — a
              denominator that grows every year. Early on they roughly agree,
              because your equity is close to the cash you put in. But cash-on-cash
              stays anchored to that first check forever, while ROE&apos;s
              denominator balloons as you pay down the loan and prices rise. Ten
              years in, cash-on-cash is still congratulating you on your old down
              payment while ROE is asking a harder question about a much bigger
              pile of money. Cap rate, for its part, ignores financing entirely —
              it measures the unlevered yield on price. ROE is the only one of the
              three that tracks the return on the equity you could actually move.
            </p>

            <h2>A worked example: the deal that gets lazy</h2>
            <p>
              Take a $250,000 single-family rental, 25% down ($62,500), financing
              $187,500 at 7% over 30 years. Principal and interest run about
              $1,247 a month, or $14,969 a year (check it on the{" "}
              <Link
                href="/tools/mortgage-payment-calculator"
                className="tc-link"
              >
                mortgage payment calculator
              </Link>
              ). It rents for $2,350 a month, and after vacancy and operating
              expenses{" "}
              <Link
                href="/blog/how-to-calculate-noi-rental-property"
                className="tc-link"
              >
                net operating income
              </Link>{" "}
              lands at about $16,100 — a 6.4% cap rate and a 1.08 DSCR. Cash flow
              is thin: roughly $1,130 a year, about $94 a month, for a first-year{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                cash-on-cash return
              </Link>{" "}
              of 1.6% on the $70,000 all-in (down payment plus $7,500 closing).
              Not exciting on cash alone. But cash isn&apos;t the whole return.
            </p>
            <p>
              Assume the property appreciates 3% a year and rents (and expenses)
              also rise about 3% a year. In year one, the total return is not the
              $1,130 of cash flow — it is cash flow{" "}
              <strong>plus</strong> about $1,905 of principal paydown{" "}
              <strong>plus</strong> $7,500 of appreciation, for a total of roughly
              $10,535. Against year-one equity of $62,500 (the $250,000 value
              minus the $187,500 loan), that is a{" "}
              <strong>total ROE of 16.9%</strong>. The thin-cash-flow deal is
              earning far more than its cash flow suggests — because most of its
              return is leverage amplifying a modest appreciation rate on a thin equity slice. Now
              watch what happens as that slice thickens:
            </p>

            <ArticleTable label="Data table">
              <table>
                <thead>
                  <tr>
                    <th>Start of year</th>
                    <th className="text-right">Market value</th>
                    <th className="text-right">Your equity</th>
                    <th className="text-right">Total return</th>
                    <th className="text-right">ROE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Year 1</td>
                    <td className="text-right">$250,000</td>
                    <td className="text-right">$62,500</td>
                    <td className="text-right">$10,535</td>
                    <td className="text-right">
                      <strong>16.9%</strong>
                    </td>
                  </tr>
                  <tr>
                    <td>Year 5</td>
                    <td className="text-right">$281,400</td>
                    <td className="text-right">$102,400</td>
                    <td className="text-right">$14,110</td>
                    <td className="text-right">
                      <strong>13.8%</strong>
                    </td>
                  </tr>
                  <tr>
                    <td>Year 10</td>
                    <td className="text-right">$326,200</td>
                    <td className="text-right">$161,700</td>
                    <td className="text-right">$19,390</td>
                    <td className="text-right">
                      <strong>12.0%</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </ArticleTable>

            <p>
              Look at what the table is doing. The dollar return nearly doubles —
              from $10,535 to $19,390 — because cash flow, paydown, and
              appreciation all grow. And yet ROE <em>falls</em>, from 16.9% to
              12.0%. The property is earning more money and a lower return at the
              same time, because your equity grew even faster: from $62,500 to
              $161,700, more than 2.5x. That gap between a rising dollar return and
              a falling percentage return is exactly what &quot;lazy equity&quot;
              means. Nothing went wrong with the property. The equity just piled up
              faster than the property could put it to work.
            </p>

            <h2>What actually drives the decay</h2>
            <p>
              The engine is leverage, and it is worth seeing precisely. Split the
              return into its cash-and-paydown part and its appreciation part.
              Strip appreciation out and the &quot;hard&quot; ROE — cash flow plus
              paydown over equity — is roughly flat across the decade, drifting
              from about 4.9% to 5.9%. It barely moves. So the entire decline in
              total ROE lives in the <strong>appreciation term</strong>. In year
              one, $7,500 of appreciation against $62,500 of equity is a 12%
              return on your equity — because a 3% gain on the whole $250,000 asset
              is hugely amplified by the thin equity underneath it. By year ten,
              $9,790 of appreciation against $161,700 of equity is only 6%. The
              appreciation is larger in dollars but far smaller as a return,
              because your equity is now half the asset&apos;s value instead of a
              quarter — the leverage that amplified it has faded.
            </p>
            <p>
              This is the same force behind{" "}
              <Link
                href="/blog/negative-leverage-real-estate"
                className="tc-link"
              >
                negative leverage
              </Link>
              , viewed from the other end. Leverage amplifies returns in both
              directions and at every stage of ownership; as you de-lever by paying
              the loan down, you give up the amplification. That is not an argument
              against paying down debt — it is a reminder that a low-leverage,
              high-equity rental behaves more like a bond and less like the
              leveraged bet you originally made.
            </p>

            <h2>The number that should worry you: cash-on-equity</h2>
            <p>
              Total ROE still looks respectable at 12% in year ten, but a big share
              of that is paper appreciation and forced savings, not money in your
              pocket. Isolate the spendable part — cash flow divided by current
              equity — and the picture sharpens. In year one it is $1,130 on
              $62,500, about 1.8%. By year ten it is $6,040 on $161,700, about
              3.7%. So $161,700 of real, extractable equity is producing under
              four cents of actual cash per dollar per year. Whether 3.7% is
              enough depends on what the same money could earn elsewhere — which
              is the whole reason the &quot;lazy equity&quot; conversation exists. The
              equity is safe and it is growing, but as a cash-producing asset it
              has gone slack.
            </p>

            <h2>The decision ROE surfaces — and its honest cost</h2>
            <p>
              A declining ROE is a prompt, not a verdict. It tells you the equity
              in this property may be underemployed, which points at three moves:
              refinance and pull cash out to redeploy, sell and{" "}
              <Link
                href="/blog/1031-exchange-basics"
                className="tc-link"
              >
                1031 exchange
              </Link>{" "}
              into something with more upside, or do nothing on purpose. Run the
              redeployment math on our example. At year ten you hold $161,700 of
              equity; a cash-out refinance to{" "}
              <a
                href="https://sf.freddiemac.com/general/maximum-ltv-tltv-htltv-ratio-requirements-for-conforming-and-super-conforming-mortgages"
                className="tc-link"
              >
                75%
              </a>{" "}
              of the $326,200 value is a new $244,600 loan, and after retiring
              the $164,500 balance you free up roughly $80,000 before the
              refinance&apos;s own closing costs — enough to be the 25%-plus down payment on another
              $250,000-ish rental that starts its own life at a high-teens ROE. On
              paper, splitting one lazy pile of equity into two working piles lifts
              your blended return.
            </p>
            <p>
              Now the honest cost, because this is where the math bites back. A
              cash-out refinance resets your <em>entire</em> loan to today&apos;s
              rate. If the property carries an old 4% mortgage, refinancing the
              whole balance to 7% to extract equity can cost more in added interest
              than the lazy equity was ever costing you — the exact trap covered in{" "}
              <Link
                href="/blog/cash-out-refinance-vs-heloc-rental"
                className="tc-link"
              >
                cash-out refinance vs HELOC
              </Link>
              , where a second-lien HELOC that leaves the cheap first mortgage
              untouched is often the better tool. And total ROE leans on
              appreciation you are <em>assuming</em>: a 12% ROE that is mostly a 3%
              price-growth forecast is far softer than a 12% built on cash flow and
              paydown. The discipline is to read ROE as the signal that starts the
              conversation, then price the move — new rate, closing costs, taxes,
              the return on the freed capital — before you act. The full{" "}
              <Link
                href="/blog/how-to-refinance-a-rental-property"
                className="tc-link"
              >
                refinance walkthrough
              </Link>{" "}
              covers how to run that comparison.
            </p>
            <p>
              One more honest adjustment: you can never redeploy all of your
              equity. A cash-out refinance typically caps at{" "}
              <a
                href="https://sf.freddiemac.com/general/maximum-ltv-tltv-htltv-ratio-requirements-for-conforming-and-super-conforming-mortgages"
                className="tc-link"
              >
                75% loan-to-value on a one-unit investment property (70% for two
                to four units)
              </a>
              , and a sale surrenders a meaningful slice to commissions and
              closing costs — so the equity you can actually move
              is meaningfully smaller than the book figure sitting in your ROE
              denominator. On our example, $161,700 of book equity translates to
              about $80,000 of extractable cash through a refinance, before that
              refinance&apos;s own closing costs. That
              does not change the direction ROE points, but it shrinks the size of
              the move, and it is why a small ROE gap rarely justifies the friction
              of a refinance or sale on its own — the edge has to clear the cost of
              getting the money out.
            </p>

            <h2>How to actually use it</h2>
            <p>
              Compute ROE once a year on every property you own, not just at
              purchase. Pull today&apos;s realistic market value, subtract your
              current loan balance to get equity, then add up this year&apos;s cash
              flow, principal paydown (your amortization schedule has it), and a
              conservative appreciation figure. Divide and you have total ROE; drop
              appreciation for the hard number. Then compare that result to your
              opportunity cost — what a fresh deal, the stock market, or simply
              paying down higher-rate debt would earn on the same dollars.
            </p>
            <p>
              There&apos;s no standard threshold for a good ROE: compare the
              equity&apos;s current return, both total and cash-only, with what
              the same dollars could earn elsewhere, and when the gap is wide,
              model a refinance or sale before you decide anything. Two caveats
              keep the number honest. First, ROE
              ignores timing and the eventual sale, so for a hold-or-sell call over
              many years,{" "}
              <Link
                href="/blog/cash-on-cash-vs-irr"
                className="tc-link"
              >
                IRR
              </Link>{" "}
              is the more complete metric — ROE is the fast annual read. Second, it
              is only as good as your value estimate; anchor it to real comps or a
              broker&apos;s opinion, not the number that flatters the deal.
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

          <ArticleBody className="mt-16">
            <h2>The bottom line</h2>
            <p>
              Cash-on-cash return tells you how your original down payment is
              doing; return on equity tells you how the equity you hold{" "}
              <em>today</em> is doing — and for a property you have owned a while,
              only the second one drives real decisions. The equity in a rental
              compounds faster than the rental&apos;s income does, so ROE drifts
              down even as the dollars climb, and a growing share of your return
              quietly becomes paper appreciation rather than spendable cash. That
              is the signal to check whether your equity is still working or just
              sitting. The full{" "}
              <Link href="/analyze" prefetch={false} className="tc-link">
                TrueCap analyzer
              </Link>{" "}
              runs cash flow, cap rate, DSCR, and multi-year projections on any
              property in seconds — so whether you are underwriting a new deal or
              deciding what to do with the equity in an old one, you can see the
              return on the dollars that are actually at work.
            </p>
          </ArticleBody>
        </article>
        <PostSources
          sources={[
            {
              title: "Freddie Mac, Primary Mortgage Market Survey (30-year fixed average, week of Sept. 24, 2026)",
              url: "https://www.freddiemac.com/pmms",
            },
            {
              title: "Freddie Mac, Maximum LTV/TLTV/HTLTV Ratio Requirements for Conforming and Super Conforming Mortgages",
              url: "https://sf.freddiemac.com/general/maximum-ltv-tltv-htltv-ratio-requirements-for-conforming-and-super-conforming-mortgages",
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
