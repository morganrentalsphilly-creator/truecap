/**
 * Backlog post — "Is a duplex a good investment?" (2026-08-05)
 *
 * Targets the question SERP:
 *   - "is a duplex a good investment"
 *   - "is buying a duplex a good investment"
 *   - "duplex vs single family investment"
 *   - "duplex investment pros and cons"
 *
 * The SERP is pros-and-cons prose from an insurance agency, a turnkey
 * seller, a fintech lender, and two agent blogs. Not one of them prices
 * the fact that a duplex held as a PURE rental needs 25% down against
 * 15-20% for a single-family, while the same building owner-occupied
 * needs 5% — which is the entire answer to the question. This post
 * underwrites one $400,000 duplex down both paths side by side, then
 * runs it against a same-priced single-family.
 *
 * Deliberately distinct from its two nearest siblings:
 *   /blog/single-family-vs-multi-family-rental owns the property-type
 *   comparison in general (including 5+ units); /blog/house-hack-underwriting-guide
 *   owns the live-there-vs-rent housing decision. This one owns the
 *   duplex-specific capital-structure fork.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { BlogByline } from "@/components/marketing/blog-byline";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "is-a-duplex-a-good-investment";
const TITLE =
  "Is a duplex a good investment? The same $400,000 building, underwritten as a rental and as a house hack";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP window.
// The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Is a Duplex a Good Investment? (2026 Math)";
const DESCRIPTION =
  "The same $400,000 duplex needs $138,140 of cash as a pure rental and loses $277 a month, or $44,990 owner-occupied. Both paths worked line by line.";
const PUBLISHED_AT = "2026-08-05";
const MODIFIED_AT = "2026-08-05";
const READING_TIME_MIN = 13;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "is a duplex a good investment",
    "is buying a duplex a good investment",
    "duplex vs single family investment",
    "duplex investment pros and cons",
    "duplex down payment investment property",
    "duplex cash flow",
    "house hack duplex math",
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
  twitter: {
    card: "summary_large_image",
    title: SERP_TITLE,
    description: DESCRIPTION,
    images: ["/home.jpg"],
  },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "Is a duplex a good investment?",
    a: "It depends almost entirely on whether you live in one unit. Owner-occupied, a duplex is one of the best-structured purchases available to an individual investor: 5% down conventional (3.5% FHA), primary-residence pricing, and a tenant covering roughly half your housing payment. As a pure rental it is a harder deal, because conventional financing requires 25% down on a 2-4 unit investment purchase against 15-20% on a single-family. Our $400,000 example needs $44,990 of cash the first way and $138,140 the second, for the same building and the same rents.",
  },
  {
    q: "How much down payment do you need for a duplex?",
    a: "Three different numbers depending on occupancy. Non-owner-occupied conventional: 25% minimum on a 2-4 unit purchase — there is no 15% or 20% tier the way there is for a single-family investment property. Owner-occupied conventional: 5% since Fannie Mae extended the low-down-payment option to 2-4 units. Owner-occupied FHA: 3.5%, with a 2026 two-unit loan limit of $693,050 in standard-cost areas and more in high-cost counties. The 20-point spread between the investment and owner-occupied tiers is the single largest variable in whether a duplex works.",
  },
  {
    q: "Is a duplex better than a single-family rental?",
    a: "On yield, usually yes; on liquidity, no. Our $400,000 duplex rents for $3,200 a month against $2,600 for a same-priced single-family — a 9.6% gross yield versus 7.8% — which produces a 5.31% cap rate against 4.09% and a DSCR of 0.86 against 0.63. The duplex reaches break-even cash flow with about $141,000 down; the single-family needs $200,000. The duplex gives that back at the exit: your buyer pool is investors and house hackers rather than every family in the metro.",
  },
  {
    q: "Does a duplex cash flow with 5% down?",
    a: "Not once you move out. Our $400,000 duplex at 5% down carries a $380,000 loan at 6.75% plus $253 a month of PMI — $32,616 a year of debt service against $20,932 of NOI when both units are rented, so it loses $974 a month as a pure rental. That is the year-2 problem nobody mentions: the loan that made the purchase possible makes the rental unprofitable. Break-even needs the loan down to about $269,000, which is 33% down at purchase, or roughly fifteen years of 3% rent growth if you buy at 5% and wait.",
  },
  {
    q: "What are the real downsides of buying a duplex?",
    a: "Four, in order of how much money they cost. The 25% down payment requirement on an investment purchase; a comps-based appraisal that caps value growth, because properties under five units are valued on sales comparison rather than on income, so raising rents does not raise the appraised value; a thinner resale buyer pool, which shows up as longer days on market and a softer price; and tenant proximity, which is a genuine cost if you live there — the shared wall means you hear the problems and the tenant knows where you live.",
  },
  {
    q: "Do duplexes appreciate as well as single-family homes?",
    a: "In the same neighborhood they generally track the residential comp set, because a 2-4 unit is appraised the same way a house is. What you do not get is the income-approach upside: on a five-unit or larger property, adding $6,000 of NOI at a 6% cap rate adds $100,000 of value. On a duplex it adds nothing to the appraisal — the appraiser is looking at what other duplexes sold for. If your plan is to force value through operations, that plan needs five units, not two.",
  },
  {
    q: "Is a duplex a good first investment property?",
    a: "It is the best first purchase for most people, provided you live in it for the required year. You get an owner-occupied down payment on a property that produces income, you learn tenant management with one tenant instead of none or five, and a 6.75% primary-residence rate stays with the loan after you leave. The trap is treating the 5%-down version as a rental the moment you move out — plan the refinance, the extra principal, or the sale before you sign, not after.",
  },
  {
    q: "How much does a duplex save on expenses versus two houses?",
    a: "About $1,800 a year on our example, or roughly 5% of gross rent — worth about half a point of cap rate. One landlord policy at $2,400 instead of two at $1,700 saves $1,000; one lawn and snow contract instead of two saves $600; one 1,600-square-foot roof at $12,000 instead of two 1,000-foot roofs at $9,000 each is about $240 a year amortised. Property taxes do not shrink, because they follow assessed value, and that is where most people expect the saving to come from.",
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
    author: {
      "@type": "Person",
      "@id": `${siteUrl}/about#morgan`,
      name: "Morgan Page",
      url: `${siteUrl}/about`,
    },
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
        item: `${siteUrl}/`,
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-8 sm:mb-10">
          <Link
            href="/blog"
            className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
          >
            ← TrueCap Blog
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 leading-tight text-balance">
            {TITLE}
          </h1>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mt-3">
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

        <article className="prose prose-slate max-w-none [&_p]:leading-relaxed [&_p]:text-foreground [&_h2]:font-extrabold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_li]:text-foreground [&_li]:leading-relaxed [&_strong]:text-foreground">
          <p>
            &ldquo;Is a duplex a good investment&rdquo; is the wrong question by
            one word. A duplex is not one investment; it is two, and which one
            you get is decided by a single line on the loan application:{" "}
            <strong>do you live there?</strong>
          </p>
          <p>
            The gap is not marginal. Conventional financing requires{" "}
            <strong>25% down</strong> on a 2-4 unit investment purchase — there
            is no 15% or 20% tier the way there is for a single-family rental —
            while the same building owner-occupied takes{" "}
            <strong>5% down</strong> conventional or 3.5% FHA, at
            primary-residence pricing roughly half a point cheaper. Run one
            $400,000 duplex down both paths and the capital requirement is{" "}
            <strong>$138,140</strong> against <strong>$44,990</strong>. Same
            roof, same tenants, same rents. Three times the money.
          </p>
          <p>
            Every pros-and-cons article on this question lists &ldquo;two income
            streams&rdquo; and &ldquo;you can use an FHA loan.&rdquo; None of
            them prices the fork. This post does: the full underwrite of one
            duplex both ways, the year-2 problem that catches 5%-down buyers,
            and a head-to-head against a same-priced single-family where the
            duplex wins on yield and loses on exit.
          </p>
          <p className="text-sm">
            <em>
              Rate assumptions throughout: 7.25% on the investment loans and
              6.75% on the owner-occupied ones, which is the early-August-2026
              spread (roughly 6.65-6.875% on a primary residence, plus the
              0.50-0.75 point investor surcharge). PMI is modelled at 0.8% of
              the loan balance a year. Fees are typical, not quoted — your Loan
              Estimate is the only figure that binds.
            </em>
          </p>

          <h2 className="text-2xl sm:text-3xl">
            The building we are underwriting
          </h2>
          <p>
            One duplex, priced and rented like real inventory in a balanced
            metro — the kind of two-unit stock that fills whole neighbourhoods
            in{" "}
            <Link
              href="/markets/philadelphia"
              className="text-primary font-semibold hover:underline"
            >
              Philadelphia
            </Link>{" "}
            and{" "}
            <Link
              href="/markets/kansas-city"
              className="text-primary font-semibold hover:underline"
            >
              Kansas City
            </Link>
            . Both paths below use identical property facts, so every difference
            in the results comes from the financing.
          </p>
          <div className="not-prose overflow-x-auto rounded-xl border border-border bg-card my-6">
            <table className="w-full min-w-[440px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 font-bold text-foreground">
                    Input
                  </th>
                  <th className="text-right p-3 font-bold text-foreground">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-3 [&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-0">
                <tr>
                  <td>Purchase price</td>
                  <td className="font-mono text-right">$400,000</td>
                </tr>
                <tr>
                  <td>Rent, per unit</td>
                  <td className="font-mono text-right">$1,600</td>
                </tr>
                <tr>
                  <td>Gross scheduled rent</td>
                  <td className="font-mono text-right">
                    $3,200/mo · $38,400/yr
                  </td>
                </tr>
                <tr>
                  <td>
                    <Link
                      href="/glossary/property-tax"
                      className="text-primary font-semibold hover:underline"
                    >
                      Property tax
                    </Link>{" "}
                    (1.1%)
                  </td>
                  <td className="font-mono text-right">$4,400/yr</td>
                </tr>
                <tr>
                  <td>
                    <Link
                      href="/glossary/insurance"
                      className="text-primary font-semibold hover:underline"
                    >
                      Insurance
                    </Link>
                  </td>
                  <td className="font-mono text-right">$2,400/yr</td>
                </tr>
                <tr>
                  <td>
                    <Link
                      href="/glossary/vacancy"
                      className="text-primary font-semibold hover:underline"
                    >
                      Vacancy
                    </Link>{" "}
                    / maintenance / management /{" "}
                    <Link
                      href="/glossary/capex"
                      className="text-primary font-semibold hover:underline"
                    >
                      capex
                    </Link>
                  </td>
                  <td className="font-mono text-right">6% / 8% / 8% / 5%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            $3,200 on $400,000 is a <strong>9.6% gross yield</strong>. Hold that
            number — it is the reason a duplex can survive a 25% down payment
            that would sink a single-family, and it is the first thing to check
            on any two-unit you are shown.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            Path A: the duplex as a pure rental
          </h2>
          <p>
            Non-owner-occupied, 25% down, 7.25% on a 30-year fixed. The loan is
            $300,000 and principal and interest are <strong>$2,046.53</strong> a
            month.
          </p>
          <div className="not-prose overflow-x-auto rounded-xl border border-border bg-card my-6">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 font-bold text-foreground">
                    Line
                  </th>
                  <th className="text-right p-3 font-bold text-foreground">
                    Annual
                  </th>
                  <th className="text-left p-3 font-bold text-foreground">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-3 [&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-0">
                <tr>
                  <td>Gross scheduled rent</td>
                  <td className="font-mono text-right">$38,400</td>
                  <td>2 × $1,600 × 12</td>
                </tr>
                <tr>
                  <td>Vacancy (6%)</td>
                  <td className="font-mono text-right">−$2,304</td>
                  <td>One month per unit per two years</td>
                </tr>
                <tr>
                  <td>Property tax</td>
                  <td className="font-mono text-right">−$4,400</td>
                  <td>One bill, one parcel</td>
                </tr>
                <tr>
                  <td>Insurance</td>
                  <td className="font-mono text-right">−$2,400</td>
                  <td>One landlord policy</td>
                </tr>
                <tr>
                  <td>Maintenance (8%)</td>
                  <td className="font-mono text-right">−$3,072</td>
                  <td></td>
                </tr>
                <tr>
                  <td>Management (8%)</td>
                  <td className="font-mono text-right">−$3,072</td>
                  <td>Two units, one address</td>
                </tr>
                <tr>
                  <td>Capex reserve (5%)</td>
                  <td className="font-mono text-right">−$1,920</td>
                  <td>Roof, HVAC, water heaters</td>
                </tr>
                <tr className="bg-muted/30">
                  <td className="font-bold">
                    <Link
                      href="/glossary/noi"
                      className="text-primary font-semibold hover:underline"
                    >
                      NOI
                    </Link>
                  </td>
                  <td className="font-mono text-right font-bold">$21,232</td>
                  <td>44.7% expense ratio</td>
                </tr>
                <tr>
                  <td>Debt service</td>
                  <td className="font-mono text-right">−$24,558</td>
                  <td>$2,046.53 × 12</td>
                </tr>
                <tr className="bg-muted/30">
                  <td className="font-bold">
                    <Link
                      href="/glossary/monthly-cash-flow"
                      className="text-primary font-semibold hover:underline"
                    >
                      Cash flow
                    </Link>
                  </td>
                  <td className="font-mono text-right font-bold">−$3,326</td>
                  <td>−$277/mo</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            That produces a <strong>5.31% </strong>
            <Link
              href="/glossary/cap-rate"
              className="text-primary font-semibold hover:underline"
            >
              cap rate
            </Link>
            , a{" "}
            <Link
              href="/glossary/dscr"
              className="text-primary font-semibold hover:underline"
            >
              DSCR
            </Link>{" "}
            of <strong>0.86</strong>, and a{" "}
            <Link
              href="/glossary/cash-on-cash-return"
              className="text-primary font-semibold hover:underline"
            >
              cash-on-cash return
            </Link>{" "}
            of <strong>−2.7%</strong>. A 0.86 DSCR does not clear a
            lender&apos;s 1.20 threshold, so on a DSCR loan this property would
            not qualify at 75% LTV at all — you would be pushed to 30-35% down
            before the coverage worked. Check yours in the free{" "}
            <Link
              href="/#main"
              className="text-primary font-semibold hover:underline"
            >
              TrueCap analyzer
            </Link>{" "}
            before you pay for an appraisal.
          </p>
          <p>And the cash to get there:</p>
          <div className="not-prose overflow-x-auto rounded-xl border border-border bg-card my-6">
            <table className="w-full min-w-[440px] text-sm">
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
                  <td>
                    <Link
                      href="/glossary/down-payment"
                      className="text-primary font-semibold hover:underline"
                    >
                      Down payment
                    </Link>{" "}
                    (25%)
                  </td>
                  <td className="font-mono text-right">$100,000</td>
                </tr>
                <tr>
                  <td>Closing costs</td>
                  <td className="font-mono text-right">$9,700</td>
                </tr>
                <tr>
                  <td>Prepaids + escrow setup</td>
                  <td className="font-mono text-right">$4,761</td>
                </tr>
                <tr>
                  <td>Make-ready, two units</td>
                  <td className="font-mono text-right">$8,000</td>
                </tr>
                <tr className="bg-muted/30">
                  <td className="font-bold">Cash actually spent</td>
                  <td className="font-mono text-right font-bold">$122,461</td>
                </tr>
                <tr>
                  <td>Reserves (6 × $2,613 PITIA)</td>
                  <td className="font-mono text-right">$15,679</td>
                </tr>
                <tr className="bg-muted/30">
                  <td className="font-bold">Total cash required</td>
                  <td className="font-mono text-right font-bold">$138,140</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            $138,140 to lose $277 a month. That is not a broken example — it is
            what a 9.6%-gross-yield duplex does at 2026 investment rates with
            the minimum down payment, and it is why the honest answer to this
            question starts with the financing rather than the building. The
            reserve line is money you show rather than spend; the{" "}
            <Link
              href="/blog/how-much-money-to-buy-a-rental-property"
              className="text-primary font-semibold hover:underline"
            >
              full five-bucket cash-to-close breakdown
            </Link>{" "}
            explains which is which.
          </p>
          <p>
            Break-even, if you want it: NOI of $21,232 supports $1,769 a month
            of debt service, which at 7.25% is a loan of about{" "}
            <strong>$259,000</strong> — <strong>35% down</strong>, or $140,600.
            Ten points above the minimum.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            Path B: the same duplex, owner-occupied
          </h2>
          <p>
            Now live in the left unit. The down payment drops to 5%, the rate
            prices at 6.75%, and the lender counts 75% of the appraiser&apos;s
            market rent on the other unit toward your qualifying income — which
            is how a $400,000 purchase becomes reachable on a salary that would
            not carry it alone.
          </p>
          <p>
            The loan is $380,000. P&amp;I is <strong>$2,464.68</strong>, PMI at
            0.8% is $253.33, taxes are $366.67 and insurance $200 — PITIA of{" "}
            <strong>$3,284.68</strong>.
          </p>
          <div className="not-prose overflow-x-auto rounded-xl border border-border bg-card my-6">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 font-bold text-foreground">
                    Line
                  </th>
                  <th className="text-right p-3 font-bold text-foreground">
                    Monthly
                  </th>
                  <th className="text-left p-3 font-bold text-foreground">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-3 [&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-0">
                <tr>
                  <td>Principal + interest</td>
                  <td className="font-mono text-right">$2,464.68</td>
                  <td>$380,000 at 6.75%</td>
                </tr>
                <tr>
                  <td>PMI (0.8%)</td>
                  <td className="font-mono text-right">$253.33</td>
                  <td>95% LTV</td>
                </tr>
                <tr>
                  <td>Taxes + insurance</td>
                  <td className="font-mono text-right">$566.67</td>
                  <td></td>
                </tr>
                <tr className="bg-muted/30">
                  <td className="font-bold">PITIA</td>
                  <td className="font-mono text-right font-bold">$3,284.68</td>
                  <td></td>
                </tr>
                <tr>
                  <td>Tenant rent, one unit</td>
                  <td className="font-mono text-right">−$1,600.00</td>
                  <td></td>
                </tr>
                <tr>
                  <td>Vacancy, maintenance, capex on the rented half</td>
                  <td className="font-mono text-right">$304.00</td>
                  <td>19% of $1,600; you self-manage</td>
                </tr>
                <tr className="bg-muted/30">
                  <td className="font-bold">Effective housing cost</td>
                  <td className="font-mono text-right font-bold">$1,988.68</td>
                  <td>What the duplex costs you to live in</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Cash to close: $20,000 down, $10,500 of closing costs, $4,921 of
            prepaids and escrow setup, $3,000 to make the rental unit ready —{" "}
            <strong>$38,421 spent</strong> — plus two months of reserves rather
            than six, $6,569, for <strong>$44,990 total</strong>. Size your own
            version in the{" "}
            <Link
              href="/?strategy=house-hack#main"
              className="text-primary font-semibold hover:underline"
            >
              house hacking calculator
            </Link>
            .
          </p>
          <p>
            Is $1,988.68 good? Only against the alternative. The unit next door
            rents for $1,600, so living in your own duplex costs{" "}
            <strong>$389 a month more</strong> than renting the identical space
            — $4,668 a year. Against that, year-one principal paydown on the
            $380,000 loan is <strong>$4,050</strong>. The premium and the equity
            build cancel almost exactly, before any appreciation, and you now
            control a $400,000 asset for $20,000 down.
          </p>
          <p>
            That is the honest version of &ldquo;live for free.&rdquo; You do
            not live for free. You live at roughly the cost of renting, with a
            leveraged asset attached and a landlord&apos;s job on top. Whether
            that trade is worth it is the subject of the{" "}
            <Link
              href="/blog/house-hack-underwriting-guide"
              className="text-primary font-semibold hover:underline"
            >
              house-hack underwriting guide
            </Link>
            ; the occupancy rules and the one-year exit are in{" "}
            <Link
              href="/blog/house-hacking-explained"
              className="text-primary font-semibold hover:underline"
            >
              house hacking explained
            </Link>
            .
          </p>

          <h3>FHA at 3.5%, briefly</h3>
          <p>
            FHA takes the down payment to $14,000 and finances the 1.75% upfront
            premium into the loan ($6,755), giving a balance of $392,755 —
            P&amp;I of $2,547.42 — plus annual MIP at 0.55% of $386,000, or $177
            a month. PITIA lands at <strong>$3,291</strong>, within $7 of the
            5%-down conventional payment. So FHA saves $6,000 of cash for
            essentially the same monthly cost, and charges for it later: above
            90% LTV at origination the MIP never falls off, where conventional
            PMI ends at 80%. The 2026 FHA two-unit limit is $693,050 in
            standard-cost areas, which is generous enough that it rarely binds
            outside expensive coastal counties.
          </p>

          <h2 className="text-2xl sm:text-3xl">The year-2 problem</h2>
          <p>
            Here is the part the pros-and-cons posts never reach. You satisfied
            the twelve-month occupancy requirement, you move out, you rent your
            unit. Both units now produce $1,600 and the property is a pure
            rental with an owner-occupied loan still attached.
          </p>
          <p>
            Switch the landlord policy on ($2,700 instead of $2,400) and add 8%
            management, and NOI is <strong>$20,932</strong>. Debt service is
            $29,576 of P&amp;I plus $3,040 of PMI — the balance is still 94% of
            value, nowhere near the 80% where PMI can be cancelled — for{" "}
            <strong>$32,616</strong>.
          </p>
          <div className="not-prose overflow-x-auto rounded-xl border border-border bg-card my-6">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 font-bold text-foreground">
                    Structure
                  </th>
                  <th className="text-right p-3 font-bold text-foreground">
                    Loan
                  </th>
                  <th className="text-right p-3 font-bold text-foreground">
                    Debt service
                  </th>
                  <th className="text-right p-3 font-bold text-foreground">
                    Cash flow
                  </th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-3 [&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-0">
                <tr>
                  <td>5% down, owner-occ loan (year 2)</td>
                  <td className="font-mono text-right">$380,000</td>
                  <td className="font-mono text-right">$32,616</td>
                  <td className="font-mono text-right">−$11,684</td>
                </tr>
                <tr>
                  <td>20% down, owner-occ, no PMI</td>
                  <td className="font-mono text-right">$320,000</td>
                  <td className="font-mono text-right">$24,906</td>
                  <td className="font-mono text-right">−$3,974</td>
                </tr>
                <tr>
                  <td>25% down investment loan (Path A)</td>
                  <td className="font-mono text-right">$300,000</td>
                  <td className="font-mono text-right">$24,558</td>
                  <td className="font-mono text-right">−$3,326</td>
                </tr>
                <tr>
                  <td>Break-even</td>
                  <td className="font-mono text-right">$269,000</td>
                  <td className="font-mono text-right">$20,932</td>
                  <td className="font-mono text-right">$0</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            <strong>−$974 a month.</strong> The loan that made the purchase
            possible makes the rental unprofitable. And rent growth will not
            rescue it on any useful timeline: 3% on $38,400 is $1,152 of gross,
            which after the 27% of expenses that scale with rent and 3% growth
            on the $7,100 of fixed bills leaves about{" "}
            <strong>$628 of extra NOI in year three</strong>. Compounding that
            3% forward against a fixed $32,616 of debt service, NOI grows into
            its own payment in roughly <strong>fifteen years</strong>.
          </p>
          <p>
            So the 5%-down duplex needs an exit decided in advance. The real
            options are a refinance if rates fall (dropping to 6.0% on the
            $376,000 balance saves about $210 a month, and kills PMI only if the
            appraisal supports 80% LTV), aggressive principal paydown, living
            there longer than a year, or selling into the residential buyer pool
            while you still qualify for the primary-residence capital-gains
            exclusion on your half. What does not work is assuming the property
            becomes a good rental because you stopped living in it.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            Duplex vs a same-priced single-family
          </h2>
          <p>
            The comparison most people actually want. Same $400,000, same metro,
            both as pure rentals. The single-family rents for $2,600 — a 7.8%
            gross yield against the duplex&apos;s 9.6%, which is the normal
            relationship, because a house sells partly on owner-occupant demand
            and a duplex mostly on rent. The single-family also gets the easier
            down payment: 20% conventional, or 15% if you accept mortgage
            insurance.
          </p>
          <div className="not-prose overflow-x-auto rounded-xl border border-border bg-card my-6">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left p-3 font-bold text-foreground">
                    Metric
                  </th>
                  <th className="text-right p-3 font-bold text-foreground">
                    Duplex
                  </th>
                  <th className="text-right p-3 font-bold text-foreground">
                    Single-family
                  </th>
                </tr>
              </thead>
              <tbody className="[&_td]:p-3 [&_td]:border-b [&_td]:border-border [&_tr:last-child_td]:border-0">
                <tr>
                  <td>Gross rent</td>
                  <td className="font-mono text-right">$38,400</td>
                  <td className="font-mono text-right">$31,200</td>
                </tr>
                <tr>
                  <td>Gross yield</td>
                  <td className="font-mono text-right">9.6%</td>
                  <td className="font-mono text-right">7.8%</td>
                </tr>
                <tr>
                  <td>Operating expenses</td>
                  <td className="font-mono text-right">$17,168</td>
                  <td className="font-mono text-right">$14,824</td>
                </tr>
                <tr>
                  <td>NOI</td>
                  <td className="font-mono text-right">$21,232</td>
                  <td className="font-mono text-right">$16,376</td>
                </tr>
                <tr>
                  <td>Cap rate</td>
                  <td className="font-mono text-right">5.31%</td>
                  <td className="font-mono text-right">4.09%</td>
                </tr>
                <tr>
                  <td>Minimum down</td>
                  <td className="font-mono text-right">$100,000 (25%)</td>
                  <td className="font-mono text-right">$80,000 (20%)</td>
                </tr>
                <tr>
                  <td>Debt service at minimum down</td>
                  <td className="font-mono text-right">$24,558</td>
                  <td className="font-mono text-right">$26,196</td>
                </tr>
                <tr>
                  <td>Cash flow</td>
                  <td className="font-mono text-right">−$3,326</td>
                  <td className="font-mono text-right">−$9,820</td>
                </tr>
                <tr>
                  <td>DSCR</td>
                  <td className="font-mono text-right">0.86</td>
                  <td className="font-mono text-right">0.63</td>
                </tr>
                <tr className="bg-muted/30">
                  <td className="font-bold">Down payment to break even</td>
                  <td className="font-mono text-right font-bold">
                    $140,600 (35%)
                  </td>
                  <td className="font-mono text-right font-bold">
                    $200,000 (50%)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            The duplex wins on every income measure, and the last row is the one
            that matters: it reaches break-even cash flow with{" "}
            <strong>$59,400 less capital</strong> than the same-priced house.
            The extra five points of down payment are the cheapest thing in the
            table — 1.8 points of extra gross yield buys them back in under two
            years. Both are in{" "}
            <Link
              href="/blog/negative-leverage-real-estate"
              className="text-primary font-semibold hover:underline"
            >
              negative leverage
            </Link>{" "}
            at 2026 rates, which is the normal condition; the duplex is simply
            less deep in it.
          </p>
          <p>
            Run your own pair — the{" "}
            <Link
              href="/#main"
              className="text-primary font-semibold hover:underline"
            >
              TrueCap analyzer
            </Link>{" "}
            takes about a minute per property and will hold both, so you can
            compare standardized economics rather than eyeball spreadsheets. For
            the wider property-type question, including where five-plus units
            change the rules,{" "}
            <Link
              href="/blog/single-family-vs-multi-family-rental"
              className="text-primary font-semibold hover:underline"
            >
              single-family vs multi-family
            </Link>{" "}
            goes further than this post does.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            What a duplex structurally gives you
          </h2>
          <h3>Shared fixed costs — about $1,800 a year</h3>
          <p>
            Two units under one roof on one parcel genuinely cost less to run
            than two houses. One landlord policy at $2,400 rather than two at
            $1,700 saves <strong>$1,000</strong>. One lawn and snow contract
            rather than two saves <strong>$600</strong>. One 1,600-square-foot
            roof at $12,000 rather than two 1,000-foot roofs at $9,000 each is
            about <strong>$240 a year</strong> amortised over 25 years. Turnover
            trips, inspections, and contractor minimums all collapse to one
            address.
          </p>
          <p>
            Total: roughly $1,840, or 4.8% of gross rent — worth about half a
            point of cap rate. Note what is <em>not</em> on that list. Property
            taxes follow assessed value, so $400,000 of duplex is taxed like
            $400,000 of house; you do not save there, and that is where most
            people expect the saving to be. Water and sewer often go the wrong
            way, because many duplexes have a single meter and the landlord eats
            it.
          </p>

          <h3>Vacancy variance, halved</h3>
          <p>
            A single-family rental is 100% occupied or 0% occupied. A duplex has
            a middle state, and that middle state is the difference between an
            inconvenience and a crisis. When the single-family above goes empty
            you cover $2,183 of debt service out of pocket. When one duplex unit
            goes empty, the other unit&apos;s $1,600 covers 78% of the $2,047
            payment and you are out $447.
          </p>
          <p>
            The expected vacancy rate is the same — assume{" "}
            <Link
              href="/blog/vacancy-rate-rental-property"
              className="text-primary font-semibold hover:underline"
            >
              6-8% either way
            </Link>{" "}
            — but the distribution is far kinder, and for a first or second
            property that own the downside is what keeps you solvent. Two units
            also means two lease-expiry dates you can deliberately stagger so
            you are never turning both at once.
          </p>

          <h3>One financing event, two doors</h3>
          <p>
            Two units acquired with one appraisal, one title policy, one
            origination fee, and one entry in your{" "}
            <Link
              href="/glossary/ltv"
              className="text-primary font-semibold hover:underline"
            >
              LTV
            </Link>{" "}
            and financed-property count. That last point compounds: Fannie
            Mae&apos;s reserve escalator and the ten-financed-property ceiling
            count <em>loans</em>, not doors, so a duplex reaches the same unit
            count as two houses while consuming half the slots.
          </p>

          <h2 className="text-2xl sm:text-3xl">
            What it structurally costs you
          </h2>
          <ol>
            <li>
              <strong>The 25% down payment.</strong> Already priced above —
              $20,000 more than a single-family at 20%, and no 15% escape hatch.
              On the owner-occupied path this reverses completely, which is the
              whole argument of this post.
            </li>
            <li>
              <strong>A comps-based appraisal ceiling.</strong> Properties under
              five units are valued on sales comparison, not on income. Raise
              rents $250 a unit and a five-unit gains roughly $100,000 of
              appraised value at a 6% cap; a duplex gains nothing the appraiser
              will sign for, because the answer is whatever other duplexes sold
              for. If your plan is to force value through operations, that plan
              needs five units.
            </li>
            <li>
              <strong>A thinner exit.</strong> Your resale buyer pool is
              investors plus house hackers, not every family in the metro.
              Expect longer days on market and less competitive bidding,
              especially when rates are high and the investor pool is thin. This
              is real but hard to price; treat it as a reason to buy in a
              neighbourhood where duplexes are normal rather than the one odd
              two-unit on a street of houses.
            </li>
            <li>
              <strong>Tenant proximity.</strong> Free to model and expensive to
              live. A shared wall means you hear every problem first, your
              tenant knows exactly where you live, and &ldquo;I&apos;ll fix it
              this weekend&rdquo; becomes a standing obligation. It is the most
              common reason house hackers leave after twelve months and one day.
            </li>
            <li>
              <strong>Doubled capex timing risk.</strong> Two kitchens, two
              baths, often two furnaces and two water heaters, and in older
              stock they tend to fail together because they were installed
              together. The 5% reserve above is a percentage of rent; check it
              against the actual{" "}
              <Link
                href="/blog/capex-maintenance-reserves-rental-property"
                className="text-primary font-semibold hover:underline"
              >
                component-by-component replacement schedule
              </Link>{" "}
              on any duplex built before 1990.
            </li>
          </ol>

          <h2 className="text-2xl sm:text-3xl">
            So: is a duplex a good investment?
          </h2>
          <p>Four decision rules, in the order they bind.</p>
          <ol>
            <li>
              <strong>
                If you will live in it for a year, a duplex is probably the best
                first purchase available to you.
              </strong>{" "}
              $44,990 of cash for a $400,000 income-producing asset, at a rate
              half a point under investment pricing that stays with the loan
              after you leave, is a structural advantage you get exactly once
              per property. Take it before you take the pure-rental path.
            </li>
            <li>
              <strong>
                If you will not live in it, the gross yield has to clear 10%.
              </strong>{" "}
              At 9.6% our example loses $277 a month at the minimum down
              payment. Break-even needs 35% down. Below a 10% gross yield you
              are buying appreciation and a{" "}
              <Link
                href="/glossary/dscr"
                className="text-primary font-semibold hover:underline"
              >
                DSCR
              </Link>{" "}
              under 1.0 with capital you could have deployed at coverage above
              1.2 in a{" "}
              <Link
                href="/markets/cleveland"
                className="text-primary font-semibold hover:underline"
              >
                cash-flow market
              </Link>
              .
            </li>
            <li>
              <strong>
                Never model a 5%-down duplex as a rental without modelling the
                move-out.
              </strong>{" "}
              −$974 a month is the year-2 number on our example. Decide the
              refi, the paydown, or the sale before you sign.
            </li>
            <li>
              <strong>Buy where duplexes are ordinary.</strong> The comps-based
              appraisal and the thin buyer pool are both survivable in a
              neighbourhood with a real two-unit comp set, and neither is
              survivable on a street of single-family houses.
            </li>
          </ol>
          <p>
            More on the strategy fork — BRRRR, Section 8, house hacking, and how
            each one changes the same building — in the{" "}
            <Link
              href="/blog/topics/strategy"
              className="text-primary font-semibold hover:underline"
            >
              investing strategies guide
            </Link>
            . For the financing side, the{" "}
            <Link
              href="/blog/how-much-down-payment-investment-property"
              className="text-primary font-semibold hover:underline"
            >
              down payment tiers
            </Link>{" "}
            and{" "}
            <Link
              href="/tools/mortgage-payment-calculator"
              className="text-primary font-semibold hover:underline"
            >
              payment calculator
            </Link>{" "}
            will size the two paths against your own numbers in a couple of
            minutes.
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

        <RelatedBlogPosts currentSlug={SLUG} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <NewsletterSignup variant="expanded" source="blog" />
        </div>

        <footer className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Related:{" "}
            <Link
              href="/blog/single-family-vs-multi-family-rental"
              className="font-bold text-foreground hover:underline"
            >
              Single-family vs multi-family rental →
            </Link>{" "}
            ·{" "}
            <Link
              href="/blog/house-hack-underwriting-guide"
              className="font-bold text-foreground hover:underline"
            >
              House hack underwriting: does it beat renting? →
            </Link>
          </p>
        </footer>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
      <BlogStickyCta />
    </div>
  );
}
