/**
 * SEO source scanner — shared, dependency-free helpers for the automated
 * SEO guards.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The 2026-08-02 SEO baseline audit produced a list of defects that are
 * *mechanically* detectable from source (entity-corrupted meta descriptions,
 * over-length titles, posts that link nowhere, sitemap drift). Rather than
 * re-deriving "which pages exist and what metadata do they declare" in every
 * test and script, that parsing lives here once.
 *
 * HARD CONSTRAINTS — read before editing
 *   1. **Node-only, data-only.** It imports `node:fs` and MUST NEVER be
 *      imported by anything under `app/` or `components/`. It is for
 *      `lib/__tests__/*` and `scripts/*` exclusively. It deliberately does
 *      NOT carry `import "server-only"` — vitest stubs that module, and a
 *      plain `tsx` script wouldn't resolve it at all.
 *   2. **Regex, not a TS parser.** Adding a real parser (ts-morph, swc) to
 *      make this "correct" is not worth the install weight for a lint pass.
 *      The trade-off is accepted: the scanner reports what it can resolve and
 *      returns `null` when it can't, and every caller treats `null` as
 *      "unknown, skip" rather than "violation". A guard that can't read a
 *      file must never fail that file — it must fail loudly at the corpus
 *      level (see `expectCorpusSize`) so a broken scanner surfaces as
 *      "found 0 pages" instead of silently passing everything.
 *   3. **Source of truth for what is indexable** is `robots.index !== false`
 *      in the page's own metadata, plus PRIVATE_PREFIXES below. If you add a
 *      new private route tree, add it there.
 */

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
export const APP_DIR = path.join(REPO_ROOT, "app");

/** app/layout.tsx sets `title.template: "%s | TrueCap"`. */
export const TITLE_TEMPLATE_SUFFIX = " | TrueCap";
export const MAX_RENDERED_TITLE_CHARS = 60;
export const MAX_TITLE_CONST_CHARS =
  MAX_RENDERED_TITLE_CHARS - TITLE_TEMPLATE_SUFFIX.length;
/** Google truncates the SERP snippet around here on desktop. */
export const MAX_META_DESCRIPTION_CHARS = 165;

export const CANONICAL_ORIGIN = "https://usetruecap.com";

/**
 * Route trees that are private by construction. These are excluded from
 * every indexability assertion regardless of what their metadata says —
 * they're also covered by app/robots.ts's Disallow list.
 */
const PRIVATE_PREFIXES = [
  "/admin",
  "/api",
  "/auth",
  "/d/",
  "/dashboard",
  "/home-authed",
  "/profile",
  "/saved-analyses",
  "/settings",
  "/compare",
  "/templates",
  "/search",
  "/embed/",
] as const;

export type PageRecord = {
  /** Route path, e.g. "/blog/how-to-calculate-cap-rate". "/" for the root. */
  route: string;
  /** Absolute path to the page.tsx. */
  file: string;
  /** Repo-relative path, for error messages. */
  relFile: string;
  /** True when the route contains a [dynamic] segment. */
  dynamic: boolean;
  source: string;
};

function walkPageFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Route groups (auth) and private folders (_lib) still contain pages.
      walkPageFiles(full, acc);
    } else if (entry.name === "page.tsx") {
      acc.push(full);
    }
  }
  return acc;
}

function fileToRoute(file: string): string {
  const rel = path.relative(APP_DIR, path.dirname(file));
  if (rel === "" || rel === ".") return "/";
  const segments = rel
    .split(path.sep)
    // Route groups `(marketing)` do not appear in the URL.
    .filter((s) => !(s.startsWith("(") && s.endsWith(")")));
  return `/${segments.join("/")}`;
}

let pageCache: PageRecord[] | null = null;

/** Every `app/**\/page.tsx`, parsed once per process. */
export function allPages(): PageRecord[] {
  if (pageCache) return pageCache;
  pageCache = walkPageFiles(APP_DIR)
    .map((file) => {
      const route = fileToRoute(file);
      return {
        route,
        file,
        relFile: path.relative(REPO_ROOT, file),
        dynamic: /\[.+\]/.test(route),
        source: readFileSync(file, "utf8"),
      };
    })
    .sort((a, b) => a.route.localeCompare(b.route));
  return pageCache;
}

export function isPrivateRoute(route: string): boolean {
  return PRIVATE_PREFIXES.some(
    (p) => route === p || route.startsWith(p) || route === p.replace(/\/$/, ""),
  );
}

/** `robots: { index: false }` anywhere in the metadata block. */
export function declaresNoindex(source: string): boolean {
  // No `s` flag: tsconfig targets ES6, and the pattern has no `.` to widen —
  // `[^}]` already crosses newlines.
  return /robots:\s*\{[^}]*index:\s*false/.test(source);
}

