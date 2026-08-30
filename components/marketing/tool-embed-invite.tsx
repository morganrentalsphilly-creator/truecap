/**
 * "Embed this calculator on your site" — the backlink engine's only
 * distribution surface.
 *
 * WHY THIS EXISTS
 * ---------------
 * `components/embed/embed-code-block.tsx` generates a snippet whose caption
 * anchor lives in the PARTNER'S DOM on the partner's origin — a real,
 * crawlable, dofollow link to the indexed /tools page. That is the GIPHY /
 * Typeform pattern, and it is the only mechanism this site owns that produces
 * off-domain links without anyone doing outreach.
 *
 * It was 100% coded and 0% distributed: EmbedCodeBlock rendered on /embed and
 * nowhere else, while its own docstring claimed it was "used on /embed (hub)
 * and on each /tools/[slug] page". Nobody browsing a calculator was ever told
 * they could take it. Measured 2026-08-03, the site has ZERO third-party links
 * of any kind, which is the single input Google demands that it has none of.
 *
 * PLACEMENT — deliberately quiet. CLAUDE.md product principle 4: affordances
 * appear at the moment of need, not as ambient chrome. This sits BELOW the
 * calculator and below the analyzer CTA, collapsed behind a <details>, so it
 * is invisible to the 99% here to run one number and one click away for the
 * blogger or agent who wants the widget. It must never compete with the
 * primary CTA — the day it does, it is costing more in conversion than any
 * backlink is worth.
 *
 * Renders NOTHING for a tool that is not embeddable (2 of the 21 /tools pages
 * have no widget), so it is safe to drop into every tool page unconditionally.
 */

import { getEmbedEntry } from "@/lib/embed-registry";
import { CANONICAL_HOST, getSiteUrl } from "@/lib/site-url";
import { EmbedCodeBlock } from "@/components/embed/embed-code-block";

export function ToolEmbedInvite({ slug }: { slug: string }) {
  const entry = getEmbedEntry(slug);
  if (!entry) return null;

  // An embed snippet is PERMANENT once someone pastes it into their page. We
  // cannot go and fix the origin later, and a partner is not going to re-paste
  // it. So if `getSiteUrl()` has not resolved to the canonical host, offer
  // nothing rather than hand out a snippet hard-coded to the wrong origin.
  //
  // This is not hypothetical. getSiteUrl() falls back to VERCEL_URL when
  // NEXT_PUBLIC_SITE_URL is unset, and a local production build of this very
  // page emitted `src="https://truecap-pink.vercel.app/embed/..."`. Shipping
  // that to a hundred partner sites would scatter permanent links to a
  // non-canonical host — the same class of problem as the foreign
  // truecap-iota deployment, except self-inflicted and irreversible.
  // Note this is STRICTER than isCanonicalHost(), which also accepts `www.`
  // and localhost. Those are fine for deciding whether to stamp a noindex
  // header on a live request; they are not fine here. A permanent partner link
  // to `www.usetruecap.com` would carry a redirect hop forever, and a snippet
  // built on localhost is simply broken. The exact canonical origin or nothing.
  const siteUrl = getSiteUrl();
  let host: string;
  try {
    host = new URL(siteUrl).host.toLowerCase();
  } catch {
    return null;
  }
  if (host !== CANONICAL_HOST) return null;

  return (
    <section className="mt-12 border-t border-border pt-6">
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-md text-sm font-bold text-foreground/80 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="text-muted-foreground transition-transform group-open:rotate-90"
            >
              ›
            </span>
            Embed this calculator on your site — free
          </span>
        </summary>
        <div className="mt-4">
          <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
            Paste this into any blog post, CMS or WordPress page. It resizes
            itself, needs no script tag of yours, and costs nothing. A small
            &ldquo;Calculator by TrueCap&rdquo; credit sits under it.
          </p>
          <EmbedCodeBlock
            slug={entry.slug}
            title={entry.title}
            siteUrl={siteUrl}
            defaultHeight={entry.defaultHeight}
          />
        </div>
      </details>
    </section>
  );
}
