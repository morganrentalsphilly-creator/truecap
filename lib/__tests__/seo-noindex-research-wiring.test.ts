import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";

/**
 * End to end with a NON-empty noindex list and research registry (the
 * committed files are empty today): the sitemap, llms.txt and proxy.ts must
 * all honour content/seo/noindex.json, and the sitemap must list only
 * published research pages. The JSON modules are mocked; everything that
 * reads them is the real code.
 */

// vi.mock factories are hoisted above module-level consts; vi.hoisted shares values with them.
const { PRUNED_POST, PRUNED_TERM } = vi.hoisted(() => ({
  PRUNED_POST: "/blog/hard-money-vs-dscr-loan",
  PRUNED_TERM: "/glossary/cap-rate",
}));

vi.mock("@/content/seo/noindex.json", () => ({
  default: { paths: [PRUNED_POST, PRUNED_TERM, "/research/hidden"].sort() },
}));
vi.mock("@/content/seo/research.json", () => ({
  default: {
    pages: [
      { slug: "published", title: "Published study", status: "published", publishedAt: "2026-10-01" },
      { slug: "draft", title: "Draft study", status: "draft", publishedAt: null },
      { slug: "hidden", title: "Pruned study", status: "published", publishedAt: "2026-10-02" },
    ],
  },
}));
// The session refresh talks to Supabase; the proxy's own logic is what is under test.
vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: async (_request: NextRequest, requestHeaders: Headers) =>
    NextResponse.next({ request: { headers: requestHeaders } }),
}));

// Imported after the mocks (vi.mock is hoisted above these).
import sitemap from "@/app/sitemap";
import { GET as getLlmsTxt } from "@/app/llms.txt/route";
import { proxy } from "@/proxy";

const paths = () => sitemap().map((entry) => new URL(entry.url).pathname);

describe("noindex list and research registry wiring (D5, D6, D7)", () => {
  it("drops noindex-listed paths from the sitemap and keeps everything else", () => {
    const listed = paths();
    expect(listed).not.toContain(PRUNED_POST);
    expect(listed).not.toContain(PRUNED_TERM);
    expect(listed).toContain("/blog/how-to-calculate-dscr");
    expect(listed).toContain("/glossary/noi");
  });

  it("lists published research pages only, and never a noindex-listed one", () => {
    const research = paths().filter((path) => path.startsWith("/research/"));
    expect(research).toEqual(["/research/published"]);
  });

  it("gives a page the lastmod map lacks no <lastmod> (never a floor or the build date)", () => {
    // /research/published has no content/seo/lastmod.json entry yet: the
    // publish job adds one when it ships the page.
    const entry = sitemap().find((e) => new URL(e.url).pathname === "/research/published");
    expect(entry).toBeDefined();
    expect(entry?.lastModified).toBeUndefined();
  });

  it("drops noindex-listed paths from llms.txt", async () => {
    const text = await (await getLlmsTxt()).text();
    expect(text).not.toContain(`${PRUNED_POST})`);
    expect(text).not.toContain(`${PRUNED_TERM})`);
    expect(text).toContain("/glossary/noi)");
  });

  it("proxy.ts serves a listed path with X-Robots-Tag: noindex, exact match only", async () => {
    const at = async (path: string, host = "usetruecap.com") => {
      const request = new NextRequest(`https://${host}${path}`, { headers: { host } });
      return (await proxy(request)).headers.get("X-Robots-Tag");
    };
    expect(await at(PRUNED_POST)).toBe("noindex");
    expect(await at(PRUNED_TERM)).toBe("noindex");
    expect(await at("/blog/how-to-calculate-dscr")).toBeNull();
    expect(await at(`${PRUNED_POST}-2`)).toBeNull();
    expect(await at("/")).toBeNull();
    // The host guard's stronger header is never weakened.
    expect(await at(PRUNED_POST, "truecap-preview.vercel.app")).toBe("noindex, nofollow");
    expect(await at("/about", "truecap-preview.vercel.app")).toBe("noindex, nofollow");
  });
});
