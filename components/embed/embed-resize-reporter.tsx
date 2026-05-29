"use client";

/**
 * Inside an embed iframe, this component:
 *   1. Watches the document's content height via ResizeObserver.
 *   2. Sends the height to the parent window via postMessage on every change.
 *
 * The partner site's embed snippet listens for these messages and
 * resizes the iframe so the host page never gets nested scrollbars.
 *
 * Message envelope (matches what the embed snippet expects):
 *   { type: "truecap:embed:resize", height: <number>, slug: <string> }
 *
 * Why ResizeObserver instead of polling: zero-cost when nothing
 * changes (single subscription, browser-driven callback). Polling
 * burned CPU + battery on mobile.
 *
 * Security: postMessage is sent with origin "*" intentionally — the
 * embed must work on ANY partner domain, and a height integer carries
 * no sensitive data. The partner-side snippet validates the message
 * envelope shape before acting.
 */

import { useEffect, useRef } from "react";

type Props = { slug: string };

export function EmbedResizeReporter({ slug }: Props) {
  const lastSent = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.parent === window) return; // not in an iframe

    const send = (height: number) => {
      // De-dupe to within 2px — avoids floods on micro-layout shifts.
      if (Math.abs(height - lastSent.current) < 2) return;
      lastSent.current = height;
      window.parent.postMessage(
        { type: "truecap:embed:resize", height, slug },
        "*"
      );
    };

    // Fire once on mount with the current document height so the
    // parent can size the iframe before the user interacts.
    send(document.documentElement.scrollHeight);

    const observer = new ResizeObserver(() => {
      send(document.documentElement.scrollHeight);
    });
    observer.observe(document.documentElement);

    return () => observer.disconnect();
  }, [slug]);

  return null;
}
