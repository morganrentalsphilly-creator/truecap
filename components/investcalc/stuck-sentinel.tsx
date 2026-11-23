"use client";

/**
 * Marks its parent element with `data-stuck="true"` while that element is
 * pinned by `position: sticky`, so the parent can restyle itself with
 * `data-[stuck=true]:` utilities.
 *
 * CSS cannot ask "am I stuck?" in every browser yet. A sticky element pinned
 * at `top: offset` has its top edge exactly on that line, so an
 * IntersectionObserver whose root is inset by one pixel more than the offset
 * sees the element as not fully intersecting precisely while it is pinned;
 * the position check rules out the other way to be partly outside (still
 * below the fold).
 *
 * The flag is written straight to the DOM, not to React state, on purpose:
 * the analyzer page is one very large component and a state change here
 * would re-render all of it on every crossing.
 */

import { useEffect, useRef } from "react";

export function StuckFlag({
  /** The parent's sticky `top`, in px. */
  offset,
}: {
  offset: number;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const target = ref.current?.parentElement;
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        const stuck =
          entry.intersectionRatio < 1 &&
          entry.boundingClientRect.top <= offset + 1;
        target.setAttribute("data-stuck", stuck ? "true" : "false");
      },
      { rootMargin: `-${offset + 1}px 0px 0px 0px`, threshold: [1] },
    );
    observer.observe(target);
    return () => {
      observer.disconnect();
      target.removeAttribute("data-stuck");
    };
  }, [offset]);

  return <span ref={ref} hidden />;
}
