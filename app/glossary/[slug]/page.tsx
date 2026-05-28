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
import { ArrowRight } from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Header } from "@/components/investcalc/header";
import {
  GLOSSARY,
  GLOSSARY_CATEGORY_LABELS,
  getGlossaryEntryBySlug,
  type GlossaryEntry,
} from "@/lib/glossary";
import { getSiteUrl } from "@/lib/site-url";

// Pre-render all glossary pages at build time for max SEO crawlability.
export async function generateStaticParams() {
  return Object.values(GLOSSARY).map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = getGlossaryEntryBySlug(slug);
  if (!entry) {
    return { title: "Glossary term not found | TrueCap" };
  }
  const description = entry.benchmark
    ? `${entry.definition} ${entry.benchmark}`
    : entry.definition;
  return {
    title: `${entry.term} — definition, formula, example | TrueCap Glossary`,
    description: description.slice(0, 158),
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
        <h1 className="mt-2 text-3xl sm:text-4xl font-black text-foreground leading-tight tracking-tight">
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
            <h2 className="text-xl font-black text-foreground mb-3">How it's calculated</h2>
            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <code className="text-base text-foreground font-mono">{entry.formula}</code>
            </div>
          </section>
        ) : null}

        {/* Example */}
        {entry.example ? (
          <section className="mt-10">
            <h2 className="text-xl font-black text-foreground mb-3">Example</h2>
            <p className="text-foreground leading-relaxed">{entry.example}</p>
          </section>
        ) : null}

        {/* Why it matters */}
        {entry.whyItMatters ? (
          <section className="mt-10">
            <h2 className="text-xl font-black text-foreground mb-3">
              Why {entry.term} matters
            </h2>
            <p className="text-foreground leading-relaxed">{entry.whyItMatters}</p>
          </section>
        ) : null}

        {/* Tool CTA */}
        {entry.toolUrl ? (
          <section className="mt-10 rounded-2xl border border-primary/20 bg-gradient-to-br from-[var(--brand-blue-light)] via-card to-card p-6 sm:p-8">
            <h2 className="text-xl font-black text-foreground mb-2">
              Run the math on a real deal
            </h2>
            <p className="text-foreground leading-relaxed mb-5">
              TrueCap has a free calculator for this. Paste an address or enter
              numbers manually — get {entry.term} plus all the supporting metrics
              in 60 seconds.
            </p>
            <Link
              href={entry.toolUrl}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90"
            >
              Try the free {entry.term} calculator <ArrowRight className="size-4" />
            </Link>
          </section>
        ) : null}

        {/* Related terms */}
        {relatedEntries.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-xl font-black text-foreground mb-4">Related terms</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {relatedEntries.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/glossary/${r.slug}`}
                    className="block rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors"
                  >
                    <p className="text-sm font-bold text-foreground">{r.term}</p>
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

        {/* Back to glossary */}
        <div className="mt-12 pt-6 border-t border-border">
          <Link
            href="/glossary"
            className="text-sm text-muted-foreground hover:text-foreground font-semibold"
          >
            ← Back to full glossary
          </Link>
        </div>
      </article>

      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
