import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { GET as getFeed } from "@/app/feed.xml/route";
import MarketCityPage from "@/app/markets/[city]/page";
import StatePage from "@/app/states/[slug]/page";
import GlossaryTermPage from "@/app/glossary/[slug]/page";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { NOINDEX_PATHS } from "@/lib/seo/noindex";
import { LASTMOD, lastmodFor, lastmodOrPublished } from "@/lib/seo/lastmod";
import { dateSlotsOf, postDateWiringViolations } from "../../seo/scripts/verify-static.ts";
import { sweepHistoryProblems } from "../../seo/scripts/lastmod.ts";

/**
 * F2: content/seo/lastmod.json is the ONE source of last-modified dates.
 * Seeded by `node seo/scripts/lastmod.ts seed` (git history, content
 * signatures), bumped only by the SEO loop's publish job.
 */

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const pathOf = (url: string) => new URL(url).pathname;

/**
 * Pages with a map entry that this build's sitemap may leave out: env-gated
 * pages (the Vercel build lists /for-agents when Agent Pro prices exist, and
 * /guarantee when the guarantee is on) and paths on the noindex list.
 */
const KNOWN_NON_SITEMAP = new Set<string>(["/for-agents", "/guarantee", ...NOINDEX_PATHS]);

/** YYYY-MM-DD of a git log query, or null when git (or that history) is unavailable. */
function gitDate(args: string[], env: NodeJS.ProcessEnv = process.env): string | null {
  try {
    const out = execFileSync("git", args, { cwd: ROOT, env, stdio: ["ignore", "pipe", "ignore"] }).toString("utf8").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
  } catch {
    return null;
  }
}

