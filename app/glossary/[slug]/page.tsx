/**
 * Per-term glossary page at /glossary/[slug].
 *
 * Each term in lib/glossary.ts produces a dedicated URL that ranks
 * for the term's name + common variants. Schema markup includes
 * DefinedTerm (Google understands "what is X" queries) + FAQPage
 * (powers question-answer snippets in SERPs).
 *
 * Internal links to related terms compound the topic-cluster SEO
 * signal — Google's algorithm rewards densely-linked subject matter.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
  const description = entry.benchmark
    ? `${entry.definition} ${entry.benchmark}`
    : entry.definition;
  return {
    title: glossaryTitle(entry.term),
    description: truncateMetaDescription(description),
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
      title: `${entry.term} — what it is, how to calculate it`,
      description: description.slice(0, 200),
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
  metric:
    "The analyzer computes this metric on every run from the assumptions you see and can edit, shows it in the results view beside cash flow after reserves and DSCR, and uses your targets for it in Buy Box fit and in the Offer Ceiling — the highest price that still meets those targets. It appears in the written decision memo and the PDF with the same value and the same inputs.",
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
    .filter(Boolean);

  // ── Schema.org markup ──
  // DefinedTerm: tells Google this is a glossary entry → "what is X" SERPs
  const definedTermLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: entry.term,
    description: entry.definition,
    url: `${siteUrl}/glossary/${entry.slug}`,
    dateModified: "2026-06-01",
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: "TrueCap Real Estate Investing Glossary",
      url: `${siteUrl}/glossary`,
    },
  };

  // FAQPage: powers Google's question-answer snippets in SERPs
  const faqItems: Array<{ q: string; a: string }> = [
    { q: `What is ${entry.term}?`, a: entry.definition },
  ];
  if (entry.formula) {
    faqItems.push({
      q: `How is ${entry.term} calculated?`,
      a: entry.formula + (entry.example ? ` Example: ${entry.example}` : ""),
    });
  }
  if (entry.benchmark) {
    faqItems.push({
      q: `What's a good ${entry.term}?`,
      a: entry.benchmark,
    });
  }
  if (entry.whyItMatters) {
    faqItems.push({
      q: `Why does ${entry.term} matter for rental property investing?`,
      a: entry.whyItMatters,
    });
  }
  if (entry.howToCheck) {
    faqItems.push({
      q: `How do I check ${entry.term} before I rely on it?`,
      a: entry.howToCheck,
    });
  }
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <Header />

      <main id="main">
        <article className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6 text-xs">
            <ol className="flex flex-wrap items-center gap-2 text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-foreground">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">›</li>
              <li>
                <Link href="/glossary" className="hover:text-foreground">
                  Glossary
                </Link>
              </li>
              <li aria-hidden="true">›</li>
              <li className="font-semibold text-foreground">{entry.term}</li>
            </ol>
          </nav>

          {/* Category eyebrow */}
          <p className="text-[11px] uppercase tracking-widest text-primary font-bold">
            {GLOSSARY_CATEGORY_LABELS[entry.category]}
          </p>

          {/* H1 */}
          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-foreground leading-tight tracking-tight">
            {entry.term}
          </h1>

          {/* Lead — definition + optional benchmark */}
          <div className="mt-5 space-y-3 text-lg leading-relaxed text-foreground">
            <p>{entry.definition}</p>
            {entry.benchmark ? (
              <p className="text-muted-foreground italic">{entry.benchmark}</p>
            ) : null}
          </div>

          {/* Formula */}
          {entry.formula ? (
            <section className="mt-10">
              <h2 className="text-xl font-extrabold text-foreground mb-3">
                How it&apos;s calculated
              </h2>
              <div className="rounded-xl border border-border bg-muted/30 p-5">
                <code className="text-base text-foreground font-mono">
                  {entry.formula}
                </code>
              </div>
            </section>
          ) : null}

          {/* Example */}
          {entry.example ? (
            <section className="mt-10">
              <h2 className="text-xl font-extrabold text-foreground mb-3">
                Example
              </h2>
              <p className="text-foreground leading-relaxed">{entry.example}</p>
            </section>
          ) : null}

          {/* Why it matters */}
          {entry.whyItMatters ? (
            <section className="mt-10">
              <h2 className="text-xl font-extrabold text-foreground mb-3">
                Why {entry.term} matters
              </h2>
              <p className="text-foreground leading-relaxed">
                {entry.whyItMatters}
              </p>
            </section>
          ) : null}

          {/* How to check it (Phase 8): the verification step for the number. */}
          {entry.howToCheck ? (
            <section className="mt-10" data-glossary-how-to-check>
              <h2 className="text-xl font-extrabold text-foreground mb-3">
                How to check {entry.term} before you rely on it
              </h2>
              <p className="text-foreground leading-relaxed">
                {entry.howToCheck}
              </p>
            </section>
          ) : null}

          {/* Related terms */}
          {relatedEntries.length > 0 ? (
            <section className="mt-10">
              <h2 className="text-xl font-extrabold text-foreground mb-4">
                Related terms
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {relatedEntries.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={`/glossary/${r.slug}`}
                      className="block rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors"
                    >
                      <p className="text-sm font-bold text-foreground">
                        {r.term}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {r.definition.slice(0, 100)}
                        {r.definition.length > 100 ? "…" : ""}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <div className="mt-10">
            <SeoAnalyzerCta
              context={`the ${entry.term} math on a real deal`}
              utmSource="glossary"
            />
          </div>

          {/* Back to glossary */}
          <div className="mt-12 pt-6 border-t border-border">
            <Link
              href="/glossary"
              className="text-sm text-muted-foreground hover:text-foreground font-semibold"
            >
              ← Back to full glossary
            </Link>
          </div>
          {/* Where the term shows up in the product (true for every entry in
              its category) + tag-driven related links (Phase 8.4). */}
          <section className="mt-10" aria-labelledby="in-truecap">
            <h2 id="in-truecap" className="text-xl font-extrabold text-foreground mb-3">
              Where {entry.term} shows up in TrueCap
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              {IN_PRODUCT_BY_CATEGORY[entry.category]}
            </p>
          </section>
          <RelatedContent kind="glossary" slug={entry.slug} title={entry.term} className="mt-10" />
        </article>
      </main>

      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
