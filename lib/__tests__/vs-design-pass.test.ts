/**
 * The /vs comparison pages on the design pass's grammar (DESIGN.md, "The
 * Underwriter's Ledger"; the frame is components/marketing/vs-page.tsx).
 *
 * The SEO loop runs on autopilot and may write app/vs/<slug>/page.tsx, so the
 * rules below are pinned on every rendered comparison page, not on a sample:
 * a page that goes back to the retired look (the "Honest comparison" pill,
 * 11px uppercase labels, rounded-2xl cards, the green fit panel, the blue
 * close panel, arrow icons) fails here before it ships.
 *
 * Each rule is read from the page source, the file the loop edits.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import {
  VS_FOOTNOTE,
  VS_INTRO,
  VS_LEDE,
  VS_NOTE,
  VS_PROSE,
  VS_SOURCES,
  VS_TLDR_LIST,
} from "@/components/marketing/vs-page";

const ROOT = process.cwd();
const VS_DIR = join(ROOT, "app", "vs");
const read = (file: string) => readFileSync(file, "utf8");

/** A /vs slug whose page.tsx only redirects (it renders no page of its own). */
const isRedirectStub = (source: string) =>
  /\b(?:permanentRedirect|redirect)\(/.test(source) && !/<main\b/.test(source);

const SLUGS = readdirSync(VS_DIR).filter((slug) => existsSync(join(VS_DIR, slug, "page.tsx")));
const PAGES = SLUGS.map((slug) => ({ slug, source: read(join(VS_DIR, slug, "page.tsx")) })).filter(
  (page) => !isRedirectStub(page.source),
);

/** Every .tsx under app/vs: the hub, the pages, the redirect stubs and the OG images. */
function tsxUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return tsxUnder(full);
    return entry.name.endsWith(".tsx") ? [full] : [];
  });
}
const VS_FILES = tsxUnder(VS_DIR).map((file) => ({ file: relative(ROOT, file), source: read(file) }));

/** The source between `open` and the first `close` after it ("" when `open` is absent). */
function between(source: string, open: string, close: string): string {
  const start = source.indexOf(open);
  if (start === -1) return "";
  const end = source.indexOf(close, start + open.length);
  return end === -1 ? "" : source.slice(start, end + close.length);
}

/** The body of every `<div className={VS_PROSE}>` column (nested divs counted). */
function proseColumns(source: string): string[] {
  const out: string[] = [];
  const open = "<div className={VS_PROSE}>";
  for (let at = source.indexOf(open); at !== -1; at = source.indexOf(open, at + 1)) {
    const from = at + open.length;
    let depth = 1;
    const tags = /<div\b|<\/div>/g;
    tags.lastIndex = from;
    for (let tag = tags.exec(source); tag; tag = tags.exec(source)) {
      depth += tag[0] === "</div>" ? -1 : 1;
      if (depth === 0) {
        out.push(source.slice(from, tag.index));
        break;
      }
    }
  }
  return out;
}

/**
 * The opening tag of every <Link>, <IntentPrefetchLink> or <a> (attributes may
 * span lines). Below the hero the pages' internal links are IntentPrefetchLink
 * (intent-prefetch-vs.test.ts), so the close's secondary action and the prose
 * links are read under that name.
 */
const linkTags = (source: string) =>
  [...source.matchAll(/<(?:Link|IntentPrefetchLink|a)\b[^>]*>/g)].map((m) => m[0]);

const FILLED = 'buttonVariants({ size: "cta" })';
const OUTLINE = 'buttonVariants({ variant: "outline", size: "cta" })';

describe("the /vs page set", () => {
  it("finds every rendered comparison page (the redirect stubs render none)", () => {
    expect(PAGES.length).toBeGreaterThanOrEqual(38);
    for (const stub of ["dealcheck-for-brrrr", "dealcheck-for-fix-and-flip"]) {
      if (SLUGS.includes(stub)) expect(PAGES.map((page) => page.slug)).not.toContain(stub);
    }
  });
});

