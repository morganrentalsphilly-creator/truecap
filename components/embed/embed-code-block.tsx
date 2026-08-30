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
import { trackEvent } from "@/lib/analytics";
import {
  buildEmbedAttributionHref,
  embedFrameTitle,
} from "@/lib/embed-attribution";

type Props = {
  slug: string;
  title: string;
  siteUrl: string;
  defaultHeight: number;
};

export function EmbedCodeBlock({ slug, title, siteUrl, defaultHeight }: Props) {
  const [copied, setCopied] = useState(false);

  const embedSrc = `${siteUrl}/embed/${slug}`;
  const embedOrigin = new URL(siteUrl).origin;
  const embedId = `truecap-embed-${slug}`;
  // The caption anchor below the iframe is the entire SEO payoff of the
  // embed program: it lives in the PARTNER'S dom on the partner's origin,
  // so it's a real, crawlable backlink (the GIPHY/Typeform pattern). A
  // "powered by" link INSIDE the iframe would be a same-origin self-link
  // on a noindexed embed page — zero link equity. It links to the public
  // tool page (indexed), not the /embed route (noindexed).
  const toolHref = buildEmbedAttributionHref({
    siteUrl,
    toolPath: `/tools/${slug}`,
    calculatorSlug: slug,
  });
  const snippet = `<iframe
  id="${embedId}"
  src="${embedSrc}"
  loading="lazy"
  sandbox="allow-scripts allow-forms allow-same-origin allow-top-navigation-by-user-activation"
  referrerpolicy="no-referrer"
  style="width:100%; max-width:640px; border:0; height:${defaultHeight}px; display:block;"
  title="${embedFrameTitle(title)}"
></iframe>
<p style="max-width:640px; margin:6px 0 0; font:12px/1.4 system-ui, sans-serif; color:#6b7280;">
  Calculator by <a href="${toolHref}" style="color:#0070c4; text-decoration:none;">TrueCap</a> — underwrite a full property
</p>
<script>
(function(){
  var f=document.getElementById("${embedId}");
  if(!f)return;
  window.addEventListener("message",function(e){
    var d=e.data;
    if(e.origin!=="${embedOrigin}"||e.source!==f.contentWindow)return;
    if(!d||d.type!=="truecap:embed:resize"||d.slug!=="${slug}"||typeof d.height!=="number"||!Number.isFinite(d.height))return;
    f.style.height=Math.min(2400,Math.max(${defaultHeight},d.height))+"px";
  });
})();
</script>`;

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
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Embed code (HTML)
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
