/**
 * Every `/glossary/<slug>` link that appears anywhere under app/ must point at
 * a slug lib/glossary.ts actually publishes.
 *
 * This is the same failure class that made 16 of the glossary hub's own links
 * 404 for months (see glossary-hub.test.ts): a hand-written slug drifts from
 * the data source and nothing notices, because a 404 on an internal link is
 * invisible until someone clicks it or crawls the site. A production audit
 * found three live ones — `/glossary/roi`, `/glossary/operating-expenses` and
 * `/glossary/vacancy-rate` — hard-coded on two public /tools pages. This test
 * turns that from a crawl-time discovery into a PR-time failure.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { GLOSSARY_SLUGS } from "@/lib/glossary";

const ROOT = process.cwd();

/** Every tracked .tsx/.ts file under app/ and components/. */
function sourceFiles(): string[] {
  const out = execFileSync(
    "git",
    ["ls-files", "app/*.tsx", "app/*.ts", "components/*.tsx", "components/*.ts"],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
  );
  return out.split("\n").filter(Boolean);
}

describe("internal /glossary links resolve", () => {
  it("every hard-coded /glossary/<slug> link targets a published term", () => {
    const valid = new Set(GLOSSARY_SLUGS);
    // Match an actual href, static form only: href="/glossary/<slug>" (also
    // `href={"..."}` / `href={`...`}`). Anchoring on `href` excludes prose and
    // doc comments that merely mention a slug. A dynamic `/glossary/${x}` is
    // skipped — the `$` breaks the [a-z0-9-] capture — because those are built
    // from the data source and are correct by construction.
    const re = /href=\{?\s*["'`]\/glossary\/([a-z0-9-]+)/g;
    const broken: string[] = [];
    for (const rel of sourceFiles()) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      for (const m of src.matchAll(re)) {
        const slug = m[1];
        if (!valid.has(slug)) broken.push(`${rel}: /glossary/${slug}`);
      }
    }
    // De-dupe so the failure message lists each bad link once.
    expect([...new Set(broken)]).toEqual([]);
  });
});
