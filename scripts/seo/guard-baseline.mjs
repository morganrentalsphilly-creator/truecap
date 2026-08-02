/**
 * Regenerate docs/seo/guard-baseline.json — the ratchet for the SEO guards
 * in lib/__tests__/seo-guards.test.ts.
 *
 * WHY A RATCHET AND NOT A GATE
 * ----------------------------
 * The 2026-08-02 baseline audit found real, pre-existing debt: 68 of 69 blog
 * posts miss the repo's own internal-linking standard (docs/SEO-ROADMAP.md
 * §8), 45 meta descriptions overflow the SERP snippet, 4 titles overflow the
 * SERP window, 7 posts have no FAQPage. A hard assertion on any of those
 * means a permanently red CI, which means someone disables the test, which
 * means the guard never catches the regression it was written for.
 *
 * So: this file records today's debt. CI asserts only that the debt does not
 * GROW — a new post must be clean, and an existing post must never get worse.
 * Paying debt down is a normal PR that ends with `--write` to bank it.
 *
 * Usage:
 *   node scripts/seo/guard-baseline.mjs           # report only, exit 1 on regression
 *   node scripts/seo/guard-baseline.mjs --write   # bank current state
 *
 * --write refuses to record a regression. The numbers only move the right
 * way. If a deliberate refactor genuinely needs to loosen one, hand-edit the
 * JSON and justify it in the commit message.
 *
 * Plain .mjs so it runs under bare `node` with no tsx/vitest bootstrap.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const APP_DIR = path.join(REPO_ROOT, "app");
const BLOG_DIR = path.join(APP_DIR, "blog");
const BASELINE_PATH = path.join(REPO_ROOT, "docs", "seo", "guard-baseline.json");

const TITLE_TEMPLATE_SUFFIX = " | TrueCap";
const MAX_TITLE_CONST_CHARS = 60 - TITLE_TEMPLATE_SUFFIX.length;
const MAX_META_DESCRIPTION_CHARS = 165;
const LINK_TARGET = { glossary: 3, markets: 1, tools: 1, blog: 2 };

const PRIVATE_PREFIXES = [
  "/admin", "/api", "/auth", "/d/", "/dashboard", "/home-authed", "/profile",
  "/saved-analyses", "/settings", "/compare", "/templates", "/search", "/embed/",
];

// ---------------------------------------------------------------- scanning
// These helpers intentionally mirror lib/seo/source-scan.ts. They are
// duplicated rather than imported because this script must run under bare
// `node` (no TS loader) in a CI step that may precede `npm ci`. A unit test
// (`guard-baseline stays in step with source-scan`) asserts the two agree.

function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else if (e.name === "page.tsx") acc.push(full);
  }
  return acc;
}

function fileToRoute(file) {
  const rel = path.relative(APP_DIR, path.dirname(file));
  if (!rel || rel === ".") return "/";
  const segs = rel.split(path.sep).filter((s) => !(s.startsWith("(") && s.endsWith(")")));
  return `/${segs.join("/")}`;
}

function resolveMetadataString(source, field) {
  const start = source.indexOf("export const metadata");
  if (start === -1) return null;
  const after = source.slice(start);
  const m = after.match(new RegExp(`${field}:\\s*("(?:[^"\\\\]|\\\\.)*"|[A-Z][A-Z0-9_]*)`));
  if (!m) return null;
  const ref = m[1];
  if (ref.startsWith('"')) {
    try { return JSON.parse(ref); } catch { return null; }
  }
  const c = source.match(new RegExp(`const ${ref}\\s*=\\s*\\n?\\s*("(?:[^"\\\\]|\\\\.)*")`));
  if (!c) return null;
  try { return JSON.parse(c[1]); } catch { return null; }
}

function linkProfile(source, selfRoute) {
  const found = new Set();
  for (const m of source.matchAll(/href=(?:"(\/[^"#?]*)|\{`(\/[^`#?]*)`\})/g)) {
    const raw = (m[1] ?? m[2] ?? "").replace(/\/$/, "");
    if (!raw || raw.includes("$")) continue;
    if (raw === selfRoute.replace(/\/$/, "")) continue;
    found.add(raw);
  }
  const links = [...found];
  const count = (p) => links.filter((l) => l.startsWith(p) && l !== p.replace(/\/$/, "")).length;
  return {
    glossary: count("/glossary/"),
    markets: count("/markets/"),
    tools: count("/tools/"),
    blog: links.filter((l) => l.startsWith("/blog/") && !l.startsWith("/blog/topics")).length,
  };
}

const isPrivate = (r) => PRIVATE_PREFIXES.some((p) => r === p || r.startsWith(p));
const isNoindex = (s) => /robots:\s*\{[^}]*index:\s*false/s.test(s);

// ---------------------------------------------------------------- collect
const pages = walk(APP_DIR)
  .map((file) => ({ file, route: fileToRoute(file), source: readFileSync(file, "utf8") }))
  .filter((p) => !/\[.+\]/.test(p.route) && !isPrivate(p.route) && !isNoindex(p.source))
  .sort((a, b) => a.route.localeCompare(b.route));

const longTitles = {};
const longDescriptions = {};
for (const p of pages) {
  const title = resolveMetadataString(p.source, "title");
  if (title && title.length > MAX_TITLE_CONST_CHARS) longTitles[p.route] = title.length;
  const desc = resolveMetadataString(p.source, "description");
  if (desc && desc.length > MAX_META_DESCRIPTION_CHARS) longDescriptions[p.route] = desc.length;
}

const blogSlugs = readdirSync(BLOG_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name !== "topics" && !e.name.startsWith("[") &&
    existsSync(path.join(BLOG_DIR, e.name, "page.tsx")))
  .map((e) => e.name)
  .sort();

const links = {};
const missingFaq = [];
for (const slug of blogSlugs) {
  const source = readFileSync(path.join(BLOG_DIR, slug, "page.tsx"), "utf8");
  links[slug] = linkProfile(source, `/blog/${slug}`);
  if (!source.includes('"FAQPage"')) missingFaq.push(slug);
}

const current = {
  longTitles,
  longDescriptions,
  missingFaqPage: missingFaq,
  internalLinks: links,
};

// ---------------------------------------------------------------- compare
const previous = existsSync(BASELINE_PATH)
  ? JSON.parse(readFileSync(BASELINE_PATH, "utf8"))
  : null;

const problems = [];
const wins = [];

if (previous) {
  for (const [route, len] of Object.entries(longTitles)) {
    const before = previous.longTitles?.[route];
    if (before === undefined) problems.push(`new over-length title: ${route} (${len} chars)`);
    else if (len > before) problems.push(`title got longer: ${route} ${before} -> ${len}`);
  }
  for (const route of Object.keys(previous.longTitles ?? {})) {
    if (!(route in longTitles)) wins.push(`title fixed: ${route}`);
  }

  for (const [route, len] of Object.entries(longDescriptions)) {
    const before = previous.longDescriptions?.[route];
    if (before === undefined) problems.push(`new over-length description: ${route} (${len} chars)`);
    else if (len > before) problems.push(`description got longer: ${route} ${before} -> ${len}`);
  }
  for (const route of Object.keys(previous.longDescriptions ?? {})) {
    if (!(route in longDescriptions)) wins.push(`description fixed: ${route}`);
  }

  const knownNoFaq = new Set(previous.missingFaqPage ?? []);
  for (const slug of missingFaq) {
    if (!knownNoFaq.has(slug)) problems.push(`post lost / never had FAQPage: ${slug}`);
  }
  for (const slug of knownNoFaq) {
    if (!missingFaq.includes(slug)) wins.push(`FAQPage added: ${slug}`);
  }

  for (const [slug, prof] of Object.entries(links)) {
    const before = previous.internalLinks?.[slug];
    if (!before) {
      for (const [family, target] of Object.entries(LINK_TARGET)) {
        if (prof[family] < target) {
          problems.push(
            `new post ${slug} ships below standard: ${family} ${prof[family]}/${target}`,
          );
        }
      }
      continue;
    }
    for (const [family, target] of Object.entries(LINK_TARGET)) {
      if (prof[family] < before[family] && before[family] < target) {
        problems.push(`${slug}.${family} regressed: ${before[family]} -> ${prof[family]}`);
      } else if (prof[family] > before[family]) {
        wins.push(`${slug}.${family}: ${before[family]} -> ${prof[family]}`);
      }
    }
  }
}

// ---------------------------------------------------------------- report
const belowStandard = Object.values(links).filter((p) =>
  Object.entries(LINK_TARGET).some(([f, t]) => p[f] < t),
).length;

console.log("SEO guard baseline");
console.log(`  indexable pages scanned      ${pages.length}`);
console.log(`  titles over ${MAX_TITLE_CONST_CHARS} chars           ${Object.keys(longTitles).length}`);
console.log(`  descriptions over ${MAX_META_DESCRIPTION_CHARS} chars    ${Object.keys(longDescriptions).length}`);
console.log(`  blog posts without FAQPage   ${missingFaq.length}/${blogSlugs.length}`);
console.log(`  posts below link standard    ${belowStandard}/${blogSlugs.length}`);

if (previous) {
  if (wins.length) {
    console.log(`\n${wins.length} improvement(s):`);
    for (const w of wins.slice(0, 30)) console.log(`  + ${w}`);
    if (wins.length > 30) console.log(`  … and ${wins.length - 30} more`);
  }
  if (problems.length) {
    console.error(`\n${problems.length} REGRESSION(S):`);
    for (const p of problems) console.error(`  - ${p}`);
  }
}

const write = process.argv.includes("--write");
if (!write) {
  console.log("\n(report only — pass --write to bank this state)");
  process.exit(problems.length ? 1 : 0);
}
if (problems.length) {
  console.error("\nRefusing to write: that would bank a regression. Fix the items above.");
  process.exit(1);
}

mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
writeFileSync(
  BASELINE_PATH,
  `${JSON.stringify(
    {
      $comment:
        "Generated by scripts/seo/guard-baseline.mjs. Ratchet for lib/__tests__/seo-guards.test.ts: CI fails if any number here gets worse. Regenerate with `node scripts/seo/guard-baseline.mjs --write` after paying debt down. Do not hand-edit to silence a failure.",
      $generated: new Date().toISOString().slice(0, 10),
      limits: {
        maxTitleConstChars: MAX_TITLE_CONST_CHARS,
        maxMetaDescriptionChars: MAX_META_DESCRIPTION_CHARS,
        internalLinkTarget: LINK_TARGET,
      },
      ...current,
    },
    null,
    2,
  )}\n`,
);
console.log(`\nWrote ${path.relative(REPO_ROOT, BASELINE_PATH)}`);
