/**
 * "Part of: <Hub>" — the one link from a post back to its topic hub (F9).
 *
 * Registry-driven: the hub is the lib/blog-topics.ts topic whose postSlugs
 * lists the post (lib/seo/link-policy.ts blogTopicForPost), so filing a post
 * under a hub is the only edit it needs. Rendered by RelatedBlogPosts, the
 * block every post ends with, so all posts carry it without a per-post edit.
 * Renders nothing for a post in no hub.
 *
 * Boilerplate for dating purposes: it is the same line on every post of a
 * hub, so adding or moving it changes no post's lastmod.
 *
 * One <p> with exactly one link: the link-graph test reads the line up to
 * its </p> and expects only the hub.
 *
 * Below the fold, so the link is IntentPrefetchLink, never a plain next/link
 * (lib/__tests__/intent-prefetch-shared.test.ts); it keeps F9's
 * prefetch={false}.
 */

import { IntentPrefetchLink } from "@/components/marketing/intent-prefetch-link";
import { blogTopicForPost, isLinkablePath } from "@/lib/seo/link-policy";

export function BlogHubLink({ postSlug }: { postSlug: string }) {
  const topic = blogTopicForPost(postSlug);
  if (!topic) return null;
  const href = `/blog/topics/${topic.slug}`;
  if (!isLinkablePath(href)) return null;
  return (
    <p data-blog-hub-link="" className="mt-3 text-base text-muted-foreground">
      Part of:{" "}
      <IntentPrefetchLink href={href} prefetch={false} className="tc-link">
        {topic.title}
      </IntentPrefetchLink>
    </p>
  );
}
