/**
 * Blog post: The 1% rule for rental property — does it still work in 2026?
 *
 * Targets queries: "1% rule real estate", "1 percent rule rental
 * property", "what is the 1% rule", "does the 1% rule still work",
 * "1% rule calculator", "2% rule real estate", "rent to price ratio",
 * "1% rule vs 2% rule".
 *
 * Fills the obvious gap in the screening-metric cluster: the blog
 * already covers the 50% rule, GRM, cap rate, DSCR, and cash-on-cash,
 * but not one of the best-known rules of thumb in REI — and there is
 * a /tools/1-percent-rule-calculator begging for an explainer to link.
 */

import type { Metadata } from "next";
import Link from "next/link";
// The post's internal links prefetch on hover or keyboard focus
// (IntentPrefetchLink), not as they scroll into view; /analyze links stay
// next/link with prefetch={false}. A link the SEO loop adds is a plain <Link>,
// as its skills write it (lib/__tests__/intent-prefetch-shared.test.ts).
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
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
  LedgerFigure,
  LedgerVerdict,
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

const SLUG = "1-percent-rule-rental-property";
const TITLE = "The 1% rule for rental property: does it still work in 2026?";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "The 1% rule for rental property in 2026";
const DESCRIPTION =
  "The 1% rule says a rental's monthly rent should be at least 1% of its price. How it works, why 2026 rates thinned its cushion, and what it hides.";
const PUBLISHED_AT = "2026-06-23";
const MODIFIED_AT = lastmodFor("/blog/1-percent-rule-rental-property") ?? PUBLISHED_AT;
const READING_TIME = 10;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "1% rule real estate",
    "1 percent rule rental property",
    "what is the 1% rule",
    "does the 1% rule still work",
    "1% rule calculator",
    "2% rule real estate",
    "rent to price ratio",
    "1% rule vs 2% rule",
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
    q: "What is the 1% rule in real estate?",
    a: "The 1% rule is a screening shortcut that says a rental's gross monthly rent should be at least 1% of its purchase price. A $200,000 property would need to rent for $2,000/month to pass. Rearranged, it caps your price at 100 times the monthly rent. It is a triage filter, not an underwrite — it tells you which listings are worth a closer look, not whether a deal actually makes money once taxes, insurance, vacancy, and financing are in the picture.",
  },
  {
    q: "Does the 1% rule still work in 2026?",
    a: "As a quick filter, yes — but with two caveats. First, higher rates raised the bar: under this article's example assumptions (25% down, 1.2% tax, 0.6% insurance, 15% of rent set aside), a 7% loan breaks even at roughly 0.76% rent-to-price, versus about 0.57% at 3.5%, so a 1% deal cash-flows on a thinner margin than it used to. Second, 1% deals are hard to find in high-priced coastal and appreciation markets, where rents are a small fraction of home values. The rule still works as a screen, but passing it is no longer enough on its own.",
  },
  {
    q: "What's the difference between the 1% rule and the 2% rule?",
    a: "Same formula, higher bar. The 2% rule wants monthly rent of at least 2% of price — a $100,000 house renting for $2,000/month. In 2026 that is rare, and mostly limited to deep-discount, low-value, or heavy-management properties, and a listing that clears 2% usually signals a rough neighborhood, heavy capex, or a rent number that won't hold. A more useful habit is to treat 1% as the aspirational screen and anything above it as a flag to look harder, not a green light.",
  },
  {
    q: "Does the 1% rule use rent before or after expenses?",
    a: "Gross rent, before any expenses, against the purchase price. That is exactly why it can mislead: two properties can both hit 1% and throw off very different cash flow once you account for property tax (a state's median tax bill runs from about 0.3% of the median home value in Hawaii to about 1.9% in Illinois and New Jersey, per Census ACS 2024 data), insurance, HOA dues, and condition. For a fixer or BRRRR deal, use your all-in cost — price plus rehab — as the denominator, or the rule will flatter a property you haven't finished paying for.",
  },
  {
    q: "Is a property that fails the 1% rule always a bad deal?",
    a: "No. The 1% rule is blind to appreciation, rent growth, tax benefits, and below-market rents you can raise. Plenty of properties in strong appreciation markets fail the 1% rule and can still do well over a long hold on equity growth and forced appreciation. The rule is a cash-flow screen, so it's most useful when cash flow is your goal. If your thesis is appreciation or a value-add, run the full underwrite and don't let a single ratio veto the deal.",
  },
];

