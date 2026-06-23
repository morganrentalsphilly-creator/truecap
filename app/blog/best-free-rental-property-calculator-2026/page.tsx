/**
 * Listicle blog post: best-free-rental-property-calculator-2026.
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

const SLUG = "best-free-rental-property-calculator-2026";
const TITLE = "Best free rental property calculator 2026: 5 tools that actually work for free";
const DESCRIPTION =
  "Honest 2026 ranking of the 5 best truly-free rental property calculators — TrueCap, BiggerPockets' free reports, Stessa's calculator, Excel templates, and Zillow's mortgage calculator. What each free tier covers and where the gates kick in.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = "2026-06-07";
const READING_TIME_MIN = 9;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "best free rental property calculator",
    "free rental analysis tool",
    "no signup rental calculator",
    "free real estate investment calculator",
    "rental property calculator no cost",
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
    name: "TrueCap",
    bestFor: "Best truly free tier — unlimited analyses, no signup",
    url: "/",
    pricing: "Free; Pro $29.99/mo",
    freeCovers: [
      "Cap rate, CoC, DSCR, NCF, monthly cash flow",
      "Address auto-fill (HUD rent + FRED rate + state property tax)",
      "Plain-English verdict (Strong / Solid / Mixed / Marginal / Negative)",
      "Unlimited analyses, no signup, no cap"
    ],
    freeGates: [
      "10-year projection (Pro)",
      "Tax strategy + sensitivity (Pro)",
      "MAO solver, BRRRR & fix-flip analyzer (Pro)",
      "Save / compare deals (Pro)",
      "PDF export + share links (Pro)"
    ],
    pickIf: "You want a free tier that actually does the underwriting work without gating cap rate or DSCR.",
  },
  {
    rank: 2,
    name: "BiggerPockets Free Calculator",
    bestFor: "Best if you'll eventually pay for BP Pro anyway",
    url: "/vs/biggerpockets-calculator",
    pricing: "Free with limits; full access via BP Pro ~$390/yr",
    freeCovers: [
      "A few free reports per month",
      "Standard cap rate + cash flow + CoC",
      "BRRRR-style underwriting on free tier"
    ],
    freeGates: [
      "Most outputs after the monthly report cap",
      "10-year projection (Pro)",
      "Tax + advanced features (Pro)"
    ],
    pickIf: "You're going to subscribe to BiggerPockets Pro for the community anyway and don't mind the calculator's monthly cap.",
  },
  {
    rank: 3,
    name: "Stessa's Free Calculator",
    bestFor: "Free cap rate widget bundled with free accounting",
    url: "/vs/stessa",
    pricing: "Free; Stessa Pro ~$12/mo",
    freeCovers: [
      "Basic cap rate calculator widget",
      "Free bookkeeping for unlimited properties",
      "Schedule E export"
    ],
    freeGates: [
      "Stessa isn't really an underwriting tool — the calculator widget is rudimentary",
      "No DSCR or detailed cash flow underwriting"
    ],
    pickIf: "You already own rentals and want free accounting. Pair with TrueCap free for actual pre-purchase underwriting.",
  },
  {
    rank: 4,
    name: "Excel / Google Sheets templates",
    bestFor: "Best if you already have a custom model",
    url: "/vs/excel",
    pricing: "Free (or your existing Office / Google subscription)",
    freeCovers: [
      "Total flexibility — model anything",
      "BiggerPockets and various REI bloggers offer free templates"
    ],
    freeGates: [
      "You do all the data lookups (rent, rate, tax) manually",
      "Formula errors compound silently",
      "Mobile UX is broken at showings"
    ],
    pickIf: "You have a battle-tested Excel template and use mobile rarely.",
  },
  {
    rank: 5,
    name: "Zillow's mortgage calculator",
    bestFor: "Best for PITI only (not actually rental underwriting)",
    url: "https://www.zillow.com/mortgage-calculator",
    pricing: "Free",
    freeCovers: [
      "Monthly mortgage payment (PITI)",
      "Affordability calculator"
    ],
    freeGates: [
      "Doesn't calculate cap rate, CoC, DSCR, or cash flow",
      "Not a rental property tool — homebuyer-oriented"
    ],
    pickIf: "You only need the mortgage payment math, not the full rental underwrite.",
  },
];

const FAQ_ITEMS = [
  { q: "Is TrueCap really 100% free for rental analysis?", a: "Yes. TrueCap's free tier covers cap rate, cash-on-cash, DSCR, NCF, monthly cash flow on unlimited analyses with no signup. Address auto-fill (HUD rent + FRED rate + state tax) is also free. Pro features (10-year projections, tax strategy, sensitivity, save deals, PDF export) require $20/month — but the core underwriting math doesn't." },
  { q: "Why is BiggerPockets' calculator capped on the free tier?", a: "BiggerPockets monetizes via BiggerPockets Pro (~$390/year), which bundles forums, courses, podcasts, books, and the unlimited calculator. The free tier is a sample. If you're already paying for community access, the calculator is essentially free; if you only want the calculator, TrueCap is the cheaper unrestricted alternative." },
  { q: "What's the catch with TrueCap's free tier?", a: "Honestly, there isn't one for basic underwriting. The catch is that you'll eventually want Pro features (10-year projection, tax strategy, sensitivity grid, share links, PDF export) at $20/month — which is normal SaaS pricing. The free tier itself is fully functional for cap rate / CoC / DSCR / cash flow on unlimited deals." },
  { q: "Can I underwrite a BRRRR or flip on a free calculator?", a: "TrueCap's free tier handles the standard cap rate / DSCR / cash flow on any property, including BRRRR and flip candidates. The dedicated BRRRR + Fix-and-Flip analyzers (with cash-out refi math, ARV solver, break-even ARV) are Pro features. BiggerPockets' free tier supports basic BRRRR. Most flippers use a spreadsheet or Pro tier eventually." },
  { q: "Are there ad-supported free rental calculators?", a: "A few exist (RentRedi's free calculator on their site, BiggerPockets' free reports). They're real but limited. TrueCap doesn't run ads and isn't lead-gen for a CRM — the free tier is the actual product, with Pro features as an upgrade path. That's an unusual model for a free SaaS calculator and it's intentional." },
];

const DECISION_LINES: Array<{ q: string; a: string }> = [
  { q: "You want the deepest free tier with no signup or cap.", a: "TrueCap" },
  { q: "You're already subscribing to BiggerPockets for the community.", a: "BiggerPockets calculator (bundled)" },
  { q: "You already use Excel and have a template that works.", a: "Excel" },
  { q: "You want free accounting for properties you already own.", a: "Stessa (not for underwriting)" },
  { q: "You only need PITI math.", a: "Zillow's mortgage calculator" },
];

export default function BestFreeRentalPropertyCalculator2026Post() {
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
            <p className="text-sm sm:text-base leading-relaxed text-foreground" dangerouslySetInnerHTML={{ __html: `<strong>TrueCap</strong> has the deepest free tier — full cap rate, CoC, DSCR, NCF, monthly cash flow on unlimited analyses with no signup, no analysis cap, plus address auto-fill from HUD + FRED + state tax. <strong>BiggerPockets&apos; free calculator</strong> gives a few reports per month then gates to its \$390/yr Pro tier. <strong>Stessa</strong> has a basic free cap rate calculator but it&apos;s really an accounting tool. <strong>Excel templates</strong> work but require you to do all the lookups yourself. <strong>Zillow&apos;s mortgage calculator</strong> covers PITI math only — not rental underwriting.` }} />
          </section>

          <div className="prose prose-neutral max-w-none prose-headings:font-extrabold prose-headings:text-foreground prose-p:text-foreground prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-li:text-foreground prose-li:leading-relaxed">
            <h2>The tools, ranked for free-only investors</h2>

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
