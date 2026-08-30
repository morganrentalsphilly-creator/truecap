/**
 * Listicle blog post: free-biggerpockets-calculator-alternatives.
 *
 * Target queries: "free biggerpockets calculator alternative",
 * "biggerpockets calculator alternative", "biggerpockets rental
 * calculator free", "free rental property calculator like
 * biggerpockets". The /vs/biggerpockets-calculator page targets
 * "TrueCap vs BiggerPockets" phrasing; this post targets the
 * "free alternatives" listicle pattern the SERP actually rewards.
 *
 * The premise is BiggerPockets' real, verified limitation: free
 * members get 5 calculator reports, then the calculators require Pro
 * ($39/mo or $390/yr, verified July 2026). Honesty rules baked in:
 * TrueCap listed first but disclosed as ours; the other five are real,
 * genuinely free options described fairly, and BP gets a "when Pro is
 * worth it" section.
 *
 * Schema: Article + Breadcrumb + ItemList + FAQPage.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BlogByline } from "@/components/marketing/blog-byline";
import { BlogStickyCta } from "@/components/marketing/blog-sticky-cta";
import { RelatedBlogPosts } from "@/components/marketing/related-blog-posts";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

const SLUG = "free-biggerpockets-calculator-alternatives";
const TITLE_PLAIN = "Free BiggerPockets Calculator Alternatives (2026)";
const DESCRIPTION =
  "BiggerPockets' calculators stop after 5 free reports, then Pro is $390/yr. Six genuinely free alternatives for 2026 — and what each free tier really covers.";
const PUBLISHED_AT = "2026-07-14";
const MODIFIED_AT = "2026-08-27";
const READING_TIME_MIN = 10;

export const metadata: Metadata = {
  title: TITLE_PLAIN,
  description: DESCRIPTION,
  keywords: [
    "free biggerpockets calculator alternative",
    "biggerpockets calculator alternative",
    "biggerpockets rental calculator free",
    "free rental property calculator",
    "biggerpockets calculator limit",
    "rental analysis without biggerpockets pro",
  ],
  alternates: { canonical: `/blog/${SLUG}` },
  openGraph: {
    title: TITLE_PLAIN,
    description: DESCRIPTION,
    url: `/blog/${SLUG}`,
    type: "article",
    publishedTime: PUBLISHED_AT,
    modifiedTime: MODIFIED_AT,
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: TITLE_PLAIN }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE_PLAIN,
    description: DESCRIPTION,
    images: ["/home.jpg"],
  },
};

type Tool = {
  rank: number;
  name: string;
  bestFor: string;
  url: string;
  pricing: string;
  freeCovers: string[];
  freeGates: string[];
  pickIf: string;
  disclosure?: string;
};

const TOOLS: Tool[] = [
  {
    rank: 1,
    name: "TrueCap",
    bestFor: "No-account preliminary rental screening",
    url: "/vs/biggerpockets-calculator",
    pricing: "Free core; paid Investor Pro — see live pricing",
    disclosure:
      "Full disclosure: TrueCap is our tool. We put it first because the free tier does the same job as the BP rental calculator — with no report count to run out of. The side-by-side comparison shows where BiggerPockets still wins.",
    freeCovers: [
      "Cap rate, cash-on-cash, DSCR, NCF, monthly cash flow — unlimited, no signup",
      "Editable HUD rent + FRED mortgage-rate benchmarks; manual local property tax",
      "Selected-rule fit, with a secondary Screening Index",
      "Every operating expense line the BP form collects",
      "Save up to 5 deals + dashboard access",
    ],
    freeGates: [
      "Editing + unlimited saves + comparing deals (Pro)",
      "10-year cash-flow and equity projections + sensitivity (Pro)",
      "PDF export + co-branded share links (Pro)",
    ],
    pickIf:
      "You want the BP rental-calculator workflow without the 5-report ceiling — and prefer the data filled in for you.",
  },
  {
    rank: 2,
    name: "DealCheck (free Starter plan)",
    bestFor: "Best free plan with saving built in",
    url: "/vs/dealcheck",
    pricing: "Free Starter; Plus $10/mo, Pro $20/mo (billed annually)",
    freeCovers: [
      "Full deal analysis on the free plan — signup required",
      "Save up to 15 properties at a time",
      "Native iOS + Android apps on every tier",
    ],
    freeGates: [
      "15-saved-property cap (paid tiers raise it)",
      "Photos, comps, and templates are limited until Plus/Pro",
    ],
    pickIf:
      "You want to save and revisit a rotating shortlist of deals for free and like working from a native mobile app.",
  },
  {
    rank: 3,
    name: "Calculator.net rental property calculator",
    bestFor: "Best no-frills, no-signup one-pager",
    url: "https://www.calculator.net/rental-property-calculator.html",
    pricing: "Free (ad-supported)",
    freeCovers: [
      "IRR, cap rate, and cash flow from one long form",
      "No account, no report limit",
    ],
    freeGates: [
      "No DSCR, no verdict, no benchmarks — you interpret the raw output",
      "Nothing is saved and nothing is pre-filled; every number is manual",
      "Generic layout with ads, not built for repeat underwriting",
    ],
    pickIf:
      "You want a quick second opinion on one deal and don't care about saving anything.",
  },
  {
    rank: 4,
    name: "Stessa (Essentials plan)",
    bestFor: "Public acquisition calculator plus free accounting entry point",
    url: "/vs/stessa",
    pricing: "Essentials free; paid Manage and Pro — verify live pricing",
    freeCovers: [
      "Public rental returns and income-tax calculator",
      "Accounting and basic financial reports under current Essentials terms",
    ],
    freeGates: [
      "Marketplace access and terms should be verified on Stessa's live pages",
      "Schedule E is listed on current Manage and Pro plans",
      "No target-derived Offer Ceiling described in official sources reviewed",
    ],
    pickIf:
      "You want a public acquisition calculator plus a free entry plan for ongoing accounting.",
  },
  {
    rank: 5,
    name: "RentCast (free plan)",
    bestFor: "Best free rent number to feed any calculator",
    url: "/vs/rentcast",
    pricing: "Free plan; Pro from $12/mo",
    freeCovers: [
      "Nationwide rent estimates with nearby comps, free",
      "Track a handful of properties with market alerts",
    ],
    freeGates: [
      "Rent data only — no cash flow, financing, or return math",
      "Free plan caps comps and tracked properties",
    ],
    pickIf:
      "Your sticking point is the rent estimate BP makes you type in — get it free here, then underwrite elsewhere.",
  },
  {
    rank: 6,
    name: "Excel / Google Sheets templates",
    bestFor: "Best if you want to own the model",
    url: "/vs/excel",
    pricing: "Free (or your existing Office / Google subscription)",
    freeCovers: [
      "Total flexibility — BiggerPockets itself publishes free spreadsheet templates",
      "No report limits, ever; your assumptions visible in every cell",
    ],
    freeGates: [
      "All rent, rate, and tax lookups are manual",
      "Formula errors compound silently",
      "Rough experience on a phone at a showing",
    ],
    pickIf:
      "You analyze at a desk, want full control, and will actually maintain the spreadsheet.",
  },
];

const FAQ_ITEMS = [
  {
    q: "How many free reports does the BiggerPockets calculator give you?",
    a: "Free BiggerPockets members get 5 calculator reports. After that, the calculators require BiggerPockets Pro, which is $39/month or $390/year (as of July 2026). Pro also bundles the forums perks, webinars, and partner software — the calculator is one piece of a membership, not a standalone product.",
  },
  {
    q: "Is there a truly free alternative to the BiggerPockets rental calculator?",
    a: "Yes, several. TrueCap's free tier runs unlimited preliminary rental screens (cap rate, cash-on-cash, DSCR, and cash flow) with no signup — disclosure: TrueCap is our tool. DealCheck's free Starter plan analyzes and saves up to 15 properties. Calculator.net's rental calculator is free and unlimited with no account. Each trades away something different — signup, saved-deal caps, or data auto-fill.",
  },
  {
    q: "Is BiggerPockets Pro worth $390 a year just for the calculators?",
    a: "For the calculators alone, usually not — free tools now cover the same underwriting math. Pro is worth it when you'd use the rest of the bundle: the community for partner and lender introductions, bootcamps and courses, and the included partner software. If you're a Pro member who only opens the calculator, that's the sign to price out alternatives.",
  },
  {
    q: "Can I keep using BiggerPockets for free without the calculators?",
    a: "Yes. The forums, most blog content, and a limited set of features stay available on the free membership. Plenty of investors read the forums for free and run their numbers in a separate free calculator — the two aren't a package deal.",
  },
];

const TABLE_ROWS = TOOLS.map((t) => ({
  name: t.name,
  pricing: t.pricing,
  bestFor: t.bestFor,
}));

export default function FreeBiggerPocketsCalculatorAlternativesPost() {
  const siteUrl = getSiteUrl();
  const url = `${siteUrl}/blog/${SLUG}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: TITLE_PLAIN,
    description: DESCRIPTION,
    image: [`${siteUrl}/home.jpg`],
    datePublished: PUBLISHED_AT,
    dateModified: MODIFIED_AT,
    author: {
      "@type": "Person",
      "@id": `${siteUrl}/about#morgan`,
      name: "Morgan Page",
      url: `${siteUrl}/about`,
    },
    publisher: { "@id": `${siteUrl}/#organization` },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${siteUrl}/blog`,
      },
      { "@type": "ListItem", position: 3, name: TITLE_PLAIN, item: url },
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

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
              {TITLE_PLAIN}
            </h1>
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-muted-foreground">
              The BiggerPockets calculators are good — the catch is the meter.
              Free members get 5 calculator reports, and after that the
              calculators sit behind BiggerPockets Pro at $39/month or $390/year
              (as of July 2026). If you&apos;re analyzing deals every week, five
              reports lasts an afternoon. Here are six genuinely free
              alternatives — including one we make, clearly labeled — plus an
              honest note on when Pro is actually the right buy.
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
            <p className="text-sm sm:text-base leading-relaxed text-foreground">
              <strong>TrueCap</strong> (that&apos;s us) is the closest free
              replacement — unlimited preliminary rental screens, no signup,
              with labeled rent, rate, and tax starting points.{" "}
              <strong>DealCheck&apos;s free Starter plan</strong> adds saving
              (up to 15 properties) and native apps.{" "}
              <strong>Calculator.net</strong> is the no-signup one-pager,{" "}
              <strong>Stessa</strong> publishes a marketplace acquisition
              workflow and a free accounting entry plan,{" "}
              <strong>RentCast</strong> gives you a free rent number, and a{" "}
              <strong>spreadsheet</strong> — including BiggerPockets&apos; own
              free templates — remains the fully-manual fallback.
            </p>
          </section>

          <div className="prose prose-neutral max-w-none prose-headings:font-extrabold prose-headings:text-foreground prose-p:text-foreground prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-li:text-foreground prose-li:leading-relaxed">
            <h2>The free alternatives at a glance</h2>

            <div className="not-prose mb-8 overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Tool
                    </th>
                    <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Pricing (July 2026)
                    </th>
                    <th className="py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Best for
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {TABLE_ROWS.map((row) => (
                    <tr
                      key={row.name}
                      className="border-t border-border align-top"
                    >
                      <td className="py-3 px-3 text-sm font-semibold text-foreground">
                        {row.name}
                      </td>
                      <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                        {row.pricing}
                      </td>
                      <td className="py-3 px-3 text-xs leading-relaxed text-foreground/85">
                        {row.bestFor}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2>The 6 alternatives, ranked</h2>

            {TOOLS.map((t) => (
              <div
                key={t.name}
                className="not-prose mb-8 rounded-2xl border border-border bg-card p-5 sm:p-6"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1.5">
                      #{t.rank} · {t.bestFor}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-foreground leading-tight">
                      {t.name}
                    </h3>
                  </div>
                  {t.url.startsWith("/") ? (
                    <Link
                      href={t.url}
                      className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                    >
                      Side-by-side
                      <ArrowUpRight className="size-3" />
                    </Link>
                  ) : (
                    <a
                      href={t.url}
                      target="_blank"
                      rel="noopener"
                      className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                    >
                      Visit
                      <ArrowUpRight className="size-3" />
                    </a>
                  )}
                </div>
                {t.disclosure ? (
                  <p className="mb-4 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                    {t.disclosure}
                  </p>
                ) : null}
                <p className="text-sm text-muted-foreground mb-4">
                  <strong className="text-foreground">Pricing:</strong>{" "}
                  {t.pricing}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--brand-green)] mb-2">
                      Free tier covers
                    </p>
                    <ul className="space-y-1.5 text-sm text-foreground">
                      {t.freeCovers.map((p) => (
                        <li key={p} className="flex gap-2">
                          <span className="text-[var(--brand-green)] shrink-0">
                            +
                          </span>
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

            <h2>When BiggerPockets Pro is actually worth it</h2>
            <p>
              The fair version: BiggerPockets Pro isn&apos;t a calculator
              subscription, it&apos;s a membership that happens to include
              calculators. If you use the forums for partner, lender, or
              contractor introductions, you&apos;re working through a bootcamp,
              or you want the bundled partner software, $390/year can pay for
              itself before you ever open the rental calculator. Buy it for the
              ecosystem. If the calculator is the only part you&apos;d use, the
              free tools above cover the same math — our{" "}
              <Link
                href="/vs/biggerpockets-calculator"
                className="font-semibold text-primary hover:underline"
              >
                TrueCap vs BiggerPockets comparison
              </Link>{" "}
              lists the cases where staying put is the right answer.
            </p>

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

            <h2>Run your next deal free</h2>
            <p>
              The fastest test is your own deal: run the same property through a
              free tool and compare it against your last BP report.
              TrueCap&apos;s core underwriting is free with no signup and no
              report count — or start with a single metric via the{" "}
              <Link
                href="/tools/1-percent-rule-calculator"
                className="font-semibold text-primary hover:underline"
              >
                1% rule calculator
              </Link>
              ,{" "}
              <Link
                href="/tools/rehab-cost-estimator"
                className="font-semibold text-primary hover:underline"
              >
                rehab cost estimator
              </Link>
              , or{" "}
              <Link
                href="/tools/70-percent-rule-calculator"
                className="font-semibold text-primary hover:underline"
              >
                70% rule calculator
              </Link>
              . If you&apos;re comparing paid tools too, the wider roundup is in
              our{" "}
              <Link
                href="/blog/best-rental-property-calculator-2026"
                className="font-semibold text-primary hover:underline"
              >
                best rental property calculators of 2026
              </Link>
              .
            </p>
            <p className="not-prose"></p>
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
