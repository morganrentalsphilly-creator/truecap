import Link from "next/link";
import { getRelatedContent, type RelatedKind } from "@/lib/related-content";

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
    <nav aria-label={heading} data-related-content="" className={`rounded-2xl border border-border bg-card p-5 ${className}`.trim()}>
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{heading}</p>
      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              prefetch={false}
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-foreground underline decoration-border underline-offset-4 hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {KIND_LABEL[link.kind]}
              </span>
              <span>{link.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
