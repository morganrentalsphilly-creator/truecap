import { stageAnalyzerHandoffHref } from "@/lib/analyzer-handoff";

export type AnalyzerHandoffClick = {
  button: number;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  defaultPrevented: boolean;
};

type HandoffWindow = Pick<Window, "location" | "sessionStorage" | "top">;

export function isUnmodifiedPrimaryHandoffClick(
  click: AnalyzerHandoffClick,
): boolean {
  return (
    click.button === 0 &&
    !click.altKey &&
    !click.ctrlKey &&
    !click.metaKey &&
    !click.shiftKey &&
    !click.defaultPrevented
  );
}

/**
 * Stage exact values only when the navigation stays in an accessible browsing
 * context. New-tab/named-target clicks and cross-origin `_top` frames retain
 * the clean destination but deliberately lose exact prefill.
 */
export function stageAnalyzerHandoffForClick(
  href: string,
  target: string | undefined,
  click: AnalyzerHandoffClick,
  currentWindow: HandoffWindow = window,
): boolean {
  if (!isUnmodifiedPrimaryHandoffClick(click)) return false;

  const normalizedTarget = target?.toLowerCase() ?? "";
  if (
    normalizedTarget &&
    normalizedTarget !== "_self" &&
    normalizedTarget !== "_top"
  ) {
    return false;
  }

  try {
    if (normalizedTarget === "_top") {
      const topWindow = currentWindow.top;
      if (
        !topWindow ||
        topWindow.location.origin !== currentWindow.location.origin
      ) {
        return false;
      }
      return stageAnalyzerHandoffHref(href, topWindow.sessionStorage);
    }
    return stageAnalyzerHandoffHref(href, currentWindow.sessionStorage);
  } catch {
    // Cross-origin/sandboxed frames and disabled storage navigate cleanly.
    return false;
  }
}
