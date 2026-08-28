/**
 * Every hard-coded internal href that appears under app/ or components/ must
 * point at a route that actually resolves.
 *
 * This generalizes internal-glossary-links.test.ts (which guards only
 * `/glossary/<slug>` links) to ALL static internal links — footer, header,
 * dashboard nav, /tools, /markets, /vs, /blog, /states, and every in-page CTA.
 * The failure class is the same one that made 16 glossary links and three
 * /tools links 404 for months: a hand-written path drifts from the routes that
 * exist and nothing notices, because a 404 on an internal link is invisible
 * until someone clicks it or crawls the site. This turns that from a crawl-time
 * discovery into a PR-time failure.
 *
 * How it resolves a path: it walks the URL segments against the app/ directory
 * exactly the way the Next App Router does — a literal segment matches a
 * directory of that name, and a `[param]` / `[...catchAll]` directory matches
 * any single (or, for catch-alls, remaining) segment. A route "exists" when the
 * leaf directory has a page.* or route.* file. There are no route groups or
 * parallel routes in this app (verified), so the URL→directory mapping is 1:1
 * and this stays robust.
 *
 * What it deliberately skips: template-literal hrefs (`/blog/${slug}`) are
 * built from a data source and correct by construction — the `${` breaks the
 * static-path capture, same convention as the glossary guard. External
 * (`https://`, protocol-relative `//`), `mailto:`, `tel:`, and `#`-anchor links
 * never start with a single `/` and so are never captured.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const APP = join(ROOT, "app");

/** Every tracked .tsx/.ts file under app/ and components/. */
function sourceFiles(): string[] {
  const out = execFileSync("git", ["ls-files", "app", "components"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  return out
    .split("\n")
    .filter((f) => /\.(tsx|ts)$/.test(f) && existsSync(join(ROOT, f)));
}

const LEAF_FILES = [
  "page.tsx",
  "page.ts",
  "page.jsx",
  "page.js",
  "route.ts",
  "route.tsx",
  "route.js",
  "route.jsx",
];

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function hasLeaf(dir: string): boolean {
  return LEAF_FILES.some((f) => existsSync(join(dir, f)));
}

/** Walk URL segments against a directory the way the App Router does. */
function resolveRoute(dir: string, segs: string[]): boolean {
  if (segs.length === 0) return hasLeaf(dir);
  const [head, ...rest] = segs;

  // Literal segment wins first (Next prefers a static route over a dynamic one).
  const literal = join(dir, head);
  if (isDir(literal) && resolveRoute(literal, rest)) return true;

  // Then dynamic: `[param]` matches one segment, `[...x]`/`[[...x]]` the rest.
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return false;
  }
  for (const e of entries) {
    if (!/^\[.*\]$/.test(e)) continue;
    const child = join(dir, e);
    if (!isDir(child)) continue;
    if (e.startsWith("[[...") || e.startsWith("[...")) {
      if (hasLeaf(child)) return true; // catch-all consumes all remaining segments
    }
    if (resolveRoute(child, rest)) return true;
  }
  return false;
}

function routeExists(pathname: string): boolean {
  if (pathname === "/") return hasLeaf(APP);
  const segs = pathname.split("/").filter(Boolean);
  return resolveRoute(APP, segs);
}

describe("internal links resolve to real routes", () => {
  it("every hard-coded internal href points at a route that exists", () => {
    // Capture the path of `href="/…"`, `href={"/…"}`, `href={`/…`}` and the
    // object-property form `href: "/…"` used by nav/footer data arrays. The
    // capture stops at the first quote/backtick/brace/space.
    const re = /href\s*[:=]\s*\{?\s*["'`](\/[^"'`}\s]*)/g;
    const broken: string[] = [];

    for (const rel of sourceFiles()) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      for (const m of src.matchAll(re)) {
        const raw = m[1]!;
        if (raw.startsWith("//")) continue; // protocol-relative external URL
        if (raw.includes("${")) continue; // dynamic template literal — correct by construction
        const path = raw.split(/[?#]/)[0]!; // strip query string + hash fragment
        if (path === "") continue;
        if (!routeExists(path)) broken.push(`${rel}: ${path}`);
      }
    }

    expect([...new Set(broken)]).toEqual([]);
  });
});
