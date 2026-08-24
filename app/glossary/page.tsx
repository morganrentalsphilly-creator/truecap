/**
 * /glossary — comprehensive plain-English real-estate glossary.
 *
 * SEO play: definitional queries ("what is cap rate", "what is NOI",
 * "what does DSCR mean") have massive search volume and clear intent.
 * One page with 20+ well-cross-linked terms ranks well for the
 * collective long tail without diluting any single /tools/* page.
 *
 * Internal-link hub: every term that has a calculator deep-links to
 * /tools/<slug>, and every blog post that covers the topic deep-links
 * here. This strengthens the topical cluster around rental analysis.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import {
  GLOSSARY,
  GLOSSARY_CATEGORY_LABELS,
  type GlossaryCategory,
  type GlossaryEntry,
} from "@/lib/glossary";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Real Estate Glossary",
  description:
    "Plain-English definitions for rental-property analysis — cap rate, CoC, DSCR, NOI, GRM, BRRRR, depreciation, and 20+ more. Linked to the calculators.",
  keywords: [
    "real estate glossary",
    "rental property terms",
    "cap rate definition",
    "what is dscr",
    "what is noi",
    "real estate investing terms",
  ],
  alternates: { canonical: "/glossary" },
  openGraph: {
    title: "Real Estate Glossary",
    description:
      "Plain-English definitions of every rental-property analysis term. Cross-linked to the calculators.",
    url: "/glossary",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap real estate glossary" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

type Term = {
  /** URL-safe anchor — used for permalinks like /glossary#cap-rate */
  slug: string;
  /** Display term (in canonical form). */
  term: string;
  /** Common synonyms / aliases that the definition still covers. */
  also?: string[];
  /** ~2-4 sentence plain-English definition. */
  definition: string;
  /** Optional benchmark / typical-value gloss. */
  benchmark?: string;
  /** Where to send the reader to compute it themselves. */
  toolPath?: string;
  /** Where to send the reader for a deeper read. */
  postPath?: string;
};

/**
 * Hand-written hub copy for the terms that have it.
 *
 * This used to BE the glossary — a hardcoded array that decided which
 * terms the hub linked to. It drifted: lib/glossary.ts grew to 36
 * entries (34 of which render their own /glossary/<slug> page and sit
 * in the sitemap) while this list stayed at 23, so six term pages had
 * no inbound link from anywhere on the site and Google could not reach
 * them at all. A hub that is also a source of truth will always drift
 * from the real source of truth eventually.
 *
 * So it is now an OVERRIDE map, not the list. lib/glossary.ts decides
 * which terms exist; this decides how the richest 23 read on the hub,
 * where there is room for 2-4 sentences and a benchmark gloss. A term
 * without an entry here falls back to its lib definition, which is
 * correct and one sentence — never missing.
 */
