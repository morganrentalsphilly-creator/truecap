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
 */

export type PostSource = {
  /** What the source is: "IRS Publication 946 (2025), How To Depreciate Property". */
  title: string;
  /** The exact primary-source page, as linked in the body. */
  url: string;
};

const LINK_CLASS =
  "rounded-sm py-1 font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

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
      className={`not-prose mt-10 border-t border-border pt-6 ${className}`.trim()}
    >
      <h2
        id="post-sources-heading"
        className="text-2xs font-bold uppercase tracking-widest text-muted-foreground"
      >
        Sources
      </h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground marker:text-muted-foreground">
        {unique.map((source) => {
          const host = publisherHost(source.url);
          return (
            <li key={source.url}>
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
