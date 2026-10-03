/**
 * Blog post: Single-family vs multi-family rental property.
 *
 * Targets queries: "single family vs multi family", "should I buy
 * SFR or duplex", "multifamily rental property pros and cons",
 * "best property type for rental investor", "duplex vs single family
 * rental".
 */

import type { Metadata } from "next";
import Link from "next/link";
import { PostSources } from "@/components/blog/post-sources";
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

const SLUG = "single-family-vs-multi-family-rental";
const TITLE =
  "Single-family vs multi-family rental property — which actually wins?";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Single-family vs multi-family rental: which wins?";
const DESCRIPTION =
  "Single-family vs multi-family compared on cash flow, cap rate, financing, tenants, exit liquidity, and capex risk, so you know which fits your stage.";
const PUBLISHED_AT = "2026-05-27";
const MODIFIED_AT = lastmodFor("/blog/single-family-vs-multi-family-rental") ?? PUBLISHED_AT;
const READING_TIME = 11;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "single family vs multi family",
    "should I buy SFR or duplex",
    "multifamily rental property pros and cons",
    "best property type for rental investor",
    "duplex vs single family rental",
    "multifamily vs single family investment",
    "SFR vs MFR investing",
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

export default function SfrVsMfrPost() {
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

  return (
    <div className="min-h-screen bg-background">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbLd} />

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
            Single-family vs multi-family is one of the most common questions in rental investing — and one of the most poorly-answered. The honest answer isn&apos;t &quot;multi-family always wins on cash flow&quot; or &quot;SFRs are safer.&quot; The answer is: it depends on your stage, your market, and what you&apos;re actually trying to build. Here&apos;s the comparison.
          </p>
        </header>

        <div className="prose prose-neutral max-w-none [&>p]:max-w-[68ch] [&>ul]:max-w-[68ch] [&>ol]:max-w-[68ch] [&>blockquote]:max-w-[68ch] [&>h2]:max-w-[68ch] [&>h3]:max-w-[68ch] text-foreground space-y-6 leading-relaxed">
          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            The short answer
          </h2>
          <p>
            Single-family: lower variance income, easier financing, simpler operations, easier exit. Good first-investment choice, scales linearly (every new property is another deal to find).
          </p>
          <p>
            Multi-family (2-4 units): diversified rent rolls, and it still qualifies for{" "}
            <a href="https://singlefamily.fanniemae.com/media/20786/display" className="text-primary font-semibold hover:underline">Fannie Mae</a>{" "}
            and{" "}
            <a href="https://sf.freddiemac.com/general/maximum-ltv-tltv-htltv-ratio-requirements-for-conforming-and-super-conforming-mortgages" className="text-primary font-semibold hover:underline">Freddie Mac</a>{" "}
            1-4 unit residential financing — compare cap rates deal by deal. Sweet spot for investors past the first 1-2 deals.
          </p>
          <p>
            Small multi-family (5-20 units): multifamily (commercial) financing underwritten on the property&apos;s income, plus larger capex events. Only after you&apos;ve mastered the residential rhythm.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            The side-by-side
          </h2>
          <p>
            An illustrative example (made-up inputs, not market data) for one hypothetical neighborhood:
          </p>
          <ul>
            <li>
              <strong>SFR (3BR/2BA, $250k):</strong> rent $2,000/mo, gross yield 9.6%,{" "}
              <Link
                href="/glossary/cap-rate"
                className="text-primary font-semibold hover:underline"
              >
                cap rate
              </Link>{" "}
              6.5-7%, monthly NCF $300-450 on financed deal.
            </li>
            <li>
              <strong>Duplex (2 units, $320k):</strong> rent $1,500/unit × 2 = $3,000/mo, gross yield 11.3%, cap rate 7.5-8.5%, monthly NCF $400-650.
            </li>
            <li>
              <strong>Fourplex ($425k):</strong> rent $1,200/unit × 4 = $4,800/mo, gross yield 13.6%, cap rate 8-9.5%, monthly NCF $600-900.
            </li>
            <li>
              <strong>10-unit ($1.1M, commercial):</strong> rent $1,150/unit × 10 = $11,500/mo, gross yield 12.5%, cap rate 8-9.5% (similar to fourplex), monthly NCF $1,400-2,200.
            </li>
          </ul>
          <p>
            In this example, the multi-family cap rates run 1 to 2.5 points above the SFR&apos;s, and the SFR earns more cash flow per unit — multi-family wins on aggregate, not per-unit. The real difference shows up in scale: a fourplex is one closing, one PM relationship, one tax bill instead of four.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            What single-family wins on
          </h2>
          <p>
            <strong>Financing.</strong> 30-year fixed conventional financing goes up to{" "}
            <a href="https://singlefamily.fanniemae.com/media/20786/display" className="text-primary font-semibold hover:underline">85% LTV on a one-unit investment purchase</a>{" "}
            under Fannie Mae&apos;s and{" "}
            <a href="https://sf.freddiemac.com/general/maximum-ltv-tltv-htltv-ratio-requirements-for-conforming-and-super-conforming-mortgages" className="text-primary font-semibold hover:underline">Freddie Mac&apos;s</a>{" "}
            limits; FHA (<a href="https://www.hud.gov/helping-americans/loans" className="text-primary font-semibold hover:underline">as little as 3.5% down</a>) and VA (<a href="https://www.va.gov/housing-assistance/home-loans/loan-types/purchase-loan/" className="text-primary font-semibold hover:underline">no down payment</a> when the price doesn&apos;t exceed the appraised value) are open{" "}
            <a href="https://www.hud.gov/hud-partners/single-family-sfh203b" className="text-primary font-semibold hover:underline">only if you&apos;ll live in the home</a>. 5+ unit properties need multifamily loans instead, qualified mainly on the property&apos;s income —{" "}
            <a href="https://multifamily.fanniemae.com/financing-options/small-loans/small-mortgage-loan-program-term-sheet" className="text-primary font-semibold hover:underline">Fannie Mae&apos;s Small Mortgage Loan program</a>, for example, requires at least a 1.25x debt service coverage ratio (DSCR).
          </p>
          <p>
            <strong>Liquidity.</strong> SFRs sell to owner-occupants and investors. 2-4 unit buildings can also sell to owner-occupants who house-hack with FHA, VA or conventional loans, but 5+ unit properties need multifamily financing.
          </p>
          <p>
            <strong>Tenant tenure.</strong> SFRs may appeal to tenants looking for a longer stay; check actual lease lengths in your market rather than assuming by property type. Tenant turnover varies by market and property, so check the seller&apos;s rent roll and lease history before you set a turnover rate.
          </p>
          <p>
            <strong>Capex predictability.</strong> One furnace, one roof, one water heater, one kitchen. Easier to <Link href="/blog/capex-maintenance-reserves-rental-property" className="text-primary font-semibold hover:underline">budget capex</Link>. Multi-family means multiple of each system, and they fail on different schedules. The math averages out over a portfolio, but year-to-year variance is higher.
          </p>
          <p>
            <strong>Exit optionality.</strong> Need to sell? An SFR can go to owner-occupant buyers as well as investors; a 5+ unit building needs a buyer who can get multifamily financing, so allow more time.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            What multi-family wins on
          </h2>
          <p>
            <strong>Cap rate per dollar.</strong> The economies of scale are real. One roof spreads across 2-10 units. One furnace covers a common area. Shared yard. Shared parking. These efficiencies can flow through to higher cap rates.
          </p>
          <p>
            <strong>Income diversification.</strong> When one of four units goes vacant, you lose 25% of rent — not 100%. A 30-day vacancy on an SFR is brutal; a 30-day vacancy on a fourplex is barely noticeable.
          </p>
          <p>
            <strong>Less buyer competition at 5+ units.</strong> On 5+ unit properties, owner-occupant homebuyers drop out because 1-4 unit home loans no longer apply; on 2-4 units you&apos;ll still compete with owner-occupants house-hacking with FHA, VA or conventional loans.
          </p>
          <p>
            <strong>House-hacking optionality.</strong> Live in one unit, rent out the others. FHA loans allow as little as 3.5% down on a 2-4 unit you live in. This is the most powerful first-time-investor move in the country. See the{" "}
            <Link
              href="/blog/house-hacking-explained"
              className="text-primary font-semibold hover:underline"
            >
              house hacking guide
            </Link>{" "}
            for the full math.
          </p>
          <p>
            <strong>Forced appreciation on commercial.</strong> On 5+ unit properties, value is determined by NOI ÷ cap rate. Increase NOI by $5,000/yr (raise rents, cut expenses), and at a 7% cap the property gains $71k of value. Commercial multi-family is the only residential strategy where you can directly engineer value the way commercial real estate has done for decades.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            Where the cliff lives: 4 units vs 5 units
          </h2>
          <p>
            The biggest decision in this whole comparison is whether to stay at 4-unit (or smaller) or step up to 5+. The cliff:
          </p>
          <ul>
            <li>
              <strong>4-unit:</strong> residential financing, 30-year fixed,{" "}
              <a href="https://singlefamily.fanniemae.com/media/20786/display" className="text-primary font-semibold hover:underline">up to 75% LTV as an investment purchase</a>{" "}
              (<a href="https://singlefamily.fanniemae.com/media/20786/display" className="text-primary font-semibold hover:underline">up to 95% conventional</a>, or FHA with as little as 3.5% down, if you live in one unit), qualifies on personal income.
            </li>
            <li>
              <strong>5+ unit:</strong> multifamily (commercial) financing, qualified primarily on property cash flow (debt service coverage) —{" "}
              <a href="https://multifamily.fanniemae.com/financing-options/small-loans/small-mortgage-loan-program-term-sheet" className="text-primary font-semibold hover:underline">Fannie Mae&apos;s Small Mortgage Loan program</a>, for example, allows up to 80% LTV and amortization up to 30 years, with fixed- or variable-rate options and a minimum 1.25x DSCR.
            </li>
          </ul>
          <p>
            This cliff is real and significant. Staying at 4 units or fewer per property keeps residential financing available; stepping up to 5-20 units means multifamily financing. Stepping up can make sense when a specific deal&apos;s numbers justify the financing change. There&apos;s no right answer — but you need to choose deliberately, not by accident.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            Which fits your stage?
          </h2>
          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">
            Stage 0: First investment
          </h3>
          <p>
            Single-family or house-hacked 2-4 unit. Easier financing, simpler operations, the learning curve isn&apos;t compounded by tenant management complexity. If you can house-hack, consider it — FHA&apos;s 3.5% minimum down payment on a duplex you live in is among the lowest available, and eligible veterans can use a{" "}
            <a href="https://www.va.gov/housing-assistance/home-loans/loan-types/purchase-loan/" className="text-primary font-semibold hover:underline">VA-backed loan with no down payment on up to 4 units</a>.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">
            Stage 1: Properties 2-4
          </h3>
          <p>
            Mix of SFR and 2-4 unit. By now you understand tenant rhythms. Adding multi-family diversifies your cash flow and can improve your aggregate cap rate. Still residential financing.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">
            Stage 2: Properties 5-9
          </h3>
          <p>
            Mostly small multi-family (2-4 unit) plus occasional SFR for diversification. Conventional financing slots running out (<a href="https://selling-guide.fanniemae.com/sel/b2-2-03/multiple-financed-properties-same-borrower" className="text-primary font-semibold hover:underline">Fannie Mae</a> and <a href="https://guide.freddiemac.com/app/guide/section/4201.13" className="text-primary font-semibold hover:underline">Freddie Mac</a> cap investment-property borrowers at 10 financed 1-4 unit properties). Time to start thinking about <Link href="/blog/how-to-calculate-dscr#dscr-loans" className="text-primary font-semibold hover:underline">DSCR loans</Link> for the next 5 properties or commercial financing for a step-up.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">
            Stage 3: 10+ properties or 5+ unit step-up
          </h3>
          <p>
            Either continue with DSCR financing on residential properties past the conventional cap, OR step up to 5-20 unit commercial multi-family when a specific deal&apos;s cap rate and forced-appreciation potential justify it. This decision typically comes down to whether you want to be a portfolio operator or an asset manager — they&apos;re different jobs.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            The framework, not the formula
          </h2>
          <p>
            There&apos;s no &quot;multi-family always wins&quot; or &quot;SFRs are safer&quot; truth here. There are honest trade-offs, and the right answer depends on your stage, your market, and what you&apos;re building toward.
          </p>
          <p>
            The investors who do best are the ones who match the property type to the goal — not the ones who pick a side and stick with it through every situation.
          </p>
          <p>
            Run any specific deal through{" "}
            <Link href="/" className="text-primary font-semibold hover:underline">
              TrueCap
            </Link>{" "}
            to compare apples-to-apples cash flow + cap rate + DSCR on SFR vs multi-family in your specific market. The 60-second analyzer treats both property types correctly. Related reading:{" "}
            <Link
              href="/blog/house-hacking-explained"
              className="text-primary font-semibold hover:underline"
            >
              house hacking
            </Link>
            ,{" "}
            <Link
              href="/blog/how-to-calculate-dscr#dscr-loans"
              className="text-primary font-semibold hover:underline"
            >
              DSCR loans explained
            </Link>
            , and{" "}
            <Link
              href="/blog/cash-flow-vs-appreciation"
              className="text-primary font-semibold hover:underline"
            >
              cash flow vs appreciation
            </Link>
            .
          </p>
        </div>
        </article>
        <PostSources
          sources={[
            {
              title: "Fannie Mae, Eligibility Matrix (August 5, 2026)",
              url: "https://singlefamily.fanniemae.com/media/20786/display",
            },
            {
              title: "Freddie Mac, Maximum LTV/TLTV/HTLTV Ratio Requirements for Conforming and Super Conforming Mortgages",
              url: "https://sf.freddiemac.com/general/maximum-ltv-tltv-htltv-ratio-requirements-for-conforming-and-super-conforming-mortgages",
            },
            {
              title: "HUD, Let FHA Loans Help You",
              url: "https://www.hud.gov/helping-americans/loans",
            },
            {
              title: "VA, VA-backed purchase loan",
              url: "https://www.va.gov/housing-assistance/home-loans/loan-types/purchase-loan/",
            },
            {
              title: "HUD, 203(b) Mortgage Insurance",
              url: "https://www.hud.gov/hud-partners/single-family-sfh203b",
            },
            {
              title: "Fannie Mae Multifamily, Small Mortgage Loan Program Term Sheet",
              url: "https://multifamily.fanniemae.com/financing-options/small-loans/small-mortgage-loan-program-term-sheet",
            },
            {
              title: "Fannie Mae Selling Guide B2-2-03, Multiple Financed Properties for the Same Borrower",
              url: "https://selling-guide.fanniemae.com/sel/b2-2-03/multiple-financed-properties-same-borrower",
            },
            {
              title: "Freddie Mac Seller/Servicer Guide 4201.13, Investment Property Mortgages",
              url: "https://guide.freddiemac.com/app/guide/section/4201.13",
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
