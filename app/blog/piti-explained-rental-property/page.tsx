/**
 * Blog post: PITI explained for rental properties.
 *
 * Targets queries: "PITI", "what is PITI", "PITI meaning", "how to
 * calculate PITI", "PITI investment property", "PITI vs PITIA",
 * "does PITI include HOA", "PITI escrow", "is PITI the same as my
 * mortgage payment".
 */

import type { Metadata } from "next";
import Link from "next/link";
import { BlogByline } from "@/components/marketing/blog-byline";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { RelatedContent } from "@/components/marketing/related-content";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";
import { Header } from "@/components/investcalc/header";
import { lastmodFor } from "@/lib/seo/lastmod";
import { JsonLd } from "@/components/seo/json-ld";
import { PostSources } from "@/components/blog/post-sources";

const SLUG = "piti-explained-rental-property";
const TITLE = "PITI explained: the real monthly payment on a rental (2026)";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "PITI explained: a rental's real payment (2026)";
const DESCRIPTION =
  "PITI — principal, interest, taxes, insurance — is a rental's real monthly payment. How to estimate each part, handle escrow, and turn it into DSCR.";
const PUBLISHED_AT = "2026-06-20";
const MODIFIED_AT = lastmodFor("/blog/piti-explained-rental-property") ?? PUBLISHED_AT;
const READING_TIME = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "PITI",
    "what is PITI",
    "PITI meaning",
    "how to calculate PITI",
    "PITI investment property",
    "PITI vs PITIA",
    "does PITI include HOA",
    "PITI escrow",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    title: SERP_TITLE,
    description: DESCRIPTION,
    url: `/blog/${SLUG}`,
    type: "article",
    publishedTime: PUBLISHED_AT,
    modifiedTime: MODIFIED_AT,
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const FAQS = [
  {
    q: "What does PITI stand for?",
    a: "PITI is principal, interest, taxes, and insurance — the four parts of the payment a lender collects each month on a mortgaged property. Principal and interest pay down the loan; taxes and insurance are usually collected into an escrow account and paid out by the servicer when the bills come due. PITI is the number that actually leaves your bank account, which is why it — not bare principal and interest — is the right figure to underwrite a rental on.",
  },
  {
    q: "What is the difference between PITI and PITIA?",
    a: "PITIA adds an 'A' for association dues (HOA or condo fees). Plain PITI is correct for a single-family house with no HOA. The moment there is an HOA, condo, or co-op fee, lenders fold it into the housing payment and call it PITIA. If there is an association fee, ask a DSCR lender whether its ratio includes it; formulas differ by lender. If your property has no HOA, PITI and PITIA are the same number.",
  },
  {
    q: "Does an investment property require escrow or PMI?",
    a: "Mortgage insurance applies to a conventional investment loan only when you put less than 20% down. Fannie Mae and Freddie Mac allow as little as 15% down on a single-family rental, and loans above 80% LTV require mortgage insurance; at 20% or more down there is none. Escrow is a separate question: many lenders require it, and whether a particular loan lets you waive escrow (and at what cost) depends on the lender and program. Waiving escrow does not lower your cost — it just moves the timing onto you, so budget the same monthly amount into a reserve.",
  },
  {
    q: "Is PITI the same as my total monthly cost on a rental?",
    a: "No — PITI is the floor, not the all-in. It captures the loan payment plus taxes and insurance, but leaves out vacancy, maintenance, capital reserves, and property management — in this article's example, 23% of rent. Underwriting a rental on PITI alone is how investors talk themselves into a deal that loses money each month.",
  },
  {
    q: "Why did my fixed-rate payment go up if PITI is fixed?",
    a: "Only the principal-and-interest slice of PITI is fixed on a fixed-rate loan. Taxes and insurance can change from year to year as properties are reassessed and policies renew. Each year the servicer runs an escrow analysis; if taxes or insurance rose, your escrow comes up short and the monthly payment is raised to refill it (often plus a catch-up for the prior shortage). A 'fixed' mortgage payment is only fixed on two of its four letters.",
  },
];

