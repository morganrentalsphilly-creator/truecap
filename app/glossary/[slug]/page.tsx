/**
 * Per-term glossary page at /glossary/[slug].
 *
 * Each term in lib/glossary.ts produces a dedicated URL that ranks
 * for the term's name + common variants. Schema markup: a DefinedTerm
 * (in the hub's DefinedTermSet, by @id) and the BreadcrumbList. No
 * FAQPage: the page renders definition sections, not questions, and
 * FAQ markup must mirror a visible FAQ (F4).
 *
 * Internal links to related terms compound the topic-cluster SEO
 * signal — Google's algorithm rewards densely-linked subject matter.
 *
 * Layout (DESIGN.md): PageHero with the definition as the lede and the one
 * short analyzer link under the H1, then the sections in a 68ch reading
 * column (ArticleBody, the formula on rules, related terms as ruled rows)
 * and the page's single SeoAnalyzerCta.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ARTICLE_META,
  ARTICLE_META_NEXT,
  ArticleBody,
  ToolFormula,
} from "@/components/marketing/article";
// Internal links prefetch on hover or keyboard focus, not as they scroll into view.
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { PageHero, RuledList, UnderTitleAnalyzeLink } from "@/components/marketing/page-parts";
import { Section } from "@/components/marketing/section";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Header } from "@/components/investcalc/header";
import { SeoAnalyzerCta } from "@/components/marketing/seo-analyzer-cta";
import {
  GLOSSARY,
  GLOSSARY_CATEGORY_LABELS,
  getGlossaryEntryBySlug,
  type GlossaryEntry,
} from "@/lib/glossary";
import { getSiteUrl } from "@/lib/site-url";
import { RelatedContent } from "@/components/marketing/related-content";
import type { GlossaryCategory } from "@/lib/glossary";
import { truncateMetaDescription } from "@/lib/utils";
import { lastmodFor } from "@/lib/seo/lastmod";
import { JsonLd } from "@/components/seo/json-ld";
import { glossaryTermSetRef } from "@/lib/seo/glossary-ld";
import { isLinkablePath, linkableToolFor } from "@/lib/seo/link-policy";
import { OPEN_GRAPH_BASE } from "@/lib/seo/open-graph-base";

/** A breadcrumb link: the meta line's link (ARTICLE_META_LINK: a tc-link, 44px tall), padded to 44px wide for a short word. */
const BREADCRUMB_LINK_CLASS = "tc-link -mx-2 -my-3 inline-block px-2 py-3";

// Pre-render all glossary pages at build time for max SEO crawlability.
export async function generateStaticParams() {
  return Object.values(GLOSSARY).map((entry) => ({ slug: entry.slug }));
}

/**
 * Longest tail that keeps `<title>` within 60 characters once the layout's
 * " | TrueCap" suffix is appended (docs/site-overhaul.md Phase 8).
 */
const TITLE_SUFFIX_LENGTH = " | TrueCap".length;
function glossaryTitle(term: string): string {
  for (const tail of [" — definition, formula, example", " — definition and formula", " — definition", ""]) {
    if (term.length + tail.length + TITLE_SUFFIX_LENGTH <= 60) return `${term}${tail}`;
  }
  return term;
}

/**
 * A term's description for a search snippet (155 characters) or a link
 * preview (200), ending on a full stop wherever the text allows:
 *   1. the definition and the benchmark, when both fit whole;
 *   2. otherwise the definition alone, as many whole sentences as fit (a
 *      benchmark is never quoted in part: half a range reads as the range);
 *   3. only when the first sentence is itself over the limit, a cut at a
 *      word boundary with an ellipsis (truncateMetaDescription).
 * Definition plus benchmark runs to 326 characters, and cutting that at the
 * limit ended 14 of the 44 snippets mid-sentence and 7 previews mid-word
 * ("Lender definitio").
 */