describe.each(PAGES)("/vs/$slug", ({ slug, source }) => {
  it("is set in the vs frame: VsHero with its own <h1>, the matrix in VsMatrixTable", () => {
    expect(source).toContain('from "@/components/marketing/vs-page"');
    const hero = between(source, "<VsHero>", "</VsHero>");
    expect(hero, "VsHero opens the page").not.toBe("");
    expect(hero).toContain("<h1 className={VS_H1}>");
    const table = between(source, '<ScrollX label="Comparison table"', "</ScrollX>");
    expect(table, "the matrix sits in ScrollX").toContain("<VsMatrixTable");
  });

  it("closes on CloseSection with the analyzer first and the only filled button", () => {
    const close = between(source, "<CloseSection", "</ActionRow>");
    expect(close, "CloseSection with an ActionRow").toContain("<ActionRow>");
    const links = linkTags(close.slice(close.indexOf("<ActionRow>")));
    expect(links.length).toBeGreaterThanOrEqual(2);
    const [first, ...rest] = links;
    expect(first).toContain('href="/analyze"');
    expect(first).toContain("prefetch={false}");
    expect(first).toContain(FILLED);
    for (const link of rest) expect(link).toContain(OUTLINE);
  });

  it("has one filled button per action row", () => {
    const rows = [...source.matchAll(/<ActionRow\b[\s\S]*?<\/ActionRow>/g)].map((m) => m[0]);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (const row of rows) expect(row.split(FILLED).length - 1, row).toBe(1);
  });

  it("writes its reading columns as plain elements the column styles", () => {
    const columns = proseColumns(source);
    expect(columns.length, "a VS_PROSE column before the FAQ").toBeGreaterThan(0);
    for (const column of columns) {
      for (const [tag] of column.matchAll(/<(?:ul|ol|li|p)\b[^>]*>/g)) {
        expect(tag, `${slug}: a list or paragraph in a VS_PROSE column takes no class`).toMatch(/^<(?:ul|ol|li|p)>$/);
      }
    }
  });

  it("gives every classed link the tc-link look (the class the SEO loop copies)", () => {
    for (const tag of linkTags(source)) {
      const literal = tag.match(/\bclassName="([^"]*)"/);
      if (literal) expect(literal[1].split(/\s+/), `${slug}: ${tag}`).toContain("tc-link");
    }
  });

  it("keeps a green winner mark only where its own copy describes a green check", () => {
    const positive = source.includes('winnerMark="positive"');
    expect(positive, `${slug}: winnerMark="positive" iff the copy says "green check"`).toBe(/green check/i.test(source));
  });
});

describe("the retired /vs look stays gone", () => {
  const RETIRED: Array<[string, RegExp]> = [
    ["type below 14px", /\btext-(?:xs|2xs|3xs)\b/],
    ["uppercase micro-labels", /\buppercase\b|\btracking-(?:wide|wider|widest)\b/],
    ["card radius on a block", /\brounded-(?:xl|2xl|3xl|full)\b/],
    ["the green fit panel", /brand-green/],
    ["the blue close panel", /\bbg-primary\b/],
    ["decorative or arrow icons", /\b(?:Sparkles|ArrowRight|ArrowUpRight|ChevronRight)\b/],
    ["heavy weights", /\bfont-(?:bold|extrabold|black)\b/],
    ["shadow at rest", /\bshadow-(?:sm|md|lg|xl|2xl|inner|\[)/],
    ["gradients", /\bbg-(?:gradient|linear|radial)-/],
    ["raw palette colors", /\b(?:text|bg|border|ring|from|to)-(?:slate|gray|zinc|neutral|stone|blue|sky|indigo|emerald|green|amber|yellow|orange|red|rose)-\d{2,3}\b/],
    ["transition-all and entrance motion", /\btransition-all\b|\btc-(?:reveal|rise-in)\b/],
    ["hover nudges", /group-hover:translate/],
    ["the retired link class", /\bhover:underline\b/],
    ["an arrow at the end of link text", /(?:→|»|-&gt;)\s*<\/(?:Link|IntentPrefetchLink|a)>/],
  ];

  it("scans every .tsx under app/vs", () => {
    expect(VS_FILES.length).toBeGreaterThan(75);
  });

  it.each(RETIRED)("no %s", (_label, pattern) => {
    const hits = VS_FILES.filter(({ source }) => pattern.test(source)).map(({ file }) => file);
    expect(hits).toEqual([]);
  });
});

describe("the vs frame's text blocks (components/marketing/vs-page.tsx)", () => {
  it("styles a plain <ul> and <ol> in a reading column, so a list needs no constant or import", () => {
    for (const rule of [
      "[&>ul]:border-t-2",
      "[&>ul]:border-foreground",
      "[&>ul>li]:border-b",
      "[&>ol]:border-t-2",
      "[&>ol>li]:border-b",
      "[&>ol]:[counter-reset:vs-step]",
      "[&>ol>li]:before:font-mono",
      "[&>ol>li]:before:content-[counter(vs-step)]",
    ]) {
      expect(VS_PROSE.split(" ")).toContain(rule);
    }
  });

  it("gives a link in any running-text block the tc-link look, with or without its class", () => {
    const blocks = { VS_PROSE, VS_LEDE, VS_NOTE, VS_INTRO, VS_TLDR_LIST, VS_FOOTNOTE, VS_SOURCES };
    for (const [name, classes] of Object.entries(blocks)) {
      expect(classes.split(" "), name).toContain("[&_a]:tc-link");
    }
  });
});
