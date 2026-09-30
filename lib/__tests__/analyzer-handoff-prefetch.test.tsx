import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const received = vi.hoisted(() => [] as Array<unknown>);
vi.mock("next/link", () => ({
  default: ({ prefetch, href, children }: { prefetch?: unknown; href: string; children?: React.ReactNode }) => {
    received.push(prefetch);
    return <a href={href}>{children}</a>;
  },
}));

import { AnalyzerHandoffLink } from "@/components/analyzer-handoff-link";

/**
 * Every analyzer handoff goes to /analyze, which is never prefetched from a
 * marketing page (its bundle stays off them). Twenty callers pass no
 * prefetch, so the default has to be false, not Next's viewport prefetch.
 */
describe("AnalyzerHandoffLink never prefetches /analyze by default", () => {
  it("hands next/link prefetch={false} when the caller passes none", () => {
    received.length = 0;
    renderToStaticMarkup(<AnalyzerHandoffLink handoffHref="/analyze?utm_source=tool">Run it</AnalyzerHandoffLink>);
    expect(received).toEqual([false]);
  });

  it("still lets a caller opt in explicitly", () => {
    received.length = 0;
    renderToStaticMarkup(
      <AnalyzerHandoffLink handoffHref="/analyze" prefetch={null}>
        Run it
      </AnalyzerHandoffLink>,
    );
    expect(received).toEqual([null]);
  });
});
