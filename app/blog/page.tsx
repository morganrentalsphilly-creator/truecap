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
 * The post list lives in lib/blog-posts.ts (a pure data module every
 * blog surface shares); this file is only the index page's template.
 */

import type { Metadata } from "next";
import { ProductShot } from "@/components/marketing/product-shot";
import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { ScrollDepthTracker } from "@/components/marketing/scroll-depth-tracker";
import { SiteFooter } from "@/components/marketing/site-footer";
import { getSiteUrl } from "@/lib/site-url";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { lastmodOrPublished } from "@/lib/seo/lastmod";
import { BLOG_TOPICS } from "@/lib/blog-topics";
import { groupBlogPostsByTopic } from "@/lib/content-hub-groups";
import { linkablePosts } from "@/lib/seo/link-policy";
import { Header } from "@/components/investcalc/header";
import { JsonLd } from "@/components/seo/json-ld";
import { BreadcrumbSchema } from "@/components/marketing/breadcrumb-schema";

export const metadata: Metadata = {
  title: "Rental Property Investing Blog",
  description:
    "Practical guides to rental property analysis, financing, cash flow, taxes, and underwriting, with formulas, worked examples, and editable assumptions.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Rental Property Investing Blog | TrueCap",
    description:
      "Practical guides to rental property analysis, financing, cash flow, taxes, and underwriting, with formulas, worked examples, and editable assumptions.",
    url: "/blog",
    type: "website",
    images: [
      { url: "/home.jpg", width: 1200, height: 630, alt: "TrueCap blog" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rental Property Investing Blog | TrueCap",
    description:
      "Practical guides to rental property analysis, financing, cash flow, taxes, and underwriting, with formulas, worked examples, and editable assumptions.",
    images: ["/home.jpg"],
  },
};

function compactExcerpt(excerpt: string, maxCharacters = 190): string {
  if (excerpt.length <= maxCharacters) return excerpt;
  const candidate = excerpt.slice(0, maxCharacters + 1);
  const lastWordBoundary = candidate.lastIndexOf(" ");
  return `${candidate.slice(0, lastWordBoundary > 0 ? lastWordBoundary : maxCharacters).trimEnd()}…`;
}

/**
 * A post's last significant change (content/seo/lastmod.json), never earlier
 * than its publication date. The card and the Blog JSON-LD both read it, so
 * the visible "Updated" line and dateModified always agree with the sitemap.
 */
function postModifiedAt(post: { slug: string; publishedAt: string }): string {
  return lastmodOrPublished(`/blog/${post.slug}`, post.publishedAt);
}

export default function BlogIndexPage() {
  const siteUrl = getSiteUrl();
  // Published posts a block may link: a noindexed post drops out (lib/seo/link-policy.ts).
  const availablePosts = linkablePosts(BLOG_POSTS);
  const postGroups = groupBlogPostsByTopic(availablePosts, BLOG_TOPICS);
  const blogLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${siteUrl}/blog#blog`,
    name: "TrueCap Blog",
    url: `${siteUrl}/blog`,
    publisher: { "@id": `${siteUrl}/#organization` },
    blogPost: availablePosts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `${siteUrl}/blog/${p.slug}`,
      datePublished: p.publishedAt,
      dateModified: postModifiedAt(p),
      // Every post's author and publisher is the Organization (F1), by @id.
      author: { "@id": `${siteUrl}/#organization` },
      publisher: { "@id": `${siteUrl}/#organization` },
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <Header initialUser={null} initialEntitlements={null} />
      <JsonLd data={blogLd} />
      <BreadcrumbSchema items={[{ name: "Blog", path: "/blog" }]} />
      <main id="main" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 leading-tight">
            Blog
          </h1>
          <p className="text-base text-muted-foreground mt-2 leading-relaxed">
            Deep dives on rental property analysis, real estate math, and
            underwriting best practices from the team behind TrueCap.
          </p>
        </header>


        {/* Browse by topic — hubs that group the posts by investor journey
            (P2-4) and pair each with the relevant calculators. */}
        <nav aria-label="Browse by topic" className="mb-8">
          <p className="mb-2 text-2xs font-bold uppercase tracking-widest text-muted-foreground">
            Browse by topic
          </p>
          <div className="flex flex-wrap gap-2">
            {BLOG_TOPICS.map((t) => (
              <Link
                key={t.slug}
                href={`/blog/topics/${t.slug}`}
                className="inline-flex min-h-11 min-w-11 items-center rounded-full border border-border bg-card px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {t.title}
              </Link>
            ))}
            <Link
              href="/blog/topics"
              className="inline-flex min-h-11 min-w-11 items-center rounded-full px-3 text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              All topics →
            </Link>
          </div>
        </nav>

        <div className="space-y-12" data-blog-directory="grouped">
          {postGroups.map((group) => {
            const topic = BLOG_TOPICS.find(
              (entry) => entry.slug === group.slug,
            );
            const headingId = `blog-group-${group.slug}`;

            return (
              <section key={group.slug} aria-labelledby={headingId}>
                <div className="mb-4 border-b border-border pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2
                      id={headingId}
                      className="text-xl font-extrabold text-foreground sm:text-2xl"
                    >
                      {group.title}
                    </h2>
                    {topic ? (
                      <Link
                        href={`/blog/topics/${topic.slug}`}
                        className="inline-flex min-h-11 min-w-11 items-center rounded-md px-1 text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        Topic guide →
                      </Link>
                    ) : null}
                  </div>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    {group.description}
                  </p>
                </div>

                <ul className="grid gap-3 sm:grid-cols-2">
                  {group.posts.map((post) => (
                    <li key={post.slug}>
                      <Link
                        href={`/blog/${post.slug}`}
                        data-blog-post-link=""
                        className="group flex h-full min-h-11 flex-col rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <BookOpen
                            className="size-4 text-primary"
                            aria-hidden="true"
                          />
                          <ArrowUpRight
                            className="size-4 text-muted-foreground transition-colors group-hover:text-primary"
                            aria-hidden="true"
                          />
                        </div>
                        <h3 className="text-base font-extrabold leading-snug text-foreground sm:text-lg">
                          {post.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {compactExcerpt(post.excerpt)}
                        </p>
                        <p className="mt-auto pt-3 text-2xs font-bold uppercase tracking-widest text-muted-foreground">
                          {postModifiedAt(post) > post.publishedAt ? "Updated " : ""}
                          {new Date(postModifiedAt(post)).toLocaleDateString("en-US", {
                            timeZone: "UTC",
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
              </section>
            );
          })}
        </div>

        {/* NOTE: /vs hub card removed at user request. The individual
            /vs/<competitor> pages still exist as SEO landing surfaces
            (visitors arrive direct from Google) but the hub is hidden
            from internal navigation. */}


        {/* Real product screenshot (Phase 4): the writing is about
            underwriting; this is what the underwriting looks like. */}
        <ProductShot
          shot="verdict"
          alt="TrueCap's decision view for the sample deal: the Offer Ceiling beside the asking price, cash flow after reserves, DSCR, and the best next step"
          caption={<>Real output from the free sample deal. <Link href="/analyze?sample=1" prefetch={false} className="font-semibold text-primary underline underline-offset-4">Run your own numbers →</Link></>}
          className="mt-10"
        />

        <section className="mt-10 rounded-2xl bg-primary text-primary-foreground p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold mb-2">
            Want the calculator that powers these guides?
          </h2>
          <p className="text-sm sm:text-base opacity-90 mb-4">
            TrueCap turns these underwriting concepts into an editable
            preliminary screen — cap rate, cash flow, DSCR, Buy Box fit,
            and Pro pre-tax cash-flow/equity projections. Tax and exit modules
            aren&apos;t offered right now. Free to start.
          </p>
          <Link
            href="/analyze" prefetch={false}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary-foreground px-4 font-bold text-primary transition-opacity hover:opacity-90"
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