describe("lastmod map contract", () => {
  const entries = sitemap();
  const dates = Object.values(LASTMOD);
  const newest = [...dates].sort().at(-1) ?? "";

  it("gives every sitemap URL a map entry, and lastmod exactly that entry", () => {
    const missing: string[] = [];
    for (const entry of entries) {
      const path = pathOf(entry.url);
      if (lastmodFor(path) === undefined) missing.push(path);
      expect(entry.lastModified, path).toBe(lastmodFor(path));
    }
    expect(missing, "sitemap URLs with no content/seo/lastmod.json entry (re-run the seed or add the page's date)").toEqual([]);
  });

  it("holds no orphan keys: every key is a sitemap URL or a known non-sitemap page", () => {
    const inSitemap = new Set(entries.map((entry) => pathOf(entry.url)));
    const orphans = Object.keys(LASTMOD).filter((key) => !inSitemap.has(key) && !KNOWN_NON_SITEMAP.has(key));
    expect(orphans).toEqual([]);
  });

  it("stores YYYY-MM-DD dates in sorted key order (the format lastmod.ts writes)", () => {
    const keys = Object.keys(LASTMOD);
    expect(keys).toEqual([...keys].sort((a, b) => (a < b ? -1 : 1)));
    for (const [key, date] of Object.entries(LASTMOD)) expect(date, key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // The repository's first commit: no page changed before the site existed.
    for (const [key, date] of Object.entries(LASTMOD)) expect(date >= "2026-04-14", `${key} ${date}`).toBe(true);
  });

  it("never dates a change after the map was committed (fixed comparison, no clock)", () => {
    // The newest date in the map is the reference: every date is at most that,
    // and that is at most the date of the commit that holds the map (HEAD in a
    // shallow CI clone, which is never earlier). No `new Date()`: no time bomb.
    for (const [key, date] of Object.entries(LASTMOD)) expect(date <= newest, `${key} ${date}`).toBe(true);
    // The commit's calendar day in its committer's own zone (%cs) or in UTC,
    // whichever is later. Map dates are UTC days (the loop bumps with
    // `date -u +%F`), and the same commit rebased or cherry-picked west of UTC
    // after 00:00 UTC carries the previous day as %cs for the same instant.
    const commitDay = (format: string[], env?: NodeJS.ProcessEnv) =>
      gitDate(["log", "-1", ...format, "--", "content/seo/lastmod.json"], env) ?? gitDate(["log", "-1", ...format], env);
    const days = [
      commitDay(["--format=%cs"]),
      commitDay(["--date=format-local:%Y-%m-%d", "--format=%cd"], { ...process.env, TZ: "UTC" }),
    ].filter((day): day is string => day !== null);
    const committed = days.sort().at(-1) ?? null;
    if (committed !== null) expect(newest <= committed, `newest map date ${newest} is after its commit ${committed}`).toBe(true);
  });

  it("never dates a post before its publication", () => {
    for (const post of BLOG_POSTS.filter((p) => p.available)) {
      const date = lastmodFor(`/blog/${post.slug}`);
      expect(date, post.slug).toBeDefined();
      expect((date ?? "") >= post.publishedAt, `${post.slug}: lastmod ${date} < publishedAt ${post.publishedAt}`).toBe(true);
    }
  });

  it("wires every post's MODIFIED_AT to the map (its JSON-LD dateModified and visible Updated line follow)", () => {
    // Read from the TypeScript AST (verify-static's date slots), not as text: the
    // wiring must BE the MODIFIED_AT initializer (a copy in a comment does not
    // count), dateModified/modifiedTime must name MODIFIED_AT, and no date slot
    // may read the clock. The loop's fence applies the same rule to a new post.
    const blogDir = join(ROOT, "app", "blog");
    const unwired: string[] = [];
    let posts = 0;
    for (const slug of readdirSync(blogDir)) {
      const file = `app/blog/${slug}/page.tsx`;
      if (slug === "topics" || !existsSync(join(ROOT, file))) continue;
      posts += 1;
      for (const problem of postDateWiringViolations(file, read(file))) unwired.push(`${slug}: ${problem}`);
    }
    expect(posts).toBeGreaterThanOrEqual(75);
    expect(unwired).toEqual([]);
  });

  it("leaves no hand-typed or build-time modified date in any page template", { timeout: 30_000 }, () => {
    // Every modified-date slot (dateModified, modifiedTime, modifiedAt,
    // MODIFIED_AT-style consts), read from the syntax tree: no date literal
    // anywhere in its value (`lastmodFor(x) ?? "2026-09-06"` is a floor) and
    // no clock read. lastmod-invents-none.test.ts renders the unmapped case.
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${name.name}`;
        if (name.isDirectory()) walk(rel);
        else if (/\.tsx?$/.test(name.name)) {
          for (const slot of dateSlotsOf(rel, read(rel))) {
            if (!/modified/i.test(slot.name)) continue;
            if (/["'`]\d{4}-\d{2}-\d{2}|\bnew Date\(\s*\)|\bDate\.now\(/.test(slot.value)) offenders.push(`${rel}: ${slot.name}=${slot.value}`);
          }
        }
      }
    };
    walk("app");
    walk("components");
    expect(offenders).toEqual([]);
  });

  it("renders the map date as JSON-LD dateModified on the market, state and glossary templates", async () => {
    const rendered: Array<[string, string]> = [
      ["/markets/columbus", renderToStaticMarkup(await MarketCityPage({ params: Promise.resolve({ city: "columbus" }) }))],
      ["/states/ohio", renderToStaticMarkup(await StatePage({ params: Promise.resolve({ slug: "ohio" }) }))],
      ["/glossary/cap-rate", renderToStaticMarkup(await GlossaryTermPage({ params: Promise.resolve({ slug: "cap-rate" }) }))],
    ];
    for (const [path, html] of rendered) {
      const expected = lastmodFor(path);
      expect(expected, path).toBeDefined();
      const values = [...html.matchAll(/"dateModified":"([^"]*)"/g)].map((m) => m[1]);
      expect(values.length, path).toBeGreaterThan(0);
      expect(new Set(values), path).toEqual(new Set([expected]));
    }
  });

  it("dates the feed by its newest post change, not the build", async () => {
    const xml = await (await getFeed()).text();
    const newestPost = BLOG_POSTS.filter((p) => p.available)
      .map((p) => lastmodOrPublished(`/blog/${p.slug}`, p.publishedAt))
      .sort()
      .at(-1);
    expect(xml).toContain(`<lastBuildDate>${new Date(`${newestPost}T00:00:00Z`).toUTCString()}</lastBuildDate>`);
  });
});

/** True in a shallow clone (CI's unit job checks out 2 commits), where history cannot answer. */
function isShallowClone(): boolean {
  try {
    return execFileSync("git", ["rev-parse", "--is-shallow-repository"], { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] }).toString("utf8").trim() !== "false";
  } catch {
    return true;
  }
}

describe("lastmod seed sweeps (seo/config.json sweepCommits)", () => {
  // A listed sweep that is not in this history skips nothing: a re-seed then
  // dates its presentation-only changes as content. The F-series lands on main
  // rebased, so a sweep listed under its branch SHA is exactly that case (F1,
  // 033d63c, re-dates /about and the bonus-depreciation post). `lastmod.ts
  // seed` refuses to run on the same problems; this reports them in a full
  // clone, naming the landed copy of a rebased commit.
  it.skipIf(isShallowClone())("lists only commits in HEAD's history, each matched by exactly one commit", () => {
    expect(sweepHistoryProblems(ROOT)).toEqual([]);
  });
});
