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
 * posts as ruled rows on the right), and the close on the heavy rule with the
 * product screenshot as a document above its action. Each post keeps exactly one
 * server-rendered data-blog-post-link, on its title
 * (e2e/content-hubs.spec.ts compares them with the registry).
 */

import type { Metadata } from "next";
import { findProductShot, ProductShot } from "@/components/marketing/product-shot";
import Link from "next/link";
// Internal links other than a first-screen primary action prefetch on hover
// or keyboard focus, not as they scroll into view; /analyze links stay
// next/link with prefetch={false} (lib/__tests__/intent-prefetch-shared.test.ts).
import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
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

/**
 * The last cut in `text` matched by `pattern` (at the match's index plus
 * `offset`) that keeps at least `minCharacters` and leaves no parenthesis
 * open, or -1.
 */
function lastCut(
  text: string,
  pattern: RegExp,
  offset: number,
  minCharacters: number,
): number {
  let cut = -1;
  for (const match of text.matchAll(pattern)) {
    const end = (match.index ?? 0) + offset;
    const kept = text.slice(0, end);
    const open = kept.split("(").length - kept.split(")").length;
    if (end >= minCharacters && open === 0) cut = end;
  }
  return cut;
}

/**
 * A registry excerpt shortened for a post row without ending on a fragment
 * ("…on top of the loan. How…"). Inside the limit it ends on the last whole
 * sentence that keeps at least `minCharacters` (no ellipsis: the row reads
 * finished); failing that, on the last clause break (", " "; " ": " " — "),
 * then on a word, each with an ellipsis. The registry copy is never edited;
 * only where it stops changes.
 */
function compactExcerpt(
  excerpt: string,
  maxCharacters = 190,
  minCharacters = 100,
): string {
  if (excerpt.length <= maxCharacters) return excerpt;
  const candidate = excerpt.slice(0, maxCharacters + 1);
  // A sentence ends where the next word starts a new one ("vs. renting" does not).
  const sentence = lastCut(candidate, /[.?!](?=\s+["“(]?[A-Z0-9$])/g, 1, minCharacters);
  if (sentence > 0) return candidate.slice(0, sentence);
  const clause = lastCut(candidate, /[,;:](?=\s)|\s[—–](?=\s)/g, 0, minCharacters);
  if (clause > 0) return `${candidate.slice(0, clause).trimEnd()}…`;
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
  const hasVerdictShot = findProductShot("verdict") !== null;
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
          lede="Deep dives on rental property analysis, real estate math, and underwriting best practices from TrueCap."
        >
          {/* Browse by topic — hubs that group the posts by investor journey
              (P2-4) and pair each with the relevant calculators. From 640px
              the topics are tags (2px radius); below it, where eight bordered
              tags wrapped into six ragged rows and filled the first screen,
              the same links are a two-column ruled list. "All topics" is a
              plain link, flush with the list. One set of links either way. */}
          <nav aria-label="Browse by topic" className="mt-8">
            <p className="mb-2 text-sm font-semibold text-muted-foreground">
              Browse by topic
            </p>
            <div className="grid grid-cols-2 gap-x-6 break-words sm:flex sm:flex-wrap sm:gap-2">
              {BLOG_TOPICS.map((t) => (
                <IntentPrefetchLink
                  key={t.slug}
                  href={`/blog/topics/${t.slug}`}
                  className="block min-h-11 min-w-11 border-b border-rule-soft py-3 text-sm text-foreground transition-colors hover:bg-band sm:inline-flex sm:items-center sm:rounded-sm sm:border sm:border-border sm:px-3 sm:py-2"
                >
                  {t.title}
                </IntentPrefetchLink>
              ))}
              <IntentPrefetchLink
                href="/blog/topics"
                className="tc-link block min-h-11 py-3 text-sm sm:inline-flex sm:items-center sm:py-2"
              >
                All topics
              </IntentPrefetchLink>
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
                        <IntentPrefetchLink
                          href={`/blog/topics/${topic.slug}`}
                          className="tc-link inline-flex min-h-11 items-center text-base"
                        >
                          Topic guide
                        </IntentPrefetchLink>
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
                        {/* A row term (RuledList's dt): text-pretty fills the
                            column, where text-balance split titles into two
                            half-width lines. */}
                        <h3 className="text-pretty text-lg font-semibold">
                          <IntentPrefetchLink
                            href={`/blog/${post.slug}`}
                            data-blog-post-link=""
                            className="tc-link -my-2 inline-block max-w-full py-2"
                          >
                            {post.title}
                          </IntentPrefetchLink>
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
            <>
              {/* Real product screenshot (Phase 4): the writing is about
                  underwriting; this is what the underwriting looks like. Set
                  as a document (no browser frame) above the action, so the
                  close carries the case on the left and the evidence and the
                  action on the right. The desktop capture at every width: the
                  phone capture is 358 x 1339 CSS px, over a phone and a half
                  of screenshot between this case and its button. The caption
                  link takes a 44px target from padding its negative margin
                  takes back out of the line box. Renders nothing until the
                  shot is captured. */}
              {hasVerdictShot ? (
                <ProductShot
                  shot="verdict"
                  frame="document"
                  sizes="(min-width: 1024px) 660px, 100vw"
                  alt="TrueCap's decision view for the sample deal: the Offer Ceiling beside the asking price, cash flow after reserves, DSCR, and the best next step"
                  caption={
                    <>
                      Real output from the free sample deal.{" "}
                      <Link
                        href="/analyze?sample=1"
                        prefetch={false}
                        className="tc-link -my-3 inline-block py-3"
                      >
                        Run your own numbers
                      </Link>
                    </>
                  }
                />
              ) : null}
              <ActionRow className={hasVerdictShot ? "mt-6" : undefined}>
                <Link
                  href="/analyze" prefetch={false}
                  className={buttonVariants({ size: "cta" })}
                >
                  Open TrueCap
                </Link>
              </ActionRow>
            </>
          }
        />
      </main>
      <SiteFooter />
      <ScrollDepthTracker />
    </div>
  );
}