const CURATED: Term[] = [
  {
    slug: "cap-rate",
    term: "Cap rate",
    also: ["Capitalization rate"],
    definition:
      "Annual NOI divided by purchase price. Cap rate measures the property's earning power as if you owned it free-and-clear, with no mortgage. Stripping out financing makes it the right metric for comparing properties to each other and to alternatives like bonds.",
    benchmark:
      "6-10% is healthy in cash-flow markets (Midwest, Sun Belt secondary). 4-6% in balanced markets. 3-5% in coastal Tier-1 where appreciation does the heavy lifting.",
    toolPath: "/tools/cap-rate-calculator",
    postPath: "/blog/what-is-a-good-cap-rate",
  },
  {
    slug: "cash-on-cash",
    term: "Cash-on-cash return",
    also: ["CoC", "Cash on cash"],
    definition:
      "Annual cash flow divided by total cash invested (down payment + closing costs + initial repairs). Cash-on-cash measures the return on the cash YOU specifically put in, after the lender takes their cut. Unlike cap rate, it does include financing.",
    benchmark:
      "8-10%+ is strong in 2026. 5-7% is acceptable. Below 5% needs an appreciation or tax-savings story.",
    toolPath: "/tools/cash-on-cash-calculator",
    postPath: "/blog/cap-rate-vs-cash-on-cash-vs-dscr",
  },
  {
    slug: "dscr",
    term: "DSCR",
    also: ["Debt Service Coverage Ratio"],
    definition:
      "Annual NOI divided by annual debt service (mortgage P&I). DSCR tells you whether the property can cover its own mortgage from operating income. Every lender pulls it. The higher it is, the more bankable the deal.",
    benchmark:
      "1.0-1.25 is the typical lender minimum. 1.25+ is bankable. 1.5+ unlocks better rate tiers on DSCR loan products.",
    toolPath: "/tools/dscr-calculator",
    postPath: "/blog/dscr-loans-explained",
  },
  {
    slug: "noi",
    term: "NOI",
    also: ["Net Operating Income"],
    definition:
      "Effective gross rental income minus operating expenses, before mortgage P&I and income tax. NOI is the property's operating performance as if you owned it free-and-clear — it isolates the asset from how you financed it. Cap rate and DSCR both start from NOI.",
    toolPath: "/tools/noi-calculator",
  },
  {
    slug: "grm",
    term: "GRM",
    also: ["Gross Rent Multiplier"],
    definition:
      "Property price divided by annual gross rent. The simplest screening ratio in real estate — no opex needed, so you can compute it for every listing in a search result without pulling expense data. Lower is better.",
    benchmark:
      "6-10 is healthy in cash-flow markets. 10-14 is balanced. 14-20 is appreciation territory. 20+ is luxury / ultra-coastal.",
    toolPath: "/tools/gross-rent-multiplier-calculator",
  },
  {
    slug: "one-percent-rule",
    term: "1% rule",
    also: ["The one percent rule"],
    definition:
      "A property passes the 1% rule when its monthly rent is at least 1% of the purchase price. A $200,000 property renting for $2,000/mo passes. The rule is a 5-second screening filter, not a buy decision — failing it doesn't mean the deal is bad, and passing it doesn't mean it's good.",
    benchmark:
      "Calibrated for 4-5% interest rate eras. With 2026 mortgage rates at 6.5-7.5%, you arguably need closer to a '1.25% rule'.",
    toolPath: "/tools/1-percent-rule-calculator",
  },
  {
    slug: "brrrr",
    term: "BRRRR",
    also: ["Buy Rehab Rent Refinance Repeat"],
    definition:
      "An investment strategy: Buy a distressed property cheap, Rehab it, Rent it out, Refinance based on the new higher appraised value (pulling most of your cash back out), then Repeat with a different property. Done well, you end up owning a cash-flowing rental with most of your original capital still available for the next deal.",
    toolPath: "/tools/brrrr-calculator",
  },
  {
    slug: "loan-to-value",
    term: "LTV",
    also: ["Loan to Value"],
    definition:
      "Mortgage loan amount divided by property value. 75% LTV on a $400k property = $300k loan. Conventional investment-property loans typically max at 80-85% LTV; DSCR loans max at 75-80%. Cash-out refis cap LTV lower (70-75%) to leave the lender margin.",
  },
  {
    slug: "debt-to-income",
    term: "DTI",
    also: ["Debt to Income"],
    definition:
      "Personal monthly debt obligations divided by personal gross monthly income. Conventional residential lenders cap DTI around 43-50% to approve a loan. DSCR loans bypass DTI entirely — they qualify based on the property's DSCR instead.",
  },
  {
    slug: "vacancy-rate",
    term: "Vacancy rate",
    definition:
      "Percentage of the year a unit sits empty. Standard underwriting assumes 5-8% vacancy as a floor — even a stable rental has turnover, repairs between tenants, and the occasional bad tenant. Don't underwrite at 0%; you'll be wrong every time.",
  },
  {
    slug: "operating-expense-ratio",
    term: "Operating expense ratio",
    also: ["OER"],
    definition:
      "Operating expenses divided by effective gross income. The inverse of NOI margin. A 40% OER means 40 cents of every rent dollar goes to property tax, insurance, maintenance, management, and other running costs; 60 cents is NOI.",
    benchmark:
      "35-50% is typical for residential rentals. Newer, professionally managed: lower OER. Older, self-managed, deferred maintenance: higher OER.",
  },
  {
    slug: "capex",
    term: "CapEx reserves",
    also: ["Capital expenditures"],
    definition:
      "Money set aside for major repairs and replacements — roof, HVAC, water heater, flooring, exterior paint. These hit every 5-25 years depending on the system. Smart underwriting reserves 5-10% of rent monthly for CapEx so a $15k roof replacement in year 7 doesn't wipe out 5 years of cash flow.",
  },
  {
    slug: "depreciation",
    term: "Depreciation",
    definition:
      "The IRS lets you deduct a portion of the building's value (not the land) each year as a paper expense, even though the property isn't actually losing value. Residential rentals depreciate over 27.5 years straight-line. This deduction frequently turns a positive-cash-flow rental into a paper tax loss, sheltering the cash flow from income tax.",
  },
  {
    slug: "appreciation",
    term: "Appreciation",
    definition:
      "Growth in property value over time. Historical U.S. average is ~3% annually but varies wildly by market (Bay Area has averaged 6%+ over 30 years; rural Ohio under 2%). Appreciation is unrealized until you sell or refinance — it shows up in net worth, not monthly cash flow.",
  },
  {
    slug: "negative-leverage",
    term: "Negative leverage",
    definition:
      "When your borrowing rate exceeds the property's cap rate, so every borrowed dollar costs more than the property earns. 2026's dominant trap: 6% cap rate financed at 7% mortgage = -1% on each borrowed dollar. Deals can still pencil with appreciation, tax savings, or principal paydown, but you need to know what you're signing up for.",
    postPath: "/blog/cap-rate-vs-cash-on-cash-vs-dscr",
  },
  {
    slug: "rehab",
    term: "Rehab",
    also: ["Renovation"],
    definition:
      "Repairs and updates to a property — cosmetic (paint, flooring, fixtures), systems (HVAC, electrical, plumbing), or structural. BRRRR investors deliberately buy properties that need rehab so the post-renovation appraisal is high enough to refinance most of their cash out.",
    toolPath: "/tools/rehab-cost-estimator",
  },
  {
    slug: "arv",
    term: "ARV",
    also: ["After Repair Value"],
    definition:
      "The property's projected value once rehab is complete. ARV drives the BRRRR refinance: most lenders cap the cash-out at 75% of ARV. So a $400k ARV supports a $300k post-refi loan — if your all-in cost is under that, you've achieved infinite return.",
  },
  {
    slug: "max-allowable-offer",
    term: "Offer Ceiling",
    also: ["Target-dependent purchase-price boundary"],
    definition:
      "The highest modeled purchase price that still meets the selected target profile under the assumptions shown. For BRRRR, the boundary can use ARV, refinance LTV, rehab, closing, and holding costs; for buy-and-hold, it can solve against selected DSCR, cap-rate, cash-flow, or return rules. It is not a recommended offer, appraisal, or substitute for verification.",
  },
  {
    slug: "pro-forma",
    term: "Pro forma",
    definition:
      "Your projection of the property's future operating performance, as opposed to the seller's trailing actuals. Marketing materials may use pro-forma cap rates with optimistic rent growth or expense assumptions. For screening, compare the pro forma with trailing actuals and your own verified assumptions before recording a decision.",
  },
  {
    slug: "1031-exchange",
    term: "1031 exchange",
    definition:
      "A tax-deferred swap of one investment property for another. When you sell an investment property at a gain, you'd normally pay capital gains tax — a 1031 lets you defer that tax indefinitely as long as you reinvest the proceeds into a 'like-kind' investment property within strict deadlines (45 days to identify, 180 days to close).",
  },
  {
    slug: "house-hack",
    term: "House hack",
    definition:
      "Buying a 2-4 unit property, living in one unit, and renting out the others. The big advantage: owner-occupied financing (3-5% down conventional vs 20-25% for investment property), so your barrier to entry is dramatically lower. After 12 months you can move out, and the property becomes a normal rental.",
  },
  {
    slug: "fair-market-rent",
    term: "Fair Market Rent",
    also: ["FMR"],
    definition:
      "HUD's annual estimate of typical rent for a given county and bedroom count, used to set Section 8 voucher payment standards. FMR is a useful 'is the asking rent realistic?' floor — actual market rent in most areas runs slightly above FMR. TrueCap auto-fills FMR from the HUD API when you enter an address.",
  },
  {
    slug: "principal-paydown",
    term: "Principal paydown",
    definition:
      "The portion of each mortgage payment that reduces the loan balance (vs. paying interest). On a typical 30-year mortgage, year 1 is ~80% interest / 20% principal; year 25 is the inverse. Principal paydown is real wealth building — your tenant is paying off your loan — but it doesn't show up in cash flow.",
  },
];

