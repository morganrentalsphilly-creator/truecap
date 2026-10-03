/**
 * Blog post: how to estimate rent (market rent) on a rental property.
 *
 * Targets queries: "how to estimate rent on a rental property", "how
 * much rent can I charge", "how to estimate rental income", "rental
 * comps", "market rent estimate", "rent comparables", "how to find
 * rent comps", "fair market rent for my property".
 *
 * Sibling to "how-to-estimate-rehab-costs" — the other big input post.
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

const SLUG = "how-to-estimate-rent-rental-property";
const TITLE = "How to estimate rent on a rental property (2026)";
const DESCRIPTION =
  "Estimate market rent with a comp-adjustment grid, GRM and 1% cross-checks — and see what a $150/month rent miss does to cap rate, DSCR, and cash flow.";
const PUBLISHED_AT = "2026-06-25";
const MODIFIED_AT = lastmodFor("/blog/how-to-estimate-rent-rental-property") ?? PUBLISHED_AT;
const READING_TIME = 11;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "how to estimate rent on a rental property",
    "how much rent can I charge",
    "how to estimate rental income",
    "rental comps",
    "market rent estimate",
    "rent comparables",
    "how to find rent comps",
    "fair market rent",
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

const FAQS = [
  {
    q: "How do I estimate rent for a property I'm about to buy?",
    a: "Pull three to five recently leased comparables within roughly a mile — same property type, similar bedroom and bath count, similar size and condition — then adjust each one toward your subject for the differences (beds, baths, square footage, condition, parking, amenities). The adjusted comps should cluster within a tight band; the middle of that band is your market rent. Sanity-check it against the gross rent multiplier and the 1% rule, then underwrite the conservative end of the range, not the top.",
  },
  {
    q: "Should I use the rent the seller is already collecting?",
    a: "Only as a data point, not as your number. In-place rent can be below market (a long-term tenant who never got a raise) or above it (a sweetheart lease, or a pro forma the seller wrote to make the deal look better). Estimate market rent independently from leased comps, then compare it to in-place rent. If in-place is well under market, that's a value-add opportunity — but only if comps actually support the higher number and your lease lets you raise it.",
  },
  {
    q: "What's the difference between asking rent and leased rent?",
    a: "Asking rent is what a unit is listed for; leased rent is what it actually rented for. Listings that are still active are, by definition, units that haven't found a tenant yet — they skew high. Leased comps tell you what the market paid. When you can only see asking rents, shade them down a few percent and weight the listings that have been sitting the longest, because those are the ones priced above the market.",
  },
  {
    q: "How much does a wrong rent estimate actually cost?",
    a: "More than almost any other input. Rent sits at the top of every metric, so an error compounds through all of them. On a $250,000 single-family rental, overstating rent by $150/month (about 8%) lifts the cap rate by roughly 0.6 points, swings monthly cash flow by about $128, and lifts DSCR (NOI ÷ debt service) from 0.97 to 1.08. Measured as rent ÷ PITIA (principal, interest, taxes, insurance and association dues), coverage moves from 1.15 to 1.24 — enough to flip a deal from failing a hypothetical 1.20 lender minimum on that basis to passing it. Get rent wrong and every downstream number is wrong with it.",
  },
  {
    q: "Do online rent estimates (Rent Zestimate, Rentometer) work?",
    a: "They're a fine starting bracket and a terrible final answer. Automated estimates are built from broad data and can miss condition, exact location, layout, and recent concessions — the things that move rent most at the property level. Use them to frame a range in seconds, then confirm with real leased comps before you underwrite. Never type an automated estimate straight into your model as the rent.",
  },
];

export default function HowToEstimateRentPost() {
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
              Rent is the single most important number in a rental underwrite,
              and the easiest one to guess at. Every metric you care about —
              cap rate, cash-on-cash, DSCR, cash flow — is built on top of the
              rent figure, so a small error at the top compounds into a wrong
              answer at the bottom. Here&apos;s how to estimate market rent the way
              an appraiser would: pull comps, adjust them, cross-check the result,
              and underwrite the conservative end — with 2026 numbers showing
              exactly what a sloppy rent assumption costs.
            </p>
          </header>

          <ArticleBody>
            <h2>The number you&apos;re actually after</h2>
            <p>
              &quot;Rent&quot; hides three different numbers, and confusing them
              is the first mistake. <strong>In-place rent</strong> is what the
              current owner collects today — useful, but often stale or inflated.{" "}
              <strong>Market rent</strong> is what the unit would lease for today
              if it were vacant and listed — this is the number you underwrite a
              purchase on. <strong>Effective rent</strong> is market rent after
              you subtract the income you won&apos;t actually collect: vacancy,
              concessions, and non-payment. You estimate market rent first, then
              haircut it down to effective for the cash-flow model.
            </p>
            <p>
              Market context matters before you start. After the surge, national
              rent growth has cooled: the Census Bureau&apos;s{" "}
              <a
                href="https://www.census.gov/housing/hvs/data/histtab11.xlsx"
                className="tc-link"
              >
                median asking rent was $1,531 in Q2 2026
              </a>
              , about 2.5% above a year earlier, and the{" "}
              <a
                href="https://www.bls.gov/news.release/archives/cpi_09112026.htm"
                className="tc-link"
              >
                BLS consumer price index for rent of primary residence rose 2.7%
              </a>{" "}
              in the 12 months to August 2026. Advertised rents are up only
              modestly since 2024, when the Census Bureau&apos;s median asking
              rent was{" "}
              <a
                href="https://www.census.gov/housing/hvs/data/histtab11.xlsx"
                className="tc-link"
              >
                $1,486 for the year
              </a>
              . The takeaway for underwriting: do
              not assume the rent number keeps climbing. Estimate what the unit leases for{" "}
              <em>now</em>, and if your model needs aggressive rent growth to work,
              the deal probably doesn&apos;t.
            </p>

            <h2>The comp method, step by step</h2>
            <p>
              Estimating rent is the same exercise an appraiser runs for value:
              find comparable units, then adjust them toward your subject for the
              ways they differ. The goal is three to five solid comps whose
              adjusted rents land in a tight cluster.
            </p>
            <p>
              <strong>1. Pull recently leased comps, not active listings.</strong>{" "}
              An active listing is a unit that hasn&apos;t found a tenant yet — it
              tells you what someone is <em>asking</em>, not what the market{" "}
              <em>paid</em>. Leased comps (from a local agent&apos;s MLS access, a
              property manager, or rental sites that show de-listed units) are the
              gold standard. When you only have asking rents, shade them down a few
              percent and lean on the ones that leased fast.
            </p>
            <p>
              <strong>2. Keep comps tight on the things that matter.</strong> Aim
              for the same property type, the same bedroom count, similar bath
              count, within ~20% on square footage, the same submarket (ideally
              within a mile and the same school zone), and leased within the last
              90 days. A 3-bed comp two miles away that rented eight months ago is
              noise, not signal.
            </p>
            <p>
              <strong>3. Adjust each comp toward your subject.</strong> Add or
              subtract for concrete differences. Adjustment values are
              market-specific, so calibrate your own from local leases. For
              illustration, this guide uses about $75–$150 per bedroom, ~$75 per
              half-bath, roughly $0.30–$0.50 per square foot of living area, a
              $100–$200 premium for a recent renovation, and line items for
              garage, in-unit laundry, or a finished basement. The point isn&apos;t
              precision to the dollar — it&apos;s pulling each comp onto the same
              footing as your unit.
            </p>

            <h2>A worked adjustment grid</h2>
            <p>
              Say the subject is a 3-bed / 1.5-bath single-family house, 1,250
              square feet, average condition, no garage. Three leased comps in the
              same neighborhood:
            </p>

            <ArticleTable label="Data table">
              <table>
                <thead>
                  <tr>
                    <th>Comp</th>
                    <th>Beds / Baths</th>
                    <th>Sq ft</th>
                    <th>Condition</th>
                    <th className="text-right">Leased rent</th>
                    <th className="text-right">Net adj.</th>
                    <th className="text-right">Adjusted</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Subject</td>
                    <td>3 / 1.5</td>
                    <td>1,250</td>
                    <td>Average</td>
                    <td className="text-right">—</td>
                    <td className="text-right">—</td>
                    <td className="text-right">target</td>
                  </tr>
                  <tr>
                    <td>A</td>
                    <td>3 / 2</td>
                    <td>1,400</td>
                    <td>Average</td>
                    <td className="text-right">$2,050</td>
                    <td className="text-right">−$135</td>
                    <td className="text-right">$1,915</td>
                  </tr>
                  <tr>
                    <td>B</td>
                    <td>3 / 1</td>
                    <td>1,150</td>
                    <td>Average</td>
                    <td className="text-right">$1,800</td>
                    <td className="text-right">+$115</td>
                    <td className="text-right">$1,915</td>
                  </tr>
                  <tr>
                    <td>C</td>
                    <td>3 / 2</td>
                    <td>1,300</td>
                    <td>Renovated</td>
                    <td className="text-right">$2,150</td>
                    <td className="text-right">−$245</td>
                    <td className="text-right">$1,905</td>
                  </tr>
                </tbody>
              </table>
            </ArticleTable>

            <p>
              Walk through Comp A: it has an extra half-bath versus the subject
              (−$75) and 150 more square feet (−$60 at $0.40/sq ft), so it&apos;s
              adjusted down $135 to $1,915. Comp B has a half-bath fewer (+$75) and
              100 fewer square feet (+$40), adjusted up $115 to $1,915. Comp C
              carries the extra half-bath (−$75), 50 more square feet (−$20), and a
              renovation the subject doesn&apos;t have (−$150), adjusted down $245
              to $1,905. The adjusted comps cluster at <strong>$1,905–$1,915</strong>
              {" "}— a tight band — so market rent is about <strong>$1,910</strong>,
              and you&apos;d prudently underwrite <strong>$1,900</strong>.
            </p>

            <h2>Two fast cross-checks</h2>
            <p>
              Comps can mislead in a thin market, so bound your estimate with two
              ratios you can run in your head. The first is the{" "}
              <Link
                href="/blog/gross-rent-multiplier-explained"
                className="tc-link"
              >
                gross rent multiplier
              </Link>
              : price ÷ annual gross rent. At $1,900/month, a $250,000 house pencils
              to a GRM of $250,000 ÷ $22,800 = <strong>11.0</strong>. If similar
              houses in the area trade at a GRM of 9–11, your rent estimate is in
              the right zip code; if the implied GRM came out at 14, either the
              price is high or your rent is low. Reverse the same tool — plug in
              price and a market GRM — and you can solve for the rent the area
              implies with the{" "}
              <Link
                href="/tools/gross-rent-multiplier-calculator"
                className="tc-link"
              >
                GRM calculator
              </Link>
              .
            </p>
            <p>
              The second is the{" "}
              <Link
                href="/blog/1-percent-rule-rental-property"
                className="tc-link"
              >
                1% rule
              </Link>
              : monthly rent as a share of price. $1,900 on $250,000 is{" "}
              <strong>0.76%</strong> — below the classic 1% bar, which is normal
              in 2026. As a rough national comparison, the Census Bureau&apos;s
              Q2 2026 median asking rent ($1,531) is{" "}
              <a
                href="https://www.census.gov/housing/hvs/data/histtab11.xlsx"
                className="tc-link"
              >
                about 0.45% of its median asking sales price ($343,800)
              </a>
              . Sub-1% ratios are also why higher financing costs have made cash
              flow harder to find: Freddie Mac&apos;s 30-year fixed average was{" "}
              <a
                href="https://fred.stlouisfed.org/series/MORTGAGE30US"
                className="tc-link"
              >
                7.03% for the week of Sept. 24, 2026, against a 2021 average of
                about 2.96%
              </a>
              . The 1% rule won&apos;t price your rent, but if
              your comp-derived rent implies something wild — 1.6% of price, say —
              that&apos;s a flag to recheck your comps before you celebrate.
            </p>

            <h2>From market rent to effective rent</h2>
            <p>
              Market rent is the gross number. The model needs effective rent — what
              you actually collect after the income that leaks out. Two haircuts:
            </p>
            <ul>
              <li>
                <strong>Vacancy.</strong> Even a well-run single-family rental
                turns over, and turnover costs you weeks of rent plus make-ready.
                A 5% vacancy assumption on $1,900 is about $95/month; whether 5% is
                right for your market is its own question, covered in{" "}
                <Link
                  href="/blog/vacancy-rate-rental-property"
                  className="tc-link"
                >
                  what vacancy rate to assume
                </Link>
                .
              </li>
              <li>
                <strong>Concessions and non-payment.</strong> If the market is soft
                and comps are offering &quot;one month free,&quot; that&apos;s an
                8% discount on a 12-month lease that the headline rent hides. Build
                a small allowance for it.
              </li>
            </ul>
            <p>
              On the example, $1,900 gross at 5% vacancy is roughly{" "}
              <strong>$1,805</strong> of effective rent before operating expenses —
              and that effective number, not the gross, is what flows into{" "}
              <Link
                href="/blog/how-to-calculate-noi-rental-property"
                className="tc-link"
              >
                net operating income
              </Link>{" "}
              and the rest of the underwrite.
            </p>

            <h2>Why a $150 rent miss is so expensive</h2>
            <p>
              Here&apos;s the part that makes rent worth getting right. Because rent
              sits at the top of the stack, a small error ripples through every
              metric. Take the same $250,000 house — 25% down, $187,500 financed at
              7% (close to Freddie Mac&apos;s{" "}
              <a
                href="https://fred.stlouisfed.org/series/MORTGAGE30US"
                className="tc-link"
              >
                30-year fixed average of 7.03% for the week of Sept. 24, 2026
              </a>
              ; about $1,247/month principal and interest), $250/month taxes,
              $150/month insurance, 5% vacancy, and 10% of rent set aside for
              maintenance and other operating costs — and compare an honest
              $1,900 market rent against a too-optimistic $2,050. That&apos;s a
              $150/month gap, only about 8%:
            </p>

            <ArticleTable label="Data table">
              <table>
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th className="text-right">Rent $1,900 (honest)</th>
                    <th className="text-right">Rent $2,050 (optimistic)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Annual NOI</td>
                    <td className="text-right">$14,580</td>
                    <td className="text-right">$16,110</td>
                  </tr>
                  <tr>
                    <td>Cap rate</td>
                    <td className="text-right">5.8%</td>
                    <td className="text-right">6.4%</td>
                  </tr>
                  <tr>
                    <td>Monthly cash flow</td>
                    <td className="text-right">−$32</td>
                    <td className="text-right">+$95</td>
                  </tr>
                  <tr>
                    <td>DSCR (NOI ÷ debt service)</td>
                    <td className="text-right">0.97</td>
                    <td className="text-right">1.08</td>
                  </tr>
                  <tr>
                    <td>Rent ÷ PITIA ($1,647/month)</td>
                    <td className="text-right">1.15</td>
                    <td className="text-right">1.24</td>
                  </tr>
                </tbody>
              </table>
            </ArticleTable>

            <p>
              An 8% rent error moves the cap rate by about 0.6 points, swings
              monthly cash flow by roughly $128 — from a small loss to a real
              profit — and lifts{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                DSCR
              </Link>{" "}
              (NOI ÷ debt service, the measure TrueCap reports) from 0.97 to
              1.08.{" "}
              <Link
                href="/blog/how-to-calculate-dscr"
                className="tc-link"
              >
                Some DSCR loan programs
              </Link>{" "}
              instead divide gross rent by PITIA (principal, interest, taxes,
              insurance and association dues; $1,647 a month here, with no
              association dues on this house), and on that basis the same $150 lifts
              coverage from 1.15 to 1.24. That matters beyond the spreadsheet:
              DSCR lenders set their own minimums, so get yours in writing. At a
              1.20 minimum on a rent ÷ PITIA basis, the honest rent{" "}
              <em>fails</em> the loan and the optimistic rent <em>passes</em>.
              Inflating the rent doesn&apos;t just flatter your returns — it can
              manufacture a loan approval the property can&apos;t actually support.
              This is also why seller pro formas lean high; the{" "}
              <Link
                href="/blog/rental-property-pro-forma-explained"
                className="tc-link"
              >
                seven lies in a pro forma
              </Link>{" "}
              almost always start with the rent line.
            </p>

            <h2>Special cases worth a second look</h2>
            <p>
              <strong>Section 8: rent reasonableness and FMR.</strong> If
              you&apos;re renting to a voucher tenant, the housing authority must
              find your rent{" "}
              <a
                href="https://www.ecfr.gov/current/title-24/subtitle-B/chapter-IX/part-982/subpart-K/section-982.507"
                className="tc-link"
              >
                reasonable against comparable unassisted units
              </a>
              . Its{" "}
              <a
                href="https://www.ecfr.gov/current/title-24/subtitle-B/chapter-IX/part-982/subpart-K/section-982.503"
                className="tc-link"
              >
                payment standard, generally 90% to 110% of HUD&apos;s Fair Market
                Rent
              </a>
              , caps the subsidy, not your rent. The tenant covers any gap, but
              at initial lease-up{" "}
              <a
                href="https://www.ecfr.gov/current/title-24/subtitle-B/chapter-IX/part-982/subpart-K/section-982.508"
                className="tc-link"
              >
                their share can&apos;t exceed 40% of adjusted monthly income
              </a>
              . HUD sets Fair Market Rent at the{" "}
              <a
                href="https://www.ecfr.gov/current/title-24/subtitle-B/chapter-VIII/part-888/subpart-A/section-888.113"
                className="tc-link"
              >
                40th-percentile gross rent (rent plus utilities) for
                standard-quality units across the area
              </a>
              , so it can sit above or below open-market rent depending on the
              neighborhood; compare it with your rent plus any utilities the
              tenant pays. That makes FMR a second benchmark you have to check;
              the mechanics are in{" "}
              <Link
                href="/blog/section-8-rental-property-investing"
                className="tc-link"
              >
                how Section 8 math works
              </Link>
              .
            </p>
            <p>
              <strong>Multi-family.</strong> Estimate rent per unit, by unit type
              (a 2-bed comps against 2-beds, not against the building&apos;s
              average). Watch for in-place rents that are all suspiciously
              uniform — a sign of long-tenured renters below market, which is either
              upside or a tenant-relations headache depending on your local laws.
            </p>
            <p>
              <strong>Value-add and &quot;I&apos;ll renovate it.&quot;</strong> A
              higher post-rehab rent is only real if renovated comps support it.
              &quot;It rents for $1,900 now but I&apos;ll get $2,300 after a
              kitchen&quot; needs a $2,300 renovated comp behind it — otherwise
              it&apos;s a wish, not an estimate.
            </p>

            <h2>A repeatable workflow</h2>
            <p>
              Put it together and the process is fast once you&apos;ve done it a few
              times: pull three to five leased comps within a mile and 90 days,
              adjust each toward your subject for beds, baths, size, and condition,
              take the middle of the adjusted cluster as market rent, cross-check it
              against GRM and the 1% rule, then haircut for vacancy and concessions
              to get the effective rent your model uses. Underwrite the conservative
              end of the range — if the deal only works at the top of your rent
              estimate, you don&apos;t have much of a deal.
            </p>
            <p>
              The full{" "}
              <Link href="/analyze" prefetch={false} className="tc-link">
                TrueCap analyzer
              </Link>{" "}
              does the first pass for you: enter the address and, if the rent
              field is blank, it fills in HUD&apos;s Fair Market Rent as a
              labeled placeholder rent (when an address has no county match,
              a statewide HUD figure, labeled as such), layers in
              vacancy and reserves, and returns cap rate, cash flow, DSCR, and a
              Buy Box fit in one pass. Replace that placeholder with the rent
              your comps support, and the comp work sets your number instead of
              filling a blank box you have to guess at.
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
              Rent is the input everything else leans on, so it deserves more than a
              glance at the listing. Estimate market rent from recently leased comps,
              adjust them onto the same footing as your unit, bound the result with
              GRM and the 1% rule, and step it down to effective rent before it hits
              the model. Then underwrite the conservative number — because as the
              $150 example shows, the gap between an honest rent and a hopeful one is
              the gap between a deal that cash flows and clears a lender&apos;s
              minimum and one that only looks like it does. Get rent right and the rest
              of the underwrite — cap rate, DSCR, cash flow — finally tells you the
              truth.
            </p>
          </ArticleBody>
        </article>
        <PostSources
          sources={[
            {
              title:
                "U.S. Census Bureau, Housing Vacancy Survey, Tables 11A and 11B: Median Asking Rent and Median Asking Sales Price (release of July 28, 2026)",
              url: "https://www.census.gov/housing/hvs/data/histtab11.xlsx",
            },
            {
              title:
                "U.S. Bureau of Labor Statistics, Consumer Price Index – August 2026 news release (Sept. 11, 2026), Table 2",
              url: "https://www.bls.gov/news.release/archives/cpi_09112026.htm",
            },
            {
              title:
                "FRED, 30-Year Fixed Rate Mortgage Average in the United States (MORTGAGE30US), from Freddie Mac's Primary Mortgage Market Survey",
              url: "https://fred.stlouisfed.org/series/MORTGAGE30US",
            },
            {
              title: "24 CFR 982.507, Rent to owner: Reasonable rent (eCFR)",
              url: "https://www.ecfr.gov/current/title-24/subtitle-B/chapter-IX/part-982/subpart-K/section-982.507",
            },
            {
              title:
                "24 CFR 982.503, Payment standard areas, schedule, and amounts (eCFR)",
              url: "https://www.ecfr.gov/current/title-24/subtitle-B/chapter-IX/part-982/subpart-K/section-982.503",
            },
            {
              title:
                "24 CFR 982.508, Maximum family share at initial occupancy (eCFR)",
              url: "https://www.ecfr.gov/current/title-24/subtitle-B/chapter-IX/part-982/subpart-K/section-982.508",
            },
            {
              title:
                "24 CFR 888.113, Fair market rents for existing housing: Methodology (eCFR)",
              url: "https://www.ecfr.gov/current/title-24/subtitle-B/chapter-VIII/part-888/subpart-A/section-888.113",
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
