/**
 * Listicle blog post: "Best rental property calculator 2026: 7 tools
 * compared". High-commercial-intent comparison-shopper search demand
 * — captures "best rental property calculator" / "best rental
 * analysis tool" queries that aren't direct competitor lookups.
 *
 * Schema: Article + Breadcrumb + FAQPage + ItemList (the 7 calculators
 * as a ranked list).
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

const SLUG = "best-rental-property-calculator-2026";
const TITLE = "Best rental property calculator 2026: 7 tools compared";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Best rental property calculator 2026: 7 compared";
const DESCRIPTION =
  "Honest 2026 ranking of the 7 most popular rental property calculators — TrueCap, DealCheck, BiggerPockets, Mashvisor, Stessa, Excel, and Roofstock — across free tier depth, pricing, mobile, and audience fit.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = "2026-06-07";
const READING_TIME_MIN = 12;

export const metadata: Metadata = {
  title: SERP_TITLE,
  description: DESCRIPTION,
  keywords: [
    "best rental property calculator",
    "best rental analysis tool",
    "rental property calculator comparison",
    "best real estate investment calculator",
    "rental property analyzer ranking",
    "free rental property calculator",
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

const RANKED_CALCULATORS = [
  {
    rank: 1,
    name: "TrueCap",
    bestFor: "Best free tier + best single-tier Pro pricing",
    url: "/",
    pricing: "Free; Pro $29.99/mo (or $300/yr annual)",
    pros: [
      "Deepest free tier — full cap rate, CoC, DSCR, NCF, monthly cash flow with no signup or analysis cap",
      "Address auto-fill from HUD Fair Market Rent + FRED 30-year rate + state property tax (no other tool does all three)",
      "Plain-English verdict (Strong / Solid / Mixed / Marginal / Negative) on every deal",
      "Single $29.99/mo Pro tier bundles 10-year projections, illustrative tax impact, sensitivity, modeled exit comparisons, MAO solver, BRRRR, fix-and-flip — no per-feature upcharges",
      "Lender-facing PDF + shareable read-only deal link with optional custom branding",
    ],
    cons: [
      "PWA, not native iOS/Android apps (DealCheck wins on pure mobile)",
      "Listing import is address-only — paste a Zillow/Redfin link and TrueCap pulls the address, not the listing's price, taxes or photos",
    ],
    pickIf: "You want the deepest free tier and the most capable Pro tier at the cheapest single price.",
  },
  {
    rank: 2,
    name: "DealCheck",
    bestFor: "Best mobile experience + best listing import",
    url: "/vs/dealcheck",
    pricing: "Free Starter, Plus $10/mo, Pro $20/mo (as of June 2026)",
    pros: [
      "Native iOS and Android apps with offline support",
      "Listing-import-from-Zillow workflow — paste a URL and the property details auto-fill",
      "10+ year track record in the BRRRR + buy-and-hold communities",
      "Strong 10-year projection + tax-impact view in higher tiers",
    ],
    cons: [
      "Free tier caps saved properties (15 at a time) and requires signup",
      "Paid tiers mostly raise caps rather than add analysis depth",
      "No address-based auto-fill (HUD / FRED / state tax) — you bring the data",
    ],
    pickIf: "You underwrite on mobile at showings all day and want native apps.",
  },
  {
    rank: 3,
    name: "BiggerPockets Calculator",
    bestFor: "Best if you already pay for BiggerPockets Pro",
    url: "/vs/biggerpockets-calculator",
    pricing: "Bundled with BiggerPockets Pro ~$390/year (~$32.50/mo)",
    pros: [
      "Bundled with the largest real-estate community on the internet (forums, courses, books, podcasts)",
      "Output format is recognized by private-money lenders and BP-aware partners",
      "Solid BRRRR + flip + buy-and-hold support",
    ],
    cons: [
      "Calculator alone isn't the value — you're really paying for the community",
      "UX hasn't evolved much in years; mobile is desktop-leaning",
      "No portfolio rollup across saved deals",
      "Free tier is more limited than TrueCap's",
    ],
    pickIf: "You're already paying for BiggerPockets for the community and the calculator is a bonus.",
  },
  {
    rank: 4,
    name: "Mashvisor",
    bestFor: "Best for market discovery (heatmaps + neighborhood scoring)",
    url: "/vs/mashvisor",
    pricing: "~$70-300/month depending on data depth (as of 2026)",
    pros: [
      "Best-in-class neighborhood heatmaps and city-level investibility scores",
      "Strong Airbnb / short-term-rental occupancy + ADR data",
      "Comparable rental + sales data baked in",
    ],
    cons: [
      "Not really a per-deal calculator — more a market discovery tool",
      "Listing-level cap rate uses assumed inputs (not your specific assumptions)",
      "Expensive for solo investors (the $300/mo tier is built for active multi-market scouting)",
    ],
    pickIf: "You're picking which city or neighborhood to invest in next, not underwriting a specific property.",
  },
  {
    rank: 5,
    name: "Stessa",
    bestFor: "Best post-purchase accounting (not actually a calculator)",
    url: "/vs/stessa",
    pricing: "Free; Stessa Pro ~$12/mo",
    pros: [
      "Best-in-class rental accounting + bookkeeping — bank-feed sync, auto-categorization, Schedule E",
      "Free tier on unlimited properties",
      "Strong multi-property dashboard for ongoing operations",
    ],
    cons: [
      "Doesn't underwrite — you can't paste an address and get a cap rate / DSCR / cash flow analysis",
      "Forward projection only on Pro; primarily a backward-looking actuals tool",
      "Different category — Stessa is for properties you own, not properties you're considering",
    ],
    pickIf: "You already own rentals and need to track income + expenses for tax time. Pair with TrueCap for the pre-purchase math.",
  },
  {
    rank: 6,
    name: "Excel / Google Sheets",
    bestFor: "Best if you've already invested time in a custom model",
    url: "/vs/excel",
    pricing: "Free (or your existing Office / Google Workspace subscription)",
    pros: [
      "Total control — model anything",
      "Free if you already have Office / Workspace",
      "Familiar to most investors with finance backgrounds",
    ],
    cons: [
      "Formula errors compound silently across every deal",
      "Mobile UX is broken at the property showing",
      "No address auto-fill, no live data, no shareable read-only link",
      "Version drift kills collaboration with partners and lenders",
      "Maintenance cost over time is real — every market change requires manual updates",
    ],
    pickIf: "You have a battle-tested model that handles your specific deal type (syndication waterfalls, custom debt structures) and don't need mobile.",
  },
  {
    rank: 7,
    name: "Roofstock",
    bestFor: "Best if you don't want to find or operate the property",
    url: "/vs/roofstock",
    pricing: "Free to browse; 0.5% buyer fee at close (~$1-3k typical)",
    pros: [
      "Curated turnkey SFR inventory — pre-vetted properties + property management partners",
      "Easiest path to ownership if you don't want to source deals yourself",
      "Listing-level pro-formas give you a starting financial picture",
    ],
    cons: [
      "Not a calculator — it's a marketplace with listing pro-formas",
      "Pro-formas are marketing material (optimistic vacancy + light capex)",
      "Limited to Roofstock's inventory, not any property",
      "You're paying retail-plus once the buyer fee + seller's margin are factored in",
    ],
    pickIf: "You want a passive turnkey rental and don't have time to source or operate. Pair with TrueCap to pressure-test the listing pro-forma before offering.",
  },
];

const FAQ_ITEMS = [
  {
    q: "What's the best rental property calculator in 2026?",
    a: "TrueCap edges out for most investors — deepest free tier, simplest pricing (one $29.99/mo Pro tier with everything bundled, vs DealCheck's cap-based tier ladder or $390/year on BiggerPockets), address auto-fill from HUD/FRED/state tax, and a plain-English verdict on every deal. DealCheck wins if you need native iOS/Android apps. BiggerPockets is the right answer if you already pay for the community.",
  },
  {
    q: "What's the best free rental property calculator?",
    a: "TrueCap has the deepest free tier of any rental calculator on the market — unlimited analyses, full cap rate / CoC / DSCR / NCF / monthly cash flow with address auto-fill, no signup required, no analysis cap. DealCheck's free tier requires signup and caps saved properties at 15. BiggerPockets gives a few free reports then gates to its $390/year Pro tier.",
  },
  {
    q: "DealCheck vs BiggerPockets vs TrueCap — which is best?",
    a: "Depends on what you optimize for. TrueCap wins on free tier depth, pricing, and single-tier Pro simplicity. DealCheck wins on native mobile apps and listing-import workflow. BiggerPockets makes sense if you're already paying for the community access bundled with Pro. For the calculator alone, TrueCap has a deeper free tier and bundles everything in one Pro tier.of either.",
  },
  {
    q: "Is Mashvisor a rental property calculator?",
    a: "Sort of — Mashvisor shows listing-level cap rate estimates but is really a market discovery + revenue projection tool, not a per-deal calculator. It's strong for picking which neighborhood to invest in; weaker for underwriting a specific address. Most active investors pair Mashvisor (market discovery) with TrueCap or DealCheck (deal underwriting).",
  },
  {
    q: "Why are spreadsheets risky for rental analysis?",
    a: "Three reasons: formula errors compound silently across every deal you analyze with that sheet; version drift kills partner / lender collaboration; mobile is unusable at showings. Spreadsheets work for one-off custom modeling (syndication waterfalls, unusual debt structures) but they're fragile for standard buy-and-hold underwriting.",
  },
  {
    q: "What about Stessa, RentRedi, or Avail — are those calculators?",
    a: "No — those are post-purchase landlord operations platforms (accounting, rent collection, leasing). They're complementary to TrueCap / DealCheck / BiggerPockets, not competitors. The full stack for most landlords: a calculator (TrueCap / DealCheck / BP) for pre-purchase underwriting + an ops platform (Stessa / Avail / Baselane) for after closing.",
  },
];

export default function BestRentalPropertyCalculator2026Post() {
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

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: RANKED_CALCULATORS.map((c) => ({
      "@type": "ListItem",
      position: c.rank,
      name: c.name,
      description: c.bestFor,
    })),
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
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
              Ranking · {READING_TIME_MIN} min read
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

          <section className="mb-10 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-3">
              Quick answer
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-foreground">
              For most investors in 2026: <strong>TrueCap</strong> (deepest
              free tier, $29.99/mo Pro, address auto-fill from HUD + FRED + state
              tax). <strong>DealCheck</strong> if you live on mobile at
              showings. <strong>BiggerPockets</strong> if you already pay for
              the community. <strong>Mashvisor</strong> for market discovery
              (not per-deal underwriting). <strong>Stessa</strong> for
              post-purchase accounting (not actually a calculator).
              <strong> Excel</strong> only if you have a battle-tested model
              already. <strong>Roofstock</strong> if you want passive turnkey
              ownership with someone else doing the sourcing.
            </p>
          </section>

          <div className="prose prose-neutral max-w-none prose-headings:font-extrabold prose-headings:text-foreground prose-p:text-foreground prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-li:text-foreground prose-li:leading-relaxed">
            <h2>How we ranked these</h2>
            <p>
              The 7 calculators below are the ones rental investors most often
              evaluate when they search &quot;best rental property
              calculator&quot; or &quot;rental analysis tool&quot;. If you just
              want a single metric fast, our free{" "}
              <Link href="/tools/cap-rate-calculator" className="font-semibold text-primary hover:underline">cap rate calculator</Link>,{" "}
              <Link href="/tools/cash-on-cash-calculator" className="font-semibold text-primary hover:underline">cash-on-cash return calculator</Link>, and{" "}
              <Link href="/tools/dscr-calculator" className="font-semibold text-primary hover:underline">DSCR calculator</Link>{" "}
              each handle one piece of the underwrite with no signup. Ranking
              criteria, weighted roughly by impact on a typical solo investor:
            </p>
            <ol>
              <li>
                <strong>Free tier depth</strong> — can you actually underwrite
                a deal without paying? How many per month?
              </li>
              <li>
                <strong>Pricing</strong> — total cost for the calculator alone,
                not bundled with community or other services.
              </li>
              <li>
                <strong>Address auto-fill</strong> — does it pre-fill rent,
                rate, and tax from your address, or does it leave you to look
                everything up?
              </li>
              <li>
                <strong>Mobile UX</strong> — can you underwrite at a showing
                on your phone?
              </li>
              <li>
                <strong>Pro feature depth</strong> — projections, illustrative tax impact,
                sensitivity, co-branded share links, PDF export.
              </li>
              <li>
                <strong>Audience fit</strong> — is the tool built for solo
                investors, scaling landlords, professional managers, or
                someone else?
              </li>
            </ol>

            <h2>The 7 calculators, ranked</h2>

            {RANKED_CALCULATORS.map((c) => (
              <div
                key={c.name}
                className="not-prose mb-8 rounded-2xl border border-border bg-card p-5 sm:p-6"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1.5">
                      #{c.rank} · {c.bestFor}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-foreground leading-tight">
                      {c.name}
                    </h3>
                  </div>
                  <Link
                    href={c.url}
                    className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    Deep dive
                    <ArrowUpRight className="size-3" />
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  <strong className="text-foreground">Pricing:</strong> {c.pricing}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--brand-green)] mb-2">
                      Pros
                    </p>
                    <ul className="space-y-1.5 text-sm text-foreground">
                      {c.pros.map((pro) => (
                        <li key={pro} className="flex gap-2">
                          <span className="text-[var(--brand-green)] shrink-0">+</span>
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                      Cons
                    </p>
                    <ul className="space-y-1.5 text-sm text-foreground">
                      {c.cons.map((con) => (
                        <li key={con} className="flex gap-2">
                          <span className="text-muted-foreground/60 shrink-0">−</span>
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="rounded-lg bg-primary/5 border border-primary/15 px-3 py-2.5 text-sm">
                  <strong className="text-primary">Pick if:</strong>{" "}
                  <span className="text-foreground">{c.pickIf}</span>
                </div>
              </div>
            ))}

            <h2>Quick decision matrix</h2>
            <ul>
              <li>
                <strong>&quot;I want the cheapest Pro tier.&quot;</strong> TrueCap — the deepest free tier, with everything bundled in one $29.99/mo Pro tier.
              </li>
              <li>
                <strong>&quot;I want the deepest free tier.&quot;</strong> TrueCap — unlimited analyses, no signup, no analysis cap.
              </li>
              <li>
                <strong>&quot;I underwrite on my phone at every showing.&quot;</strong> DealCheck — only one with true native iOS / Android apps.
              </li>
              <li>
                <strong>&quot;I already pay for BiggerPockets.&quot;</strong> Use their calculator — you&apos;re already there.
              </li>
              <li>
                <strong>&quot;I&apos;m scouting which city to invest in.&quot;</strong> Mashvisor — heatmaps and neighborhood scores.
              </li>
              <li>
                <strong>&quot;I already own rentals and need accounting.&quot;</strong> Stessa — it&apos;s not a calculator but it&apos;s the right post-purchase tool. Pair with TrueCap or DealCheck for new acquisitions.
              </li>
              <li>
                <strong>&quot;I want a turnkey rental I don&apos;t have to source or manage.&quot;</strong> Roofstock — but pressure-test the listing pro-forma in TrueCap before offering.
              </li>
              <li>
                <strong>&quot;I have a custom Excel model that works for my deals.&quot;</strong> Keep it — but consider TrueCap free as a sanity check on the formulas.
              </li>
            </ul>

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
              The fastest way to know which calculator fits your workflow is to
              run one of your real deals through it. TrueCap is free, takes 60
              seconds, no signup required. Paste an address, accept the
              auto-filled rent / rate / tax, type purchase price.
            </p>
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
