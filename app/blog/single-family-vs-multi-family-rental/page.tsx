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
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "single-family-vs-multi-family-rental";
const TITLE =
  "Single-family vs multi-family rental property — which actually wins?";
const DESCRIPTION =
  "The honest comparison: cash flow, cap rate, financing, tenant quality, exit liquidity, capex risk, and which property type fits your specific stage. Side-by-side numbers with 2026 financing.";
const PUBLISHED_AT = "2026-05-27";
const MODIFIED_AT = "2026-06-01";
const READING_TIME = 11;

export const metadata: Metadata = {
  title: `${TITLE} | TrueCap`,
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
    title: TITLE,
    description: DESCRIPTION,
    url: `/blog/${SLUG}`,
    type: "article",
    publishedTime: PUBLISHED_AT,
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

const FAQS = [
  {
    q: "Is single-family or multi-family better for cash flow?",
    a: "Multi-family typically produces 1-3 percentage points higher cap rate than comparable SFRs in the same market — because of economies of scale (one roof, one furnace, shared yard) and because multi-family is a less-competitive buyer pool (fewer owner-occupants bidding up prices). However, SFR cash flow has lower variance: when one of two duplex units is vacant, you lose 50% of income; an SFR is either 100% or 0%.",
  },
  {
    q: "Which has better financing — single-family or multi-family?",
    a: "Single-family wins on financing terms. 1-4 unit properties qualify for residential financing (conventional, FHA, VA) with 30-year fixed rates and 80-90% LTV. 5+ units are commercial loans with 70-75% LTV, 5/1 ARM structure, 25-year amortization, and rates 50-150bp higher. The cliff between 4-unit and 5-unit financing is significant — many investors stop at 4-unit specifically to keep residential financing.",
  },
  {
    q: "Is multi-family riskier than single-family?",
    a: "Different risk profile, not necessarily higher. Multi-family income is more diversified (one vacant unit ≠ 100% income loss) but also more concentrated geographically (one bad neighborhood decision affects every unit). SFRs are easier to liquidate individually but have higher single-event risk per property. The honest answer: risk is a function of underwriting + market + execution, not property type alone.",
  },
  {
    q: "What about 5+ unit small multifamily?",
    a: "5-20 unit properties live in a financing dead zone — too big for residential, too small for the institutional commercial market. The advantage: less buyer competition, sometimes meaningfully better cap rates. The disadvantage: commercial financing, larger capex events, harder to liquidate. This range is where experienced investors find returns the residential and institutional markets both miss.",
  },
  {
    q: "Should beginners start with single-family or multi-family?",
    a: "Most experienced investors recommend starting with single-family or house-hacking a 2-4 unit. Reasons: easier financing (FHA 3.5%), simpler tenant management (one unit at a time), lower capex variance, easier to liquidate if you need out. Move to larger multi-family after 2-3 SFRs once you understand the operational rhythm. There's no rule against starting with multi-family — but the learning curve is steeper and the cost of mistakes is higher.",
  },
];

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
    author: { "@type": "Person", name: "Morgan Page", url: siteUrl },
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntityOfPage: canonicalUrl,
    image: [`${siteUrl}/home.jpg`],
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "TrueCap", item: `${siteUrl}/` },
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
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
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
        <article>
        <div className="mb-2">
          <Link
            href="/blog"
            className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
          >
            ← Blog
          </Link>
        </div>
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight text-balance">
            {TITLE}
          </h1>
          <p className="mt-3 text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
            {new Date(PUBLISHED_AT).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}{" "}
            · {READING_TIME} min read
          </p>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Single-family vs multi-family is one of the most common questions in rental investing — and one of the most poorly-answered. The honest answer isn&apos;t &quot;multi-family always wins on cash flow&quot; or &quot;SFRs are safer.&quot; The answer is: it depends on your stage, your market, and what you&apos;re actually trying to build. Here&apos;s the honest comparison.
          </p>
        </header>

        <div className="prose prose-neutral max-w-none text-foreground space-y-6 leading-relaxed">
          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            The short answer
          </h2>
          <p>
            Single-family: lower variance income, easier financing, simpler operations, easier exit. Good first-investment choice, scales linearly (every new property is another deal to find).
          </p>
          <p>
            Multi-family (2-4 units): higher cap rate per dollar invested, diversified rent rolls, still qualifies for residential financing. Sweet spot for investors past the first 1-2 deals.
          </p>
          <p>
            Small multi-family (5-20 units): best cap rates in the housing investment world, but commercial financing + larger capex events + harder liquidity. Only after you&apos;ve mastered the residential rhythm.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            The honest side-by-side
          </h2>
          <p>
            Same market, same neighborhood, comparable condition — typical 2026 numbers:
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
            Multi-family cap rates beat SFR by 1-3 points per dollar invested. But the absolute monthly cash flow per unit is similar — multi-family wins on aggregate, not per-unit. The real difference shows up in scale: a fourplex is one closing, one PM relationship, one tax bill instead of four.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            What single-family wins on
          </h2>
          <p>
            <strong>Financing.</strong> 30-year fixed conventional at 80-90% LTV, FHA 3.5%, VA 0% — residential financing on SFRs is the cheapest debt available to individual investors. No comparable financing exists for 5+ unit properties.
          </p>
          <p>
            <strong>Liquidity.</strong> SFRs sell to two buyer pools — owner-occupants and investors. That doubles the demand at exit. Multi-family sells only to investors, which means longer time-on-market and price-sensitive buyers.
          </p>
          <p>
            <strong>Tenant quality.</strong> Married couples with kids, established professionals, retirees — SFRs attract longer-term tenants because the property feels like &quot;their home,&quot; not &quot;an apartment.&quot; Multi-family attracts shorter-term tenants on average. Annual turnover on SFRs runs 20-30%; on multi-family it runs 40-60%.
          </p>
          <p>
            <strong>Capex predictability.</strong> One furnace, one roof, one water heater, one kitchen. Easier to budget capex. Multi-family means multiple of each system, and they fail on different schedules. The math averages out over a portfolio, but year-to-year variance is higher.
          </p>
          <p>
            <strong>Exit optionality.</strong> Need to sell? You can list to a homeowner couple in a week. Multi-family takes 60-180 days to find the right investor buyer.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            What multi-family wins on
          </h2>
          <p>
            <strong>Cap rate per dollar.</strong> The economies of scale are real. One roof spreads across 2-10 units. One furnace covers a common area. Shared yard. Shared parking. These efficiencies flow through to higher cap rates.
          </p>
          <p>
            <strong>Income diversification.</strong> When one of four units goes vacant, you lose 25% of rent — not 100%. A 30-day vacancy on an SFR is brutal; a 30-day vacancy on a fourplex is barely noticeable.
          </p>
          <p>
            <strong>Less buyer competition.</strong> Owner-occupants don&apos;t bid on multi-family. Less competition means better deals. The 2-4 unit market in particular has weaker price discovery than SFR — meaning more deals fall to the patient investor.
          </p>
          <p>
            <strong>House-hacking optionality.</strong> Live in one unit, rent out the others. FHA 3.5% down on a 2-4 unit. This is the most powerful first-time-investor move in the country. See the{" "}
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
              <strong>4-unit:</strong> residential financing, 30-year fixed, 80-90% LTV, FHA 3.5% if owner-occupant, qualifies on personal income.
            </li>
            <li>
              <strong>5+ unit:</strong> commercial financing, 5/1 or 7/1 ARM with 25-year amortization, 70-75% LTV, rates 50-150bp above conventional, qualifies primarily on property cash flow (debt service coverage).
            </li>
          </ul>
          <p>
            This cliff is real and significant. Many investors deliberately cap their portfolio at 4-unit per property specifically to keep residential financing. Others step up to 5-20 unit specifically because the cap rate premium offsets the financing penalty. There&apos;s no right answer — but you need to choose deliberately, not by accident.
          </p>

          <h2 className="text-2xl font-extrabold text-foreground mt-10 mb-3">
            Which fits your stage?
          </h2>
          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">
            Stage 0: First investment
          </h3>
          <p>
            Single-family or house-hacked 2-4 unit. Easier financing, simpler operations, the learning curve isn&apos;t compounded by tenant management complexity. If you can house-hack, do it — FHA 3.5% on a duplex is unbeatable on dollar-leverage terms.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">
            Stage 1: Properties 2-4
          </h3>
          <p>
            Mix of SFR and 2-4 unit. By now you understand tenant rhythms. Adding multi-family diversifies your cash flow and improves your aggregate cap rate. Still residential financing.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">
            Stage 2: Properties 5-9
          </h3>
          <p>
            Mostly small multi-family (2-4 unit) plus occasional SFR for diversification. Conventional financing slots running out (Fannie/Freddie cap individual borrowers at 10 financed). Time to start thinking about <Link href="/blog/dscr-loans-explained" className="text-primary font-semibold hover:underline">DSCR loans</Link> for the next 5 properties or commercial financing for a step-up.
          </p>

          <h3 className="text-xl font-bold text-foreground mt-6 mb-2">
            Stage 3: 10+ properties or 5+ unit step-up
          </h3>
          <p>
            Either continue with DSCR financing on residential properties past the conventional cap, OR step up to 5-20 unit commercial multi-family for the cap rate premium and forced-appreciation optionality. This decision typically comes down to whether you want to be a portfolio operator or an asset manager — they&apos;re different jobs.
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
              href="/blog/dscr-loans-explained"
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
      </main>
      <RelatedBlogPosts currentSlug={SLUG} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <NewsletterSignup variant="expanded" source="blog" />
      </div>
      <BlogStickyCta />
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
