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

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">
          Embed code (HTML)
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre tabIndex={0} aria-label="Embed code" className="overflow-x-auto rounded-lg bg-muted/40 p-3 text-2xs leading-relaxed text-foreground font-mono focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
        <code>{snippet}</code>
      </pre>
    </div>
  );
}
