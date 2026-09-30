/**
 * End-of-article "Sources" list: every primary source a post cites inline,
 * listed once at the end of the article (F3 founder rule: "Every number on a
 * page links to a primary source or comes from TrueCap's own calculator").
 *
 * Where it goes: after the article body and its FAQ, above the author bio.
 *   · standalone posts: right after </article>, before <RelatedContent /> /
 *     <RelatedBlogPosts /> (RelatedBlogPosts opens with the AuthorBio);
 *   · SourceFirstArticle posts: pass the same list as its `sources` prop.
 *
 *   <PostSources
 *     sources={[
 *       {
 *         title: "IRS Publication 527 (2025), Residential Rental Property",
 *         url: "https://www.irs.gov/publications/p527",
 *       },
 *     ]}
 *   />
 *
 * Rules for the list (seo/scripts/verify-static.ts checks the URLs):
 *   · `url` is one plain https:// string literal on a primary-source domain
 *     (seo/config.json primarySourceDomains), the exact page the body links;
 *   · `title` names the source (publisher, document, edition), never "here";
 *   · order of first use in the body; a URL listed twice renders once.
 *
 * Renders nothing for an empty list. Plain server component: links open in
 * the same tab, like the inline links they repeat.
 *
 * Set in FRED's grammar (DESIGN.md "Source table"): the section rule, the
 * heading in the display voice at the H3 step (its id stays the h2's first
 * attribute), then numbered rows on soft rules, each the source's title as
 * the link and its host in Ink 2. The numbers are the list's own markers, so
 * the text the SEO loop measures is unchanged.
 */

import { cn } from "@/lib/utils";

export type PostSource = {
  /** What the source is: "IRS Publication 946 (2025), How To Depreciate Property". */
  title: string;
  /** The exact primary-source page, as linked in the body. */
  url: string;
};

// Inline, so a long title wraps with its host after it. Vertical padding on
// an inline link grows its hit box without moving the text: at 16px Archivo
// the content box is 17.5px, so 14px each side gives a 45.5px target (44px
// floor), measured in Chrome, and it stays inside the row's 10px padding.
const LINK_CLASS = "tc-link py-3.5";

/** "https://www.irs.gov/publications/p527" → "irs.gov" (shown beside the title). */
function publisherHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function PostSources({
  sources,
  className = "",
}: {
  sources: readonly PostSource[];
  className?: string;
}) {
  const seen = new Set<string>();
  const unique = sources.filter((source) => {
    if (seen.has(source.url)) return false;
    seen.add(source.url);
    return true;
  });
  if (unique.length === 0) return null;

  return (
    <section
      aria-labelledby="post-sources-heading"
      data-post-sources=""
      className={cn("not-prose mt-10 border-t border-border pt-6", className)}
    >
      <h2
        id="post-sources-heading"
        className="font-display text-balance text-h3-sm sm:text-2xl"
      >
        Sources
      </h2>
      {/* The numbers hang left of the rows; each row's rule starts at its text. */}
      <ol className="mt-4 list-decimal pl-6 text-base leading-relaxed text-foreground marker:text-muted-foreground">
        {unique.map((source) => {
          const host = publisherHost(source.url);
          return (
            <li key={source.url} className="border-b border-rule-soft py-2.5 pl-1 first:border-t">
              <a href={source.url} className={LINK_CLASS}>
                {source.title}
              </a>
              {host ? (
                <span className="text-muted-foreground"> · {host}</span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
