/**
 * render-diff.ts — proves a patch changed only the pages it declared.
 *
 * verify-build renders every sitemap URL of the base build and of the patched
 * build on loopback, hashing each page's <main> text. One file edit can change
 * many URLs (a shared dataset, a registry, a related-links block), so counting
 * FILES is not a blast-radius cap; counting RENDERED CHANGES is.
 *
 *   node seo/scripts/render-diff.ts hash --base http://127.0.0.1:3100 --out hashes.json [--html-dir dir]
 *   node seo/scripts/render-diff.ts --base base.json --patched patched.json --verdict verdict.json
 *
 * The compare exits 1 when a page outside `verdict.declaredUrls` changed, when
 * the sitemap lost a URL, or when it gained one that is not a declared new
 * article. Only this job's pass/fail is consumed downstream.
 */

import { writeFileSync } from "node:fs";
import path from "node:path";
import { flagString, requireFlag, runMain, check, log } from "./lib/cli.ts";
import type { Args } from "./lib/cli.ts";
import { globMatch, loadConfig } from "./lib/config.ts";
import { ensureDir, readJson, writeJson } from "./lib/io.ts";
import { extractPage, sha256 } from "./lib/html.ts";
import { parseSitemap } from "./lib/sitemap.ts";
import type { VerifyVerdict } from "./lib/types.ts";

export type RenderHashes = { base: string; pages: Record<string, { status: number; mainHash: string; noindex: boolean; externalHosts?: string[] }> };

function assertLoopback(base: string): void {
  const host = new URL(base).hostname;
  if (!["127.0.0.1", "localhost", "::1"].includes(host)) throw new Error(`render-diff only renders loopback builds, not ${host}`);
}

async function hashAll(base: string, htmlDir: string | null): Promise<RenderHashes> {
  assertLoopback(base);
  const sitemapXml = await (await fetch(`${base}/sitemap.xml`)).text();
  const paths = parseSitemap(sitemapXml).map((u) => u.path);
  if (!paths.length) throw new Error("the loopback build served an empty sitemap");
  const pages: RenderHashes["pages"] = {};
  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (cursor < paths.length) {
      const p = paths[cursor++];
      const response = await fetch(`${base}${p}`, { redirect: "manual" });
      const html = response.status === 200 ? await response.text() : "";
      const page = html ? extractPage(html, `https://usetruecap.com${p}`) : null;
      pages[p] = {
        status: response.status,
        mainHash: page?.mainHash ?? sha256(""),
        noindex: /noindex/i.test(page?.robots ?? ""),
        externalHosts: [...new Set((page?.externalLinks ?? []).map((l) => l.host))].sort(),
      };
      if (htmlDir && html) writeFileSync(path.join(htmlDir, `${sha256(p).slice(0, 16)}.html`), html);
    }
  };
  if (htmlDir) ensureDir(htmlDir);
  await Promise.all(Array.from({ length: 6 }, worker));
  return { base, pages };
}

export function compareRenders(base: RenderHashes, patched: RenderHashes, verdict: Pick<VerifyVerdict, "declaredUrls">, newArticles: string[] = []): { changed: string[]; undeclared: string[]; lost: string[]; gained: string[] } {
  const declared = new Set(verdict.declaredUrls);
  const changed: string[] = [];
  for (const [p, before] of Object.entries(base.pages)) {
    const after = patched.pages[p];
    if (!after) continue;
    if (after.status !== before.status || after.mainHash !== before.mainHash || after.noindex !== before.noindex) changed.push(p);
  }
  const lost = Object.keys(base.pages).filter((p) => !patched.pages[p]);
  const gained = Object.keys(patched.pages).filter((p) => !base.pages[p]);
  const allowedGained = new Set(newArticles);
  const undeclared = [
    ...changed.filter((p) => !declared.has(p)),
    ...lost.filter((p) => !declared.has(p)),
    ...gained.filter((p) => !allowedGained.has(p) && !declared.has(p)),
  ];
  return { changed: changed.sort(), undeclared: [...new Set(undeclared)].sort(), lost, gained };
}

/**
 * verify-static sees only links written as literals; a URL assembled at run
 * time shows up only in the rendered page. Any outbound host a changed page
 * gains must be a primary-source domain (or, on /vs pages, a vendor domain).
 */
export function newDisallowedHosts(
  base: RenderHashes,
  patched: RenderHashes,
  changed: string[],
  allowed: string[],
  vendor: string[],
  vendorPage: (path: string) => boolean = (p) => p.startsWith("/vs/"),
): string[] {
  const ok = (host: string, list: string[]): boolean => list.some((d) => host === d || host.endsWith(`.${d}`));
  const out: string[] = [];
  for (const p of changed) {
    const before = new Set(base.pages[p]?.externalHosts ?? []);
    for (const host of patched.pages[p]?.externalHosts ?? []) {
      if (before.has(host)) continue;
      if (ok(host, allowed) || (vendorPage(p) && ok(host, vendor))) continue;
      out.push(`${p} → ${host}`);
    }
  }
  return out;
}

