/**
 * Listicle blog post: best-short-term-rental-analysis-tool-2026.
 * Schema: Article + Breadcrumb + ItemList + FAQPage.
 */

import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
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

const SLUG = "best-short-term-rental-analysis-tool-2026";
const TITLE =
  "Best short-term rental analysis tool 2026: 6 tools STR investors compare";
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Best short-term rental analysis tool 2026";
const DESCRIPTION =
  "2026 ranking of the best STR analysis tools: AirDNA for revenue data, TrueCap for underwriting, Mashvisor for market discovery, plus the PMS platforms.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = lastmodFor("/blog/best-short-term-rental-analysis-tool-2026") ?? PUBLISHED_AT;
const READING_TIME_MIN = 10;

export const metadata: Metadata = {
  title: SERP_TITLE,
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

/** Inline source link inside the not-prose tool cards. */
const SOURCE_LINK = "font-semibold text-primary hover:underline";

type Tool = {
  rank: number;
  name: string;
  bestFor: string;
  url: string;
  pricing: ReactNode;
  /** Left-column heading; defaults to "Free tier covers". */
  coversLabel?: string;
  freeCovers: ReactNode[];
  freeGates: ReactNode[];
  pickIf: ReactNode;
};

const TOOLS: Tool[] = [
  {
    rank: 1,
    name: "AirDNA (revenue data)",
    bestFor: "Best STR revenue projection per property",
    url: "/vs/airdna",
    pricing: (
      <>
        Free plan; Market Research{" "}
        <a href="https://www.airdna.co/pricing" className={SOURCE_LINK}>
          $34/mo billed annually ($400/yr) or $125 month-to-month
        </a>
        ; Property Manager by quote (as of September 2026)
      </>
    ),
    freeCovers: [
      "Free plan with a limited Rentalizer and limited market insights",
      <>
        Key metrics by market:{" "}
        <a
          href="https://help.airdna.co/en/articles/11954306-navigating-the-new-airdna-market-explorer-platform"
          className={SOURCE_LINK}
        >
          ADR, occupancy and RevPAR
        </a>
      </>,
    ],
    freeGates: [
      "The customizable Rentalizer is on paid plans (Market Research includes 5 Rentalizer Agent Reports)",
      "Historical market data, comparable sets and future-demand data start on the paid Market Research plan",
    ],
    pickIf: (
      <>
        You need address-level STR revenue projections derived from real{" "}
        <a href="https://www.airdna.co/" className={SOURCE_LINK}>
          Airbnb + Vrbo data
        </a>
        .
      </>
    ),
  },
  {
    rank: 2,
    name: "TrueCap (underwriting)",
    bestFor: "Best STR underwriting (LTR/STR side-by-side in Pro)",
    url: "/vs/dealcheck-for-short-term-rentals",
    pricing: "Free core; paid Pro — see live pricing",
    freeCovers: [
      "Enter AirDNA's nightly rate and occupancy in TrueCap's Short-term Rental (beta) mode, then run the full cap rate / DSCR / cash flow",
      "Run the same property as a long-term and a short-term scenario (side-by-side comparison is Pro)",
    ],
    freeGates: [
      "Sensitivity grid stress-tests STR revenue ±10% (first decision free, then Pro)",
      "Seasonal months require separate saved scenarios",
      "No tax-specific module; use a qualified professional for STR eligibility and taxpayer-specific treatment",
    ],
    pickIf:
      "You have AirDNA's revenue projection and need to turn it into a buy/no-buy decision.",
  },
  {
    rank: 3,
    name: "Mashvisor (market discovery)",
    bestFor: "Best STR market scouting (heatmaps + neighborhood analytics)",
    url: "/vs/mashvisor-for-short-term-rentals",
    pricing: (
      <>
        <a href="https://www.mashvisor.com/pricing" className={SOURCE_LINK}>
          $39.99–$99.99/mo billed annually ($49.99–$119.99/mo billed
          quarterly)
        </a>
        ; Enterprise custom (as of October 2026)
      </>
    ),
    coversLabel: "Paid plans cover",
    freeCovers: [
      "Neighborhood analytics for traditional and Airbnb income and cash-on-cash (paid Standard plan)",
      "Heatmaps of rental income, cash-on-cash return and Airbnb occupancy (paid Standard plan)",
    ],
    freeGates: [
      "No free tier on Mashvisor's pricing page; plans are billed quarterly or annually",
    ],
    pickIf:
      "You're scouting which city or neighborhood to invest in next (not underwriting a specific address).",
  },
  {
    rank: 4,
    name: "DealCheck (alternative underwriting)",
    bestFor: "Mobile + listing import for STR-curious buyers",
    url: "/vs/dealcheck-for-short-term-rentals",
    pricing: (
      <>
        Free Starter;{" "}
        <a href="https://dealcheck.io/pricing/" className={SOURCE_LINK}>
          Plus $10/mo and Pro $20/mo billed annually ($14 / $29 billed
          monthly)
        </a>
        , as of September 2026
      </>
    ),
    freeCovers: [
      "Standard rental underwriting, override rent with STR projection",
      <a key="import" href="https://dealcheck.io/features/" className={SOURCE_LINK}>
        Property data import from public records and online listings
      </a>,
      "Native iOS + Android apps",
    ],
    freeGates: [
      "No dedicated LTR-vs-STR toggle; you compare two versions of the property side by side",
      "No STR-specific tax loophole modeling",
    ],
    pickIf:
      "You're mobile-first at showings and willing to manually toggle between LTR and STR scenarios.",
  },
  {
    rank: 5,
    name: "Hostaway / Hostfully (PMS — post-purchase)",
    bestFor: "Best STR management AFTER closing",
    url: "/vs/hostaway",
    pricing: (
      <>
        Hostaway: quote-based (no published price); Hostfully:{" "}
        <a
          href="https://www.hostfully.com/pricing/property-management-software/"
          className={SOURCE_LINK}
        >
          from $15 per property per month plus a platform fee
        </a>{" "}
        (as of September 2026)
      </>
    ),
    coversLabel: "What they cover",
    freeCovers: [
      <a key="channels" href="https://www.hostaway.com/" className={SOURCE_LINK}>
        Channel manager across Airbnb / Vrbo / Booking
      </a>,
      "Guest messaging automation",
      "Dynamic pricing integrations",
    ],
    freeGates: ["NOT underwriting tools — these manage STRs you already own"],
    pickIf:
      "You've already closed and need to operate the property. Use TrueCap to underwrite, then pick a PMS.",
  },
  {
    rank: 6,
    name: "Excel / Google Sheets",
    bestFor: "Custom seasonal STR cash-flow modeling",
    url: "/vs/excel",
    pricing: "Free",
    freeCovers: [
      "Total flexibility — model seasonal ADR curves, weekend premiums, off-season vacancy",
    ],
    freeGates: [
      "You build the seasonality model yourself",
      "Mobile is broken at showings",
    ],
    pickIf:
      "You have a battle-tested STR template with custom seasonal modeling.",
  },
];

const FAQ_ITEMS = [
  {
    q: "What's the best all-in-one STR investment tool?",
    a: "There isn't one. STR investing requires three different jobs: revenue projection (AirDNA), underwriting (TrueCap or DealCheck), and post-purchase ops (Hostaway / Hostfully / Lodgify). Tools that claim to do all three either do one well and the others poorly, or are enterprise-priced. Plan on pairing a revenue-data tool with an underwriting tool before you buy, then adding a PMS after closing.",
  },
  {
    q: "AirDNA vs Mashvisor for STR — which one?",
    a: "AirDNA is more STR-specific: it publishes ADR, occupancy and RevPAR by market. Mashvisor covers both STR and LTR plus broader market analysis. If you only buy short-term rentals, AirDNA's narrower focus fits. If you compare LTR and STR on the same property, Mashvisor's broader scope fits.",
  },
  {
    q: "Can TrueCap model short-term rental revenue?",
    a: "Yes, in beta. TrueCap's Short-term Rental mode models revenue as nightly rate × occupancy; it does not fully model platform fees, turnover, lodging tax, seasonality or local STR eligibility. TrueCap doesn't pull AirDNA data automatically; you copy the numbers across.",
  },
  {
    q: "What management rate should I use for STR underwriting?",
    a: "Management fees vary by market and service level, so get written quotes from local long-term and full-service STR managers. If you self-manage, still budget for software, cleaning coordination and your own time. TrueCap's management field is editable.",
  },
  {
    q: "Does TrueCap support the STR tax loophole?",
    a: "No. TrueCap does not currently expose a tax-specific analysis module, determine STR eligibility, or model cost-segregation components and bonus depreciation. Use a qualified tax professional for material-participation, REPS, cost-segregation, and taxpayer-specific modeling.",
  },
];

const DECISION_LINES: Array<{ q: string; a: string }> = [
  {
    q: "You need address-level STR revenue projections.",
    a: "AirDNA Rentalizer",
  },
  {
    q: "You have the revenue and need full underwriting.",
    a: "TrueCap (free for basic, Pro for sensitivity)",
  },
  { q: "You're scouting which city to invest in.", a: "Mashvisor" },
  {
    q: "You've already closed and need to operate the STR.",
    a: "Hostaway or Hostfully (PMS)",
  },
  {
    q: "You want a single all-in-one tool.",
    a: "No single tool covers the full workflow — pair a revenue-data tool with an underwriting tool, then add a PMS after closing",
  },
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
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />
      <JsonLd data={itemListSchema} />
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
              Ranking · {READING_TIME_MIN} min read
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground leading-[1.05] tracking-tight text-balance">
              {TITLE}
            </h1>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-muted-foreground">
              {DESCRIPTION}
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Published {PUBLISHED_AT} · Updated {MODIFIED_AT}
            </p>
            <BlogByline />
          </header>

          <section className="mb-10 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-3">
              Quick answer
            </h2>
            <p
              className="text-sm sm:text-base leading-relaxed text-foreground"
            >
              STR investors need two tools: one for revenue projection (<strong>AirDNA</strong> or <strong>Mashvisor</strong>) and one for underwriting (<strong>TrueCap</strong>, <strong>DealCheck</strong>, or a spreadsheet). PMS platforms (<strong>Hostfully</strong>, <strong>Hostaway</strong>, <strong>Guesty</strong>) come after the deal closes — they don&apos;t underwrite. The combined stack is the workflow.
            </p>
          </section>

          <div className="prose prose-neutral max-w-none [&>p]:max-w-[68ch] [&>ul]:max-w-[68ch] [&>ol]:max-w-[68ch] [&>blockquote]:max-w-[68ch] [&>h2]:max-w-[68ch] [&>h3]:max-w-[68ch] prose-headings:font-extrabold prose-headings:text-foreground prose-p:text-foreground prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-li:text-foreground prose-li:leading-relaxed">
            <h2>The tools, ranked for short-term rental investors</h2>

            {TOOLS.map((t) => (
              <div
                key={t.name}
                className="not-prose mb-8 rounded-2xl border border-border bg-card p-5 sm:p-6"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="text-2xs font-bold uppercase tracking-widest text-primary mb-1.5">
                      #{t.rank} · {t.bestFor}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-foreground leading-tight">
                      {t.name}
                    </h3>
                  </div>
                  <Link
                    href={t.url}
                    className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    Deep dive
                    <ArrowUpRight className="size-3" />
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  <strong className="text-foreground">Pricing:</strong>{" "}
                  {t.pricing}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-3xs font-bold uppercase tracking-widest text-[var(--brand-green)] mb-2">
                      {t.coversLabel ?? "Free tier covers"}
                    </p>
                    <ul className="space-y-1.5 text-sm text-foreground">
                      {t.freeCovers.map((p, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-[var(--brand-green)] shrink-0">
                            +
                          </span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-3xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                      Where the gates kick in
                    </p>
                    <ul className="space-y-1.5 text-sm text-foreground">
                      {t.freeGates.map((p, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-muted-foreground/60 shrink-0">
                            −
                          </span>
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
              The fastest way to know which tool fits your workflow is to run
              one of your real deals through it. TrueCap is free for the core
              underwriting, with no signup required. Pressure-test
              the financing on a short-term rental and check the return on your
              cash — the free{" "}
              <Link
                href="/analyze" prefetch={false}
                className="font-semibold text-primary hover:underline"
              >
                TrueCap analyzer
              </Link>{" "}
              returns DSCR, cash-on-cash and monthly cash flow from one address
              — then walk through the full nightly-rate math in our{" "}
              <Link
                href="/blog/short-term-rental-underwriting-playbook"
                className="font-semibold text-primary hover:underline"
              >
                short-term rental underwriting playbook
              </Link>
              .
            </p>
            <p className="not-prose"></p>
          </div>

          <PostSources
            sources={[
              {
                title: "AirDNA, Pricing (plans and what each includes)",
                url: "https://www.airdna.co/pricing",
              },
              {
                title: "AirDNA Help Center, Navigating the new AirDNA Market Explorer platform",
                url: "https://help.airdna.co/en/articles/11954306-navigating-the-new-airdna-market-explorer-platform",
              },
              {
                title: "AirDNA, Short-term rental data analytics (home page)",
                url: "https://www.airdna.co/",
              },
              {
                title: "Mashvisor, Pricing",
                url: "https://www.mashvisor.com/pricing",
              },
              {
                title: "DealCheck, Plans & Pricing",
                url: "https://dealcheck.io/pricing/",
              },
              {
                title: "DealCheck, Property analysis software features",
                url: "https://dealcheck.io/features/",
              },
              {
                title: "Hostfully, Property management software pricing",
                url: "https://www.hostfully.com/pricing/property-management-software/",
              },
              {
                title: "Hostaway, Vacation rental software (home page)",
                url: "https://www.hostaway.com/",
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
