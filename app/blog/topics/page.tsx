/**
 * /blog/topics — index of the topic hubs (P2-4). A shallow directory that
 * links to each investor-journey hub; the hubs do the heavy internal linking.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BLOG_TOPICS } from "@/lib/blog-topics";
import { isLinkablePath } from "@/lib/seo/link-policy";
import { getSiteUrl } from "@/lib/site-url";
import { Header } from "@/components/investcalc/header";
import { JsonLd } from "@/components/seo/json-ld";

/** How many hubs there are, in words; derived so the copy can't drift from lib/blog-topics.ts. */
const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const HUB_COUNT_WORD = NUMBER_WORDS[BLOG_TOPICS.length] ?? String(BLOG_TOPICS.length);

export const metadata: Metadata = {
  title: "Blog Topics",
  description:
    "TrueCap's rental investing guides by topic, from underwriting and financing to tax, strategy, markets, and due diligence.",
  alternates: { canonical: "/blog/topics" },
  openGraph: {
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
      <main id="main" className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs">
          <ol className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <li><Link href="/" className="hover:text-foreground">Home</Link></li>
            <li aria-hidden="true">›</li>
            <li><Link href="/blog" className="hover:text-foreground">Blog</Link></li>
            <li aria-hidden="true">›</li>
            <li className="font-semibold text-foreground">Topics</li>
          </ol>
        </nav>

        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
            Browse by topic
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Every TrueCap guide, grouped into the {HUB_COUNT_WORD} things investors actually work
            through. Most hubs pair the reading with the calculators that run the numbers.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {BLOG_TOPICS.map((topic) => (
            <Link
              key={topic.slug}
              href={`/blog/topics/${topic.slug}`}
              className="group flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-extrabold text-foreground group-hover:text-primary">{topic.title}</h2>
                <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">{topic.description}</p>
              <span className="mt-auto text-2xs font-semibold uppercase tracking-widest text-muted-foreground">
                {topic.postSlugs.filter((slug) => isLinkablePath(`/blog/${slug}`)).length} guides
              </span>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
