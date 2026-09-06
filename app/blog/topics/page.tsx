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
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Blog Topics",
  description:
    "TrueCap's rental investing guides by topic: underwriting, financing, tax, strategy, and markets, each paired with the calculators that run the math.",
  alternates: { canonical: "/blog/topics" },
  openGraph: {
    title: "TrueCap Blog — browse by topic",
    description:
      "Rental investing guides by topic: underwriting, financing, tax, strategy, and markets.",
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
          { "@type": "ListItem", position: 1, name: "TrueCap", item: `${siteUrl}/` },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
          { "@type": "ListItem", position: 3, name: "Topics", item: `${siteUrl}/blog/topics` },
        ],
      },
    ],
  };
  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
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
            Every TrueCap guide, grouped into the five things investors actually work through —
            each hub pairs the reading with the calculators that run the numbers.
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
              <span className="mt-auto text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {topic.postSlugs.length} guides
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