/**
 * Curated slug → the slug lib/glossary.ts actually publishes.
 *
 * These six were written here under friendlier names than the data
 * source uses, and because this array WAS the hub, nothing ever
 * checked them. The result was live for months: 16 of the 23 links on
 * /glossary pointed at pages that do not exist — /glossary/cash-on-cash
 * and /glossary/one-percent-rule both returned 404 to real readers, and
 * to Googlebot. Ten of those sixteen are fixed by lib/glossary.ts
 * having gained the missing entries; these six needed a name mapping.
 *
 * lib/__tests__/glossary-hub.test.ts asserts every curated slug still
 * resolves, so a rename on either side fails the suite instead of
 * quietly dropping a term off the hub again.
 */
const CURATED_SLUG_ALIASES: Record<string, string> = {
  "cash-on-cash": "cash-on-cash-return",
  "one-percent-rule": "1-percent-rule",
  "loan-to-value": "ltv",
  "vacancy-rate": "vacancy",
  depreciation: "depreciation-period",
  appreciation: "appreciation-rate",
};

/**
 * Every glossary term, derived from lib/glossary.ts so the hub can
 * never again link to fewer terms than the site actually publishes.
 *
 * Ordering: curated terms first, in their hand-picked order (cap rate
 * before appreciation rate — the sequence a new investor should read
 * them in, which alphabetical would destroy), then everything else
 * grouped by category so the tail still reads as sections rather than
 * as a dump.
 */
