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
 *
 * Rules 2 and 3 read <IntentPrefetchLink> as well as <Link>. Below the first
 * screen, marketing pages write their internal links through it
 * (components/marketing/intent-prefetch-link.tsx; every body link on the 38
 * /vs pages, intent-prefetch-vs.test.ts), and without prefetch={false} it
 * would still prefetch /analyze on hover.
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

/** A <Link> or <IntentPrefetchLink> to "/" and its label (group 2), in flattened source. */
const homeAnchors = () => /<(Link|IntentPrefetchLink)\b[^>]*href="\/"[^>]*>(.*?)<\/\1>/g;
/** The attributes (group 2) of a <Link> or <IntentPrefetchLink> to /analyze, in flattened source. */
const analyzeAnchors = () => /<(Link|IntentPrefetchLink)\b([^>]*href="\/analyze(?:[?#][^"]*)?"[^>]*)>/g;

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
      const anchor = homeAnchors();
      let match: RegExpExecArray | null;
      while ((match = anchor.exec(flat)) != null) {
        const label = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        if (!ANALYZER_LABEL.test(label)) continue;
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

  it("never prefetches the analyzer bundle from a marketing <Link> or <IntentPrefetchLink>", () => {
    const offenders: string[] = [];
    for (const file of files) {
      if (file.endsWith("components/marketing/analyze-cta-link.tsx")) continue;
      const flat = flatten(readFileSync(file, "utf8"));
      for (const match of flat.matchAll(analyzeAnchors())) {
        if (!/prefetch=\{false\}/.test(match[2])) offenders.push(`${file}: <${match[1]} ${match[2].trim()}>`);
      }
    }
    expect(
      offenders,
      `/analyze links without prefetch={false}:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("reads rules 2 and 3 through IntentPrefetchLink as well as Link", () => {
    // Guard the guard: each fixture breaks a rule, so each must be caught.
    for (const fixture of [
      '<Link href="/" className="tc-link">rental property analysis</Link>',
      '<IntentPrefetchLink href="/" className="tc-link">rental property analysis</IntentPrefetchLink>',
    ]) {
      const labels = [...flatten(fixture).matchAll(homeAnchors())].map((m) => m[2]);
      expect(labels, fixture).toEqual(["rental property analysis"]);
      expect(ANALYZER_LABEL.test(labels[0])).toBe(true);
    }
    for (const fixture of [
      '<Link href="/analyze" className="tc-link">run a deal</Link>',
      '<IntentPrefetchLink href="/analyze?strategy=brrrr" className="tc-link">run a deal</IntentPrefetchLink>',
    ]) {
      const tags = [...flatten(fixture).matchAll(analyzeAnchors())];
      expect(tags, fixture).toHaveLength(1);
      expect(/prefetch=\{false\}/.test(tags[0][2]), fixture).toBe(false);
    }
    // And the legal shape stays legal.
    const off = [...flatten('<IntentPrefetchLink href="/analyze" prefetch={false} className="tc-link">').matchAll(analyzeAnchors())];
    expect(off).toHaveLength(1);
    expect(off[0][2]).toMatch(/prefetch=\{false\}/);
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