/**
 * Pages a search engine is expected to index: static route, not in a private
 * tree, no explicit noindex.
 */
export function indexablePages(): PageRecord[] {
  return allPages().filter(
    (p) =>
      !p.dynamic && !isPrivateRoute(p.route) && !declaresNoindex(p.source),
  );
}

/**
 * Resolve a string-valued metadata field to its literal value.
 *
 * Handles the two shapes this codebase uses:
 *   `description: SOME_CONST`   — a module-level `const SOME_CONST = "…"`
 *   `description: "inline"`     — an inline double-quoted literal
 *
 * Returns `null` for anything else (template literals, concatenation,
 * computed values). Callers MUST treat null as "can't tell — skip", never as
 * a violation. See constraint 2 in the file header.
 */
export function resolveMetadataString(
  source: string,
  field: "title" | "description",
): string | null {
  const metadataStart = source.indexOf("export const metadata");
  if (metadataStart === -1) return null;
  const afterMetadata = source.slice(metadataStart);

  const match = afterMetadata.match(
    new RegExp(`${field}:\\s*("(?:[^"\\\\]|\\\\.)*"|[A-Z][A-Z0-9_]*)`),
  );
  if (!match) return null;
  const ref = match[1];

  if (ref.startsWith('"')) {
    try {
      return JSON.parse(ref) as string;
    } catch {
      return null;
    }
  }

  // Const reference — find its declaration. Prettier may wrap the value onto
  // the next line, hence the optional newline.
  const constMatch = source.match(
    new RegExp(`const ${ref}\\s*=\\s*\\n?\\s*("(?:[^"\\\\]|\\\\.)*")`),
  );
  if (!constMatch) return null;
  try {
    return JSON.parse(constMatch[1]) as string;
  } catch {
    return null;
  }
}

/**
 * HTML entities that must never reach a meta tag. `&apos;` inside a
 * `DESCRIPTION` const is correct-looking JSX habit but wrong here: metadata
 * strings are not JSX, so Google receives the literal seven characters.
 * Found on 7 money pages in the 2026-08-02 audit.
 */
export const HTML_ENTITY_RE = /&(?:[a-zA-Z][a-zA-Z0-9]{1,9}|#\d{1,5}|#x[0-9a-fA-F]{1,5});/;

/** Internal link targets found in a page's source, deduped, self-link removed. */
export function internalLinks(source: string, selfRoute: string): string[] {
  const found = new Set<string>();
  for (const m of source.matchAll(/href=(?:"(\/[^"#?]*)|\{`(\/[^`#?]*)`\})/g)) {
    const raw = (m[1] ?? m[2] ?? "").replace(/\/$/, "");
    if (!raw) continue;
    // Skip interpolated hrefs — `/blog/${slug}` isn't a resolvable target.
    if (raw.includes("$")) continue;
    if (raw === selfRoute.replace(/\/$/, "")) continue;
    found.add(raw);
  }
  return [...found].sort();
}

export type LinkProfile = {
  glossary: number;
  markets: number;
  tools: number;
  blog: number;
};

/**
 * Count outbound internal links by destination family. The repo's own
 * standard (docs/SEO-ROADMAP.md §8) is ≥3 glossary, ≥1 market, ≥1 tool,
 * ≥2 sibling blog posts per post.
 */
export function linkProfile(source: string, selfRoute: string): LinkProfile {
  const links = internalLinks(source, selfRoute);
  const count = (prefix: string) =>
    links.filter((l) => l.startsWith(prefix) && l !== prefix.replace(/\/$/, ""))
      .length;
  return {
    glossary: count("/glossary/"),
    markets: count("/markets/"),
    tools: count("/tools/"),
    // Topic hubs are a different surface; don't let them satisfy the
    // related-post requirement.
    blog: links.filter(
      (l) => l.startsWith("/blog/") && !l.startsWith("/blog/topics"),
    ).length,
  };
}

export function blogSlugs(): string[] {
  const blogDir = path.join(APP_DIR, "blog");
  return readdirSync(blogDir, { withFileTypes: true })
    .filter(
      (e) =>
        e.isDirectory() &&
        e.name !== "topics" &&
        !e.name.startsWith("[") &&
        existsSync(path.join(blogDir, e.name, "page.tsx")),
    )
    .map((e) => e.name)
    .sort();
}

export function blogPage(slug: string): PageRecord {
  const page = allPages().find((p) => p.route === `/blog/${slug}`);
  if (!page) throw new Error(`no page record for blog slug ${slug}`);
  return page;
}

/** Git mtime is unavailable in a plain fs scan; fall back to filesystem. */
export function fileModifiedAt(file: string): Date {
  return statSync(file).mtime;
}
