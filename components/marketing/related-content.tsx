import Link from "next/link";
import { getRelatedContent, type RelatedKind } from "@/lib/related-content";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<string, string> = {
  tool: "Calculator",
  glossary: "Glossary",
  blog: "Guide",
  analyzer: "Analyzer",
  pricing: "Pricing",
  sample: "Sample",
};

/**
 * Tag-driven related links (docs/site-overhaul.md Phase 8.4). Server
 * component, deterministic, renders nothing when no neighbour matches.
 *
 * Set on the section rule with no box (DESIGN.md: rules and space, not
 * cards): a sentence-case label, then the links as rows at least 44px tall,
 * each with its kind as a 2px tag. It stays a <nav>: the link-graph test
 * reads the block up to its closing </nav>. `not-prose`, because the three
 * SourceFirstArticle posts render it inside their prose article.
 */
export function RelatedContent({
  kind,
  slug,
  title,
  heading = "Related",
  className = "",
}: {
  kind: RelatedKind;
  slug: string;
  title?: string;
  heading?: string;
  className?: string;
}) {
  const links = getRelatedContent({ kind, slug, title });
  if (links.length === 0) return null;
  return (
    <nav aria-label={heading} data-related-content="" className={cn("not-prose border-t border-border pt-6", className)}>
      <p className="text-lg font-semibold">{heading}</p>
      <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.href} className="min-w-0">
            <Link
              href={link.href}
              prefetch={false}
              className="group inline-flex min-h-11 items-center gap-2.5 py-1 text-base"
            >
              <span className="shrink-0 rounded-sm border border-border px-1.5 text-sm text-muted-foreground">
                {KIND_LABEL[link.kind]}
              </span>
              <span className="tc-link min-w-0 group-hover:text-primary-deep">{link.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
