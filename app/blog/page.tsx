/**
 * /blog — landing page for long-form content.
 *
 * Long-form articles are the highest-leverage compounding SEO asset
 * for TrueCap right now: one excellent post ranking for educational
 * queries ('how to analyze a rental property', 'rental property
 * underwriting guide') can pull thousands of organic visits monthly
 * over its lifetime. Each post links into the calculator/tools and
 * funnels into the conversion path.
 *
 * Posts are currently a hardcoded array — when the catalog grows
 * beyond ~10 posts, lift them into a content collection (MDX +
 * frontmatter, or a Supabase table). For now, the trade-off favors
 * fewer moving parts.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Blog | TrueCap",
  description:
    "Deep dives on rental property analysis, real estate math, and underwriting best practices from the team behind TrueCap.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "TrueCap Blog — rental property analysis & underwriting",
    description:
      "Deep dives on rental property analysis, real estate math, and underwriting best practices.",
    url: "/blog",
    type: "website",
    images: [{ url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap blog" }],
  },
  twitter: { card: "summary_large_image", images: ["/home.jpg"] },
};

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  readingTimeMinutes: number;
  publishedAt: string; // ISO date
  available: boolean;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "what-is-a-good-cap-rate",
    title: "What's a good cap rate for rental property in 2026?",
    excerpt:
      "Benchmarks by market type, the framework professionals actually use to evaluate cap rate, and why pre-2022 intuition is silently buying investors into negative leverage.",
    readingTimeMinutes: 9,
    publishedAt: "2026-05-24",
    available: true,
  },
  {
    slug: "dscr-loans-explained",
    title: "DSCR loans explained: what they are, when they make sense, what they cost in 2026",
    excerpt:
      "DSCR loans approve based on the property's economics, not your personal income. Who they're for, what rates and ratios look like in 2026, and the trade-offs vs. conventional financing.",
    readingTimeMinutes: 10,
    publishedAt: "2026-05-24",
    available: true,
  },
  {
    slug: "cap-rate-vs-cash-on-cash-vs-dscr",
    title: "Cap rate vs cash-on-cash vs DSCR: which one actually matters?",
    excerpt:
      "Three different metrics, three different jobs. A plain-English guide to when each one matters and the 2026 negative-leverage trap most investors miss.",
    readingTimeMinutes: 8,
    publishedAt: "2026-05-24",
    available: true,
  },
  {
    slug: "how-to-underwrite-a-rental-property-in-60-seconds",
    title: "How to underwrite a rental property in 60 seconds",
    excerpt:
      "The five numbers, four metrics, and two sanity checks every investor uses to triage a deal — without a spreadsheet.",
    readingTimeMinutes: 9,
    publishedAt: "2026-05-24",
    available: true,
  },
];

export default function BlogIndexPage() {
  const siteUrl = getSiteUrl();
  const blogLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${siteUrl}/blog#blog`,
    name: "TrueCap Blog",
    url: `${siteUrl}/blog`,
    publisher: { "@id": `${siteUrl}/#organization` },
    blogPost: BLOG_POSTS.filter((p) => p.available).map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `${siteUrl}/blog/${p.slug}`,
      datePublished: p.publishedAt,
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogLd) }}
      />
      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-8">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-muted-foreground font-bold hover:text-foreground"
          >
            ← TrueCap
          </Link>
          <h1 className="text-3xl sm:text-4xl font-black text-foreground mt-2 leading-tight">
            Blog
          </h1>
          <p className="text-base text-muted-foreground mt-2 leading-relaxed">
            Deep dives on rental property analysis, real estate math, and
            underwriting best practices from the team behind TrueCap.
          </p>
        </header>

        <ul className="space-y-4">
          {BLOG_POSTS.filter((p) => p.available).map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group block bg-card border border-border rounded-2xl p-5 sm:p-6 hover:border-primary transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <BookOpen className="size-5 text-primary" />
                  <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-foreground leading-tight">
                  {post.title}
                </h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {post.excerpt}
                </p>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold mt-3">
                  {new Date(post.publishedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  · {post.readingTimeMinutes} min read
                </p>
              </Link>
            </li>
          ))}
        </ul>

        <section className="mt-10 rounded-2xl bg-primary text-primary-foreground p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-black mb-2">
            Want the calculator that powers these guides?
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-4">
            TrueCap turns every concept in these posts into a fully-functional
            analyzer — cap rate, cash flow, DSCR, projections, tax modeling.
            Free to start.
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