/** The one sourced FAQ figure with no earlier body link. It is a ratio of two
 *  Census ACS 2024 tables (B25103 median real estate taxes ÷ B25077 median
 *  value), so each input links to its own table where the answer renders and
 *  a reader can redo the division. The answer text itself is unchanged, so the
 *  visible answer and the FAQPage JSON-LD stay identical. */
const STATE_TAX_SOURCE_URL =
  "https://data.census.gov/api/access/data/table?id=ACSDT1Y2024.B25103&g=010XX00US$0400000";
const STATE_VALUE_SOURCE_URL =
  "https://data.census.gov/api/access/data/table?id=ACSDT1Y2024.B25077&g=010XX00US$0400000";
const STATE_TAX_SOURCE_PHRASE =
  "a state's median tax bill runs from about 0.3% of the median home value in Hawaii to about 1.9% in Illinois and New Jersey";
const STATE_TAX_LINK_TEXT = "a state's median tax bill";
const STATE_VALUE_LINK_TEXT = "the median home value";

function FaqAnswer({ answer }: { answer: string }) {
  const at = answer.indexOf(STATE_TAX_SOURCE_PHRASE);
  if (at < 0) return <>{answer}</>;
  const phrase = STATE_TAX_SOURCE_PHRASE;
  const valueAt = phrase.indexOf(STATE_VALUE_LINK_TEXT);
  return (
    <>
      {answer.slice(0, at)}
      <a
        href={STATE_TAX_SOURCE_URL}
        className="tc-link"
      >
        {STATE_TAX_LINK_TEXT}
      </a>
      {phrase.slice(STATE_TAX_LINK_TEXT.length, valueAt)}
      <a
        href={STATE_VALUE_SOURCE_URL}
        className="tc-link"
      >
        {STATE_VALUE_LINK_TEXT}
      </a>
      {phrase.slice(valueAt + STATE_VALUE_LINK_TEXT.length)}
      {answer.slice(at + phrase.length)}
    </>
  );
}

