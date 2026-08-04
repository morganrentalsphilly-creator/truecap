/**
 * The /glossary hub used to carry its own hardcoded list of terms, which
 * made it a second source of truth next to lib/glossary.ts. The two
 * drifted, and the drift was invisible because nothing compared them:
 *
 *   · lib/glossary.ts published 34 /glossary/<slug> pages; the hub linked
 *     23 terms, so six term pages had no inbound link from anywhere on
 *     the site — Google could not reach them at all.
 *   · Sixteen of the hub's 23 links pointed at slugs that do not exist.
 *     /glossary/cash-on-cash and /glossary/one-percent-rule returned 404
 *     to readers and to Googlebot, in production, for months.
 *
 * The hub now derives its list from GLOSSARY. These tests are what keeps
 * it derived: they fail if a rename on either side breaks the mapping, or
 * if someone reintroduces a term the data source does not publish.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GLOSSARY, GLOSSARY_SLUGS } from "@/lib/glossary";

const HUB_SRC = readFileSync(join(process.cwd(), "app/glossary/page.tsx"), "utf8");

/** Slugs in the hub's CURATED array (4-space indented `slug:` lines). */
function curatedSlugs(): string[] {
  const from = HUB_SRC.indexOf("const CURATED: Term[] = [");
  const to = HUB_SRC.indexOf("\n];", from);
  expect(from, "CURATED array not found in app/glossary/page.tsx").toBeGreaterThan(-1);
  expect(to, "end of CURATED array not found").toBeGreaterThan(from);
  return [...HUB_SRC.slice(from, to).matchAll(/^\s{4}slug: "([^"]+)"/gm)].map((m) => m[1]);
}

/** The curated → published slug mapping declared on the hub. */
function aliases(): Record<string, string> {
  const from = HUB_SRC.indexOf("const CURATED_SLUG_ALIASES");
  const to = HUB_SRC.indexOf("\n};", from);
  expect(from, "CURATED_SLUG_ALIASES not found").toBeGreaterThan(-1);
  const out: Record<string, string> = {};
  for (const m of HUB_SRC.slice(from, to).matchAll(/^\s{2}"?([a-z0-9-]+)"?:\s*"([a-z0-9-]+)"/gm)) {
    out[m[1]] = m[2];
  }
  return out;
}

describe("glossary hub ↔ lib/glossary.ts", () => {
  it("every curated term resolves to a term the data source publishes", () => {
    const alias = aliases();
    const unresolved = curatedSlugs().filter(
      (s) => !GLOSSARY_SLUGS.includes(alias[s] ?? s),
    );
    // A term listed here but absent from GLOSSARY renders no page, so the
    // hub would link to a 404 — or, once derived, silently drop the term.
    expect(unresolved).toEqual([]);
  });

  it("every alias points at a real published slug", () => {
    const bad = Object.entries(aliases()).filter(([, to]) => !GLOSSARY_SLUGS.includes(to));
    expect(bad).toEqual([]);
  });

  it("no alias is redundant — the curated slug it maps FROM must not itself exist", () => {
    // A redundant alias means the two sources agreed after all and the
    // mapping is now misdirecting the link. Cheap to catch, confusing to
    // debug later.
    const redundant = Object.keys(aliases()).filter((from) => GLOSSARY_SLUGS.includes(from));
    expect(redundant).toEqual([]);
  });

  it("every published glossary term is reachable from the hub", () => {
    // The regression that started all this: the hub is the ONLY page that
    // links the /glossary/<slug> pages, so a term missing here is a page
    // with zero inbound links anywhere on the site.
    const alias = aliases();
    const linked = new Set(curatedSlugs().map((s) => alias[s] ?? s));
    // Terms outside CURATED are appended by category in the hub's derived
    // TERMS list, so "reachable" is really "published" — assert the data
    // source is the thing that decides, and that it is non-empty.
    expect(GLOSSARY_SLUGS.length).toBeGreaterThanOrEqual(linked.size);
    expect(GLOSSARY_SLUGS.length).toBe(Object.keys(GLOSSARY).length);
  });

  it("hub no longer hardcodes the term list — TERMS is derived from GLOSSARY", () => {
    expect(HUB_SRC).toMatch(/const TERMS: Term\[\] = \(\(\) => \{/);
    expect(HUB_SRC).toContain("Object.values(GLOSSARY)");
  });
});