export default function PitiExplainedPost() {
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
    <div className="min-h-screen bg-background">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={faqLd} />

      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <article>
          <div className="mb-2">
            <Link
              href="/blog"
              className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground"
            >
              ← Blog
            </Link>
          </div>
          <header className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight text-balance">
              {TITLE}
            </h1>
            <p className="mt-3 text-2xs uppercase tracking-widest text-muted-foreground font-bold">
              {new Date(PUBLISHED_AT).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}{" "}
              · {READING_TIME} min read
            </p>
            <BlogByline />
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              Almost every mortgage calculator hands you a
              principal-and-interest number and calls it your payment. It
              isn&apos;t. The amount that actually leaves your account each
              month is PITI — principal, interest, taxes, and insurance — and on
              the $250k example below, the two letters most calculators ignore
              add about a third on top of the loan payment. Here&apos;s how
              each piece works, with illustrative numbers you can swap for your
              own, and how PITI becomes the input for DSCR, break-even, and cash
              flow.
            </p>
          </header>

          <div className="prose prose-neutral max-w-none [&>p]:max-w-[68ch] [&>ul]:max-w-[68ch] [&>ol]:max-w-[68ch] [&>blockquote]:max-w-[68ch] [&>h2]:max-w-[68ch] [&>h3]:max-w-[68ch] text-foreground space-y-6 leading-relaxed">
            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              What PITI stands for
            </h2>
            <p>
              PITI breaks the housing payment into four parts:{" "}
              <strong>P</strong>rincipal, <strong>I</strong>nterest,{" "}
              <strong>T</strong>axes, and <strong>I</strong>nsurance. The first
              two are the loan: principal pays down what you borrowed, interest
              is the lender&apos;s charge for the money. The second two are the
              cost of owning the asset regardless of how it&apos;s financed:
              property taxes go to the county, and a hazard/landlord insurance
              premium protects the building. Lenders bundle all four because all
              four have to be paid for the loan to stay current — an unpaid tax
              bill can become a lien on the property (in{" "}
              <a
                href="https://www.hud.gov/sites/documents/12-11ml.pdf"
                className="text-primary font-semibold hover:underline"
              >
                some states, one that takes priority over the first mortgage
              </a>
              ), and a lapsed policy leaves their collateral uninsured.
            </p>
            <p>
              You will also see <strong>PITIA</strong> — the same thing with an{" "}
              <strong>A</strong> for association dues (HOA, condo, or co-op
              fees). If the property has no HOA, PITI and PITIA are identical.
              The moment there is a mandatory association fee, it joins the
              housing payment, because the fee is a carrying cost the rent must
              cover. Fannie Mae, for example,{" "}
              <a
                href="https://selling-guide.fanniemae.com/sel/b3-4.1-01/minimum-reserve-requirements"
                className="text-primary font-semibold hover:underline"
              >
                measures reserves in months of PITIA
              </a>
              ; ask a DSCR lender whether its ratio includes association dues.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The worked example: a $250k single-family rental
            </h2>
            <p>
              Take a $250,000 single-family rental bought as a
              non-owner-occupied investment with 25% down ($62,500), financing
              $187,500 on a 30-year fixed at 7% (an illustrative rate, not a
              quote). Here is the full PITI, built one letter at a time.
            </p>
            <p>
              <strong>Principal &amp; interest.</strong> $187,500 at 7% over 30
              years works out to about <strong>$1,247/month</strong>. (Quick
              mental math: $100k at 7% for 30 years is ~$665/month, so 1.875 ×
              $665 ≈ $1,247.) Early on, the split is lopsided — in month one
              roughly $1,094 of that is interest and only $153 is principal —
              but the total stays flat for the life of the loan. Check any rate
              and term with the{" "}
              <Link
                href="/tools/mortgage-payment-calculator"
                className="text-primary font-semibold hover:underline"
              >
                mortgage payment calculator
              </Link>
              .
            </p>
            <p>
              <strong>Taxes.</strong> Property tax varies wildly by state and
              county. Take each state&apos;s Census Bureau{" "}
              <a
                href="https://data.census.gov/api/access/data/table?id=ACSDT1Y2024.B25103&g=010XX00US$0400000"
                className="text-primary font-semibold hover:underline"
              >
                median tax bill
              </a>{" "}
              as a share of its{" "}
              <a
                href="https://data.census.gov/api/access/data/table?id=ACSDT1Y2024.B25077&g=010XX00US$0400000"
                className="text-primary font-semibold hover:underline"
              >
                median home value
              </a>
              , and the result runs from under 0.5% of value a year in Hawaii
              and Alabama to around 2% statewide in New Jersey and Illinois.
              The same ratio tops 2% in many New Jersey and Illinois counties
              (see the county tables of median tax bills for{" "}
              <a
                href="https://data.census.gov/api/access/data/table?id=ACSDT5Y2023.B25103&g=040XX00US34$0500000"
                className="text-primary font-semibold hover:underline"
              >
                New Jersey
              </a>{" "}
              and{" "}
              <a
                href="https://data.census.gov/api/access/data/table?id=ACSDT5Y2023.B25103&g=040XX00US17$0500000"
                className="text-primary font-semibold hover:underline"
              >
                Illinois
              </a>{" "}
              and of median home values for{" "}
              <a
                href="https://data.census.gov/api/access/data/table?id=ACSDT5Y2023.B25077&g=040XX00US34$0500000"
                className="text-primary font-semibold hover:underline"
              >
                New Jersey
              </a>{" "}
              and{" "}
              <a
                href="https://data.census.gov/api/access/data/table?id=ACSDT5Y2023.B25077&g=040XX00US17$0500000"
                className="text-primary font-semibold hover:underline"
              >
                Illinois
              </a>
              ). At an assumed 1.2% effective rate on
              $250,000, that&apos;s $3,000/year, or{" "}
              <strong>$250/month</strong>. Verify the parcel&apos;s current
              assessment, exemptions, millage, and reassessment rules with the
              county assessor or treasurer before trusting the number on the
              listing.
            </p>
            <p>
              <strong>Insurance.</strong> A landlord policy (a DP-3 dwelling
              policy, not the homeowner&apos;s HO-3 you&apos;d buy for your own
              house) typically runs more than an owner-occupied quote because it
              adds loss-of-rent coverage and liability for tenant claims. Assume
              $1,800/year, or <strong>$150/month</strong>. In coastal or
              wildfire-exposed markets it can be much higher, and premiums can
              change sharply at renewal, so get a current quote for the
              specific property.
            </p>
            <p>
              Add it up: $1,247 + $250 + $150 ={" "}
              <strong>$1,647/month PITI</strong>. The taxes-and-insurance slice
              is $400 — about{" "}
              <strong>32% on top of the $1,247 loan payment.</strong> An
              investor who underwrote this deal on principal and interest alone
              just understated the real payment by nearly a third before a
              single repair or vacancy.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              How escrow actually works
            </h2>
            <p>
              You don&apos;t write the county a check once a year. With an
              escrow (impound) account, the servicer collects{" "}
              <a
                href="https://www.ecfr.gov/current/title-12/chapter-X/part-1024/subpart-B/section-1024.17"
                className="text-primary font-semibold hover:underline"
              >
                one-twelfth
              </a>{" "}
              of your annual taxes and insurance every month alongside principal
              and interest, holds it, and pays the bills when they come due. On
              our deal that escrow portion is the $400/month — $250 toward the
              $3,000 tax bill, $150 toward the $1,800 premium.
            </p>
            <p>
              Two mechanics trip people up. First, the{" "}
              <strong>escrow cushion</strong>: federal rules (RESPA) let the
              servicer keep a buffer of up to one-sixth of a year&apos;s escrow
              payments (two months of T&amp;I on a loan like this one), which is
              why you pre-fund several months of escrow at closing on top of
              your down payment — it shows up in prepaids on the settlement
              statement, covered in the{" "}
              <Link
                href="/blog/closing-costs-investment-property"
                className="text-primary font-semibold hover:underline"
              >
                closing costs breakdown
              </Link>
              . Second, the <strong>annual escrow analysis</strong>: once a year
              the servicer reconciles what it collected against what it paid. If
              taxes or insurance rose, your account is short, and the servicer
              raises your monthly payment to refill it, often adding a catch-up
              for the prior shortfall. That is how a
              &quot;fixed-rate&quot; mortgage payment goes up: the P&amp;I never
              moved, but the T&amp;I did.
            </p>
            <p>
              <a
                href="https://www.consumerfinance.gov/ask-cfpb/what-is-an-escrow-or-impound-account-en-140/"
                className="text-primary font-semibold hover:underline"
              >
                Many lenders require escrow
              </a>
              , but some lenders may let investors{" "}
              <strong>waive escrow</strong> and pay taxes and insurance
              directly; ask about any pricing or conditions. Waiving
              doesn&apos;t lower the cost — it just hands you the timing risk. Whether
              escrowed or not, the $400 is part of your monthly carry.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The reassessment trap on the tax line
            </h2>
            <p>
              The most expensive PITI mistake is copying the property-tax figure
              straight off the listing or the seller&apos;s last bill. In some
              jurisdictions the assessed value can reset toward your{" "}
              <em>purchase price</em> after a sale; check the county
              assessor&apos;s rules. If the current owner has
              held the place for fifteen years, their assessment — and their tax
              bill — can be far below what yours will be the year after you buy.
            </p>
            <p>
              Suppose the seller&apos;s bill reflects a $150,000 assessment at
              1.2% — $1,800/year, or $150/month. You pay $250,000, the county
              reassesses to something near that, and your bill jumps to
              ~$3,000/year. That &quot;$150&quot; tax line you underwrote is
              actually $250, and your PITI just rose by $100/month — $1,200 a
              year straight off the bottom line. Always underwrite taxes on{" "}
              <em>your</em> purchase price and the local rate — not the
              seller&apos;s legacy assessment — and check how your state handles
              reassessment on transfer.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              How investment-property PITI differs from a primary residence
            </h2>
            <p>
              The four letters are the same, but the numbers behind them shift
              when the property is a rental:
            </p>
            <ul>
              <li>
                <strong>Higher interest rate.</strong> Non-owner-occupied loans
                price above an owner-occupied loan for the same borrower,
                because Fannie Mae applies{" "}
                <a
                  href="https://selling-guide.fanniemae.com/sel/b2-1.1-01/occupancy-types"
                  className="text-primary font-semibold hover:underline"
                >
                  extra loan-level price adjustments to investment properties
                </a>
                . Each 0.25 point of rate adds about $32/month to the P&amp;I on
                a $187,500 loan at 7%.
              </li>
              <li>
                <strong>Bigger down payment.</strong> Conventional investment
                loans allow{" "}
                <a
                  href="https://sf.freddiemac.com/general/maximum-ltv-tltv-htltv-ratio-requirements-for-conforming-and-super-conforming-mortgages"
                  className="text-primary font-semibold hover:underline"
                >
                  as little as 15% down on a single-family
                </a>{" "}
                (with{" "}
                <a
                  href="https://selling-guide.fanniemae.com/sel/b7-1-01/provision-mortgage-insurance"
                  className="text-primary font-semibold hover:underline"
                >
                  mortgage insurance above 80% LTV
                </a>
                ) and require 25% on 2–4 units. Putting 20% or more down keeps
                you at or below 80% LTV and sidesteps private mortgage
                insurance.{" "}
                <Link
                  href="/glossary/house-hack"
                  className="text-primary font-semibold hover:underline"
                >
                  House-hackers
                </Link>{" "}
                on an owner-occupied loan are the exception — less down, but PMI
                until they reach{" "}
                <a
                  href="https://www.consumerfinance.gov/ask-cfpb/when-can-i-remove-private-mortgage-insurance-pmi-from-my-loan-en-202/"
                  className="text-primary font-semibold hover:underline"
                >
                  ~20% equity
                </a>
                .
              </li>
              <li>
                <strong>Pricier insurance.</strong> A landlord DP-3 with
                loss-of-rent and liability coverage costs more than a comparable
                homeowner&apos;s policy.
              </li>
              <li>
                <strong>Lenders may judge PITIA against rent.</strong>{" "}
                On a primary residence the lender checks PITI against your
                income (the front-end ratio). On a rental — especially with a
                DSCR loan — the lender may check PITIA against the
                property&apos;s rent. That changes PITI from a number you simply pay into a
                number that can decide how much you can borrow.
              </li>
            </ul>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              From PITI to DSCR
            </h2>
            <p>
              Some DSCR programs use a rent-to-PITIA ratio, while other lender
              and investor formulas differ. In this illustration, our rental
              brings $2,100/month and carries $1,647 of PITI (no HOA, so PITIA
              is the same $1,647):
            </p>
            <p>
              <strong>DSCR = $2,100 ÷ $1,647 = 1.28.</strong>
            </p>
            <p>
              That produces 1.28 under this formula. It does not establish a
              lender threshold, approval, or pricing. If you used only the
              $1,247 P&amp;I, the ratio would be 1.68; adding the stated taxes
              and insurance changes it to 1.28. Ask the lender for its exact
              formula and current requirements. Walk through the full mechanics
              in{" "}
              <Link
                href="/blog/how-to-calculate-dscr"
                className="text-primary font-semibold hover:underline"
              >
                how to calculate DSCR
              </Link>
              , or run a property through the{" "}
              <Link
                href="/analyze" prefetch={false}
                className="text-primary font-semibold hover:underline"
              >
                TrueCap analyzer
              </Link>
              .
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              PITI is the floor, not the all-in cost
            </h2>
            <p>
              Here&apos;s the line that separates investors who keep their
              properties from the ones who get surprised: PITI is the{" "}
              <em>minimum</em> monthly cost, not the total. It covers the loan,
              taxes, and insurance — but a rental also burns money on vacancy,
              repairs, capital reserves, and management, none of which appear in
              PITI. On our deal, with the same $2,100 rent:
            </p>
            <ul>
              <li>
                <strong>PITI:</strong> $1,647
              </li>
              <li>
                <strong>Vacancy reserve</strong> (5% of rent): $105
              </li>
              <li>
                <strong>Maintenance + CapEx</strong> (10% of rent): $210 — see{" "}
                <Link
                  href="/blog/capex-maintenance-reserves-rental-property"
                  className="text-primary font-semibold hover:underline"
                >
                  how much to budget for reserves
                </Link>
              </li>
              <li>
                <strong>Property management</strong> (8% of rent): $168
              </li>
            </ul>
            <p>
              Total monthly cost with professional management: ~$2,130 — a hair{" "}
              <em>above</em> the $2,100 rent, so the deal runs about{" "}
              <strong>−$30/month</strong>. Self-managed, you drop the $168 PM
              fee and net roughly <strong>+$138/month</strong>. Same property,
              same PITI; the difference between a small loss and a thin profit
              is entirely in the costs PITI never showed you. The DSCR still
              read 1.28 — DSCR only looks at PITIA — which is exactly why a
              ratio a lender accepts is not the same thing as a good deal.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              Break-even: how much rent does PITI demand?
            </h2>
            <p>
              Flip the question around. With self-management and the reserve
              assumptions above, your fixed monthly outflow is the $1,647 PITI
              plus $315 of vacancy and reserves — about $1,962. That&apos;s your{" "}
              <strong>break-even rent</strong>: below it the property bleeds,
              above it it earns. At $2,100 you&apos;re $138 over the line; a
              single percentage point of extra vacancy or a $40/month insurance
              hike at renewal eats a big slice of that margin. The{" "}
              <Link
                href="/tools/break-even-calculator"
                className="text-primary font-semibold hover:underline"
              >
                break-even calculator
              </Link>{" "}
              shows how much cushion sits between your rent and the edge.
            </p>
            <p>
              One caution: PITI mixes financing (P&amp;I) with operating costs
              (T&amp;I). Net operating income does the opposite — it excludes
              the loan but includes taxes and insurance, because NOI measures
              the property before financing. If that distinction is fuzzy, the{" "}
              <Link
                href="/blog/how-to-calculate-noi-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                NOI walkthrough
              </Link>{" "}
              draws the line clearly.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              A quick way to estimate PITI on any listing
            </h2>
            <p>You can get within a few percent in under a minute:</p>
            <ul>
              <li>
                <strong>P&amp;I:</strong> for a 30-year loan at 7%, multiply
                each $100k borrowed by ~$665 (at 6.5%, ~$632; at 7.5%, ~$700).
              </li>
              <li>
                <strong>Taxes:</strong> purchase price × local effective rate ÷
                12. If you don&apos;t know it, the Census Bureau&apos;s 2024
                American Community Survey puts the{" "}
                <a
                  href="https://data.census.gov/api/access/data/table?id=ACSDT1Y2024.B25103&g=010XX00US"
                  className="text-primary font-semibold hover:underline"
                >
                  U.S. median tax bill
                </a>{" "}
                at about 0.9% of the{" "}
                <a
                  href="https://data.census.gov/api/access/data/table?id=ACSDT1Y2024.B25077&g=010XX00US"
                  className="text-primary font-semibold hover:underline"
                >
                  U.S. median home value
                </a>
                , but use your county&apos;s actual rate.
              </li>
              <li>
                <strong>Insurance:</strong> get a landlord (DP-3) quote for the
                property and divide by 12; premiums can run higher near coasts
                and in wildfire zones.
              </li>
              <li>
                <strong>Association dues:</strong> add the monthly HOA/condo fee
                if there is one (this is the &quot;A&quot; that turns PITI into
                PITIA).
              </li>
            </ul>
            <p>
              For our $250k example: 1.875 × $665 = $1,247, plus $250 taxes,
              plus $150 insurance = $1,647. The full{" "}
              <Link
                href="/analyze" prefetch={false}
                className="text-primary font-semibold hover:underline"
              >
                TrueCap analyzer
              </Link>{" "}
              starts from a published rate benchmark and editable assumptions,
              asks you to enter a local tax bill or reviewed rate, layers in
              vacancy and reserves, and returns cash flow, DSCR, and a
              Buy Box fit in one pass.
            </p>

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              FAQ
            </h2>
            {FAQS.map((f) => (
              <div key={f.q}>
                <h3 className="text-xl font-bold text-foreground mt-6 mb-2">
                  {f.q}
                </h3>
                <p>{f.a}</p>
              </div>
            ))}

            <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
              The bottom line
            </h2>
            <p>
              PITI is the honest version of &quot;the payment&quot; — the loan
              plus the two ownership costs that ride with it — and on a rental
              it&apos;s the number your lender underwrites and the floor your
              rent has to clear. Estimate all four letters from your own
              purchase price (not the seller&apos;s old tax bill), remember
              taxes and insurance can change every year, and never confuse PITI with the
              all-in cost: vacancy, maintenance, reserves, and management still
              sit on top. Get PITI right and the rest of the underwrite —{" "}
              <Link
                href="/analyze" prefetch={false}
                className="text-primary font-semibold hover:underline"
              >
                DSCR
              </Link>
              , break-even, cash flow — falls into place.
            </p>
          </div>
        </article>
        <PostSources
          sources={[
            {
              title: "HUD Mortgagee Letter 2012-11, Clarification Regarding Title Approval at Conveyance",
              url: "https://www.hud.gov/sites/documents/12-11ml.pdf",
            },
            {
              title: "Fannie Mae Selling Guide B3-4.1-01, Minimum Reserve Requirements",
              url: "https://selling-guide.fanniemae.com/sel/b3-4.1-01/minimum-reserve-requirements",
            },
            {
              title: "U.S. Census Bureau, American Community Survey 2024 1-year, B25103 Median Real Estate Taxes Paid, by state",
              url: "https://data.census.gov/api/access/data/table?id=ACSDT1Y2024.B25103&g=010XX00US$0400000",
            },
            {
              title: "U.S. Census Bureau, American Community Survey 2024 1-year, B25077 Median Value (Dollars), by state",
              url: "https://data.census.gov/api/access/data/table?id=ACSDT1Y2024.B25077&g=010XX00US$0400000",
            },
            {
              title: "U.S. Census Bureau, American Community Survey 2019-2023 5-year, B25103 Median Real Estate Taxes Paid, New Jersey counties",
              url: "https://data.census.gov/api/access/data/table?id=ACSDT5Y2023.B25103&g=040XX00US34$0500000",
            },
            {
              title: "U.S. Census Bureau, American Community Survey 2019-2023 5-year, B25077 Median Value (Dollars), New Jersey counties",
              url: "https://data.census.gov/api/access/data/table?id=ACSDT5Y2023.B25077&g=040XX00US34$0500000",
            },
            {
              title: "U.S. Census Bureau, American Community Survey 2019-2023 5-year, B25103 Median Real Estate Taxes Paid, Illinois counties",
              url: "https://data.census.gov/api/access/data/table?id=ACSDT5Y2023.B25103&g=040XX00US17$0500000",
            },
            {
              title: "U.S. Census Bureau, American Community Survey 2019-2023 5-year, B25077 Median Value (Dollars), Illinois counties",
              url: "https://data.census.gov/api/access/data/table?id=ACSDT5Y2023.B25077&g=040XX00US17$0500000",
            },
            {
              title: "12 CFR 1024.17 (Regulation X), Escrow accounts",
              url: "https://www.ecfr.gov/current/title-12/chapter-X/part-1024/subpart-B/section-1024.17",
            },
            {
              title: "CFPB, What is an escrow or impound account?",
              url: "https://www.consumerfinance.gov/ask-cfpb/what-is-an-escrow-or-impound-account-en-140/",
            },
            {
              title: "Fannie Mae Selling Guide B2-1.1-01, Occupancy Types",
              url: "https://selling-guide.fanniemae.com/sel/b2-1.1-01/occupancy-types",
            },
            {
              title: "Freddie Mac, Maximum LTV/TLTV/HTLTV Ratio Requirements for Conforming and Super Conforming Mortgages",
              url: "https://sf.freddiemac.com/general/maximum-ltv-tltv-htltv-ratio-requirements-for-conforming-and-super-conforming-mortgages",
            },
            {
              title: "Fannie Mae Selling Guide B7-1-01, Provision of Mortgage Insurance",
              url: "https://selling-guide.fanniemae.com/sel/b7-1-01/provision-mortgage-insurance",
            },
            {
              title: "CFPB, When can I remove private mortgage insurance (PMI) from my loan?",
              url: "https://www.consumerfinance.gov/ask-cfpb/when-can-i-remove-private-mortgage-insurance-pmi-from-my-loan-en-202/",
            },
            {
              title: "U.S. Census Bureau, American Community Survey 2024 1-year, B25103 Median Real Estate Taxes Paid, United States",
              url: "https://data.census.gov/api/access/data/table?id=ACSDT1Y2024.B25103&g=010XX00US",
            },
            {
              title: "U.S. Census Bureau, American Community Survey 2024 1-year, B25077 Median Value (Dollars), United States",
              url: "https://data.census.gov/api/access/data/table?id=ACSDT1Y2024.B25077&g=010XX00US",
            },
          ]}
        />
        <RelatedContent kind="blog" slug={SLUG} title={TITLE} className="mt-10" />
        <RelatedBlogPosts currentSlug={SLUG} />
      </main>
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <NewsletterSignup variant="expanded" source="blog" />
      </div>
      <BlogStickyCta />
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
