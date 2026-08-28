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
// SERP-facing title (metadata/og only): kept ≤50 chars so the root
// layout's "%s | TrueCap" template stays inside the ~60-char SERP
// window. The on-page <h1> keeps the longer editorial TITLE.
const SERP_TITLE = "Best free rental property calculator 2026: 5 tools";
const DESCRIPTION =
  "A criteria-based 2026 ranking of five free rental-analysis options: TrueCap, DealCheck Starter, Stessa's calculator, spreadsheet templates, and Zillow's mortgage calculator.";
const PUBLISHED_AT = "2026-06-07";
const MODIFIED_AT = "2026-08-27";
const READING_TIME_MIN = 9;

export const metadata: Metadata = {
  title: SERP_TITLE,
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
    title: SERP_TITLE,
    description: DESCRIPTION,
    url: `/blog/${SLUG}`,
    type: "article",
    publishedTime: PUBLISHED_AT,
    modifiedTime: MODIFIED_AT,
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: { card: "summary_large_image", title: SERP_TITLE, description: DESCRIPTION, images: ["/home.jpg"] },
};

const TOOLS = [
  {
    rank: 1,
    name: "TrueCap",
    bestFor: "No-signup preliminary rental screening",
    url: "/",
    pricing: "Free core analyzer; paid Pro plans on the live pricing page",
    freeCovers: [
      "Cap rate, CoC, DSCR, NCF, monthly cash flow",
      "Address auto-fill (HUD rent benchmark + FRED owner-occupied rate benchmark + state property-tax estimate)",
      "Selected-rule fit, with a secondary Screening Index",
      "Unlimited preliminary core screens without signup",
      "Save up to 5 deals + dashboard access",
      "One sale and rent comps lookup",
      "Read-only share links (free sign-in to create; recipients do not sign in)"
    ],
    freeGates: [
      "10-year projection (Pro)",
      "10-year cash-flow and equity projection + sensitivity (Pro)",
      "Offer Ceiling and saved-deal comparison (Pro)",
      "Editing, unlimited saves, and comparison of up to 4 deals (Pro)",
      "Additional comps lookups: Pro includes 50 per month",
      "PDF export (Pro)"
    ],
    pickIf: "You want preliminary core rental metrics without paying or creating an account.",
  },
  {
    rank: 2,
    name: "DealCheck Starter",
    bestFor: "Free multi-strategy calculators and professional reports",
    url: "/vs/dealcheck",
    pricing: "Starter is free; paid Plus and Pro plans raise usage limits",
    freeCovers: [
      "Rental, BRRRR, Airbnb, and flip calculators",
      "Professional interactive and PDF reports",
      "Up to 15 saved properties"
    ],
    freeGates: [
      "Published limits on photos, comps, and templates",
      "Paid plans raise or remove usage limits",
      "Account required"
    ],
    pickIf: "You want several strategy calculators and professional reports on a free account.",
  },
  {
    rank: 3,
    name: "Stessa's Free Calculator",
    bestFor: "Public acquisition calculator plus a free accounting entry point",
    url: "/vs/stessa",
    pricing: "Essentials is free; Manage and Pro are paid — verify current terms",
    freeCovers: [
      "Free Essentials accounting and basic financial reports",
      "Public rental returns and income-tax calculator"
    ],
    freeGates: [
      "Schedule E is listed on current Manage and Pro plans, not Essentials",
      "Marketplace access and terms should be verified on Stessa's live pages",
      "Target-derived Offer Ceiling is not described in the official sources reviewed"
    ],
    pickIf: "You want a public acquisition calculator plus a free entry plan for ongoing accounting.",
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
      "Most templates require manual rent, rate, and tax lookups",
      "Formulas and inputs require independent review",
      "Large spreadsheets can be cumbersome on mobile"
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
  { q: "Is TrueCap really free for core rental analysis?", a: "Yes. TrueCap's no-account preliminary screen covers cap rate, cash-on-cash, DSCR, NOI, and monthly cash flow. A free account adds up to 5 saved deals, one comps lookup, and the ability to create read-only share links; recipients can view a link without an account. The first complete decision, evaluation allowance, and paid terms are described on the live pricing page." },
  { q: "Is BiggerPockets' rental property calculator free?", a: "The current official BiggerPockets rental-property-calculator page presents calculator results as a Pro feature. Access, trial, and membership terms can change, so verify both the official calculator page and Pro page before choosing it as a free option." },
  { q: "What's the catch with TrueCap's free tier?", a: "Preliminary core metrics are available without signup. Creating read-only share links, saving up to 5 deals, and using the included comps lookup require a free account; recipients can open a shared link without an account. The first complete decision and 21-day account evaluation are usage-limited; Investor Pro adds the repeatable paid workflow described on the live pricing page." },
  { q: "Can I underwrite a BRRRR or flip on a free calculator?", a: "DealCheck Starter currently includes its BRRRR and flip calculators plus professional reports, subject to published usage limits. TrueCap's released tools can research rehab, ARV, DSCR, and a stabilized rental separately, but its integrated BRRRR and fix-and-flip lifecycle models are not currently released." },
  { q: "How should I compare free calculator plans?", a: "Check which metrics, strategy calculators, reports, saved-property limits, comps, and sharing tools are included before entering a deal. Product access and pricing change, so verify current terms on each provider's official page and confirm every starting assumption with property-specific evidence." },
];

const DECISION_LINES: Array<{ q: string; a: string }> = [
  { q: "You want a preliminary core screen without signup.", a: "TrueCap" },
  { q: "You want free BRRRR and flip calculators with professional reports.", a: "DealCheck Starter" },
  { q: "You already use Excel and have a template that works.", a: "Excel" },
  { q: "You want free accounting for properties you already own.", a: "Stessa Essentials" },
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
            <p className="mt-4 text-xs text-muted-foreground">
              Published {PUBLISHED_AT} · Updated {MODIFIED_AT}
            </p>
          </header>

          <section className="mb-10 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-3">Quick answer</h2>
            <p className="text-sm sm:text-base leading-relaxed text-foreground" dangerouslySetInnerHTML={{ __html: `<strong>TrueCap</strong> offers unlimited core rental analyses without signup. A free account adds one comps lookup and creation of read-only share links; recipients can view without an account. <strong>DealCheck Starter</strong> includes rental, BRRRR, Airbnb, and flip calculators plus professional interactive and PDF reports, with published usage limits. <strong>Stessa</strong> combines an investment-property marketplace and editable acquisition analysis with accounting and operations. <strong>Spreadsheet templates</strong> offer flexibility but require formula and input review. <strong>Zillow&apos;s mortgage calculator</strong> covers payment math rather than a full rental underwrite.` }} />
          </section>

          <p className="mb-10 text-sm text-muted-foreground">
            This ranking uses the published free access available when reviewed
            August 27, 2026. Verify current terms on the official{" "}
            <a href="https://dealcheck.io/pricing/" target="_blank" rel="noreferrer" className="text-primary hover:underline">
              DealCheck pricing
            </a>
            ,{" "}
            <a href="https://www.stessa.com/pricing/" target="_blank" rel="noreferrer" className="text-primary hover:underline">
              Stessa pricing
            </a>
            ,{" "}
            <a href="https://www.stessa.com/investment-property-marketplace/" target="_blank" rel="noreferrer" className="text-primary hover:underline">
              Stessa marketplace
            </a>
            ,{" "}
            <a href="https://www.stessa.com/rental-returns-and-income-tax-calculator/" target="_blank" rel="noreferrer" className="text-primary hover:underline">
              Stessa returns calculator
            </a>
            ,{" "}
            <a href="https://www.biggerpockets.com/rental-property-calculator" target="_blank" rel="noreferrer" className="text-primary hover:underline">
              BiggerPockets calculator
            </a>
            ,{" "}
            <a href="https://www.biggerpockets.com/pro" target="_blank" rel="noreferrer" className="text-primary hover:underline">
              BiggerPockets Pro
            </a>
            , and{" "}
            <a href="https://usetruecap.com/pricing" target="_blank" rel="noreferrer" className="text-primary hover:underline">
              TrueCap pricing
            </a>{" "}
            pages.
          </p>

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
              underwriting, takes 60 seconds, no signup required. Browse the
              full set of{" "}
              <Link href="/tools" className="font-semibold text-primary hover:underline">free rental property calculators</Link>, start
              with the{" "}
              <Link href="/#main" className="font-semibold text-primary hover:underline">cap rate calculator</Link>, or
              see how the numbers play out in a specific market like our{" "}
              <Link href="/markets/atlanta" className="font-semibold text-primary hover:underline">Atlanta rental market breakdown</Link>.
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
