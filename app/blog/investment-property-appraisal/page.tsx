/**
 * Blog post: investment property appraisals.
 *
 * Targets queries: "investment property appraisal", "rental property
 * appraisal", "appraisal came in low investment property", "1007 rent
 * schedule", "appraisal gap investment property", "reconsideration of
 * value", "how do appraisals work rental property".
 *
 * Angle: the appraisal is the one number in every purchase, refinance,
 * and DSCR loan that the investor doesn't control — yet most investors
 * only learn how it works after one comes in low. Explain the forms
 * (1004 / 1025 / 1007), the lower-of rule, a worked low-appraisal gap
 * example, the 1007's effect on DSCR pricing, and the full playbook
 * when the value misses. Slots into the ARV / refinance / DSCR cluster
 * and funnels into the DSCR and mortgage payment calculators.
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

const SLUG = "investment-property-appraisal";
const TITLE_PLAIN =
  "Investment property appraisals: how they work — and what to do when the value comes in low (2026)";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE_PLAIN.
const SERP_TITLE = "How investment property appraisals work (2026)";
const DESCRIPTION =
  "How investment property appraisals work: the forms, the 1007 rent schedule, the lower-of rule, worked low-appraisal gap math, and the rebuttal playbook.";
const PUBLISHED_AT = "2026-07-11";
const MODIFIED_AT = lastmodFor("/blog/investment-property-appraisal") ?? PUBLISHED_AT;
const READING_TIME = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "investment property appraisal",
    "rental property appraisal",
    "appraisal came in low investment property",
    "1007 rent schedule",
    "appraisal gap investment property",
    "reconsideration of value",
    "how do rental property appraisals work",
    "appraisal lower than offer",
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
    q: "How is an investment property appraisal different from a regular home appraisal?",
    a: "The valuation method is mostly the same — recent comparable sales, adjusted to the subject — but investment appraisals add income documentation. On a single-family rental where rental income is used to qualify, the lender has the appraiser give an opinion of market rent as well as value: traditionally on Form 1007 alongside the Form 1004, and, for appraisals submitted to Fannie Mae or Freddie Mac from November 2, 2026, usually in the redesigned URAR's Rental Information section. On a 2–4 unit property, Fannie Mae also requires the income approach — rental comps and a gross rent multiplier analysis — reported on Form 1025 (or, for appraisals submitted to Fannie Mae or Freddie Mac from November 2, 2026, the redesigned URAR). The lender may require you to pay for the appraisal. Expect the rent opinion to matter as much as the value if you're using a DSCR loan.",
  },
  {
    q: "What happens if the appraisal comes in lower than my offer?",
    a: "The lender sizes the loan off the lower of the purchase price and the appraised value, so a low appraisal shrinks your loan, not your price. You have five levers, in roughly this order: renegotiate the price down to (or toward) the appraised value, bring extra cash to cover the gap, file a reconsideration of value with better comps, switch lenders to trigger a new appraisal, or walk if your contract has an appraisal contingency. The math on each option is in the worked example above — and a hybrid (seller drops part way, you cover the rest) is a middle ground worth proposing.",
  },
  {
    q: "Can I challenge a low appraisal?",
    a: "Yes — the process is called a reconsideration of value (ROV), and it goes through your lender, not directly to the appraiser. It works when you can point to specific, factual problems: a renovated comp the appraiser missed, an error in the subject's square footage or bed/bath count, or comps pulled from across a boundary that changes value. It does not work as a generic complaint that the number feels low. Send two or three better closed comps with a short factual note. Under Fannie Mae rules you get one borrower-initiated ROV per appraisal, it must be submitted before the loan closes, and you can include up to five alternative comparables.",
  },
  {
    q: "What is a 1007 rent schedule and why does my lender want one?",
    a: "Form 1007 is the legacy single-family comparable rent schedule: the appraiser pulls three nearby rental comps and gives an opinion of the subject's market rent. For appraisals submitted to Fannie Mae or Freddie Mac from November 2, 2026, that opinion usually goes in the redesigned URAR's Rental Information section instead. Conventional lenders use it to count rental income toward your qualification; DSCR lenders may use the appraiser's rent opinion in the coverage ratio itself, and some underwrite to the lower of your actual lease and that market rent, so confirm the program's written method. A rent opinion that comes in under your lease can push your DSCR below a lender's pricing tier and raise your rate — which is why you should underwrite to a defensible market rent, not the most optimistic listing you found.",
  },
];

export default function InvestmentPropertyAppraisalPost() {
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
      { "@type": "ListItem", position: 1, name: "TrueCap", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
      { "@type": "ListItem", position: 3, name: TITLE_PLAIN, item: canonicalUrl },
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
              Investment property appraisals: how they work — and what to do
              when the value comes in low (2026)
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
              A financed rental deal usually comes with one number the
              investor doesn&apos;t control: the appraisal. You can negotiate the price,
              shop the rate, and pad the rehab budget, but the appraised value
              — and on many loans, the appraiser&apos;s opinion of market rent
              — is handed down by a stranger a few weeks before closing, and
              your loan is sized off it. Many investors learn how the process
              works the expensive way, the first time a value comes in
              $12,000 light. Here&apos;s the whole machine: which forms get
              ordered and what&apos;s in them, how the lower-of rule turns a
              low appraisal into a cash call, what the 1007 rent schedule does
              to a DSCR loan&apos;s pricing, and the exact playbook — with
              worked numbers — for when the appraisal misses.
            </p>
          </header>

          <ArticleBody>
            <h2>
              Where appraisals ambush a rental deal
            </h2>
            <p>
              You&apos;ll face an appraisal at three points in an investing
              career, and the stakes differ at each one. On a{" "}
              <strong>purchase</strong>, the appraisal referees the price you
              negotiated: come in low and the lender shrinks your loan, so you
              either renegotiate, bring cash, or walk. On a{" "}
              <strong>refinance</strong> — including the refi leg of a BRRRR —
              the appraisal <em>is</em> the deal: the cash-out loan is a{" "}
              <a
                href="https://selling-guide.fanniemae.com/sel/b2-1.2-01/loan-value-ltv-ratios"
                className="tc-link"
              >
                straight percentage of appraised value
              </a>
              , so at the{" "}
              <a
                href="https://sf.freddiemac.com/general/maximum-ltv-tltv-htltv-ratio-requirements-for-conforming-and-super-conforming-mortgages"
                className="tc-link"
              >
                conventional cash-out maximums (75% of value on one unit, 70% on two to four)
              </a>{" "}
              every dollar the appraiser shaves off costs you 70–75 cents of
              proceeds. (That forecast-versus-referee dynamic is the core of
              the{" "}
              <Link
                href="/blog/how-to-calculate-arv"
                className="tc-link"
              >
                ARV guide
              </Link>
              .) The exception: Fannie Mae&apos;s{" "}
              <a
                href="https://selling-guide.fanniemae.com/sel/b4-1.4-10/value-acceptance"
                className="tc-link"
              >
                value acceptance
              </a>{" "}
              can waive the appraisal on some one-unit investment refinances,
              though two-to-four unit properties are ineligible. And on a{" "}
              <strong>DSCR loan</strong>, a second, quieter number rides along
              with the value: the appraiser&apos;s opinion of market rent,
              which can move your rate tier even when the value comes in fine.
              The lender orders the appraisal,{" "}
              <a
                href="https://selling-guide.fanniemae.com/sel/b4-1.1-03/appraiser-selection-criteria"
                className="tc-link"
              >
                directly or through an appraisal management company
              </a>
              , and{" "}
              <a
                href="https://www.consumerfinance.gov/ask-cfpb/what-are-appraisals-and-why-do-i-need-to-look-at-them-en-167/"
                className="tc-link"
              >
                may require you to pay for it
              </a>
              , but you don&apos;t pick the appraiser, by design.
            </p>

            <h2>
              The paperwork: 1004, 1025, and the 1007 rent schedule
            </h2>
            <p>
              For a single-family rental, the appraisal itself is the same
              form an owner-occupant gets: the Uniform Residential Appraisal
              Report (URAR). Under the{" "}
              <a
                href="https://sf.freddiemac.com/docs/pdf/fact-sheet/uad-redesign-timeline.pdf"
                className="tc-link"
              >
                Fannie Mae and Freddie Mac redesign timeline
              </a>
              , appraisals submitted to either agency through November 1, 2026
              could use the legacy Fannie Mae Form 1004; from November 2, 2026
              they must use the redesigned URAR. Either way, the
              value is built almost entirely on the <strong>sales comparison
              approach</strong>:{" "}
              <a
                href="https://selling-guide.fanniemae.com/sel/b4-1.3-08/comparable-sales"
                className="tc-link"
              >
                at least three recent closed sales
              </a>
              , adjusted toward the subject for condition, size, and features,
              then reconciled to a value. What makes it an investment
              appraisal is the rent opinion:{" "}
              <a
                href="https://selling-guide.fanniemae.com/sel/b3-3.8-02/rental-income-subject-property"
                className="tc-link"
              >
                when rental income from the property is used to qualify for a Fannie Mae loan, the lender must obtain
              </a>{" "}
              <strong>Form 1007</strong>, the single-family comparable rent
              schedule, in which the appraiser pulls nearby rental comps and
              opines on the subject&apos;s market rent (for{" "}
              <a
                href="https://sf.freddiemac.com/faqs/uad-and-forms-redesign"
                className="tc-link"
              >
                appraisals submitted to Fannie Mae or Freddie Mac from November 2, 2026
              </a>
              , that rent opinion usually goes in the redesigned URAR&apos;s
              Rental Information section). If you&apos;ve built a
              rent estimate the way the{" "}
              <Link
                href="/blog/how-to-estimate-rent-rental-property"
                className="tc-link"
              >
                rent estimation guide
              </Link>{" "}
              lays out, the 1007 is the appraiser running your same play — and
              it should land near your number.
            </p>
            <p>
              Two-to-four unit properties have used <strong>Form 1025</strong>,
              the small residential income property report (appraisals
              submitted to Fannie Mae or Freddie Mac from November 2, 2026 use
              the redesigned URAR instead). Form 1025 keeps the sales
              comparison approach but{" "}
              <a
                href="https://guide.freddiemac.com/ci/okcsFattach/get/1001329_5"
                className="tc-link"
              >
                adds an income section: rental comps for each unit type
              </a>{" "}
              and a{" "}
              <Link
                href="/blog/gross-rent-multiplier-explained"
                className="tc-link"
              >
                gross rent multiplier
              </Link>{" "}
              analysis, where the appraiser multiplies the property&apos;s
              gross monthly market rent by the GRM extracted from comparable
              sales as a cross-check on the comps-based value. A duplex
              grossing $2,900 a month in a market where small multifamily
              trades around 98 times monthly rent (about 8.2 times annual rent)
              pencils to roughly $285,000 by the income approach — if the
              sales comps say $260,000, the appraiser reconciles,{" "}
              <a
                href="https://selling-guide.fanniemae.com/sel/b4-1.3-11/valuation-analysis-and-reconciliation"
                className="tc-link"
              >
                reporting which approach got the most weight
              </a>{" "}
              (Fannie Mae{" "}
              <a
                href="https://selling-guide.fanniemae.com/sel/b4-1.3-10/cost-and-income-approach-value"
                className="tc-link"
              >
                won&apos;t accept an appraisal that relies solely on the income approach
              </a>
              ). The third method, the cost approach (land plus replacement
              cost minus depreciation), rarely drives residential values:
              Fannie Mae doesn&apos;t require it except for manufactured homes,
              and it mostly shows up as a sanity check and on new
              construction. The practical takeaway: on small residential, <em>comps decide the value and rents decide
              the loan</em> — your cap-rate math matters to you, not to the
              appraiser.
            </p>

            <h2>
              Why the 1007 can cost you more than the value
            </h2>
            <p>
              On a{" "}
              <Link
                href="/blog/how-to-calculate-dscr#dscr-loans"
                className="tc-link"
              >
                DSCR loan
              </Link>
              , property coverage is the primary ratio under many programs,
              but borrower and property requirements still apply. The rent
              used in that ratio is not necessarily your lease. Some programs
              use the lower of an eligible lease and appraiser market rent;
              others define acceptable rent differently. Confirm the written
              program method before relying on either number. Run the
              numbers on a $240,000 single-family purchase with 25% down: a
              $180,000 loan at 7.25% carries a principal-and-interest payment
              of about $1,228; add $250 of monthly taxes and $110 of insurance
              and PITIA is roughly <strong>$1,588</strong>. Your tenant pays
              $2,000, so you compute DSCR at 2,000 ÷ 1,588 ={" "}
              <strong>1.26</strong>. But if the 1007 pegs market rent at
              $1,850 — maybe your tenant is above market, maybe the rental
              comps skew small — the lender&apos;s DSCR is 1,850 ÷ 1,588 ={" "}
              <strong>1.17</strong>. Some DSCR lenders price in tiers by
              coverage ratio: drop below a tier and the same deal can price
              worse, or the lender may trim leverage until the ratio clears, so
              ask your lender where its tiers break. Nothing about the property
              changed — one opinion of rent can move your cost of capital.
              Check where your deal sits in the{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                TrueCap analyzer
              </Link>{" "}
              before the appraisal does it for you.
            </p>

            <h2>
              The lower-of rule: worked gap math
            </h2>
            <p>
              <a
                href="https://selling-guide.fanniemae.com/sel/b2-1.2-01/loan-value-ltv-ratios"
                className="tc-link"
              >
                Purchase loans are sized against the <strong>lower</strong> of the contract price and the appraised value
              </a>
              . That asymmetry is
              worth staring at: an appraisal $15,000 <em>above</em> your price
              changes nothing (you don&apos;t get a bigger loan, though you do
              get free equity), while an appraisal $12,000 <em>below</em> is
              an immediate cash call. Concretely: you&apos;re under contract
              at <strong>$240,000</strong> with 25% down — a $180,000 loan and
              $60,000 down. The appraisal lands at{" "}
              <strong>$228,000</strong>. The lender now lends 75% of $228,000
              = <strong>$171,000</strong>, but you still owe the seller
              $240,000, so your cash to close jumps from $60,000 to{" "}
              <strong>$69,000</strong>. The consolation prizes are small: the
              payment drops about $61 a month (run variations through the{" "}
              <Link
                href="/tools/mortgage-payment-calculator"
                className="tc-link"
              >
                mortgage payment calculator
              </Link>
              ), and your loan-to-value improves. The injury is that $9,000 of
              extra cash is now buried in a property the market&apos;s referee
              just said is worth $12,000 less than you agreed to pay — and
              your cash-on-cash return recomputes against the bigger
              denominator.
            </p>

            <h2>
              The low-appraisal playbook, in order
            </h2>
            <p>
              <strong>First, renegotiate.</strong> The appraisal is leverage —
              a documented, third-party opinion that the price is wrong, and
              the seller knows the next financed buyer will likely hit the
              same number. Ask for $228,000; settle anywhere above it and
              you&apos;ve recovered real money. One middle ground is the split:
              seller comes down to $234,000, you cover the remaining $6,000 gap
              — the loan stays at $171,000, so cash to close is $63,000, up
              $3,000 instead of $9,000.{" "}
              <strong>Second, pay the gap</strong> — but only if your own
              comps genuinely support the contract price and the appraisal is
              the outlier, not your optimism. Be honest about which is more
              likely. <strong>Third, file a reconsideration of value.</strong>{" "}
              <a
                href="https://selling-guide.fanniemae.com/sel/b4-1.3-12/appraisal-quality-matters"
                className="tc-link"
              >
                An ROV goes through the lender and works only on facts
              </a>
              : a
              renovated comp the appraiser missed, a square-footage or
              bed/bath error, comps pulled from across a school-district or
              highway boundary. Send two or three better closed sales and a
              short note. Under Fannie Mae rules you get one borrower-initiated
              ROV per appraisal (with up to five alternative comps), and it has
              to be submitted before the loan closes, so make it count.{" "}
              <strong>Fourth, switch lenders.</strong> A new lender generally
              orders its own appraisal — a legitimate reset if the first was
              sloppy, at the cost of a fresh fee and more time. It&apos;s most
              practical on refinances, where there&apos;s no contract deadline
              forcing your hand.{" "}
              <strong>Fifth, walk.</strong> If your contract has an appraisal
              contingency, a low value can let you exit and recover your
              earnest money, subject to the contingency&apos;s terms and
              deadlines. On investment purchases, waiving that contingency is a
              real concession — waive it only when you&apos;d happily pay the
              gap, because you&apos;re promising exactly that.
            </p>

            <h2>
              Appraisal-proofing your underwriting
            </h2>
            <p>
              You can&apos;t pick the appraiser, but you can make the
              appraisal boring. Underwrite value from closed, truly
              comparable sales — never from list prices or an algorithm&apos;s
              guess — so the appraiser&apos;s comp set and yours overlap
              before anyone drives to the property. Underwrite rent to a
              defensible market number rather than the hottest listing on the
              block, so the 1007 confirms instead of corrects. On a purchase,
              stress the deal at 5% below contract price: if $9,000 of gap
              cash kills the investment, the margin was never there. On a
              refinance, the{" "}
              <Link
                href="/blog/how-to-refinance-a-rental-property"
                className="tc-link"
              >
                refinance guide
              </Link>{" "}
              covers the equivalent haircut on cash-out proceeds. And when the
              appraisal is scheduled, help the facts along: send the agent or
              appraiser a one-page packet — recent improvements with costs,
              the rent roll, and the two or three comps that best support the
              price. Appraisers can ignore it, but a factual packet beats a
              hopeful phone call, and it seeds the record you&apos;ll need if
              an ROV becomes necessary.
            </p>

            <h2>
              Five mistakes investors make with appraisals
            </h2>
            <ul>
              <li>
                <strong>Treating the appraisal as the market&apos;s verdict on
                the investment.</strong> It&apos;s a collateral opinion for
                the lender, anchored to closed sales. A property can appraise
                perfectly and still be a bad rental — and occasionally the
                reverse. Cash flow math is your job, not the appraiser&apos;s.
              </li>
              <li>
                <strong>Waiving the appraisal contingency to win a bidding
                war, without gap cash.</strong> That clause is what converts
                a low value from a crisis into a decision. Waive it only with
                the cash — and the willingness — to cover the worst-case gap.
              </li>
              <li>
                <strong>Ignoring the 1007 until closing week.</strong> On DSCR
                loans the rent opinion can move pricing tiers. If your
                underwrite needs above-market rent to clear your lender&apos;s
                tier, the appraisal is where that assumption gets repriced.
              </li>
              <li>
                <strong>Filing an emotional ROV.</strong> &quot;It should be
                worth more&quot; loses; &quot;the appraiser used a 1,050 sq ft
                dated sale and missed the renovated 1,400 sq ft closing on the
                same street&quot; wins. Facts, comps, brevity.
              </li>
              <li>
                <strong>Forgetting the appraisal expires.</strong>{" "}
                <a
                  href="https://selling-guide.fanniemae.com/sel/b4-1.2-04/appraisal-age-and-use-requirements"
                  className="tc-link"
                >
                  Under Fannie Mae rules an appraisal is good for four months
                </a>
                : after that the appraiser must update it (an exterior
                inspection and a check of current market data), and past 12
                months you need a new one. Let a closing drift past the window
                and you&apos;re paying for — and risking — a fresh look at
                whatever the market has become since.
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
              An appraisal is a referee&apos;s call built from closed comps —
              plus, on rentals, an opinion of market rent that can quietly
              reprice your loan. The lower-of rule means a low value never
              costs the seller first; it costs you, in gap cash or lost
              cash-out proceeds, at{" "}
              <a
                href="https://sf.freddiemac.com/general/maximum-ltv-tltv-htltv-ratio-requirements-for-conforming-and-super-conforming-mortgages"
                className="tc-link"
              >
                roughly 70–85 cents per appraised dollar, depending on your loan-to-value
              </a>
              . So
              underwrite like the appraiser is looking over your shoulder:
              comp-supported value, defensible market rent, and a deal that
              survives the value coming in 5% light. When one misses anyway,
              work the playbook in order — renegotiate, gap, ROV, new lender,
              walk — and let the contingency do the job you kept it for. Run
              the full picture — price, rent, financing, and the DSCR your
              lender will compute — through the{" "}
              <Link href="/analyze" prefetch={false} className="tc-link">
                TrueCap analyzer
              </Link>{" "}
              before the appraisal is ordered, so the referee&apos;s number is
              a confirmation, not a surprise. Appraisal forms, LTV limits, and
              DSCR tiers vary by lender and program — verify terms on your
              specific deal.
            </p>
          </ArticleBody>
        </article>
        <PostSources
          sources={[
            {
              title: "Fannie Mae Selling Guide B2-1.2-01, Loan-to-Value (LTV) Ratios (06/01/2022)",
              url: "https://selling-guide.fanniemae.com/sel/b2-1.2-01/loan-value-ltv-ratios",
            },
            {
              title: "Freddie Mac, Maximum LTV/TLTV/HTLTV Ratio Requirements for Conforming and Super Conforming Mortgages",
              url: "https://sf.freddiemac.com/general/maximum-ltv-tltv-htltv-ratio-requirements-for-conforming-and-super-conforming-mortgages",
            },
            {
              title: "Fannie Mae Selling Guide B4-1.4-10, Value Acceptance (06/03/2026)",
              url: "https://selling-guide.fanniemae.com/sel/b4-1.4-10/value-acceptance",
            },
            {
              title: "Fannie Mae Selling Guide B4-1.1-03, Appraiser Selection Criteria (06/04/2025)",
              url: "https://selling-guide.fanniemae.com/sel/b4-1.1-03/appraiser-selection-criteria",
            },
            {
              title: "Consumer Financial Protection Bureau, What are appraisals and why do I need to look at them?",
              url: "https://www.consumerfinance.gov/ask-cfpb/what-are-appraisals-and-why-do-i-need-to-look-at-them-en-167/",
            },
            {
              title: "Freddie Mac and Fannie Mae, UAD redesign timeline (fact sheet)",
              url: "https://sf.freddiemac.com/docs/pdf/fact-sheet/uad-redesign-timeline.pdf",
            },
            {
              title: "Fannie Mae Selling Guide B4-1.3-08, Comparable Sales (06/04/2025)",
              url: "https://selling-guide.fanniemae.com/sel/b4-1.3-08/comparable-sales",
            },
            {
              title: "Fannie Mae Selling Guide B3-3.8-02, Rental Income from the Subject Property (09/02/2026)",
              url: "https://selling-guide.fanniemae.com/sel/b3-3.8-02/rental-income-subject-property",
            },
            {
              title: "Freddie Mac, UAD and Forms Redesign FAQ (UAD 3.6)",
              url: "https://sf.freddiemac.com/faqs/uad-and-forms-redesign",
            },
            {
              title: "Freddie Mac Form 72 / Fannie Mae Form 1025 (March 2005), Small Residential Income Property Appraisal Report",
              url: "https://guide.freddiemac.com/ci/okcsFattach/get/1001329_5",
            },
            {
              title: "Fannie Mae Selling Guide B4-1.3-11, Valuation Analysis and Reconciliation (06/04/2025)",
              url: "https://selling-guide.fanniemae.com/sel/b4-1.3-11/valuation-analysis-and-reconciliation",
            },
            {
              title: "Fannie Mae Selling Guide B4-1.3-10, Cost and Income Approach to Value (06/04/2025)",
              url: "https://selling-guide.fanniemae.com/sel/b4-1.3-10/cost-and-income-approach-value",
            },
            {
              title: "Fannie Mae Selling Guide B4-1.3-12, Appraisal Quality Matters (09/03/2025)",
              url: "https://selling-guide.fanniemae.com/sel/b4-1.3-12/appraisal-quality-matters",
            },
            {
              title: "Fannie Mae Selling Guide B4-1.2-04, Appraisal Age and Use Requirements (06/04/2025)",
              url: "https://selling-guide.fanniemae.com/sel/b4-1.2-04/appraisal-age-and-use-requirements",
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
