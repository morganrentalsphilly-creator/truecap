/**
 * Related blog posts footer — surfaces other posts at the end of each
 * blog article to keep engaged readers on-site instead of bouncing.
 *
 * Strategy: filter out the current post, then pick up to 3 others
 * (most-recent first). Uses the BLOG_POSTS array from app/blog/page.tsx
 * as the single source of truth so adding new posts auto-updates the
 * related-posts surface on every existing post.
 *
 * Server component — no client state needed, just data + links.
 */

import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { BLOG_POSTS } from "@/app/blog/page";

type Props = {
  /** The slug of the CURRENT post — filtered out of the list. */
  currentSlug: string;
  /** Max number of related posts to show. Default 3. */
  limit?: number;
};

export function RelatedBlogPosts({ currentSlug, limit = 3 }: Props) {
  // Filter out the current post + any unpublished posts, then take
  // the first N. BLOG_POSTS is already ordered most-recent first so
  // we don't need to re-sort.
  const related = BLOG_POSTS.filter((p) => p.available && p.slug !== currentSlug).slice(0, limit);

  if (related.length === 0) return null;

  return (
    <aside
      aria-label="Related blog posts"
      className="mt-12 border-t border-border pt-8"
    >
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="size-4 text-primary" />
        <h2 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
          Keep reading
        </h2>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {related.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              prefetch={false}
              className="group flex h-full flex-col rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary sm:p-5"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {post.readingTimeMinutes} min read
                </span>
                <ArrowUpRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <h3 className="text-sm font-extrabold leading-snug text-foreground sm:text-base">
                {post.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {post.excerpt}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
