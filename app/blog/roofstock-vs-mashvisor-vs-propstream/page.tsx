/**
 * 3-way comparison blog post.
 *
 * Captures the high-intent "X vs Y vs Z" search demand by giving an
 * honest matrix of how three competitors stack up, with TrueCap framed
 * appropriately — sometimes the answer, sometimes the upstream / downstream
 * layer the other three don't address.
 *
 * Schema: Article + Breadcrumb + FAQPage for maximum SERP eligibility.
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
import { Header } from "@/components/investcalc/header";
import { lastmodFor } from "@/lib/seo/lastmod";
import { JsonLd } from "@/components/seo/json-ld";
import { PostSources } from "@/components/blog/post-sources";

const SLUG = "roofstock-vs-mashvisor-vs-propstream";
const TITLE =
  "Roofstock vs Mashvisor vs PropStream: 3-way deal discovery comparison";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Roofstock vs Mashvisor vs PropStream (2026)";
const DESCRIPTION =
  "Roofstock now sends individual buyers to Stessa's marketplace, Mashvisor scores neighborhoods, PropStream finds motivated sellers. See where TrueCap fits after.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = lastmodFor("/blog/roofstock-vs-mashvisor-vs-propstream") ?? PUBLISHED_AT;
const READING_TIME_MIN = 10;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "roofstock vs mashvisor",
    "roofstock vs propstream",
    "mashvisor vs propstream",
    "best deal discovery tools",
    "find rental property deals",
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

const FAQ_ITEMS = [
  {
    q: `Roofstock, Mashvisor, or PropStream — which one for a beginner?`,
    a: `It depends on how much help you want. Roofstock's individual-investor listings now live on Stessa's marketplace, which shows MLS listings with investor metrics and connects you with a vetted, investor-friendly local agent who helps with negotiating, inspecting and closing and can connect you with property managers. Mashvisor and PropStream both assume you're going to find + close + operate yourself, which is more work.`,
  },
  {
    q: `Do any of these underwrite deals?`,
    a: `Partly. Stessa's marketplace (which now hosts Roofstock's listings) shows projected rent and returns from its own default assumptions — check each one against the property. Mashvisor estimates property-level cap rate and cash-on-cash from neighborhood rental comps; its Standard and Professional plans let you customize expenses and recalculate them. PropStream gives you leads and contact info plus built-in rental ROI and fix-and-flip calculators. For per-deal underwriting on assumptions you've checked, use TrueCap, DealCheck, or a spreadsheet.`,
  },
  {
    q: `Mashvisor vs Rentometer — what's the difference?`,
    a: `Rentometer centers on address-level rent estimates from nearby rental comps, with reports, market insights and a deal worksheet built around that rent data. Mashvisor is broader market discovery — heatmaps, neighborhood scoring, Airbnb data, rental comps. Use Rentometer when you need a tight rent estimate on a specific address; use Mashvisor when you're picking which market to invest in.`,
  },
  {
    q: `Is PropStream worth \$99/month?`,
    a: `Depends on volume. If you send 1,000+ direct mail pieces a month or run an active wholesaling operation, PropStream's lists and skip-tracing are built for that work. If you buy 1-3 properties a year through MLS or your network, PropStream is overkill. For solo buy-and-hold investors, PropStream is often too much tool.`,
  },
  {
    q: `How does TrueCap relate to these three?`,
    a: `TrueCap is downstream of all of them. They help you find properties; TrueCap helps you screen modeled economics. A possible workflow is: find a property → underwrite in TrueCap → verify the material assumptions → record your own decision.`,
  },
];

export default function ThreeWayComparisonPost() {
  const siteUrl = getSiteUrl();
  const url = `${siteUrl}/blog/${SLUG}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: TITLE,
    description: DESCRIPTION,
    image: [`${siteUrl}/home.jpg`],
    datePublished: PUBLISHED_AT,
    dateModified: MODIFIED_AT,
    author: { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: "TrueCap", url: siteUrl },
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "TrueCap", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${siteUrl}/blog`,
      },
      { "@type": "ListItem", position: 3, name: TITLE, item: url },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={faqSchema} />

      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-2">
          <Link
            href="/blog"
            className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground"
          >
            ← Blog
          </Link>
        </div>

        <article>
          <header className="mb-8 sm:mb-10">
            <div className="text-2xs uppercase tracking-widest text-primary font-bold mb-3">
              Comparison · {READING_TIME_MIN} min read
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight text-balance">
              {TITLE}
            </h1>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-muted-foreground">
              {DESCRIPTION}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Published {PUBLISHED_AT}
            </p>
            <BlogByline />
          </header>

          {/* TL;DR */}
          <section className="mb-10 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-3">
              TL;DR
            </h2>
            <p
              className="text-sm sm:text-base leading-relaxed text-foreground"
            >
              All three help you <em>find</em> rental property deals; each includes{" "}
              <a href="https://www.mashvisor.com/pricing">some built-in analysis</a>{" "}
              that starts from the vendor&apos;s own data and default estimates, so check every input before relying on it. <strong>Roofstock</strong>{" "}
              <a href="https://www.roofstock.com/">now routes individual buyers</a>{" "}
              to{" "}
              <a href="https://www.stessa.com/investment-properties">
                Stessa&apos;s investment-property marketplace
              </a>
              , which surfaces MLS listings with investor metrics. <strong>Mashvisor</strong> is market discovery —{" "}
              <a href="https://www.mashvisor.com/pricing">
                heatmaps, neighborhood Airbnb / LTR scores, rental comps
              </a>
              . <strong>PropStream</strong> is lead generation —{" "}
              <a href="https://www.propstream.com/propstream-lead-list-definitions">
                motivated-seller lists, pre-foreclosure data
              </a>
              , plus skip-tracing. Different ways to source. <strong>TrueCap</strong> isn&apos;t in this category — it&apos;s an underwriting calculator that models cash flow from user-reviewed assumptions after a property is found.
            </p>
          </section>

          <div className="prose prose-neutral max-w-none [&>p]:max-w-[68ch] [&>ul]:max-w-[68ch] [&>ol]:max-w-[68ch] [&>blockquote]:max-w-[68ch] [&>h2]:max-w-[68ch] [&>h3]:max-w-[68ch] prose-headings:font-extrabold prose-headings:text-foreground prose-p:text-foreground prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-li:text-foreground prose-li:leading-relaxed">
            <h2>The three in one sentence each</h2>
            <div>
              <ul>
                <li><strong>Roofstock</strong> — on-market listings through Stessa. <a href="https://www.stessa.com/investment-properties">Browse MLS-sourced listings with investor metrics on Stessa&apos;s marketplace</a>, and get connected with a vetted local agent when you want to make an offer. Listings are free to browse; confirm any transaction costs with the agent you&apos;re connected to.</li>
                <li><strong>Mashvisor</strong> — market discovery + neighborhood scoring. Heatmaps for listing price, rental income, cash-on-cash, and Airbnb occupancy by neighborhood. Comparable traditional and Airbnb rental data. <a href="https://www.mashvisor.com/pricing">Published plans run $39.99–$99.99/month billed annually ($49.99–$119.99 billed quarterly)</a>, with Enterprise priced on request (as of 2026).</li>
                <li><strong>PropStream</strong> — lead generation. Pull <a href="https://www.propstream.com/propstream-lead-list-definitions">lists of motivated sellers (pre-foreclosure, pre-probate, vacant, tax delinquent)</a>, skip-trace to find owner phone + email, run direct mail or cold call campaigns. <a href="https://www.propstream.com/pricing">$99/month on the Essentials plan, billed monthly</a> (as of 2026).</li>
              </ul>
            </div>

            <h2>How they differ — what each is actually good at</h2>
            <div>
              <ul>
                <li><strong>Roofstock</strong> (through Stessa&apos;s marketplace) suits investors who want to shop on-market rentals with investor metrics attached. The marketplace <a href="https://www.stessa.com/investment-property-marketplace/">connects you with vetted, investor-friendly agents who can also connect you with property managers</a>, and <a href="https://support.stessa.com/en/articles/10779191-stessa-investment-properties-marketplace">Stessa&apos;s help center says the agent helps with negotiating, inspecting, and closing the deal</a>. Tradeoff: these are MLS listings shown with the marketplace&apos;s own projections and default estimates, so run your own numbers before relying on them.</li>
                <li><strong>Mashvisor</strong> is great for the early &quot;where should I invest?&quot; phase. The heatmaps quickly answer questions like &quot;which Phoenix zip codes have the best Airbnb cash flow?&quot; or &quot;is Memphis or Cleveland better for cash flow?&quot;. Once you&apos;ve picked a market, the per-deal data is less differentiated.</li>
                <li><strong>PropStream</strong> focuses on off-market deal sourcing. If you send direct mail or run cold-call campaigns, PropStream&apos;s lists + skip-tracing are built for exactly that. <a href="https://www.propstream.com/">PropStream is built for wholesalers and off-market buy-and-hold investors</a>.</li>
              </ul>
            </div>

            <h2>Pricing comparison</h2>
            <div>
              <ul>
                <li><strong>Roofstock</strong> (<a href="https://www.roofstock.com/">via Stessa&apos;s marketplace</a>) — <a href="https://www.stessa.com/investment-properties">no monthly subscription to browse</a>; confirm any transaction costs with your agent.</li>
                <li><strong>Mashvisor</strong> — <a href="https://www.mashvisor.com/pricing">published plans run $39.99–$99.99/month billed annually ($49.99–$119.99 billed quarterly), with Enterprise priced on request</a>. Lite covers individual-property analysis with long- and short-term rental estimates; Standard adds heatmaps, neighborhood analytics, rental comps, and editable expenses; Professional adds multifamily listings and more exports.</li>
                <li><strong>PropStream</strong> — <a href="https://www.propstream.com/pricing">$99/month for the Essentials plan</a>. On Essentials, skip tracing is 12¢ a contact and direct mail is a paid add-on (as of October 2026). No free plan; a 7-day free trial.</li>
              </ul>
              <p>If you&apos;re buying one or two on-market properties a year, browsing Stessa&apos;s marketplace (where Roofstock now sends buyers) costs nothing to start. If you&apos;re actively sourcing 5-10+ deals a year off-market, PropStream&apos;s subscription is easier to justify. Mashvisor&apos;s subscription makes the most sense if you&apos;re market-shopping across regions; if you&apos;re a hometown investor, it&apos;s often overkill.</p>
            </div>

            <h2>Which combo to use?</h2>
            <div>
              <ul>
                <li><strong>Just Roofstock (via Stessa&apos;s marketplace)</strong> — for out-of-state SFR investors who want investor-filtered listings and a connection to a vetted local agent, who can also connect you with property managers.</li>
                <li><strong>Mashvisor + your MLS access</strong> — for investors who want to pick the right market first, then source on-market deals through a local agent.</li>
                <li><strong>PropStream + your closing team</strong> — for active off-market buyers / wholesalers / fix-and-flippers. You source the deal, negotiate, close with a title company.</li>
                <li><strong>Mashvisor + Roofstock</strong> — Mashvisor picks the markets, and Stessa&apos;s marketplace (where Roofstock now sends buyers) shows listings in those markets.</li>
              </ul>
            </div>

            <h2>Where TrueCap fits — after the deal is found</h2>
            <div>
              <p><a href="https://www.propstream.com/">Each has some built-in analysis</a>, but it starts from their data and defaults; you still have to underwrite the deal on assumptions you&apos;ve checked.</p>
              <p>That&apos;s the TrueCap job: paste the address, review editable HUD rent and FRED rate benchmarks, enter local property tax manually, replace every value where you have better evidence, then run cap rate / CoC / DSCR / cash flow and sensitize the inputs.</p>
              <p><a href="https://support.stessa.com/en/articles/10779191-stessa-investment-properties-marketplace">Marketplace projections</a>, Mashvisor&apos;s property estimates and <a href="https://www.propstream.com/">PropStream&apos;s calculators</a> all start from each vendor&apos;s own data and defaults. TrueCap turns inputs you&apos;ve reviewed into a modeled underwrite; you make the decision.</p>
            </div>

            <h2>Honest quick decision</h2>
            <div>
              <ul>
                <li><strong>&quot;I want to own a rental without managing the sourcing or operations.&quot;</strong> Stessa&apos;s marketplace (where Roofstock now sends buyers) plus a property manager — Stessa&apos;s vetted agents can connect you with one.</li>
                <li><strong>&quot;I want to figure out which city / neighborhood to invest in.&quot;</strong> Mashvisor (then go local).</li>
                <li><strong>&quot;I want to find off-market deals + send direct mail.&quot;</strong> PropStream.</li>
                <li><strong>&quot;I have a deal in hand and want to know if it pencils.&quot;</strong> TrueCap (free).</li>
              </ul>
            </div>

            <h2>FAQ</h2>
            <div className="not-prose space-y-3">
              {FAQ_ITEMS.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-xl border border-border bg-card p-4 sm:p-5"
                >
                  <summary className="cursor-pointer list-none flex items-start justify-between gap-3 font-bold text-sm sm:text-base text-foreground">
                    <span>{item.q}</span>
                    <span
                      aria-hidden
                      className="mt-1 size-5 shrink-0 rounded-full border border-border text-muted-foreground text-xs leading-none flex items-center justify-center transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <div className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>

            <h2>Try TrueCap free</h2>
            <p>
              However you source deals — on-market marketplace, market heatmap,
              or off-market list — run them through TrueCap before you offer.
              Free, no signup. The deal you didn&apos;t buy because the
              numbers didn&apos;t work is the trade that made you money.
            </p>
            <p className="not-prose"></p>
          </div>

          <PostSources
            sources={[
              {
                title: "Mashvisor, Pricing",
                url: "https://www.mashvisor.com/pricing",
              },
              {
                title: "Roofstock, homepage",
                url: "https://www.roofstock.com/",
              },
              {
                title: "Stessa, Investment Properties Powered by Roofstock",
                url: "https://www.stessa.com/investment-properties",
              },
              {
                title: "PropStream, Real Estate Lead List Definitions",
                url: "https://www.propstream.com/propstream-lead-list-definitions",
              },
              {
                title: "PropStream, Pricing",
                url: "https://www.propstream.com/pricing",
              },
              {
                title: "Stessa, Investment Property Marketplace",
                url: "https://www.stessa.com/investment-property-marketplace/",
              },
              {
                title: "PropStream, homepage",
                url: "https://www.propstream.com/",
              },
              {
                title:
                  "Stessa Help Center, Stessa Investment Properties Marketplace",
                url: "https://support.stessa.com/en/articles/10779191-stessa-investment-properties-marketplace",
              },
              {
                title: "Rentometer, homepage",
                url: "https://www.rentometer.com/",
              },
            ]}
          />

          <div className="mt-10">
            <NewsletterSignup />
          </div>

          <RelatedContent kind="blog" slug={SLUG} title={TITLE} className="mt-10" />

          <div className="mt-10">
            <RelatedBlogPosts currentSlug={SLUG} limit={3} />
          </div>
        </article>
      </main>

      <BlogStickyCta />
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
