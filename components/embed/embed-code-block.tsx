"use client";

/**
 * Copy-paste iframe embed code with a "Copy" button + live snippet
 * preview. Used on /embed (hub) and on each /tools/[slug] page's
 * "Embed this calculator" section.
 *
 * The embed snippet (built by lib/embed-snippet.ts) is the iframe, a small
 * "Powered by TrueCap" credit line, and a tiny inline `<script>` that listens
 * for our `truecap:embed:resize` postMessage and auto-resizes the
 * iframe. That way the partner's page never gets nested scrollbars.
 * The script is intentionally tiny + dependency-free so it works
 * on every blog / CMS / WordPress site.
 */

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { buildEmbedSnippet } from "@/lib/embed-snippet";

type Props = {
  slug: string;
  title: string;
  siteUrl: string;
  defaultHeight: number;
};

export function EmbedCodeBlock({ slug, title, siteUrl, defaultHeight }: Props) {
  const [copied, setCopied] = useState(false);

  // The "Powered by TrueCap" line under the iframe is the SEO payoff of the
  // embed program: it lives in the PARTNER'S dom on the partner's origin, so
  // it's a real, crawlable backlink (the GIPHY/Typeform pattern). The same
  // credit inside the iframe sits on a noindexed embed page and passes
  // nothing. It links to the public tool page (indexed), not the /embed
  // route (noindexed). The exact text is built in lib/embed-snippet.ts; the
  // copy button copies the very string rendered below.
  const snippet = buildEmbedSnippet({ slug, title, siteUrl, defaultHeight });

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(snippet);
      trackEvent("embed_code_copied", { calculator_slug: slug });
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — user can still select + copy manually */
    }
  }

  // A printed object, not a card: the label and the Copy control on one row,
  // then the code printed on the paper between two rules. It draws no box of
  // its own, so the /embed hub entry and the /tools invite frame it with their
  // own rules. No band fill: the band is the site's text-selection color, and
  // this is the one block people select by hand when the clipboard is blocked.
  // The pre is a named region (aria-label is not allowed on a pre's generic
  // role) so a keyboard user can focus and scroll it. The status line tells a
  // screen reader the copy worked. The code element carries no attributes:
  // the embed tests read the snippet straight out of the rendered markup.
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-sm font-semibold text-foreground">
          Embed code (HTML)
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className={buttonVariants({ variant: "outline", size: "cta" })}
        >
          {copied ? (
            <>
              <Check />
              Copied
            </>
          ) : (
            <>
              <Copy />
              Copy
            </>
          )}
        </button>
        <span role="status" aria-live="polite" className="sr-only">
          {copied ? "Copied" : ""}
        </span>
      </div>
      <pre
        role="region"
        tabIndex={0}
        aria-label="Embed code"
        className="mt-3 overflow-x-auto border-y border-border py-3 font-mono text-sm leading-relaxed text-foreground"
      >
        <code>{snippet}</code>
      </pre>
    </div>
  );
}
