/**
 * "Embed this calculator on your site" — the backlink engine's only
 * distribution surface.
 *
 * WHY THIS EXISTS
 * ---------------
 * `lib/embed-snippet.ts` builds a snippet whose "Powered by TrueCap" credit
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
 * Renders NOTHING for a tool that is not embeddable (no EMBED_REGISTRY entry,
 * e.g. the rehab estimator and the spreadsheet), so it is safe to drop into
 * every tool page unconditionally.
 */

import { getEmbedEntry } from "@/lib/embed-registry";
import { CANONICAL_HOST, getSiteUrl } from "@/lib/site-url";
import { EmbedCodeBlock } from "@/components/embed/embed-code-block";
import { DisclosureMark } from "@/components/ledger/ledger-parts";

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

  // One ruled disclosure row, the FAQ's grammar (DESIGN.md "FAQ"): a rule
  // above and below, the label in the text face at 600, the SVG plus/minus
  // on the right, no card. It sits inside the tool page's own column, so it
  // brings no page container or section padding of its own. Focus is the
  // global 3px outline in app/globals.css (summary is in its selector); a
  // local ring would draw a second indicator inside it.
  return (
    <section className="mt-12 border-y border-border">
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-4 py-3 text-base font-semibold text-foreground [&::-webkit-details-marker]:hidden">
          <span>Embed this calculator on your site — free</span>
          <DisclosureMark className="mt-1" />
        </summary>
        <div className="pb-6 pt-1">
          <p className="max-w-[64ch] text-pretty text-base leading-relaxed text-muted-foreground">
            Paste this into a blog post, CMS or WordPress page that allows
            embedded HTML. It resizes itself, needs no script tag of yours, and
            costs nothing. A small &ldquo;Powered by TrueCap&rdquo; credit sits
            under it.
          </p>
          <div className="mt-5">
            <EmbedCodeBlock
              slug={entry.slug}
              title={entry.title}
              siteUrl={siteUrl}
              defaultHeight={entry.defaultHeight}
            />
          </div>
        </div>
      </details>
    </section>
  );
}
