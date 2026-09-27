/**
 * The copy-paste embed snippet, as a pure string builder.
 *
 * Whatever this returns is PERMANENT once a partner pastes it: nobody goes
 * back to re-copy. So every change here only reaches future pastes, and the
 * parts an older paste depends on have to keep working on our side: the
 * `/embed/<slug>` iframe src and the `truecap:embed:resize` message
 * (components/embed/embed-resize-reporter.tsx). Snippets copied before
 * 2026-09-27 carry a "Calculator by TrueCap" caption and a sandbox without
 * allow-popups; they still load and resize.
 *
 * Rendered and copied by components/embed/embed-code-block.tsx (the /embed hub
 * and the "Embed this calculator" block on each /tools page).
 */

import {
  buildEmbedPoweredByHref,
  embedFrameTitle,
} from "@/lib/embed-attribution";

/** `allow-popups` + `allow-popups-to-escape-sandbox` let the in-iframe
 * "Powered by TrueCap" link (target=_blank) open the tool page in a new,
 * unsandboxed tab. Without them the browser silently drops the click, and a
 * sandboxed tab would block the analyzer's own downloads. */
export const EMBED_IFRAME_SANDBOX =
  "allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation";

/** The credit line that sits under the iframe in the partner's own DOM: a
 * crawlable brand-anchor link to the calculator's public tool page. Plain
 * `<a>` with no rel, so the partner decides how their page treats it. */
export function buildEmbedPoweredByLine(slug: string): string {
  return `Powered by <a href="${buildEmbedPoweredByHref(slug)}">TrueCap</a>`;
}

export function buildEmbedSnippet({
  slug,
  title,
  siteUrl,
  defaultHeight,
}: {
  slug: string;
  title: string;
  siteUrl: string;
  defaultHeight: number;
}): string {
  const embedSrc = `${siteUrl}/embed/${slug}`;
  const embedOrigin = new URL(siteUrl).origin;
  const embedId = `truecap-embed-${slug}`;
  return `<iframe
  id="${embedId}"
  src="${embedSrc}"
  loading="lazy"
  sandbox="${EMBED_IFRAME_SANDBOX}"
  referrerpolicy="no-referrer"
  style="width:100%; max-width:640px; border:0; height:${defaultHeight}px; display:block;"
  title="${embedFrameTitle(title)}"
></iframe>
<p style="max-width:640px; margin:6px 0 0; font:12px/1.4 system-ui, sans-serif; color:#6b7280;">${buildEmbedPoweredByLine(slug)}</p>
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
}