async function main(args: Args): Promise<number> {
  if (args.positionals[0] === "hash") {
    const base = flagString(args, "base", "http://127.0.0.1:3100").replace(/\/$/, "");
    const result = await hashAll(base, flagString(args, "html-dir"));
    writeJson(flagString(args, "out", "render-hashes.json"), result);
    log(`hashed ${Object.keys(result.pages).length} rendered pages`);
    return 0;
  }
  const base = readJson<RenderHashes>(requireFlag(args, "base", "base-hashes.json"));
  const patched = readJson<RenderHashes>(requireFlag(args, "patched", "patched-hashes.json"));
  const verdict = readJson<VerifyVerdict & { newArticles?: string[] }>(requireFlag(args, "verdict", "verdict.json"));
  const newArticles = verdict.files.filter((f) => f.status === "A" && f.url).map((f) => f.url as string);
  const result = compareRenders(base, patched, verdict, newArticles);
  log(`rendered pages changed: ${result.changed.length} (${result.changed.slice(0, 10).join(", ")}${result.changed.length > 10 ? ", …" : ""})`);
  if (result.undeclared.length) {
    console.error(`UNDECLARED RENDER CHANGES — the patch changed pages it did not declare:\n${result.undeclared.map((p) => `  ${p}`).join("\n")}`);
    return 1;
  }
  const config = loadConfig();
  // A page may carry vendor links when its source file may (config.paths.vendorLinkAllow).
  const vendorPage = (p: string): boolean => (config.paths.vendorLinkAllow ?? ["app/vs/*/page.tsx"]).some((g) => globMatch(g, `app${p}/page.tsx`));
  const hosts = newDisallowedHosts(base, patched, [...result.changed, ...result.gained], config.primarySourceDomains, config.vendorDomains, vendorPage);
  if (hosts.length) {
    console.error(`NEW OUTBOUND HOSTS NOT ON THE SOURCE LIST:\n${hosts.map((h) => `  ${h}`).join("\n")}`);
    return 1;
  }
  return 0;
}

function selfTest(): void {
  const h = (hash: string, status = 200) => ({ status, mainHash: hash, noindex: false });
  const base: RenderHashes = { base: "b", pages: { "/blog/a": h("1"), "/blog/b": h("2"), "/markets/x": h("3") } };
  const same = compareRenders(base, base, { declaredUrls: [] });
  check(same.changed.length === 0 && same.undeclared.length === 0, "identical renders");
  const patched: RenderHashes = { base: "p", pages: { "/blog/a": h("1x"), "/blog/b": h("2"), "/markets/x": h("3y"), "/blog/new": h("9") } };
  const r = compareRenders(base, patched, { declaredUrls: ["/blog/a"] }, ["/blog/new"]);
  check(r.changed.join() === "/blog/a,/markets/x", "detects both changes");
  check(r.undeclared.join() === "/markets/x", "only the undeclared market change is a violation");
  const lost = compareRenders(base, { base: "p", pages: { "/blog/a": h("1") } }, { declaredUrls: [] });
  check(lost.undeclared.includes("/blog/b") && lost.undeclared.includes("/markets/x"), "a vanished page is a violation");
  const withHosts = (hosts: string[]) => ({ status: 200, mainHash: "h", noindex: false, externalHosts: hosts });
  const hb: RenderHashes = { base: "b", pages: { "/blog/a": withHosts(["www.irs.gov"]), "/vs/x": withHosts([]) } };
  const hp: RenderHashes = { base: "p", pages: { "/blog/a": withHosts(["www.irs.gov", "evil.test", "www.huduser.gov"]), "/vs/x": withHosts(["dealcheck.io"]) } };
  const bad = newDisallowedHosts(hb, hp, ["/blog/a", "/vs/x"], ["irs.gov", "huduser.gov"], ["dealcheck.io"]);
  check(bad.length === 1 && bad[0] === "/blog/a → evil.test", "only the unlisted new host is refused; vendor hosts pass on /vs only");
  let threw = false;
  try {
    assertLoopback("https://usetruecap.com");
  } catch {
    threw = true;
  }
  check(threw, "refuses non-loopback hosts");
}

/** Every flag this script reads (lib/cli.ts rejects any other). */
export const CLI_FLAGS: readonly string[] = ["base", "html-dir", "out", "patched", "verdict"];

runMain(import.meta.url, main, selfTest, { flags: CLI_FLAGS });
