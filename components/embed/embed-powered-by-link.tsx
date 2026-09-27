"use client";

/**
 * The "Powered by TrueCap" brand link in the embed iframe's footer. It opens
 * the calculator's public tool page in a new tab, so the partner's page stays
 * where it is.
 *
 * Snippets copied before 2026-09-27 sandbox the iframe WITHOUT allow-popups.
 * There the browser silently drops a target=_blank click (window.open returns
 * null), which would leave a dead link on every older embed. Those snippets
 * do allow top navigation on a user click, so the fallback opens the tool page
 * in the top window instead of doing nothing. Current snippets
 * (lib/embed-snippet.ts) allow popups, so the new tab opens.
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

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      onClick={handleClick}
      className="inline-flex min-h-11 items-center gap-1 rounded-md hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      Powered by <span className="font-semibold text-foreground">TrueCap</span>
    </a>
  );
}
