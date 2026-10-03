/**
 * /blog/topics/[topic] — topic hub (P2-4). Groups the long-form posts for one
 * investor journey (underwriting / financing / tax / strategy / markets …)
 * with the matching free calculators, so a reader can go post → tool →
 * analyzer. Static — driven by lib/blog-topics.ts. Every link it lists passes
 * lib/seo/link-policy.ts (no unpublished or noindexed post, no unreleased
 * calculator); each post links back here through its "Part of" line.
 *
 * Layout (DESIGN.md): the page hero with the breadcrumb as its meta line,
 * one section per block on the /blog hub's 5/7 split (the heading on the
 * left, ruled rows on the right), and the close on the heavy rule with the
 * analyzer button and the other hubs under it.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
// Internal links prefetch on hover or keyboard focus, not as they scroll into
// view; the /analyze link stays next/link with prefetch={false}.
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { ActionRow, CloseSection, PageHero } from "@/components/marketing/page-parts";
import { Section, SectionHeading } from "@/components/marketing/section";
import { buttonVariants } from "@/components/ui/button";
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

/**
 * The meta line under the H1 and its links: the article frame's meta line
 * and meta link (a tc-link with a 44px-tall target), the link padded to 44px
 * wide for a short word. Written out here, not imported: a file under
 * app/blog that imports components/marketing/article is read as a post on
 * the frame (lib/__tests__/blog-post-frame.test.tsx, seo/ARCHITECTURE.md).
 */
const BREADCRUMB_CLASS = "mt-4 text-sm text-muted-foreground";
const BREADCRUMB_LINK_CLASS = "tc-link -mx-2 -my-3 inline-block px-2 py-3";

/**
 * A section's two columns from 1024px (the /blog hub's 5/7 split): the
 * heading on the left, its rows on the right. One zero-minimum track below
 * that and min-w-0 columns, so an unbreakable token in a registry title or
 * excerpt wraps instead of widening the page.
 */