function glossaryDescription(entry: GlossaryEntry, max: number): string {
  const definition = entry.definition.trim();
  if (entry.benchmark) {
    const both = `${definition} ${entry.benchmark.trim()}`;
    if (both.length <= max) return both;
  }
  let fitted = "";
  for (const sentence of definition.split(/(?<=[.!?])\s+/)) {
    const next = fitted ? `${fitted} ${sentence}` : sentence;
    if (next.length > max) break;
    fitted = next;
  }
  return fitted || truncateMetaDescription(definition, max);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = getGlossaryEntryBySlug(slug);
  if (!entry) {
    return { title: "Glossary term not found" };
  }
  return {
    title: glossaryTitle(entry.term),
    description: glossaryDescription(entry, 155),
    keywords: [
      entry.term.toLowerCase(),
      `${entry.term.toLowerCase()} definition`,
      `${entry.term.toLowerCase()} formula`,
      `${entry.term.toLowerCase()} example`,
      `what is ${entry.term.toLowerCase()}`,
      `${entry.term.toLowerCase()} real estate`,
      `${entry.term.toLowerCase()} rental property`,
    ],
    alternates: { canonical: `/glossary/${entry.slug}` },
    openGraph: {
      ...OPEN_GRAPH_BASE,
      title: `${entry.term} — what it is, how to calculate it`,
      description: glossaryDescription(entry, 200),
      url: `/glossary/${entry.slug}`,
      type: "article",
      images: [
        {
          url: "/home.jpg",
          width: 1200,
          height: 630,
          alt: `${entry.term} explained — TrueCap glossary`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      images: ["/home.jpg"],
    },
  };
}


/**
 * How each category of term is used by the analyzer — product description,
 * the same for every entry in the category, so a reader learns where to
 * look for the number they just read about.
 */
const IN_PRODUCT_BY_CATEGORY: Record<GlossaryCategory, string> = {
  // Holds for the seven metric entries that render it: cap rate, cash-on-cash,
  // monthly cash flow, DSCR, NOI, Deal score and GRM. GRM, NOI and the Deal
  // score are shown but are not Buy Box or Offer Ceiling targets, so the
  // sentence makes no claim about targets, the memo or the PDF. IRR and the
  // Offer Ceiling have their own sentence in IN_PRODUCT_BY_SLUG below.
  metric:
    "The analyzer computes this metric on every run from the assumptions you see and can edit, and shows it in the results view.",
  financing:
    "Financing inputs sit in the analyzer's financing section: the rate can start from FRED's national 30-year benchmark and every term is editable. They drive the monthly payment, DSCR, and cash flow after reserves, so a change here moves the verdict and the Offer Ceiling; the results view names the financing assumptions most likely to change the decision.",
  expense:
    "Operating expenses are line items in the analyzer's expense section, each labeled with its source — a HUD or FRED benchmark, a TrueCap default you can replace, or your own number. Property tax is always your local figure. Together they produce NOI and cash flow after reserves, and the results view shows how much each one moves the decision.",
  projection:
    "Projection assumptions feed the 10-year view: rent and expense growth, appreciation, and the exit costs used in the sale scenarios. They do not change the first-year verdict; they change what the deal looks like over time, which is why they are kept editable and labeled separately from the current-year inputs.",
  strategy:
    "A strategy sets which inputs the analyzer asks for and which outputs lead the results view. The core buy-and-hold flow is what every free analysis runs; specialist flows reuse the same engine and the same labeled assumptions, so a number that appears in two strategies was computed the same way in both.",
  fundamental:
    "Property fundamentals are the facts you enter or confirm about the building itself — price, units, bedrooms, square footage — and the analyzer keeps them separate from assumptions. They decide which benchmarks apply (a 3-bedroom rent benchmark, for example) and appear at the top of every results view and memo so the reader knows exactly what was analyzed.",
};

/**
 * Metric entries the analyzer's results view does not show, so the category
 * sentence above ("computes this metric on every run ... shows it in the
 * results view") would be false on them, and so would a call to "run the
 * <term> math on a real deal":
 *   - tax-savings and after-tax-cash-flow: the tax view is not offered
 *     (tax_strategy is shipped: false in lib/entitlements-catalog.ts), and
 *     both entries say so in their own text;
 *   - operating-expense-ratio: nothing in the analyzer computes an OER;
 *   - equity-multiple: computed for Compare only, not in the results view.
 * These pages keep their definition, example and checks, and render neither
 * the "Where it shows up in TrueCap" block nor the term in the analyzer CTA.
 */
const METRICS_NOT_IN_THE_RESULTS_VIEW: ReadonlySet<string> = new Set([
  "tax-savings",
  "after-tax-cash-flow",
  "operating-expense-ratio",
  "equity-multiple",
]);

/**
 * Metric entries the category sentence would be false on, each with its own:
 *   - irr: computed on every run (calculateMaoIrr in analysis-dashboard.tsx)
 *     but shown only as a Buy Box rule once a minimum IRR target is set
 *     (lib/buy-box.ts); the "10-Yr Return" tile is a different figure;
 *   - max-allowable-offer: the exact Offer Ceiling is part of the first
 *     complete decision and paid after that (mao in
 *     lib/entitlements-catalog.ts), so it is not shown on every run.
 */
const IN_PRODUCT_BY_SLUG: Readonly<Record<string, string>> = {
  irr: "The analyzer computes a 10-year pre-tax IRR from the assumptions you see and can edit, and checks it against your Buy Box when you set a minimum IRR target.",
  "max-allowable-offer":
    "The Offer Ceiling is part of your first complete decision; after that the exact figure comes with Pro. The analyzer works backward from your targets and the assumptions you see and can edit.",
};

export default async function GlossaryTermPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getGlossaryEntryBySlug(slug);
  if (!entry) {
    notFound();
  }

  const siteUrl = getSiteUrl();
  const relatedEntries: GlossaryEntry[] = (entry.related ?? [])
    .map((key) => GLOSSARY[key])
    .filter(Boolean)
    .filter((r) => isLinkablePath(`/glossary/${r.slug}`));
  // The entry's own calculator, only while it is released (F9): an
  // unreleased tool's toolUrl stays in the data and renders nothing.
  const tool = linkableToolFor(entry.toolUrl);
  // Where the term shows up in the product: null when it does not.
  const inProduct = METRICS_NOT_IN_THE_RESULTS_VIEW.has(entry.slug)
    ? null
    : (IN_PRODUCT_BY_SLUG[entry.slug] ?? IN_PRODUCT_BY_CATEGORY[entry.category]);

  // ── Schema.org markup ──
  // DefinedTerm: tells Google this is a glossary entry → "what is X" SERPs
  const definedTermLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: entry.term,
    description: entry.definition,
    url: `${siteUrl}/glossary/${entry.slug}`,
    dateModified: lastmodFor(`/glossary/${entry.slug}`),
    // The hub's DefinedTermSet, by its @id (lib/seo/glossary-ld.ts, F4).
    inDefinedTermSet: glossaryTermSetRef(siteUrl),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "TrueCap",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Glossary",
        item: `${siteUrl}/glossary`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: entry.term,
        item: `${siteUrl}/glossary/${entry.slug}`,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={definedTermLd} />
      <JsonLd data={breadcrumbLd} />

      <Header />

      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <article>
          {/* The hero: the term, then the definition (and its benchmark) as
              the lede, then the one short analyzer link (P2-80). The
              breadcrumb and the category sit under them as meta lines;
              nothing sits above the H1. */}
          <PageHero
            title={entry.term}
            lede={
              <>
                <p>{entry.definition}</p>
                {entry.benchmark ? (
                  <p className="mt-3 text-muted-foreground">{entry.benchmark}</p>
                ) : null}
              </>
            }
            actions={<UnderTitleAnalyzeLink />}
          >
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className={ARTICLE_META}>
              <ol className="flex flex-wrap items-center gap-x-2">
                <li>
                  <IntentPrefetchLink href="/" className={BREADCRUMB_LINK_CLASS}>
                    Home
                  </IntentPrefetchLink>
                </li>
                <li aria-hidden="true">›</li>
                <li>
                  <IntentPrefetchLink href="/glossary" className={BREADCRUMB_LINK_CLASS}>
                    Glossary
                  </IntentPrefetchLink>
                </li>
                <li aria-hidden="true">›</li>
                <li aria-current="page" className="text-foreground">
                  {entry.term}
                </li>
              </ol>
            </nav>

            {/* Category: a meta line, sentence case as the label is written. */}
            <p className={ARTICLE_META_NEXT}>
              {GLOSSARY_CATEGORY_LABELS[entry.category]}
            </p>
          </PageHero>

          {/* rule="none": PageHero's bottom rule already separates the head. */}
          <Section rule="none" rhythm="tight">
            <div className="max-w-[68ch]">
              {/* Each block is a heading and its text straight in the body
                  (no wrapper), so the first one sits flush with the top of the
                  column, as prose-ledger sets its first child. */}
              <ArticleBody>
                {/* Formula */}
                {entry.formula ? (
                  <>
                    <h2>How it&apos;s calculated</h2>
                    <ToolFormula formula={entry.formula} />
                  </>
                ) : null}

                {/* Example */}
                {entry.example ? (
                  <>
                    <h2>Example</h2>
                    <p>{entry.example}</p>
                  </>
                ) : null}

                {/* The entry's calculator (lib/glossary.ts toolUrl), released only. */}
                {tool ? (
                  <p data-glossary-tool-link="">
                    Run the numbers with the{" "}
                    <IntentPrefetchLink href={`/tools/${tool.slug}`} className="tc-link">
                      {tool.title}
                    </IntentPrefetchLink>
                    .
                  </p>
                ) : null}

                {/* Why it matters */}
                {entry.whyItMatters ? (
                  <>
                    <h2>Why {entry.term} matters</h2>
                    <p>{entry.whyItMatters}</p>
                  </>
                ) : null}

                {/* How to check it (Phase 8): the verification step for the number. */}
                {entry.howToCheck ? (
                  <>
                    <h2 data-glossary-how-to-check="">How to check {entry.term} before you rely on it</h2>
                    <p>{entry.howToCheck}</p>
                  </>
                ) : null}

                {/* Related terms: term-and-detail rows on rules, not cards;
                    not-prose, so they keep RuledList's own type. */}
                {relatedEntries.length > 0 ? (
                  <>
                    <h2>Related terms</h2>
                    <RuledList
                      columns={2}
                      className="not-prose my-8"
                      items={relatedEntries.map((r) => ({
                        key: r.slug,
                        term: (
                          <IntentPrefetchLink
                            href={`/glossary/${r.slug}`}
                            className="tc-link -my-2 inline-block max-w-full py-2"
                          >
                            {r.term}
                          </IntentPrefetchLink>
                        ),
                        detail: (
                          <>
                            {r.definition.slice(0, 100)}
                            {r.definition.length > 100 ? "…" : ""}
                          </>
                        ),
                      }))}
                    />
                  </>
                ) : null}
              </ArticleBody>
              <div className="mt-12">
                <SeoAnalyzerCta
                  context={inProduct ? `the ${entry.term} math on a real deal` : undefined}
                  utmSource="glossary"
                />
              </div>

              {/* Back to glossary */}
              <p className="mt-8 text-base">
                <IntentPrefetchLink
                  href="/glossary"
                  className="tc-link inline-flex min-h-11 min-w-11 items-center"
                >
                  ← Glossary
                </IntentPrefetchLink>
              </p>
              {/* Where the term shows up in the product (true for every entry in
                  its category) + tag-driven related links (Phase 8.4). */}
              {inProduct ? (
                <ArticleBody className="mt-6">
                  <section aria-labelledby="in-truecap">
                    <h2 id="in-truecap">Where {entry.term} shows up in TrueCap</h2>
                    <p>{inProduct}</p>
                  </section>
                </ArticleBody>
              ) : null}
              <RelatedContent kind="glossary" slug={entry.slug} title={entry.term} className="mt-10" />
            </div>
          </Section>
        </article>
      </main>

      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
