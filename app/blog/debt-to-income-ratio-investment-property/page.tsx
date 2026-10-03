/**
 * Blog post: debt-to-income ratio for an investment property.
 *
 * Targets queries: "debt to income ratio investment property", "does
 * rental income count toward DTI", "how do lenders count rental income",
 * "75% rule rental income", "DTI for rental property", "how much rental
 * income to qualify for a mortgage", "front-end vs back-end DTI",
 * "rental income to offset mortgage payment".
 *
 * Angle: many conventional and FHA scenarios evaluate DTI, and some common
 * agency examples use a 75% rental-income treatment. Actual documentation and
 * calculation rules are program- and file-specific. The post works
 * the standalone-rental case, the house-hack case (where the same rule
 * runs in your favor), the Schedule E add-back documentation path, and
 * a DSCR-loan alternative when personal DTI is constraining. This is the
 * canonical explainer the financing cluster points to for "how lenders
 * count rental income."
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

const SLUG = "debt-to-income-ratio-investment-property";
const TITLE =
  "Debt-to-income ratio for an investment property: how lenders count rental income (2026)";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Debt-to-income ratio for investment property";
const DESCRIPTION =
  "See an illustrative 75% rental-income DTI calculation, house-hack example, and DSCR alternative. Actual lender methods and approval requirements vary.";
const PUBLISHED_AT = "2026-07-04";
const MODIFIED_AT = lastmodFor("/blog/debt-to-income-ratio-investment-property") ?? PUBLISHED_AT;
const READING_TIME = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "debt to income ratio investment property",
    "does rental income count toward DTI",
    "how do lenders count rental income",
    "75% rule rental income",
    "DTI for rental property",
    "how much rental income to qualify",
    "front-end vs back-end DTI",
    "rental income to offset mortgage",
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
    q: "Does rental income count toward my debt-to-income ratio?",
    a: "Potentially. A common agency-style treatment in some 1–4 unit scenarios uses 75% of eligible gross rent, but lease, appraisal, tax-return, landlord-history, occupancy, and net-rental-income rules can change the calculation. This article's 75%-minus-PITIA example is illustrative, not universal; have the lender calculate your actual file under the current program guide.",
  },
  {
    q: "What is the 75% rule for rental income?",
    a: "The phrase describes a 25% vacancy-and-maintenance reduction used in certain rental-income calculations. In a simplified example, $2,000 of eligible gross rent becomes $1,500 before the applicable housing-payment treatment. It does not apply identically to every property, borrower, loan, or documentation path; verify the lender's current method.",
  },
  {
    q: "What DTI do I need to buy an investment property in 2026?",
    a: "There is no single DTI number that guarantees approval. Applicable limits and automated-underwriting findings depend on program, occupancy, credit, reserves, LTV, income, debts, and lender overlays. A DSCR program may use property coverage instead of personal DTI as the primary ratio, but borrower, credit, reserve, appraisal, insurance, entity, and property requirements still apply.",
  },
  {
    q: "How do lenders count rental income if I have no landlord history?",
    a: "Documentation depends on program and property. Some agency workflows may use the appraiser's market-rent opinion (Form 1007 for one unit or the Form 1025 appraisal report for two to four units, replaced by the redesigned appraisal report's Rental Information section for appraisals submitted on or after Nov. 2, 2026), together with an eligible lease; others may use tax returns or additional history. The permitted rent, percentage, add-backs, and required ownership or landlord history vary. Ask the lender which documents and calculation apply before relying on projected rent.",
  },
  {
    q: "Does an existing rental hurt my DTI when I buy the next one?",
    a: "It can help or hurt depending on the program's rental-income worksheet and the documents accepted. Some tax-return methods adjust reported income for eligible non-cash or already-counted items and then account for housing expense, but the exact add-backs, averaging period, and treatment vary. Have the lender show the calculation for each property rather than assuming a tax loss is neutral.",
  },
];

export default function DtiInvestmentPropertyPost() {
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
              Debt-to-income can be an important ratio in{" "}
              <a href="https://selling-guide.fanniemae.com/sel/b3-6-02/debt-income-ratios" className="tc-link">
                conventional
              </a>{" "}
              and{" "}
              <a href="https://www.hud.gov/sites/default/files/Housing/documents/40001-hsgh-Update-18-Redline.pdf" className="tc-link">
                FHA
              </a>{" "}
              underwriting, alongside credit, reserves, LTV, property, income,
              and other program requirements. One important question is —
              how much of the rent does the bank actually let you count?
              Investors assume the answer is &quot;all of it,&quot; reason that a
              rental paying $2,100 a month more than covers a $1,650 payment,
              and are baffled when the loan officer says the property is
              <em> lowering</em> their income. The exact method is not the same
              for every lender or documentation path. Here is an illustrative
              75% treatment, the worked math for a
              standalone rental and a house hack, and what to do when your ratio
              still won&apos;t clear the line.
            </p>
          </header>

          <ArticleBody>
            <h2>What DTI actually measures</h2>
            <p>
              Debt-to-income ratio is your recurring monthly debt divided by
              your gross (pre-tax) monthly income, expressed as a percentage.{" "}
              <a href="https://www.hud.gov/sites/default/files/Housing/documents/40001-hsgh-Update-18-Redline.pdf" className="tc-link">
                Some programs look at two versions
              </a>
              . The <strong>front-end</strong> ratio is just your housing
              payment over your income. The <strong>back-end</strong> ratio
              adds{" "}
              <a href="https://selling-guide.fanniemae.com/sel/b3-6-02/debt-income-ratios" className="tc-link">
                applicable recurring obligations under the program&apos;s rules
              </a>
              , which may include the
              new mortgage, car loans, student loans, minimum
              credit-card payments, child support, and any other rental
              payments. Ordinary living expenses are generally outside this
              ratio, but the lender&apos;s program determines which obligations and
              housing costs count.
            </p>
            <ToolFormula formula="Back-end DTI = Total monthly debt payments ÷ Gross monthly income" />
            <p>
              No single DTI ceiling guarantees approval. Automated findings and
              lender overlays depend on the selected program, occupancy, income,
              debts, credit, reserves, LTV, and other file characteristics.
              The examples below use a <strong>45%</strong> screen only as an
              illustration; confirm the current threshold and calculation with
              the lender for your file.
            </p>

            <h2>The illustrative 75% rental-income treatment</h2>
            <p>
              A common agency-style example for some one-to-four-unit scenarios
              uses{" "}
              <a href="https://selling-guide.fanniemae.com/sel/b3-3.8-02/rental-income-subject-property" className="tc-link">
                <strong>75% of eligible gross rent</strong>
              </a>
              . The 25% cut works like an allowance for vacancy and
              maintenance: FHA&apos;s{" "}
              <a href="https://www.hud.gov/sites/default/files/Housing/documents/40001-hsgh-Update-18-Redline.pdf" className="tc-link">
                self-sufficiency test for three- and four-unit properties
                subtracts at least 25% of fair market rent for vacancies and
                maintenance
              </a>
              .
              The actual percentage, eligible rent, documents, and housing-cost
              treatment depend on the program and file. It is not a substitute
              for the{" "}
              <Link
                href="/tools/vacancy-rate-calculator"
                className="tc-link"
              >
                vacancy and repair reserves
              </Link>{" "}
              you would model yourself.
            </p>
            <p>
              In this simplified example, once the model has credited rent, it
              subtracts the property&apos;s
              entire monthly housing cost — principal, interest, taxes,
              insurance, and any HOA dues, together abbreviated{" "}
              <Link
                href="/blog/piti-explained-rental-property"
                className="tc-link"
              >
                PITIA
              </Link>
              . What is left is your <strong>net rental income</strong>, and its
              sign is everything:
            </p>
            <ToolFormula
              formula={
                <>
                  Illustrative net rental income = (0.75 × Eligible rent) − PITIA
                  <br />
                  Positive → added to your income
                  <br />
                  Negative → added to your debts
                </>
              }
            />
            <p>
              Under this illustration, a rental improves the modeled DTI only
              when 75% of eligible rent clears its <em>full</em> payment
              including taxes and insurance — not the loan payment alone. A
              property with positive modeled cash flow can still show a small
              negative under this simplified qualifying-income treatment.
            </p>
            <p>
              One current wrinkle: under{" "}
              <a href="https://selling-guide.fanniemae.com/sel/b3-3.8-01/rental-income" className="tc-link">
                Fannie Mae&apos;s rental-income guidance
              </a>
              , a positive result counts as qualifying income only when the
              borrower has at least 12 months of property-management
              experience. Without that history, the rent can offset the
              property&apos;s own PITIA but cannot add to income. A negative
              result is added to your monthly obligations either way.
            </p>

            <h2>Illustrative example: buying a standalone rental</h2>
            <p>
              Assume a $250,000 single-family rental, 25% down, a $187,500 loan at
              a hypothetical 7.25%
              over 30 years. The principal-and-interest payment is about $1,279 a
              month — you can confirm it on the{" "}
              <Link
                href="/tools/mortgage-payment-calculator"
                className="tc-link"
              >
                mortgage payment calculator
              </Link>{" "}
              — plus $250 of property tax and $125 of landlord insurance, for a
              PITIA of <strong>$1,654</strong>. It rents for $2,100.
            </p>
            <ToolFormula
              formula={
                <>
                  Credited rent = 0.75 × $2,100 = $1,575
                  <br />
                  Net rental income = $1,575 − $1,654 = −$79/mo
                </>
              }
            />
            <p>
              That $79 shortfall gets added to your monthly debts. Now suppose
              you earn $8,000 a month gross and already carry $3,100 of other
              obligations — your own home&apos;s payment, a car note, and student
              loans. Fold the rental in:
            </p>
            <ToolFormula formula="DTI = ($3,100 + $79) ÷ $8,000 = 39.7%" />
            <p>
              At 39.7%, the illustration falls below its chosen 45% screen. That
              does not establish eligibility or approval. Notice what the property did: it added
              nothing to your income and a small drag to your debt, despite
              renting for $446 a month more than its payment. In your own{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                cash-on-cash math
              </Link>{" "}
              that $446 is real money; to the lender it evaporated in the 25%
              haircut. The property is a strong performer that reads as a slight
              negative on the application.
            </p>

            <h2>What the 25% haircut actually costs you</h2>
            <p>
              To see the haircut&apos;s bite, run the same property both ways —
              once crediting the full rent, once at 75%:
            </p>
            <ArticleTable label="Data table">
              <table>
                <thead>
                  <tr>
                    <th className="text-left">Method</th>
                    <th className="text-right">Credited rent</th>
                    <th className="text-right">Net vs PITIA</th>
                    <th className="text-right">Resulting DTI</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Full rent (100%)</td>
                    <td className="text-right">$2,100</td>
                    <td className="text-right">+$446 → income</td>
                    <td className="text-right">36.7%</td>
                  </tr>
                  <tr>
                    <td>Illustrative 75% method</td>
                    <td className="text-right">$1,575</td>
                    <td className="text-right">−$79 → debt</td>
                    <td className="text-right">39.7%</td>
                  </tr>
                </tbody>
              </table>
            </ArticleTable>
            <p>
              Three points of modeled DTI hang on that one assumption. On a file
              near its applicable program limit, that difference can affect the
              underwriting result, but it does not predict approval. Do not assume
              the rent &quot;covers itself&quot;: model the illustrative 75%
              method shown here, then obtain the lender&apos;s actual qualifying-
              income worksheet before relying on it.
            </p>

            <h2>Illustrative house-hack version</h2>
            <p>
              The 75% rule feels like a tax until you buy a property you live in.
              On an owner-occupied two-to-four unit — the classic{" "}
              <Link
                href="/blog/house-hacking-explained"
                className="tc-link"
              >
                house hack
              </Link>{" "}
              — eligible rent from units you do not occupy may be credited under
              the selected program while the building payment is treated as a
              housing expense. The percentage, documentation, and calculation
              vary; the example below again assumes 75%.
            </p>
            <p>
              Say you buy a $350,000 duplex with{" "}
              <a href="https://sf.freddiemac.com/general/maximum-ltv-tltv-htltv-ratio-requirements-for-conforming-and-super-conforming-mortgages" className="tc-link">
                5% down on an owner-occupied conventional loan
              </a>{" "}
              — a $332,500 loan at 6.75%, about $2,157 in principal and
              interest, plus $365 tax, $150 insurance, and $139 of{" "}
              <a href="https://selling-guide.fanniemae.com/sel/b7-1-01/provision-mortgage-insurance" className="tc-link">
                PMI for low-down-payment financing
              </a>
              : a $2,811 PITIA. You live in one side; the other rents for
              $1,700.
            </p>
            <ToolFormula
              formula={
                <>
                  Rental credit = 0.75 × $1,700 = $1,275 → added to income
                  <br />
                  Qualifying income = $6,500 + $1,275 = $7,775/mo
                </>
              }
            />
            <p>
              With $700 of other monthly debts, your back-end ratio is
              ($2,811 + $700) ÷ $7,775 = <strong>45.2%</strong> under the stated
              assumptions — just above the illustration&apos;s 45% screen, and a
              modeled ratio, not an automated approval. Strip the rental credit
              out and qualify on your $6,500 salary alone, and the same ratio
              balloons to
              <strong> 54%</strong>, well above that screen.
              The tenant&apos;s modeled rent credit drives the difference. This is
              the structural edge house hacking has over a standalone rental
              purchase:{" "}
              <a href="https://selling-guide.fanniemae.com/sel/b3-3.8-01/rental-income" className="tc-link">
                the rent counts as income
              </a>{" "}
              against a low owner-occupant down payment, instead of merely
              netting against the payment on an investment loan. The Fannie Mae
              property-management-experience limit described above applies here
              too, so ask the lender which treatment your file gets.
            </p>

            <h2>How you prove the rent</h2>
            <p>
              A lender will require acceptable evidence for the rent figure.
              Which documents and calculations apply depend on the program,
              property, occupancy, and history:
            </p>
            <p>
              <strong>A property you&apos;re buying, no history.</strong> The
              selected agency workflow may use the appraiser&apos;s market-rent
              opinion, such as a{" "}
              <a href="https://selling-guide.fanniemae.com/sel/b3-3.8-02/rental-income-subject-property" className="tc-link">
                Single-Family Comparable Rent Schedule (Form 1007) for one unit
                or the Form 1025 appraisal report for two to four units
              </a>{" "}
              (replaced by the redesigned appraisal report&apos;s Rental
              Information section for appraisals{" "}
              <a href="https://sf.freddiemac.com/faqs/uad-and-forms-redesign" className="tc-link">
                submitted on or after Nov. 2, 2026
              </a>
              ), together with an eligible lease. Which value
              controls and whether a percentage applies must be confirmed under
              the current guide and lender overlays.
            </p>
            <p>
              <strong>A rental you already own.</strong> Once the property
              appears on your filed returns&apos;{" "}
              <Link
                href="/blog/schedule-e-rental-property"
                className="tc-link"
              >
                Schedule E
              </Link>{" "}
              (
              <a href="https://selling-guide.fanniemae.com/sel/b3-3.8-01/rental-income" className="tc-link">
                the most recent year for Fannie Mae
              </a>
              ;{" "}
              <a href="https://www.hud.gov/sites/default/files/Housing/documents/40001-hsgh-Update-18-Redline.pdf" className="tc-link">
                two years for FHA
              </a>
              ), a program may use tax returns and a rental-income worksheet.
              Some methods start with reported net income and{" "}
              <a href="https://selling-guide.fanniemae.com/sel/b3-3.8-02/rental-income-subject-property" className="tc-link">
                adjust eligible non-cash or already-counted lines
              </a>
              , which may include{" "}
              <Link
                href="/blog/rental-property-tax-deductions"
                className="tc-link"
              >
                depreciation
              </Link>{" "}
              and certain already-counted housing expenses. Eligibility,
              averaging period, add-backs, and payment treatment vary. A tax
              loss therefore does not by itself reveal the qualifying result;
              ask the lender for its completed calculation.
            </p>
            <p>
              One thing DTI doesn&apos;t capture but your lender checks
              separately: <strong>reserves.</strong>{" "}
              <a href="https://selling-guide.fanniemae.com/sel/b3-4.1-01/minimum-reserve-requirements" className="tc-link">
                Financed investment properties may require program-specific
                reserves
              </a>{" "}
              — they may not
              change the ratio itself, but a file can still fail other
              underwriting conditions. Verify amount, eligible assets, and
              treatment with the lender.
            </p>

            <h2>When DTI constrains the file: compare DSCR programs</h2>
            <p>
              A borrower may eventually encounter a DTI, documentation, or{" "}
              <a href="https://selling-guide.fanniemae.com/sel/b2-2-03/multiple-financed-properties-same-borrower" className="tc-link">
                financed-property constraint
              </a>{" "}
              under a selected conventional program. One alternative to
              investigate is a{" "}
              <Link
                href="/blog/how-to-calculate-dscr#dscr-loans"
                className="tc-link"
              >
                DSCR loan
              </Link>
              . Many DSCR programs use the property&apos;s coverage
              instead of personal DTI as the primary qualifying ratio —
              whether its rent covers its debt service, measured by the{" "}
              <Link
                href="/analyze" prefetch={false}
                className="tc-link"
              >
                debt-service-coverage ratio
              </Link>
              . They may not use pay stubs or tax returns to calculate that
              ratio, but documentation and borrower review vary by lender and
              program; credit, reserves, entity, appraisal, insurance, and
              other conditions still apply.
            </p>
            <p>
              DSCR pricing, leverage, points, prepayment terms, documentation,
              and recourse are quote-specific and may compare differently with
              conventional financing. The{" "}
              <Link
                href="/blog/hard-money-vs-dscr-loan"
                className="tc-link"
              >
                choice between hard money and a DSCR loan
              </Link>{" "}
              turns on the same idea — matching the loan product to which
              constraint is actually binding, your income or the deal&apos;s
              economics.
            </p>

            <h2>Five ways to get under the line</h2>
            <p>
              If a conventional file is close to its applicable limit, possible
              levers to discuss with the lender include paying down eligible
              debt. <strong>Paying off a monthly obligation</strong> can lower
              the numerator directly; confirm payoff and credit-report treatment
              with the lender before moving funds.{" "}
              <strong>Put more down</strong> to shrink the payment, which lowers
              the PITIA in the rental calculation and, on a house hack, your
              housing expense. <strong>Buy the property with the best
              rent-to-payment ratio</strong>, since a rental whose 75%-credited
              rent clears its PITIA flips from a debt to an income line.{" "}
              <strong>Document all your income</strong> — bonus, overtime, and
              side income may enlarge the denominator when it satisfies the{" "}
              <a href="https://selling-guide.fanniemae.com/sel/b3-3.1-01/general-income-information" className="tc-link">
                program&apos;s history, stability, and documentation rules
              </a>
              . And when
              none of that is enough, <strong>compare DSCR and portfolio
              programs.</strong> Notice the first three are the
              same move you make when you{" "}
              <Link
                href="/blog/how-much-down-payment-investment-property"
                className="tc-link"
              >
                size a down payment
              </Link>
              : less debt, smaller payment, better coverage.
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
              Rental income may affect DTI through different lease, appraisal,
              and tax-return methods. The 75%-minus-PITIA calculation in this
              article is one illustration, not a universal lender rule. Ask the
              lender to calculate the actual file, and compare DSCR or portfolio
              programs without assuming that property coverage guarantees a
              loan. The{" "}
              <Link href="/analyze" prefetch={false} className="tc-link">
                TrueCap analyzer
              </Link>{" "}
              models payment, coverage, and cash flow from user-entered
              assumptions; it is not a lender worksheet, appraisal, automated
              underwriting system, quote, or approval. Confirm the current
              program guide and the lender&apos;s written calculation against
              your own file before you make an offer.
            </p>
          </ArticleBody>
        </article>
        <PostSources
          sources={[
            {
              title: "Fannie Mae Selling Guide B3-6-02, Debt-to-Income Ratios",
              url: "https://selling-guide.fanniemae.com/sel/b3-6-02/debt-income-ratios",
            },
            {
              title:
                "HUD Handbook 4000.1, FHA Single Family Housing Policy Handbook (Update 18, redline)",
              url: "https://www.hud.gov/sites/default/files/Housing/documents/40001-hsgh-Update-18-Redline.pdf",
            },
            {
              title:
                "Fannie Mae Selling Guide B3-3.8-02, Rental Income from the Subject Property",
              url: "https://selling-guide.fanniemae.com/sel/b3-3.8-02/rental-income-subject-property",
            },
            {
              title:
                "Fannie Mae Selling Guide B3-3.8-01, General Rental Income Information",
              url: "https://selling-guide.fanniemae.com/sel/b3-3.8-01/rental-income",
            },
            {
              title:
                "Freddie Mac Single-Family, Maximum LTV/TLTV/HTLTV Ratio Requirements for Conforming and Super Conforming Mortgages",
              url: "https://sf.freddiemac.com/general/maximum-ltv-tltv-htltv-ratio-requirements-for-conforming-and-super-conforming-mortgages",
            },
            {
              title:
                "Fannie Mae Selling Guide B7-1-01, Provision of Mortgage Insurance",
              url: "https://selling-guide.fanniemae.com/sel/b7-1-01/provision-mortgage-insurance",
            },
            {
              title: "Freddie Mac, UAD and Forms Redesign FAQs",
              url: "https://sf.freddiemac.com/faqs/uad-and-forms-redesign",
            },
            {
              title:
                "Fannie Mae Selling Guide B3-4.1-01, Minimum Reserve Requirements",
              url: "https://selling-guide.fanniemae.com/sel/b3-4.1-01/minimum-reserve-requirements",
            },
            {
              title:
                "Fannie Mae Selling Guide B2-2-03, Multiple Financed Properties for the Same Borrower",
              url: "https://selling-guide.fanniemae.com/sel/b2-2-03/multiple-financed-properties-same-borrower",
            },
            {
              title:
                "Fannie Mae Selling Guide B3-3.1-01, General Income Information",
              url: "https://selling-guide.fanniemae.com/sel/b3-3.1-01/general-income-information",
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