const TERMS: Term[] = (() => {
  const entries = Object.values(GLOSSARY);
  const bySlug = new Map(entries.map((e) => [e.slug, e]));

  const fromEntry = (e: GlossaryEntry): Term => ({
    slug: e.slug,
    term: e.term,
    also: e.also,
    // The lib definition is deliberately one sentence; whyItMatters is
    // the natural second paragraph, so the hub reads at roughly the
    // same depth as a curated entry when one is joined to the other.
    definition: e.whyItMatters ? `${e.definition} ${e.whyItMatters}` : e.definition,
    benchmark: e.benchmark,
    toolPath: e.toolUrl,
    postPath: e.postUrl,
  });

  const curated = CURATED.map((t) => {
    const realSlug = CURATED_SLUG_ALIASES[t.slug] ?? t.slug;
    const e = bySlug.get(realSlug);
    if (!e) return null;
    // Curated copy wins for the prose; the SLUG always comes from the
    // data source, because that is what decides whether the link
    // resolves to a real page.
    return { ...fromEntry(e), ...t, slug: e.slug };
  }).filter((t): t is Term => t !== null);

  const seen = new Set(curated.map((t) => t.slug));
  const categories = Object.keys(GLOSSARY_CATEGORY_LABELS) as GlossaryCategory[];
  const rest = categories.flatMap((cat) =>
    entries
      .filter((e) => e.category === cat && !seen.has(e.slug))
      .map(fromEntry),
  );

  return [...curated, ...rest];
})();

