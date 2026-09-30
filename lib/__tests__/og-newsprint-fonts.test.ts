import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The OG cards must never fail a build over fonts: a card prerendered at
 * build time with `fonts: []` makes next/og throw "No fonts are loaded"
 * (it reads `options.fonts || defaultFonts`, and [] is truthy). That broke
 * the PR #154 CI and Vercel builds when Google Fonts didn't answer.
 */
describe("loadNewsprintFonts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("returns undefined, not an empty list, when no face loads", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const { loadNewsprintFonts } = await import("@/lib/og/newsprint");
    await expect(loadNewsprintFonts({ display: "A", text: "B", mono: "1" })).resolves.toBeUndefined();
  });

  it("fetches each face once per process and picks the Basic Latin subset", async () => {
    const css = [
      "@font-face { font-family: 'Archivo'; src: url(https://x/vietnamese.ttf) format('truetype'); unicode-range: U+0102-0103, U+1EA0-1EF9; }",
      "@font-face { font-family: 'Archivo'; src: url(https://x/latin.ttf) format('truetype'); unicode-range: U+0000-00FF, U+0131; }",
    ].join("\n");
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      calls.push(url);
      if (url.startsWith("https://fonts.googleapis.com")) return new Response(css);
      return new Response(new Uint8Array([1, 2, 3]));
    }));
    const { loadNewsprintFonts } = await import("@/lib/og/newsprint");
    const first = await loadNewsprintFonts({ display: "A", text: "B", mono: "1" });
    await loadNewsprintFonts({ display: "C", text: "D", mono: "2" });
    expect(first?.map((f) => f.name)).toEqual(["Archivo Display", "Archivo", "DM Mono"]);
    expect(calls.filter((u) => u.includes("vietnamese"))).toHaveLength(0);
    // Three faces, two requests each (CSS + file), once for both cards.
    expect(calls).toHaveLength(6);
  });
});

describe("a card renders with Google Fonts unreachable", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("the blog template still produces a PNG in next/og's built-in face", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const { renderBlogOgImage } = await import("@/lib/og/blog-og-template");
    const response = await renderBlogOgImage({ section: "Metrics", tag: "1% rule", title: "The 1% rule for rental property", subline: "What it screens and where it misleads" });
    const bytes = new Uint8Array(await response.arrayBuffer());
    // PNG signature
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
  }, 60_000);
});
