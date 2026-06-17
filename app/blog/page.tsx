/**
 * /blog — landing page for long-form content.
 *
 * Long-form articles are the highest-leverage compounding SEO asset
 * for TrueCap right now: one excellent post ranking for educational
 * queries ('how to analyze a rental property', 'rental property
 * underwriting guide') can pull thousands of organic visits monthly
 * over its lifetime. Each post links into the calculator/tools and
 * funnels into the conversion path.
 *
 * Posts are currently a hardcoded array — when the catalog grows
 * beyond ~10 posts, lift them into a content collection (MDX +
 * frontmatter, or a Supabase table). For now, the trade-off favors
 * fewer moving parts.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Deep dives on rental property analysis, real estate math, and underwriting best practices from the team behind TrueCap.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "TrueCap Blog — rental property analysis & underwriting",
    description:
      "Deep dives on rental property analysis, real estate math, and underwriting best practices.",
    url: "/blog",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap blog" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  readingTimeMinutes: number;
  publishedAt: string; // ISO date
  available: boolean;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "gross-rent-multiplier-explained",
    title:
      "Gross rent multiplier (GRM) explained: how to screen rentals fast (2026)",
    excerpt:
      "GRM = price ÷ annual gross rent — the fastest screen in real estate and the first number to compute on any listing. The formula, a three-listing screen, the cap-rate bridge ((1 − expense ratio) ÷ GRM), how it maps to the 1% rule, and two $250K duplexes with identical GRMs that cash flow +$365 and −$155.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-17",
    available: true,
  },
  {
    slug: "how-to-calculate-noi-rental-property",
    title:
      "How to calculate NOI (net operating income) on a rental property (2026)",
    excerpt:
      "NOI = effective gross income minus operating expenses, before the mortgage — and it's the number cap rate, DSCR, and 5+ unit valuation are all built on. The formula, a full line-by-line $250K duplex example, the CapEx classification trap that swings the cap rate a full point, and the three ways people get NOI wrong.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-16",
    available: true,
  },
  {
    slug: "depreciation-recapture-rental-property",
    title:
      "Depreciation recapture on rental property: how the tax works when you sell (2026)",
    excerpt:
      "Depreciation lowers your basis every year — and recapture taxes the gain that creates when you sell, at up to 25%. A full worked example on a $250K rental sold for $360K, why the real bill is 2.4x the naive estimate, the §1245 cost-seg trap, and five ways to defer or erase it.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-14",
    available: true,
  },
  {
    slug: "schedule-e-rental-property",
    title:
      "Schedule E for rental property: a line-by-line walkthrough (2026)",
    excerpt:
      "Every Schedule E line that matters, a full worked example on a $250K rental, and the exact bridge between +$139/month of cash flow and a $3,703 paper loss — plus the $25K passive loss allowance, its MAGI phase-out, and the four mistakes that cost real money.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-12",
    available: true,
  },
  {
    slug: "capex-maintenance-reserves-rental-property",
    title:
      "CapEx and maintenance reserves: how much to actually budget for a rental (2026)",
    excerpt:
      "Percent-of-rent defaults understate capex on exactly the properties that can least afford it. The component-lifespan method with 2026 prices, an age-weighted reserve formula, and what honest reserves do to NOI, DSCR, and cash flow on a $220K rental.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-11",
    available: true,
  },
  {
    slug: "section-8-rental-property-investing",
    title:
      "Section 8 rentals: how the math actually works in 2026 (pros, cons, underwriting)",
    excerpt:
      "How the voucher program actually pays — payment standards, FMR math, the two ceilings on your rent, NSPIRE inspection costs, and the five underwriting adjustments that decide whether Section 8 makes a deal better or worse.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-10",
    available: true,
  },
  {
    slug: "closing-costs-investment-property",
    title:
      "Closing costs on an investment property — the full breakdown (2026)",
    excerpt:
      "Every line item in investment-property closing costs, with real 2026 dollar figures on a $250k rental. Lender fees, title, transfer taxes, prepaids — what's negotiable, what isn't, and how to fold it into your cash-to-close.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-09",
    available: true,
  },
  {
    slug: "vacancy-rate-rental-property",
    title:
      "Vacancy rate for rentals: what to assume in 2026 (and why 5% is usually a guess)",
    excerpt:
      "Physical vs economic vacancy, the turnover math that derives the number instead of guessing it, what 5 points does to cash flow and DSCR, and why your DSCR lender ignores vacancy entirely.",
    readingTimeMinutes: 10,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "brrrr-method-explained",
    title: "The BRRRR method in 2026: the complete numbers walkthrough",
    excerpt:
      "Buy, rehab, rent, refinance, repeat — with real 2026 numbers. One full deal start to finish: refinance LTV limits, seasoning rules, DSCR qualification, and the two constraints on your cash-out most guides skip.",
    readingTimeMinutes: 11,
    publishedAt: "2026-06-07",
    available: true,
  },
  {
    slug: "single-family-vs-multi-family-rental",
    title: "Single-family vs multi-family rental property — which actually wins?",
    excerpt:
      "The honest comparison: cash flow, cap rate, financing, tenant quality, exit liquidity, capex risk, and which property type fits your specific stage. Side-by-side numbers with 2026 financing.",
    readingTimeMinutes: 11,
    publishedAt: "2026-05-27",
    available: true,
  },
  {
    slug: "how-to-estimate-rehab-costs",
    title: "How to estimate rehab costs on a rental property — the honest framework",
    excerpt:
      "The framework experienced investors use: sq-ft pricing for cosmetic, kitchen, bath, systems work. Plus the 25% contingency rule and on-site walkthrough checklist.",
    readingTimeMinutes: 12,
    publishedAt: "2026-05-27",
    available: true,
  },
  {
    slug: "how-to-refinance-a-rental-property",
    title: "How to refinance a rental property — rate-and-term, cash-out, and DSCR options",
    excerpt:
      "Step-by-step on refinancing a rental property: when refi makes sense, rate-and-term vs cash-out, LTV limits, DSCR loans, the break-even math, and the 5 mistakes most investors make.",
    readingTimeMinutes: 10,
    publishedAt: "2026-05-26",
    available: true,
  },
  {
    slug: "rental-property-pro-forma-explained",
    title: "How to read a rental property pro forma (and the 7 lies inside most of them)",
    excerpt:
      "A pro forma is a seller's projection of how a rental property will perform — and it's almost always optimistic. Here's how to translate seller pro formas into real numbers, and the 7 line items most pro formas understate.",
    readingTimeMinutes: 9,
    publishedAt: "2026-05-26",
    available: true,
  },
  {
    slug: "how-to-find-off-market-rental-properties",
    title: "How to find off-market rental properties — 8 sources that actually work",
    excerpt:
      "The 8 sources serious rental investors use to find off-market deals — driving for dollars, direct mail, wholesalers, networking, public records, and the underrated channels most investors skip.",
    readingTimeMinutes: 10,
    publishedAt: "2026-05-26",
    available: true,
  },
  {
    slug: "rental-property-tax-deductions",
    title: "Rental property tax deductions — the 14 every investor should know",
    excerpt:
      "Every deductible expense on a rental property, organized by Schedule E line. Worked examples, common-mistake callouts, and the depreciation move that often saves more than all other deductions combined.",
    readingTimeMinutes: 11,
    publishedAt: "2026-05-26",
    available: true,
  },
  {
    slug: "best-states-for-rental-investors-2026",
    title: "Best states for rental property investors in 2026",
    excerpt:
      "An honest ranking of the top 10 US states for rental investors — cap rates, property tax, income tax, landlord laws, and the trade-offs that decide which state actually fits your strategy.",
    readingTimeMinutes: 12,
    publishedAt: "2026-05-25",
    available: true,
  },
  {
    slug: "1031-exchange-basics",
    title: "1031 exchange basics for individual rental investors",
    excerpt:
      "How a 1031 exchange actually works in 2026 — the 45-day and 180-day windows, qualified intermediary requirement, like-kind rules, boot, reverse exchanges, and when it's worth the complexity.",
    readingTimeMinutes: 11,
    publishedAt: "2026-05-25",
    available: true,
  },
  {
    slug: "50-percent-rule-rentals",
    title: "The 50% rule for rentals — is it still useful in 2026?",
    excerpt:
      "The classic 50% rule says operating expenses run ~half of gross rent. Honest take on when it works as a triage tool, when it lies, and what to use instead.",
    readingTimeMinutes: 6,
    publishedAt: "2026-05-25",
    available: true,
  },
  {
    slug: "house-hacking-explained",
    title: "House hacking explained: how to (almost) live for free in a 2-4 unit",
    excerpt:
      "The actual math behind house hacking — FHA 3.5% down, owner-occupant rules, year-2 transition planning, and the deal types that make this strategy work in 2026.",
    readingTimeMinutes: 9,
    publishedAt: "2026-05-25",
    available: true,
  },
  {
    slug: "property-management-yes-or-no",
    title: "Should I use a property management company? The actual math.",
    excerpt:
      "8-10% of rent + lease-up fees + maintenance markup — does paying a PM still beat managing yourself? The honest break-even math, plus when to switch each direction.",
    readingTimeMinutes: 8,
    publishedAt: "2026-05-25",
    available: true,
  },
  {
    slug: "spot-bad-rental-in-60-seconds",
    title: "How to spot a bad rental deal in 60 seconds — 7 red flags",
    excerpt:
      "Seven red flags that tell you a rental doesn't pencil — before you waste hours running the full underwrite. The triage every experienced investor does in their head.",
    readingTimeMinutes: 8,
    publishedAt: "2026-05-24",
    available: true,
  },
  {
    slug: "cash-on-cash-vs-irr",
    title: "Cash-on-cash vs IRR: which one tells the truth?",
    excerpt:
      "Cash-on-cash and IRR are both return metrics, but they answer completely different questions. When each one is right, when each one lies, and which to trust.",
    readingTimeMinutes: 7,
    publishedAt: "2026-05-24",
    available: true,
  },
  {
    slug: "cash-flow-vs-appreciation",
    title: "Cash flow vs appreciation: which rental strategy actually wins in 2026?",
    excerpt:
      "A 10-year side-by-side across three market types with 2026 borrowing costs — and the two return components most comparisons silently forget.",
    readingTimeMinutes: 9,
    publishedAt: "2026-05-24",
    available: true,
  },
  {
    slug: "what-is-a-good-cap-rate",
    title: "What's a good cap rate for rental property in 2026?",
    excerpt:
      "Benchmarks by market type, the framework professionals actually use to evaluate cap rate, and why pre-2022 intuition is silently buying investors into negative leverage.",
    readingTimeMinutes: 9,
    publishedAt: "2026-05-24",
    available: true,
  },
  {
    slug: "dscr-loans-explained",
    title: "DSCR loans explained: what they are, when they make sense, what they cost in 2026",
    excerpt:
      "DSCR loans approve based on the property's economics, not your personal income. Who they're for, what rates and ratios look like in 2026, and the trade-offs vs. conventional financing.",
    readingTimeMinutes: 10,
    publishedAt: "2026-05-24",
    available: true,
  },
  {
    slug: "cap-rate-vs-cash-on-cash-vs-dscr",
    title: "Cap rate vs cash-on-cash vs DSCR: which one actually matters?",
    excerpt:
      "Three different metrics, three different jobs. A plain-English guide to when each one matters and the 2026 negative-leverage trap most investors miss.",
    readingTimeMinutes: 8,
    publishedAt: "2026-05-24",
    available: true,
  },
  {
    slug: "how-to-underwrite-a-rental-property-in-60-seconds",
    title: "How to underwrite a rental property in 60 seconds",
    excerpt:
      "The five numbers, four metrics, and two sanity checks every investor uses to triage a deal — without a spreadsheet.",
    readingTimeMinutes: 9,
    publishedAt: "2026-05-24",
    available: true,
  },
];

export default function BlogIndexPage() {
  const siteUrl = getSiteUrl();
  const blogLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${siteUrl}/blog#blog`,
    name: "TrueCap Blog",
    url: `${siteUrl}/blog`,
    publisher: { "@id": `${siteUrl}/#organization` },
    blogPost: BLOG_POSTS.filter((p) => p.available).map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `${siteUrl}/blog/${p.slug}`,
      datePublished: p.publishedAt,
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogLd) }}
      />
      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-8">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
          >
            ← TrueCap
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 leading-tight">
            Blog
          </h1>
          <p className="text-base text-muted-foreground mt-2 leading-relaxed">
            Deep dives on rental property analysis, real estate math, and
            underwriting best practices from the team behind TrueCap.
          </p>
        </header>

        <ul className="space-y-4">
          {BLOG_POSTS.filter((p) => p.available).map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group block bg-card border border-border rounded-2xl p-5 sm:p-6 hover:border-primary transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <BookOpen className="size-5 text-primary" />
                  <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-foreground leading-tight">
                  {post.title}
                </h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {post.excerpt}
                </p>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mt-3">
                  {new Date(post.publishedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  · {post.readingTimeMinutes} min read
                </p>
              </Link>
            </li>
          ))}
        </ul>

        {/* NOTE: /vs hub card removed at user request. The individual
            /vs/<competitor> pages still exist as SEO landing surfaces
            (visitors arrive direct from Google) but the hub is hidden
            from internal navigation. */}

        <section className="mt-10 rounded-2xl bg-primary text-primary-foreground p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold mb-2">
            Want the calculator that powers these guides?
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-4">
            TrueCap turns every concept in these posts into a fully-functional
            analyzer — cap rate, cash flow, DSCR, projections, tax modeling.
            Free to start.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-primary-foreground text-primary px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            Open TrueCap
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </section>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