export default function GlossaryPage() {
  const siteUrl = getSiteUrl();

  // DefinedTermSet schema — Google's recommended structure for glossary
  // pages. Each term becomes a DefinedTerm with its own @id (the anchor
  // URL), so Google can deep-link to specific definitions from SERP.
  const definedTermSetLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "@id": `${siteUrl}/glossary#set`,
    name: "TrueCap Real Estate Glossary",
    url: `${siteUrl}/glossary`,
    publisher: { "@id": `${siteUrl}/#organization` },
    hasDefinedTerm: TERMS.map((t) => ({
      "@type": "DefinedTerm",
      "@id": `${siteUrl}/glossary#${t.slug}`,
      name: t.term,
      description: t.definition,
      inDefinedTermSet: `${siteUrl}/glossary#set`,
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermSetLd) }}
      />

      <main id="main" className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-8">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
          >
            ← TrueCap
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 leading-tight">
            Real Estate Glossary
          </h1>
          <p className="text-base text-muted-foreground mt-2 leading-relaxed">
            Plain-English definitions of every rental-property analysis
            term. Cross-linked to the calculators and the long-form
            posts so you can dig as deep as you want on any concept.
          </p>
        </header>

        {/* Jump-to nav — alphabetical chips for fast scanning */}
        <nav
          aria-label="Jump to term"
          className="mb-8 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-3 sm:p-4"
        >
          {TERMS.map((t) => (
            <a
              key={t.slug}
              href={`#${t.slug}`}
              className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary sm:text-xs"
            >
              {t.term}
            </a>
          ))}
        </nav>

        {/* Definitions */}
        <div className="space-y-6">
          {TERMS.map((t) => (
            <article
              key={t.slug}
              id={t.slug}
              className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">
                    {t.term}
                  </h2>
                  {t.also && t.also.length > 0 ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Also called: {t.also.join(", ")}
                    </p>
                  ) : null}
                </div>
                <Link
                  href={`/glossary/${t.slug}`}
                  aria-label={`Full definition for ${t.term}`}
                  className="shrink-0 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60 hover:text-primary"
                >
                  PERMALINK →
                </Link>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-foreground sm:text-base">
                {t.definition}
              </p>

              {t.benchmark ? (
                <div className="mt-3 rounded-xl border border-[var(--brand-green)]/25 bg-[var(--brand-green-light)] p-3 text-xs leading-relaxed text-foreground sm:text-sm">
                  <strong className="text-foreground">Benchmark:</strong> {t.benchmark}
                </div>
              ) : null}

              {/* Cross-links — full definition page + calculator + deeper read */}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-semibold">
                <Link
                  href={`/glossary/${t.slug}`}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Full definition, formula, example
                  <ArrowUpRight className="size-3.5" />
                </Link>
                {t.toolPath ? (
                  <Link
                    href={t.toolPath}
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
                  >
                    Calculator
                  </Link>
                ) : null}
                {t.postPath ? (
                  <Link
                    href={t.postPath}
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
                  >
                    <BookOpen className="size-3.5" />
                    Deep dive
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        <section className="mt-10 rounded-2xl bg-primary text-primary-foreground p-6 sm:p-8 text-center">
          <h2 className="text-xl sm:text-2xl font-extrabold mb-2">
            Stop looking these up. Use the analyzer.
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-4">
            TrueCap computes every metric on this page live as you type,
            with inline tooltips that explain each one in context. Free
            to start — no signup needed.
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
