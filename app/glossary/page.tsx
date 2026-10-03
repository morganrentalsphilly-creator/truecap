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
 *
 * Layout (DESIGN.md): the page hero, the jump links as a ruled grid, the
 * definitions as ruled rows in the reading column (a benchmark is a ruled
 * Note, not a tinted box), and the close on the heavy rule with the
 * analyzer button.
 */

import type { Metadata } from "next";
import Link from "next/link";
// Internal links prefetch on hover or keyboard focus, not as they scroll into
// view; the /analyze link stays next/link with prefetch={false}.
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { ActionRow, CloseSection, Note, PageHero, UnderTitleAnalyzeLink } from "@/components/marketing/page-parts";
import { Section } from "@/components/marketing/section";
import { buttonVariants } from "@/components/ui/button";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import {
  GLOSSARY,
  GLOSSARY_CATEGORY_LABELS,
  type GlossaryCategory,
  type GlossaryEntry,
} from "@/lib/glossary";
import { getSiteUrl } from "@/lib/site-url";
import { isLinkablePath, linkableGlossaryTerms } from "@/lib/seo/link-policy";
import { Header } from "@/components/investcalc/header";
import { JsonLd } from "@/components/seo/json-ld";
import { GLOSSARY_TERM_SET_NAME, glossaryTermSetId } from "@/lib/seo/glossary-ld";
import { BreadcrumbSchema } from "@/components/marketing/breadcrumb-schema";
import { OPEN_GRAPH_BASE } from "@/lib/seo/open-graph-base";

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
    ...OPEN_GRAPH_BASE,
    title: "Real Estate Glossary",
    description:
      "Plain-English definitions of every rental-property analysis term. Cross-linked to the calculators.",
    url: "/glossary",
    type: "website",
    images: [
      {
        url: "/home.jpg",
        width: 1200,
        height: 630,
        alt: "TrueCap real estate glossary",
      },
    ],
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
    // Read from lib/glossary.ts, so the hub cannot state a range the term
    // page withdraws (it used to: "6-10% is healthy in cash-flow markets").
    benchmark: GLOSSARY.capRate.benchmark,
    postPath: "/blog/what-is-a-good-cap-rate",
  },
  {
    slug: "cash-on-cash",
    term: "Cash-on-cash return",
    also: ["CoC", "Cash on cash"],
    definition:
      "Annual cash flow divided by total cash invested (down payment + closing costs + initial repairs). Cash-on-cash measures the return on the cash YOU specifically put in, after the lender takes their cut. Unlike cap rate, it does include financing.",
    // Read from lib/glossary.ts, like cap rate above: the hub said "8-10%+ is
    // strong in 2026" while the term page says there is no universal target.
    benchmark: GLOSSARY.coc.benchmark,
    postPath: "/blog/cap-rate-vs-cash-on-cash-vs-dscr",
  },
  {
    slug: "dscr",
    term: "DSCR",
    also: ["Debt Service Coverage Ratio"],
    definition:
      "Annual NOI divided by annual debt service (mortgage P&I). DSCR tells you whether the property can cover its own mortgage from operating income. It's the main ratio a DSCR loan qualifies on.",
    benchmark:
      "At 1.00, NOI exactly covers the debt service. Lender minimums vary by program: for a DSCR loan on a house or a small multifamily, each lender sets its own.",
    postPath: "/blog/how-to-calculate-dscr",
  },
  {
    slug: "noi",
    term: "NOI",
    also: ["Net Operating Income"],
    definition:
      "Effective gross rental income minus operating expenses, before mortgage P&I and income tax. NOI is the property's operating performance as if you owned it free-and-clear — it isolates the asset from how you financed it. Cap rate and DSCR both start from NOI.",
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
      "An investment strategy: buy a property, renovate it, rent it, seek new financing, and repeat. The refinance amount, timing, appraisal, costs, loan payoff, and post-refinance cash flow are uncertain; capital is not necessarily recovered. TrueCap does not currently publish a BRRRR acquisition model.",
  },
  {
    slug: "loan-to-value",
    term: "LTV",
    also: ["Loan to Value"],
    definition:
      "Mortgage loan amount divided by the lender's accepted property value. A $300,000 loan against a $400,000 value is 75% LTV. Maximum LTV and the value basis vary by lender, occupancy, property, borrower, loan purpose, and program; use the lender's written terms for the deal.",
  },
  {
    slug: "debt-to-income",
    term: "DTI",
    also: ["Debt to Income"],
    definition:
      "Personal monthly debt obligations divided by personal gross monthly income. Underwriting limits and included obligations vary by lender and program. Some investor-loan programs emphasize property DSCR rather than a traditional DTI test, but may still evaluate credit, liquidity, reserves, guarantors, and other eligibility requirements.",
  },
  {
    slug: "vacancy-rate",
    term: "Vacancy rate",
    definition:
      "Percentage of potential scheduled rent not collected because a unit is vacant. A screening assumption should reflect the property's leases, turnover, condition, submarket, and evidence; a generic percentage is only a starting point and should be stress-tested.",
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
      "A tax-cost-recovery concept that may allocate eligible building basis over an applicable recovery period; land is not depreciable. Classification, basis, placed-in-service date, personal-use rules, passive-activity limits, and the taxpayer's facts determine timing and usability. TrueCap does not currently publish tax-strategy outputs; consult a qualified tax professional.",
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
      "A screening condition where the property's unlevered yield is below the effective cost of debt. Cap rate and note rate are not a complete comparison because amortization, fees, term, and cash-flow timing also matter. Test the full loan schedule and downside assumptions rather than assuming appreciation will repair the gap.",
    postPath: "/blog/cap-rate-vs-cash-on-cash-vs-dscr",
  },
  {
    slug: "rehab",
    term: "Rehab",
    also: ["Renovation"],
    definition:
      "Repairs and updates to a property, from cosmetic finishes to systems or structural work. Budget, scope, contingency, funding timing, downtime, permits, and the evidence for any stabilized rent or value should be reviewed separately.",
    toolPath: "/tools/rehab-cost-estimator",
  },
  {
    slug: "arv",
    term: "ARV",
    also: ["After Repair Value"],
    definition:
      "An estimate of a property's value after a defined renovation scope is complete. Comparable selection, condition, completion, appraisal methodology, and lender policy can all change the amount available for a sale or refinance.",
  },
  {
    slug: "max-allowable-offer",
    term: "Offer Ceiling",
    also: ["Highest price that meets your targets"],
    definition:
      "The highest purchase price that still meets your buy-and-hold targets under the assumptions shown — DSCR, cap rate, cash flow, cash-on-cash return, IRR, or cash required.",
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
      "A U.S. tax provision that may defer recognition of eligible gain when qualifying real property is exchanged under detailed like-kind, timing, identification, intermediary, and taxpayer rules. It does not erase tax, and TrueCap doesn't model it; get transaction-specific tax and legal advice before relying on it.",
  },
  {
    slug: "house-hack",
    term: "House hack",
    definition:
      "Buying a 2-4 unit property, living in one unit, and renting out the others. Eligible owner-occupants may have lower-down-payment options than investors, but down payment, occupancy certification, unit-count eligibility, reserves, mortgage insurance, and any later change in use depend on the specific loan documents and program. A 12-month scenario does not itself authorize conversion to a rental.",
  },
  {
    slug: "fair-market-rent",
    term: "Fair Market Rent",
    also: ["FMR"],
    definition:
      "HUD's annual estimate of 40th-percentile gross rent for a standard-quality unit in an FMR area and bedroom count. FMR is an area benchmark used in several housing programs, not an address-level market comp, rent floor, payment standard, approved contract rent, or collection promise. TrueCap can start with a HUD benchmark: ZIP-level when available, otherwise the HUD Fair Market Rent area; when an address has no county match, a statewide HUD figure, labeled as such. Replace it with current comparable leases and property-specific program figures where applicable.",
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
    definition: e.whyItMatters
      ? `${e.definition} ${e.whyItMatters}`
      : e.definition,
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
  const categories = Object.keys(
    GLOSSARY_CATEGORY_LABELS,
  ) as GlossaryCategory[];
  const rest = categories.flatMap((cat) =>
    entries
      .filter((e) => e.category === cat && !seen.has(e.slug))
      .map(fromEntry),
  );

  // Registry-driven list: a term on the noindex list drops out (lib/seo/link-policy.ts).
  return linkableGlossaryTerms([...curated, ...rest]);
})();