export default function OnePercentRulePost() {
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
    isPartOf: { "@id": `${siteUrl}/blog#blog` },
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
              <IntentPrefetchLink href="/blog" className={ARTICLE_META_LINK}>
                Blog
              </IntentPrefetchLink>{" "}
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
            <p className={ARTICLE_LEDE}>
              Glance at a listing price and a rent figure and you can screen a
              rental in about three seconds: is the monthly rent at least 1% of
              the purchase price? That is the 1% rule — one of the best-known
              rules of thumb in real estate investing, and a common first filter
              before anyone opens a spreadsheet. It is fast, it is famous, and
              in 2026 it is more contested than ever, because a fixed 1% bar
              doesn&apos;t move when rates do: Freddie Mac&apos;s 30-year fixed
              average was{" "}
              <a
                href="https://www.freddiemac.com/pmms"
                className="tc-link"
              >
                7.03% on Sept. 24, 2026
              </a>
              , more than double its{" "}
              <a
                href="https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE30US&fq=Annual&fam=avg"
                className="tc-link"
              >
                2.96% average for 2021
              </a>
              . Here is exactly how it works, what it quietly ignores, and how
              to use it without letting it talk you into a bad deal.
            </p>
          </header>

          <ArticleBody>
            <h2>What the 1% rule actually says</h2>
            <p>
              The rule is one division: take the gross monthly rent, divide by
              the purchase price, and check whether the result is 1% or more.
            </p>
            <p>
              <strong>Monthly rent ÷ purchase price ≥ 1%.</strong>
            </p>
            <p>
              Flip it around and it becomes a rule-of-thumb price screen:{" "}
              <strong>100 × the monthly rent</strong>. A house that rents for
              $1,800/month &quot;passes&quot; at any price up to $180,000; one
              that rents for $2,500 passes up to $250,000. That is the whole
              mechanic — no financing, no expenses, no condition. Which is the
              point: the 1% rule exists to kill obviously bad listings in
              seconds so you only spend real time on the survivors. Run a few
              through the{" "}
              <IntentPrefetchLink
                href="/tools/1-percent-rule-calculator"
                className="tc-link"
              >
                1% rule calculator
              </IntentPrefetchLink>{" "}
              and you&apos;ll feel how brutally fast the filter is.
            </p>

            <h2>A 60-second screen: three listings</h2>
            <p>
              Say you pull three properties off the MLS on a Saturday morning:
            </p>
            <ul>
              <li>
                <strong>Listing A</strong> — a $220,000 single-family home
                renting for $2,200/month. Ratio: $2,200 ÷ $220,000 ={" "}
                <strong><LedgerFigure>1.00%</LedgerFigure></strong>.{" "}
                <LedgerVerdict pass>Passes</LedgerVerdict>.
              </li>
              <li>
                <strong>Listing B</strong> — a $250,000 duplex pulling
                $2,600/month across both units. Ratio:{" "}
                <strong><LedgerFigure>1.04%</LedgerFigure></strong>.{" "}
                <LedgerVerdict pass>Passes</LedgerVerdict>.
              </li>
              <li>
                <strong>Listing C</strong> — a $350,000 house in a nicer suburb
                renting for $2,400/month. Ratio:{" "}
                <strong><LedgerFigure>0.69%</LedgerFigure></strong>.{" "}
                <LedgerVerdict pass={false}>Fails</LedgerVerdict>.
              </li>
            </ul>
            <p>
              Two pass, one fails, in under a minute and without a calculator
              app. Notice the pattern already forming: the cheaper, blue-collar
              properties clear the bar, and the pricier suburban house — the one
              that will probably appreciate fastest — doesn&apos;t come close.
              That tension between cash flow and appreciation is the rule&apos;s
              entire personality. The 1% rule is the opening move in the{" "}
              <IntentPrefetchLink
                href="/blog/how-to-underwrite-a-rental-property-in-60-seconds"
                className="tc-link"
              >
                60-second underwrite
              </IntentPrefetchLink>
              , not the closing argument.
            </p>

            <h2>Where the 1% comes from — it&apos;s really a rent-to-price ratio</h2>
            <p>
              The 1% threshold isn&apos;t magic; it&apos;s a proxy. The idea is
              that if gross rent is about 1% of price each month — 12% of price
              a year — there&apos;s usually enough income to cover the mortgage,
              taxes, insurance, vacancy, and repairs with a little left over,{" "}
              <em>as long as borrowing is cheap enough.</em>{" "}
              It is a rent-to-price ratio dressed up as a pass/fail test.
            </p>
            <p>
              That makes it a cousin of the{" "}
              <IntentPrefetchLink
                href="/blog/gross-rent-multiplier-explained"
                className="tc-link"
              >
                gross rent multiplier
              </IntentPrefetchLink>
              . Watch the algebra: if price = 100 × monthly rent, then price =
              100 ÷ 12 = <strong>8.3 × annual rent</strong>. So &quot;passes the
              1% rule&quot; is the same statement as &quot;has a gross rent
              multiplier of about 8.3 or lower.&quot; (The 100 is the price-to-
              {""}
              <em>monthly</em>-rent multiple; the GRM you&apos;ll see quoted
              uses annual rent, which is why the two numbers look so different.)
              If you prefer thinking in GRM, the{" "}
              <IntentPrefetchLink
                href="/tools/gross-rent-multiplier-calculator"
                className="tc-link"
              >
                GRM calculator
              </IntentPrefetchLink>{" "}
              gets you to the same screen from the other direction.
            </p>

            <h2>The 2026 problem: the bar quietly moved</h2>
            <p>
              Here is the part most &quot;1% rule&quot; articles skip. The rule
              uses a fixed yardstick — 1% — to measure something that moves with
              interest rates. When the cost of debt doubles, the rent-to-price
              ratio you need just to break even moves with it.
            </p>
            <p>
              Work it per $100,000 of price, with 25% down, taxes at 1.2%,
              insurance around 0.6% of value, and 15% of rent set aside for
              vacancy and reserves (self-managed, no property manager):
            </p>
            <ul>
              <li>
                <strong>At a 3.5% loan</strong> (about half a point above
                Freddie Mac&apos;s 2.96% average for owner-occupied loans in
                2021): principal and
                interest on the $75,000 borrowed run about $337/month, plus $150
                of taxes and insurance — roughly $487 of fixed carry. Cover that
                plus reserves and you break even at about{" "}
                <strong className="whitespace-nowrap">
                  <LedgerFigure>0.57%</LedgerFigure> rent-to-price
                </strong>
                .
              </li>
              <li>
                <strong>At a 7% loan</strong> (about Freddie Mac&apos;s 7.03%
                owner-occupied average on Sept. 24, 2026; investment-property
                loans also carry{" "}
                <a
                  href="https://guide.freddiemac.com/euf/assets/pdfs/Exhibit_19.pdf"
                  className="tc-link"
                >
                  an extra Freddie Mac credit fee, 2.125% of the loan at 70–75%
                  LTV
                </a>
                , so they cost more): P&amp;I on the same $75,000 jumps to about
                $499/month,
                plus the same $150 — about $649 of fixed carry. Break-even
                climbs to roughly{" "}
                <strong className="whitespace-nowrap">
                  <LedgerFigure>0.76%</LedgerFigure> rent-to-price
                </strong>
                .
              </li>
            </ul>
            <p>
              So the floor moved from ~0.57% to ~0.76% purely because rates
              changed. A property at the full 1% still cash-flows — but the
              cushion between &quot;passes the rule&quot; and &quot;loses
              money&quot; shrank from a comfortable 0.43 points to a thin 0.24.
              The deals that quietly broke in this shift are the 0.7–0.8%
              properties that gushed cash at 3.5% and now barely tread water.
              This is the same negative-leverage trap that makes a once-safe{" "}
              <IntentPrefetchLink
                href="/blog/what-is-a-good-cap-rate"
                className="tc-link"
              >
                cap rate look fine and still lose to the loan constant
              </IntentPrefetchLink>
              . The 1% rule didn&apos;t get wrong — the world underneath it
              moved, and the rule, being a fixed number, didn&apos;t notice.
            </p>

            <h2>Passing the 1% rule is not the same as a good return</h2>
            <p>
              Even when a property clears 1%, the rule says nothing about how
              good the return is — because it never looks at the costs that vary
              most between properties. Take two homes that both hit exactly 1%:
            </p>
            <ul>
              <li>
                <strong>Property X:</strong> $150,000, rents for $1,500/month,
                in a state with a 0.85% property-tax rate.
              </li>
              <li>
                <strong>Property Y:</strong> $300,000, rents for $3,000/month,
                in a state with a 1.8% property-tax rate.
              </li>
            </ul>
            <p>
              Both pass the screen identically. But underwrite them with 25%
              down at 7%, self-managed, with 5% vacancy and 10% for maintenance
              and capital reserves:
            </p>
            <ul>
              <li>
                <strong>Property X</strong> carries about $954 of PITI ($748
                P&amp;I + $106 taxes + $100 insurance) plus $225 of reserves —
                roughly $1,179 against $1,500 rent, or{" "}
                <strong className="whitespace-nowrap">
                  <LedgerFigure>+$321</LedgerFigure>/month
                </strong>
                . On about $42,000 all-in (down payment plus closing),
                that&apos;s a{" "}
                <strong className="whitespace-nowrap">
                  <LedgerFigure>~9%</LedgerFigure> cash-on-cash return
                </strong>
                .
              </li>
              <li>
                <strong>Property Y</strong> carries about $2,097 of PITI ($1,497
                P&amp;I + $450 taxes + $150 insurance) plus $450 of reserves —
                roughly $2,547 against $3,000 rent, or{" "}
                <strong className="whitespace-nowrap">
                  <LedgerFigure>+$453</LedgerFigure>/month
                </strong>
                . But on about $84,000 all-in, that is only a{" "}
                <strong className="whitespace-nowrap">
                  <LedgerFigure>~6.5%</LedgerFigure> cash-on-cash return
                </strong>
                .
              </li>
            </ul>
            <p>
              Same ratio, returns nearly 40% apart — driven mostly by a
              property-tax line the 1% rule never reads. That is why you finish
              the job with the metric that actually accounts for your cash:{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                cash-on-cash
              </Link>
              . If you&apos;re fuzzy on which metric answers which question, the
              guide on{" "}
              <IntentPrefetchLink
                href="/blog/cap-rate-vs-cash-on-cash-vs-dscr"
                className="tc-link"
              >
                cap rate vs cash-on-cash vs DSCR
              </IntentPrefetchLink>{" "}
              draws the lines.
            </p>

            <h2>What the rule ignores — both halves of the fraction</h2>
            <p>The numerator and the denominator both hide traps.</p>
            <p>
              <strong>
                The denominator should be all-in cost, not list price.
              </strong>{" "}
              On a fixer or a{" "}
              <IntentPrefetchLink
                href="/blog/brrrr-method-explained"
                className="tc-link"
              >
                BRRRR deal
              </IntentPrefetchLink>
              , a $120,000 house that needs $40,000 of work and then rents for
              $1,400 looks like a screaming 1.17% against the purchase price —
              but against your true $160,000 all-in, it&apos;s 0.875% and fails.
              Always run the rule on price plus rehab, or it will flatter a
              property you haven&apos;t finished paying for.
            </p>
            <p>
              <strong>
                The numerator should be real market rent, not the listing&apos;s
                hopeful number.
              </strong>{" "}
              Sellers and pro formas often quote rents above what the unit will
              actually fetch. Pull comps before you trust a rent
              figure, because a 10% haircut on rent drops a 1.0% property
              straight to 0.9%. And the rule is silent on everything that
              decides whether you keep that rent: condition, tenant quality,
              neighborhood trajectory, the interest rate on your specific loan,
              and how much you put down. A ratio can&apos;t see any of that.
            </p>

            <h2>1% vs 2% rule, and what&apos;s realistic in 2026</h2>
            <p>
              The 2% rule is the same test with the bar doubled: monthly rent of
              at least 2% of price — a $100,000 house renting for $2,000. In
              2026 that is rare outside deep-discount, low-value, or
              management-intensive properties. When a listing genuinely
              clears 2%, it&apos;s usually telling you something — a rough
              block, deferred capex, or a rent number that won&apos;t survive a
              real lease-up — not that you&apos;ve found a unicorn.
            </p>
            <p>
              Where do 1% deals actually live now? Mostly in lower-priced
              markets and price tiers, where rent is a larger share of the
              price. In coastal and high-growth metros (San Diego, Denver,
              Austin, Seattle), median monthly rent runs roughly 0.26–0.37% of
              median home value (Census ACS 2024{" "}
              <a
                href="https://data.census.gov/api/access/data/table?id=ACSDT1Y2024.B25064&g=010XX00US$3100000"
                className="tc-link"
              >
                median gross rent
              </a>{" "}
              divided by{" "}
              <a
                href="https://data.census.gov/api/access/data/table?id=ACSDT1Y2024.B25077&g=010XX00US$3100000"
                className="tc-link"
              >
                median value
              </a>
              ), and investors there are explicitly betting on appreciation
              rather than monthly cash flow. Neither
              approach is wrong; they&apos;re different games, and the 1% rule
              is only scoring one of them. If cash flow isn&apos;t your goal, a
              failing ratio isn&apos;t a verdict.
            </p>

            <h2>How to use the 1% rule without getting burned</h2>
            <p>
              Treat it as the first gate, not the decision. A practical
              workflow:
            </p>
            <ul>
              <li>
                <strong>Screen fast.</strong> Run the ratio on every listing. In
                2026&apos;s rate environment, give yourself margin — treat 1.0%
                as the floor for a cash-flow deal, not the target, since
                break-even in our example already sits near 0.76%.
              </li>
              <li>
                <strong>Use all-in cost and real rent.</strong> Price plus rehab
                on the bottom, comped market rent on top.
              </li>
              <li>
                <strong>Then actually underwrite the survivors.</strong> Layer
                in full PITI, vacancy, maintenance, capital reserves, and
                management, and check cash-on-cash and DSCR before you write an
                offer. A deal that passes the 1% rule and then clears a real
                underwrite is worth pursuing; one that passes only the ratio is
                worth a second look, not a check.
              </li>
            </ul>
            <p>
              That last step is the whole reason TrueCap exists. Drop in a price
              and a rent and the{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                free analyzer
              </Link>{" "}
              starts from a published rate benchmark and editable assumptions,
              asks you to enter a local tax bill or reviewed rate, layers in
              vacancy and reserves, and hands back cash flow, cap rate,
              cash-on-cash, DSCR, and Buy Box fit — the entire underwrite
              the 1% rule was only ever pretending to be a stand-in for. The
              rule is the napkin; this is the spreadsheet.
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

          <ArticleBody className="mt-16">
            <h2>The bottom line</h2>
            <p>
              The 1% rule earns its fame: it&apos;s the fastest honest screen in
              real estate, and on a cheap, cash-flow-market rental it still
              flags the right deals in seconds. But it&apos;s a rent-to-price
              ratio with a fixed threshold in a world where rates move, and in
              our example the break-even floor has crept up to roughly 0.76%
              at a 7% loan, leaving
              far less daylight between &quot;passes&quot; and
              &quot;bleeds.&quot; Use it to decide what to look at, never what
              to buy. Screen on all-in cost and real rent, then run the
              survivors through a full underwrite — PITI, reserves,{" "}
              <IntentPrefetchLink
                href="/blog/cap-rate-vs-cash-on-cash-vs-dscr"
                className="tc-link"
              >
                cash-on-cash, and DSCR
              </IntentPrefetchLink>{" "}
              — and the 1% rule goes back to doing the one job it&apos;s good
              at: getting you to a &quot;maybe&quot; fast.
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
              title: "FRED, 30-Year Fixed Rate Mortgage Average in the United States (MORTGAGE30US), annual averages (CSV download)",
              url: "https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE30US&fq=Annual&fam=avg",
            },
            {
              title: "Freddie Mac Seller/Servicer Guide, Exhibit 19: Credit Fees (Bulletin 2026-H)",
              url: "https://guide.freddiemac.com/euf/assets/pdfs/Exhibit_19.pdf",
            },
            {
              title: "U.S. Census Bureau, American Community Survey 2024 1-year, B25064 Median Gross Rent, metro areas",
              url: "https://data.census.gov/api/access/data/table?id=ACSDT1Y2024.B25064&g=010XX00US$3100000",
            },
            {
              title: "U.S. Census Bureau, American Community Survey 2024 1-year, B25077 Median Value (Dollars), metro areas",
              url: "https://data.census.gov/api/access/data/table?id=ACSDT1Y2024.B25077&g=010XX00US$3100000",
            },
            {
              title: "U.S. Census Bureau, American Community Survey 2024 1-year, B25103 Median Real Estate Taxes Paid, by state",
              url: "https://data.census.gov/api/access/data/table?id=ACSDT1Y2024.B25103&g=010XX00US$0400000",
            },
            {
              title: "U.S. Census Bureau, American Community Survey 2024 1-year, B25077 Median Value (Dollars), by state",
              url: "https://data.census.gov/api/access/data/table?id=ACSDT1Y2024.B25077&g=010XX00US$0400000",
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
