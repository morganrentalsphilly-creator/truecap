/**
 * Backlog post — "How much money do you need to buy a rental property?"
 * (2026-08-02)
 *
 * Targets the total-capital question SERP:
 *   - "how much money do you need to buy a rental property"
 *   - "how much cash to buy a rental property"
 *   - "cash to close investment property"
 *   - "how much do I need to start investing in rental property"
 *
 * Deliberately the PARENT question, not a re-run of the two child posts
 * it links to: /blog/how-much-down-payment-investment-property owns the
 * down-payment tiers and /blog/closing-costs-investment-property owns
 * the closing line items. This one owns the sum — including the two
 * buckets the SERP incumbents omit (prepaids/escrow setup, and lender
 * reserves as money HELD rather than spent) — worked at three price
 * tiers, plus the house-hack path that beats all three on cash spent.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { BlogByline } from "@/components/marketing/blog-byline";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { RelatedContent } from "@/components/marketing/related-content";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";
import { ScrollX } from "@/components/ui/scroll-x";
import { Header } from "@/components/investcalc/header";
import { lastmodFor } from "@/lib/seo/lastmod";
import { JsonLd } from "@/components/seo/json-ld";
import { PostSources } from "@/components/blog/post-sources";

const SLUG = "how-much-money-to-buy-a-rental-property";
const TITLE =
  "How much money do you need to buy a rental property? Cash-to-close worked at $150K, $300K, and $500K";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP window.
// The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "How Much Money to Buy a Rental Property (2026)";
const DESCRIPTION =
  "A $150K, $300K, and $500K rental need about $50,700, $89,400, and $142,200 in cash — 1.4 to 1.7x the down payment. Full line-item math for each tier.";
const PUBLISHED_AT = "2026-08-02";
const MODIFIED_AT = lastmodFor("/blog/how-much-money-to-buy-a-rental-property") ?? PUBLISHED_AT;
const READING_TIME_MIN = 12;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "how much money do you need to buy a rental property",
    "how much cash to buy a rental property",
    "cash to close investment property",
    "how much money to start investing in rental property",
    "rental property down payment and closing costs",
    "investment property reserve requirements",
    "cheapest way to buy a rental property",
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
    q: "How much money do you need to buy a rental property?",
    a: "At 20% down and this article's hypothetical 7.25% investment-loan rate, budget 28-34% of the purchase price in total cash — roughly 1.4 to 1.7 times the down payment itself. A $150,000 rental works out to about $50,700 ($43,958 actually spent plus $6,786 of lender reserves you keep in the bank), a $300,000 rental to about $89,400, and a $500,000 rental to about $142,200. The multiple is highest on cheap houses because closing fees and make-ready costs are largely fixed dollars, not percentages.",
  },
  {
    q: "Can you buy a rental property with $30,000?",
    a: "Not as a straight 20%-down investment purchase in most markets — $30,000 is the down payment on a $150,000 house, and you still need roughly $21,000 more for closing costs, escrow setup, make-ready, and lender reserves. The owner-occupant path stretches it further: a 5%-down conventional loan on a $400,000 duplex needs about $59,000 all-in once Fannie Mae's six months of reserves are included, and FHA at 3.5% down needs less, so with $30,000 you are shopping a smaller two-unit you live in rather than a $150,000 rental you do not.",
  },
  {
    q: "How much do lenders require in reserves for an investment property?",
    a: "Fannie Mae requires six months of PITIA — principal, interest, taxes, insurance, and association dues — on an investment-property purchase. On a $300,000 rental with a $2,071 monthly PITIA that is $12,423 sitting in a verifiable account at closing. If you already carry other financed properties, add 2% of their combined unpaid principal balances (rising to 4% at five to six financed properties and 6% at seven to ten). Reserves are shown, not spent: the money stays yours.",
  },
  {
    q: "Do closing costs come on top of the down payment?",
    a: "Yes, and so do prepaids. Closing costs — origination, appraisal, underwriting, title, recording and transfer taxes, inspection — typically run 2-5% of the purchase price, per the CFPB. Escrow setup is separate again: prepaid interest to the end of the closing month, twelve months of hazard insurance, and an initial property-tax escrow deposit (taxes for the period before your first payment plus a cushion RESPA caps at two months), which together add another 1-2%. Your earnest-money deposit is not extra; it credits against the total at closing.",
  },
  {
    q: "Is 20% down enough for an investment property?",
    a: "On a single-family rental it clears the 15% minimum that Fannie Mae and Freddie Mac set for investment purchases (2-4 units need 25%), and it avoids the mortgage insurance required above 80% LTV. Whether it is enough to make the deal work is a different question. On a $300,000 house renting for $2,400 a month, 20% down produces a DSCR of 0.81 and loses $319 a month; break-even needs about 36% down. More down payment raises your cash requirement and, when the loan constant exceeds the cap rate, raises your cash-on-cash return too.",
  },
  {
    q: "What is the cheapest way to buy your first rental property?",
    a: "In cash actually spent, it is often a 2-4 unit you live in for a year. Owner-occupied financing takes 5% down conventional through automated underwriting (3.5% FHA) and avoids the extra loan-level price adjustments Fannie Mae applies to investment loans, though Fannie still requires six months of reserves on a 2-4 unit principal residence. A $400,000 duplex on that structure needs about $39,400 of cash actually spent (less than a $150,000 single-family rental's $44,000) plus about $19,600 of reserves, and in this article's example the tenant's rent covers almost half of your own housing payment.",
  },
  {
    q: "How much cash do I need for a rental that actually cash flows?",
    a: "Work backwards from the debt service the property can support. Our $150,000 example nets $10,704 of NOI and clears $73 a month at 20% down; getting to $300 a month means shrinking debt service by $227, which at 7.25% takes about $33,275 more down — $82,700 of total cash for a $3,600-a-year return, a 4.7% cash-on-cash. Cash-flow targets are bought with capital, and the price of each extra dollar of monthly cash flow is worth checking before you set the target.",
  },
];

export default function BlogPost() {
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/blog/${SLUG}`;

  const blogPostingLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
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
    <div className="min-h-screen bg-background">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={blogPostingLd} />
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={faqLd} />

      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-8 sm:mb-10">
          <Link
            href="/blog"
            className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground"
          >
            ← Blog
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 leading-tight text-balance">
            {TITLE}
          </h1>
          <p className="text-2xs uppercase tracking-widest text-muted-foreground font-bold mt-3">
            {new Date(PUBLISHED_AT).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}{" "}
            · {READING_TIME_MIN} min read
          </p>
          <BlogByline />
          <p className="text-base sm:text-lg text-muted-foreground mt-4 leading-relaxed">
            {DESCRIPTION}
          </p>
        </header>

        <article className="prose prose-slate max-w-none [&>p]:max-w-[68ch] [&>ul]:max-w-[68ch] [&>ol]:max-w-[68ch] [&>blockquote]:max-w-[68ch] [&>h2]:max-w-[68ch] [&>h3]:max-w-[68ch] [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">
          <p>
            The short answer: at 20% down and a hypothetical 7.25%
            investment-loan rate, budget{" "}
            <strong>28% to 34% of the purchase price</strong> in
            total cash — which is roughly{" "}
            <strong>1.4 to 1.7 times the down payment itself</strong>. A
            $150,000 rental needs about $50,700. A $300,000 rental needs about
            $89,400. A $500,000 rental needs about $142,200.
          </p>
          <p>
            Many answers to this question stop at &ldquo;down payment plus 2-5%
            closing costs,&rdquo; which, in the three tiers below, leaves out
            about $15,000-$30,000 of prepaids, make-ready, and reserves. Two
            buckets often get left out: <strong>escrow setup and prepaids</strong>{" "}
            (a year of insurance and an initial tax deposit, funded in cash on
            closing day) and <strong>lender reserves</strong> (six months of
            payments you have to prove you hold). This post works all five
            buckets line by line at three price points, then does the part that
            often gets skipped — checks what that cash actually earns.
          </p>
          <p className="text-sm">
            <em>
              Assumptions used throughout: 30-year fixed at a hypothetical 7.25%
              investment-loan rate. For reference,{" "}
              <a
                href="https://fred.stlouisfed.org/series/MORTGAGE30US"
                className="text-primary font-semibold hover:underline"
              >
                Freddie Mac&apos;s weekly survey of primary-residence 30-year
                rates
              </a>{" "}
              averaged about 6.4–6.7% in June–July 2026 (7.03% on September 24,
              2026). Each additional 0.25 points of rate adds about $41 a month
              per $240,000 borrowed and about $250 to the reserve requirement,
              so at 7.75% a $300,000 purchase would cost roughly $82 more a month
              and about $500 more in reserves. Fees are illustrative assumptions,
              not quotes — your Loan Estimate is the only figure that binds.
            </em>
          </p>

          <h2 className="text-2xl sm:text-3xl">
            The five buckets — and the difference between cash spent and cash
            shown
          </h2>
          <p>
            Cash to buy a rental splits into five categories, and they are not
            interchangeable. Four are money that leaves your account forever.
            One is money you merely have to own.
          </p>
          <ol>
            <li>
              <strong>
                <Link
                  href="/glossary/down-payment"
                  className="text-primary font-semibold hover:underline"
                >
                  Down payment
                </Link>
              </strong>{" "}
              —{" "}
              <a
                href="https://sf.freddiemac.com/general/maximum-ltv-tltv-htltv-ratio-requirements-for-conforming-and-super-conforming-mortgages"
                className="text-primary font-semibold hover:underline"
              >
                15% minimum on a conventional single-family investment purchase,
                25% on 2-4 units
              </a>
              , and on a single-family 20% is the practical default because it{" "}
              <a
                href="https://selling-guide.fanniemae.com/sel/b7-1-01/provision-mortgage-insurance"
                className="text-primary font-semibold hover:underline"
              >
                avoids mortgage insurance
              </a>
              .{" "}
              <Link
                href="/blog/how-much-down-payment-investment-property"
                className="text-primary font-semibold hover:underline"
              >
                The full tier breakdown
              </Link>{" "}
              has its own post.
            </li>
            <li>
              <strong>
                <Link
                  href="/glossary/closing-costs"
                  className="text-primary font-semibold hover:underline"
                >
                  Closing costs
                </Link>
              </strong>{" "}
              — origination, appraisal, underwriting, title, settlement,
              recording, transfer tax, inspection.{" "}
              <a
                href="https://www.consumerfinance.gov/owning-a-home/prepare/figure-out-how-much-you-want-to-spend/"
                className="text-primary font-semibold hover:underline"
              >
                Typically 2-5% of the purchase price, per the CFPB
              </a>{" "}
              (2.5-3.6% in the examples below), and{" "}
              <Link
                href="/blog/closing-costs-investment-property"
                className="text-primary font-semibold hover:underline"
              >
                itemised here
              </Link>
              .
            </li>
            <li>
              <strong>Prepaids and escrow setup</strong> — prepaid interest from
              closing to month-end, twelve months of hazard insurance, and an
              initial property-tax deposit to seed the escrow account (enough to
              cover taxes for the period before your first payment, plus a
              cushion that federal RESPA rules{" "}
              <a
                href="https://www.ecfr.gov/current/title-12/chapter-X/part-1024/subpart-B/section-1024.17"
                className="text-primary font-semibold hover:underline"
              >
                cap at one-sixth of a year&apos;s escrow payments
              </a>
              ). Another 1-2% of price. This is the line that surprises
              first-time investors at the settlement table.
            </li>
            <li>
              <strong>Make-ready</strong> — paint, flooring, appliances, locks,
              cleaning, and whatever the inspection turned up, spent between
              closing and the first rent check. Not rehab in the BRRRR sense;
              just the cost of making a house rentable.
            </li>
            <li>
              <strong>Reserves</strong> —{" "}
              <a
                href="https://selling-guide.fanniemae.com/sel/b3-4.1-01/minimum-reserve-requirements"
                className="text-primary font-semibold hover:underline"
              >
                six months of PITIA that Fannie Mae requires
              </a>{" "}
              you to <em>document</em> on an investment purchase. You
              do not hand it over. You show a statement, and the money stays
              yours.
            </li>
          </ol>
          <p>
            That last distinction matters more than it sounds. Buckets 1-4 are
            your real basis in the deal and the correct denominator for{" "}
            <Link
              href="/glossary/cash-on-cash-return"
              className="text-primary font-semibold hover:underline"
            >
              cash-on-cash return
            </Link>
            . Bucket 5 is a liquidity test. But you still cannot buy the
            property without it, so any honest answer to &ldquo;how much money
            do I need&rdquo; has to include both — and then say which is which.
            The tables below do.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            Tier 1: a $150,000 rental in a cash-flow market
          </h2>
          <p>
            Entry-price single-family, the kind of stock that fills the Midwest
            and South —{" "}
            <Link
              href="/markets/cleveland"
              className="text-primary font-semibold hover:underline"
            >
              Cleveland
            </Link>{" "}
            and{" "}
            <Link
              href="/markets/indianapolis"
              className="text-primary font-semibold hover:underline"
            >
              Indianapolis
            </Link>{" "}
            both have plenty of it. Assume $1,650 rent, property taxes at 1.5%
            of value ($2,250), and insurance at $1,500. The loan is $120,000 at
            7.25%, which is $818.61 a month of principal and interest, so PITIA
            comes to <strong>$1,131 a month</strong>.
          </p>
          <ScrollX cue stickyFirstColumn label="Data table" className="not-prose overflow-x-auto rounded-xl border border-border bg-card my-6">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left p-3 font-bold text-foreground">
                    Line item
                  </th>
                  <th className="text-right p-3 font-bold text-foreground">
                    Amount
                  </th>
                  <th className="text-left p-3 font-bold text-foreground">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-3 [&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-0">
                <tr>
                  <td>Down payment (20%)</td>
                  <td className="font-mono text-right">$30,000</td>
                  <td>Loan of $120,000</td>
                </tr>
                <tr>
                  <td>Origination (1% of loan)</td>
                  <td className="font-mono text-right">$1,200</td>
                  <td>Negotiable at some lenders</td>
                </tr>
                <tr>
                  <td>Appraisal</td>
                  <td className="font-mono text-right">$650</td>
                  <td>Often paid upfront</td>
                </tr>
                <tr>
                  <td>Underwriting, processing, credit</td>
                  <td className="font-mono text-right">$900</td>
                  <td>Junk-fee territory</td>
                </tr>
                <tr>
                  <td>Lender title policy + settlement</td>
                  <td className="font-mono text-right">$1,400</td>
                  <td></td>
                </tr>
                <tr>
                  <td>Recording + transfer tax</td>
                  <td className="font-mono text-right">$600</td>
                  <td>Wildly state-dependent</td>
                </tr>
                <tr>
                  <td>Inspection</td>
                  <td className="font-mono text-right">$600</td>
                  <td>Spent before you own it</td>
                </tr>
                <tr>
                  <td>Prepaid interest (15 days)</td>
                  <td className="font-mono text-right">$358</td>
                  <td>Depends on closing date</td>
                </tr>
                <tr>
                  <td>Hazard insurance (12 months)</td>
                  <td className="font-mono text-right">$1,500</td>
                  <td>Paid in full at closing</td>
                </tr>
                <tr>
                  <td>Initial tax escrow deposit (4 months)</td>
                  <td className="font-mono text-right">$750</td>
                  <td></td>
                </tr>
                <tr>
                  <td>Make-ready before first tenant</td>
                  <td className="font-mono text-right">$6,000</td>
                  <td>Paint, floors, appliances</td>
                </tr>
                <tr className="bg-muted/30">
                  <td className="font-bold">Cash actually spent</td>
                  <td className="font-mono text-right font-bold">$43,958</td>
                  <td>Your basis in the deal</td>
                </tr>
                <tr>
                  <td>Reserves (6 × $1,131 PITIA)</td>
                  <td className="font-mono text-right">$6,786</td>
                  <td>Shown, not spent</td>
                </tr>
                <tr className="bg-muted/30">
                  <td className="font-bold">Total cash required</td>
                  <td className="font-mono text-right font-bold">$50,744</td>
                  <td>33.8% of price</td>
                </tr>
              </tbody>
            </table>
          </ScrollX>
          <p>
            Note what the reserve is quietly doing: if the house sits empty for
            a month while you finish the make-ready, that $1,131 comes out of
            the reserve. That is the reserve&apos;s job, which is why this table
            does not budget a separate vacancy fund on top — double-counting it
            would inflate the answer by another $2,000-$3,000.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            Tier 2: a $300,000 rental in a balanced metro
          </h2>
          <p>
            Mid-priced single-family, taxes at 1.1% ($3,300), insurance $1,900,
            rent $2,400. Loan of $240,000 at 7.25% is $1,637.23 a month, and
            PITIA is <strong>$2,071</strong>.
          </p>
          <ScrollX cue stickyFirstColumn label="Data table" className="not-prose overflow-x-auto rounded-xl border border-border bg-card my-6">
            <table className="w-full min-w-[440px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left p-3 font-bold text-foreground">
                    Bucket
                  </th>
                  <th className="text-right p-3 font-bold text-foreground">
                    Amount
                  </th>
                  <th className="text-right p-3 font-bold text-foreground">
                    % of price
                  </th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-3 [&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-0">
                <tr>
                  <td>Down payment (20%)</td>
                  <td className="font-mono text-right">$60,000</td>
                  <td className="font-mono text-right">20.0%</td>
                </tr>
                <tr>
                  <td>Closing costs</td>
                  <td className="font-mono text-right">$8,250</td>
                  <td className="font-mono text-right">2.8%</td>
                </tr>
                <tr>
                  <td>Prepaids + escrow setup</td>
                  <td className="font-mono text-right">$3,715</td>
                  <td className="font-mono text-right">1.2%</td>
                </tr>
                <tr>
                  <td>Make-ready</td>
                  <td className="font-mono text-right">$5,000</td>
                  <td className="font-mono text-right">1.7%</td>
                </tr>
                <tr className="bg-muted/30">
                  <td className="font-bold">Cash actually spent</td>
                  <td className="font-mono text-right font-bold">$76,965</td>
                  <td className="font-mono text-right font-bold">25.7%</td>
                </tr>
                <tr>
                  <td>Reserves (6 × $2,071)</td>
                  <td className="font-mono text-right">$12,423</td>
                  <td className="font-mono text-right">4.1%</td>
                </tr>
                <tr className="bg-muted/30">
                  <td className="font-bold">Total cash required</td>
                  <td className="font-mono text-right font-bold">$89,388</td>
                  <td className="font-mono text-right font-bold">29.8%</td>
                </tr>
              </tbody>
            </table>
          </ScrollX>
          <p>
            Closing costs here break down as $2,400 origination, $750 appraisal,
            $1,000 underwriting and processing, $2,200 title and settlement,
            $1,300 recording and transfer, $600 inspection. Prepaids are $715 of
            interest, $1,900 of insurance, and $1,100 of tax escrow. Run your
            own county&apos;s transfer taxes through the{" "}
            <Link
              href="/tools/closing-cost-calculator"
              className="text-primary font-semibold hover:underline"
            >
              closing cost calculator
            </Link>{" "}
            — recording and transfer is a line that varies widely between
            states and counties, so check your own jurisdiction&apos;s recording
            and transfer-tax rates.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            Tier 3: a $500,000 rental in a high-price metro
          </h2>
          <p>
            Taxes at 1.0% ($5,000), insurance $2,600. Loan of $400,000 at 7.25%
            is $2,728.72 a month; PITIA is <strong>$3,362</strong>.
          </p>
          <ScrollX cue stickyFirstColumn label="Data table" className="not-prose overflow-x-auto rounded-xl border border-border bg-card my-6">
            <table className="w-full min-w-[440px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left p-3 font-bold text-foreground">
                    Bucket
                  </th>
                  <th className="text-right p-3 font-bold text-foreground">
                    Amount
                  </th>
                  <th className="text-right p-3 font-bold text-foreground">
                    % of price
                  </th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-3 [&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-0">
                <tr>
                  <td>Down payment (20%)</td>
                  <td className="font-mono text-right">$100,000</td>
                  <td className="font-mono text-right">20.0%</td>
                </tr>
                <tr>
                  <td>Closing costs</td>
                  <td className="font-mono text-right">$12,600</td>
                  <td className="font-mono text-right">2.5%</td>
                </tr>
                <tr>
                  <td>Prepaids + escrow setup</td>
                  <td className="font-mono text-right">$5,459</td>
                  <td className="font-mono text-right">1.1%</td>
                </tr>
                <tr>
                  <td>Make-ready</td>
                  <td className="font-mono text-right">$4,000</td>
                  <td className="font-mono text-right">0.8%</td>
                </tr>
                <tr className="bg-muted/30">
                  <td className="font-bold">Cash actually spent</td>
                  <td className="font-mono text-right font-bold">$122,059</td>
                  <td className="font-mono text-right font-bold">24.4%</td>
                </tr>
                <tr>
                  <td>Reserves (6 × $3,362)</td>
                  <td className="font-mono text-right">$20,172</td>
                  <td className="font-mono text-right">4.0%</td>
                </tr>
                <tr className="bg-muted/30">
                  <td className="font-bold">Total cash required</td>
                  <td className="font-mono text-right font-bold">$142,231</td>
                  <td className="font-mono text-right font-bold">28.4%</td>
                </tr>
              </tbody>
            </table>
          </ScrollX>

          <h2 className="text-2xl sm:text-3xl">
            The pattern: 1.4x to 1.7x your down payment
          </h2>
          <p>
            Line the three tiers up and the useful number falls out. It is not a
            percentage of price — it is a multiple of the down payment:
          </p>
          <ScrollX cue stickyFirstColumn label="Data table" className="not-prose overflow-x-auto rounded-xl border border-border bg-card my-6">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left p-3 font-bold text-foreground">
                    Price
                  </th>
                  <th className="text-right p-3 font-bold text-foreground">
                    Down (20%)
                  </th>
                  <th className="text-right p-3 font-bold text-foreground">
                    Total cash
                  </th>
                  <th className="text-right p-3 font-bold text-foreground">
                    % of price
                  </th>
                  <th className="text-right p-3 font-bold text-foreground">
                    × down
                  </th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-3 [&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-0">
                <tr>
                  <td>$150,000</td>
                  <td className="font-mono text-right">$30,000</td>
                  <td className="font-mono text-right">$50,744</td>
                  <td className="font-mono text-right">33.8%</td>
                  <td className="font-mono text-right">1.69×</td>
                </tr>
                <tr>
                  <td>$300,000</td>
                  <td className="font-mono text-right">$60,000</td>
                  <td className="font-mono text-right">$89,388</td>
                  <td className="font-mono text-right">29.8%</td>
                  <td className="font-mono text-right">1.49×</td>
                </tr>
                <tr>
                  <td>$500,000</td>
                  <td className="font-mono text-right">$100,000</td>
                  <td className="font-mono text-right">$142,231</td>
                  <td className="font-mono text-right">28.4%</td>
                  <td className="font-mono text-right">1.42×</td>
                </tr>
              </tbody>
            </table>
          </ScrollX>
          <p>
            The multiple shrinks as price rises, and the reason is worth
            internalising if you are shopping cheap houses:{" "}
            <strong>
              a meaningful share of the non-down-payment cash does not scale
              with price
            </strong>
            . Appraisal, inspection, and underwriting run $2,150 on the $150,000
            house and $2,700 on the $500,000 one. Make-ready runs the wrong way
            entirely — $6,000 on 1950s stock in a cash-flow market against
            $4,000 on newer, pricier inventory. Add it up and the cheap house
            carries <strong>$20,744</strong> of cash beyond the down payment, or
            69% of it, while the expensive house carries{" "}
            <strong>$42,231</strong>, or 42%. Make-ready alone is a fifth of the
            Tier 1 down payment and a twenty-fifth of the Tier 3 one.
          </p>
          <p>
            The practical consequence: if you have $50,000 and you are choosing
            between one $150,000 house and waiting for a $250,000 house, the
            $150,000 house does not leave you the change you expect. Model both
            in the{" "}
            <Link
              href="/tools/rental-property-spreadsheet"
              className="text-primary font-semibold hover:underline"
            >
              free rental property spreadsheet
            </Link>{" "}
            before you commit the earnest money.
          </p>

          <h2 className="text-2xl sm:text-3xl">What that cash actually buys</h2>
          <p>
            Here is where this post parts company with most of the answers on
            this question. Knowing you need $50,744 is only half of the
            decision; the other half is what $50,744 returns. Underwrite the
            Tier 1 house properly — 6% vacancy, 8% maintenance, 8% management,
            5%{" "}
            <Link
              href="/glossary/capex"
              className="text-primary font-semibold hover:underline"
            >
              capital reserves
            </Link>
            , plus the real tax and insurance bills:
          </p>
          <ul>
            <li>
              Gross rent: $1,650 × 12 = <strong>$19,800</strong>
            </li>
            <li>
              Operating expenses: $1,188 vacancy + $2,250 taxes + $1,500
              insurance + $1,584 maintenance + $1,584 management + $990 capex ={" "}
              <strong>$9,096</strong> (a 45.9% expense ratio)
            </li>
            <li>
              NOI: $19,800 − $9,096 = <strong>$10,704</strong>
            </li>
            <li>
              Debt service: $818.61 × 12 = <strong>$9,823</strong>
            </li>
            <li>
              Cash flow: <strong>+$881/year</strong> (+$73/month), and a{" "}
              <Link
                href="/glossary/dscr"
                className="text-primary font-semibold hover:underline"
              >
                DSCR
              </Link>{" "}
              of 1.09
            </li>
            <li>
              Cash-on-cash: $881 ÷ $43,958 = <strong>2.0%</strong>
            </li>
          </ul>
          <p>
            $50,744 of cash to earn $881 a year in cash flow. That is the honest
            arithmetic of a decent-but-not-special rental at a 7.25% rate, and it
            is why the total-cash question and the is-this-a-good-deal question
            have to be answered together. The 2.0% cash-on-cash excludes
            principal paydown (about $1,160 in year one), any appreciation, and
            the depreciation shield — real returns that a single-year cash-flow
            figure misses — but nobody should walk into this thinking $50,000
            buys a $500-a-month income stream.
          </p>
          <p>
            Tier 2 is blunter. At $300,000 and $2,400 rent, the same expense
            structure gives NOI of $15,824 against $19,647 of debt service:{" "}
            <strong>DSCR 0.81 and −$319 a month</strong>. The property does not
            cash flow at any conventional down payment tier — break-even needs a
            loan of about $193,300, which is <strong>36% down</strong>. That is
            not a defect in the example; a $300,000 house at $2,400 rent is a
            9.6% gross yield, and with this example&apos;s expenses and 20% down
            at 7.25%, break-even takes about an 11.3% gross yield (more on{" "}
            <Link
              href="/blog/what-is-a-good-rental-yield"
              className="text-primary font-semibold hover:underline"
            >
              what a good rental yield looks like
            </Link>
            ).
          </p>

          <h2 className="text-2xl sm:text-3xl">Does putting more down help?</h2>
          <p>
            It changes the cash requirement in the obvious direction and the
            return in a less obvious one. Same $300,000 house, three
            conventional tiers:
          </p>
          <ScrollX cue stickyFirstColumn label="Data table" className="not-prose overflow-x-auto rounded-xl border border-border bg-card my-6">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left p-3 font-bold text-foreground">
                    Down
                  </th>
                  <th className="text-right p-3 font-bold text-foreground">
                    Cash spent
                  </th>
                  <th className="text-right p-3 font-bold text-foreground">
                    Reserves
                  </th>
                  <th className="text-right p-3 font-bold text-foreground">
                    Total cash
                  </th>
                  <th className="text-right p-3 font-bold text-foreground">
                    DSCR
                  </th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-3 [&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-0">
                <tr>
                  <td>15% ($45,000)</td>
                  <td className="font-mono text-right">$62,160</td>
                  <td className="font-mono text-right">$14,440</td>
                  <td className="font-mono text-right">$76,600</td>
                  <td className="font-mono text-right">0.67</td>
                </tr>
                <tr>
                  <td>20% ($60,000)</td>
                  <td className="font-mono text-right">$76,965</td>
                  <td className="font-mono text-right">$12,423</td>
                  <td className="font-mono text-right">$89,388</td>
                  <td className="font-mono text-right">0.81</td>
                </tr>
                <tr>
                  <td>25% ($75,000)</td>
                  <td className="font-mono text-right">$91,770</td>
                  <td className="font-mono text-right">$11,809</td>
                  <td className="font-mono text-right">$103,579</td>
                  <td className="font-mono text-right">0.86</td>
                </tr>
              </tbody>
            </table>
          </ScrollX>
          <p>
            Three things in that table. First, 15% down is the worst of the
            three: it{" "}
            <a
              href="https://selling-guide.fanniemae.com/sel/b7-1-01/provision-mortgage-insurance"
              className="text-primary font-semibold hover:underline"
            >
              adds mortgage insurance
            </a>{" "}
            — budget roughly 1.1% of the loan balance a year as a planning
            assumption ($234 a month here; the lender&apos;s Loan Estimate shows
            the actual premium) — which is why
            the DSCR collapses to 0.67. Some lenders may set stricter limits than
            Fannie Mae&apos;s and Freddie Mac&apos;s{" "}
            <a
              href="https://sf.freddiemac.com/general/maximum-ltv-tltv-htltv-ratio-requirements-for-conforming-and-super-conforming-mortgages"
              className="text-primary font-semibold hover:underline"
            >
              85% maximum for a single-family investment purchase
            </a>
            . Second, the reserve requirement falls
            as you put more down, because reserves are six months of PITIA and
            PITIA shrinks; the total-cash line still rises, just less than the
            down payment does. Third, and least intuitive:{" "}
            <strong>
              more down payment raises cash-on-cash return on this deal
            </strong>
            . The loan constant at 7.25% over 30 years is 8.19% of the balance,
            against a 5.3% cap rate on a $300,000 purchase — the debt is costing
            more than the asset earns, so every borrowed dollar drags the return
            down. That is{" "}
            <Link
              href="/blog/negative-leverage-real-estate"
              className="text-primary font-semibold hover:underline"
            >
              negative leverage
            </Link>
            , and it applies whenever a deal&apos;s loan constant exceeds its cap
            rate, so check yours.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            The least cash spent: house-hack a duplex
          </h2>
          <p>
            If the honest answer to &ldquo;how much do I need&rdquo; is more
            than you have, the structural fix is not a cheaper house. It is
            owner-occupied financing. Live in one unit of a 2-4 unit for a year
            and two things change at once: the minimum down payment drops to{" "}
            <a
              href="https://sf.freddiemac.com/general/maximum-ltv-tltv-htltv-ratio-requirements-for-conforming-and-super-conforming-mortgages"
              className="text-primary font-semibold hover:underline"
            >
              5% conventional
            </a>{" "}
            through automated underwriting (manually underwritten loans
            require more) or{" "}
            <a
              href="https://www.hud.gov/sites/dfiles/OCHCO/documents/4000.1hsgh.pdf"
              className="text-primary font-semibold hover:underline"
            >
              3.5% FHA
            </a>
            , and the rate prices at primary-residence levels without the{" "}
            <a
              href="https://selling-guide.fanniemae.com/sel/b2-1.1-01/occupancy-types"
              className="text-primary font-semibold hover:underline"
            >
              extra loan-level price adjustments Fannie Mae applies to
              investment loans
            </a>
            . The reserve requirement does not necessarily shrink:{" "}
            <a
              href="https://selling-guide.fanniemae.com/sel/b3-4.1-01/minimum-reserve-requirements"
              className="text-primary font-semibold hover:underline"
            >
              Fannie Mae still requires six months of reserves on a 2-4 unit
              principal residence
            </a>
            .
          </p>
          <p>
            Take a $400,000 duplex at 5% down and an assumed 6.75%. The loan is
            $380,000, P&amp;I is $2,464.68, PMI (assumed at 0.8% of the
            balance) is $253 a month,
            taxes at 1.1% are $367, insurance is $183 — PITIA{" "}
            <strong>$3,268</strong>.
          </p>
          <ScrollX label="Data table" className="not-prose overflow-x-auto rounded-xl border border-border bg-card my-6">
            <table className="w-full text-sm [&_td:last-child]:whitespace-nowrap [&_td:last-child]:text-right [&_th:last-child]:text-right">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 font-bold text-foreground">
                    Bucket
                  </th>
                  <th className="text-right p-3 font-bold text-foreground">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-3 [&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-0">
                <tr>
                  <td>Down payment (5%)</td>
                  <td className="font-mono text-right">$20,000</td>
                </tr>
                <tr>
                  <td>Closing costs</td>
                  <td className="font-mono text-right">$11,700</td>
                </tr>
                <tr>
                  <td>Prepaids + escrow setup</td>
                  <td className="font-mono text-right">$4,721</td>
                </tr>
                <tr>
                  <td>Make-ready</td>
                  <td className="font-mono text-right">$3,000</td>
                </tr>
                <tr className="bg-muted/30">
                  <td className="font-bold">Cash actually spent</td>
                  <td className="font-mono text-right font-bold">$39,421</td>
                </tr>
                <tr>
                  <td>Reserves (6 × $3,268)</td>
                  <td className="font-mono text-right">$19,608</td>
                </tr>
                <tr className="bg-muted/30">
                  <td className="font-bold">Total cash required</td>
                  <td className="font-mono text-right font-bold">$59,029</td>
                </tr>
              </tbody>
            </table>
          </ScrollX>
          <p>
            <strong>
              A $400,000 two-unit takes less cash actually spent than a $150,000
              single-family rental
            </strong>{" "}
            — $39,421 against $43,958 — because the down-payment percentage does
            more work than the price does, though with Fannie Mae&apos;s six
            months of reserves its total cash required (about $59,000) is
            higher. And the tenant pays down your own
            housing cost while you are there: at $1,500 for the other unit, your
            effective monthly housing expense is $1,768 instead of $3,268. Size
            your own version in the{" "}
            <Link
              href="/analyze?strategy=house-hack"
              prefetch={false}
              className="text-primary font-semibold hover:underline"
            >
              analyzer in House Hack mode
            </Link>
            , and read{" "}
            <Link
              href="/blog/house-hacking-explained"
              className="text-primary font-semibold hover:underline"
            >
              the strategy walkthrough
            </Link>{" "}
            for the occupancy rules and the one-year exit.
          </p>
          <p>
            FHA at 3.5% goes lower still — $14,000 down on the same duplex — but
            the trade-offs are real:{" "}
            <a
              href="https://www.hud.gov/sites/dfiles/OCHCO/documents/2023-05hsgml.pdf"
              className="text-primary font-semibold hover:underline"
            >
              1.75% upfront mortgage insurance, annual MIP that never drops off
              above 90% LTV
            </a>
            ,{" "}
            <a
              href="https://www.hud.gov/news/hud-no-25-145"
              className="text-primary font-semibold hover:underline"
            >
              county loan limits
            </a>{" "}
            that can bind
            on two-to-four-unit properties in expensive metros, and an appraisal
            process sellers dislike in competitive markets. It is the right tool
            when the down payment is genuinely the binding constraint, and the
            wrong one when it is not.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            DSCR loans and all-cash: how the number moves
          </h2>
          <p>
            <strong>DSCR loans</strong> use property coverage instead of
            personal DTI as the primary ratio under many programs, while still
            applying borrower and property requirements. They do not necessarily
            reduce the cash requirement: leverage, reserves, points, rate, and
            prepayment terms are quote- and program-specific. Run the Tier 2
            house with the actual written term sheet rather than assuming a
            standard premium or reserve requirement.{" "}
            <Link
              href="/blog/how-to-calculate-dscr#dscr-loans"
              className="text-primary font-semibold hover:underline"
            >
              The DSCR-loan mechanics
            </Link>{" "}
            are worth reading before you assume the easier qualification is
            free, and the free{" "}
            <Link
              href="/analyze" prefetch={false}
              className="text-primary font-semibold hover:underline"
            >
              TrueCap analyzer
            </Link>{" "}
            will tell you whether the property clears 1.20 before you pay for an
            appraisal.
          </p>
          <p>
            <strong>All cash</strong> is the other end. On the Tier 1 house:
            $150,000 purchase, no origination or appraisal or prepaid interest
            or escrow setup because there is no lender, so closing shrinks to
            roughly $2,600 (title, settlement, recording, inspection), plus
            $6,000 make-ready — about <strong>$158,600</strong>. There is no
            reserve requirement because there is nobody to show it to, which is
            exactly why you should hold one anyway; six months of taxes,
            insurance, and vacancy is around $3,000. The return picture inverts:
            $10,704 of NOI on $158,600 is a <strong>6.7% cash-on-cash</strong> —
            three times the levered figure — with no debt service and no DSCR to
            speak of, since coverage is undefined when the payment is zero.
          </p>

          <h2 className="text-2xl sm:text-3xl">Reserves, properly</h2>
          <p>
            The reserve rule catches people on their second and third purchase,
            not their first. Fannie Mae wants six months of PITIA on the subject
            investment property — and if you already carry other financed
            properties, an additional{" "}
            <a
              href="https://selling-guide.fanniemae.com/sel/b3-4.1-01/minimum-reserve-requirements"
              className="text-primary font-semibold hover:underline"
            >
              <strong>2% of their combined unpaid principal balances</strong>
            </a>
            , escalating to 4% at five to six financed properties and 6% at
            seven to ten.
          </p>
          <p>
            Concretely: you own two rentals with $310,000 of combined mortgage
            balances and you are buying the Tier 2 house. Your reserve
            requirement is $12,423 for the new loan <em>plus</em> $6,200 for the
            existing two — $18,623 documented, pushing total cash on that
            purchase to roughly $95,600. That escalator is one quiet reason a
            fourth or fifth conventional rental gets harder than the second, and
            one reason portfolio investors look at DSCR and commercial loans.
          </p>
          <p>
            Two practical notes.{" "}
            <a
              href="https://selling-guide.fanniemae.com/sel/b3-4.3-03/retirement-accounts"
              className="text-primary font-semibold hover:underline"
            >
              Retirement accounts can count toward reserves without being
              withdrawn
            </a>
            : Fannie Mae counts vested funds, and{" "}
            <a
              href="https://selling-guide.fanniemae.com/sel/b3-4.3-01/stocks-stock-options-bonds-and-mutual-funds"
              className="text-primary font-semibold hover:underline"
            >
              100% of the value of stock, bond and mutual-fund assets used for
              reserves
            </a>
            . Ask your lender how
            it will value your account. And treat the lender minimum as a floor, not a target: six months of
            PITIA does not cover a $9,000 roof, and the{" "}
            <Link
              href="/blog/capex-maintenance-reserves-rental-property"
              className="text-primary font-semibold hover:underline"
            >
              capex reserve math
            </Link>{" "}
            argues for holding more.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            The cost of the deals you do not buy
          </h2>
          <p>
            One line item that rarely appears in the answers to this question:
            money spent on properties you walk away from. Inspection and
            appraisal fees, which{" "}
            <a
              href="https://myhome.freddiemac.com/blog/homebuying/what-are-closing-costs-and-how-much-will-i-pay"
              className="text-primary font-semibold hover:underline"
            >
              vary with the home&apos;s size, value and location
            </a>
            , are usually paid upfront and are not refundable when the
            inspection turns up a foundation problem or the appraisal comes in
            $20,000 light. Each deal that falls through can cost you those fees
            again, on top of everything above.
          </p>
          <p>
            Earnest money is the opposite — a common false worry. It is not
            additional cash; it credits against your total at closing, so a
            $3,000 deposit reduces what you wire at settlement by $3,000.{" "}
            <a
              href="https://www.consumerfinance.gov/consumer-tools/mortgages/answers/key-terms/"
              className="text-primary font-semibold hover:underline"
            >
              Whether you can lose it depends on your purchase contract
            </a>
            : if the contract is terminated for a permissible reason, such as a
            contingency it includes, the deposit is returned, but if you do not
            perform in good faith it may be forfeited to the seller.
          </p>
          <p>
            The cheap defence against both is arithmetic before offers.
            Underwriting a listing takes about a minute in the{" "}
            <Link
              href="/analyze" prefetch={false}
              className="text-primary font-semibold hover:underline"
            >
              TrueCap analyzer
            </Link>
            , and the whole point is to spend $0 discovering that a deal misses
            by $300 a month rather than $1,300 discovering it at the inspection.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            Working backwards from a cash-flow target
          </h2>
          <p>
            The more useful version of this question is often inverted:{" "}
            <em>
              how much cash do I need for a rental that clears $300 a month?
            </em>{" "}
            That has an arithmetic answer. At 7.25% over 30 years, every $1,000
            of loan costs $6.82 a month, so every $1,000 you add to the down
            payment buys $6.82 of monthly cash flow.
          </p>
          <p>
            The Tier 1 house clears $73 a month at 20% down. Getting to $300
            means removing $227 of monthly debt service, which takes $227 ÷
            $6.82 = <strong>$33,275 more down</strong> — a $63,275 down payment,
            or 42% of price. Total cash rises to about <strong>$82,700</strong>{" "}
            (the reserve requirement falls to $5,425 as PITIA drops to $904).
            The return: $3,604 a year on $77,233 of spent cash, a{" "}
            <strong>4.7% cash-on-cash</strong> — better than the 2.0% at 20%
            down, because of the negative leverage above.
          </p>
          <p>
            That is the trade this question is really about. $300 a month of
            cash flow on a $150,000 house costs $32,000 more of capital than $73
            a month does. Whether that is a good use of $32,000 depends on what
            else the money can do — which is a portfolio question, not a
            property question, and a reason to weigh total return rather than
            monthly cash flow alone.
          </p>

          <h2 className="text-2xl sm:text-3xl">The checklist</h2>
          <ol>
            <li>
              <strong>Start from the multiple, not the percentage.</strong>{" "}
              In these examples, 1.4-1.7× the intended down payment is the
              number to have available, and closer to 1.7× under $200,000.
            </li>
            <li>
              <strong>Separate spent from shown.</strong> Reserves stay yours;
              they belong in the &ldquo;can I qualify&rdquo; column, not the
              cash-on-cash denominator.
            </li>
            <li>
              <strong>Get a Loan Estimate before you get attached.</strong>{" "}
              Origination, transfer taxes, and title vary enough between lenders
              and states to move total cash meaningfully, so compare Loan
              Estimates before you commit to a purchase.
            </li>
            <li>
              <strong>Budget the make-ready with the roof in mind.</strong> A
              20-year-old roof and a 2006 furnace are not make-ready items —
              they are next year&apos;s reserve draw.
            </li>
            <li>
              <strong>Underwrite before you shop.</strong> The cash figure is
              easy; whether the deal covers its own payment is the question that
              decides the outcome. Check the{" "}
              <Link
                href="/tools/mortgage-payment-calculator"
                className="text-primary font-semibold hover:underline"
              >
                payment
              </Link>{" "}
              and the coverage first.
            </li>
          </ol>
          <p>
            More on the financing side of the decision in the{" "}
            <Link
              href="/blog/topics/financing"
              className="text-primary font-semibold hover:underline"
            >
              rental property financing guide
            </Link>{" "}
            — down payment tiers,{" "}
            <Link
              href="/blog/piti-explained-rental-property"
              className="text-primary font-semibold hover:underline"
            >
              PITIA
            </Link>
            , DSCR loans, points, and the refinance exit.
          </p>

          <div className="not-prose"></div>

          <h2 className="text-2xl sm:text-3xl">FAQ</h2>
          {FAQS.map((f, i) => (
            <details
              key={i}
              className="not-prose bg-card border border-border rounded-xl p-4 sm:p-5 mb-3"
            >
              <summary className="cursor-pointer font-bold text-foreground">
                {f.q}
              </summary>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {f.a}
              </p>
            </details>
          ))}
        </article>
        <PostSources
          sources={[
            {
              title: "FRED, 30-Year Fixed Rate Mortgage Average in the United States (Freddie Mac PMMS)",
              url: "https://fred.stlouisfed.org/series/MORTGAGE30US",
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
              title: "CFPB Owning a Home, Figure out how much you want to spend",
              url: "https://www.consumerfinance.gov/owning-a-home/prepare/figure-out-how-much-you-want-to-spend/",
            },
            {
              title: "12 CFR 1024.17 (Regulation X), Escrow accounts",
              url: "https://www.ecfr.gov/current/title-12/chapter-X/part-1024/subpart-B/section-1024.17",
            },
            {
              title: "Fannie Mae Selling Guide B3-4.1-01, Minimum Reserve Requirements",
              url: "https://selling-guide.fanniemae.com/sel/b3-4.1-01/minimum-reserve-requirements",
            },
            {
              title: "HUD Handbook 4000.1, FHA Single Family Housing Policy Handbook",
              url: "https://www.hud.gov/sites/dfiles/OCHCO/documents/4000.1hsgh.pdf",
            },
            {
              title: "Fannie Mae Selling Guide B2-1.1-01, Occupancy Types",
              url: "https://selling-guide.fanniemae.com/sel/b2-1.1-01/occupancy-types",
            },
            {
              title: "HUD Mortgagee Letter 2023-05, Reduction of FHA Annual Mortgage Insurance Premium Rates",
              url: "https://www.hud.gov/sites/dfiles/OCHCO/documents/2023-05hsgml.pdf",
            },
            {
              title: "HUD No. 25-145, 2026 FHA loan limits",
              url: "https://www.hud.gov/news/hud-no-25-145",
            },
            {
              title: "Fannie Mae Selling Guide B3-4.3-03, Retirement Accounts",
              url: "https://selling-guide.fanniemae.com/sel/b3-4.3-03/retirement-accounts",
            },
            {
              title: "Fannie Mae Selling Guide B3-4.3-01, Stocks, Stock Options, Bonds, and Mutual Funds",
              url: "https://selling-guide.fanniemae.com/sel/b3-4.3-01/stocks-stock-options-bonds-and-mutual-funds",
            },
            {
              title: "Freddie Mac My Home, What are closing costs and how much will I pay?",
              url: "https://myhome.freddiemac.com/blog/homebuying/what-are-closing-costs-and-how-much-will-i-pay",
            },
            {
              title: "CFPB, Mortgage key terms",
              url: "https://www.consumerfinance.gov/consumer-tools/mortgages/answers/key-terms/",
            },
          ]}
        />
        <RelatedContent kind="blog" slug={SLUG} title={TITLE} className="mt-10" />

        <RelatedBlogPosts currentSlug={SLUG} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <NewsletterSignup variant="expanded" source="blog" />
        </div>

        <footer className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Related:{" "}
            <Link
              href="/blog/how-much-down-payment-investment-property"
              className="font-bold text-foreground hover:underline"
            >
              How much down payment for an investment property? →
            </Link>{" "}
            ·{" "}
            <Link
              href="/blog/closing-costs-investment-property"
              className="font-bold text-foreground hover:underline"
            >
              Closing costs on an investment property →
            </Link>
          </p>
        </footer>
      </main>
      <BlogStickyCta />
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
