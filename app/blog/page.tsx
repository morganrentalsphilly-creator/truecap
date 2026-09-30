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
 *
 * Layout (DESIGN.md): the page hero with the topic tags, then one section
 * per topic on the homepage FAQ's 5/7 split (the topic on the left, its
 * posts as ruled rows on the right), the product screenshot as a document,
 * and the close on the heavy rule. Each post keeps exactly one
 * server-rendered data-blog-post-link, on its title
 * (e2e/content-hubs.spec.ts compares them with the registry).
 */

import type { Metadata } from "next";
import { findProductShot, ProductShot } from "@/components/marketing/product-shot";
import Link from "next/link";
import { ActionRow, CloseSection, PageHero } from "@/components/marketing/page-parts";
import { Section, SectionHeading } from "@/components/marketing/section";
import { buttonVariants } from "@/components/ui/button";
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
 * than its publication date. The post row and the Blog JSON-LD both read it, so
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
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        <PageHero
          title="Blog"
          lede="Deep dives on rental property analysis, real estate math, and underwriting best practices from the team behind TrueCap."
        >
          {/* Browse by topic — hubs that group the posts by investor journey
              (P2-4) and pair each with the relevant calculators. The topics
              are tags (2px radius); "All topics" is a plain link. */}
          <nav aria-label="Browse by topic" className="mt-8">
            <p className="mb-2 text-sm font-semibold text-muted-foreground">
              Browse by topic
            </p>
            <div className="flex flex-wrap gap-2">
              {BLOG_TOPICS.map((t) => (
                <Link
                  key={t.slug}
                  href={`/blog/topics/${t.slug}`}
                  className="inline-flex min-h-11 min-w-11 items-center rounded-sm border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-band"
                >
                  {t.title}
                </Link>
              ))}
              <Link
                href="/blog/topics"
                className="tc-link inline-flex min-h-11 items-center px-1 text-sm"
              >
                All topics
              </Link>
            </div>
          </nav>
        </PageHero>

        <div data-blog-directory="grouped">
          {postGroups.map((group, index) => {
            const topic = BLOG_TOPICS.find(
              (entry) => entry.slug === group.slug,
            );
            const headingId = `blog-group-${group.slug}`;

            return (
              // The hero's bottom rule opens the first topic; the section
              // rule divides the rest.
              <Section
                key={group.slug}
                rhythm="tight"
                rule={index === 0 ? "none" : "rule"}
                aria-labelledby={headingId}
              >
                {/* One zero-minimum track below 1024px and min-w-0 columns,
                    so an unbreakable token in a registry title or excerpt
                    (agent-writable) wraps instead of widening the page. */}
                <div className="grid grid-cols-[minmax(0,1fr)] gap-x-16 gap-y-6 break-words lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                  {/* From 1024px the group's heading holds its place while the
                      longer post list beside it scrolls. */}
                  <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
                    <SectionHeading id={headingId}>{group.title}</SectionHeading>
                    <p className="mt-3 max-w-[60ch] text-pretty text-lg leading-relaxed text-muted-foreground">
                      {group.description}
                    </p>
                    {topic ? (
                      <p className="mt-3">
                        <Link
                          href={`/blog/topics/${topic.slug}`}
                          className="tc-link inline-flex min-h-11 items-center text-base"
                        >
                          Topic guide
                        </Link>
                      </p>
                    ) : null}
                  </div>

                  {/* The posts as ruled rows (the homepage's ruled-row
                      recipe), not cards. The title is the row's one link;
                      its padding, pulled back by the negative margin, makes
                      a 44px target without moving the rhythm. */}
                  <ul className="min-w-0 border-t-2 border-foreground">
                    {group.posts.map((post) => (
                      <li key={post.slug} className="border-b border-rule-soft py-4">
                        <h3 className="text-balance text-lg font-semibold">
                          <Link
                            href={`/blog/${post.slug}`}
                            data-blog-post-link=""
                            className="tc-link -my-2 inline-block max-w-full py-2"
                          >
                            {post.title}
                          </Link>
                        </h3>
                        <p className="mt-1 max-w-[64ch] text-pretty text-base leading-relaxed text-muted-foreground">
                          {compactExcerpt(post.excerpt)}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {postModifiedAt(post) > post.publishedAt ? "Updated " : ""}
                          {new Date(postModifiedAt(post)).toLocaleDateString("en-US", {
                            timeZone: "UTC",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          · {post.readingTimeMinutes} min read
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </Section>
            );
          })}
        </div>

        {/* NOTE: /vs hub card removed at user request. The individual
            /vs/<competitor> pages still exist as SEO landing surfaces
            (visitors arrive direct from Google) but the hub is hidden
            from internal navigation. */}


        {/* Real product screenshot (Phase 4): the writing is about
            underwriting; this is what the underwriting looks like. Shown as
            a document (no browser frame), in the posts' column. The section
            only mounts when the shot has been captured, so a missing shot
            never leaves an empty ruled band. */}
        {findProductShot("verdict") ? (
          <Section rhythm="tight">
            <div className="grid grid-cols-[minmax(0,1fr)] gap-x-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
              <ProductShot
                shot="verdict"
                frame="document"
                sizes="(min-width: 1024px) 660px, 100vw"
                alt="TrueCap's decision view for the sample deal: the Offer Ceiling beside the asking price, cash flow after reserves, DSCR, and the best next step"
                caption={<>Real output from the free sample deal. <Link href="/analyze?sample=1" prefetch={false} className="tc-link font-medium">Run your own numbers</Link></>}
                className="lg:col-start-2"
              />
            </div>
          </Section>
        ) : null}

        <CloseSection
          heading="Want the calculator that powers these guides?"
          headingId="blog-cta-heading"
          lede={
            <>
              TrueCap turns these underwriting concepts into an editable
              preliminary screen — cap rate, cash flow, DSCR, Buy Box fit,
              and Pro pre-tax cash-flow/equity projections. Tax and exit modules
              aren&apos;t offered right now. Free to start.
            </>
          }
          actions={
            <ActionRow>
              <Link
                href="/analyze" prefetch={false}
                className={buttonVariants({ size: "cta" })}
              >
                Open TrueCap
              </Link>
            </ActionRow>
          }
        />
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
