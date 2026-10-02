import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import sitemap from "@/app/sitemap";
import { GET as getLlmsTxt } from "@/app/llms.txt/route";

/**
 * llms.txt lists the comparison library and the persona pages the sitemap
 * lists (go-to-market audit, P2-97). Its "Comparison pages" section was seven
 * hand-typed lines against 38 pages in the sitemap, and "Investor personas"
 * left out /for-agents and /for-investors.
 */
const sitemapPaths = () => sitemap().map((entry) => new URL(entry.url).pathname);

const llms = async () => (await getLlmsTxt()).text();

/** The `- [label](url)` lines of one `## heading` section. */
const sectionLinks = (text: string, heading: string) => {
  const body = text.split(/^## /m).find((part) => part.startsWith(`${heading}\n`)) ?? "";
  return [...body.matchAll(/^- \[([^\]]+)\]\((https?:\/\/[^/)]+)?([^)]*)\)(.*)$/gm)].map((m) => ({
    label: m[1],
    path: m[3] || "/",
    rest: m[4],
  }));
};

describe("llms.txt lists what the sitemap lists", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("lists every comparison page in the sitemap, in the sitemap's order, and no other", async () => {
    const inSitemap = sitemapPaths().filter((path) => path.startsWith("/vs/"));
    expect(inSitemap.length).toBeGreaterThanOrEqual(38);
    const listed = sectionLinks(await llms(), "Comparison pages");
    expect(listed.map((link) => link.path)).toEqual(inSitemap);
  });

  it("names each competitor as the /vs hub does and says nothing else about it", async () => {
    const hub = readFileSync(join(process.cwd(), "app/vs/page.tsx"), "utf8");
    const hubNames = new Map(
      [...hub.matchAll(/slug:\s*"([^"]+)",\s*competitor:\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]),
    );
    expect(hubNames.size).toBeGreaterThanOrEqual(38);
    for (const link of sectionLinks(await llms(), "Comparison pages")) {
      const slug = link.path.replace(/^\/vs\//, "");
      const hubName = hubNames.get(slug);
      expect(hubName, `${slug}: not on the /vs hub`).toBeDefined();
      const name = link.label.replace(/^TrueCap vs\. /, "");
      expect(link.label, slug).toBe(`TrueCap vs. ${name}`);
      // The hub's name, or the hub's name without a trailing parenthetical
      // ("Cozy.co (shut down)" is listed here as "Cozy.co").
      expect(hubName === name || hubName!.startsWith(`${name} (`), `${slug}: "${name}" vs hub "${hubName}"`).toBe(true);
      // No one-line claim about a competitor: the page argues it, with sources.
      expect(link.rest, slug).toBe("");
    }
  });

  it("counts the comparison pages it lists", async () => {
    const text = await llms();
    const listed = sectionLinks(text, "Comparison pages");
    const count = listed.length;
    // The About line names the first pages of the list it counts, whichever they are.
    const firstName = listed[0]?.label.replace(/^TrueCap vs\. /, "");
    expect(firstName).toBeTruthy();
    expect(text).toContain(`  - ${count} side-by-side comparison pages, including TrueCap vs. ${firstName},`);
    expect(text).toContain(`/vs): All ${count} comparison pages.`);
  });

  it("lists /for-investors, and /for-agents only where the page exists", async () => {
    // Without Agent Pro's Stripe Price, /for-agents permanently redirects to
    // /pricing and leaves the sitemap; llms.txt must not send a reader there.
    vi.stubEnv("STRIPE_PRICE_AGENT_PRO_MONTHLY", "");
    expect(sitemapPaths()).not.toContain("/for-agents");
    let personas = sectionLinks(await llms(), "Investor personas").map((link) => link.path);
    expect(personas).toContain("/for-investors");
    expect(personas).toContain("/for-buy-and-hold");
    expect(personas).toContain("/for-house-hackers");
    expect(personas).not.toContain("/for-agents");
    expect(await llms()).not.toContain("/for-agents)");

    vi.stubEnv("STRIPE_PRICE_AGENT_PRO_MONTHLY", "price_test_agent_pro_monthly");
    expect(sitemapPaths()).toContain("/for-agents");
    personas = sectionLinks(await llms(), "Investor personas").map((link) => link.path);
    expect(personas).toContain("/for-agents");
    expect(personas).toContain("/for-investors");
  });

  it("describes the glossary by what every term has", async () => {
    const { GLOSSARY } = await import("@/lib/glossary");
    const terms = Object.values(GLOSSARY);
    const everyTermHasBoth = terms.every((term) => term.formula && term.example);
    const everyDefinitionIsOneSentence = terms.every((term) => term.definition.trim().split(/(?<=[.!?])\s+/).length === 1);
    const text = await llms();
    // The old line promised "one-sentence definitions, formulas, and worked
    // examples"; most definitions run to two sentences and most terms have
    // neither a formula nor an example.
    if (!everyDefinitionIsOneSentence) expect(text).not.toMatch(/one-sentence definitions/);
    if (!everyTermHasBoth) expect(text).not.toMatch(/glossary with [^\n]*definitions, formulas, and worked examples/);
    expect(text).toContain(`${terms.length}-term glossary with a definition for each term`);
  });

  it("links only pages the sitemap lists from those two sections", async () => {
    vi.stubEnv("STRIPE_PRICE_AGENT_PRO_MONTHLY", "price_test_agent_pro_monthly");
    const inSitemap = new Set(sitemapPaths());
    const text = await llms();
    for (const heading of ["Comparison pages", "Investor personas"]) {
      for (const link of sectionLinks(text, heading)) {
        expect(inSitemap.has(link.path), `${heading}: ${link.path}`).toBe(true);
      }
    }
  });
});
