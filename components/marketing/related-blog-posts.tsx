/**
 * Related blog posts footer — surfaces other posts at the end of each
 * blog article to keep engaged readers on-site instead of bouncing.
 *
 * Strategy (F9, topical): posts from the same topic hub first, in the hub's
 * order, then the rest of the registry newest first; never the current post,
 * an unpublished post or a path on the noindex list
 * (lib/seo/link-policy.ts relatedBlogPosts). Before F9 every post showed the
 * same three newest posts. The block opens with the post's "Part of: <Hub>"
 * link (BlogHubLink), so every post links back to its hub once.
 *
 * It also opens with the end-of-article "About TrueCap" author bio
 * (components/marketing/author-bio.tsx): every post renders this block
 * after its body (the SourceFirstArticle posts through that component), so
 * mounting the bio here puts it at the end of all of them in one place.
 * Posts render it inside <main>.
 *
 * The posts are a ruled list, not a card grid (DESIGN.md: cards only for
 * plans): the list opens on the 2px ink rule, each row gives the title as a
 * link, its excerpt, then its reading time, on soft rules.
 *
 * Server component — no client state needed, just data + links.
 */

import Link from "next/link";
import { AuthorBio } from "@/components/marketing/author-bio";
import { BlogHubLink } from "@/components/marketing/blog-hub-link";
import { relatedBlogPosts } from "@/lib/seo/link-policy";
import {
  LeadMagnetInline,
  LeadMagnetExitIntent,
} from "@/components/marketing/lead-magnet-capture";

type Props = {
  /** The slug of the CURRENT post — filtered out of the list. */
  currentSlug: string;
  /** Max number of related posts to show. Default 3. */
  limit?: number;
};

export function RelatedBlogPosts({ currentSlug, limit = 3 }: Props) {
  const related = relatedBlogPosts(currentSlug, { limit });

  if (related.length === 0)
    return (
      <>
        <AuthorBio />
        <BlogHubLink postSlug={currentSlug} />
      </>
    );

  return (
    <>
      <AuthorBio />
      <aside
        aria-label="Related blog posts"
        className="mt-12 border-t border-border pt-6"
      >
        <h2 className="font-display text-balance text-h3-sm sm:text-2xl">
          Keep reading
        </h2>
        <BlogHubLink postSlug={currentSlug} />
        <ul className="mt-5 border-t-2 border-foreground">
          {related.map((post) => (
            <li key={post.slug} className="border-b border-rule-soft py-4">
              <h3 className="text-lg font-semibold">
                <Link
                  href={`/blog/${post.slug}`}
                  prefetch={false}
                  className="tc-link -my-2 inline-block py-2"
                >
                  {post.title}
                </Link>
              </h3>
              <p className="mt-1 max-w-[64ch] text-pretty text-base leading-relaxed text-muted-foreground">
                {post.excerpt}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {post.readingTimeMinutes} min read
              </p>
            </li>
          ))}
        </ul>
        {/* Lead magnet + exit-intent capture (2026-08 offer rollout): this
            module renders on all 75 posts, so mounting here reaches the whole
            blog family in one edit. Client islands inside this server
            component; both self-cap via localStorage. */}
        <div className="mt-8">
          <LeadMagnetInline source="blog" />
        </div>
        <LeadMagnetExitIntent />
      </aside>
    </>
  );
}
