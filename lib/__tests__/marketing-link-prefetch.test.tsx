import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * Footer and below-the-fold marketing links prefetch on intent, not on scroll.
 *
 * A default next/link prefetches its route as soon as it enters the viewport.
 * On 2026-09-30 a 390px visitor scrolling the homepage downloaded 36 route
 * chunks (370 KB gzipped) and 45 RSC payloads (266 KB) that way, almost all
 * of them from the footer. These links now go through
 * IntentPrefetchLink, which prefetches on hover or keyboard focus only.
 */

const rendered = vi.hoisted(() => [] as Array<{ href: string; prefetch?: false }>);

vi.mock("@/components/marketing/intent-prefetch-link", async (importActual) => ({
  ...(await importActual<typeof import("@/components/marketing/intent-prefetch-link")>()),
  IntentPrefetchLink: ({
    href,
    prefetch,
    children,
  }: {
    href: string;
    prefetch?: false;
    children?: ReactNode;
  }) => {
    rendered.push({ href, prefetch });
    return <a href={href}>{children}</a>;
  },
}));

import { intentPrefetchValue } from "@/components/marketing/intent-prefetch-link";
import { SiteFooter } from "@/components/marketing/site-footer";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("marketing link prefetch", () => {
  it("keeps prefetch off until hover or focus, then hands it back to Next", () => {
    expect(intentPrefetchValue(undefined, false)).toBe(false);
    // null is next/link's default ("auto"), not true (which would force a
    // full dynamic prefetch).
    expect(intentPrefetchValue(undefined, true)).toBeNull();
    // An explicit opt-out survives intent.
    expect(intentPrefetchValue(false, false)).toBe(false);
    expect(intentPrefetchValue(false, true)).toBe(false);
  });

  it("uses no default-prefetch <Link> in the footer, its disclaimer or the landing sections", () => {
    for (const path of [
      "components/marketing/site-footer.tsx",
      "components/marketing/landing-sections.tsx",
      "components/marketing/disclaimer.tsx",
    ]) {
      const source = read(path);
      expect(source, `${path}: use IntentPrefetchLink, not next/link`).not.toMatch(
        /from ["']next\/link["']/,
      );
      expect(source, path).not.toMatch(/<Link\b/);
      expect(source, path).toContain("<IntentPrefetchLink");
    }
  });

  it("renders every footer link through IntentPrefetchLink and never prefetches /analyze", () => {
    rendered.length = 0;
    const html = renderToStaticMarkup(<SiteFooter />);
    const internalHrefs = [...html.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]);
    expect(rendered.length).toBeGreaterThan(20);
    expect(rendered.map((link) => link.href).sort()).toEqual(internalHrefs.sort());

    // The footer's hrefs come from a data array, which the literal
    // href="/analyze" scan in analyzer-link-destinations.test.ts cannot see.
    const analyzer = rendered.filter((link) => /^\/analyze(?:[?#]|$)/.test(link.href));
    expect(analyzer.length).toBeGreaterThan(0);
    for (const link of analyzer) expect(link.prefetch, link.href).toBe(false);
    for (const link of rendered.filter((l) => !analyzer.includes(l))) {
      expect(link.prefetch, link.href).toBeUndefined();
    }
  });
});
