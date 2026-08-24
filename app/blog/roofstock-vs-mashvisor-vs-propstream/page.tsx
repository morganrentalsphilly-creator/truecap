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
import { ArrowUpRight, Calculator } from "lucide-react";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "roofstock-vs-mashvisor-vs-propstream";
const TITLE = "Roofstock vs Mashvisor vs PropStream: 3-way deal discovery comparison";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Roofstock vs Mashvisor vs PropStream (2026)";
const DESCRIPTION =
  "Roofstock sells turnkey rentals. Mashvisor scores neighborhoods. PropStream finds motivated sellers. Honest 3-way comparison plus where TrueCap fits after they each find you a property.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = "2026-06-07";
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
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: SERP_TITLE,
    description: DESCRIPTION,
    images: ["/home.jpg"],
  },
};

const FAQ_ITEMS = [
  {
    q: `Roofstock, Mashvisor, or PropStream — which one for a beginner?`,
    a: `Roofstock. It's the easiest path to ownership for a first-time investor — curated inventory, brokerage handles the transaction, PM partners are pre-vetted. Mashvisor and PropStream both assume you're going to find + close + operate yourself, which is more work.`,
  },
  {
    q: `Do any of these underwrite deals?`,
    a: `Not really. Roofstock provides listing pro-formas (marketing material — optimistic on vacancy and capex). Mashvisor gives neighborhood-level cap rate + Airbnb scores (directional, not deal-specific). PropStream gives you a lead and contact info, no analysis. For per-deal underwriting use TrueCap, DealCheck, or a spreadsheet.`,
  },
  {
    q: `Mashvisor vs Rentometer — what's the difference?`,
    a: `Rentometer is rent estimation only (comp-based, address-level). Mashvisor is broader market discovery — heatmaps, neighborhood scoring, Airbnb data, comparable sales. Use Rentometer when you need a tight rent estimate on a specific address; use Mashvisor when you're picking which market to invest in.`,
  },
  {
    q: `Is PropStream worth \$99/month?`,
    a: `Depends on volume. If you send 1,000+ direct mail pieces a month or run an active wholesaling operation, yes — lists and skip-tracing pay for themselves quickly. If you buy 1-3 properties a year through MLS or your network, PropStream is overkill. For most TrueCap users (solo buy-and-hold investors), PropStream is too much tool.`,
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
    author: { "@type": "Organization", name: "TrueCap", url: siteUrl },
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-2">
          <Link
            href="/blog"
            className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
          >
            ← TrueCap Blog
          </Link>
        </div>

        <article>
          <header className="mb-8 sm:mb-10">
            <div className="text-[11px] uppercase tracking-widest text-primary font-bold mb-3">
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
          </header>

          {/* TL;DR */}
          <section className="mb-10 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-3">
              TL;DR
            </h2>
            <p
              className="text-sm sm:text-base leading-relaxed text-foreground"
              dangerouslySetInnerHTML={{ __html: `All three help you <em>find</em> rental property deals; none of them <em>underwrite</em> them. <strong>Roofstock</strong> is a marketplace selling curated turnkey single-family rentals (you bring the buyer, they bring the property). <strong>Mashvisor</strong> is market discovery — heatmaps, neighborhood Airbnb / LTR scores, comparable sales. <strong>PropStream</strong> is lead generation — skip-tracing, motivated-seller lists, pre-foreclosure data. Different ways to source. <strong>TrueCap</strong> isn&apos;t in this category — it&apos;s an underwriting calculator that models cash flow from user-reviewed assumptions after a property is found.` }}
            />
          </section>

          <div className="prose prose-neutral max-w-none prose-headings:font-extrabold prose-headings:text-foreground prose-p:text-foreground prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-li:text-foreground prose-li:leading-relaxed">
            <h2>The three in one sentence each</h2>
            <div dangerouslySetInnerHTML={{ __html: `<ul>
              <li><strong>Roofstock</strong> — turnkey SFR marketplace. Browse curated single-family rentals (often already tenanted), buy through Roofstock's brokerage, get matched with pre-vetted PM partners. Free to browse; 0.5% buyer marketplace fee at close (~\$1-3k on a typical SFR).</li>
              <li><strong>Mashvisor</strong> — market discovery + neighborhood scoring. Heatmaps for cap rate, cash-on-cash, and Airbnb potential by neighborhood. Comparable rental + sales data. Plans range from ~\$70-\$300/month (as of 2026) depending on data depth.</li>
              <li><strong>PropStream</strong> — lead generation. Pull lists of motivated sellers (pre-foreclosure, probate, vacant, tax delinquent), skip-trace to find owner phone + email, run direct mail or cold call campaigns. ~\$99/month (as of 2026).</li>
            </ul>` }} />

            <h2>How they differ — what each is actually good at</h2>
            <div dangerouslySetInnerHTML={{ __html: `<ul>
              <li><strong>Roofstock</strong> is the easiest path to owning a rental property if you don&apos;t want to find or operate it yourself. They handle inventory + brokerage + PM matching. Tradeoff: you&apos;re paying retail-plus (asking price + 0.5% buyer fee + the seller&apos;s margin since these are flipped or already cash-flowing properties).</li>
              <li><strong>Mashvisor</strong> is great for the early &quot;where should I invest?&quot; phase. The heatmaps quickly answer questions like &quot;which Phoenix zip codes have the best Airbnb cash flow?&quot; or &quot;is Memphis or Cleveland better for cash flow?&quot;. Once you&apos;ve picked a market, the per-deal data is less differentiated.</li>
              <li><strong>PropStream</strong> is the heavyweight for off-market deal sourcing. If you send direct mail or run cold-call campaigns, PropStream&apos;s lists + skip-tracing are the standard. Most wholesalers and serious off-market buy-and-hold investors run on PropStream.</li>
            </ul>` }} />

            <h2>Pricing comparison</h2>
            <div dangerouslySetInnerHTML={{ __html: `<ul>
              <li><strong>Roofstock</strong> — free to browse the marketplace. 0.5% buyer marketplace fee charged at close (typically \$1-3k on an SFR). No monthly subscription.</li>
              <li><strong>Mashvisor</strong> — ~\$70-300/month depending on plan. The cheaper plans have rate limits and limited geographic coverage; the higher plans unlock full Airbnb data + commercial data.</li>
              <li><strong>PropStream</strong> — ~\$99/month for the standard plan. Add-ons for skip tracing, list pull volume, and team seats can push it to \$150+/mo. No real free tier (trial only).</li>
            </ul>
            <p>If you&apos;re buying one or two properties a year through Roofstock, the 0.5% fee is the cheapest of the three. If you&apos;re actively sourcing 5-10+ deals a year off-market, PropStream pays for itself in one closed deal. Mashvisor&apos;s subscription pays off if you&apos;re market-shopping across regions; if you&apos;re a hometown investor, it&apos;s often overkill.</p>` }} />

            <h2>Which combo to use?</h2>
            <div dangerouslySetInnerHTML={{ __html: `<ul>
              <li><strong>Just Roofstock</strong> — for passive out-of-state SFR investors who want curated inventory + done-for-you PM matching. Simplest path to ownership.</li>
              <li><strong>Mashvisor + your MLS access</strong> — for investors who want to pick the right market first, then source on-market deals through a local agent.</li>
              <li><strong>PropStream + your closing team</strong> — for active off-market buyers / wholesalers / fix-and-flippers. You source the deal, negotiate, close with a title company.</li>
              <li><strong>Mashvisor + Roofstock</strong> — Mashvisor picks the markets, Roofstock has the inventory in those markets. Common combo for first-time out-of-state SFR investors.</li>
            </ul>` }} />

            <h2>Where TrueCap fits — after the deal is found</h2>
            <div dangerouslySetInnerHTML={{ __html: `<p>None of the three calculates whether a specific property actually cash flows under your assumptions. They surface deals; you still have to underwrite them.</p>
            <p>That&apos;s the TrueCap job: paste the address, get HUD rent / FRED rate / state property tax pre-filled, override anything you have better data on, run cap rate / CoC / DSCR / cash flow, sensitize the inputs, decide.</p>
            <p>Roofstock&apos;s listing pro-formas are marketing material — they assume optimistic vacancy + light capex. Mashvisor&apos;s neighborhood scores are directional, not deal-specific. PropStream gives you a lead, not an analysis. TrueCap turns reviewed inputs into a modeled underwrite; the user makes the decision.</p>` }} />

            <h2>Honest quick decision</h2>
            <div dangerouslySetInnerHTML={{ __html: `<ul>
              <li><strong>&quot;I want to own a rental without managing the sourcing or operations.&quot;</strong> Roofstock + a property management partner.</li>
              <li><strong>&quot;I want to figure out which city / neighborhood to invest in.&quot;</strong> Mashvisor (then go local).</li>
              <li><strong>&quot;I want to find off-market deals + send direct mail.&quot;</strong> PropStream.</li>
              <li><strong>&quot;I have a deal in hand and want to know if it pencils.&quot;</strong> TrueCap (free).</li>
            </ul>` }} />

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
            <p>However you source deals — turnkey marketplace, market heatmap, or off-market list — run them through TrueCap before you offer. 60 seconds, free, no signup. The deal you didn&apos;t buy because the numbers didn&apos;t work is the trade that made you money.</p>
            <p className="not-prose">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-3 font-bold hover:opacity-90"
              >
                <Calculator className="w-4 h-4" />
                Run a deal — 60 seconds
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </p>
          </div>

          <div className="mt-10">
            <NewsletterSignup />
          </div>

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
