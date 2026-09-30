"use client";

/**
 * The "Powered by TrueCap" brand link in the embed iframe's footer. It opens
 * the calculator's public tool page in a new tab, so the partner's page stays
 * where it is.
 *
 * Snippets copied from 2026-08-30 until this credit shipped sandbox the
 * iframe WITHOUT allow-popups. There the browser silently drops a
 * target=_blank click (window.open returns null), which would leave a dead
 * link on those embeds.
 * Those snippets do allow top navigation on a user click, so the fallback
 * opens the tool page in the top window instead of doing nothing. Snippets
 * copied before 2026-08-30 have no sandbox, and current snippets
 * (lib/embed-snippet.ts) allow popups, so the new tab opens.
 * lib/__tests__/embed-powered-by-click.test.ts pins the fallback.
 */

import type { MouseEvent } from "react";
import { buildEmbedPoweredByHref } from "@/lib/embed-attribution";

export function EmbedPoweredByLink({ slug }: { slug: string }) {
  const href = buildEmbedPoweredByHref(slug);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    // Modified clicks (new tab, new window, download) stay native.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    const opened = window.open(href, "_blank");
    if (opened) {
      // The same guarantee rel="noopener" gives the plain link.
      opened.opener = null;
      return;
    }
    window.open(href, "_top");
  }

  // A plain link line (DESIGN.md chrome rules): Signal Blue, underlined at
  // rest, 44px tall for the target, no pill and no logo. Focus is the global
  // 3px outline in app/globals.css. The <a> stays the root element, with no
  // hooks, so embed-powered-by-click.test.ts can read its props directly.
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      onClick={handleClick}
      className="tc-link inline-flex min-h-11 items-center"
    >
      Powered by TrueCap
    </a>
  );
}
