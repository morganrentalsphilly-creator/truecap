/**
 * /blog/topics/[topic] — topic hub (P2-4). Groups the long-form posts for one
 * investor journey (underwriting / financing / tax / strategy / markets …)
 * with the matching free calculators, so a reader can go post → tool →
 * analyzer. Static — driven by lib/blog-topics.ts. Every link it lists passes
 * lib/seo/link-policy.ts (no unpublished or noindexed post, no unreleased
 * calculator); each post links back here through its "Part of" line.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, BookOpen, Calculator } from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";
import { BLOG_TOPICS, getBlogTopic } from "@/lib/blog-topics";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { getCalculator } from "@/lib/calculator-registry";
import { getGlossaryEntryBySlug } from "@/lib/glossary";
import { isLinkablePath } from "@/lib/seo/link-policy";
import { Header } from "@/components/investcalc/header";
import { JsonLd } from "@/components/seo/json-ld";
import { OPEN_GRAPH_BASE } from "@/lib/seo/open-graph-base";

export const dynamicParams = false;

export function generateStaticParams() {
  return BLOG_TOPICS.map((t) => ({ topic: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}): Promise<Metadata> {
  const { topic: slug } = await params;
  const topic = getBlogTopic(slug);
  if (!topic) return { title: "Topic not found" };
  return {
    title: `${topic.title} — Guides & Calculators`,
    description: topic.description,
    alternates: { canonical: `/blog/topics/${topic.slug}` },
    openGraph: {
      ...OPEN_GRAPH_BASE,
      title: `${topic.title} — TrueCap`,
      description: topic.description,
      url: `/blog/topics/${topic.slug}`,
      type: "website",
      images: [{ url: "/home.jpg", width: 1200, height: 630, alt: topic.title }],
    },
    twitter: { card: "summary_large_image", images: ["/home.jpg"] },
  };
}

export default async function BlogTopicHubPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic: slug } = await params;
  const topic = getBlogTopic(slug);
  if (!topic) notFound();

  const siteUrl = getSiteUrl();

  const posts = topic.postSlugs
    .map((s) => BLOG_POSTS.find((p) => p.slug === s && p.available))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .filter((p) => isLinkablePath(`/blog/${p.slug}`));
  const calculators = topic.calculatorSlugs
    .map((s) => getCalculator(s))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .filter((c) => isLinkablePath(`/tools/${c.slug}`));
  const terms = (topic.glossarySlugs ?? [])
    .map((s) => getGlossaryEntryBySlug(s))
    .filter((e): e is NonNullable<typeof e> => Boolean(e))
    .filter((e) => isLinkablePath(`/glossary/${e.slug}`));
  const otherTopics = BLOG_TOPICS.filter((t) => t.slug !== topic.slug);

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${siteUrl}/blog/topics/${topic.slug}#collection`,
    name: topic.title,
    description: topic.description,
    url: `${siteUrl}/blog/topics/${topic.slug}`,
    isPartOf: { "@id": `${siteUrl}/#website` },
    mainEntity: {
      "@type": "ItemList",
      name: `${topic.title} guides`,
      numberOfItems: posts.length,
      itemListElement: posts.map((post, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        url: `${siteUrl}/blog/${post.slug}`,
        name: post.title,
      })),
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={collectionLd} />
      <main id="main" className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs">
          <ol className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <li><Link href="/" className="hover:text-foreground">Home</Link></li>
            <li aria-hidden="true">›</li>
            <li><Link href="/blog" className="hover:text-foreground">Blog</Link></li>
            <li aria-hidden="true">›</li>
            <li className="font-semibold text-foreground">{topic.title}</li>
          </ol>
        </nav>

        <header className="mb-8">
          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
            {topic.title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">{topic.intro}</p>
        </header>

        {/* Guides */}
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-base font-extrabold text-foreground">
            <BookOpen className="size-4 text-primary" /> Guides
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary"
              >
                <h3 className="font-bold text-foreground group-hover:text-primary">{post.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
                <span className="mt-auto text-2xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {post.readingTimeMinutes} min read
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Terms the hub's guides turn on (lib/blog-topics.ts glossarySlugs). */}
        {terms.length > 0 ? (
          <section className="mb-10" data-topic-glossary-terms="">
            <h2 className="mb-3 text-base font-extrabold text-foreground">Terms these guides use</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {terms.map((entry, index) => (
                <span key={entry.slug}>
                  {index > 0 ? ", " : ""}
                  <Link
                    href={`/glossary/${entry.slug}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {entry.term}
                  </Link>
                </span>
              ))}
              . Every other term is defined in the{" "}
              <Link href="/glossary" className="font-semibold text-primary hover:underline">
                glossary
              </Link>
              .
            </p>
          </section>
        ) : null}

        {/* Calculators */}
        {calculators.length > 0 ? (
          <section className="mb-10">
            <h2 className="mb-4 flex items-center gap-2 text-base font-extrabold text-foreground">
              <Calculator className="size-4 text-primary" /> Calculators for this
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {calculators.map((calc) => (
                <Link
                  key={calc.slug}
                  href={`/tools/${calc.slug}`}
                  className="group flex flex-col gap-1.5 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary"
                >
                  <div className="flex items-center justify-between">
                    <Calculator className="size-5 text-primary" />
                    <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground">{calc.title}</h3>
                  <p className="text-sm text-muted-foreground">{calc.description}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* CTA */}
        <section className="mb-10 rounded-2xl bg-primary p-6 text-primary-foreground sm:p-8">
          <h2 className="mb-2 text-xl font-extrabold sm:text-2xl">Run a real deal</h2>
          <p className="mb-4 text-sm opacity-90 sm:text-base">
            Reading is step one. Paste an address into TrueCap and get cap rate, cash-on-cash,
            DSCR, cash flow, and a Buy Box fit in 60 seconds — free.
          </p>
          <Link
            href="/analyze" prefetch={false}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-foreground px-4 py-2.5 font-bold text-primary transition-opacity hover:opacity-90"
          >
            Open TrueCap <ArrowUpRight className="size-4" />
          </Link>
        </section>

        {/* Other topics */}
        <section className="border-t border-border pt-6">
          <p className="mb-3 text-2xs font-bold uppercase tracking-widest text-muted-foreground">
            More topics
          </p>
          <div className="flex flex-wrap gap-2">
            {otherTopics.map((t) => (
              <Link
                key={t.slug}
                href={`/blog/topics/${t.slug}`}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {t.title}
              </Link>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