export default function GlossaryPage() {
  const siteUrl = getSiteUrl();

  // DefinedTermSet schema — Google's recommended structure for glossary
  // pages. Each term becomes a DefinedTerm with its own @id (the anchor
  // URL), so Google can deep-link to specific definitions from SERP. The
  // set's @id (lib/seo/glossary-ld.ts) is the one every term page's
  // DefinedTerm points at too (F4).
  const termSetId = glossaryTermSetId(siteUrl);
  const definedTermSetLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "@id": termSetId,
    name: GLOSSARY_TERM_SET_NAME,
    url: `${siteUrl}/glossary`,
    publisher: { "@id": `${siteUrl}/#organization` },
    hasDefinedTerm: TERMS.map((t) => ({
      "@type": "DefinedTerm",
      "@id": `${siteUrl}/glossary#${t.slug}`,
      name: t.term,
      description: t.definition,
      inDefinedTermSet: { "@id": termSetId },
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={definedTermSetLd} />
      <BreadcrumbSchema items={[{ name: "Glossary", path: "/glossary" }]} />

      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <PageHero
          title="Real Estate Glossary"
          lede="Plain-English definitions of every rental-property analysis term. Cross-linked to the calculators and the long-form posts so you can dig as deep as you want on any concept."
          actions={<UnderTitleAnalyzeLink />}
        />

        {/* Jump-to nav: every term as a ruled link at least 44px tall, in
            two to four columns, sentence case (it was a box of uppercase
            pills). rule="none": the hero's bottom rule opens it. */}
        <Section rhythm="tight" rule="none">
          <nav
            aria-label="Jump to term"
            className="grid grid-cols-2 gap-x-6 break-words border-t-2 border-foreground sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-12"
          >
            {TERMS.map((t) => (
              <a
                key={t.slug}
                href={`#${t.slug}`}
                className="flex min-h-11 min-w-11 items-center border-b border-rule-soft py-3 text-sm text-foreground transition-colors hover:bg-band"
              >
                {t.term}
              </a>
            ))}
          </nav>
        </Section>

        {/* Definitions: one ruled row per term in the reading column, not a
            card each. A row keeps its <article id> (the jump links and the
            DefinedTerm @ids point at it) and its H2. */}
        <Section rhythm="tight">
          <div className="max-w-[68ch] break-words border-t-2 border-foreground">
            {TERMS.map((t) => (
              <article
                key={t.slug}
                id={t.slug}
                className="scroll-mt-24 border-b border-rule-soft py-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-display text-balance text-h3-sm sm:text-2xl">
                      {t.term}
                    </h2>
                    {t.also && t.also.length > 0 ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Also called: {t.also.join(", ")}
                      </p>
                    ) : null}
                  </div>
                  {/* A plain underlined link in Signal Blue (5.9:1 on paper),
                      sentence case and no arrow; it was an 11px uppercase
                      label whose /60 opacity measured 2.52:1. */}
                  <IntentPrefetchLink
                    href={`/glossary/${t.slug}`}
                    aria-label={`Full definition for ${t.term}`}
                    className="tc-link -my-2 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-end text-sm"
                  >
                    Permalink
                  </IntentPrefetchLink>
                </div>

                <p className="mt-3 text-pretty text-base leading-relaxed text-foreground">
                  {t.definition}
                </p>

                {t.benchmark ? (
                  <Note className="mt-4">
                    <strong className="font-semibold text-foreground">Benchmark:</strong>{" "}
                    {t.benchmark}
                  </Note>
                ) : null}

                {/* Cross-links — full definition page + calculator + deeper read */}
                <div className="mt-2 flex flex-wrap items-center gap-x-6 text-base">
                  <IntentPrefetchLink
                    href={`/glossary/${t.slug}`}
                    className="tc-link inline-flex min-h-11 min-w-11 items-center"
                  >
                    Full definition, formula, example
                  </IntentPrefetchLink>
                  {t.toolPath && isLinkablePath(t.toolPath) ? (
                    <IntentPrefetchLink
                      href={t.toolPath}
                      className="tc-link inline-flex min-h-11 min-w-11 items-center"
                    >
                      Calculator
                    </IntentPrefetchLink>
                  ) : null}
                  {t.postPath && isLinkablePath(t.postPath) ? (
                    <IntentPrefetchLink
                      href={t.postPath}
                      className="tc-link inline-flex min-h-11 min-w-11 items-center"
                    >
                      Deep dive
                    </IntentPrefetchLink>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </Section>

        <CloseSection
          heading="Stop looking these up. Use the analyzer."
          headingId="glossary-cta-heading"
          lede={
            <>
              TrueCap computes every metric on this page live as you type, with
              inline tooltips that explain each one in context. Free to start — no
              signup needed.
            </>
          }
          actions={
            <ActionRow>
              <Link
                href="/analyze" prefetch={false}
                className={buttonVariants({ size: "cta" })}
              >
                Open TrueCap
              </Link>
            </ActionRow>
          }
        />
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
