/**
 * lastmod.ts — the honest last-modified map, content/seo/lastmod.json.
 *
 * Google uses <lastmod> only when it is "consistently and verifiably
 * accurate" and means the last SIGNIFICANT change to the page's main content,
 * structured data or links. So a date moves only when that content moved:
 *
 *   · `bump` (publish job): sets today's date for the URLs a published loop
 *     change edited (the plan's `lastmodUrls`: an OG image is not the page's
 *     main content). The model never writes dates; this deterministic step
 *     does, from the publish plan.
 *   · `seed` (owner, F2): builds the initial map from git history, taking for
 *     each URL the newest commit that changed its OWN source or data, skipping
 *     the presentation-only sweep commits listed in seo/config.json.
 *
 * Until F2 lands the map does not exist and `bump` is a logged no-op, so the
 * loop can run before the sitemap reads from it.
 *
 *   node seo/scripts/lastmod.ts bump --plan publish-plan.json --date 2026-10-05
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { flagString, requireFlag, runMain, check, log } from "./lib/cli.ts";
import type { Args } from "./lib/cli.ts";
import { readJson, writeJson } from "./lib/io.ts";
import { REPO_ROOT, today } from "./lib/paths.ts";

export const LASTMOD_FILE = path.join(REPO_ROOT, "content", "seo", "lastmod.json");
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type LastmodMap = Record<string, string>;

export function bumpMap(map: LastmodMap, urls: string[], date: string): LastmodMap {
  if (!DATE_RE.test(date)) throw new Error(`bad date ${date}`);
  const next: LastmodMap = { ...map };
  for (const url of urls) {
    if (!url.startsWith("/")) throw new Error(`lastmod keys are site paths, got ${url}`);
    // Never move a date backwards: a re-run of an older plan must not undo a newer change.
    if (!next[url] || next[url] < date) next[url] = date;
  }
  return Object.fromEntries(Object.entries(next).sort(([a], [b]) => (a < b ? -1 : 1)));
}

async function main(args: Args): Promise<number> {
  const command = args.positionals[0];
  if (command !== "bump") {
    console.error("usage: lastmod.ts bump --plan <publish-plan.json> [--date YYYY-MM-DD]");
    return 2;
  }
  const planFile = requireFlag(args, "plan", "publish-plan.json");
  if (!existsSync(LASTMOD_FILE)) {
    log("content/seo/lastmod.json does not exist yet (F2) — lastmod bump skipped.");
    return 0;
  }
  const plan = readJson<{ urls?: string[]; lastmodUrls?: string[] }>(planFile);
  const urls = bumpUrls(plan);
  const date = flagString(args, "date", today());
  const map = readJson<LastmodMap>(LASTMOD_FILE);
  writeJson(LASTMOD_FILE, bumpMap(map, urls, date));
  log(`lastmod bumped for ${urls.length} URL(s) to ${date}`);
  return 0;
}

/**
 * The pages a plan moves the date of: `lastmodUrls` (main content changed;
 * an OG-image-only change is not a significant change), or `urls` from a
 * plan written before that field existed.
 */
export function bumpUrls(plan: { urls?: unknown; lastmodUrls?: unknown }): string[] {
  const list = Array.isArray(plan.lastmodUrls) ? plan.lastmodUrls : Array.isArray(plan.urls) ? plan.urls : null;
  if (list === null) throw new Error("the publish plan has no lastmodUrls or urls list");
  return list.filter((u): u is string => typeof u === "string");
}

function selfTest(): void {
  const next = bumpMap({ "/blog/a": "2026-06-01", "/blog/z": "2026-10-09" }, ["/blog/a", "/blog/z", "/blog/new"], "2026-10-05");
  check(next["/blog/a"] === "2026-10-05", "bumps an older date");
  check(next["/blog/z"] === "2026-10-09", "never moves a date backwards");
  check(next["/blog/new"] === "2026-10-05", "adds a new URL");
  check(Object.keys(next).join() === "/blog/a,/blog/new,/blog/z", "sorted keys");
  let threw = false;
  try {
    bumpMap({}, ["https://usetruecap.com/x"], "2026-10-05");
  } catch {
    threw = true;
  }
  check(threw, "rejects full URLs");
  check(bumpUrls({ urls: ["/blog/a", "/blog/b"], lastmodUrls: ["/blog/a"] }).join() === "/blog/a", "an OG-only page keeps its date");
}

/** Every flag this script reads (lib/cli.ts rejects any other). */
export const CLI_FLAGS: readonly string[] = ["date", "plan"];

runMain(import.meta.url, main, selfTest, { flags: CLI_FLAGS });
