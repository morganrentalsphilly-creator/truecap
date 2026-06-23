/**
 * Listicle blog post: best-rental-analysis-tool-for-house-hackers.
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

const SLUG = "best-rental-analysis-tool-for-house-hackers";
const TITLE = "Best rental analysis tool for house hackers (2026)";
const DESCRIPTION =
  "Honest 2026 ranking of the best calculators for house hackers — TrueCap, DealCheck, BiggerPockets, and what owner-occupant underwriting requires that standard rental calculators miss.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = "2026-06-07";
const READING_TIME_MIN = 8;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "best house hacking calculator",
    "house hack analysis tool",
    "owner occupant rental calculator",
    "best calculator for house hackers",
    "fha rental property calculator",
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
    bestFor: "Best owner-occupant property type + effective-rent-saved math",
    url: "/vs/biggerpockets-for-house-hacking",
    pricing: "Free; Pro $29.99/mo",
    freeCovers: [
      "Explicit 'owner-occupant' property type with per-unit setup",
      "Mark which unit you live in — TrueCap excludes it from rent income",
      "FHA 3.5%-down financing configuration",
      "Effective-rent-saved metric (PITI minus rental unit income)"
    ],
    freeGates: [
      "10-year projection with post-move-out scenario (Pro)",
      "Tax strategy on house-hack interest deduction (Pro)"
    ],
    pickIf: "You want a calculator built for house-hacking, not a multifamily calculator you adjust manually.",
  },
  {
    rank: 2,
    name: "DealCheck",
    bestFor: "Mobile + listing import (multifamily mode)",
    url: "/vs/dealcheck",
    pricing: "Free Starter, Plus $10/mo, Pro $20/mo (as of June 2026)",
    freeCovers: [
      "Standard multifamily underwriting",
      "Listing import from Zillow / Redfin",
      "Native iOS + Android apps"
    ],
    freeGates: [
      "No explicit owner-occupant unit logic — you manually exclude your unit's 'rent' from income",
      "No effective-rent-saved metric"
    ],
    pickIf: "You underwrite on mobile and are comfortable manually adjusting multifamily math for house-hacking.",
  },
  {
    rank: 3,
    name: "BiggerPockets House-Hack Calculator",
    bestFor: "BiggerPockets community + house-hack content",
    url: "/vs/biggerpockets-calculator",
    pricing: "BP Pro ~$390/yr",
    freeCovers: [
      "Dedicated house-hack calculator within BP Pro",
      "Strong house-hacking content in the BP community + courses"
    ],
    freeGates: [
      "Calculator alone doesn't justify $390/yr unless you use the community",
      "Limited mobile UX"
    ],
    pickIf: "You're already paying for BiggerPockets and want the bundled house-hack calculator.",
  },
  {
    rank: 4,
    name: "Excel / Google Sheets",
    bestFor: "Custom house-hack scenarios",
    url: "/vs/excel",
    pricing: "Free (with your existing Office / Workspace)",
    freeCovers: [
      "Total flexibility — model house-hack-into-rental transitions, unusual FHA scenarios"
    ],
    freeGates: [
      "You do all the math + scenario modeling manually",
      "Mobile is broken at showings"
    ],
    pickIf: "You have a battle-tested house-hack model with custom FHA / VA scenarios.",
  },
];

const FAQ_ITEMS = [
  { q: "What makes a house-hack calculator different from a standard rental calculator?", a: "The owner-occupant unit. In a standard 2-4 unit multifamily underwrite, every unit produces rent. In a house hack, the unit you live in doesn't (you're paying 'rent' to yourself), so the income side needs to exclude that unit. TrueCap's owner-occupant property type handles this automatically. Standard rental calculators (DealCheck, BiggerPockets multifamily mode) require you to manually subtract your unit's rent from the income." },
  { q: "What's 'effective rent saved' and why does it matter for house hacking?", a: "Your monthly housing cost as a house hacker = PITI minus rent from your rental units. That gap is your 'effective rent saved' versus a regular apartment lease. If your PITI is $2,800/month and your rental units bring in $1,900/month, your effective rent is $900/month — much less than the $1,800/month apartment you'd otherwise rent. TrueCap surfaces this metric explicitly; other calculators require you to compute it." },
  { q: "Can I model FHA 3.5%-down financing for a house hack?", a: "Yes — TrueCap's down payment field is configurable from 0% to 100%. Set it to 3.5% for FHA. PITI and DSCR recalculate automatically. Note that FHA's mortgage insurance premium (MIP) isn't a separate line — bake it into the insurance field or accept that PITI will be slightly underestimated." },
  { q: "How do I model the post-move-out scenario?", a: "TrueCap Pro's 10-year projection lets you set a 'year you move out' assumption. Before that year, the property runs as a house hack (your unit is owner-occupied, no rent). After that year, all units produce rent (you've moved out and rented your unit). The cash-flow projection ramps from house-hack mode to pure rental mode at the inflection point. BiggerPockets and DealCheck don't model this transition natively." },
  { q: "Is house hacking still a good strategy in 2026?", a: "Math still works for the right property in the right market. Tight cash-flow margins make it tougher than 2018-2022, but with FHA 3.5% down and a 2-4 unit property where rental units cover most of PITI, the effective-rent-saved math can still beat renting an equivalent apartment by hundreds per month. Underwrite carefully — TrueCap's sensitivity grid (Pro) stress-tests rent + vacancy + rate so you don't bet on optimistic numbers." },
];

const DECISION_LINES: Array<{ q: string; a: string }> = [
  { q: "You want owner-occupant logic baked in.", a: "TrueCap" },
  { q: "You underwrite mobile at every showing.", a: "DealCheck" },
  { q: "You're already paying for BiggerPockets.", a: "BiggerPockets bundled" },
  { q: "You have unusual FHA / VA / partner-equity structures.", a: "Excel" },
];

export default function BestRentalAnalysisToolForHouseHackersPost() {
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
            <p className="text-sm sm:text-base leading-relaxed text-foreground" dangerouslySetInnerHTML={{ __html: `For house hackers specifically: <strong>TrueCap</strong> wins on the explicit owner-occupant property type (auto-excludes your unit from rent income), effective-rent-saved metric, and FHA-friendly down-payment configuration. <strong>DealCheck</strong> and <strong>BiggerPockets</strong> both support house hacking but require manual adjustment of the multifamily math.` }} />
          </section>

          <div className="prose prose-neutral max-w-none prose-headings:font-extrabold prose-headings:text-foreground prose-p:text-foreground prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-li:text-foreground prose-li:leading-relaxed">
            <h2>The tools, ranked for house hackers</h2>

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
