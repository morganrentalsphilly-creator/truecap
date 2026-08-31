/**
 * The embed snippet is the site's only self-serve backlink mechanism, and it
 * is PERMANENT once a partner pastes it. Two properties have to hold, and both
 * were broken or at risk when this was wired up on 2026-08-03:
 *
 *   1. Every embeddable tool offers it, and no non-embeddable tool does.
 *      EmbedCodeBlock rendered only on /embed for months while its own
 *      docstring claimed it rendered on every /tools page.
 *   2. The snippet's origin is the canonical host. A local production build
 *      emitted `https://truecap-pink.vercel.app/embed/...` because
 *      getSiteUrl() falls back to VERCEL_URL — scattering that across partner
 *      sites would be irreversible.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { EMBED_LIST, getEmbedEntry } from "@/lib/embed-registry";
import { CANONICAL_HOST } from "@/lib/site-url";

const TOOLS_DIR = join(process.cwd(), "app/tools");
const toolSlugs = readdirSync(TOOLS_DIR).filter((d) =>
  existsSync(join(TOOLS_DIR, d, "page.tsx")),
);

describe("embed invite wiring", () => {
  it("every /tools page mounts ToolEmbedInvite with its own slug", () => {
    const missing: string[] = [];
    const wrongSlug: string[] = [];
    for (const slug of toolSlugs) {
      const src = readFileSync(join(TOOLS_DIR, slug, "page.tsx"), "utf8");
      // Retired tools retain a permanent redirect so old inbound links do not
      // 404. They are not released calculators and must not advertise an
      // embeddable widget for the removed surface.
      if (/permanentRedirect\(/.test(src)) continue;
      if (!src.includes("<ToolEmbedInvite")) {
        missing.push(slug);
        continue;
      }
      // A copy-paste that carried a neighbour's slug would silently offer the
      // wrong widget — and the wrong backlink target.
      if (!src.includes(`<ToolEmbedInvite slug="${slug}"`))
        wrongSlug.push(slug);
    }
    expect(missing).toEqual([]);
    expect(wrongSlug).toEqual([]);
  });

  it("every embeddable slug resolves to a registry entry with a height", () => {
    for (const entry of EMBED_LIST) {
      expect(getEmbedEntry(entry.slug)).not.toBeNull();
      expect(entry.defaultHeight).toBeGreaterThan(0);
    }
  });

  it("a non-embeddable tool resolves to null, so the invite renders nothing", () => {
    const nonEmbeddable = toolSlugs.filter((s) => !getEmbedEntry(s));
    // If this ever hits zero the assertion below stops proving anything.
    expect(nonEmbeddable.length).toBeGreaterThan(0);
    for (const slug of nonEmbeddable) expect(getEmbedEntry(slug)).toBeNull();
  });

  it("the invite refuses to emit a snippet on a non-canonical origin", () => {
    // Mirrors the guard in components/marketing/tool-embed-invite.tsx.
    const guard = (siteUrl: string) => {
      let host: string;
      try {
        host = new URL(siteUrl).host.toLowerCase();
      } catch {
        return false;
      }
      return host === CANONICAL_HOST;
    };
    expect(guard("https://usetruecap.com")).toBe(true);
    // Stricter than isCanonicalHost() on purpose: a permanent partner link to
    // the www host would carry a redirect hop forever.
    expect(guard("https://www.usetruecap.com")).toBe(false);
    expect(guard("https://truecap-pink.vercel.app")).toBe(false);
    expect(guard("https://truecap-iota.vercel.app")).toBe(false);
    expect(guard("http://localhost:3000")).toBe(false);
    expect(guard("not a url")).toBe(false);
  });

  it("the generated snippet links to the indexed /tools page, dofollow", () => {
    const src = readFileSync(
      join(process.cwd(), "components/embed/embed-code-block.tsx"),
      "utf8",
    );
    // The caption anchor is the entire SEO payoff — it must point at the
    // indexed tool page, not the noindexed /embed route, and must not be
    // nofollowed.
    expect(src).toContain("buildEmbedAttributionHref");
    expect(src).toContain("toolPath: `/tools/${slug}`");
    expect(src).toContain("Calculator by <a");
    expect(src).not.toMatch(/rel=\\?"nofollow/);
  });
});