const SPLIT_CLASS =
  "grid grid-cols-[minmax(0,1fr)] gap-x-16 gap-y-6 break-words lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]";

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
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <PageHero title={topic.title} lede={topic.intro}>
          {/* The breadcrumb sits under the H1 as the hero's meta line, never
              above it (the blog's hub link does the same on a post). */}
          <nav aria-label="Breadcrumb" className={BREADCRUMB_CLASS}>
            <ol className="flex flex-wrap items-center gap-x-2">
              <li>
                <IntentPrefetchLink href="/" className={BREADCRUMB_LINK_CLASS}>
                  Home
                </IntentPrefetchLink>
              </li>
              <li aria-hidden="true">›</li>
              <li>
                <IntentPrefetchLink href="/blog" className={BREADCRUMB_LINK_CLASS}>
                  Blog
                </IntentPrefetchLink>
              </li>
              <li aria-hidden="true">›</li>
              <li aria-current="page" className="text-foreground">
                {topic.title}
              </li>
            </ol>
          </nav>
        </PageHero>

        {/* Guides: the /blog hub's section, the heading on the left and the
            posts as ruled rows on the right. The title is the row's one link;
            its padding, pulled back by the negative margin, makes a 44px
            target. The hero's bottom rule opens this section. */}
        <Section rhythm="tight" aria-labelledby="topic-guides-heading">
          <div className={SPLIT_CLASS}>
            <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
              <SectionHeading id="topic-guides-heading">Guides</SectionHeading>
            </div>
            <ul className="min-w-0 border-t-2 border-foreground">
              {posts.map((post) => (
                <li key={post.slug} className="border-b border-rule-soft py-4">
                  <h3 className="text-pretty text-lg font-semibold">
                    <IntentPrefetchLink
                      href={`/blog/${post.slug}`}
                      className="tc-link -my-2 inline-block max-w-full py-2"
                    >
                      {post.title}
                    </IntentPrefetchLink>
                  </h3>
                  <p className="mt-1 line-clamp-3 max-w-[64ch] text-pretty text-base leading-relaxed text-muted-foreground">
                    {post.excerpt}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {post.readingTimeMinutes} min read
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        {/* Terms the hub's guides turn on (lib/blog-topics.ts glossarySlugs). */}
        {terms.length > 0 ? (
          <Section rhythm="tight" aria-labelledby="topic-terms-heading" data-topic-glossary-terms="">
            <div className={SPLIT_CLASS}>
              <div className="min-w-0">
                <SectionHeading id="topic-terms-heading">Terms these guides use</SectionHeading>
              </div>
              <p className="min-w-0 max-w-[64ch] text-pretty text-lg leading-relaxed text-muted-foreground">
                {terms.map((entry, index) => (
                  <span key={entry.slug}>
                    {index > 0 ? ", " : ""}
                    <IntentPrefetchLink href={`/glossary/${entry.slug}`} className="tc-link">
                      {entry.term}
                    </IntentPrefetchLink>
                  </span>
                ))}
                . Every other term is defined in the{" "}
                <IntentPrefetchLink href="/glossary" className="tc-link">
                  glossary
                </IntentPrefetchLink>
                .
              </p>
            </div>
          </Section>
        ) : null}

        {/* Calculators: the same ruled rows, no icon and no card. */}
        {calculators.length > 0 ? (
          <Section rhythm="tight" aria-labelledby="topic-calculators-heading">
            <div className={SPLIT_CLASS}>
              <div className="min-w-0">
                <SectionHeading id="topic-calculators-heading">Calculators for this</SectionHeading>
              </div>
              <ul className="min-w-0 border-t-2 border-foreground">
                {calculators.map((calc) => (
                  <li key={calc.slug} className="border-b border-rule-soft py-4">
                    <h3 className="text-pretty text-lg font-semibold">
                      <IntentPrefetchLink
                        href={`/tools/${calc.slug}`}
                        className="tc-link -my-2 inline-block max-w-full py-2"
                      >
                        {calc.title}
                      </IntentPrefetchLink>
                    </h3>
                    <p className="mt-1 max-w-[64ch] text-pretty text-base leading-relaxed text-muted-foreground">
                      {calc.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </Section>
        ) : null}

        {/* The close on the heavy rule: the analyzer button, then the other
            hubs under it on a soft rule (two-column ruled links on phones,
            2px tags from 640px: the /blog hero's topic links). */}
        <CloseSection
          heading="Run a real deal"
          headingId="topic-cta-heading"
          lede={
            <>
              Reading is step one. Enter an address, the asking price and a bedroom count in
              TrueCap and get cap rate, cash-on-cash, DSCR, cash flow, and a Buy Box fit in
              60 seconds — free.
            </>
          }
          actions={
            <ActionRow>
              <Link href="/analyze" prefetch={false} className={buttonVariants({ size: "cta" })}>
                Open TrueCap
              </Link>
            </ActionRow>
          }
        >
          <nav aria-labelledby="more-topics-label" className="mt-10 border-t border-rule-soft pt-6">
            <p id="more-topics-label" className="mb-2 text-sm font-semibold text-muted-foreground">
              More topics
            </p>
            <div className="grid grid-cols-2 gap-x-6 break-words sm:flex sm:flex-wrap sm:gap-2">
              {otherTopics.map((t) => (
                <IntentPrefetchLink
                  key={t.slug}
                  href={`/blog/topics/${t.slug}`}
                  className="block min-h-11 min-w-11 border-b border-rule-soft py-3 text-sm text-foreground transition-colors hover:bg-band sm:inline-flex sm:items-center sm:rounded-sm sm:border sm:border-border sm:px-3 sm:py-2"
                >
                  {t.title}
                </IntentPrefetchLink>
              ))}
            </div>
          </nav>
        </CloseSection>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
