/**
 * /blog/topics — index of the topic hubs (P2-4). A shallow directory that
 * links to each investor-journey hub; the hubs do the heavy internal linking.
 *
 * Layout (DESIGN.md): the page hero with the breadcrumb as its meta line,
 * then the hubs as ruled rows, the /blog hub's row recipe.
 */

import type { Metadata } from "next";
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { PageHero } from "@/components/marketing/page-parts";
import { Section } from "@/components/marketing/section";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BLOG_TOPICS } from "@/lib/blog-topics";
import { isLinkablePath } from "@/lib/seo/link-policy";
import { getSiteUrl } from "@/lib/site-url";
import { Header } from "@/components/investcalc/header";
import { JsonLd } from "@/components/seo/json-ld";
import { OPEN_GRAPH_BASE } from "@/lib/seo/open-graph-base";

/**
 * The meta line under the H1 and its links: the article frame's meta line
 * and meta link (a tc-link with a 44px-tall target), the link padded to 44px
 * wide for a short word. Written out here, not imported: a file under
 * app/blog that imports components/marketing/article is read as a post on
 * the frame (lib/__tests__/blog-post-frame.test.tsx, seo/ARCHITECTURE.md).
 */
const BREADCRUMB_CLASS = "mt-4 text-sm text-muted-foreground";
const BREADCRUMB_LINK_CLASS = "tc-link -mx-2 -my-3 inline-block px-2 py-3";

/** How many hubs there are, in words; derived so the copy can't drift from lib/blog-topics.ts. */
const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const HUB_COUNT_WORD = NUMBER_WORDS[BLOG_TOPICS.length] ?? String(BLOG_TOPICS.length);

export const metadata: Metadata = {
  title: "Blog Topics",
  description:
    "TrueCap's rental investing guides by topic, from underwriting and financing to tax, strategy, markets, and due diligence.",
  alternates: { canonical: "/blog/topics" },
  openGraph: {
    ...OPEN_GRAPH_BASE,
    title: "TrueCap Blog — browse by topic",
    description:
      "Rental investing guides by topic, from underwriting and financing to tax and due diligence.",
    url: "/blog/topics",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap blog topics" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

export default function BlogTopicsIndexPage() {
  const siteUrl = getSiteUrl();
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${siteUrl}/blog/topics#page`,
        url: `${siteUrl}/blog/topics`,
        name: "TrueCap blog topics",
        description: metadata.description,
        isPartOf: { "@id": `${siteUrl}/#website` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "TrueCap", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
          { "@type": "ListItem", position: 3, name: "Topics", item: `${siteUrl}/blog/topics` },
        ],
      },
    ],
  };
  return (
    <div className="min-h-screen bg-background">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={schema} />
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <PageHero
          title="Browse by topic"
          lede={`Every TrueCap guide, grouped into the ${HUB_COUNT_WORD} things investors actually work through. Most hubs pair the reading with the calculators that run the numbers.`}
        >
          {/* The breadcrumb is the visible half of the BreadcrumbList above;
              like the blog's hub link it sits under the H1, never above it. */}
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
                Topics
              </li>
            </ol>
          </nav>
        </PageHero>

        {/* The hubs as ruled rows in two columns from 640px (RuledList's
            grid), not cards. The title is the row's one link; its padding,
            pulled back by the negative margin, makes a 44px target. */}
        <Section rhythm="tight" rule="none">
          <ul className="grid grid-cols-[minmax(0,1fr)] break-words border-t-2 border-foreground sm:grid-cols-[repeat(2,minmax(0,1fr))] sm:gap-x-12">
            {BLOG_TOPICS.map((topic) => (
              <li key={topic.slug} className="border-b border-rule-soft py-4">
                <h2 className="text-pretty text-lg font-semibold">
                  <IntentPrefetchLink
                    href={`/blog/topics/${topic.slug}`}
                    className="tc-link -my-2 inline-block max-w-full py-2"
                  >
                    {topic.title}
                  </IntentPrefetchLink>
                </h2>
                <p className="mt-1 max-w-[64ch] text-pretty text-base leading-relaxed text-muted-foreground">
                  {topic.description}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {topic.postSlugs.filter((slug) => isLinkablePath(`/blog/${slug}`)).length} guides
                </p>
              </li>
            ))}
          </ul>
        </Section>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
