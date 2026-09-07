import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every link that promises the analyzer must land on /analyze.
 *
 * Site overhaul Phase 2 moved the analyzer off the homepage, but ~120
 * anchors kept their pre-overhaul destination ("/", "/#main",
 * "/?strategy=…#main", "/?utm_source=…"). Nothing on "/" reads a strategy
 * seed or a staged prefill any more, so those links dropped the visitor on
 * the marketing hero, discarded their inputs, and — for the 38 /vs pages —
 * scrolled to the top of the same page. The defect is invisible to a build,
 * a render, and a 200 status; only asking "where does this actually go?"
 * finds it.
 *
 * Three rules:
 *   1. No retired analyzer destination anywhere in app/ or components/.
 *   2. An anchor whose label promises the analyzer does not target "/".
 *   3. Every <Link> to /analyze carries prefetch={false} (the analyzer bundle
 *      must not be prefetched onto marketing pages — docs/site-overhaul.md),
 *      or is the <AnalyzeCtaLink> island, which sets it.
 */

const ROOTS = ["app", "components"];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === "__tests__") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

const files = ROOTS.flatMap((root) => walk(root));
const flatten = (source: string) =>
  source.replace(/\{"\s*"\}/g, " ").replace(/\s+/g, " ");

/** Labels that promise the analyzer (brand/breadcrumb anchors do not). */
const ANALYZER_LABEL =
  /(analyz|analysis|run a deal|open truecap|try truecap free|try the calculator|type an address)/i;

describe("analyzer link destinations", () => {
  it("has no retired analyzer destination left in the source tree", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      // Attribute, object-literal and router.push shapes.
      for (const match of source.matchAll(
        /(?:href|to)\s*[=:]\s*\{?["'`](\/(?:#main|\?strategy=|\?utm_source=)[^"'`]*)["'`]|router\.push\(["'`](\/\?[^"'`]*)["'`]\)/g,
      )) {
        offenders.push(`${file}: ${match[1] ?? match[2]}`);
      }
    }
    expect(
      offenders,
      `links still target the analyzer's old home on "/":\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("does not label a link to the marketing homepage as the analyzer", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const flat = flatten(readFileSync(file, "utf8"));
      const anchor = /<Link\b[^>]*href="\/"[^>]*>(.*?)<\/Link>/g;
      let match: RegExpExecArray | null;
      while ((match = anchor.exec(flat)) != null) {
        const label = match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        if (!ANALYZER_LABEL.test(label)) continue;
        // "Start free at usetruecap.com" is a brand link on the shared-deal
        // shell, not an analyzer promise.
        if (/usetruecap\.com/i.test(label)) continue;
        offenders.push(`${file}: "${label}"`);
      }
      for (const match of flat.matchAll(
        /href:\s*"\/",\s*(?:label|cta|text):\s*"([^"]+)"/g,
      )) {
        if (ANALYZER_LABEL.test(match[1])) offenders.push(`${file}: "${match[1]}"`);
      }
    }
    expect(
      offenders,
      `analyzer-labelled anchors that land on the marketing homepage:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("never prefetches the analyzer bundle from a marketing <Link>", () => {
    const offenders: string[] = [];
    for (const file of files) {
      if (file.endsWith("components/marketing/analyze-cta-link.tsx")) continue;
      const flat = flatten(readFileSync(file, "utf8"));
      for (const match of flat.matchAll(/<Link\b([^>]*href="\/analyze(?:[?#][^"]*)?"[^>]*)>/g)) {
        if (!/prefetch=\{false\}/.test(match[1])) offenders.push(`${file}: <Link ${match[1].trim()}>`);
      }
    }
    expect(
      offenders,
      `/analyze links without prefetch={false}:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("the /vs hero CTA is a real link to /analyze, not a scroll button", () => {
    // ScrollToFormButton scrolled to #main, which every /vs page has, so its
    // /analyze fallback never fired and the primary CTA on 38 competitor
    // pages was a no-op. The hero now uses the AnalyzeCtaLink island.
    const vsPages = readdirSync("app/vs")
      .map((entry) => join("app/vs", entry, "page.tsx"))
      .filter((path) => {
        try {
          return statSync(path).isFile();
        } catch {
          return false;
        }
      });
    expect(vsPages.length).toBeGreaterThan(30);
    for (const path of vsPages) {
      const source = readFileSync(path, "utf8");
      expect(source, path).not.toContain("ScrollToFormButton");
    }
    expect(
      vsPages.filter((path) => readFileSync(path, "utf8").includes('analyticsSource="vs_hero"')).length,
    ).toBeGreaterThan(30);

    // And the button itself decides on a FORM, never on #main, so the trap
    // cannot recur on the next page that mounts it.
    const button = readFileSync("components/marketing/scroll-to-form-button.tsx", "utf8");
    expect(button).toContain(`'form[data-hero-address-form], form[data-calc-form="true"]'`);
    expect(button).toContain('router.push("/analyze")');
    expect(button).not.toMatch(/if \(!el\)/);
  });
});
