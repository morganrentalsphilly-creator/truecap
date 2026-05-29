"use client";

/**
 * Copy-paste iframe embed code with a "Copy" button + live snippet
 * preview. Used on /embed (hub) and on each /tools/[slug] page's
 * "Embed this calculator" section.
 *
 * The embed snippet includes a tiny inline `<script>` that listens
 * for our `truecap:embed:resize` postMessage and auto-resizes the
 * iframe. That way the partner's page never gets nested scrollbars.
 * The script is intentionally tiny + dependency-free so it works
 * on every blog / CMS / WordPress site.
 */

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type Props = {
  slug: string;
  siteUrl: string;
  defaultHeight: number;
};

export function EmbedCodeBlock({ slug, siteUrl, defaultHeight }: Props) {
  const [copied, setCopied] = useState(false);

  const embedSrc = `${siteUrl}/embed/${slug}`;
  const snippet = `<iframe
  src="${embedSrc}"
  loading="lazy"
  style="width:100%; max-width:640px; border:0; height:${defaultHeight}px; display:block;"
  title="TrueCap calculator"
></iframe>
<script>
(function(){
  window.addEventListener("message",function(e){
    var d=e.data;
    if(!d||d.type!=="truecap:embed:resize"||d.slug!=="${slug}")return;
    var f=document.querySelector('iframe[src="${embedSrc}"]');
    if(f&&typeof d.height==="number")f.style.height=Math.max(${defaultHeight},d.height)+"px";
  });
})();
</script>`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — user can still select + copy manually */
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Embed code (HTML)
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary transition-colors"
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
      <pre className="overflow-x-auto rounded-lg bg-muted/40 p-3 text-[11px] leading-relaxed text-foreground font-mono">
        <code>{snippet}</code>
      </pre>
    </div>
  );
}
