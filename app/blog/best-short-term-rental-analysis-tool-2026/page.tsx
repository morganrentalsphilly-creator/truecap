/**
 * Listicle blog post: best-short-term-rental-analysis-tool-2026.
 * Schema: Article + Breadcrumb + ItemList + FAQPage.
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

const SLUG = "best-short-term-rental-analysis-tool-2026";
const TITLE = "Best short-term rental analysis tool 2026: 6 tools STR investors compare";
const DESCRIPTION =
  "Honest 2026 ranking of the best STR analysis tools — AirDNA for revenue data, TrueCap for underwriting, Mashvisor for market discovery, plus PMS platforms STR investors evaluate.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = "2026-06-07";
const READING_TIME_MIN = 10;

export const metadata: Metadata = {
  title: `${TITLE} | TrueCap Blog`,
  description: DESCRIPTION,
  keywords: [
    "best str analysis tool",
    "best airbnb investment calculator",
    "best short term rental analyzer",
    "airbnb deal analysis 2026",
    "str investment tool",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `/blog/${SLUG}`,
    type: "article",
    publishedTime: PUBLISHED_AT,
    modifiedTime: MODIFIED_AT,
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/home.jpg"] },
};

const TOOLS = [
  {
    rank: 1,
    name: "AirDNA (revenue data)",
    bestFor: "Best STR revenue projection per property",
    url: "/vs/airdna",
    pricing: "Free MarketMinder; Rentalizer ~$20-40 per property; subs $50-200+/mo",
    freeCovers: [
      "Free MarketMinder dashboard with limited data",
      "Industry-standard ADR + occupancy + RevPAR by market"
    ],
    freeGates: [
      "Per-property Rentalizer reports cost $20-40 each",
      "API + advanced market data on paid tiers"
    ],
    pickIf: "You need address-level STR revenue projections derived from real Airbnb + Vrbo data.",
  },
  {
    rank: 2,
    name: "TrueCap (underwriting)",
    bestFor: "Best STR underwriting with LTR/STR scenario comparison",
    url: "/vs/dealcheck-for-short-term-rentals",
    pricing: "Free; Pro $19/mo",
    freeCovers: [
      "Plug AirDNA monthly revenue into rent field; run full cap rate / DSCR / cash flow",
      "Compare LTR vs STR scenarios on same property",
      "STR-aware tax strategy (Pro — bonus depreciation, cost seg)"
    ],
    freeGates: [
      "12-month seasonal income breakdown (Pro)",
      "Sensitivity grid stress-tests STR revenue ±10% (Pro)"
    ],
    pickIf: "You have AirDNA's revenue projection and need to turn it into a buy/no-buy decision.",
  },
  {
    rank: 3,
    name: "Mashvisor (market discovery)",
    bestFor: "Best STR market scouting (heatmaps + neighborhood scores)",
    url: "/vs/mashvisor-for-short-term-rentals",
    pricing: "~$70-300/mo",
    freeCovers: [
      "Free dashboard with limited data",
      "STR + LTR neighborhood scores",
      "Heatmaps for cap rate / Airbnb potential"
    ],
    freeGates: [
      "Full data + Airbnb-comp depth on paid tiers"
    ],
    pickIf: "You're scouting which city or neighborhood to invest in next (not underwriting a specific address).",
  },
  {
    rank: 4,
    name: "DealCheck (alternative underwriting)",
    bestFor: "Mobile + listing import for STR-curious buyers",
    url: "/vs/dealcheck-for-short-term-rentals",
    pricing: "Plus ~$25/mo",
    freeCovers: [
      "Standard rental underwriting, override rent with STR projection",
      "Listing import from Zillow / Redfin",
      "Native iOS + Android apps"
    ],
    freeGates: [
      "No LTR vs STR scenario comparison view",
      "No STR-specific tax loophole modeling"
    ],
    pickIf: "You're mobile-first at showings and willing to manually toggle between LTR and STR scenarios.",
  },
  {
    rank: 5,
    name: "Hostaway / Hostfully (PMS — post-purchase)",
    bestFor: "Best STR management AFTER closing",
    url: "/vs/hostaway",
    pricing: "$10-15/listing/mo (Hostaway) or $109+/mo (Hostfully)",
    freeCovers: [
      "Channel manager across Airbnb / Vrbo / Booking",
      "Guest messaging automation",
      "Dynamic pricing integrations"
    ],
    freeGates: [
      "NOT underwriting tools — these manage STRs you already own"
    ],
    pickIf: "You've already closed and need to operate the property. Use TrueCap to underwrite, then pick a PMS.",
  },
  {
    rank: 6,
    name: "Excel / Google Sheets",
    bestFor: "Custom seasonal STR cash-flow modeling",
    url: "/vs/excel",
    pricing: "Free",
    freeCovers: [
      "Total flexibility — model seasonal ADR curves, weekend premiums, off-season vacancy"
    ],
    freeGates: [
      "You build the seasonality model yourself",
      "Mobile is broken at showings"
    ],
    pickIf: "You have a battle-tested STR template with custom seasonal modeling.",
  },
];

const FAQ_ITEMS = [
  { q: "What's the best all-in-one STR investment tool?", a: "There isn't one. STR investing requires three different jobs: revenue projection (AirDNA), underwriting (TrueCap or DealCheck), and post-purchase ops (Hostaway / Hostfully / Lodgify). Tools that claim to do all three either do one well and the others poorly, or are enterprise-priced. Most successful STR investors use 2-3 tools in combination." },
  { q: "AirDNA vs Mashvisor for STR — which one?", a: "AirDNA is more STR-specific and considered the gold standard for ADR / occupancy / RevPAR data. Mashvisor covers both STR and LTR plus broader market analysis. STR-primary investors lean AirDNA. Investors toggling between LTR and STR on the same property lean Mashvisor's broader scope." },
  { q: "Can TrueCap model short-term rental revenue?", a: "Yes, indirectly — every input in TrueCap is editable. Plug AirDNA's projected monthly STR revenue (gross income ÷ 12, discounted for vacancy + cleaning) into the rent field, run the full underwrite. TrueCap doesn't pull AirDNA data automatically; you copy the number across." },
  { q: "What management rate should I use for STR underwriting?", a: "Long-term rentals: 8-10%. Short-term rentals: 20-25% with a full-service PM (channel management + guest comms + cleaning coordination). If you self-manage, 0-5% (just covering software + cleaner coordination) but be honest about your time. TrueCap's management field is editable." },
  { q: "Does TrueCap support the STR tax loophole?", a: "Yes — Pro tax strategy supports accelerated depreciation scenarios including bonus depreciation and cost segregation for STRs. The REPS / STR loophole framework can be incorporated. Always consult your CPA for the specific math; TrueCap provides the cash flow + depreciation timeline they need." },
];

const DECISION_LINES: Array<{ q: string; a: string }> = [
  { q: "You need address-level STR revenue projections.", a: "AirDNA Rentalizer" },
  { q: "You have the revenue and need full underwriting.", a: "TrueCap (free for basic, Pro for sensitivity)" },
  { q: "You're scouting which city to invest in.", a: "Mashvisor" },
  { q: "You've already closed and need to operate the STR.", a: "Hostaway or Hostfully (PMS)" },
  { q: "You want a single all-in-one tool.", a: "No single tool covers the full workflow — use 2-3 in combination" },
];

export default function BestShortTermRentalAnalysisTool2026Post() {
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
    itemListElement: TOOLS.map((t) => ({
      "@type": "ListItem",
      position: t.rank,
      name: t.name,
      description: t.bestFor,
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
          <Link href="/blog" className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground">
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
            <p className="mt-4 text-xs text-muted-foreground">Published {PUBLISHED_AT}</p>
          </header>

          <section className="mb-10 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-3">Quick answer</h2>
            <p className="text-sm sm:text-base leading-relaxed text-foreground" dangerouslySetInnerHTML={{ __html: `STR investors need two tools: one for revenue projection (<strong>AirDNA</strong> or <strong>Mashvisor</strong>) and one for underwriting (<strong>TrueCap</strong>, <strong>DealCheck</strong>, or a spreadsheet). PMS platforms (<strong>Hostfully</strong>, <strong>Hostaway</strong>, <strong>Guesty</strong>) come after the deal closes — they don&apos;t underwrite. The combined stack is the workflow.` }} />
          </section>

          <div className="prose prose-neutral max-w-none prose-headings:font-extrabold prose-headings:text-foreground prose-p:text-foreground prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-li:text-foreground prose-li:leading-relaxed">
            <h2>The tools, ranked for short-term rental investors</h2>

            {TOOLS.map((t) => (
              <div key={t.name} className="not-prose mb-8 rounded-2xl border border-border bg-card p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1.5">
                      #{t.rank} · {t.bestFor}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-foreground leading-tight">
                      {t.name}
                    </h3>
                  </div>
                  <Link href={t.url} className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                    Deep dive
                    <ArrowUpRight className="size-3" />
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  <strong className="text-foreground">Pricing:</strong> {t.pricing}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--brand-green)] mb-2">
                      Free tier covers
                    </p>
                    <ul className="space-y-1.5 text-sm text-foreground">
                      {t.freeCovers.map((p) => (
                        <li key={p} className="flex gap-2">
                          <span className="text-[var(--brand-green)] shrink-0">+</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                      Where the gates kick in
                    </p>
                    <ul className="space-y-1.5 text-sm text-foreground">
                      {t.freeGates.map((p) => (
                        <li key={p} className="flex gap-2">
                          <span className="text-muted-foreground/60 shrink-0">−</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="rounded-lg bg-primary/5 border border-primary/15 px-3 py-2.5 text-sm">
                  <strong className="text-primary">Pick if:</strong>{" "}
                  <span className="text-foreground">{t.pickIf}</span>
                </div>
              </div>
            ))}

            <h2>Quick decision matrix</h2>
            <ul>
              {DECISION_LINES.map((d) => (
                <li key={d.q}>
                  <strong>&ldquo;{d.q}&rdquo;</strong> {d.a}.
                </li>
              ))}
            </ul>

            <h2>FAQ</h2>
            <div className="not-prose space-y-3">
              {FAQ_ITEMS.map((item) => (
                <details key={item.q} className="group rounded-xl border border-border bg-card p-4 sm:p-5">
                  <summary className="cursor-pointer list-none flex items-start justify-between gap-3 font-bold text-sm sm:text-base text-foreground">
                    <span>{item.q}</span>
                    <span aria-hidden className="mt-1 size-5 shrink-0 rounded-full border border-border text-muted-foreground text-xs leading-none flex items-center justify-center transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <div className="mt-3 text-sm text-muted-foreground leading-relaxed">{item.a}</div>
                </details>
              ))}
            </div>

            <h2>Try TrueCap free</h2>
            <p>
              The fastest way to know which tool fits your workflow is to run
              one of your real deals through it. TrueCap is free for the core
              underwriting, takes 60 seconds, no signup required.
            </p>
            <p className="not-prose">
              <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-3 font-bold hover:opacity-90">
                <Calculator className="w-4 h-4" />
                Run a deal — 60 seconds
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </p>
          </div>

          <div className="mt-10"><NewsletterSignup /></div>
          <div className="mt-10"><RelatedBlogPosts currentSlug={SLUG} limit={3} /></div>
        </article>
      </main>

      <BlogStickyCta />
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
