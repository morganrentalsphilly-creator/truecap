import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A page that argues for a paid tier must be reachable from the site.
 *
 * /for-agents is the ONLY page that explains Agent Pro — client rosters,
 * per-client Buy Boxes, deal assignment, co-branded delivery — and it shipped
 * with zero inbound links from anywhere in app/ or components/. Agent Pro is
 * the highest-priced plan at $59.99/mo, exactly 2x Investor Pro, and it is also
 * absent from the only feature-comparison table on /pricing. So the tier we
 * most want an agent to buy was the one they could neither compare nor read
 * about, and the rational move was to buy the cheaper plan.
 *
 * An orphan is invisible in every other check: the page builds, renders, has
 * good metadata, and returns 200. Only asking "can anyone get here?" finds it.
 */

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const tracked = (globs: string[]) =>
  execFileSync("git", ["ls-files", ...globs], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  })
    .split("\n")
    .filter((file) => Boolean(file) && existsSync(join(root, file)));

/** Persona/tier landing pages that must not become orphans. */
const MUST_BE_REACHABLE = [
  "/for-agents",
  "/for-buy-and-hold",
  "/for-house-hackers",
];

const surfaces = tracked(["app/**/*.tsx", "components/**/*.tsx"]);

function inboundLinks(href: string): string[] {
  const needle = `href="${href}"`;
  return surfaces.filter((file) => {
    // The page linking to itself does not make it reachable.
    if (file === `app${href}/page.tsx`) return false;
    return read(file).includes(needle);
  });
}

describe("persona and tier pages are reachable", () => {
  it.each(MUST_BE_REACHABLE)("%s has at least one inbound link", (href) => {
    const from = inboundLinks(href);
    expect(
      from,
      `${href} is orphaned — nothing links to it, so no visitor can reach it`,
    ).not.toEqual([]);
  });

  it("/for-agents is reachable from the pricing decision itself, not just the footer", () => {
    // The footer alone is not enough: the moment someone weighs $59.99 against
    // $29.99 is on /pricing, and that is where the fuller argument must be one
    // click away.
    const from = inboundLinks("/for-agents");
    const fromPricingSurface = from.some(
      (f) => f.includes("pricing") || f.includes("value-stack"),
    );
    expect(
      fromPricingSurface,
      `/for-agents is linked only from ${from.join(", ")} — add a link where the tier is actually being chosen`,
    ).toBe(true);
  });

  it("the Agent Pro page still exists to be linked to", () => {
    expect(existsSync(join(root, "app/for-agents/page.tsx"))).toBe(true);
  });
});
